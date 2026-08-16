#!/usr/bin/env node
/**
 * اسکریپت تولید Secrets امن برای استقرار Production
 * استفاده: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function generatePassword(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

console.log('🔐 Generating secure secrets for Smart Home production deployment...\n');

const secrets = {
  JWT_SECRET: generateSecret(64),
  DB_PASSWORD: generatePassword(32),
  MQTT_PASSWORD: generatePassword(32),
  INFLUXDB_TOKEN: generateSecret(64),
  REDIS_PASSWORD: generatePassword(32)
};

console.log('✅ Generated secrets:\n');
console.log('='.repeat(80));
console.log('JWT_SECRET=' + secrets.JWT_SECRET);
console.log('DB_PASSWORD=' + secrets.DB_PASSWORD);
console.log('MQTT_PASSWORD=' + secrets.MQTT_PASSWORD);
console.log('INFLUXDB_TOKEN=' + secrets.INFLUXDB_TOKEN);
console.log('REDIS_PASSWORD=' + secrets.REDIS_PASSWORD);
console.log('='.repeat(80));

console.log('\n📝 Copy these values to your .env files and docker-compose.yml\n');

console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('   1. Store these secrets in a secure password manager');
console.log('   2. Never commit .env files to version control');
console.log('   3. Use Docker secrets or environment variables in production');
console.log('   4. Rotate secrets regularly (every 90 days recommended)\n');

module.exports = { generateSecret, generatePassword };
