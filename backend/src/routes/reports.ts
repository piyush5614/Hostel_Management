import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    let sql = `
      SELECT r.*, u.name AS student_name, s.enrollment_number
      FROM reports r
      LEFT JOIN students s ON s.id = r.student_id
      LEFT JOIN users u ON u.id = s.user_id
      WHERE r.college_id = ?
    `;
    const params: any[] = [collegeId];

    if (user?.role === 'student') {
      const student = await db.get(
        'SELECT id FROM students WHERE user_id = ? AND college_id = ?',
        [user.userId, collegeId]
      );

      if (!student) {
        res.json([]);
        return;
      }

      sql += ' AND r.student_id = ?';
      params.push(student.id);
    }

    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      sql += ' AND r.status = ?';
      params.push(req.query.status.trim());
    }

    if (typeof req.query.priority === 'string' && req.query.priority.trim()) {
      sql += ' AND r.priority = ?';
      params.push(req.query.priority.trim());
    }

    sql += ' ORDER BY r.created_at DESC';

    const reports = await db.all(sql, params);
    res.json(reports || []);
  } catch (error) {
    console.error('Get reports error:', error);
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

    let studentId = req.body.studentId || req.body.student_id || null;

    if (user?.role === 'student') {
      const student = await db.get(
        'SELECT id FROM students WHERE user_id = ? AND college_id = ?',
        [user.userId, collegeId]
      );

      if (!student) {
        res.status(404).json({ error: 'Student record not found for current user' });
        return;
      }

      studentId = student.id;
    }

    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }

    const studentExists = await db.get(
      'SELECT id FROM students WHERE id = ? AND college_id = ?',
      [studentId, collegeId]
    );

    if (!studentExists) {
      res.status(404).json({ error: 'Student not found for this college' });
      return;
    }

    const reportId = uuidv4();
    await db.run(
      `INSERT INTO reports (
        id, college_id, student_id, type, title, description, priority, status, category, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        reportId,
        collegeId,
        studentId,
        req.body.type || 'complaint',
        title,
        description,
        req.body.priority || 'medium',
        req.body.category || 'general',
        req.body.assignedTo || req.body.assigned_to || null,
      ]
    );

    const created = await db.get('SELECT * FROM reports WHERE id = ? AND college_id = ?', [reportId, collegeId]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, authorize('admin', 'warden', 'staff'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    const existing = await db.get(
      'SELECT * FROM reports WHERE id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const updates: Array<{ column: string; value: any }> = [];
    const map = [
      ['type', 'type'],
      ['title', 'title'],
      ['description', 'description'],
      ['priority', 'priority'],
      ['status', 'status'],
      ['category', 'category'],
      ['assignedTo', 'assigned_to'],
      ['assigned_to', 'assigned_to'],
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
      `UPDATE reports SET ${setClause} WHERE id = ? AND college_id = ?`,
      [...values, req.params.id, collegeId]
    );

    const updated = await db.get('SELECT * FROM reports WHERE id = ? AND college_id = ?', [req.params.id, collegeId]);
    res.json(updated);
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
