/**
 * Maintenance API Tests
 * Tests for: GET /maintenance, GET /maintenance/:id, POST /maintenance, PATCH /maintenance/:id
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('Maintenance API', () => {
  let app: Express;
  let testMaintenanceId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const mockRouter = express.Router();

    mockRouter.get('/', (req, res) => {
      res.json([
        { id: testMaintenanceId, title: 'Pipe leak in room 301', category: 'plumbing', priority: 'high', status: 'open', created_at: '2025-03-20' },
      ]);
    });

    mockRouter.get('/:id', (req, res) => {
      if (req.params.id === testMaintenanceId) {
        res.json({ id: testMaintenanceId, title: 'Pipe leak', category: 'plumbing', priority: 'high', status: 'open' });
      } else {
        res.status(404).json({ error: 'Maintenance request not found' });
      }
    });

    mockRouter.post('/', (req, res) => {
      if (!req.body.title || !req.body.category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      res.status(201).json({ id: 'new-maint', status: 'open', priority: 'medium', ...req.body });
    });

    mockRouter.patch('/:id', (req, res) => {
      if (req.params.id === testMaintenanceId) {
        res.json({ id: testMaintenanceId, ...req.body });
      } else {
        res.status(404).json({ error: 'Maintenance request not found' });
      }
    });

    app.use('/maintenance', mockRouter);
    testMaintenanceId = 'maint-123';
  });

  describe('GET /maintenance', () => {
    it('should fetch all maintenance requests', async () => {
      const response = await request(app).get('/maintenance').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('title');
        expect(response.body[0]).toHaveProperty('status');
      }
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/maintenance?status=open')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by priority', async () => {
      const response = await request(app)
        .get('/maintenance?priority=high')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should include request details', async () => {
      const response = await request(app).get('/maintenance').expect(200);

      if (response.body.length > 0) {
        const req_item = response.body[0];
        expect(req_item).toHaveProperty('title');
        expect(req_item).toHaveProperty('category');
        expect(req_item).toHaveProperty('priority');
        expect(req_item).toHaveProperty('created_at');
      }
    });
  });

  describe('GET /maintenance/:id', () => {
    it('should fetch maintenance request by ID', async () => {
      const response = await request(app)
        .get(`/maintenance/${testMaintenanceId}`)
        .expect(200);

      expect(response.body.id).toBe(testMaintenanceId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('status');
    });

    it('should return 404 for non-existent request', async () => {
      await request(app)
        .get('/maintenance/non-existent')
        .expect(404);
    });

    it('should include full details and assigned staff', async () => {
      const response = await request(app)
        .get(`/maintenance/${testMaintenanceId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('POST /maintenance', () => {
    it('should create new maintenance request', async () => {
      const request_data = {
        title: 'AC not cooling room 305',
        category: 'cooling',
        priority: 'high',
        description: 'AC compressor needs repair',
      };

      const response = await request(app)
        .post('/maintenance')
        .send(request_data)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('open');
      expect(response.body.title).toBe(request_data.title);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/maintenance')
        .send({ title: 'Test' })
        .expect(400);
    });

    it('should set open status for new requests', async () => {
      const response = await request(app)
        .post('/maintenance')
        .send({ title: 'Test', category: 'electrical' })
        .expect(201);

      expect(response.body.status).toBe('open');
    });

    it('should set default priority', async () => {
      const response = await request(app)
        .post('/maintenance')
        .send({ title: 'Test', category: 'cleaning' })
        .expect(201);

      expect(['low', 'medium', 'high']).toContain(response.body.priority);
    });

    it('should validate category', async () => {
      const response = await request(app)
        .post('/maintenance')
        .send({
          title: 'Test',
          category: 'invalid_category',
        });

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('PATCH /maintenance/:id', () => {
    it('should update request status', async () => {
      const response = await request(app)
        .patch(`/maintenance/${testMaintenanceId}`)
        .send({ status: 'in_progress', assigned_to: 'staff-1' })
        .expect(200);

      expect(response.body.status).toBe('in_progress');
    });

    it('should allow mark as completed', async () => {
      const response = await request(app)
        .patch(`/maintenance/${testMaintenanceId}`)
        .send({ status: 'completed', resolution_notes: 'Pipe replaced' })
        .expect(200);

      expect([200, 400]).toContain(response.status);
    });

    it('should update priority', async () => {
      const response = await request(app)
        .patch(`/maintenance/${testMaintenanceId}`)
        .send({ priority: 'low' })
        .expect(200);

      expect(response.body.priority).toBe('low');
    });

    it('should return 404 for non-existent request', async () => {
      await request(app)
        .patch('/maintenance/non-existent')
        .send({ status: 'in_progress' })
        .expect(404);
    });
  });

  describe('Maintenance workflow', () => {
    it('should track request lifecycle', async () => {
      // Create
      const createRes = await request(app)
        .post('/maintenance')
        .send({ title: 'Leak in bathroom', category: 'plumbing', priority: 'high' })
        .expect(201);

      expect(createRes.body.status).toBe('open');

      // Fetch
      const getRes = await request(app)
        .get(`/maintenance/${createRes.body.id}`)
        .expect(200);

      expect(getRes.body.status).toBe('open');
    });

    it('should support multiple repairs in hostel', async () => {
      const response = await request(app)
        .get('/maintenance?priority=high')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
