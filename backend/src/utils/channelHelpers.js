const Channel = require('../models').Channel;
const logger = require('./logger');

// تابع عمومی برای مدیریت خطاها
const handleAsyncError = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    logger.error('Channel Helper Error:', error);
    next(error);
  }
};

// ایجاد کانال
const createChannel = handleAsyncError(async (req, res) => {
  const channel = await Channel.create(req.body);
  res.status(201).json({ success: true, data: channel });
});

// دریافت همه کانال‌ها
const getAllChannels = handleAsyncError(async (req, res) => {
  const channels = await Channel.findAll();
  res.json({ success: true, data: channels });
});

module.exports = {
  createChannel,
  getAllChannels
};
