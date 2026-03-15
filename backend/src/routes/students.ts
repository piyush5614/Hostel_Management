import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';
import { hashPassword } from '../utils/auth.js';

const router = Router();

const STUDENT_SELECT = `
  SELECT
    s.id,
    s.college_id,
    s.user_id,
    u.name,
    u.email,
    s.enrollment_number,
    s.course,
    s.year,
    s.gender,
    s.date_of_birth,
    s.contact_number,
    s.address,
    s.guardian_name,
    s.guardian_contact,
    s.emergency_contact,
    s.medical_notes,
    s.room_id,
    s.bed_id,
    COALESCE(s.profile_image, u.profile_image) AS profile_image,
    s.parent_image_1,
    s.parent_image_2,
    s.joining_date,
    s.current_status,
    u.is_active,
    u.generated_id,
    s.created_at
  FROM students s
  INNER JOIN users u ON u.id = s.user_id AND u.college_id = s.college_id
`;

async function getStudentById(db: Awaited<ReturnType<typeof getDb>>, collegeId: string, studentId: string) {
  return db.get(
    `${STUDENT_SELECT} WHERE s.id = ? AND s.college_id = ?`,
    [studentId, collegeId]
  );
}

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const includeInactive = req.query.includeInactive === 'true' && ['admin', 'warden'].includes(req.user?.role || '');

    let sql = `${STUDENT_SELECT} WHERE s.college_id = ?`;
    const params: any[] = [collegeId];

    if (!includeInactive) {
      sql += ' AND u.is_active = 1';
    }

    if (req.user?.role === 'student') {
      sql += ' AND s.user_id = ?';
      params.push(req.user.userId);
    }

    sql += ' ORDER BY s.created_at DESC';

    const students = await db.all(sql, params);
    res.json(students || []);
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
    const isActive = requestedIsActive === undefined ? 1 : (requestedIsActive ? 1 : 0);

    let linkedUserId = req.body.user_id || req.body.userId;

    await db.exec('BEGIN TRANSACTION');

    try {
      if (linkedUserId) {
        const linkedUser = await db.get(
          'SELECT id FROM users WHERE id = ? AND college_id = ?',
          [linkedUserId, collegeId]
        );

        if (!linkedUser) {
          throw new Error('Linked user not found for this college');
        }

        await db.run(
          `UPDATE users
           SET name = COALESCE(?, name),
               email = COALESCE(?, email),
               role = 'student',
               profile_image = COALESCE(?, profile_image),
               generated_id = COALESCE(?, generated_id),
               is_active = ?
           WHERE id = ? AND college_id = ?`,
          [name || null, email || null, profileImage, generatedId, isActive, linkedUserId, collegeId]
        );
      } else {
        if (!name || !email) {
          throw new Error('name and email are required');
        }

        let existingUser = await db.get(
          'SELECT * FROM users WHERE college_id = ? AND email = ?',
          [collegeId, email]
        );

        if (!existingUser && generatedId) {
          existingUser = await db.get(
            'SELECT * FROM users WHERE college_id = ? AND generated_id = ?',
            [collegeId, generatedId]
          );
        }

        const hashedPassword = await hashPassword(password);

        if (existingUser) {
          linkedUserId = existingUser.id;
          await db.run(
            `UPDATE users
             SET name = ?,
                 email = ?,
                 password = ?,
                 role = 'student',
                 profile_image = COALESCE(?, profile_image),
                 generated_id = COALESCE(?, generated_id),
                 is_active = ?
             WHERE id = ? AND college_id = ?`,
            [name, email, hashedPassword, profileImage, generatedId, isActive, linkedUserId, collegeId]
          );
        } else {
          linkedUserId = uuidv4();
          await db.run(
            `INSERT INTO users (
              id, college_id, email, password, name, role, profile_image, generated_id, is_active
            ) VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?)`,
            [linkedUserId, collegeId, email, hashedPassword, name, profileImage, generatedId, isActive]
          );
        }
      }

      await db.run(
        `INSERT INTO students (
          id, college_id, user_id, enrollment_number, course, year, gender, date_of_birth,
          contact_number, address, guardian_name, guardian_contact, emergency_contact, medical_notes,
          room_id, bed_id, profile_image, parent_image_1, parent_image_2, joining_date, current_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          studentId,
          collegeId,
          linkedUserId,
          req.body.enrollment_number || req.body.enrollmentNumber,
          req.body.course || null,
          req.body.year || null,
          req.body.gender || null,
          req.body.date_of_birth || req.body.dateOfBirth || null,
          req.body.contact_number || req.body.contactNumber || null,
          req.body.address || null,
          req.body.guardian_name || req.body.guardianName || null,
          req.body.guardian_contact || req.body.guardianContact || null,
          req.body.emergency_contact || req.body.emergencyContact || null,
          req.body.medical_notes || req.body.medicalNotes || null,
          req.body.room_id || req.body.roomId || null,
          req.body.bed_id || req.body.bedId || null,
          profileImage,
          req.body.parent_image_1 || req.body.parentImage1 || null,
          req.body.parent_image_2 || req.body.parentImage2 || null,
          req.body.joining_date || req.body.joiningDate || null,
          req.body.current_status || req.body.currentStatus || 'present',
        ]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    const created = await getStudentById(db, collegeId, studentId);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create student error:', error);
    if (error?.message === 'Linked user not found for this college' || error?.message === 'name and email are required') {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error?.code === 'SQLITE_CONSTRAINT') {
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

    const studentUpdates: Array<{ column: string; value: any }> = [];
    const userUpdates: Array<{ column: string; value: any }> = [];

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
      if (req.body[inputKey] !== undefined) {
        studentUpdates.push({ column, value: req.body[inputKey] });
      }
    }

    for (const [inputKey, column] of userMap) {
      if (req.body[inputKey] !== undefined) {
        userUpdates.push({ column, value: req.body[inputKey] });
      }
    }

    if (canManage && (req.body.isActive !== undefined || req.body.is_active !== undefined)) {
      userUpdates.push({
        column: 'is_active',
        value: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : (req.body.is_active ? 1 : 0),
      });
    }

    const newPassword = req.body.password || req.body.generatedPassword || req.body.generated_password;
    if (newPassword) {
      userUpdates.push({ column: 'password', value: await hashPassword(newPassword) });
    }

    if (studentUpdates.length === 0 && userUpdates.length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    await db.exec('BEGIN TRANSACTION');

    try {
      if (studentUpdates.length > 0) {
        const setClause = studentUpdates.map((u) => `${u.column} = ?`).join(', ');
        await db.run(
          `UPDATE students SET ${setClause} WHERE id = ? AND college_id = ?`,
          [...studentUpdates.map((u) => u.value), req.params.id, collegeId]
        );
      }

      if (userUpdates.length > 0) {
        const setClause = userUpdates.map((u) => `${u.column} = ?`).join(', ');
        await db.run(
          `UPDATE users SET ${setClause} WHERE id = ? AND college_id = ?`,
          [...userUpdates.map((u) => u.value), existing.user_id, collegeId]
        );
      }

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    const updated = await getStudentById(db, collegeId, req.params.id);
    res.json(updated);
  } catch (error: any) {
    console.error('Update student error:', error);
    if (error?.code === 'SQLITE_CONSTRAINT') {
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

    await db.exec('BEGIN TRANSACTION');

    try {
      if (existing.bed_id) {
        await db.run(
          `UPDATE beds
           SET status = 'available', student_id = NULL, assigned_date = NULL
           WHERE id = ? AND college_id = ?`,
          [existing.bed_id, collegeId]
        );
      }

      if (existing.room_id) {
        const occupiedRow = await db.get(
          `SELECT COUNT(*) as occupied_count
           FROM beds
           WHERE room_id = ? AND college_id = ? AND status = 'occupied'`,
          [existing.room_id, collegeId]
        );

        const occupiedBeds = Number(occupiedRow?.occupied_count || 0);
        await db.run(
          `UPDATE rooms
           SET occupied_beds = ?, status = ?
           WHERE id = ? AND college_id = ?`,
          [occupiedBeds, occupiedBeds > 0 ? 'available' : 'available', existing.room_id, collegeId]
        );
      }

      await db.run(
        `UPDATE students
         SET room_id = NULL, bed_id = NULL, current_status = 'absent'
         WHERE id = ? AND college_id = ?`,
        [req.params.id, collegeId]
      );

      await db.run(
        'UPDATE users SET is_active = 0 WHERE id = ? AND college_id = ?',
        [existing.user_id, collegeId]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
