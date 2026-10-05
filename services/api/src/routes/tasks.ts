import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();
const managers = ['admin', 'warden'];

const taskSelect = `
  *,
  staff:staff!staff_tasks_assigned_to_fkey(
    id, user_id, employee_id, position, department,
    users(id, name, email, profile_image)
  )
`;

router.use(authenticate);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    let query = db.from('staff_tasks').select(taskSelect).eq('college_id', collegeId).order('created_at', { ascending: false });
    if (req.user?.role === 'staff') {
      const { data: staffProfile } = await db.from('staff').select('id').eq('user_id', req.user.userId).eq('college_id', collegeId).single();
      if (!staffProfile) { res.json([]); return; }
      query = query.eq('assigned_to', staffProfile.id);
    }
    if (typeof req.query.status === 'string' && req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    const ids = (data || []).map((task: any) => task.id);
    const comments = ids.length
      ? await db.from('task_comments').select('*').in('task_id', ids).order('created_at', { ascending: true })
      : { data: [], error: null };
    if (comments.error) throw comments.error;
    res.json((data || []).map((task: any) => ({
      ...task,
      assignedTo: task.assigned_to,
      assignedBy: task.assigned_by,
      dueDate: task.due_date,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      workInProgressPhotos: task.work_in_progress_photos || [],
      photoSubmissionStatus: task.photo_submission_status,
      comments: (comments.data || []).filter((comment: any) => comment.task_id === task.id),
    })));
  } catch (error) {
    console.error('Get staff tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  if (!managers.includes(req.user?.role || '')) {
    res.status(403).json({ error: 'Only administrators and wardens can assign tasks' });
    return;
  }
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const { title, description = '', assignedTo, priority = 'medium', category = 'other', dueDate, estimatedHours, notes, attachments, voiceMessage } = req.body;
    if (!title || !assignedTo || !dueDate) {
      res.status(400).json({ error: 'title, assignedTo, and dueDate are required' });
      return;
    }
    const record = {
      id: uuidv4(), college_id: collegeId, assigned_to: assignedTo, assigned_by: req.user?.userId,
      title, description, priority, category, due_date: dueDate, estimated_hours: estimatedHours ?? null,
      notes: [notes, voiceMessage].filter(Boolean).join('\n') || null, attachments: attachments || null,
    };
    const { data, error } = await db.from('staff_tasks').insert(record).select(taskSelect).single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create staff task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const { data: existing, error: fetchError } = await db.from('staff_tasks').select('*').eq('id', req.params.id).eq('college_id', collegeId).single();
    if (fetchError || !existing) { res.status(404).json({ error: 'Task not found' }); return; }
    if (req.user?.role === 'staff') {
      const { data: staffProfile } = await db.from('staff').select('id').eq('user_id', req.user.userId).eq('college_id', collegeId).single();
      if (!staffProfile || existing.assigned_to !== staffProfile.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    }
    if (req.body.photoSubmissionStatus === 'approved' && !managers.includes(req.user?.role || '')) {
      res.status(403).json({ error: 'Only administrators and wardens can approve task proof' });
      return;
    }
    if (!managers.includes(req.user?.role || '') && req.body.assignedTo !== undefined) { res.status(403).json({ error: 'Only administrators and wardens can reassign tasks' }); return; }
    const map: Record<string, string> = {
      title: 'title', description: 'description', priority: 'priority', category: 'category',
      dueDate: 'due_date', due_date: 'due_date', status: 'status', actualHours: 'actual_hours',
      actual_hours: 'actual_hours', notes: 'notes', attachments: 'attachments',
      workInProgressPhotos: 'work_in_progress_photos', photoSubmissionStatus: 'photo_submission_status',
      completedAt: 'completed_at', completed_at: 'completed_at', assignedTo: 'assigned_to',
      assigned_to: 'assigned_to', reassignedFrom: 'reassigned_from', reassignedAt: 'reassigned_at',
    };
    const updates: Record<string, unknown> = {};
    for (const [key, column] of Object.entries(map)) if (req.body[key] !== undefined) updates[column] = req.body[key];
    if (req.body.status === 'completed' && updates.completed_at === undefined) updates.completed_at = new Date().toISOString();
    if (Object.keys(updates).length === 0) { res.status(400).json({ error: 'No valid fields provided for update' }); return; }
    const { data, error } = await db.from('staff_tasks').update(updates).eq('id', req.params.id).eq('college_id', collegeId).select(taskSelect).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update staff task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  if (!managers.includes(req.user?.role || '')) { res.status(403).json({ error: 'Forbidden' }); return; }
  const db = await getDb();
  const collegeId = resolveCollegeId(req.user?.collegeId);
  const { data, error } = await db.from('staff_tasks').update({ status: 'cancelled' }).eq('id', req.params.id).eq('college_id', collegeId).select('*').single();
  if (error || !data) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json(data);
});

router.post('/:id/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const { data: task } = await db.from('staff_tasks').select('id').eq('id', req.params.id).eq('college_id', collegeId).single();
    if (!task || !req.body.content?.trim()) { res.status(400).json({ error: 'Task and comment content are required' }); return; }
    const comment = { id: uuidv4(), task_id: task.id, user_id: req.user?.userId, user_name: req.user?.email || 'User', user_role: req.user?.role || 'staff', content: req.body.content.trim() };
    const { data, error } = await db.from('task_comments').insert(comment).select('*').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Add task comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
