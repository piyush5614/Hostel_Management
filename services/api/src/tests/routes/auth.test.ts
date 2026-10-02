import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { resetTestDb, testDb, users } from '../fixtures/in-memory-db.js';
import authRoutes from '../../routes/auth.js';

process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

vi.mock('../../db/init.js', () => ({ getDb: async () => testDb }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        if (email === 'student@test.local' && password === 'TestPassword123!') {
          return { data: { user: { id: 'student-auth', email } }, error: null };
        }
        if (email === 'warden@test.local' && password === 'WardenPass123!') {
          return { data: { user: { id: 'warden-auth', email } }, error: null };
        }
        return { data: { user: null }, error: { message: 'Invalid login credentials' } };
      },
    },
  }),
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeAll(async () => {
    await resetTestDb();
  });

  it('logs in with provisioned email credentials', async () => {
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

  it('logs in with the provisioned generated ID', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'STU-0001', password: 'TestPassword123!' });
    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(expect.objectContaining({
      id: 'student-user',
      generated_id: 'STU-0001',
      role: 'student',
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

  it('permanently disables public self-signup', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      email: 'new-user@test.local', password: 'SecurePass123!', name: 'New User', role: 'admin',
    });
    expect(response.status).toBe(410);
    expect(users).toHaveLength(2);
  });

  it('rejects unauthenticated user lookup', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});
