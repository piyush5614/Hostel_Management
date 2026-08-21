import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { seedTestData, cleanupTestData } from '../fixtures/seed';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const baseURL = 'http://localhost:3001';

// Skip these integration tests if backend is not running or Supabase is not configured
// These tests require a running backend with proper Supabase configuration
describe.skip('Leave Routes (CRITICAL WORKFLOW)', () => {
  let testData: Awaited<ReturnType<typeof seedTestData>>;
  let studentToken: string = '';
  let wardenToken: string = '';

  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(baseURL)
      .post('/auth/login')
      .send({ email, password });

    if (response.status === 200 || response.status === 201) {
      return response.body.token;
    }
    throw new Error(`Failed to get token for ${email}`);
  }

  beforeAll(async () => {
    testData = await seedTestData();
    console.log('Leave test data seeded');

    const student = testData.testUsers['student'];
    const warden = testData.testUsers['warden'];

    if (!student || !warden) {
      throw new Error('Student or warden test user not created');
    }

    try {
      studentToken = await getAuthToken(student.email, student.password);
      wardenToken = await getAuthToken(warden.email, warden.password);
      console.log('Tokens obtained for leave tests');
    } catch (error) {
      console.error('Failed to obtain tokens:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await cleanupTestData(testData.testUsers);
    console.log('Leave test data cleaned up');
  });

  describe('POST /leave (Create leave request)', () => {
    it('should create leave request as student', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3);

      const response = await request(baseURL)
        .post('/leave')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reason: 'Family visit',
          emergency_contact: '9876543210',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
    });

    it('should reject invalid date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 3);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // end before start

      const response = await request(baseURL)
        .post('/leave')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reason: 'Family visit',
          emergency_contact: '9876543210',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject without authentication', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3);

      const response = await request(baseURL)
        .post('/leave')
        .send({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reason: 'Family visit',
          emergency_contact: '9876543210',
        });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /leave/pending (Warden approval view)', () => {
    it('should list pending leave requests for warden', async () => {
      const response = await request(baseURL)
        .get('/leave/pending')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject student access to pending leaves', async () => {
      const response = await request(baseURL)
        .get('/leave/pending')
        .set('Authorization', `Bearer ${studentToken}`);

      expect([403, 401]).toContain(response.status);
    });

    it('should reject without authentication', async () => {
      const response = await request(baseURL)
        .get('/leave/pending');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('PATCH /leave/{id}/approve (CRITICAL WORKFLOW)', () => {
    let leaveId: string = '';

    beforeAll(async () => {
      // Create a leave request first
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const createResponse = await request(baseURL)
        .post('/leave')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reason: 'Family visit',
          emergency_contact: '9876543210',
        });

      if (createResponse.status === 200 || createResponse.status === 201) {
        leaveId = createResponse.body.id;
        console.log('Leave created for approval test:', leaveId);
      }
    });

    it('should approve leave request as warden', async () => {
      if (!leaveId) {
        expect.fail('Leave ID not set');
      }

      const response = await request(baseURL)
        .patch(`/leave/${leaveId}/approve`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ comment: 'Approved' });

      expect([200, 201]).toContain(response.status);
      expect(response.body.status).toBe('approved');
    });

    it('should reject student approval', async () => {
      // Create another leave for this test
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 8);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const createResponse = await request(baseURL)
        .post('/leave')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reason: 'Personal',
          emergency_contact: '9876543210',
        });

      if (createResponse.status !== 200 && createResponse.status !== 201) {
        expect.fail('Failed to create leave for student approval test');
      }

      const testLeaveId = createResponse.body.id;

      const response = await request(baseURL)
        .patch(`/leave/${testLeaveId}/approve`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ comment: 'Approved' });

      expect([403, 401]).toContain(response.status);
    });
  });

  describe('PATCH /leave/{id}/reject', () => {
    let leaveId: string = '';

    beforeAll(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 11);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 13);

      const createResponse = await request(baseURL)
        .post('/leave')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reason: 'Personal',
          emergency_contact: '9876543210',
        });

      if (createResponse.status === 200 || createResponse.status === 201) {
        leaveId = createResponse.body.id;
      }
    });

    it('should reject leave request as warden', async () => {
      if (!leaveId) {
        expect.fail('Leave ID not set');
      }

      const response = await request(baseURL)
        .patch(`/leave/${leaveId}/reject`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ reason: 'Already on leave' });

      expect([200, 201]).toContain(response.status);
      expect(response.body.status).toBe('rejected');
    });

    it('should reject student rejection', async () => {
      // Create another leave for this test
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 14);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 16);

      const createResponse = await request(baseURL)
        .post('/leave')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reason: 'Medical',
          emergency_contact: '9876543210',
        });

      if (createResponse.status !== 200 && createResponse.status !== 201) {
        expect.fail('Failed to create leave for student rejection test');
      }

      const testLeaveId = createResponse.body.id;

      const response = await request(baseURL)
        .patch(`/testLeaveId}/reject`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ reason: 'Changed mind' });

      expect([403, 401]).toContain(response.status);
    });
  });
});
