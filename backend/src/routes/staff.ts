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

    if (!user || !['admin', 'warden', 'staff'].includes(user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    let sql = 'SELECT * FROM staff WHERE college_id = ?';
    const params: any[] = [collegeId];

    if (typeof req.query.isActive === 'string') {
      sql += ' AND is_active = ?';
      params.push(req.query.isActive === 'true' ? 1 : 0);
    }

    if (user.role === 'staff') {
      sql += ' AND user_id = ?';
      params.push(user.userId);
    }

    sql += ' ORDER BY created_at DESC';

    const staff = await db.all(sql, params);
    res.json(staff || []);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    if (!user || !['admin', 'warden', 'staff'].includes(user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    let staff;
    if (user.role === 'staff') {
      staff = await db.get(
        'SELECT * FROM staff WHERE id = ? AND college_id = ? AND user_id = ?',
        [req.params.id, collegeId, user.userId]
      );
    } else {
      staff = await db.get(
        'SELECT * FROM staff WHERE id = ? AND college_id = ?',
        [req.params.id, collegeId]
      );
    }

    if (!staff) {
      res.status(404).json({ error: 'Staff not found' });
      return;
    }

    res.json(staff);
  } catch (error) {
    console.error('Get staff member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    const userId = req.body.user_id || req.body.userId;
    const employeeId = req.body.employee_id || req.body.employeeId;

    if (!userId || !employeeId) {
      res.status(400).json({ error: 'userId and employeeId are required' });
      return;
    }

    const linkedUser = await db.get(
      'SELECT id FROM users WHERE id = ? AND college_id = ?',
      [userId, collegeId]
    );

    if (!linkedUser) {
      res.status(404).json({ error: 'Linked user not found for this college' });
      return;
    }

    const staffId = uuidv4();
    const position = req.body.position || '';
    const contactNumber = req.body.contact_number || req.body.contactNumber || '';
    const address = req.body.address || '';
    const joiningDate = req.body.joining_date || req.body.joiningDate || new Date().toISOString();
    const shiftTiming = req.body.shift_timing || req.body.shiftTiming || '08:00-16:00';
    const department = req.body.department || '';

    await db.run(
      `INSERT INTO staff (
        id, college_id, user_id, employee_id, position, contact_number, address, joining_date, shift_timing, department, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        staffId,
        collegeId,
        userId,
        employeeId,
        position,
        contactNumber,
        address,
        joiningDate,
        shiftTiming,
        department,
      ]
    );

    const created = await db.get('SELECT * FROM staff WHERE id = ? AND college_id = ?', [staffId, collegeId]);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create staff error:', error);
    if (error?.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'A staff member with this employeeId or userId already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    const existing = await db.get(
      'SELECT * FROM staff WHERE id = ? AND college_id = ?',
      [req.params.id, collegeId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Staff not found' });
      return;
    }

    const updates: Array<{ column: string; value: any }> = [];

    const map = [
      ['employeeId', 'employee_id'],
      ['employee_id', 'employee_id'],
      ['position', 'position'],
      ['contactNumber', 'contact_number'],
      ['contact_number', 'contact_number'],
      ['address', 'address'],
      ['joiningDate', 'joining_date'],
      ['joining_date', 'joining_date'],
      ['shiftTiming', 'shift_timing'],
      ['shift_timing', 'shift_timing'],
      ['department', 'department'],
      ['isActive', 'is_active'],
      ['is_active', 'is_active'],
    ] as const;

    for (const [inputKey, column] of map) {
      if (req.body[inputKey] !== undefined) {
        const value = column === 'is_active'
          ? (req.body[inputKey] ? 1 : 0)
          : req.body[inputKey];
        updates.push({ column, value });
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const setClause = updates.map((u) => `${u.column} = ?`).join(', ');
    const values = updates.map((u) => u.value);

    await db.run(
      `UPDATE staff SET ${setClause} WHERE id = ? AND college_id = ?`,
      [...values, req.params.id, collegeId]
    );

    const updated = await db.get('SELECT * FROM staff WHERE id = ? AND college_id = ?', [req.params.id, collegeId]);
    res.json(updated);
  } catch (error: any) {
    console.error('Update staff error:', error);
    if (error?.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'Constraint violation while updating staff' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
