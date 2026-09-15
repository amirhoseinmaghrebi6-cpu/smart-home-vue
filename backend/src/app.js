// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// ایمپورت سرویس‌ها و مدل‌ها
const mqttService = require('./services/mqttService');
const sequelize = require('./models').sequelize;

// ✅ فراخوانی پیکربندی Passport (حیاتی برای ورود گوگل)
require('./config/passport')();

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== Middlewareها ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session (برای OAuth گوگل ضروری است)
app.use(session({
  secret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// فعال‌سازی Passport
app.use(passport.initialize());
app.use(passport.session());

// امنیت و CORS
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate Limiting
const isDev = process.env.NODE_ENV !== 'production';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 10,
  message: { success: false, message: 'تعداد تلاش‌ها بیش از حد است.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 200,
  message: { success: false, message: 'تعداد درخواست‌ها بیش از حد است.' }
});

// ==================== Routes ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// روت‌های احراز هویت
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
// روت‌های کاربر (اگر دارید)
// app.use('/api/user', apiLimiter, require('./routes/userRoutes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'مسیر یافت نشد' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.stack);
  res.status(err.status || 500).json({ 
    success: false, 
    message: process.env.NODE_ENV === 'production' ? 'خطای داخلی سرور' : err.message 
  });
});

// ==================== Socket.io Setup ====================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

app.set('socketio', io);

// Socket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) return next(new Error('Authentication required'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id || decoded.userId;
    if (!socket.userId) throw new Error('Invalid token');
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔗 Socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔌 Socket disconnected: ${socket.id}`));
});

// ==================== Server Start ====================
async function startServer() {
  try {
    // Sync Database
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database schema synced');
    }

    // MQTT (اختیاری - خطا کشنده نیست)
    mqttService.connect().catch(err => console.warn('⚠️ MQTT connection delayed:', err.message));
    mqttService.startScenarioScheduler();
    mqttService.startScenarioCleanup();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
      
      // بررسی تنظیمات گوگل
      if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
        console.warn('⚠️ Google OAuth credentials missing in .env');
      } else {
        console.log('✅ Google OAuth configured');
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  server.close(() => process.exit(0));
});

module.exports = app;