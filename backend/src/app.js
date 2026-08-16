// backend/src/app.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')  // âœ… Ø§Ø¶Ø§ÙÙ‡â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ø§Ø­Ø±Ø§Ø² Ù‡ÙˆÛŒØª Socket.io
const mqttService = require('./services/mqttService')
const http = require('http')              // âœ… Ø¬Ø¯ÛŒØ¯: Ø¨Ø±Ø§ÛŒ Ø³Ø§Ø®Øª Ø³Ø±ÙˆØ± HTTP
const { Server } = require('socket.io')   // âœ… Ø¬Ø¯ÛŒØ¯: Ø§ÛŒÙ…Ù¾ÙˆØ±Øª Socket.io

const app = express()
const PORT = process.env.PORT || 3001

// âœ… Û±. MiddlewareÙ‡Ø§ÛŒ Ù¾Ø§ÛŒÙ‡
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// âœ… Û². MiddlewareÙ‡Ø§ÛŒ Ø§Ù…Ù†ÛŒØªÛŒ
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
  message: { success: false, message: 'ØªØ¹Ø¯Ø§Ø¯ ØªÙ„Ø§Ø´â€ŒÙ‡Ø§ÛŒ ÙˆØ±ÙˆØ¯/Ø«Ø¨Øªâ€ŒÙ†Ø§Ù… Ø¨ÛŒØ´ Ø§Ø² Ø­Ø¯ Ø§Ø³Øª. Û±Ûµ Ø¯Ù‚ÛŒÙ‚Ù‡ ØµØ¨Ø± Ú©Ù†ÛŒØ¯.' }
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'ØªØ¹Ø¯Ø§Ø¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§ Ø¨ÛŒØ´ Ø§Ø² Ø­Ø¯ Ø§Ø³Øª. Ù„Ø·ÙØ§Ù‹ Ø¨Ø¹Ø¯Ø§Ù‹ ØªÙ„Ø§Ø´ Ú©Ù†ÛŒØ¯.' }
})

// âœ… Û³. API Ø³Ù„Ø§Ù…Øª Ø³Ø±ÙˆØ± (Ø¨Ø¯ÙˆÙ† rate limit)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  })
})

// âœ… Û´. Ø±ÙˆØªâ€ŒÙ‡Ø§
app.use('/api/auth', authLimiter, require('./routes/authRoutes'))
app.use('/api/user', apiLimiter, require('./routes/userRoutes'))

// âœ… Ûµ. Ù‡Ù†Ø¯Ù„Ø± Û´Û°Û´
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ù…Ø³ÛŒØ± ÛŒØ§ÙØª Ù†Ø´Ø¯' })
})

// âœ… Û¶. Ù‡Ù†Ø¯Ù„Ø± Ø³Ø±Ø§Ø³Ø±ÛŒ Ø®Ø·Ø§Ù‡Ø§
app.use((err, req, res, next) => {
  console.error('âŒ Global Error:', err.stack)
  const message = process.env.NODE_ENV === 'production' 
    ? 'Ø®Ø·Ø§ÛŒ Ø¯Ø§Ø®Ù„ÛŒ Ø³Ø±ÙˆØ±' 
    : (err.message || 'Ø®Ø·Ø§ÛŒ Ù†Ø§Ø´Ù†Ø§Ø®ØªÙ‡')
  res.status(err.status || 500).json({ success: false, message })
})

// ==================== âœ… Ø¨Ø®Ø´ Ø¬Ø¯ÛŒØ¯: Socket.io ====================

// âœ… Ø§ÛŒØ¬Ø§Ø¯ Ø³Ø±ÙˆØ± HTTP Ùˆ Ø§ØªØµØ§Ù„ Socket.io Ø¨Ù‡ Ø¢Ù†
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  }
})

// âœ… Ø°Ø®ÛŒØ±Ù‡ io Ø¯Ø± app Ø¨Ø±Ø§ÛŒ Ø¯Ø³ØªØ±Ø³ÛŒ Ø¯Ø± Ø³Ø±ÙˆÛŒØ³â€ŒÙ‡Ø§ (Ù…Ø«Ù„ mqttService)
app.set('socketio', io)

// âœ… Middleware Ø§Ø¹ØªØ¨Ø§Ø±Ø³Ù†Ø¬ÛŒ ØªÙˆÚ©Ù† Ø¨Ø±Ø§ÛŒ Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
  
  if (!token) {
    console.warn(`âš ï¸ Socket connection rejected: No token provided from ${socket.handshake.address}`)
    return next(new Error('Authentication required: No token provided'))
  }
  
  // âœ… Ø§Ø¹ØªØ¨Ø§Ø±Ø³Ù†Ø¬ÛŒ JWT_SECRET
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('CHANGE_THIS') || process.env.JWT_SECRET === 'dev_jwt_secret_change_in_production') {
    console.error('âŒ CRITICAL: JWT_SECRET not configured for Socket.io auth!')
    return next(new Error('Server configuration error'))
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.id || decoded.userId || decoded.user?.id
    
    if (!socket.userId) {
      return next(new Error('Invalid token structure'))
    }
    
    console.log(`âœ… Socket authenticated: User ${socket.userId}`)
    next()
  } catch (err) {
    console.warn(`âš ï¸ Socket auth failed: ${err.message}`)
    next(new Error('Authentication failed: Invalid or expired token'))
  }
})

// âœ… Ù‡Ù†Ø¯Ù„ Ø§ØªØµØ§Ù„ Ú©Ù„Ø§ÛŒÙ†Øªâ€ŒÙ‡Ø§
io.on('connection', (socket) => {
  console.log(`ðŸ”— Socket client connected: ${socket.id} (User: ${socket.userId || 'unknown'})`)
  
  socket.on('disconnect', () => {
    console.log(`ðŸ”Œ Socket client disconnected: ${socket.id}`)
  })
  
  // âœ… Ù‡Ù†Ø¯Ù„ Ù¾ÛŒØ§Ù…â€ŒÙ‡Ø§ÛŒ ØªØ³Øª Ø§Ø² ÙØ±Ø§Ù†Øªâ€ŒØ§Ù†Ø¯ (Ø§Ø®ØªÛŒØ§Ø±ÛŒ Ø¨Ø±Ø§ÛŒ Ø¯ÛŒØ¨Ø§Ú¯)
  socket.on('client:ping', (data) => {
    console.log(`ðŸ“¡ Received ping from client:`, data)
    socket.emit('server:pong', { timestamp: new Date().toISOString() })
  })
})

// ==================== âœ… Ù¾Ø§ÛŒØ§Ù† Ø¨Ø®Ø´ Socket.io ====================

// âœ… Û·. ØªØ§Ø¨Ø¹ Ø´Ø±ÙˆØ¹ Ø³Ø±ÙˆØ± Ø¨Ø§ ØªØ±ØªÛŒØ¨ ØµØ­ÛŒØ­ (async/await)
const sequelize = require('./models').sequelize

async function startServer() {
  try {
    // ðŸ”¹ Ø³ÛŒÙ†Ú© Ø¯ÛŒØªØ§Ø¨ÛŒØ³ (ÙÙ‚Ø· Ø¯Ø± ØªÙˆØ³Ø¹Ù‡)
if (process.env.NODE_ENV !== 'production') {
  sequelize.sync({ alter: true })
    .then(() => console.log('âœ… Database schema synced (Dev Mode)'))
    .catch(err => console.error('âŒ Sync failed:', err))
} else {
  console.log('â„¹ï¸ Production mode: Skipping DB sync. Use migrations instead.')
}
    
    // ðŸ”¹ Ø§ØªØµØ§Ù„ Ø¨Ù‡ MQTT
    await mqttService.connect()
    console.log('âœ… MQTT service connected')

    // âœ… Ø´Ø±ÙˆØ¹ Ø²Ù…Ø§Ù†â€ŒØ¨Ù†Ø¯ Ø§Ø¬Ø±Ø§ÛŒ Ø³Ù†Ø§Ø±ÛŒÙˆÙ‡Ø§
mqttService.startScenarioScheduler()
// âœ… Ø´Ø±ÙˆØ¹ Ù¾Ø§Ú©â€ŒØ³Ø§Ø²ÛŒ Ø³Ù†Ø§Ø±ÛŒÙˆÙ‡Ø§ÛŒ Ù…Ù†Ù‚Ø¶ÛŒâ€ŒØ´Ø¯Ù‡
mqttService.startScenarioCleanup()
    
    // ðŸ”¹ Ø´Ø±ÙˆØ¹ Ø³Ø±ÙˆØ± HTTP (Ú©Ù‡ Ø´Ø§Ù…Ù„ Socket.io Ù‡Ù… Ù‡Ø³Øª)
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`ðŸš€ Smart Home API running on port ${PORT}`)
      console.log(`ðŸŒ Environment: ${process.env.NODE_ENV}`)
      console.log(`ðŸ”— Health check: http://localhost:${PORT}/api/health`)
      console.log(`ðŸ“¡ Accessible from: http://0.0.0.0:${PORT}`)
      console.log(`ðŸ”Œ Socket.io ready for real-time updates`)
    })
    
  } catch (err) {
    console.error('âŒ Failed to start server:', err)
    process.exit(1)
  }
}

// âœ… ÙØ±Ø§Ø®ÙˆØ§Ù†ÛŒ ØªØ§Ø¨Ø¹ Ø´Ø±ÙˆØ¹
startServer()

// âœ… Û¸. Ù‚Ø·Ø¹ Ø§ØªØµØ§Ù„â€ŒÙ‡Ø§ Ù‡Ù†Ú¯Ø§Ù… shutdown (Graceful Shutdown)
// âœ… Û¸. Ù‚Ø·Ø¹ Ø§ØªØµØ§Ù„â€ŒÙ‡Ø§ Ù‡Ù†Ú¯Ø§Ù… shutdown (Graceful Shutdown)
// âœ… Graceful Shutdown Handler
async function gracefulShutdown(signal) {
  console.log(`ðŸ›‘ Received ${signal}. Shutting down gracefully...`)
  
  const SHUTDOWN_TIMEOUT = 30000 // 30 seconds timeout
  const shutdownTimeout = setTimeout(() => {
    console.error('âŒ Shutdown timeout reached. Forcing exit.')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT)
  
  try {
    // Û±. ØªÙˆÙ‚Ù ØªÙ…Ø§Ù… Ø²Ù…Ø§Ù†â€ŒØ¨Ù†Ø¯Ù‡Ø§
    console.log('â¹ï¸ Stopping scenario schedulers...')
    mqttService.stopScenarioScheduler()
    mqttService.stopScenarioCleanup()
    
    // Û². Ø§Ø¬Ø±Ø§ÛŒ graceful shutdown Ø¨Ø±Ø§ÛŒ MQTT Service
    console.log('ðŸ”Œ Shutting down MQTT service...')
    await mqttService.gracefulShutdown()
    
    // Û³. Ø¨Ø³ØªÙ† ØªÙ…Ø§Ù… Ø§ØªØµØ§Ù„Ø§Øª Socket.io
    console.log('ðŸ”Œ Closing Socket.io connections...')
    io.close()
    console.log('âœ… Socket.io closed')
    
    // Û´. Ø¨Ø³ØªÙ† Ø¯ÛŒØªØ§Ø¨ÛŒØ³
    console.log('ðŸ—„ï¸ Closing database connections...')
    await sequelize.close()
    console.log('âœ… Database closed')
    
    // Ûµ. Ø¨Ø³ØªÙ† Ø³Ø±ÙˆØ± HTTP
    console.log('ðŸŒ Closing HTTP server...')
    server.close(() => {
      console.log('âœ… HTTP server closed')
      clearTimeout(shutdownTimeout)
      process.exit(0)
    })
    
  } catch (err) {
    console.error('âŒ Shutdown error:', err)
    clearTimeout(shutdownTimeout)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('âŒ Uncaught Exception:', err)
  gracefulShutdown('uncaughtException')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('âŒ Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})

// âœ… Ø§Ú©Ø³Ù¾ÙˆØ±Øª app Ø¨Ø±Ø§ÛŒ ØªØ³Øªâ€ŒÙ‡Ø§
module.exports = app
