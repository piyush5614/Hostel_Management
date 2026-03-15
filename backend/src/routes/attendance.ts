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
      SELECT
        a.*,
        u.name AS student_name,
        s.enrollment_number,
        s.room_id
      FROM attendance a
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

    if (typeof req.query.date === 'string' && req.query.date.trim()) {
      sql += ' AND a.date = ?';
      params.push(req.query.date.trim());
    }

    if (typeof req.query.studentId === 'string' && req.query.studentId.trim()) {
      sql += ' AND a.student_id = ?';
      params.push(req.query.studentId.trim());
    }

    if (typeof req.query.roomId === 'string' && req.query.roomId.trim()) {
      sql += ' AND s.room_id = ?';
      params.push(req.query.roomId.trim());
    }

    sql += ' ORDER BY a.date DESC, a.recorded_at DESC';

    const records = await db.all(sql, params);
    res.json(records || []);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, authorize('admin', 'warden', 'staff'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    const studentId = req.body.studentId || req.body.student_id;
    const date = req.body.date;
    const morningStatus = req.body.morningStatus || req.body.morning_status;
    const eveningStatus = req.body.eveningStatus || req.body.evening_status;
    const remarks = req.body.remarks || null;

    if (!studentId || !date || !morningStatus || !eveningStatus) {
      res.status(400).json({
        error: 'studentId, date, morningStatus and eveningStatus are required',
      });
      return;
    }

    const student = await db.get(
      'SELECT id FROM students WHERE id = ? AND college_id = ?',
      [studentId, collegeId]
    );

    if (!student) {
      res.status(404).json({ error: 'Student not found for this college' });
      return;
    }

    const existing = await db.get(
      'SELECT id FROM attendance WHERE college_id = ? AND student_id = ? AND date = ?',
      [collegeId, studentId, date]
    );

    let attendanceId = existing?.id;

    if (existing) {
      await db.run(
        `UPDATE attendance
         SET morning_status = ?,
             evening_status = ?,
             remarks = ?,
             recorded_by = ?,
             recorded_at = datetime('now')
         WHERE id = ? AND college_id = ?`,
        [morningStatus, eveningStatus, remarks, user?.userId, attendanceId, collegeId]
      );
    } else {
      attendanceId = uuidv4();
      await db.run(
        `INSERT INTO attendance (
          id, college_id, student_id, date, morning_status, evening_status, remarks, recorded_by, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [attendanceId, collegeId, studentId, date, morningStatus, eveningStatus, remarks, user?.userId]
      );
    }

    const saved = await db.get(
      'SELECT * FROM attendance WHERE id = ? AND college_id = ?',
      [attendanceId, collegeId]
    );

    res.status(existing ? 200 : 201).json(saved);
  } catch (error) {
    console.error('Save attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk-upsert', authenticate, authorize('admin', 'warden', 'staff'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);
    const records = Array.isArray(req.body.records) ? req.body.records : [];

    if (records.length === 0) {
      res.status(400).json({ error: 'records array is required' });
      return;
    }

    await db.exec('BEGIN TRANSACTION');

    try {
      for (const record of records) {
        const studentId = record.studentId || record.student_id;
        const date = record.date;
        const morningStatus = record.morningStatus || record.morning_status;
        const eveningStatus = record.eveningStatus || record.evening_status;
        const remarks = record.remarks || null;

        if (!studentId || !date || !morningStatus || !eveningStatus) {
          throw new Error('Each record must contain studentId, date, morningStatus and eveningStatus');
        }

        const student = await db.get(
          'SELECT id FROM students WHERE id = ? AND college_id = ?',
          [studentId, collegeId]
        );

        if (!student) {
          throw new Error(`Student ${studentId} not found for this college`);
        }

        await db.run(
          `INSERT INTO attendance (
            id, college_id, student_id, date, morning_status, evening_status, remarks, recorded_by, recorded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(student_id, date) DO UPDATE SET
            morning_status = excluded.morning_status,
            evening_status = excluded.evening_status,
            remarks = excluded.remarks,
            recorded_by = excluded.recorded_by,
            recorded_at = datetime('now')`,
          [uuidv4(), collegeId, studentId, date, morningStatus, eveningStatus, remarks, user?.userId]
        );
      }

      await db.exec('COMMIT');
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }

    res.json({ success: true, count: records.length });
  } catch (error: any) {
    console.error('Bulk upsert attendance error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

export default router;
