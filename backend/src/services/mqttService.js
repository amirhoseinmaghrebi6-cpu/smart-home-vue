// backend/src/services/mqttService.js
const mqtt = require('mqtt');
const { Device, DeviceAccess } = require('../models');

const pendingPairings = new Map();
const syncPendingDevices = new Set();

const MQTT_CONFIG = {
  host: process.env.MQTT_BROKER || process.env.MQTT_URL || 'mqtt://localhost:1883',
  options: {
    clientId: `smart-home-backend-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
    username: process.env.MQTT_USER || undefined,
    password: process.env.MQTT_PASSWORD || undefined
  }
};

let client = null;
let isConnected = false;

async function connect() {
  return new Promise((resolve, reject) => {
    try {
      client = mqtt.connect(MQTT_CONFIG.host, MQTT_CONFIG.options);

      client.on('connect', () => {
        console.log('🔗 Connected to Mosquitto MQTT Broker');
        isConnected = true;
        
        client.subscribe('sh/+/status', (err) => {
          if (err) console.error('❌ Failed to subscribe to sh/+/status:', err);
          else console.log('📡 Subscribed to sh/+/status');
        });
        
        client.subscribe('sh/+/pair', (err) => {
          if (err) console.error('❌ Failed to subscribe to sh/+/pair:', err);
          else console.log('📡 Subscribed to sh/+/pair');
        });

        client.subscribe('sh/+/sync', (err) => {
          if (err) console.error('❌ Failed to subscribe to sh/+/sync:', err);
          else console.log('📡 Subscribed to sh/+/sync');
        });
        
        resolve();
      });

      client.on('error', (err) => {
        console.error('❌ MQTT connection error:', err);
        isConnected = false;
        reject(err);
      });

      client.on('offline', () => {
        console.warn('⚠️ MQTT client offline');
        isConnected = false;
      });

      client.on('reconnect', () => {
        console.log('🔄 Reconnecting to MQTT broker...');
      });

      client.on('message', async (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          await handleMessage(topic, payload);
        } catch (err) {
          console.error('❌ Error processing MQTT message:', err);
        }
      });

    } catch (err) {
      console.error('❌ Failed to initialize MQTT client:', err);
      reject(err);
    }
  });
}

function parseBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

async function handleMessage(topic, payload) {
  const match = topic.match(/^sh\/([^/]+)\/(.+)$/);
  if (!match) return;
  
  const espDeviceId = match[1];
  const messageType = match[2];

  console.log(`📨 Received ${messageType} from ESP ${espDeviceId}:`, payload);

  if (messageType === 'sync' && payload.action === 'request_state') {
    console.log(`🔄 Sync request received from ESP ${espDeviceId}`);
    
    syncPendingDevices.add(espDeviceId);

    const devices = await Device.findAll({ where: { pairedDeviceId: espDeviceId } });
    
    if (devices.length > 0) {
      const device = devices[0];
      const responsePayload = { action: 'state_sync', channels: {} };

      let channels = device.channels || [];
      if (!Array.isArray(channels) || channels.length === 0) {
        const count = device.type === 'switch3' ? 3 : device.type === 'switch2' ? 2 : 1;
        channels = Array.from({ length: count }, (_, i) => ({
          id: i, label: '', status: device.status || false
        }));
      }

      channels.forEach((ch, idx) => {
        responsePayload.channels[`ch${idx+1}`] = !!ch.status;
      });

      const responseTopic = `sh/${espDeviceId}/sync/response`;
      client.publish(responseTopic, JSON.stringify(responsePayload), { qos: 1 });
      
      console.log(`✅ Sent state sync (Source of Truth) to ${espDeviceId}:`, responsePayload);
    }

    setTimeout(() => {
      syncPendingDevices.delete(espDeviceId);
      console.log(`✅ Sync period ended for ${espDeviceId}`);
    }, 8000);
    return;
  }

  if (messageType === 'status') {
    await handleDeviceStatus(espDeviceId, payload);
  } else if (messageType === 'pair') {
    await handlePairingRequest(espDeviceId, payload);
  }
}

async function handleDeviceStatus(espDeviceId, data) {
  try {
    const devices = await Device.findAll({ where: { pairedDeviceId: espDeviceId } });
    if (!devices.length) return;

    const online = parseBool(data.online);

    // ✅ ← ← ← حیاتی: همیشه emit کن (حتی اگر در sync period هستیم)
    try {
      const io = require('../app').get('socketio');
      if (io) {
        io.emit('device:status:update', {
          deviceId: devices[0].id,
          espDeviceId,
          channels: { 
            ch1: parseBool(data.ch1), 
            ch2: parseBool(data.ch2), 
            ch3: parseBool(data.ch3) 
          },
          online,
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Real-time update sent to frontend for device ${devices[0].id}`);
      }
    } catch (e) {
      console.log(`⚠️ Socket emit failed: ${e.message}`);
    }

    // ✅ حالا چک کن آیا در sync period هستیم
    if (syncPendingDevices.has(espDeviceId)) {
      console.log(`⏭️ Ignoring DB update from ${espDeviceId} during sync`);
      return;
    }

    for (const device of devices) {
      const chIndex = device.channelIndex;
      const chKey = `ch${chIndex + 1}`;
      const chStatusFromESP = parseBool(data[chKey]);

      let channels = device.channels || [];
      if (!Array.isArray(channels) || channels.length === 0) {
        const count = device.type === 'switch3' ? 3 : device.type === 'switch2' ? 2 : 1;
        channels = Array.from({ length: count }, (_, i) => ({
          id: i, label: '', status: device.status || false
        }));
      }

      const currentStatus = channels[chIndex]?.status ?? device.status;

      // ✅ فقط اگر آنلاین است و تغییر واقعی دارد، آپدیت کن
      if (online && currentStatus !== chStatusFromESP) {
        const newChannels = [...channels];
        if (chIndex !== undefined) {
          if (!newChannels[chIndex]) {
            newChannels[chIndex] = { id: chIndex, label: '', status: chStatusFromESP };
          } else {
            newChannels[chIndex] = { ...newChannels[chIndex], status: chStatusFromESP };
          }
        }

        await Device.update(
          {
            status: chStatusFromESP,
            channels: newChannels,
            online: true,
            lastSeen: new Date()
          },
          { where: { id: device.id } }
        );

        console.log(`✅ Real change from ESP: device ${device.id} ch${chIndex+1}=${chStatusFromESP}`);
      } else if (device.online !== online) {
        await Device.update(
          { online: online, lastSeen: new Date() },
          { where: { id: device.id } }
        );
        console.log(`📡 Only online updated for ${device.id}: ${online}`);
      }
    }

  } catch (err) {
    console.error(`❌ Failed to sync status for ESP ${espDeviceId}:`, err);
  }
}

async function handlePairingRequest(espDeviceId, data) {
  try {
    console.log(`🔐 Pairing request from ESP ${espDeviceId}:`, data);
    
    pendingPairings.set(espDeviceId, {
      ...data,
      requestedAt: new Date(),
      status: 'pending'
    });
    
    const responseTopic = `sh/${espDeviceId}/pair/response`;
    const payload = JSON.stringify({
      success: true,
      message: 'Pairing request received. Waiting for user confirmation in app.',
      timestamp: new Date().toISOString()
    });
    client.publish(responseTopic, payload, { qos: 1 });
    
    console.log(`📤 Sent pairing response to ${responseTopic}`);
  } catch (err) {
    console.error(`❌ Failed to process pairing for ESP ${espDeviceId}:`, err);
  }
}

function getPendingPairings() {
  const now = new Date();
  const result = [];
  
  for (const [espId, req] of pendingPairings.entries()) {
    if (now - req.requestedAt < 5 * 60 * 1000) {
      result.push({ espId, ...req });
    } else {
      pendingPairings.delete(espId);
    }
  }
  return result;
}

async function confirmPairing(espDeviceId, virtualDeviceData) {
  try {
    const { Device, DeviceAccess, Sequelize } = require('../models');
    const crypto = require('crypto');

    const pending = pendingPairings.get(espDeviceId);
    if (!pending) throw new Error('Pairing request not found');

    const { userId, name, type, icon, spaceId, channelIndex } = virtualDeviceData;
    if (!userId) throw new Error('userId الزامی است');
    if (!spaceId) throw new Error('spaceId الزامی است');

    const existingByEsp = await Device.findOne({
      where: { pairedDeviceId: espDeviceId }
    });

    if (existingByEsp) {
      console.log(`🔄 Sharing existing device ${existingByEsp.id} with user ${userId}`);
      
      await DeviceAccess.findOrCreate({
        where: { deviceId: existingByEsp.id, userId },
        defaults: { role: 'editor' }
      });
      
      const { Op } = Sequelize;
      const unpairedDevice = await Device.findOne({
        where: { 
          userId, 
          spaceId, 
          pairedDeviceId: null,
          type: type || 'switch1',
          createdAt: { [Op.gte]: new Date(Date.now() - 10 * 60 * 1000) }
        },
        order: [['createdAt', 'DESC']]
      });
      
      if (unpairedDevice && unpairedDevice.id !== existingByEsp.id) {
        console.log(`🗑️ Deleting unpaired duplicate device ${unpairedDevice.id}`);
        await DeviceAccess.destroy({ where: { deviceId: unpairedDevice.id } });
        await unpairedDevice.destroy();
      }
      
      pendingPairings.delete(espDeviceId);

      const responseTopic = `sh/${espDeviceId}/pair/response`;
      client.publish(
        responseTopic,
        JSON.stringify({
          success: true,
          virtualDeviceId: existingByEsp.id,
          shared: true,
          timestamp: new Date().toISOString()
        }),
        { qos: 1 }
      );

      console.log(`✅ Pairing confirmed (shared): ${espDeviceId} -> ${existingByEsp.id}`);
      return { success: true, device: existingByEsp, shared: true };
    }
    
    console.log(`🔍 Searching unpaired device for userId: ${userId}, spaceId: ${spaceId}`);
    const existingUnpaired = await Device.findOne({
      where: { userId, spaceId, pairedDeviceId: null },
      order: [['createdAt', 'DESC']]
    });
    
    let device;
    
    if (existingUnpaired) {
      console.log(`🔄 Linking existing unpaired device ${existingUnpaired.id} to ESP ${espDeviceId}`);
      
      await existingUnpaired.update({
        pairedDeviceId: espDeviceId,
        pairedAt: new Date(),
        channelIndex: channelIndex ?? existingUnpaired.channelIndex,
        lastSeen: new Date()
      });
      
      const verified = await Device.findByPk(existingUnpaired.id, { attributes: ['id', 'pairedDeviceId'] });
      console.log(`✅ Verified pairedDeviceId after update: ${verified?.pairedDeviceId}`);
      
      if (verified?.pairedDeviceId !== espDeviceId) {
        console.error(`❌ CRITICAL: pairedDeviceId update FAILED!`);
        throw new Error('Failed to update pairedDeviceId in database');
      }
      
      device = existingUnpaired;
    } else {
      const serverGeneratedId = crypto.randomUUID();
      device = await Device.create({
        id: serverGeneratedId,
        userId,
        name: name || `Device-${espDeviceId.slice(0, 4)}`,
        type: type || 'switch1',
        icon: icon || '🔘',
        spaceId,
        pairedDeviceId: espDeviceId,
        channelIndex: channelIndex ?? 0,
        status: false,
        lastSeen: new Date(),
        timezone: 'Asia/Tehran'
      });
      console.log(`🆕 Created new device ${device.id} with pairedDeviceId=${espDeviceId}`);
    }

    await DeviceAccess.findOrCreate({
      where: { deviceId: device.id, userId },
      defaults: { role: 'owner' }
    });
    
    pendingPairings.delete(espDeviceId);

    const responseTopic = `sh/${espDeviceId}/pair/response`;
    client.publish(
      responseTopic,
      JSON.stringify({
        success: true,
        virtualDeviceId: device.id,
        shared: false,
        timestamp: new Date().toISOString()
      }),
      { qos: 1 }
    );

    console.log(`✅ Pairing confirmed: ${espDeviceId} -> ${device.id}`);
    return { success: true, device, shared: false };

  } catch (err) {
    console.error('❌ Failed to confirm pairing:', err);
    throw err;
  }
}

// ==================== 🔑 ارسال فرمان — با Device.update() مستقیم ====================
async function sendCommand(virtualDeviceId, channelIndex, state) {
  try {
    console.log(`🔍 sendCommand called: virtualDeviceId=${virtualDeviceId}, channel=${channelIndex}, state=${state}`);
    
    const device = await Device.findByPk(virtualDeviceId);
    if (!device) {
      console.error(`❌ Device ${virtualDeviceId} NOT FOUND`);
      return false;
    }

    const chIdx = channelIndex !== undefined ? channelIndex : (device.channelIndex ?? 0);
    
    let channels = device.channels || [];
    if (!Array.isArray(channels) || channels.length === 0) {
      const count = device.type === 'switch3' ? 3 : device.type === 'switch2' ? 2 : 1;
      channels = Array.from({ length: count }, (_, i) => ({
        id: i, label: '', status: device.status || false
      }));
    }
    
    const newChannels = [...channels];
    if (!newChannels[chIdx]) {
      newChannels[chIdx] = { id: chIdx, label: '', status: state };
    } else {
      newChannels[chIdx] = { ...newChannels[chIdx], status: state };
    }

    // ✅ ← ← ← حیاتی: Device.update() مستقیم — تضمین می‌کند SQL UPDATE اجرا می‌شود!
    await Device.update(
      {
        status: state,
        channels: newChannels,
        lastSeen: new Date()
      },
      { where: { id: virtualDeviceId } }
    );

    // ✅ تأیید: دوباره از دیتابیس بخوان تا مطمئن شوی
    const verified = await Device.findByPk(virtualDeviceId, { attributes: ['channels', 'status'] });
    console.log(`✅ DB Update VERIFIED: channels[0]=${verified?.channels?.[0]?.status}, status=${verified?.status}`);

    if (!device.pairedDeviceId) {
      console.error(`❌ Device ${virtualDeviceId} has no pairedDeviceId`);
      return false;
    }

    const espDeviceId = device.pairedDeviceId;
    const topic = `sh/${espDeviceId}/cmd`;
    const payload = JSON.stringify({
      id: device.id,
      channel: chIdx,
      state,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) reject(err);
        else {
          console.log(`✅ MQTT command published`);
          resolve(true);
        }
      });
    });

  } catch (err) {
    console.error(`❌ Failed to send command:`, err);
    throw err;
  }
}

async function toggleDevice(virtualDeviceId, options = {}) {
  const { action, channelIndex } = options;
  const state = action === 'on' ? true : action === 'off' ? false : null;
  if (state === null) return false;
  return await sendCommand(virtualDeviceId, channelIndex, state);
}

async function executeScenario(virtualDeviceId, scenario) {
  const { action, channelIndex } = scenario;
  const state = action === 'on';
  await toggleDevice(virtualDeviceId, { action, channelIndex });
  console.log(`🎬 Executed scenario on device ${virtualDeviceId}:`, { action, channelIndex });
}

function disconnect() {
  if (client) {
    client.end(() => {
      console.log('🔌 MQTT client disconnected');
      isConnected = false;
    });
  }
}

async function checkAndExecuteScenarios() {
  try {
    const { Scenario, Device, User } = require('../models');
    
    const scenarios = await Scenario.findAll({
      where: { enabled: true },
      include: [{ 
        model: Device, 
        as: 'device', 
        include: [{ model: User, as: 'user' }] 
      }]
    });
    
    const now = new Date();
    const executedThisRound = new Set();
    
    for (const scenario of scenarios) {
      try {
        const device = scenario.device;
        const user = device?.user;
        if (!device || !user) continue;
        
        if (executedThisRound.has(scenario.id)) continue;
        
        const deviceTz = device.timezone || 'Asia/Tehran';
        let shouldExecute = false;
        
        if (scenario.type === 'once') {
          if (scenario.datetime && !scenario.executed) {
            const scenarioTime = new Date(scenario.datetime);
            if (now >= scenarioTime) {
              shouldExecute = true;
              scenario.executed = true;
              await scenario.save();
              
              const updated = await Scenario.findByPk(scenario.id);
              if (updated?.executed) {
                executedThisRound.add(scenario.id);
              } else {
                continue;
              }
            }
          }
        } 
        else if (scenario.type === 'recurring') {
          const nowInDeviceTz = new Date().toLocaleString('en-US', { timeZone: deviceTz });
          const timeParts = nowInDeviceTz.split(' ');
          const [nowHour, nowMinute] = timeParts[1]?.split(':').map(Number) || [0, 0];
          const nowDay = new Date().getDay();
          
          if (scenario.time) {
            const [scHour, scMinute] = scenario.time.split(':').map(Number);
            const isTimeMatch = (nowHour === scHour && nowMinute === scMinute);
            const isDayMatch = !scenario.days?.length || scenario.days.includes(nowDay);
            
            if (isTimeMatch && isDayMatch) {
              shouldExecute = true;
            }
          }
        }
        
        if (shouldExecute) {
          await new Promise(resolve => setTimeout(resolve, 100));
          await sendCommand(device.id, scenario.channelIndex, scenario.action === 'on');
          console.log(`✅ Scenario ${scenario.id} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Error executing scenario ${scenario?.id}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Error in checkAndExecuteScenarios:', err);
  }
}

let scenarioInterval = null;

function startScenarioScheduler() {
  if (scenarioInterval) clearInterval(scenarioInterval);
  scenarioInterval = setInterval(checkAndExecuteScenarios, 30 * 1000);
  console.log('✅ Scenario scheduler started (checks every 30s)');
}

function stopScenarioScheduler() {
  if (scenarioInterval) {
    clearInterval(scenarioInterval);
    scenarioInterval = null;
  }
}

async function cleanupExpiredScenarios() {
  try {
    const { Scenario } = require('../models');
    const now = new Date();
    
    const deleted = await Scenario.destroy({
      where: {
        type: 'once',
        executed: true,
        datetime: { [require('sequelize').Op.lt]: now }
      }
    });
    
    if (deleted > 0) {
      console.log(`🗑️ Cleaned up ${deleted} expired scenario(s)`);
    }
  } catch (err) {
    console.error('❌ Error cleaning up scenarios:', err);
  }
}

let cleanupInterval = null;

function startScenarioCleanup() {
  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupExpiredScenarios, 60 * 60 * 1000);
  console.log('✅ Scenario cleanup scheduler started (runs every hour)');
}

function stopScenarioCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

module.exports = {
  connect,
  disconnect,
  sendCommand,
  toggleDevice,
  executeScenario,
  getClient: () => client,
  isConnected: () => isConnected,
  handleDeviceStatus,
  handlePairingRequest,
  getPendingPairings,
  confirmPairing,
  startScenarioScheduler,
  stopScenarioScheduler,
  startScenarioCleanup,
  stopScenarioCleanup
};