import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getDb } from '../db/init.js';
import { generateToken } from '../utils/auth.js';
import { authenticate, getRequestCollegeId } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';
import { log } from '../utils/logger.js';

const router = Router();

// Public self-signup is intentionally disabled. Accounts are provisioned by admins.
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  res.status(410).json({ error: 'Public signup is disabled. Ask your administrator to provision your account.' });
});

// Login – accepts email OR generated_id (e.g. STAFF-0001, STU-0001)
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const collegeId = getRequestCollegeId(req);

    if (!email || !password) {
      log.warn('Login attempt with missing credentials', { email });
      res.status(400).json({ error: 'Email/ID and password are required' });
      return;
    }

    const db = await getDb();
    const identifier = email.trim();
    const { data: users, error: selectErr } = await db
      .from('users')
      .select('*')
      .eq('college_id', collegeId)
      .eq('email', identifier.includes('@') ? identifier.toLowerCase() : identifier)
      .eq('is_active', true);

    if (selectErr) {
      throw selectErr;
    }

    let user = users && users.length > 0 ? users[0] : null;

    // If not found by email, try by generated_id
    if (!user) {
      const { data: usersById } = await db
        .from('users')
        .select('*')
        .eq('college_id', collegeId)
        .eq('generated_id', identifier)
        .eq('is_active', true);

      user = usersById && usersById.length > 0 ? usersById[0] : null;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!user || !user.auth_id || !supabaseUrl || !publishableKey) {
      log.warn('Login failed - invalid credentials', { email, ip: req.ip });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (authError || authData.user?.id !== user.auth_id) {
      log.warn('Login failed - invalid credentials', { email, ip: req.ip });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last_login timestamp
    const { error: updateErr } = await db
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    if (updateErr) {
      log.warn('Failed to update last_login', { error: updateErr, userId: user.id });
    }

    const resolvedCollegeId = resolveCollegeId(user.college_id);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      collegeId: resolvedCollegeId,
    });

    log.auth('Login successful', user.id, email);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        college_id: resolvedCollegeId,
        generated_id: user.generated_id,
        profile_image: user.profile_image,
        is_active: Boolean(user.is_active),
      },
      token,
    });
  } catch (error) {
    log.error('Login route error', error, { path: '/login' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);

    const { data: users, error } = await db
      .from('users')
      .select('id, email, name, role, profile_image, generated_id, is_active, college_id')
      .eq('id', req.user?.userId)
      .eq('college_id', collegeId);

    if (error || !users || users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = users[0];
    res.json(user);
  } catch (error) {
    log.error('Get user error', error, { path: '/me' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
