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
      SELECT a.*, u.name AS student_name, s.enrollment_number
      FROM applications a
      LEFT JOIN students s ON s.id = a.student_id
      LEFT JOIN users u ON u.id = s.user_id
      WHERE a.college_id = ?
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

      sql += ' AND a.student_id = ?';
      params.push(student.id);
    }

    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      sql += ' AND a.status = ?';
      params.push(req.query.status.trim());
    }

    if (typeof req.query.type === 'string' && req.query.type.trim()) {
      sql += ' AND a.type = ?';
      params.push(req.query.type.trim());
    }

    sql += ' ORDER BY a.submitted_at DESC';

    const applications = await db.all(sql, params);
    res.json(applications || []);
  } catch (error) {
    console.error('Get applications error:', error);
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

    const applicationId = uuidv4();
    await db.run(
      `INSERT INTO applications (
        id, college_id, student_id, type, title, description, status, urgency
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        applicationId,
        collegeId,
        studentId,
        req.body.type || 'other',
        title,
        description,
        req.body.urgency || 'medium',
      ]
    );

    const created = await db.get(
      'SELECT * FROM applications WHERE id = ? AND college_id = ?',
      [applicationId, collegeId]
    );
    res.status(201).json(created);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/review', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const status = req.body.status;

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const existing = await db.get(
      'SELECT * FROM applications WHERE id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    await db.run(
      `UPDATE applications
       SET status = ?, reviewed_at = datetime('now'), reviewed_by = ?
       WHERE id = ? AND college_id = ?`,
      [status, req.user?.userId, req.params.id, collegeId]
    );

    const updated = await db.get(
      'SELECT * FROM applications WHERE id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );
    res.json(updated);
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
