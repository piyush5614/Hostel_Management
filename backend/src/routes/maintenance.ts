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

    let sql = `
      SELECT mr.*, r.number AS room_number
      FROM maintenance_requests mr
      LEFT JOIN rooms r ON r.id = mr.room_id
      WHERE mr.college_id = ?
    `;
    const params: any[] = [collegeId];

    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      sql += ' AND mr.status = ?';
      params.push(req.query.status.trim());
    }

    if (typeof req.query.priority === 'string' && req.query.priority.trim()) {
      sql += ' AND mr.priority = ?';
      params.push(req.query.priority.trim());
    }

    if (user?.role === 'student') {
      sql += ' AND mr.requester_id = ?';
      params.push(user.userId);
    }

    sql += ' ORDER BY mr.created_at DESC';

    const requests = await db.all(sql, params);
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
      const room = await db.get('SELECT id FROM rooms WHERE id = ? AND college_id = ?', [roomId, collegeId]);
      if (!room) {
        res.status(404).json({ error: 'Room not found for this college' });
        return;
      }
    }

    const requestId = uuidv4();
    const requesterType = user?.role === 'student' ? 'student' : 'staff';
    const priority = req.body.priority || 'medium';
    const category = req.body.category || 'other';

    await db.run(
      `INSERT INTO maintenance_requests (
        id, college_id, requester_id, requester_type, room_id, title, description, priority, status, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [requestId, collegeId, user?.userId, requesterType, roomId, title, description, priority, category]
    );

    const created = await db.get(
      'SELECT * FROM maintenance_requests WHERE id = ? AND college_id = ?',
      [requestId, collegeId]
    );
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

    const existing = await db.get(
      'SELECT * FROM maintenance_requests WHERE id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Maintenance request not found' });
      return;
    }

    const isManager = user?.role === 'admin' || user?.role === 'warden' || user?.role === 'staff';
    const isOwner = existing.requester_id === user?.userId;

    if (!isManager && !isOwner) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updates: Array<{ column: string; value: any }> = [];
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
      if (req.body[inputKey] !== undefined) {
        updates.push({ column, value: req.body[inputKey] });
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const setClause = updates.map((u) => `${u.column} = ?`).join(', ');
    const values = updates.map((u) => u.value);

    await db.run(
      `UPDATE maintenance_requests SET ${setClause} WHERE id = ? AND college_id = ?`,
      [...values, req.params.id, collegeId]
    );

    const updated = await db.get(
      'SELECT * FROM maintenance_requests WHERE id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );
    res.json(updated);
  } catch (error) {
    console.error('Update maintenance request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
