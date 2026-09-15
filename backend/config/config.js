module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './dev-database.sqlite', // فایل دیتابیس در پوشه backend ساخته می‌شود
    logging: false
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  production: {
    // در پروداکشن همچنان از متغیرهای محیطی (PostgreSQL) استفاده می‌کند
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    }
  }
};
