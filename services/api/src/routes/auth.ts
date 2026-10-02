import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { authenticate, getRequestCollegeId } from '../middleware/auth.js';
import { DEFAULT_COLLEGE_ID, resolveCollegeId } from '../utils/tenant.js';
import { log } from '../utils/logger.js';

const router = Router();

async function authenticateSupabaseUser(db: Awaited<ReturnType<typeof getDb>>, email: string, password: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return null;

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({ email, password });
  if (authError || !authData.user?.email) return null;

  const authUser = authData.user;
  const normalizedEmail = (authUser.email || email).trim().toLowerCase();
  const { data: linkedProfile, error: linkedProfileError } = await db
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (linkedProfileError) throw linkedProfileError;
  if (linkedProfile) return linkedProfile.is_active ? linkedProfile : null;

  const { data: existingProfile, error: existingProfileError } = await db
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingProfileError) throw existingProfileError;
  if (existingProfile?.auth_id && existingProfile.auth_id !== authUser.id) {
    throw new Error('This email is linked to a different Supabase Auth user.');
  }

  if (existingProfile) {
    const { data: linked, error: linkError } = await db
      .from('users')
      .update({ auth_id: authUser.id, password: null })
      .eq('id', existingProfile.id)
      .select('*')
      .single();

    if (linkError) throw linkError;
    return linked.is_active ? linked : null;
  }

  const metadataName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
  const name = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : normalizedEmail.split('@')[0];
  const { data: created, error: createError } = await db
    .from('users')
    .insert({
      id: authUser.id,
      auth_id: authUser.id,
      college_id: DEFAULT_COLLEGE_ID,
      name,
      email: normalizedEmail,
      password: null,
      role: 'student',
      is_active: true,
    })
    .select('*')
    .single();

  if (createError) throw createError;
  return created;
}

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
    const existingQuery = db
      .from('users')
      .select('id, email')
      .eq('college_id', collegeId)
      .eq('email', email);

    let { data: existing, error: selectErr } = await existingQuery;

    if (!existing && generatedId) {
      const { data: existingById, error: selectByIdErr } = await db
        .from('users')
        .select('id, email')
        .eq('college_id', collegeId)
        .eq('generated_id', generatedId);

      if (!selectByIdErr && existingById && existingById.length > 0) {
        existing = existingById;
      }
    }

    if (existing && existing.length > 0) {
      // Update the existing user's password (and generated_id / name if provided)
      const hashedPassword = await hashPassword(password);
      const existingUser = existing[0];

      const updateData: any = {
        password: hashedPassword,
        name,
        role,
      };

      if (generatedId) {
        updateData.generated_id = generatedId;
      }

      const { error: updateErr } = await db
        .from('users')
        .update(updateData)
        .eq('id', existingUser.id)
        .eq('college_id', collegeId);

      if (updateErr) {
        // If generated_id conflicts with another user, skip the generated_id update
        if (updateErr.message?.includes('duplicate') || updateErr.code?.includes('UNIQUE')) {
          const { error: retryErr } = await db
            .from('users')
            .update({
              password: hashedPassword,
              name,
              role,
            })
            .eq('id', existingUser.id)
            .eq('college_id', collegeId);

          if (retryErr) throw retryErr;
        } else {
          throw updateErr;
        }
      }

      const token = generateToken({ userId: existingUser.id, email: existingUser.email, role, collegeId });
      res.status(200).json({
        user: { id: existingUser.id, email: existingUser.email, name, role, college_id: collegeId, is_active: true },
        token,
      });
      return;
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    try {
      const { error: insertErr } = await db.from('users').insert([
        {
          id: userId,
          college_id: collegeId,
          email,
          password: hashedPassword,
          name,
          role,
          generated_id: generatedId || null,
          is_active: true,
        },
      ]);

      if (insertErr) {
        if (insertErr.message?.includes('duplicate') || insertErr.code?.includes('UNIQUE')) {
          // Race condition – user was inserted between our SELECT and INSERT
          const { data: found } = await db
            .from('users')
            .select('id, email')
            .eq('college_id', collegeId)
            .eq('email', email);

          if (found && found.length > 0) {
            const foundUser = found[0];
            const token = generateToken({ userId: foundUser.id, email: foundUser.email, role, collegeId });
            res.status(200).json({
              user: { id: foundUser.id, email: foundUser.email, name, role, college_id: collegeId },
              token,
            });
            return;
          }
        }
        throw insertErr;
      }
    } catch (insertErr: any) {
      log.error('Signup insert error', insertErr, { email });
      throw insertErr;
    }

    const token = generateToken({ userId, email, role, collegeId });
    res.status(201).json({ user: { id: userId, email, name, role, college_id: collegeId, is_active: true }, token });
  } catch (error) {
    log.error('Signup error', error, { path: '/signup' });
    res.status(500).json({ error: 'Internal server error' });
  }
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
    const authProfile = await authenticateSupabaseUser(db, email.trim().toLowerCase(), password);

    if (authProfile) {
      const collegeId = resolveCollegeId(authProfile.college_id);
      const token = generateToken({
        userId: authProfile.id,
        email: authProfile.email,
        role: authProfile.role,
        collegeId,
      });

      res.json({
        user: {
          id: authProfile.id,
          email: authProfile.email,
          name: authProfile.name,
          role: authProfile.role,
          college_id: collegeId,
          generated_id: authProfile.generated_id,
          profile_image: authProfile.profile_image,
          is_active: Boolean(authProfile.is_active),
        },
        token,
      });
      return;
    }

    // Try matching by email first
    const { data: users, error: selectErr } = await db
      .from('users')
      .select('*')
      .eq('college_id', collegeId)
      .eq('email', email)
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
        .eq('generated_id', email)
        .eq('is_active', true);

      user = usersById && usersById.length > 0 ? usersById[0] : null;
    }

    if (!user || !(await comparePassword(password, user.password))) {
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
