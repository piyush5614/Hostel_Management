import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { seedTestData, cleanupTestData } from '../fixtures/seed';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const baseURL = 'http://localhost:3001';

// Skip these integration tests if backend is not running or Supabase is not configured
// These tests require a running backend with proper Supabase configuration
describe.skip('Auth Routes', () => {
  let testData: Awaited<ReturnType<typeof seedTestData>>;

  beforeAll(async () => {
    testData = await seedTestData();
    console.log('Test data seeded:', Object.keys(testData.testUsers));
  });

  afterAll(async () => {
    await cleanupTestData(testData.testUsers);
    console.log('Test data cleaned up');
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const student = testData.testUsers['student'];
      
      if (!student) {
        expect.fail('Student test user not created');
      }

      const response = await request(baseURL)
        .post('/auth/login')
        .send({
          email: student.email,
          password: student.password,
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(student.email);
    });

    it('should reject invalid password', async () => {
      const student = testData.testUsers['student'];
      
      if (!student) {
        expect.fail('Student test user not created');
      }

      const response = await request(baseURL)
        .post('/auth/login')
        .send({
          email: student.email,
          password: 'WrongPassword123!',
        });

      expect([401, 400]).toContain(response.status);
    });

    it('should reject non-existent user', async () => {
      const response = await request(baseURL)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPassword123!',
        });

      expect([401, 400]).toContain(response.status);
    });
  });

  describe('POST /auth/register', () => {
    it('should register new user', async () => {
      const response = await request(baseURL)
        .post('/auth/register')
        .send({
          email: `newuser_${Date.now()}@test.com`,
          password: 'SecurePass123!',
          role: 'student',
        });

      expect([201, 200]).toContain(response.status);
      expect(response.body).toHaveProperty('user');
    });

    it('should reject duplicate email', async () => {
      const student = testData.testUsers['student'];
      
      if (!student) {
        expect.fail('Student test user not created');
      }

      const response = await request(baseURL)
        .post('/auth/register')
        .send({
          email: student.email,
          password: 'AnyPassword123!',
          role: 'student',
        });

      expect([400, 409]).toContain(response.status);
    });

    it('should reject weak password', async () => {
      const response = await request(baseURL)
        .post('/auth/register')
        .send({
          email: `weakpass_${Date.now()}@test.com`,
          password: 'weak',
          role: 'student',
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('GET /auth/verify (Token verification)', () => {
    it('should verify valid token', async () => {
      const student = testData.testUsers['student'];
      
      if (!student) {
        expect.fail('Student test user not created');
      }

      // First login to get token
      const loginResponse = await request(baseURL)
        .post('/auth/login')
        .send({
          email: student.email,
          password: student.password,
        });

      if (loginResponse.status !== 200 && loginResponse.status !== 201) {
        expect.fail('Failed to login for token verification test');
      }

      const token = loginResponse.body.token;

      // Verify token
      const verifyResponse = await request(baseURL)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201]).toContain(verifyResponse.status);
      expect(verifyResponse.body).toHaveProperty('user');
    });

    it('should reject missing token', async () => {
      const response = await request(baseURL)
        .get('/auth/verify');

      expect([401, 403]).toContain(response.status);
    });

    it('should reject invalid token', async () => {
      const response = await request(baseURL)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid_token_123');

      expect([401, 403]).toContain(response.status);
    });
  });
});
