import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const students = await db.all('SELECT * FROM students ORDER BY created_at DESC');
    res.json(students || []);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const student = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const studentId = uuidv4();

    await db.run(
      `INSERT INTO students (id, user_id, enrollment_number, course, year, gender, date_of_birth,
        contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        req.body.user_id,
        req.body.enrollment_number,
        req.body.course,
        req.body.year,
        req.body.gender,
        req.body.date_of_birth,
        req.body.contact_number,
        req.body.address,
        req.body.guardian_name,
        req.body.guardian_contact,
        req.body.emergency_contact,
        req.body.joining_date,
      ]
    );

    res.status(201).json({ id: studentId, ...req.body });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
