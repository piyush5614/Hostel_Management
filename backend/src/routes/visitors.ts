import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

router.get('/', authenticate, authorize('admin', 'warden', 'staff'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    let sql = `
      SELECT v.*,
             s.enrollment_number,
             st.employee_id
      FROM visitors v
      LEFT JOIN students s ON s.id = v.student_id
      LEFT JOIN staff st ON st.id = v.staff_id
      WHERE v.college_id = ?
    `;
    const params: any[] = [collegeId];

    if (typeof req.query.active === 'string' && req.query.active === 'true') {
      sql += ' AND v.check_out_time IS NULL';
    }

    if (typeof req.query.date === 'string' && req.query.date.trim()) {
      sql += " AND date(v.check_in_time) = date(?)";
      params.push(req.query.date.trim());
    }

    sql += ' ORDER BY v.check_in_time DESC';

    const visitors = await db.all(sql, params);
    res.json(visitors || []);
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, authorize('admin', 'warden', 'staff'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    const name = req.body.name;
    const contactNumber = req.body.contactNumber || req.body.contact_number || null;
    const purpose = req.body.purpose;
    const studentId = req.body.studentId || req.body.student_id || null;
    const staffId = req.body.staffId || req.body.staff_id || null;
    const idProofType = req.body.idProofType || req.body.id_proof_type || null;
    const idProofNumber = req.body.idProofNumber || req.body.id_proof_number || null;
    const vehicleNumber = req.body.vehicleNumber || req.body.vehicle_number || null;
    const photo = req.body.photo || null;

    if (!name || !purpose) {
      res.status(400).json({ error: 'name and purpose are required' });
      return;
    }

    if (studentId) {
      const student = await db.get('SELECT id FROM students WHERE id = ? AND college_id = ?', [studentId, collegeId]);
      if (!student) {
        res.status(404).json({ error: 'Student not found for this college' });
        return;
      }
    }

    if (staffId) {
      const staff = await db.get('SELECT id FROM staff WHERE id = ? AND college_id = ?', [staffId, collegeId]);
      if (!staff) {
        res.status(404).json({ error: 'Staff not found for this college' });
        return;
      }
    }

    const visitorId = uuidv4();
    await db.run(
      `INSERT INTO visitors (
        id, college_id, name, contact_number, purpose, student_id, staff_id,
        check_in_time, id_proof_type, id_proof_number, vehicle_number, photo, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)`,
      [
        visitorId,
        collegeId,
        name,
        contactNumber,
        purpose,
        studentId,
        staffId,
        idProofType,
        idProofNumber,
        vehicleNumber,
        photo,
        req.user?.userId,
      ]
    );

    const created = await db.get('SELECT * FROM visitors WHERE id = ? AND college_id = ?', [visitorId, collegeId]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/checkout', authenticate, authorize('admin', 'warden', 'staff'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    const existing = await db.get(
      'SELECT * FROM visitors WHERE id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Visitor not found' });
      return;
    }

    if (existing.check_out_time) {
      res.status(400).json({ error: 'Visitor already checked out' });
      return;
    }

    await db.run(
      "UPDATE visitors SET check_out_time = datetime('now') WHERE id = ? AND college_id = ?",
      [req.params.id, collegeId]
    );

    const updated = await db.get('SELECT * FROM visitors WHERE id = ? AND college_id = ?', [req.params.id, collegeId]);
    res.json(updated);
  } catch (error) {
    console.error('Visitor checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
