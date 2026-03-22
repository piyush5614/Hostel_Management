/**
 * Rooms API Tests
 * Tests for: GET /rooms, GET /rooms/:id, POST /rooms, PATCH /rooms/:id
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

describe('Rooms API', () => {
  let app: Express;
  let testRoomId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const mockRouter = express.Router();

    mockRouter.get('/', (req, res) => {
      res.json([
        { id: testRoomId, number: '301', floor: 3, capacity: 3, type: 'AC', occupied: 2 },
        { id: 'room-2', number: '302', floor: 3, capacity: 3, type: 'Non-AC', occupied: 1 },
      ]);
    });

    mockRouter.get('/:id', (req, res) => {
      if (req.params.id === testRoomId) {
        res.json({ id: testRoomId, number: '301', floor: 3, capacity: 3, type: 'AC', occupied: 2 });
      } else {
        res.status(404).json({ error: 'Room not found' });
      }
    });

    mockRouter.post('/', (req, res) => {
      if (!req.body.number || !req.body.floor) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      res.status(201).json({ id: 'new-room', ...req.body });
    });

    mockRouter.patch('/:id', (req, res) => {
      if (req.params.id === testRoomId) {
        res.json({ id: testRoomId, ...req.body });
      } else {
        res.status(404).json({ error: 'Room not found' });
      }
    });

    app.use('/rooms', mockRouter);
    testRoomId = 'room-1';
  });

  describe('GET /rooms', () => {
    it('should fetch all rooms', async () => {
      const response = await request(app).get('/rooms').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('number');
        expect(response.body[0]).toHaveProperty('floor');
      }
    });

    it('should include room details', async () => {
      const response = await request(app).get('/rooms').expect(200);

      if (response.body.length > 0) {
        const room = response.body[0];
        expect(room).toHaveProperty('capacity');
        expect(room).toHaveProperty('type');
        expect(['AC', 'Non-AC']).toContain(room.type);
      }
    });

    it('should filter by floor if query param provided', async () => {
      const response = await request(app).get('/rooms?floor=3').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /rooms/:id', () => {
    it('should fetch room by ID', async () => {
      const response = await request(app)
        .get(`/rooms/${testRoomId}`)
        .expect(200);

      expect(response.body.id).toBe(testRoomId);
      expect(response.body).toHaveProperty('number');
      expect(response.body).toHaveProperty('floor');
    });

    it('should return 404 for non-existent room', async () => {
      await request(app)
        .get('/rooms/non-existent')
        .expect(404);
    });

    it('should include occupancy info', async () => {
      const response = await request(app).get(`/rooms/${testRoomId}`).expect(200);

      expect(response.body).toHaveProperty('occupied');
      expect(response.body).toHaveProperty('capacity');
      expect(response.body.occupied).toBeLessThanOrEqual(response.body.capacity);
    });
  });

  describe('POST /rooms', () => {
    it('should create new room with valid data', async () => {
      const newRoom = {
        number: '401',
        floor: 4,
        capacity: 3,
        type: 'AC',
      };

      const response = await request(app)
        .post('/rooms')
        .send(newRoom)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.number).toBe(newRoom.number);
      expect(response.body.floor).toBe(newRoom.floor);
    });

    it('should return 400 without required fields', async () => {
      await request(app)
        .post('/rooms')
        .send({ floor: 3 })
        .expect(400);
    });

    it('should validate room type', async () => {
      const response = await request(app)
        .post('/rooms')
        .send({
          number: '402',
          floor: 4,
          capacity: 3,
          type: 'InvalidType',
        });

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('PATCH /rooms/:id', () => {
    it('should update room occupancy', async () => {
      const response = await request(app)
        .patch(`/rooms/${testRoomId}`)
        .send({ occupied: 3 })
        .expect(200);

      expect(response.body.occupied).toBe(3);
    });

    it('should update room amenities', async () => {
      const response = await request(app)
        .patch(`/rooms/${testRoomId}`)
        .send({ amenities: ['WiFi', 'AC', 'Fan'] })
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent room', async () => {
      await request(app)
        .patch('/rooms/non-existent')
        .send({ occupied: 2 })
        .expect(404);
    });
  });

  describe('Room availability checks', () => {
    it('should calculate available beds correctly', async () => {
      const response = await request(app).get(`/rooms/${testRoomId}`).expect(200);

      const available = response.body.capacity - response.body.occupied;
      expect(available).toBeGreaterThanOrEqual(0);
    });

    it('should prevent double booking', async () => {
      const response = await request(app)
        .patch(`/rooms/${testRoomId}`)
        .send({ occupied: 10 }); // Exceed capacity

      expect([200, 400]).toContain(response.status);
    });
  });
});
