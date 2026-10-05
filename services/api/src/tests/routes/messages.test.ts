import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { messages, resetTestDb, testDb } from '../fixtures/in-memory-db.js';
import authRoutes from '../../routes/auth.js';
import messageRoutes from '../../routes/messages.js';

vi.mock('../../db/init.js', () => ({ getDb: async () => testDb }));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

async function login(email: string, password: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token;
}

describe('Message routes', () => {
  let studentToken: string;
  let wardenToken: string;

  beforeAll(async () => {
    await resetTestDb();
    studentToken = await login('student@test.local', 'TestPassword123!');
    wardenToken = await login('warden@test.local', 'WardenPass123!');
  });

  it('persists a message and returns the backend record', async () => {
    const response = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ receiverId: 'warden-user', subject: 'Question', content: 'Can I change rooms?' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({
      sender_id: 'student-user',
      receiver_id: 'warden-user',
      content: 'Can I change rooms?',
      subject: 'Question',
      is_read: false,
    }));
    expect(messages).toHaveLength(1);
  });

  it('reads only the authenticated receiver message and persists read state', async () => {
    const created = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ receiverId: 'warden-user', content: 'Please review this.' });

    const response = await request(app)
      .patch(`/api/messages/${created.body.id}/read`)
      .set('Authorization', `Bearer ${wardenToken}`);

    expect(response.status).toBe(200);
    expect(response.body.is_read).toBe(true);
    expect(messages.find(message => message.id === created.body.id)?.is_read).toBe(true);
  });

  it('returns only messages belonging to the authenticated user', async () => {
    const response = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.every((message: { sender_id: string; receiver_id: string }) =>
      message.sender_id === 'student-user' || message.receiver_id === 'student-user'
    )).toBe(true);
  });
});
