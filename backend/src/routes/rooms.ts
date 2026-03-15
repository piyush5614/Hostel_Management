import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

async function getRawRoom(db: Awaited<ReturnType<typeof getDb>>, collegeId: string, roomId: string) {
  return db.get(
    `SELECT id, college_id, number, floor, capacity, type, gender, status, occupied_beds, total_beds, last_cleaned
     FROM rooms
     WHERE id = ? AND college_id = ?`,
    [roomId, collegeId]
  );
}

async function formatRoom(db: Awaited<ReturnType<typeof getDb>>, room: any, collegeId: string) {
  const amenities = await db.all(
    'SELECT amenity FROM room_amenities WHERE room_id = ? ORDER BY amenity',
    [room.id]
  );
  const beds = await db.all(
    `SELECT id, college_id, room_id AS roomId, number, status, student_id AS studentId, assigned_date AS assignedDate
     FROM beds
     WHERE room_id = ? AND college_id = ?
     ORDER BY number`,
    [room.id, collegeId]
  );

  return {
    id: room.id,
    college_id: room.college_id,
    number: room.number,
    floor: room.floor,
    capacity: room.capacity,
    type: room.type,
    gender: room.gender,
    status: room.status,
    occupiedBeds: room.occupied_beds,
    totalBeds: room.total_beds,
    lastCleaned: room.last_cleaned,
    amenities: amenities.map((a) => a.amenity),
    beds: beds || [],
  };
}

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const rooms = await db.all(
      `SELECT id, college_id, number, floor, capacity, type, gender, status, occupied_beds, total_beds, last_cleaned
       FROM rooms
       WHERE college_id = ?
       ORDER BY floor, number`,
      [collegeId]
    );

    const formattedRooms = await Promise.all((rooms || []).map((room) => formatRoom(db, room, collegeId)));

    res.json(formattedRooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const room = await getRawRoom(db, collegeId, req.params.id);

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    res.json(await formatRoom(db, room, collegeId));
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const roomId = uuidv4();
    const { number, floor, capacity, type, gender, amenities = [] } = req.body;

    await db.run(
      'INSERT INTO rooms (id, college_id, number, floor, capacity, type, gender, total_beds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [roomId, collegeId, number, floor, capacity, type, gender, capacity]
    );

    for (let i = 1; i <= capacity; i++) {
      await db.run('INSERT INTO beds (id, college_id, room_id, number, status) VALUES (?, ?, ?, ?, ?)', [
        uuidv4(),
        collegeId,
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

    const created = await getRawRoom(db, collegeId, roomId);
    res.status(201).json(await formatRoom(db, created, collegeId));
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const existing = await getRawRoom(db, collegeId, req.params.id);

    if (!existing) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const updates: Array<{ column: string; value: any }> = [];
    const map = [
      ['number', 'number'],
      ['floor', 'floor'],
      ['type', 'type'],
      ['gender', 'gender'],
      ['status', 'status'],
      ['occupiedBeds', 'occupied_beds'],
      ['occupied_beds', 'occupied_beds'],
      ['lastCleaned', 'last_cleaned'],
      ['last_cleaned', 'last_cleaned'],
    ] as const;

    for (const [inputKey, column] of map) {
      if (req.body[inputKey] !== undefined) {
        updates.push({ column, value: req.body[inputKey] });
      }
    }

    const desiredTotalBedsInput = req.body.totalBeds ?? req.body.total_beds ?? req.body.capacity;
    const desiredTotalBeds = desiredTotalBedsInput !== undefined ? Number(desiredTotalBedsInput) : null;

    await db.exec('BEGIN TRANSACTION');

    try {
      if (desiredTotalBeds !== null && Number.isFinite(desiredTotalBeds)) {
        const occupiedRow = await db.get(
          `SELECT COUNT(*) as occupied_count
           FROM beds
           WHERE room_id = ? AND college_id = ? AND status = 'occupied'`,
          [req.params.id, collegeId]
        );
        const occupiedBeds = Number(occupiedRow?.occupied_count || 0);

        if (desiredTotalBeds < occupiedBeds) {
          throw new Error('Cannot reduce capacity below occupied beds');
        }

        const existingBeds = await db.all(
          'SELECT id, number, status FROM beds WHERE room_id = ? AND college_id = ? ORDER BY number',
          [req.params.id, collegeId]
        );

        if (desiredTotalBeds > existingBeds.length) {
          for (let index = existingBeds.length + 1; index <= desiredTotalBeds; index += 1) {
            await db.run(
              'INSERT INTO beds (id, college_id, room_id, number, status) VALUES (?, ?, ?, ?, ?)',
              [uuidv4(), collegeId, req.params.id, index, 'available']
            );
          }
        } else if (desiredTotalBeds < existingBeds.length) {
          const occupiedOverflow = await db.get(
            `SELECT COUNT(*) as occupied_overflow
             FROM beds
             WHERE room_id = ? AND college_id = ? AND number > ? AND status = 'occupied'`,
            [req.params.id, collegeId, desiredTotalBeds]
          );

          if (Number(occupiedOverflow?.occupied_overflow || 0) > 0) {
            throw new Error('Cannot remove occupied beds from this room');
          }

          await db.run(
            'DELETE FROM beds WHERE room_id = ? AND college_id = ? AND number > ?',
            [req.params.id, collegeId, desiredTotalBeds]
          );
        }

        updates.push({ column: 'capacity', value: desiredTotalBeds });
        updates.push({ column: 'total_beds', value: desiredTotalBeds });
      }

      if (updates.length > 0) {
        const deduped = updates.filter((update, index, list) => index === list.findIndex((item) => item.column === update.column));
        const setClause = deduped.map((u) => `${u.column} = ?`).join(', ');
        await db.run(
          `UPDATE rooms SET ${setClause} WHERE id = ? AND college_id = ?`,
          [...deduped.map((u) => u.value), req.params.id, collegeId]
        );
      }

      if (Array.isArray(req.body.amenities)) {
        await db.run('DELETE FROM room_amenities WHERE room_id = ?', [req.params.id]);

        for (const amenity of req.body.amenities) {
          await db.run(
            'INSERT INTO room_amenities (id, room_id, amenity) VALUES (?, ?, ?)',
            [uuidv4(), req.params.id, amenity]
          );
        }
      }

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    const updated = await getRawRoom(db, collegeId, req.params.id);
    res.json(await formatRoom(db, updated, collegeId));
  } catch (error: any) {
    console.error('Update room error:', error);
    if (error?.message === 'Cannot reduce capacity below occupied beds' || error?.message === 'Cannot remove occupied beds from this room') {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error?.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'Constraint violation while updating room' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/beds/:id', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    const existing = await db.get(
      `SELECT id, college_id, room_id, number, status, student_id, assigned_date
       FROM beds
       WHERE id = ? AND college_id = ?`,
      [req.params.id, collegeId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Bed not found' });
      return;
    }

    const studentId = req.body.studentId ?? req.body.student_id;
    if (studentId) {
      const student = await db.get(
        'SELECT id FROM students WHERE id = ? AND college_id = ?',
        [studentId, collegeId]
      );

      if (!student) {
        res.status(404).json({ error: 'Student not found for this college' });
        return;
      }
    }

    const updates: Array<{ column: string; value: any }> = [];
    const map = [
      ['status', 'status'],
      ['studentId', 'student_id'],
      ['student_id', 'student_id'],
      ['assignedDate', 'assigned_date'],
      ['assigned_date', 'assigned_date'],
    ] as const;

    for (const [inputKey, column] of map) {
      if (req.body[inputKey] !== undefined) {
        updates.push({ column, value: req.body[inputKey] });
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid bed fields provided for update' });
      return;
    }

    const setClause = updates.map((u) => `${u.column} = ?`).join(', ');
    await db.run(
      `UPDATE beds SET ${setClause} WHERE id = ? AND college_id = ?`,
      [...updates.map((u) => u.value), req.params.id, collegeId]
    );

    const updated = await db.get(
      `SELECT id, college_id, room_id AS roomId, number, status, student_id AS studentId, assigned_date AS assignedDate
       FROM beds
       WHERE id = ? AND college_id = ?`,
      [req.params.id, collegeId]
    );

    res.json(updated);
  } catch (error) {
    console.error('Update bed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const existing = await getRawRoom(db, collegeId, req.params.id);

    if (!existing) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const occupiedBeds = await db.get(
      `SELECT COUNT(*) as occupied_count
       FROM beds
       WHERE room_id = ? AND college_id = ? AND status = 'occupied'`,
      [req.params.id, collegeId]
    );

    if (Number(occupiedBeds?.occupied_count || 0) > 0) {
      res.status(400).json({ error: 'Cannot delete room with assigned students' });
      return;
    }

    const assignedStudents = await db.get(
      'SELECT COUNT(*) as student_count FROM students WHERE room_id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );

    if (Number(assignedStudents?.student_count || 0) > 0) {
      res.status(400).json({ error: 'Cannot delete room while students are still linked to it' });
      return;
    }

    await db.exec('BEGIN TRANSACTION');

    try {
      await db.run('DELETE FROM room_amenities WHERE room_id = ?', [req.params.id]);
      await db.run('DELETE FROM beds WHERE room_id = ? AND college_id = ?', [req.params.id, collegeId]);
      await db.run('DELETE FROM rooms WHERE id = ? AND college_id = ?', [req.params.id, collegeId]);
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
