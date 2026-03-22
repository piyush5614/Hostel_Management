import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

async function getRawRoom(db: Awaited<ReturnType<typeof getDb>>, collegeId: string, roomId: string) {
  const { data, error } = await db
    .from('rooms')
    .select('id, college_id, number, floor, capacity, type, gender, status, occupied_beds, total_beds, last_cleaned')
    .eq('id', roomId)
    .eq('college_id', collegeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

async function formatRoom(db: Awaited<ReturnType<typeof getDb>>, room: any, collegeId: string) {
  const { data: amenityData, error: amenityError } = await db
    .from('room_amenities')
    .select('amenity')
    .eq('room_id', room.id)
    .order('amenity');

  if (amenityError && amenityError.code !== 'PGRST116') throw amenityError;

  const { data: bedData, error: bedError } = await db
    .from('beds')
    .select('id, college_id, room_id, number, status, student_id, assigned_date')
    .eq('room_id', room.id)
    .eq('college_id', collegeId)
    .order('number');

  if (bedError && bedError.code !== 'PGRST116') throw bedError;

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
    amenities: (amenityData || []).map((a) => a.amenity),
    beds: (bedData || []).map((b) => ({
      id: b.id,
      college_id: b.college_id,
      roomId: b.room_id,
      number: b.number,
      status: b.status,
      studentId: b.student_id,
      assignedDate: b.assigned_date,
    })),
  };
}

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    const { data: rooms, error } = await db
      .from('rooms')
      .select('id, college_id, number, floor, capacity, type, gender, status, occupied_beds, total_beds, last_cleaned')
      .eq('college_id', collegeId)
      .order('floor')
      .order('number');

    if (error) throw error;

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

    const { error: roomError } = await db.from('rooms').insert([
      {
        id: roomId,
        college_id: collegeId,
        number,
        floor,
        capacity,
        type,
        gender,
        total_beds: capacity,
      },
    ]);

    if (roomError) throw roomError;

    // Insert beds
    const bedRecords = Array.from({ length: capacity }, (_, i) => ({
      id: uuidv4(),
      college_id: collegeId,
      room_id: roomId,
      number: i + 1,
      status: 'available',
    }));

    if (bedRecords.length > 0) {
      const { error: bedsError } = await db.from('beds').insert(bedRecords);
      if (bedsError) throw bedsError;
    }

    // Insert amenities
    if (amenities.length > 0) {
      const amenityRecords = amenities.map((amenity: string) => ({
        id: uuidv4(),
        room_id: roomId,
        amenity,
      }));

      const { error: amenitiesError } = await db.from('room_amenities').insert(amenityRecords);
      if (amenitiesError) throw amenitiesError;
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

    const updates: Record<string, any> = {};
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
      if (req.body[inputKey] !== undefined && !(column in updates)) {
        updates[column] = req.body[inputKey];
      }
    }

    const desiredTotalBedsInput = req.body.totalBeds ?? req.body.total_beds ?? req.body.capacity;
    const desiredTotalBeds = desiredTotalBedsInput !== undefined ? Number(desiredTotalBedsInput) : null;

    try {
      if (desiredTotalBeds !== null && Number.isFinite(desiredTotalBeds)) {
        const { count: occupiedCount, error: occupiedError } = await db
          .from('beds')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', req.params.id)
          .eq('college_id', collegeId)
          .eq('status', 'occupied');

        if (occupiedError) throw occupiedError;

        const occupiedBeds = occupiedCount || 0;

        if (desiredTotalBeds < occupiedBeds) {
          throw new Error('Cannot reduce capacity below occupied beds');
        }

        const { data: existingBeds, error: existingBedsError } = await db
          .from('beds')
          .select('id, number, status')
          .eq('room_id', req.params.id)
          .eq('college_id', collegeId)
          .order('number');

        if (existingBedsError) throw existingBedsError;

        if (desiredTotalBeds > (existingBeds?.length || 0)) {
          const newBeds = Array.from({ length: desiredTotalBeds - (existingBeds?.length || 0) }, (_, i) => ({
            id: uuidv4(),
            college_id: collegeId,
            room_id: req.params.id,
            number: (existingBeds?.length || 0) + i + 1,
            status: 'available',
          }));

          const { error: insertBedsError } = await db.from('beds').insert(newBeds);
          if (insertBedsError) throw insertBedsError;
        } else if (desiredTotalBeds < (existingBeds?.length || 0)) {
          const { count: occupiedOverflow, error: overflowError } = await db
            .from('beds')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', req.params.id)
            .eq('college_id', collegeId)
            .gt('number', desiredTotalBeds)
            .eq('status', 'occupied');

          if (overflowError) throw overflowError;

          if ((occupiedOverflow || 0) > 0) {
            throw new Error('Cannot remove occupied beds from this room');
          }

          const { error: deleteBedsError } = await db
            .from('beds')
            .delete()
            .eq('room_id', req.params.id)
            .eq('college_id', collegeId)
            .gt('number', desiredTotalBeds);

          if (deleteBedsError) throw deleteBedsError;
        }

        updates.capacity = desiredTotalBeds;
        updates.total_beds = desiredTotalBeds;
      }

      if (Object.keys(updates).length > 0) {
        // Deduplicate by column
        const dedupedUpdates: Record<string, any> = {};
        for (const [column, value] of Object.entries(updates)) {
          dedupedUpdates[column] = value;
        }

        const { error: updateError } = await db
          .from('rooms')
          .update(dedupedUpdates)
          .eq('id', req.params.id)
          .eq('college_id', collegeId);

        if (updateError) throw updateError;
      }

      if (Array.isArray(req.body.amenities)) {
        const { error: deleteAmenitiesError } = await db
          .from('room_amenities')
          .delete()
          .eq('room_id', req.params.id);

        if (deleteAmenitiesError) throw deleteAmenitiesError;

        if (req.body.amenities.length > 0) {
          const amenityRecords = req.body.amenities.map((amenity: string) => ({
            id: uuidv4(),
            room_id: req.params.id,
            amenity,
          }));

          const { error: insertAmenitiesError } = await db.from('room_amenities').insert(amenityRecords);
          if (insertAmenitiesError) throw insertAmenitiesError;
        }
      }
    } catch (innerError) {
      throw innerError;
    }

    const updated = await getRawRoom(db, collegeId, req.params.id);
    res.json(await formatRoom(db, updated, collegeId));
  } catch (error: any) {
    console.error('Update room error:', error);
    if (error?.message === 'Cannot reduce capacity below occupied beds' || error?.message === 'Cannot remove occupied beds from this room') {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error?.code === '23505' || error?.message?.includes('duplicate')) {
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

    const { data: existing, error: existingError } = await db
      .from('beds')
      .select('id, college_id, room_id, number, status, student_id, assigned_date')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (existingError || !existing) {
      res.status(404).json({ error: 'Bed not found' });
      return;
    }

    const studentId = req.body.studentId ?? req.body.student_id;
    if (studentId) {
      const { data: student, error: studentError } = await db
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('college_id', collegeId)
        .single();

      if (studentError || !student) {
        res.status(404).json({ error: 'Student not found for this college' });
        return;
      }
    }

    const updates: Record<string, any> = {};
    const map = [
      ['status', 'status'],
      ['studentId', 'student_id'],
      ['student_id', 'student_id'],
      ['assignedDate', 'assigned_date'],
      ['assigned_date', 'assigned_date'],
    ] as const;

    for (const [inputKey, column] of map) {
      if (req.body[inputKey] !== undefined && !(column in updates)) {
        updates[column] = req.body[inputKey];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid bed fields provided for update' });
      return;
    }

    const { error: updateError } = await db
      .from('beds')
      .update(updates)
      .eq('id', req.params.id)
      .eq('college_id', collegeId);

    if (updateError) throw updateError;

    const { data: updated, error: fetchError } = await db
      .from('beds')
      .select('id, college_id, room_id, number, status, student_id, assigned_date')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

    res.json({
      ...updated,
      roomId: updated.room_id,
      studentId: updated.student_id,
      assignedDate: updated.assigned_date,
    });
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

    const { count: occupiedBedsCount, error: occupiedBedsError } = await db
      .from('beds')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', req.params.id)
      .eq('college_id', collegeId)
      .eq('status', 'occupied');

    if (occupiedBedsError) throw occupiedBedsError;

    if ((occupiedBedsCount || 0) > 0) {
      res.status(400).json({ error: 'Cannot delete room with assigned students' });
      return;
    }

    const { count: studentCount, error: studentError } = await db
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', req.params.id)
      .eq('college_id', collegeId);

    if (studentError) throw studentError;

    if ((studentCount || 0) > 0) {
      res.status(400).json({ error: 'Cannot delete room while students are still linked to it' });
      return;
    }

    try {
      const { error: deleteAmenitiesError } = await db
        .from('room_amenities')
        .delete()
        .eq('room_id', req.params.id);

      if (deleteAmenitiesError) throw deleteAmenitiesError;

      const { error: deleteBedsError } = await db
        .from('beds')
        .delete()
        .eq('room_id', req.params.id)
        .eq('college_id', collegeId);

      if (deleteBedsError) throw deleteBedsError;

      const { error: deleteRoomError } = await db
        .from('rooms')
        .delete()
        .eq('id', req.params.id)
        .eq('college_id', collegeId);

      if (deleteRoomError) throw deleteRoomError;
    } catch (innerError) {
      throw innerError;
    }

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
