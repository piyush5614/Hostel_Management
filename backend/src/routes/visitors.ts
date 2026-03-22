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

    let query = db
      .from('visitors')
      .select(
        `*,
         students(enrollment_number),
         staff(employee_id)`
      )
      .eq('college_id', collegeId)
      .order('check_in_time', { ascending: false });

    if (typeof req.query.active === 'string' && req.query.active === 'true') {
      query = query.is('check_out_time', null);
    }

    if (typeof req.query.date === 'string' && req.query.date.trim()) {
      // For date filtering, we'll need to handle this after fetching
      // since Supabase doesn't have a direct date() function for comparisons
      const dateStr = req.query.date.trim();
      query = query.gte('check_in_time', `${dateStr}T00:00:00`)
        .lte('check_in_time', `${dateStr}T23:59:59`);
    }

    const { data: visitors, error } = await query;

    if (error) throw error;

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
      const { data: student, error: studentError } = await db
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('college_id', collegeId)
        .single();

      if (studentError || !student) {
        res.status(404).json({ error: 'Student not found for this college' });
        return;
      }
    }

    if (staffId) {
      const { data: staff, error: staffError } = await db
        .from('staff')
        .select('id')
        .eq('id', staffId)
        .eq('college_id', collegeId)
        .single();

      if (staffError || !staff) {
        res.status(404).json({ error: 'Staff not found for this college' });
        return;
      }
    }

    const visitorId = uuidv4();
    const { error: insertError } = await db.from('visitors').insert([
      {
        id: visitorId,
        college_id: collegeId,
        name,
        contact_number: contactNumber,
        purpose,
        student_id: studentId,
        staff_id: staffId,
        check_in_time: new Date().toISOString(),
        id_proof_type: idProofType,
        id_proof_number: idProofNumber,
        vehicle_number: vehicleNumber,
        photo,
        approved_by: req.user?.userId,
      },
    ]);

    if (insertError) throw insertError;

    const { data: created, error: fetchError } = await db
      .from('visitors')
      .select('*')
      .eq('id', visitorId)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

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

    const { data: existing, error: fetchError } = await db
      .from('visitors')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Visitor not found' });
      return;
    }

    if (existing.check_out_time) {
      res.status(400).json({ error: 'Visitor already checked out' });
      return;
    }

    const { error: updateError } = await db
      .from('visitors')
      .update({ check_out_time: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('college_id', collegeId);

    if (updateError) throw updateError;

    const { data: updated, error: refetchError } = await db
      .from('visitors')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (refetchError) throw refetchError;

    res.json(updated);
  } catch (error) {
    console.error('Visitor checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
