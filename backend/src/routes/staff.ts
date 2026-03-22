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

    let query = db
      .from('staff')
      .select('*')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });

    if (typeof req.query.isActive === 'string') {
      query = query.eq('is_active', req.query.isActive === 'true');
    }

    if (user.role === 'staff') {
      query = query.eq('user_id', user.userId);
    }

    const { data: staff, error } = await query;

    if (error) throw error;

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

    let query = db
      .from('staff')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId);

    if (user.role === 'staff') {
      query = query.eq('user_id', user.userId);
    }

    const { data: staff, error } = await query.single();

    if (error || !staff) {
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

    const { data: linkedUser, error: linkedUserError } = await db
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('college_id', collegeId)
      .single();

    if (linkedUserError || !linkedUser) {
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

    const { error: insertError } = await db.from('staff').insert([
      {
        id: staffId,
        college_id: collegeId,
        user_id: userId,
        employee_id: employeeId,
        position,
        contact_number: contactNumber,
        address,
        joining_date: joiningDate,
        shift_timing: shiftTiming,
        department,
        is_active: true,
      },
    ]);

    if (insertError) throw insertError;

    const { data: created, error: fetchError } = await db
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create staff error:', error);
    if (error?.code === '23505' || error?.message?.includes('duplicate')) {
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

    const { data: existing, error: fetchError } = await db
      .from('staff')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Staff not found' });
      return;
    }

    const updates: Record<string, any> = {};

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
      if (req.body[inputKey] !== undefined && !(column in updates)) {
        const value = column === 'is_active' ? !!req.body[inputKey] : req.body[inputKey];
        updates[column] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const { error: updateError } = await db
      .from('staff')
      .update(updates)
      .eq('id', req.params.id)
      .eq('college_id', collegeId);

    if (updateError) throw updateError;

    const { data: updated, error: refetchError } = await db
      .from('staff')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (refetchError) throw refetchError;

    res.json(updated);
  } catch (error: any) {
    console.error('Update staff error:', error);
    if (error?.code === '23505' || error?.message?.includes('duplicate')) {
      res.status(409).json({ error: 'Constraint violation while updating staff' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
