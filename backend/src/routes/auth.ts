import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { authenticate, getRequestCollegeId } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

// Signup – also accepts an optional `generatedId` (e.g. STAFF-0001, STU-0001)
// If a user with the same email OR generatedId already exists, update their password instead.
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role = 'student', generatedId } = req.body;
    const collegeId = getRequestCollegeId(req);

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const db = await getDb();

    // Check if the user already exists (by email or by generated_id)
    let existing = await db.get(
      'SELECT id, email FROM users WHERE college_id = ? AND email = ?',
      [collegeId, email]
    );
    if (!existing && generatedId) {
      existing = await db.get(
        'SELECT id, email FROM users WHERE college_id = ? AND generated_id = ?',
        [collegeId, generatedId]
      );
    }

    if (existing) {
      // Update the existing user's password (and generated_id / name if provided)
      const hashedPassword = await hashPassword(password);
      try {
        await db.run(
          `UPDATE users SET password = ?, name = ?, role = ?, generated_id = COALESCE(?, generated_id) WHERE id = ? AND college_id = ?`,
          [hashedPassword, name, role, generatedId || null, existing.id, collegeId]
        );
      } catch (updateErr: any) {
        // If generated_id conflicts with another user, skip the generated_id update
        if (updateErr.code === 'SQLITE_CONSTRAINT') {
          await db.run(
            `UPDATE users SET password = ?, name = ?, role = ? WHERE id = ? AND college_id = ?`,
            [hashedPassword, name, role, existing.id, collegeId]
          );
        } else {
          throw updateErr;
        }
      }
      const token = generateToken({ userId: existing.id, email: existing.email, role, collegeId });
      res.status(200).json({
        user: { id: existing.id, email: existing.email, name, role, college_id: collegeId },
        token,
      });
      return;
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    try {
      await db.run(
        'INSERT INTO users (id, college_id, email, password, name, role, generated_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [userId, collegeId, email, hashedPassword, name, role, generatedId || null]
      );
    } catch (insertErr: any) {
      if (insertErr.code === 'SQLITE_CONSTRAINT') {
        // Race condition – user was inserted between our SELECT and INSERT
        const found = await db.get('SELECT id, email FROM users WHERE college_id = ? AND email = ?', [collegeId, email]);
        if (found) {
          const token = generateToken({ userId: found.id, email: found.email, role, collegeId });
          res.status(200).json({
            user: { id: found.id, email: found.email, name, role, college_id: collegeId },
            token,
          });
          return;
        }
      }
      throw insertErr;
    }

    const token = generateToken({ userId, email, role, collegeId });
    res.status(201).json({ user: { id: userId, email, name, role, college_id: collegeId }, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login – accepts email OR generated_id (e.g. STAFF-0001, STU-0001)
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const collegeId = getRequestCollegeId(req);

    if (!email || !password) {
      res.status(400).json({ error: 'Email/ID and password are required' });
      return;
    }

    const db = await getDb();

    // Try matching by email first, then by generated_id
    let user = await db.get('SELECT * FROM users WHERE college_id = ? AND email = ? AND is_active = 1', [collegeId, email]);
    if (!user) {
      user = await db.get('SELECT * FROM users WHERE college_id = ? AND generated_id = ? AND is_active = 1', [collegeId, email]);
    }

    if (!user || !(await comparePassword(password, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await db.run('UPDATE users SET last_login = ? WHERE id = ?', [
      new Date().toISOString(),
      user.id,
    ]);

    const resolvedCollegeId = resolveCollegeId(user.college_id);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      collegeId: resolvedCollegeId,
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        college_id: resolvedCollegeId,
        generated_id: user.generated_id,
        profile_image: user.profile_image,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const user = await db.get(
      'SELECT id, email, name, role, profile_image, generated_id, is_active, college_id FROM users WHERE id = ? AND college_id = ?',
      [req.user?.userId, collegeId]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
