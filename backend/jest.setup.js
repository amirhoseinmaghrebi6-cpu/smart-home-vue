process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_jest_only';
process.env.PORT = '3002';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

// جعل کردن ماژول‌های دیتابیس برای جلوگیری از خطای اتصال
jest.mock('./src/models', () => {
  return {
    sequelize: {
      sync: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve())
    },
    Device: { findOne: jest.fn(), create: jest.fn() },
    User: { findOne: jest.fn(), create: jest.fn() },
    DeviceAccess: { findOne: jest.fn(), create: jest.fn() }
  };
});

// جعل کردن سرویس MQTT
jest.mock('./src/services/mqttService', () => ({
  connect: jest.fn(),
  publish: jest.fn(),
  startScenarioScheduler: jest.fn(),
  gracefulShutdown: jest.fn()
}));
