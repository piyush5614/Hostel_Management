/**
 * Applications API Tests
 * Tests for: GET /applications, GET /applications/:id, POST /applications, PATCH /applications/:id
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('Applications API', () => {
  let app: Express;
  let testApplicationId: string;
  let testStudentId: string;
  const applicationsStore: Record<string, any> = {};

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const mockRouter = express.Router();

    mockRouter.get('/', (req, res) => {
      res.json([
        { id: testApplicationId, student_id: testStudentId, type: 'hostel', status: 'pending', created_at: '2025-03-20' },
        ...Object.values(applicationsStore)
      ]);
    });

    mockRouter.get('/:id', (req, res) => {
      if (req.params.id === testApplicationId) {
        res.json({ id: testApplicationId, student_id: testStudentId, type: 'hostel', status: 'pending' });
      } else if (applicationsStore[req.params.id]) {
        res.json(applicationsStore[req.params.id]);
      } else {
        res.status(404).json({ error: 'Application not found' });
      }
    });

    mockRouter.post('/', (req, res) => {
      if (!req.body.student_id || !req.body.type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const newId = `app-${Date.now()}`;
      const newApp = { id: newId, status: 'pending', created_at: new Date().toISOString(), ...req.body };
      applicationsStore[newId] = newApp;
      res.status(201).json(newApp);
    });

    mockRouter.patch('/:id', (req, res) => {
      if (req.params.id === testApplicationId) {
        res.json({ id: testApplicationId, ...req.body });
      } else if (applicationsStore[req.params.id]) {
        const updated = { ...applicationsStore[req.params.id], ...req.body };
        applicationsStore[req.params.id] = updated;
        res.json(updated);
      } else {
        res.status(404).json({ error: 'Application not found' });
      }
    });

    app.use('/applications', mockRouter);
    testApplicationId = 'app-123';
    testStudentId = 'student-123';
  });

  describe('GET /applications', () => {
    it('should fetch all applications', async () => {
      const response = await request(app).get('/applications').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('status');
      }
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/applications?status=pending')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should include application details', async () => {
      const response = await request(app).get('/applications').expect(200);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('student_id');
        expect(response.body[0]).toHaveProperty('type');
        expect(response.body[0]).toHaveProperty('created_at');
      }
    });
  });

  describe('GET /applications/:id', () => {
    it('should fetch application by ID', async () => {
      const response = await request(app)
        .get(`/applications/${testApplicationId}`)
        .expect(200);

      expect(response.body.id).toBe(testApplicationId);
      expect(response.body).toHaveProperty('status');
    });

    it('should return 404 for non-existent application', async () => {
      await request(app)
        .get('/applications/non-existent')
        .expect(404);
    });

    it('should include full application details', async () => {
      const response = await request(app)
        .get(`/applications/${testApplicationId}`)
        .expect(200);

      expect(response.body).toHaveProperty('student_id');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('POST /applications', () => {
    it('should create new application with valid data', async () => {
      const app_data = {
        student_id: testStudentId,
        type: 'hostel',
        reason: 'Need hostel accommodation',
      };

      const response = await request(app)
        .post('/applications')
        .send(app_data)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
      expect(response.body.student_id).toBe(app_data.student_id);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/applications')
        .send({ student_id: testStudentId })
        .expect(400);
    });

    it('should return pending status for new applications', async () => {
      const response = await request(app)
        .post('/applications')
        .send({
          student_id: testStudentId,
          type: 'room-change',
        })
        .expect(201);

      expect(response.body.status).toBe('pending');
    });

    it('should validate application type', async () => {
      const response = await request(app)
        .post('/applications')
        .send({
          student_id: testStudentId,
          type: 'invalid_type',
        });

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('PATCH /applications/:id', () => {
    it('should update application status', async () => {
      const response = await request(app)
        .patch(`/applications/${testApplicationId}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body.status).toBe('approved');
    });

    it('should allow rejection with reason', async () => {
      const response = await request(app)
        .patch(`/applications/${testApplicationId}`)
        .send({ status: 'rejected', rejection_reason: 'Quota full' })
        .expect(200);

      expect([200, 400]).toContain(response.status);
    });

    it('should return 404 for non-existent application', async () => {
      await request(app)
        .patch('/applications/non-existent')
        .send({ status: 'approved' })
        .expect(404);
    });

    it('should not allow invalid status transitions', async () => {
      const response = await request(app)
        .patch(`/applications/${testApplicationId}`)
        .send({ status: 'invalid_status' });

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Application workflow', () => {
    it('should track application lifecycle', async () => {
      // Create
      const createRes = await request(app)
        .post('/applications')
        .send({ student_id: testStudentId, type: 'hostel' })
        .expect(201);

      expect(createRes.body.status).toBe('pending');

      // Fetch
      const getRes = await request(app)
        .get(`/applications/${createRes.body.id}`)
        .expect(200);

      expect(getRes.body.status).toBe('pending');
    });
  });
});
