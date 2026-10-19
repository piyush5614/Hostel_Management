import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createGateRoutes } from '../../routes/gate.js';
import { generateToken } from '../../utils/auth.js';
import { getDb } from '../../db/init.js';

vi.mock('../../db/init.js', () => ({
  getDb: vi.fn(),
}));

const io = {
  to: () => ({ emit: vi.fn() }),
} as unknown as SocketIOServer;
const app = express();
app.use(express.json());
app.use('/api/gate', createGateRoutes(io));

function token(role: string): string {
  return generateToken({
    userId: 'test-user',
    email: 'test@example.invalid',
    role,
    collegeId: 'college-test',
  });
}

describe('gate API authorization and request validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires authentication for a scan', async () => {
    const response = await request(app).post('/api/gate/scan').send({ token: `TCHC1.${'A'.repeat(43)}` });
    expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it('prevents students from scanning QR codes', async () => {
    const response = await request(app)
      .post('/api/gate/scan')
      .set('Authorization', `Bearer ${token('student')}`)
      .send({ token: `TCHC1.${'A'.repeat(43)}` });
    expect(response.status).toBe(403);
    expect(getDb).not.toHaveBeenCalled();
  });

  it('rejects malformed tokens before any database lookup', async () => {
    const response = await request(app)
      .post('/api/gate/scan')
      .set('Authorization', `Bearer ${token('staff')}`)
      .send({ token: 'TCHC1.not-a-token' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_TOKEN_FORMAT');
    expect(getDb).not.toHaveBeenCalled();
  });

  it('requires valid reason text and category', async () => {
    const auth = { Authorization: `Bearer ${token('student')}` };
    const shortReason = await request(app)
      .post('/api/gate/movements/movement-1/reason')
      .set(auth)
      .send({ reason: '  ' });
    expect(shortReason.status).toBe(400);
    expect(shortReason.body.code).toBe('INVALID_REASON');

    const invalidCategory = await request(app)
      .post('/api/gate/movements/movement-1/reason')
      .set(auth)
      .send({ reason: 'Class attendance', category: 'unlisted' });
    expect(invalidCategory.status).toBe(400);
    expect(invalidCategory.body.code).toBe('INVALID_REASON_CATEGORY');
    expect(getDb).not.toHaveBeenCalled();
  });

  it('prevents students from exporting other students movement data', async () => {
    const response = await request(app)
      .get('/api/gate/movements/export')
      .set('Authorization', `Bearer ${token('student')}`);
    expect(response.status).toBe(403);
    expect(getDb).not.toHaveBeenCalled();
  });

  it('lets a student start a request for their own next outing', async () => {
    const movement = { id: 'movement-new', status: 'PENDING_REASON', scanned_by_role: 'student' };
    const db = {
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => table === 'students'
            ? { data: { id: 'student-record', user_id: 'test-user', enrollment_number: 'GATE-QA-1', course: 'QA', year: 1, contact_number: null, profile_image: null, room_id: null }, error: null }
            : { data: table === 'users' ? { name: 'QA Student', profile_image: null } : null, error: null },
        };
        return query;
      },
      rpc: vi.fn().mockResolvedValue({ data: { movement, created: true }, error: null }),
    };
    vi.mocked(getDb).mockResolvedValue(db as unknown as Awaited<ReturnType<typeof getDb>>);

    const response = await request(app)
      .post('/api/gate/movements/request')
      .set('Authorization', `Bearer ${token('student')}`)
      .expect(201);

    expect(response.body.movement).toEqual(movement);
    expect(db.rpc).toHaveBeenCalledWith('gate_request_movement', expect.objectContaining({
      p_college_id: 'college-test',
      p_student_user_id: 'test-user',
      p_enrollment_no: 'GATE-QA-1',
    }));
  });

  it('returns an active-request conflict instead of creating a second outing', async () => {
    const db = {
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => table === 'students'
            ? { data: { id: 'student-record', user_id: 'test-user', enrollment_number: 'GATE-QA-1', course: 'QA', year: 1, contact_number: null, profile_image: null, room_id: null }, error: null }
            : { data: table === 'users' ? { name: 'QA Student', profile_image: null } : null, error: null },
        };
        return query;
      },
      rpc: vi.fn().mockResolvedValue({ data: { error: 'ACTIVE_MOVEMENT' }, error: null }),
    };
    vi.mocked(getDb).mockResolvedValue(db as unknown as Awaited<ReturnType<typeof getDb>>);

    const response = await request(app)
      .post('/api/gate/movements/request')
      .set('Authorization', `Bearer ${token('student')}`)
      .expect(409);

    expect(response.body.code).toBe('ACTIVE_MOVEMENT');
    expect(response.body.error).toContain('already have an active');
  });
});
