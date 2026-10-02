import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { generateToken } from '../../utils/auth.js';
import adminProvisioningRoutes from '../../routes/admin-provisioning.js';

vi.mock('../../db/init.js', () => ({
  getDb: vi.fn(async () => {
    throw new Error('Database should not be reached for rejected requests');
  }),
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminProvisioningRoutes);

function tokenFor(role: string): string {
  return generateToken({
    userId: `${role}-user`,
    email: `${role}@test.local`,
    role,
    collegeId: 'college-default',
  });
}

describe('Admin account provisioning routes', () => {
  it('rejects unauthenticated account provisioning', async () => {
    const response = await request(app).post('/api/admin/students').send({});
    expect(response.status).toBe(401);
  });

  it('returns 403 when a non-admin tries to provision staff', async () => {
    const response = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', `Bearer ${tokenFor('student')}`)
      .send({});

    expect(response.status).toBe(403);
  });

  it('rejects passwords weaker than eight characters', async () => {
    const response = await request(app)
      .post('/api/admin/students')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ email: 'student@example.com', password: 'short', name: 'Test', generatedId: 'STU-1000' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/8 characters/);
  });

  it('returns missing profile field details', async () => {
    const response = await request(app)
      .post('/api/admin/students')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ email: 'student@example.com', password: 'SecurePass123!', name: 'Test', generatedId: 'STU-1000', profile: {} });

    expect(response.status).toBe(400);
    expect(response.body.fields).toContain('course');
    expect(response.body.fields).toContain('guardian_name');
  });
});
