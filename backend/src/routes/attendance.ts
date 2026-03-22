import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

/**
 * GET / - Get attendance records with pagination
 * Query parameters:
 *   - limit: items per page (default 50, max 200)
 *   - cursor: cursor ID for next page
 *   - date: filter by specific date (YYYY-MM-DD)
 *   - studentId: filter by student ID
 *   - roomId: filter by room ID
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    // Pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const cursor = req.query.cursor as string | undefined;

    let query = db
      .from('attendance')
      .select('*, students(enrollment_number, room_id, user_id), users:students(user_id).name')
      .eq('college_id', collegeId)
      .order('id', { ascending: true }); // Stable cursor

    if (user?.role === 'student') {
      const { data: studentData, error: studentError } = await db
        .from('students')
        .select('id')
        .eq('user_id', user.userId)
        .eq('college_id', collegeId)
        .single();

      if (studentError || !studentData) {
        res.json({ data: [], cursor: undefined, hasMore: false });
        return;
      }

      query = query.eq('student_id', studentData.id);
    }

    if (typeof req.query.date === 'string' && req.query.date.trim()) {
      query = query.eq('date', req.query.date.trim());
    }

    if (typeof req.query.studentId === 'string' && req.query.studentId.trim()) {
      query = query.eq('student_id', req.query.studentId.trim());
    }

    if (typeof req.query.roomId === 'string' && req.query.roomId.trim()) {
      query = query.eq('students.room_id', req.query.roomId.trim());
    }

    // Apply cursor filter
    if (cursor) {
      query = query.gt('id', cursor);
    }

    // Fetch one extra to detect if there are more pages
    const { data: records, error } = await query.limit(limit + 1);

    if (error) throw error;

    const items = records || [];
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : undefined;

    res.json({
      data: pageItems,
      cursor: nextCursor,
      hasMore,
    });
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

    const { data: existing, error: existingError } = await db
      .from('attendance')
      .select('id')
      .eq('college_id', collegeId)
      .eq('student_id', studentId)
      .eq('date', date)
      .single();

    let attendanceId: string;
    let isUpdate = false;

    if (existingError || !existing) {
      attendanceId = uuidv4();
      const { error: insertError } = await db.from('attendance').insert([
        {
          id: attendanceId,
          college_id: collegeId,
          student_id: studentId,
          date,
          morning_status: morningStatus,
          evening_status: eveningStatus,
          remarks,
          recorded_by: user?.userId,
          recorded_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;
    } else {
      attendanceId = existing.id;
      isUpdate = true;
      const { error: updateError } = await db
        .from('attendance')
        .update({
          morning_status: morningStatus,
          evening_status: eveningStatus,
          remarks,
          recorded_by: user?.userId,
          recorded_at: new Date().toISOString(),
        })
        .eq('id', attendanceId)
        .eq('college_id', collegeId);

      if (updateError) throw updateError;
    }

    const { data: saved, error: fetchError } = await db
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

    res.status(isUpdate ? 200 : 201).json(saved);
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

        const { data: student, error: studentError } = await db
          .from('students')
          .select('id')
          .eq('id', studentId)
          .eq('college_id', collegeId)
          .single();

        if (studentError || !student) {
          throw new Error(`Student ${studentId} not found for this college`);
        }

        // Try to find existing record
        const { data: existing, error: existingError } = await db
          .from('attendance')
          .select('id')
          .eq('college_id', collegeId)
          .eq('student_id', studentId)
          .eq('date', date)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          throw existingError;
        }

        const attendanceId = existing?.id || uuidv4();

        if (existing) {
          const { error: updateError } = await db
            .from('attendance')
            .update({
              morning_status: morningStatus,
              evening_status: eveningStatus,
              remarks,
              recorded_by: user?.userId,
              recorded_at: new Date().toISOString(),
            })
            .eq('id', attendanceId)
            .eq('college_id', collegeId);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await db.from('attendance').insert([
            {
              id: attendanceId,
              college_id: collegeId,
              student_id: studentId,
              date,
              morning_status: morningStatus,
              evening_status: eveningStatus,
              remarks,
              recorded_by: user?.userId,
              recorded_at: new Date().toISOString(),
            },
          ]);

          if (insertError) throw insertError;
        }
      }
    } catch (innerError) {
      throw innerError;
    }

    res.json({ success: true, count: records.length });
  } catch (error: any) {
    console.error('Bulk upsert attendance error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

export default router;
