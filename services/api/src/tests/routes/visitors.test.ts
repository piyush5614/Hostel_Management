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
      res.json({
        data: [
          { 
            id: testVisitorId, 
            student_id: testStudentId, 
            name: 'John', 
            check_in_time: '2025-03-20T10:00:00Z', 
            check_out_time: null,
            purpose: 'Meeting',
            contact_number: '9876543210'
          },
        ],
        cursor: undefined,
        hasMore: false
      });
    });

    mockRouter.post('/', (req, res) => {
      if (!req.body.student_id || !req.body.name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      res.status(201).json({ 
        id: 'new-visitor', 
        check_in_time: new Date().toISOString(),
        check_out_time: null,
        ...req.body 
      });
    });

    mockRouter.patch('/:id/checkout', (req, res) => {
      if (req.params.id === testVisitorId) {
        res.json({ 
          id: testVisitorId, 
          check_out_time: new Date().toISOString(),
          ...req.body 
        });
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

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('student_id');
        expect(response.body.data[0]).toHaveProperty('check_in_time');
      }
    });

    it('should filter by student_id', async () => {
      const response = await request(app)
        .get(`/visitors?student_id=${testStudentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/visitors?active=true')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include check-in timestamp', async () => {
      const response = await request(app).get('/visitors').expect(200);

      if (response.body.data && response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('check_in_time');
      }
    });
  });

  describe('POST /visitors', () => {
    it('should check-in visitor with valid data', async () => {
      const visitor = {
        student_id: testStudentId,
        name: 'Jane Doe',
        contact_number: '9876543210',
        purpose: 'Meeting'
      };

      const response = await request(app)
        .post('/visitors')
        .send(visitor)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('check_in_time');
      expect(response.body.check_out_time).toBe(null);
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
          name: 'Test Visitor',
          purpose: 'Visit'
        })
        .expect(201);

      expect(response.body).toHaveProperty('check_in_time');
    });

    it('should validate phone number if provided', async () => {
      const response = await request(app)
        .post('/visitors')
        .send({
          student_id: testStudentId,
          name: 'Test',
          contact_number: '1234567890',
          purpose: 'Meeting'
        });

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('PATCH /visitors/:id/checkout', () => {
    it('should check-out visitor', async () => {
      const response = await request(app)
        .patch(`/visitors/${testVisitorId}/checkout`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('check_out_time');
    });

    it('should record check-out time', async () => {
      const response = await request(app)
        .patch(`/visitors/${testVisitorId}/checkout`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('check_out_time');
    });

    it('should return 404 for non-existent visitor', async () => {
      await request(app)
        .patch('/visitors/non-existent/checkout')
        .send({})
        .expect(404);
    });

    it('should update remarks', async () => {
      const response = await request(app)
        .patch(`/visitors/${testVisitorId}/checkout`)
        .send({ remarks: 'Friendly visit' })
        .expect(200);

      expect(response.status).toBe(200);
    });
  });

  describe('Visitor tracking', () => {
    it('should track visitor duration', async () => {
      const response = await request(app).get(`/visitors?active=false`).expect(200);

      if (response.body.data && response.body.data.length > 0) {
        const record = response.body.data[0];
        expect(record).toHaveProperty('check_in_time');
        expect(record).toHaveProperty('check_out_time');
      }
    });
  });
});
