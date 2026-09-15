const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'دسترسی غیرمجاز: توکن ارسال نشده' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET is missing');
      return res.status(500).json({ message: 'پیکربندی سرور نامعتبر است' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({ message: 'ساختار توکن نامعتبر است' });
    }

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['passwordHash', 'mfaSecret'] }
    });

    if (!user) {
      return res.status(401).json({ message: 'کاربر یافت نشد' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'توکن منقضی شده است' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'توکن نامعتبر است' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
};