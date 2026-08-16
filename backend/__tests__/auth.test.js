const request = require('supertest');
const app = require('../src/app'); // فرض بر این است که app را export کرده‌اید
const { sequelize } = require('../src/models');

describe('Authentication Tests', () => {
  beforeAll(async () => {
    await sequelize.sync(); 
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.statusCode).toBe(401);
  });

  it('should register a new user', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'StrongPass123!'
    };
    const res = await request(app).post('/api/auth/register').send(userData);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
