import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

// GET all leave requests with pagination (admin/warden see all, students see their own)
/**
 * Query parameters:
 *   - limit: items per page (default 50, max 200)
 *   - cursor: cursor ID for next page
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = (req as any).user;
    const collegeId = resolveCollegeId(user?.collegeId);

    // Pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const cursor = req.query.cursor as string | undefined;

    let query = db
      .from('leave_requests')
      .select('*, students(user_id, guardian_name, guardian_contact, users(name))')
      .eq('college_id', collegeId)
      .order('id', { ascending: true }); // Stable cursor

    if (user.role === 'student') {
      const { data: student, error: studentError } = await db
        .from('students')
        .select('id')
        .eq('user_id', user.userId)
        .eq('college_id', collegeId)
        .single();

      if (studentError || !student) {
        res.json({ data: [], cursor: undefined, hasMore: false });
        return;
      }

      query = query.eq('student_id', student.id);
    }

    // Apply cursor filter
    if (cursor) {
      query = query.gt('id', cursor);
    }

    // Fetch one extra to detect if there are more pages
    const { data: leaveRequests, error } = await query.limit(limit + 1);

    if (error) throw error;

    const items = leaveRequests || [];
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : undefined;

    res.json({
      data: pageItems,
      cursor: nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create a new leave request
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const { studentId, type, startDate, endDate, reason, emergencyContact } = req.body;

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

    const id = uuidv4();
    const { error: insertError } = await db.from('leave_requests').insert([
      {
        id,
        college_id: collegeId,
        student_id: studentId,
        type,
        start_date: startDate,
        end_date: endDate,
        reason,
        emergency_contact: emergencyContact || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      },
    ]);

    if (insertError) throw insertError;

    const { data: leaveRequest, error: fetchError } = await db
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(leaveRequest);
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH verify parent call — only admin/warden
router.patch(
  '/:id/verify-call',
  authenticate,
  authorize('admin', 'warden'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDb();
      const user = (req as any).user;
      const collegeId = resolveCollegeId(user?.collegeId);
      const { notes } = req.body;

      const { data: leaveRequest, error: fetchError } = await db
        .from('leave_requests')
        .select('*')
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .single();

      if (fetchError || !leaveRequest) {
        res.status(404).json({ error: 'Leave request not found' });
        return;
      }

      if (leaveRequest.status !== 'pending') {
        res.status(400).json({ error: 'Can only verify calls for pending leave requests' });
        return;
      }

      const { error: updateError } = await db
        .from('leave_requests')
        .update({
          parent_call_verified: true,
          parent_call_timestamp: new Date().toISOString(),
          parent_call_notes: notes || '',
          parent_call_by: user.userId,
        })
        .eq('id', req.params.id)
        .eq('college_id', collegeId);

      if (updateError) throw updateError;

      const { data: updated, error: refetchError } = await db
        .from('leave_requests')
        .select('*')
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .single();

      if (refetchError) throw refetchError;

      res.json(updated);
    } catch (error) {
      console.error('Verify parent call error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH approve leave — only admin/warden, requires parent call verification
router.patch(
  '/:id/approve',
  authenticate,
  authorize('admin', 'warden'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDb();
      const user = (req as any).user;
      const collegeId = resolveCollegeId(user?.collegeId);

      const { data: leaveRequest, error: fetchError } = await db
        .from('leave_requests')
        .select('*')
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .single();

      if (fetchError || !leaveRequest) {
        res.status(404).json({ error: 'Leave request not found' });
        return;
      }

      if (!leaveRequest.parent_call_verified) {
        res.status(400).json({ error: 'Parent call must be verified before approving' });
        return;
      }

      const { error: updateError } = await db
        .from('leave_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.userId,
          parent_approval_status: 'approved',
        })
        .eq('id', req.params.id)
        .eq('college_id', collegeId);

      if (updateError) throw updateError;

      // Update student status to 'on-leave'
      const { error: studentUpdateError } = await db
        .from('students')
        .update({ current_status: 'on-leave' })
        .eq('id', leaveRequest.student_id)
        .eq('college_id', collegeId);

      if (studentUpdateError) throw studentUpdateError;

      const { data: updated, error: refetchError } = await db
        .from('leave_requests')
        .select('*')
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .single();

      if (refetchError) throw refetchError;

      res.json(updated);
    } catch (error) {
      console.error('Approve leave request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH reject leave — admin/warden
router.patch(
  '/:id/reject',
  authenticate,
  authorize('admin', 'warden'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDb();
      const user = (req as any).user;
      const collegeId = resolveCollegeId(user?.collegeId);

      const { error: updateError } = await db
        .from('leave_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.userId,
          parent_approval_status: 'rejected',
        })
        .eq('id', req.params.id)
        .eq('college_id', collegeId);

      if (updateError) throw updateError;

      const { data: updated, error: fetchError } = await db
        .from('leave_requests')
        .select('*')
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .single();

      if (fetchError) throw fetchError;

      res.json(updated);
    } catch (error) {
      console.error('Reject leave request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
