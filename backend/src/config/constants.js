// backend/src/config/constants.js
module.exports = {
  // Name of the cookie that stores the auth token
  TOKEN_COOKIE: process.env.TOKEN_COOKIE_NAME || 'sh_auth_token',
  // JWT expiration
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
}
