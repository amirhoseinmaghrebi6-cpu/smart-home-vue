// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');
const { User, EmergencyContact, Space, Device, Scenario } = require('../models');
const mqttService = require('../services/mqttService');
const logger = require('../utils/logger'); // ✅ افزودن لاگر

// ==================== توابع کمکی داخلی ====================

function mapDeviceForClient(device) {
  const d = device.toJSON ? device.toJSON() : device;
  
  // ✅ ← ← ← حیاتی: مقداردهی اولیه‌ی channels اگر خالی باشد
  let channels = d.channels || [];
  if (channels.length === 0) {
    let count = 1;
    if (d.type === 'switch2') count = 2;
    else if (d.type === 'switch3') count = 3;
    
    channels = Array.from({ length: count }, (_, i) => ({
      id: i,
      label: '',
      status: d.status || false
    }));
  }
  
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    icon: d.icon,
    image: d.image,
    status: d.status,
    brightness: d.brightness,
    channels: channels,  // ← ← ← channels تضمین‌شده
    pairedDeviceId: d.pairedDeviceId,
    pairedAt: d.pairedAt,
    lastSeen: d.lastSeen,
    scenarios: (d.scenarios || []).map(s => ({
      id: s.id,
      type: s.type,
      action: s.action,
      channelIndex: s.channelIndex,
      datetime: s.datetime,
      time: s.time,
      days: s.days,
      enabled: s.enabled,
      executed: false
    }))
  };
}



// ==================== روت‌های پروفایل و اضطراری ====================

router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ 
        model: EmergencyContact, 
        as: 'emergencyContacts', 
        attributes: ['id', 'phoneNumber', 'label', 'priority', 'enabled', 'notifyOn'],
        order: [['priority', 'ASC']]
      }]
    });
    res.json({ success: true, data: user });
  } catch (err) {
    logger.error('Profile error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const data = await buildDashboardTree(req.user.id)
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور در دریافت داشبورد' })
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, preferences } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    await user.save();
    res.json({ success: true, message: 'پروفایل بروزرسانی شد', data: { id: user.id, name: user.name, email: user.email, phone: user.phone, preferences: user.preferences } });
  } catch (err) {
    logger.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
});

// ... (سایر روت‌های اضطراری و مکان‌ها بدون تغییر باقی می‌مانند) ...
// برای کوتاه شدن پاسخ، روت‌های EmergencyContact و Space که قبلاً درست بودند را اینجا تکرار نمی‌کنم.
// لطفاً روت‌های /emergency-contacts و /spaces و /locations را از کد قبلی خودتان کپی کنید.

// ==================== روت‌های مدیریت دستگاه‌ها ====================

router.get('/devices', authenticate, async (req, res) => {
  try {
    const devices = await Device.findAll({
      where: { userId: req.user.id },
      include: [{ model: Space, as: 'space', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: devices });
  } catch (err) {
    logger.error('Error fetching devices:', err);
    res.status(500).json({ success: false, message: 'خطای سرور در دریافت دستگاه‌ها' });
  }
});

router.post('/devices', authenticate, async (req, res) => {
  try {
    const { DeviceAccess } = require('../models');
    
    const { name, type, spaceId, position, metadata, icon, image } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'نام و نوع دستگاه الزامی است' });
    }

    // ✅ ← ← ← تعیین تعداد کانال‌ها بر اساس نوع دستگاه
    let channelCount = 1;
    if (type === 'switch2') channelCount = 2;
    else if (type === 'switch3') channelCount = 3;
    
    const initialChannels = Array.from({ length: channelCount }, (_, i) => ({
      id: i,
      label: '',
      status: false
    }));

    // ✅ ساخت دستگاه با channels مقداردهی‌شده
    const newDevice = await Device.create({
      userId: req.user.id,
      spaceId: spaceId || null,
      name, 
      type, 
      icon: icon || '⚙️', 
      image: image || '', 
      position: position || '', 
      metadata: metadata || {},
      status: false,
      channels: initialChannels  // ← ← ← حیاتی
    });
    
    logger.info(`🆕 Device created: ${newDevice.id} with ${channelCount} channels`);

    // ✅ ثبت دسترسی مالک
    await DeviceAccess.findOrCreate({
      where: { deviceId: newDevice.id, userId: req.user.id },
      defaults: { role: 'owner' }
    });

    res.status(201).json({ success: true, message: 'دستگاه جدید اضافه شد', data: newDevice });
    
  } catch (err) {
    logger.error('Error creating device:', err);
    res.status(500).json({ success: false, message: err.message || 'خطای سرور در افزودن دستگاه' });
  }
});

// backend/src/routes/userRoutes.js

router.put('/devices/:id', authenticate, async (req, res) => {
  try {
    const { DeviceAccess } = require('../models');
    
    const access = await DeviceAccess.findOne({
      where: { userId: req.user.id, deviceId: req.params.id }
    });
    
    if (!access) {
      return res.status(403).json({ success: false, message: 'شما دسترسی به این دستگاه ندارید' });
    }
    
    const device = await Device.findByPk(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'دستگاه یافت نشد' });
    
// ✅ ارسال فرمان به ESP32 اگر جفت شده باشد
if (device.pairedDeviceId) {
  const chIdx = req.body.channelIndex !== undefined 
    ? req.body.channelIndex 
    : (device.channelIndex ?? 0);
  
  logger.info(`📤 Sending command to ESP: channel=${chIdx}, state=${req.body.status}`);
  
  await mqttService.sendCommand(
    req.params.id,
    chIdx,
    req.body.status
  );
}
    
    // ✅ ← ← ← حیاتی: اگر channelIndex و status آمد، channels آرایه را هم آپدیت کن
// ✅ ← ← ← حیاتی: اگر channelIndex و status آمد، channels آرایه را هم آپدیت کن
if (req.body.channelIndex !== undefined && req.body.status !== undefined) {
  // مقداردهی اولیه channels اگر خالی یا null باشد
  if (!device.channels || !Array.isArray(device.channels)) {
    let count = 1;
    if (device.type === 'switch2') count = 2;
    else if (device.type === 'switch3') count = 3;
    device.channels = Array.from({ length: count }, (_, i) => ({
      id: i, label: '', status: device.status || false
    }));
  }
  
  // آپدیت کانال مورد نظر
  const idx = req.body.channelIndex;
  if (device.channels[idx]) {
    device.channels[idx] = { ...device.channels[idx], status: req.body.status };
  } else {
    device.channels[idx] = { id: idx, label: '', status: req.body.status };
  }
  
  // ✅ حیاتی: ایجاد آرایه‌ی جدید برای تحریک آپدیت Sequelize در فیلد JSONB
  req.body.channels = [...device.channels];
}
    
    await device.update(req.body);
    res.json({ success: true, data: device });
  } catch (err) { 
    logger.error('Update device error:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

router.delete('/devices/:id', authenticate, async (req, res) => {
  logger.info(`🗑️ Delete request: userId=${req.user.id}, deviceId=${req.params.id}`);
  
  try {
    const { DeviceAccess, Device } = require('../models');
    
    // ✅ ۱. بررسی دسترسی
    const access = await DeviceAccess.findOne({
      where: { 
        userId: req.user.id, 
        deviceId: req.params.id, 
        role: 'owner' 
      }
    });
    
    logger.debug(`🔍 DeviceAccess lookup: ${access ? `found (role=${access.role})` : 'NOT FOUND'}`);
    
    if (!access) {
      logger.warn(`⚠️ Delete denied: user ${req.user.id} is not owner of device ${req.params.id}`);
      return res.status(403).json({ 
        success: false, 
        message: 'فقط مالک می‌تواند دستگاه را حذف کند' 
      });
    }
    
    // ✅ ۲. پیدا کردن دستگاه
    const device = await Device.findByPk(req.params.id);
    logger.debug(`🔍 Device lookup: ${device ? `found (pairedDeviceId=${device.pairedDeviceId})` : 'NOT FOUND'}`);
    
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'دستگاه یافت نشد' 
      });
    }
    
    // ✅ ۳. ارسال فرمان Unpair اگر جفت شده بود
    if (device.pairedDeviceId) {
      const unpairTopic = `sh/${device.pairedDeviceId}/unpair`;
      const payload = JSON.stringify({
        action: 'unpair',
        virtualDeviceId: device.id,
        timestamp: new Date().toISOString()
      });
      
      mqttService.getClient()?.publish(unpairTopic, payload, { qos: 1 });
      logger.info(`🔓 Unpair command sent to ${unpairTopic}`);
    }
    
    // ✅ ۴. حذف دسترسی‌ها
    const accessDeleted = await DeviceAccess.destroy({ where: { deviceId: device.id } });
    logger.info(`🗑️ DeviceAccess records deleted: ${accessDeleted}`);
    
    // ✅ ۵. حذف خود دستگاه
    await device.destroy();
    logger.info(`✅ Device deleted successfully`);
    
    res.json({ 
      success: true, 
      message: 'دستگاه با موفقیت حذف شد',
      deletedId: device.id
    });
    
  } catch (err) { 
    logger.error('Delete device error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'خطای سرور در حذف دستگاه' 
    }); 
  }
});



async function buildDashboardTree(userId) {
  // ✅ اصلاح: Op را مستقیماً از sequelize ایمپورت کنید
  const { Op } = require('sequelize');
  const { DeviceAccess, Scenario, Space, Device } = require('../models');
  
  // دریافت آیدی دستگاه‌های قابل دسترسی برای این کاربر
  const accessible = await DeviceAccess.findAll({
    where: { userId },
    attributes: ['deviceId']
  });
  const deviceIds = accessible.map(a => a.deviceId);

  // ✅ اگر deviceIds خالی است، از {} استفاده کن تا همه‌ی دستگاه‌ها نیایند
  const deviceFilter = deviceIds.length > 0 
    ? { id: { [Op.in]: deviceIds } } 
    : { id: null };  // ← هیچ دستگاهی برنگرداند اگر لیست خالی است

  const allSpaces = await Space.findAll({
    where: { userId },
    include: [{
      model: Device,
      as: 'devices',
      where: deviceFilter,  // ← استفاده از متغیر آماده
      required: false,
      include: [{
        model: Scenario,
        as: 'scenarios',
        attributes: ['id', 'type', 'action', 'channelIndex', 'datetime', 'time', 'days', 'enabled']
      }]
    }],
    order: [['order', 'ASC'], ['createdAt', 'ASC']]
  });

  const largeSpaces = allSpaces.filter(s => s.type === 'large');
  return largeSpaces.map(large => ({
    id: large.id,
    name: large.name,
    type: 'large',
    image: large.image || '',
    children: allSpaces
      .filter(s => String(s.parentId) === String(large.id) && s.type === 'small')
      .map(small => ({
        id: small.id,
        name: small.name,
        type: 'small',
        image: small.image || '',
        devices: (small.devices || []).map(mapDeviceForClient)
      }))
  }));
}


// ==================== روت‌های مدیریت سناریوها ====================

// ==================== روت‌های مدیریت سناریوها ====================

router.get('/scenarios-overview', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const scenarios = await Scenario.findAll({
      where: { enabled: true, executed: false, [Op.or]: [ { type: 'recurring' }, { datetime: { [Op.gte]: now } }, { datetime: null } ] },
      include: [{ model: Device, as: 'device', attributes: ['id', 'name', 'icon'], where: { userId: req.user.id }, required: true, include: [{ model: Space, as: 'space', attributes: ['id', 'name'], include: [{ model: Space, as: 'parent', attributes: ['id', 'name'] }] }] }],
      order: [['createdAt', 'DESC']]
    });
    const formatted = scenarios.map(s => ({
      id: s.id, deviceId: s.deviceId, deviceName: s.device?.name || 'دستگاه', deviceIcon: s.device?.icon || '⚙️',
      locationId: s.device?.space?.parent?.id || 'unknown', locationName: s.device?.space?.parent?.name || 'نامشخص',
      spaceId: s.device?.space?.id || 'unknown', spaceName: s.device?.space?.name || 'نامشخص',
      type: s.type || 'recurring', datetime: s.datetime, time: s.time, days: s.days, action: s.action, channelIndex: s.channelIndex, enabled: s.enabled
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    logger.error('Scenarios overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ روت POST /scenarios — اصلاح‌شده: بدون تبدیل jalaali (فرانت‌اند میلادی می‌فرستد)
router.post('/scenarios', authenticate, async (req, res) => {
  try {
    const { deviceId, type, action, channelIndex, datetime, time, days, name, description } = req.body;
    
    if (!deviceId || !type || !action) {
      return res.status(400).json({ success: false, message: 'deviceId، type و action الزامی هستند' });
    }
    
    const device = await Device.findOne({ where: { id: deviceId, userId: req.user.id } });
    if (!device) return res.status(404).json({ success: false, message: 'دستگاه یافت نشد' });
    
    // ✅ اعتبارسنجی تاریخ (فرانت‌اند الآن میلادی/ISO می‌فرستد)
    let datetimeToSave = null;
    if (type === 'once' && datetime) {
      // ✅ اگر تاریخ به فرمت ISO است (مثلاً "2026-06-05T16:59")، مستقیم ذخیره کن
      const d = new Date(datetime);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'فرمت تاریخ نامعتبر است' });
      }
      datetimeToSave = d; // ← ← ← ذخیره‌ی مستقیم تاریخ میلادی
      logger.debug(`📅 Saved datetime: "${datetimeToSave.toISOString()}"`);
    }
    
    const newScenario = await Scenario.create({ 
      deviceId, 
      type: type || 'recurring', 
      action, 
      channelIndex: channelIndex !== undefined ? channelIndex : null, 
      datetime: datetimeToSave,  // ← ← ← تاریخ میلادی صحیح
      time: time || null, 
      days: days || [], 
      name: name || '', 
      description: description || '', 
      enabled: true 
    });
    
    res.status(201).json({ success: true, message: 'سناریو اضافه شد', data: newScenario });
  } catch (err) {
    logger.error('Create scenario error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/scenarios/:id', authenticate, async (req, res) => {
  try {
    const scenario = await Scenario.findOne({ where: { id: req.params.id }, include: [{ model: Device, as: 'device', attributes: ['userId'] }] });
    if (!scenario || scenario.device.userId !== req.user.id) return res.status(404).json({ success: false, message: 'سناریو یافت نشد' });
    await scenario.destroy();
    res.json({ success: true, message: 'سناریو حذف شد' });
  } catch (err) {
    logger.error('Delete scenario error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/devices/:deviceId/scenarios', authenticate, async (req, res) => {
  try {
    const device = await Device.findOne({ where: { id: req.params.deviceId, userId: req.user.id } });
    if (!device) return res.status(404).json({ success: false, message: 'دستگاه یافت نشد' });
    const scenarios = await Scenario.findAll({ where: { deviceId: req.params.deviceId }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: scenarios });
  } catch (err) {
    logger.error('Get device scenarios error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ==================== ✅ روت‌های جدید Pairing (اضافه شده) ====================

// دریافت لیست درخواست‌های جفت‌سازی معلق
router.get('/pairing-requests', authenticate, async (req, res) => {
  try {
    const requests = mqttService.getPendingPairings();
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// تأیید و نهایی کردن جفت‌سازی توسط اپ (با لاگ دیباگ)
router.post('/pairing/confirm', authenticate, async (req, res) => {
  try {
    const { espDeviceId, virtualDevice } = req.body;
    
    if (!espDeviceId || !virtualDevice?.spaceId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // ✅ اطمینان از وجود userId
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'لطفاً دوباره وارد شوید' });
    }
    
    // ✅ ارسال userId به‌صورت صریح (نه فقط spread)
    const result = await mqttService.confirmPairing(espDeviceId, {
      ...virtualDevice,
      userId: userId  // ✅ این خط باید حتماً باشد و بعد از spread بیاید
    });
    
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Pairing confirm error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ==================== روت‌های مدیریت مکان‌ها (فضاها) ====================

// ✅ افزودن مکان جدید (فضای بزرگ یا کوچک)
router.post('/spaces', authenticate, async (req, res) => {
  try {
    const { name, type, parentId, image, order } = req.body;
    
    // ✅ اعتبارسنجی فیلدهای اجباری
    if (!name || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'نام و نوع مکان الزامی است' 
      });
    }
    
    // ✅ اگر فضای کوچک است، parentId باید باشد
    if (type === 'small' && !parentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'برای فضای کوچک، انتخاب مکان والد الزامی است' 
      });
    }
    
    // ✅ اگر parentId داده شده، چک کن وجود داشته باشد و متعلق به کاربر باشد
    if (parentId) {
      const parentSpace = await Space.findOne({ 
        where: { id: parentId, userId: req.user.id } 
      });
      if (!parentSpace) {
        return res.status(400).json({ 
          success: false, 
          message: 'مکان والد نامعتبر است' 
        });
      }
    }
    
    // ✅ ساخت رکورد جدید
    const newSpace = await Space.create({
      userId: req.user.id,
      name,
      type, // 'large' یا 'small'
      parentId: type === 'small' ? parentId : null,
      image: image || '',
      order: order || 0
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'مکان با موفقیت اضافه شد', 
      data: newSpace 
    });
    
  } catch (err) {
    logger.error('Create space error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'خطای سرور در ذخیره مکان' 
    });
  }
});

// ✅ ویرایش مکان
router.put('/spaces/:id', authenticate, async (req, res) => {
  try {
    const { name, image, order } = req.body;
    
    const space = await Space.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    
    if (!space) {
      return res.status(404).json({ 
        success: false, 
        message: 'مکان یافت نشد' 
      });
    }
    
    await space.update({
      name: name || space.name,
      image: image !== undefined ? image : space.image,
      order: order !== undefined ? order : space.order
    });
    
    res.json({ success: true, message: 'مکان بروزرسانی شد', data: space });
    
  } catch (err) {
    logger.error('Update space error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ حذف مکان (و تمام زیرمجموعه‌های آن)
router.delete('/spaces/:id', authenticate, async (req, res) => {
  try {
    const space = await Space.findOne({ 
      where: { id: req.params.id, userId: req.user.id } 
    });
    
    if (!space) {
      return res.status(404).json({ 
        success: false, 
        message: 'مکان یافت نشد' 
      });
    }
    
    // ✅ حذف بازگشتی: اول تمام فضاهای فرزند، سپس خود فضا
    await Space.destroy({ where: { parentId: req.params.id } });
    await space.destroy();
    
    res.json({ success: true, message: 'مکان حذف شد' });
    
  } catch (err) {
    logger.error('Delete space error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ✅ اکسپورت نهایی روتر
module.exports = router;