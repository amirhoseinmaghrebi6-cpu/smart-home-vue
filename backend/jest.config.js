module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: false,
  clearMocks: true,
  // نادیده گرفتن فایل اصلی اپلیکیشن که سرور را اجرا می‌کند
  testPathIgnorePatterns: ['/node_modules/', '/src/app.js'],
  // ماک کردن خودکار ماژول‌های سنگین
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/'
  }
};
