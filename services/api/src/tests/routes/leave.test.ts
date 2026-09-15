import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { resetTestDb, testDb } from '../fixtures/in-memory-db.js';
import authRoutes from '../../routes/auth.js';
import leaveRoutes from '../../routes/leave.js';

vi.mock('../../db/init.js', () => ({ getDb: async () => testDb }));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/leave-requests', leaveRoutes);

async function login(email: string, password: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token;
}

async function createLeave(studentToken: string) {
  return request(app)
    .post('/api/leave-requests')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      studentId: 'student-record',
      type: 'home-leave',
      startDate: '2030-01-02T00:00:00.000Z',
      endDate: '2030-01-04T00:00:00.000Z',
      reason: 'Family visit',
      emergencyContact: '9876543210',
    });
}

describe('Leave Routes (CRITICAL WORKFLOW)', () => {
  let studentToken: string;
  let wardenToken: string;

  beforeAll(async () => {
    await resetTestDb();
    studentToken = await login('student@test.local', 'TestPassword123!');
    wardenToken = await login('warden@test.local', 'WardenPass123!');
  });

  it('requires authentication to create a leave request', async () => {
    const response = await request(app).post('/api/leave-requests').send({ studentId: 'student-record' });
    expect(response.status).toBe(401);
  });

  it('creates a pending leave request as a student', async () => {
    const response = await createLeave(studentToken);
    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ id: expect.any(String), status: 'pending' }));
  });

  it('prevents students from approving a leave request', async () => {
    const created = await createLeave(studentToken);
    const response = await request(app)
      .patch(`/api/leave-requests/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.status).toBe(403);
  });

  it('requires parent-call verification before approval', async () => {
    const created = await createLeave(studentToken);
    const response = await request(app)
      .patch(`/api/leave-requests/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${wardenToken}`);
    expect(response.status).toBe(400);
  });

  it('verifies and approves a leave request as a warden', async () => {
    const created = await createLeave(studentToken);
    const id = created.body.id;
    const verified = await request(app)
      .patch(`/api/leave-requests/${id}/verify-call`)
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({ notes: 'Parent contacted' });
    expect(verified.status).toBe(200);
    const approved = await request(app)
      .patch(`/api/leave-requests/${id}/approve`)
      .set('Authorization', `Bearer ${wardenToken}`);
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('approved');
  });

  it('rejects a leave request as a warden', async () => {
    const created = await createLeave(studentToken);
    const response = await request(app)
      .patch(`/api/leave-requests/${created.body.id}/reject`)
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({ reason: 'Not approved' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('rejected');
  });
});
