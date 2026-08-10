// src/server/api/time.js
// ✅ API زمان با پشتیبانی جهانی (timezone پویا)

const express = require('express')
const router = express.Router()

// دریافت زمان فعلی با timezone دلخواه (پیش‌فرض: تهران)
router.get('/', (req, res) => {
  // ✅ دریافت timezone از کوئری پارامتر (?tz=Europe/London)
  const tz = req.query.tz || 'Asia/Tehran'
  
  const now = new Date()
  
  // ✅ تبدیل به زمان محلی با timezone درخواست‌شده
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  
  res.json({
    success: true,
    timestamp: localTime.getTime(),          // milliseconds since epoch
    iso: localTime.toISOString(),            // استاندارد ISO 8601
    local: localTime.toLocaleString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }),
    timezone: tz,                            // ← ← ← بازگرداندن timezone استفاده‌شده
    serverTime: now.toISOString()            // زمان سرور برای دیباگ
  })
})

module.exports = router