const express = require('express');
const router = express.Router();
const { register, login, me, logout, setupMFA, verifyMFA, googleCallback } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const passport = require('passport');

// روت‌های عمومی
router.post('/register', register);
router.post('/login', login);

// روت‌های محافظت شده
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

// روت‌های MFA
router.get('/mfa/setup', authenticate, setupMFA);
router.post('/mfa/verify', authenticate, verifyMFA);

// روت‌های گوگل
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), googleCallback);

module.exports = router;