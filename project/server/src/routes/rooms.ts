import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const rooms = await db.all('SELECT * FROM rooms ORDER BY floor, number');

    const formattedRooms = await Promise.all(
      (rooms || []).map(async (r) => {
        const amenities = await db.all('SELECT amenity FROM room_amenities WHERE room_id = ?', [r.id]);
        const beds = await db.all('SELECT * FROM beds WHERE room_id = ?', [r.id]);
        return {
          ...r,
          amenities: amenities.map((a) => a.amenity),
          beds: beds || [],
        };
      })
    );

    res.json(formattedRooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const room = await db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id]);

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const amenities = await db.all('SELECT amenity FROM room_amenities WHERE room_id = ?', [req.params.id]);
    const beds = await db.all('SELECT * FROM beds WHERE room_id = ?', [req.params.id]);

    res.json({ ...room, amenities: amenities.map((a) => a.amenity), beds: beds || [] });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const roomId = uuidv4();
    const { number, floor, capacity, type, gender, amenities = [] } = req.body;

    await db.run(
      'INSERT INTO rooms (id, number, floor, capacity, type, gender, total_beds) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [roomId, number, floor, capacity, type, gender, capacity]
    );

    for (let i = 1; i <= capacity; i++) {
      await db.run('INSERT INTO beds (id, room_id, number, status) VALUES (?, ?, ?, ?)', [
        uuidv4(),
        roomId,
        i,
        'available',
      ]);
    }

    for (const amenity of amenities) {
      await db.run('INSERT INTO room_amenities (id, room_id, amenity) VALUES (?, ?, ?)', [
        uuidv4(),
        roomId,
        amenity,
      ]);
    }

    res.status(201).json({ id: roomId, number, floor, capacity, type, gender, amenities, status: 'available' });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
