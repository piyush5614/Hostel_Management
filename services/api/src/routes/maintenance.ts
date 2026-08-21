import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    let query = db
      .from('maintenance_requests')
      .select('*, rooms(number)')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });

    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      query = query.eq('status', req.query.status.trim());
    }

    if (typeof req.query.priority === 'string' && req.query.priority.trim()) {
      query = query.eq('priority', req.query.priority.trim());
    }

    if (user?.role === 'student') {
      query = query.eq('requester_id', user.userId);
    }

    const { data: requests, error } = await query;

    if (error) throw error;

    res.json(requests || []);
  } catch (error) {
    console.error('Get maintenance requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    const title = req.body.title;
    const description = req.body.description || '';

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const roomId = req.body.roomId || req.body.room_id || null;
    if (roomId) {
      const { data: room, error: roomError } = await db
        .from('rooms')
        .select('id')
        .eq('id', roomId)
        .eq('college_id', collegeId)
        .single();

      if (roomError || !room) {
        res.status(404).json({ error: 'Room not found for this college' });
        return;
      }
    }

    const requestId = uuidv4();
    const requesterType = user?.role === 'student' ? 'student' : 'staff';
    const priority = req.body.priority || 'medium';
    const category = req.body.category || 'other';

    const { error: insertError } = await db.from('maintenance_requests').insert([
      {
        id: requestId,
        college_id: collegeId,
        requester_id: user?.userId,
        requester_type: requesterType,
        room_id: roomId,
        title,
        description,
        priority,
        status: 'pending',
        category,
      },
    ]);

    if (insertError) throw insertError;

    const { data: created, error: fetchError } = await db
      .from('maintenance_requests')
      .select('*')
      .eq('id', requestId)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(created);
  } catch (error) {
    console.error('Create maintenance request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    const { data: existing, error: fetchError } = await db
      .from('maintenance_requests')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Maintenance request not found' });
      return;
    }

    const isManager = user?.role === 'admin' || user?.role === 'warden' || user?.role === 'staff';
    const isOwner = existing.requester_id === user?.userId;

    if (!isManager && !isOwner) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updates: Record<string, any> = {};
    const map = [
      ['title', 'title'],
      ['description', 'description'],
      ['priority', 'priority'],
      ['status', 'status'],
      ['category', 'category'],
      ['assignedTo', 'assigned_to'],
      ['assigned_to', 'assigned_to'],
      ['completedAt', 'completed_at'],
      ['completed_at', 'completed_at'],
    ] as const;

    for (const [inputKey, column] of map) {
      if (req.body[inputKey] !== undefined && !(column in updates)) {
        updates[column] = req.body[inputKey];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const { error: updateError } = await db
      .from('maintenance_requests')
      .update(updates)
      .eq('id', req.params.id)
      .eq('college_id', collegeId);

    if (updateError) throw updateError;

    const { data: updated, error: refetchError } = await db
      .from('maintenance_requests')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (refetchError) throw refetchError;

    res.json(updated);
  } catch (error) {
    console.error('Update maintenance request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
