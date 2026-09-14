// backend/src/controllers/authController.js
const { User } = require('../models')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')

const TOKEN_COOKIE = 'sh_token'
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_MAX_AGE_MS,
    path: '/'
  })
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE, { path: '/' })
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    preferences: user.preferences || {},
    isMfaEnabled: Boolean(user.isMfaEnabled)
  }
}

function assertJwtSecret() {
  return Boolean(
    process.env.JWT_SECRET &&
    process.env.JWT_SECRET !== 'dev_jwt_secret_change_in_production' &&
    !process.env.JWT_SECRET.startsWith('CHANGE_THIS')
  )
}

exports.register = async (req, res) => {
  try {
    if (!assertJwtSecret()) {
      return res.status(500).json({ success: false, message: 'JWT_SECRET در سرور تنظیم نشده است.' })
    }

    const { name, email, password, phone } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'نام، ایمیل و رمز عبور الزامی است.' })
    }

    const existing = await User.findOne({ where: { email } })
    if (existing) return res.status(400).json({ success: false, message: 'این ایمیل قبلاً ثبت شده.' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, password: hashedPassword, phone })
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
    setAuthCookie(res, token)

    res.status(201).json({ success: true, message: 'ثبت‌نام موفق.', token, user: sanitizeUser(user) })
  } catch (err) {
    console.error('Register Error:', err)
    res.status(500).json({ success: false, message: 'خطای سرور' })
  }
}

exports.login = async (req, res) => {
  try {
    if (!assertJwtSecret()) {
      return res.status(500).json({ success: false, message: 'JWT_SECRET در سرور تنظیم نشده است.' })
    }

    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'ایمیل و رمز عبور الزامی است.' })
    }

    const user = await User.findOne({ where: { email } })
    if (!user) return res.status(401).json({ success: false, message: 'ایمیل یا رمز عبور اشتباه است.' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ success: false, message: 'ایمیل یا رمز عبور اشتباه است.' })

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
    setAuthCookie(res, token)

    res.json({ success: true, message: 'ورود موفق.', token, user: sanitizeUser(user) })
  } catch (err) {
    console.error('Login Error:', err)
    res.status(500).json({ success: false, message: 'خطای سرور' })
  }
}

exports.me = async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) })
}

exports.logout = async (req, res) => {
  clearAuthCookie(res)
  res.json({ success: true, message: 'خروج موفق.' })
}

exports.setupMFA = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id)
    if (!user) return res.status(404).json({ success: false, message: 'کاربر یافت نشد' })
    if (user.isMfaEnabled) return res.status(400).json({ success: false, message: 'MFA قبلاً فعال شده است' })

    const secret = speakeasy.generateSecret({ length: 20, name: `Smart Home:${user.email}` })
    user.mfaSecret = secret.base32
    await user.save()

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)
    res.json({ success: true, secret: secret.base32, qrCodeUrl })
  } catch (err) {
    console.error('MFA setup error:', err)
    res.status(500).json({ success: false, message: 'خطا در راه‌اندازی MFA' })
  }
}

exports.verifyMFA = async (req, res) => {
  try {
    const { token } = req.body
    if (!/^\d{6}$/.test(String(token || ''))) {
      return res.status(400).json({ success: false, message: 'کد MFA نامعتبر است' })
    }

    const user = await User.findByPk(req.user.id)
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ success: false, message: 'ابتدا MFA را راه‌اندازی کنید' })
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: String(token),
      window: 1
    })

    if (!verified) return res.status(400).json({ success: false, message: 'کد MFA نامعتبر است' })

    user.isMfaEnabled = true
    await user.save()
    res.json({ success: true, message: 'احراز هویت دو مرحله‌ای با موفقیت فعال شد' })
  } catch (err) {
    console.error('MFA verification error:', err)
    res.status(500).json({ success: false, message: 'خطا در تأیید MFA' })
  }
}

exports.TOKEN_COOKIE = TOKEN_COOKIE
