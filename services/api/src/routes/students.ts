import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';
import { hashPassword } from '../utils/auth.js';

const router = Router();

// Helper to format student record with user data
async function formatStudent(studentRecord: any, db?: any): Promise<any> {
  return {
    ...studentRecord,
    profile_image: studentRecord.profile_image || (studentRecord.users?.profile_image),
    name: studentRecord.users?.name,
    email: studentRecord.users?.email,
    is_active: studentRecord.users?.is_active,
    generated_id: studentRecord.users?.generated_id,
  };
}

async function getStudentById(db: Awaited<ReturnType<typeof getDb>>, collegeId: string, studentId: string) {
  const { data, error } = await db
    .from('students')
    .select('*, users(id, name, email, profile_image, is_active, generated_id)')
    .eq('id', studentId)
    .eq('college_id', collegeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return formatStudent(data);
}

/**
 * GET /students - Paginated list with cursor-based pagination
 * Query parameters:
 *   - limit: items per page (default 50, max 200)
 *   - cursor: cursor ID for next page
 *   - includeInactive: include deactivated users (admin/warden only)
 * 
 * Response includes 'cursor' field for fetching next page
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const includeInactive = req.query.includeInactive === 'true' && ['admin', 'warden'].includes(req.user?.role || '');
    
    // Pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const cursor = req.query.cursor as string | undefined;

    let query = db
      .from('students')
      .select('*, users(id, name, email, profile_image, is_active, generated_id)')
      .eq('college_id', collegeId)
      .order('id', { ascending: true }); // Stable cursor requires ordering by ID

    if (!includeInactive) {
      query = query.eq('users.is_active', true);
    }

    if (req.user?.role === 'student') {
      query = query.eq('user_id', req.user.userId);
    }

    // Apply cursor filter: fetch items AFTER the cursor
    if (cursor) {
      query = query.gt('id', cursor);
    }

    // Fetch one extra to detect if there are more pages
    const { data, error } = await query.limit(limit + 1);

    if (error) throw error;

    const items = data || [];
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : undefined;

    const students = await Promise.all(pageItems.map((s) => formatStudent(s, db)));
    
    res.json({
      data: students,
      cursor: nextCursor, // Use this cursor for next page
      hasMore,
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const student = await getStudentById(db, collegeId, req.params.id);

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    if (req.user?.role === 'student' && student.user_id !== req.user.userId) {
      res.status(403).json({ error: 'Forbidden' });
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
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const studentId = uuidv4();

    const name = req.body.name;
    const email = req.body.email;
    const generatedId = req.body.generatedId || req.body.generated_id || null;
    const password = req.body.password || req.body.generatedPassword || req.body.generated_password || 'student123';
    const profileImage = req.body.profileImage || req.body.profile_image || null;
    const requestedIsActive = req.body.isActive ?? req.body.is_active;
    const isActive = requestedIsActive === undefined ? true : !!requestedIsActive;

    let linkedUserId = req.body.user_id || req.body.userId;

    try {
      if (linkedUserId) {
        const { data: linkedUser, error: linkedUserError } = await db
          .from('users')
          .select('id')
          .eq('id', linkedUserId)
          .eq('college_id', collegeId)
          .single();

        if (linkedUserError || !linkedUser) {
          throw new Error('Linked user not found for this college');
        }

        const { error: userUpdateError } = await db
          .from('users')
          .update({
            ...(name && { name }),
            ...(email && { email }),
            role: 'student',
            ...(profileImage && { profile_image: profileImage }),
            ...(generatedId && { generated_id: generatedId }),
            is_active: isActive,
          })
          .eq('id', linkedUserId)
          .eq('college_id', collegeId);

        if (userUpdateError) throw userUpdateError;
      } else {
        if (!name || !email) {
          throw new Error('name and email are required');
        }

        let { data: existingUser, error: existingUserError } = await db
          .from('users')
          .select('*')
          .eq('college_id', collegeId)
          .eq('email', email)
          .single();

        if (existingUserError && existingUserError.code !== 'PGRST116') {
          throw existingUserError;
        }

        if (!existingUser && generatedId) {
          const { data: existingByGenId, error: existingByGenIdError } = await db
            .from('users')
            .select('*')
            .eq('college_id', collegeId)
            .eq('generated_id', generatedId)
            .single();

          if (existingByGenIdError && existingByGenIdError.code !== 'PGRST116') {
            throw existingByGenIdError;
          }

          existingUser = existingByGenId;
        }

        const hashedPassword = await hashPassword(password);

        if (existingUser) {
          linkedUserId = existingUser.id;
          const { error: userUpdateError } = await db
            .from('users')
            .update({
              name,
              email,
              password: hashedPassword,
              role: 'student',
              ...(profileImage && { profile_image: profileImage }),
              ...(generatedId && { generated_id: generatedId }),
              is_active: isActive,
            })
            .eq('id', linkedUserId)
            .eq('college_id', collegeId);

          if (userUpdateError) throw userUpdateError;
        } else {
          linkedUserId = uuidv4();
          const { error: userInsertError } = await db.from('users').insert([
            {
              id: linkedUserId,
              college_id: collegeId,
              email,
              password: hashedPassword,
              name,
              role: 'student',
              profile_image: profileImage,
              generated_id: generatedId,
              is_active: isActive,
            },
          ]);

          if (userInsertError) throw userInsertError;
        }
      }

      const { error: studentInsertError } = await db.from('students').insert([
        {
          id: studentId,
          college_id: collegeId,
          user_id: linkedUserId,
          enrollment_number: req.body.enrollment_number || req.body.enrollmentNumber,
          course: req.body.course || null,
          year: req.body.year || null,
          gender: req.body.gender || null,
          date_of_birth: req.body.date_of_birth || req.body.dateOfBirth || null,
          contact_number: req.body.contact_number || req.body.contactNumber || null,
          address: req.body.address || null,
          guardian_name: req.body.guardian_name || req.body.guardianName || null,
          guardian_contact: req.body.guardian_contact || req.body.guardianContact || null,
          emergency_contact: req.body.emergency_contact || req.body.emergencyContact || null,
          medical_notes: req.body.medical_notes || req.body.medicalNotes || null,
          room_id: req.body.room_id || req.body.roomId || null,
          bed_id: req.body.bed_id || req.body.bedId || null,
          profile_image: profileImage,
          parent_image_1: req.body.parent_image_1 || req.body.parentImage1 || null,
          parent_image_2: req.body.parent_image_2 || req.body.parentImage2 || null,
          joining_date: req.body.joining_date || req.body.joiningDate || null,
          current_status: req.body.current_status || req.body.currentStatus || 'present',
        },
      ]);

      if (studentInsertError) throw studentInsertError;
    } catch (innerError) {
      throw innerError;
    }

    const created = await getStudentById(db, collegeId, studentId);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create student error:', error);
    if (error?.message === 'Linked user not found for this college' || error?.message === 'name and email are required') {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error?.code === '23505' || error?.message?.includes('duplicate')) {
      res.status(409).json({ error: 'A student with this enrollment number, email, or linked user already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const existing = await getStudentById(db, collegeId, req.params.id);

    if (!existing) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const canManage = ['admin', 'warden'].includes(req.user?.role || '');
    const isOwner = existing.user_id === req.user?.userId;

    if (!canManage && !isOwner) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const studentUpdates: Record<string, any> = {};
    const userUpdates: Record<string, any> = {};

    const studentMap = [
      ['enrollmentNumber', 'enrollment_number'],
      ['enrollment_number', 'enrollment_number'],
      ['course', 'course'],
      ['year', 'year'],
      ['gender', 'gender'],
      ['dateOfBirth', 'date_of_birth'],
      ['date_of_birth', 'date_of_birth'],
      ['contactNumber', 'contact_number'],
      ['contact_number', 'contact_number'],
      ['address', 'address'],
      ['guardianName', 'guardian_name'],
      ['guardian_name', 'guardian_name'],
      ['guardianContact', 'guardian_contact'],
      ['guardian_contact', 'guardian_contact'],
      ['emergencyContact', 'emergency_contact'],
      ['emergency_contact', 'emergency_contact'],
      ['medicalNotes', 'medical_notes'],
      ['medical_notes', 'medical_notes'],
      ['roomId', 'room_id'],
      ['room_id', 'room_id'],
      ['bedId', 'bed_id'],
      ['bed_id', 'bed_id'],
      ['profileImage', 'profile_image'],
      ['profile_image', 'profile_image'],
      ['parentImage1', 'parent_image_1'],
      ['parent_image_1', 'parent_image_1'],
      ['parentImage2', 'parent_image_2'],
      ['parent_image_2', 'parent_image_2'],
      ['joiningDate', 'joining_date'],
      ['joining_date', 'joining_date'],
      ['currentStatus', 'current_status'],
      ['current_status', 'current_status'],
    ] as const;

    const userMap = [
      ['name', 'name'],
      ['email', 'email'],
      ['profileImage', 'profile_image'],
      ['profile_image', 'profile_image'],
      ['generatedId', 'generated_id'],
      ['generated_id', 'generated_id'],
    ] as const;

    for (const [inputKey, column] of studentMap) {
      if (req.body[inputKey] !== undefined && !(column in studentUpdates)) {
        studentUpdates[column] = req.body[inputKey];
      }
    }

    for (const [inputKey, column] of userMap) {
      if (req.body[inputKey] !== undefined && !(column in userUpdates)) {
        userUpdates[column] = req.body[inputKey];
      }
    }

    if (canManage && (req.body.isActive !== undefined || req.body.is_active !== undefined)) {
      userUpdates.is_active = req.body.isActive !== undefined ? !!req.body.isActive : !!req.body.is_active;
    }

    const newPassword = req.body.password || req.body.generatedPassword || req.body.generated_password;
    if (newPassword) {
      userUpdates.password = await hashPassword(newPassword);
    }

    if (Object.keys(studentUpdates).length === 0 && Object.keys(userUpdates).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    try {
      if (Object.keys(studentUpdates).length > 0) {
        const { error: studentUpdateError } = await db
          .from('students')
          .update(studentUpdates)
          .eq('id', req.params.id)
          .eq('college_id', collegeId);

        if (studentUpdateError) throw studentUpdateError;
      }

      if (Object.keys(userUpdates).length > 0) {
        const { error: userUpdateError } = await db
          .from('users')
          .update(userUpdates)
          .eq('id', existing.user_id)
          .eq('college_id', collegeId);

        if (userUpdateError) throw userUpdateError;
      }
    } catch (innerError) {
      throw innerError;
    }

    const updated = await getStudentById(db, collegeId, req.params.id);
    res.json(updated);
  } catch (error: any) {
    console.error('Update student error:', error);
    if (error?.code === '23505' || error?.message?.includes('duplicate')) {
      res.status(409).json({ error: 'Constraint violation while updating student' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const existing = await getStudentById(db, collegeId, req.params.id);

    if (!existing) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    try {
      if (existing.bed_id) {
        const { error: bedUpdateError } = await db
          .from('beds')
          .update({ status: 'available', student_id: null, assigned_date: null })
          .eq('id', existing.bed_id)
          .eq('college_id', collegeId);

        if (bedUpdateError) throw bedUpdateError;
      }

      if (existing.room_id) {
        const { count, error: countError } = await db
          .from('beds')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', existing.room_id)
          .eq('college_id', collegeId)
          .eq('status', 'occupied');

        if (countError) throw countError;

        const occupiedBeds = count || 0;
        const { error: roomUpdateError } = await db
          .from('rooms')
          .update({
            occupied_beds: occupiedBeds,
            status: occupiedBeds > 0 ? 'available' : 'available',
          })
          .eq('id', existing.room_id)
          .eq('college_id', collegeId);

        if (roomUpdateError) throw roomUpdateError;
      }

      const { error: studentUpdateError } = await db
        .from('students')
        .update({ room_id: null, bed_id: null, current_status: 'absent' })
        .eq('id', req.params.id)
        .eq('college_id', collegeId);

      if (studentUpdateError) throw studentUpdateError;

      const { error: userUpdateError } = await db
        .from('users')
        .update({ is_active: false })
        .eq('id', existing.user_id)
        .eq('college_id', collegeId);

      if (userUpdateError) throw userUpdateError;
    } catch (innerError) {
      throw innerError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
