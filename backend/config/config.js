require('dotenv').config()

const baseConfig = { dialect: 'postgres', logging: false }
const databaseConfig = (databaseFallback) => ({
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || databaseFallback,
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  ...baseConfig
})

module.exports = {
  development: databaseConfig('smart_home'),
  production: databaseConfig(undefined),
  test: databaseConfig('smart_home_test')
}
