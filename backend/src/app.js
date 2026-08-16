// backend/src/app.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')  // ✅ اضافه‌شده برای احراز هویت Socket.io
const mqttService = require('./services/mqttService')
const http = require('http')              // ✅ جدید: برای ساخت سرور HTTP
const { Server } = require('socket.io')   // ✅ جدید: ایمپورت Socket.io

const app = express()
const PORT = process.env.PORT || 3001

// ✅ ۱. Middlewareهای پایه
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ✅ ۲. Middlewareهای امنیتی
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}))

const isDev = process.env.NODE_ENV !== 'production'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تعداد تلاش‌های ورود/ثبت‌نام بیش از حد است. ۱۵ دقیقه صبر کنید.' }
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تعداد درخواست‌ها بیش از حد است. لطفاً بعداً تلاش کنید.' }
})

// ✅ ۳. API سلامت سرور (بدون rate limit)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  })
})

// ✅ ۴. روت‌ها
app.use('/api/auth', authLimiter, require('./routes/authRoutes'))
app.use('/api/user', apiLimiter, require('./routes/userRoutes'))

// ✅ ۵. هندلر ۴۰۴
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'مسیر یافت نشد' })
})

// ✅ ۶. هندلر سراسری خطاها
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.stack)
  const message = process.env.NODE_ENV === 'production' 
    ? 'خطای داخلی سرور' 
    : (err.message || 'خطای ناشناخته')
  res.status(err.status || 500).json({ success: false, message })
})

// ==================== ✅ بخش جدید: Socket.io ====================

// ✅ ایجاد سرور HTTP و اتصال Socket.io به آن
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  }
})

// ✅ ذخیره io در app برای دسترسی در سرویس‌ها (مثل mqttService)
app.set('socketio', io)

// ✅ Middleware اعتبارسنجی توکن برای Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
  
  if (!token) {
    console.warn(`⚠️ Socket connection rejected: No token provided from ${socket.handshake.address}`)
    return next(new Error('Authentication required: No token provided'))
  }
  
  // ✅ اعتبارسنجی JWT_SECRET
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('CHANGE_THIS') || process.env.JWT_SECRET === 'dev_jwt_secret_change_in_production') {
    console.error('❌ CRITICAL: JWT_SECRET not configured for Socket.io auth!')
    return next(new Error('Server configuration error'))
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.id || decoded.userId || decoded.user?.id
    
    if (!socket.userId) {
      return next(new Error('Invalid token structure'))
    }
    
    console.log(`✅ Socket authenticated: User ${socket.userId}`)
    next()
  } catch (err) {
    console.warn(`⚠️ Socket auth failed: ${err.message}`)
    next(new Error('Authentication failed: Invalid or expired token'))
  }
})

// ✅ هندل اتصال کلاینت‌ها
io.on('connection', (socket) => {
  console.log(`🔗 Socket client connected: ${socket.id} (User: ${socket.userId || 'unknown'})`)
  
  socket.on('disconnect', () => {
    console.log(`🔌 Socket client disconnected: ${socket.id}`)
  })
  
  // ✅ هندل پیام‌های تست از فرانت‌اند (اختیاری برای دیباگ)
  socket.on('client:ping', (data) => {
    console.log(`📡 Received ping from client:`, data)
    socket.emit('server:pong', { timestamp: new Date().toISOString() })
  })
})

// ==================== ✅ پایان بخش Socket.io ====================

// ✅ ۷. تابع شروع سرور با ترتیب صحیح (async/await)
const sequelize = require('./models').sequelize

async function startServer() {
  try {
    // 🔹 سینک دیتابیس (فقط در توسعه)
if (process.env.NODE_ENV !== 'production') {
  sequelize.sync({ alter: true })
    .then(() => console.log('✅ Database schema synced (Dev Mode)'))
    .catch(err => console.error('❌ Sync failed:', err))
} else {
  console.log('ℹ️ Production mode: Skipping DB sync. Use migrations instead.')
}
    
    // 🔹 اتصال به MQTT
    await mqttService.connect()
    console.log('✅ MQTT service connected')

    // ✅ شروع زمان‌بند اجرای سناریوها
mqttService.startScenarioScheduler()
// ✅ شروع پاک‌سازی سناریوهای منقضی‌شده
mqttService.startScenarioCleanup()
    
    // 🔹 شروع سرور HTTP (که شامل Socket.io هم هست)
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Smart Home API running on port ${PORT}`)
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`)
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`)
      console.log(`📡 Accessible from: http://0.0.0.0:${PORT}`)
      console.log(`🔌 Socket.io ready for real-time updates`)
    })
    
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

// ✅ فراخوانی تابع شروع
startServer()

// ✅ ۸. قطع اتصال‌ها هنگام shutdown (Graceful Shutdown)
// ✅ ۸. قطع اتصال‌ها هنگام shutdown (Graceful Shutdown)
// ✅ Graceful Shutdown Handler
async function gracefulShutdown(signal) {
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`)
  
  const SHUTDOWN_TIMEOUT = 30000 // 30 seconds timeout
  const shutdownTimeout = setTimeout(() => {
    console.error('❌ Shutdown timeout reached. Forcing exit.')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT)
  
  try {
    // ۱. توقف تمام زمان‌بندها
    console.log('⏹️ Stopping scenario schedulers...')
    mqttService.stopScenarioScheduler()
    mqttService.stopScenarioCleanup()
    
    // ۲. اجرای graceful shutdown برای MQTT Service
    console.log('🔌 Shutting down MQTT service...')
    await mqttService.gracefulShutdown()
    
    // ۳. بستن تمام اتصالات Socket.io
    console.log('🔌 Closing Socket.io connections...')
    io.close()
    console.log('✅ Socket.io closed')
    
    // ۴. بستن دیتابیس
    console.log('🗄️ Closing database connections...')
    await sequelize.close()
    console.log('✅ Database closed')
    
    // ۵. بستن سرور HTTP
    console.log('🌐 Closing HTTP server...')
    server.close(() => {
      console.log('✅ HTTP server closed')
      clearTimeout(shutdownTimeout)
      process.exit(0)
    })
    
  } catch (err) {
    console.error('❌ Shutdown error:', err)
    clearTimeout(shutdownTimeout)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  gracefulShutdown('uncaughtException')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})

// ✅ اکسپورت app برای تست‌ها
module.exports = app