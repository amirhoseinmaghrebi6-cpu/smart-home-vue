const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const User = require('../models').User;

// 1. ثبت‌نام (با هش خودکار در مدل)
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'ایمیل قبلاً ثبت شده است' });

    // ارسال رمز خام به مدل (هوک beforeCreate آن را هش می‌کند)
    const user = await User.create({ 
      email, 
      name: name || email.split('@')[0],
      passwordHash: password, 
      isVerified: true
    });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'خطا در ثبت‌نام', error: err.message });
  }
};

// 2. ورود
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(401).json({ message: 'ایمیل یا رمز عبور اشتباه است' });
    if (user.googleId && !user.passwordHash) return res.status(401).json({ message: 'لطفاً از ورود با گوگل استفاده کنید.' });

    const validPassword = user.checkPassword(password);
    if (!validPassword) return res.status(401).json({ message: 'ایمیل یا رمز عبور اشتباه است' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    if (user.isMfaEnabled) {
      return res.json({ mfaRequired: true, token, message: 'کد MFA را وارد کنید' });
    }

    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'خطا در ورود', error: err.message });
  }
};

// 3. اطلاعات کاربر
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'email', 'name', 'isMfaEnabled', 'isVerified'] });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: 'خطا در دریافت اطلاعات', error: err.message });
  }
};

// 4. خروج
exports.logout = (req, res) => res.json({ success: true, message: 'خروج موفقیت‌آمیز بود' });

// 5. راه‌اندازی MFA
exports.setupMFA = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'کاربر یافت نشد' });
    if (user.isMfaEnabled) return res.status(400).json({ message: 'MFA قبلاً فعال شده است' });

    const secret = speakeasy.generateSecret({ length: 20, name: `SmartHome(${user.email})`, issuer: 'SmartHome' });
    user.mfaSecret = secret.base32;
    await user.save();

    res.json({ success: true, secret: secret.base32, qrCodeUrl: secret.otpauth_url });
  } catch (err) {
    res.status(500).json({ message: 'خطا در راه‌اندازی MFA', error: err.message });
  }
};

// 6. تأیید MFA
exports.verifyMFA = async (req, res) => {
  try {
    const { token: code } = req.body;
    const user = req.user;

    if (!user.mfaSecret) return res.status(400).json({ message: 'رمز MFA تعریف نشده است' });

    const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: code, window: 1 });
    if (!verified) return res.status(400).json({ message: 'کد نامعتبر است' });

    if (!user.isMfaEnabled) {
      user.isMfaEnabled = true;
      await user.save();
      const finalToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, message: 'MFA فعال شد', token: finalToken });
    }

    const finalToken = jwt.sign({ id: user.id, email: user.email, mfaVerified: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'ورود موفق', token: finalToken, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: 'خطا در تأیید کد', error: err.message });
  }
};

// 7. کال‌بک گوگل
exports.googleCallback = (req, res) => {
  const user = req.user;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });

  if (user.isMfaEnabled) {
    return res.redirect(`${frontendUrl}/login?token=${token}&mfaRequired=true&email=${encodeURIComponent(user.email)}`);
  }
  res.redirect(`${frontendUrl}/login?token=${token}`);
};