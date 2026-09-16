import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { resetTestDb, testDb } from '../fixtures/in-memory-db.js';
import authRoutes from '../../routes/auth.js';

vi.mock('../../db/init.js', () => ({ getDb: async () => testDb }));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeAll(async () => {
    await resetTestDb();
  });

  it('logs in with valid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'student@test.local', password: 'TestPassword123!' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ token: expect.any(String), user: expect.any(Object) }));
    expect(response.body.user).toEqual(expect.objectContaining({
      email: 'student@test.local',
      role: 'student',
      college_id: 'college-default',
      is_active: true,
    }));
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'student@test.local', password: 'wrong-password' });
    expect(response.status).toBe(401);
  });

  it('rejects missing credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'student@test.local' });
    expect(response.status).toBe(400);
  });

  it('registers a new user and returns a token', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      email: 'new-user@test.local', password: 'SecurePass123!', name: 'New User', role: 'student',
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ token: expect.any(String), user: expect.any(Object) }));
    expect(response.body.user).toEqual(expect.objectContaining({
      email: 'new-user@test.local',
      role: 'student',
      college_id: 'college-default',
      is_active: true,
    }));

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'new-user@test.local',
      password: 'SecurePass123!',
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user).toEqual(expect.objectContaining({
      email: 'new-user@test.local',
      role: 'student',
      college_id: 'college-default',
      is_active: true,
    }));
  });

  it('rejects unauthenticated user lookup', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});
