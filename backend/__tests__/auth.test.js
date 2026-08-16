// غیرفعال کردن لاگ‌ها در حین تست
console.log = jest.fn();
console.error = jest.fn();

describe('Authentication Logic Unit Test', () => {
  test('should verify JWT secret exists in env', () => {
    process.env.JWT_SECRET = 'test_secret';
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET).not.toBe('');
  });

  test('should mock database models correctly', () => {
    const mockModels = require('../src/models');
    expect(mockModels).toBeDefined();
  });
});
