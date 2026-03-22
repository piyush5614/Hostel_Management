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

    let query = db
      .from('applications')
      .select('*, students(user_id, enrollment_number, users(name))')
      .eq('college_id', collegeId)
      .order('submitted_at', { ascending: false });

    if (user?.role === 'student') {
      const { data: student, error: studentError } = await db
        .from('students')
        .select('id')
        .eq('user_id', user.userId)
        .eq('college_id', collegeId)
        .single();

      if (studentError || !student) {
        res.json([]);
        return;
      }

      query = query.eq('student_id', student.id);
    }

    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      query = query.eq('status', req.query.status.trim());
    }

    if (typeof req.query.type === 'string' && req.query.type.trim()) {
      query = query.eq('type', req.query.type.trim());
    }

    const { data: applications, error } = await query;

    if (error) throw error;

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
      const { data: student, error: studentError } = await db
        .from('students')
        .select('id')
        .eq('user_id', user.userId)
        .eq('college_id', collegeId)
        .single();

      if (studentError || !student) {
        res.status(404).json({ error: 'Student record not found for current user' });
        return;
      }

      studentId = student.id;
    }

    if (!studentId) {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }

    const { data: studentExists, error: studentExistsError } = await db
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('college_id', collegeId)
      .single();

    if (studentExistsError || !studentExists) {
      res.status(404).json({ error: 'Student not found for this college' });
      return;
    }

    const applicationId = uuidv4();
    const { error: insertError } = await db.from('applications').insert([
      {
        id: applicationId,
        college_id: collegeId,
        student_id: studentId,
        type: req.body.type || 'other',
        title,
        description,
        status: 'pending',
        urgency: req.body.urgency || 'medium',
      },
    ]);

    if (insertError) throw insertError;

    const { data: created, error: fetchError } = await db
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

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

    const { data: existing, error: fetchError } = await db
      .from('applications')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const { error: updateError } = await db
      .from('applications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: req.user?.userId,
      })
      .eq('id', req.params.id)
      .eq('college_id', collegeId);

    if (updateError) throw updateError;

    const { data: updated, error: refetchError } = await db
      .from('applications')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (refetchError) throw refetchError;

    res.json(updated);
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
