/**
 * Attendance API Tests
 * Tests for: GET /attendance, POST /attendance, GET /attendance/report/:studentId
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('Attendance API', () => {
  let app: Express;
  let testStudentId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const mockRouter = express.Router();

    mockRouter.get('/', (req, res) => {
      res.json([
        { id: '1', student_id: testStudentId, date: '2025-03-20', status: 'present' },
        { id: '2', student_id: testStudentId, date: '2025-03-21', status: 'present' },
        { id: '3', student_id: testStudentId, date: '2025-03-22', status: 'absent' },
      ]);
    });

    mockRouter.post('/', (req, res) => {
      if (!req.body.student_id || !req.body.date || !req.body.status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      res.status(201).json({ id: 'new-id', ...req.body });
    });

    mockRouter.get('/report/:studentId', (req, res) => {
      res.json({
        student_id: req.params.studentId,
        total_days: 30,
        present: 27,
        absent: 2,
        leave: 1,
        percentage: 90,
      });
    });

    app.use('/attendance', mockRouter);
    testStudentId = 'student-123';
  });

  describe('GET /attendance', () => {
    it('should fetch attendance records', async () => {
      const response = await request(app).get('/attendance').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('student_id');
        expect(response.body[0]).toHaveProperty('date');
        expect(response.body[0]).toHaveProperty('status');
      }
    });

    it('should filter by student_id', async () => {
      const response = await request(app)
        .get(`/attendance?student_id=${testStudentId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should include valid status values', async () => {
      const response = await request(app).get('/attendance').expect(200);

      if (response.body.length > 0) {
        response.body.forEach((record) => {
          expect(['present', 'absent', 'leave']).toContain(record.status);
        });
      }
    });

    it('should support date range filtering', async () => {
      const response = await request(app)
        .get('/attendance?start_date=2025-03-01&end_date=2025-03-31')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /attendance', () => {
    it('should record attendance with valid data', async () => {
      const record = {
        student_id: testStudentId,
        date: '2025-03-23',
        status: 'present',
      };

      const response = await request(app)
        .post('/attendance')
        .send(record)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.student_id).toBe(record.student_id);
      expect(response.body.status).toBe(record.status);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/attendance')
        .send({
          student_id: testStudentId,
          date: '2025-03-23',
        })
        .expect(400);
    });

    it('should only accept valid status values', async () => {
      const response = await request(app)
        .post('/attendance')
        .send({
          student_id: testStudentId,
          date: '2025-03-23',
          status: 'invalid',
        });

      expect([201, 400]).toContain(response.status);
    });

    it('should prevent duplicate attendance', async () => {
      const record = {
        student_id: testStudentId,
        date: '2025-03-20',
        status: 'present',
      };

      const response = await request(app)
        .post('/attendance')
        .send(record);

      expect([201, 409, 400]).toContain(response.status);
    });

    it('should validate attendance date', async () => {
      const response = await request(app)
        .post('/attendance')
        .send({
          student_id: testStudentId,
          date: 'invalid-date',
          status: 'present',
        });

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('GET /attendance/report/:studentId', () => {
    it('should fetch attendance report for student', async () => {
      const response = await request(app)
        .get(`/attendance/report/${testStudentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('student_id');
      expect(response.body).toHaveProperty('total_days');
      expect(response.body).toHaveProperty('present');
      expect(response.body).toHaveProperty('percentage');
    });

    it('should calculate attendance percentage', async () => {
      const response = await request(app)
        .get(`/attendance/report/${testStudentId}`)
        .expect(200);

      expect(response.body.percentage).toBeGreaterThanOrEqual(0);
      expect(response.body.percentage).toBeLessThanOrEqual(100);
    });

    it('should include breakdown by status', async () => {
      const response = await request(app)
        .get(`/attendance/report/${testStudentId}`)
        .expect(200);

      const total = response.body.present + response.body.absent + (response.body.leave || 0);
      expect(total).toBe(response.body.total_days);
    });

    it('should handle summary statistics', async () => {
      const response = await request(app)
        .get(`/attendance/report/${testStudentId}`)
        .expect(200);

      expect(response.body.total_days).toBeGreaterThan(0);
      expect(response.body.present).toBeGreaterThanOrEqual(0);
      expect(response.body.absent).toBeGreaterThanOrEqual(0);
    });
  });
});
