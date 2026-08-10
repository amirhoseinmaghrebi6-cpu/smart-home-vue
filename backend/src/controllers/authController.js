// backend/src/controllers/authController.js
const { User } = require('../models')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const TOKEN_COOKIE = 'sh_token'
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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
    preferences: user.preferences || {}
  }
}

exports.register = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
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

    res.status(201).json({
      success: true,
      message: 'ثبت‌نام موفق.',
      token,
      user: sanitizeUser(user)
    })
  } catch (err) {
    console.error('Register Error:', err)
    res.status(500).json({ success: false, message: 'خطای سرور' })
  }
}

exports.login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'JWT_SECRET در سرور تنظیم نشده است.' })
    }

    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'ایمیل و رمز عبور الزامی است.' })
    }

    const user = await User.findOne({ where: { email } })
    if (!user) return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ success: false, message: 'رمز عبور اشتباه است.' })

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
    setAuthCookie(res, token)

    res.json({
      success: true,
      message: 'ورود موفق.',
      token,
      user: sanitizeUser(user)
    })
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

exports.TOKEN_COOKIE = TOKEN_COOKIE
