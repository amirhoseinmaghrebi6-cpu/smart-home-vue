// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken')
const { User } = require('../models')
const { TOKEN_COOKIE } = require('../controllers/authController')

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    const token = req.cookies?.[TOKEN_COOKIE] || headerToken

    if (!token) {
      return res.status(401).json({ success: false, message: 'دسترسی غیرمجاز: توکن ارسال نشده' })
    }

    // ✅ اعتبارسنجی JWT_SECRET قبل از استفاده
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_jwt_secret_change_in_production' || process.env.JWT_SECRET.startsWith('CHANGE_THIS')) {
      console.error('❌ CRITICAL: JWT_SECRET is not properly configured!')
      return res.status(500).json({ success: false, message: 'پیکربندی سرور نامعتبر است' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // ✅ پشتیبانی از هر دو کلید احتمالی: id یا userId
    const userId = decoded.id || decoded.userId || decoded.user?.id
    
    if (!userId) {
      console.error('❌ JWT payload missing user identifier:', decoded)
      return res.status(401).json({ success: false, message: 'ساختار توکن نامعتبر است' })
    }

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    })

    if (!user) {
      return res.status(401).json({ success: false, message: 'کاربر یافت نشد' })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'توکن نامعتبر است' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'توکن منقضی شده است' })
    }
    console.error('Auth middleware error:', error)
    res.status(500).json({ success: false, message: 'خطا در سرور' })
  }
}