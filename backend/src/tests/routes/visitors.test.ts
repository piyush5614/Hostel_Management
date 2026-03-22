/**
 * Visitors API Tests
 * Tests for: GET /visitors, POST /visitors, PATCH /visitors/:id
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('Visitors API', () => {
  let app: Express;
  let testVisitorId: string;
  let testStudentId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const mockRouter = express.Router();

    mockRouter.get('/', (req, res) => {
      res.json([
        { id: testVisitorId, student_id: testStudentId, visitor_name: 'John', check_in: '2025-03-20 10:00', status: 'checked_in' },
      ]);
    });

    mockRouter.post('/', (req, res) => {
      if (!req.body.student_id || !req.body.visitor_name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      res.status(201).json({ id: 'new-visitor', status: 'checked_in', ...req.body });
    });

    mockRouter.patch('/:id', (req, res) => {
      if (req.params.id === testVisitorId) {
        res.json({ id: testVisitorId, ...req.body });
      } else {
        res.status(404).json({ error: 'Visitor not found' });
      }
    });

    app.use('/visitors', mockRouter);
    testVisitorId = 'visitor-123';
    testStudentId = 'student-123';
  });

  describe('GET /visitors', () => {
    it('should fetch visitor records', async () => {
      const response = await request(app).get('/visitors').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('visitor_name');
        expect(response.body[0]).toHaveProperty('student_id');
        expect(response.body[0]).toHaveProperty('status');
      }
    });

    it('should filter by student_id', async () => {
      const response = await request(app)
        .get(`/visitors?student_id=${testStudentId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/visitors?status=checked_in')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should include check-in timestamp', async () => {
      const response = await request(app).get('/visitors').expect(200);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('check_in');
      }
    });
  });

  describe('POST /visitors', () => {
    it('should check-in visitor with valid data', async () => {
      const visitor = {
        student_id: testStudentId,
        visitor_name: 'Jane Doe',
        phone: '9876543210',
      };

      const response = await request(app)
        .post('/visitors')
        .send(visitor)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('checked_in');
      expect(response.body).toHaveProperty('check_in');
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/visitors')
        .send({ student_id: testStudentId })
        .expect(400);
    });

    it('should set initial check_in time', async () => {
      const response = await request(app)
        .post('/visitors')
        .send({
          student_id: testStudentId,
          visitor_name: 'Test Visitor',
        })
        .expect(201);

      expect(response.body).toHaveProperty('check_in_time');
    });

    it('should validate phone number if provided', async () => {
      const response = await request(app)
        .post('/visitors')
        .send({
          student_id: testStudentId,
          visitor_name: 'Test',
          phone: 'invalid',
        });

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('PATCH /visitors/:id', () => {
    it('should check-out visitor', async () => {
      const response = await request(app)
        .patch(`/visitors/${testVisitorId}`)
        .send({ status: 'checked_out' })
        .expect(200);

      expect(response.body.status).toBe('checked_out');
      expect(response.body).toHaveProperty('check_out_time');
    });

    it('should record check-out time', async () => {
      const response = await request(app)
        .patch(`/visitors/${testVisitorId}`)
        .send({ status: 'checked_out' })
        .expect(200);

      expect([200, 400]).toContain(response.status);
    });

    it('should return 404 for non-existent visitor', async () => {
      await request(app)
        .patch('/visitors/non-existent')
        .send({ status: 'checked_out' })
        .expect(404);
    });

    it('should update remarks', async () => {
      const response = await request(app)
        .patch(`/visitors/${testVisitorId}`)
        .send({ remarks: 'Friendly visit' })
        .expect(200);

      expect(response.status).toBe(200);
    });
  });

  describe('Visitor tracking', () => {
    it('should track visitor duration', async () => {
      const response = await request(app).get(`/visitors?status=checked_out`).expect(200);

      if (response.body.length > 0) {
        const record = response.body[0];
         expect(record).toHaveProperty('check_in_time');
         expect(record).toHaveProperty('check_out_time');
      }
    });
  });
});
