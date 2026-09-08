const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models').User;
const bcrypt = require('bcryptjs');

// شروع فرآیند MFA
exports.setupMFA = async (req, res) => {
  try {
    const user = req.user; // از میدلور احراز هویت می‌آید
    if (user.isMfaEnabled) {
      return res.status(400).json({ message: 'MFA already enabled' });
    }

    const secret = speakeasy.generateSecret({ length: 20, name: SmartHome(\) });
    // ذخیره موقت سکرت در سشن یا دیتابیس (اینجا ساده‌سازی شده)
    user.mfaSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCodeUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// فعال‌سازی MFA
exports.verifyMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.isMfaEnabled = true;
    await user.save();
    res.json({ message: 'MFA enabled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// لاگین با گوگل (Callback)
exports.googleCallback = (req, res) => {
  const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.redirect(\/login?token=\&provider=google);
};
