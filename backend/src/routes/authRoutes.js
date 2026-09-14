// backend/src/routes/authRoutes.js
const express = require('express')
const router = express.Router()
const { register, login, me, logout, setupMFA, verifyMFA, verifyLoginMFA } = require('../controllers/authController')
const { authenticate } = require('../middleware/authMiddleware')

router.post('/register', register)
router.post('/login', login)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, me)
router.get('/mfa/setup', authenticate, setupMFA)
router.post('/mfa/verify', authenticate, verifyMFA)
router.post('/mfa/verify-login', verifyLoginMFA)

module.exports = router
