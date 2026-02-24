import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role = 'student' } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const db = await getDb();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);

    if (existing) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    await db.run(
      'INSERT INTO users (id, email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [userId, email, hashedPassword, name, role]
    );

    const token = generateToken({ userId, email, role });
    res.status(201).json({ user: { id: userId, email, name, role }, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user || !(await comparePassword(password, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await db.run('UPDATE users SET last_login = ? WHERE id = ?', [
      new Date().toISOString(),
      user.id,
    ]);

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
    const user = await db.get('SELECT id, email, name, role, profile_image, is_active FROM users WHERE id = ?', [
      req.user?.userId,
    ]);

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
