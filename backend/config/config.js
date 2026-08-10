// ✅ Dynamic configuration using environment variables
require('dotenv').config()

const baseConfig = {
  dialect: 'postgres',
  logging: false
}

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Amir_1362',
    database: process.env.DB_NAME || 'smart_home',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    ...baseConfig
  },
  
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    ...baseConfig
  },

  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Amir_1362',
    database: process.env.DB_NAME || 'smart_home_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    ...baseConfig
  }
}
