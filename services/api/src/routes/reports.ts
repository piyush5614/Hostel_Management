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
      .from('reports')
      .select('*, students(user_id, enrollment_number, users(name))')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });

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

    if (typeof req.query.priority === 'string' && req.query.priority.trim()) {
      query = query.eq('priority', req.query.priority.trim());
    }

    const { data: reports, error } = await query;

    if (error) throw error;

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

    const reportId = uuidv4();
    const { error: insertError } = await db.from('reports').insert([
      {
        id: reportId,
        college_id: collegeId,
        student_id: studentId,
        type: req.body.type || 'complaint',
        title,
        description,
        priority: req.body.priority || 'medium',
        status: 'pending',
        category: req.body.category || 'general',
        assigned_to: req.body.assignedTo || req.body.assigned_to || null,
      },
    ]);

    if (insertError) throw insertError;

    const { data: created, error: fetchError } = await db
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

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

    const { data: existing, error: fetchError } = await db
      .from('reports')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const updates: Record<string, any> = {};
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
      if (req.body[inputKey] !== undefined && !(column in updates)) {
        updates[column] = req.body[inputKey];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const { error: updateError } = await db
      .from('reports')
      .update(updates)
      .eq('id', req.params.id)
      .eq('college_id', collegeId);

    if (updateError) throw updateError;

    const { data: updated, error: refetchError } = await db
      .from('reports')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (refetchError) throw refetchError;

    res.json(updated);
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
