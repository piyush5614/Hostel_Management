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
    const withUserId = typeof req.query.withUserId === 'string' ? req.query.withUserId.trim() : '';

    let sql = `
      SELECT m.*, su.name AS sender_name, ru.name AS receiver_name
      FROM messages m
      LEFT JOIN users su ON su.id = m.sender_id
      LEFT JOIN users ru ON ru.id = m.receiver_id
      WHERE m.college_id = ?
        AND (m.sender_id = ? OR m.receiver_id = ?)
    `;
    const params: any[] = [collegeId, user?.userId, user?.userId];

    if (withUserId) {
      sql += ' AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))';
      params.push(user?.userId, withUserId, withUserId, user?.userId);
    }

    sql += ' ORDER BY m.created_at DESC';

    const messages = await db.all(sql, params);
    res.json(messages || []);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    const receiverId = req.body.receiverId || req.body.receiver_id;
    const content = req.body.content;
    const messageType = req.body.messageType || req.body.message_type || 'direct';
    const priority = req.body.priority || 'normal';

    if (!receiverId || !content) {
      res.status(400).json({ error: 'receiverId and content are required' });
      return;
    }

    const receiver = await db.get(
      'SELECT id FROM users WHERE id = ? AND college_id = ?',
      [receiverId, collegeId]
    );

    if (!receiver) {
      res.status(404).json({ error: 'Receiver not found for this college' });
      return;
    }

    const messageId = uuidv4();
    await db.run(
      `INSERT INTO messages (
        id, college_id, sender_id, receiver_id, content, is_read, message_type, priority
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [messageId, collegeId, user?.userId, receiverId, content, messageType, priority]
    );

    const created = await db.get('SELECT * FROM messages WHERE id = ? AND college_id = ?', [messageId, collegeId]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    const existing = await db.get(
      'SELECT * FROM messages WHERE id = ? AND college_id = ? AND receiver_id = ?',
      [req.params.id, collegeId, user?.userId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    await db.run(
      'UPDATE messages SET is_read = 1 WHERE id = ? AND college_id = ? AND receiver_id = ?',
      [req.params.id, collegeId, user?.userId]
    );

    const updated = await db.get(
      'SELECT * FROM messages WHERE id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );

    res.json(updated);
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
