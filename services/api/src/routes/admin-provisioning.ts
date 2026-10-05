import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';
import { log } from '../utils/logger.js';

const router = Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AccountRole = 'student' | 'staff';
type ProvisionInput = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  generatedId?: unknown;
  profile?: unknown;
};

function missingFields(profile: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((field) => {
    const value = profile[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

async function provisionAccount(req: Request, res: Response, role: AccountRole): Promise<void> {
  const body = req.body as ProvisionInput;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const generatedId = typeof body.generatedId === 'string' ? body.generatedId.trim().toUpperCase() : '';
  const collegeId = resolveCollegeId(req.user?.collegeId);
  const profile = body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile)
    ? body.profile as Record<string, unknown>
    : {};

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }
  if (!name || !generatedId) {
    res.status(400).json({ error: 'Name and generatedId are required.' });
    return;
  }
  const accountEmail = email || `${generatedId.toLowerCase()}@${collegeId}.local`;
  if (body.email !== undefined && !EMAIL_PATTERN.test(accountEmail)) {
    res.status(400).json({ error: 'A valid email is required when supplied.' });
    return;
  }

  const requiredProfileFields = role === 'student'
    ? ['course', 'year', 'gender', 'date_of_birth', 'contact_number', 'address', 'guardian_name', 'guardian_contact', 'emergency_contact']
    : ['position', 'department', 'contact_number', 'address'];
  const missing = missingFields(profile, requiredProfileFields);
  if (missing.length > 0) {
    res.status(400).json({ error: 'Missing required profile fields.', fields: missing });
    return;
  }

  const db = await getDb();

  const { data: existingEmail, error: emailCheckError } = await db
    .from('users')
    .select('id')
    .eq('college_id', collegeId)
    .ilike('email', accountEmail)
    .maybeSingle();
  if (emailCheckError) throw emailCheckError;
  if (existingEmail) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const { data: existingId, error: idCheckError } = await db
    .from('users')
    .select('id')
    .eq('college_id', collegeId)
    .ilike('generated_id', generatedId)
    .maybeSingle();
  if (idCheckError) throw idCheckError;
  if (existingId) {
    res.status(409).json({ error: 'This login ID is already in use for this college.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let provisioned: any;
  let provisionError: any;
  try {
    const result = await db.rpc('provision_managed_user', {
      p_auth_id: null,
      p_college_id: collegeId,
      p_name: name,
      p_email: accountEmail,
      p_role: role,
      p_generated_id: generatedId,
      p_password_hash: passwordHash,
      p_profile: profile,
    });
    provisioned = result.data;
    provisionError = result.error;
  } catch (error) {
    log.error('Provisioning call failed', error, { role, collegeId });
    res.status(500).json({ error: 'Could not create the application profile.' });
    return;
  }

  if (provisionError) {
    if (provisionError.code === '23505') {
      res.status(409).json({ error: 'This email or login ID is already in use for this college.' });
      return;
    }
    if (provisionError.code === '23503' || provisionError.code === '22023' || provisionError.code === '22P02') {
      res.status(400).json({ error: 'The supplied profile data is invalid.' });
      return;
    }
    log.error('Admin profile provisioning failed', provisionError, { role, collegeId });
    res.status(500).json({ error: 'Could not create the application profile.' });
    return;
  }

  res.status(201).json({
    userId: provisioned?.user?.id,
    id: generatedId,
    email: accountEmail,
    role,
    college_id: collegeId,
    profile: provisioned?.profile ?? null,
  });
}

router.post('/students', authenticate, authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    await provisionAccount(req, res, 'student');
  } catch (error) {
    log.error('Admin student provisioning failed', error);
    if (!res.headersSent) res.status(500).json({ error: 'Unable to provision student account.' });
  }
});

router.post('/staff', authenticate, authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    await provisionAccount(req, res, 'staff');
  } catch (error) {
    log.error('Admin staff provisioning failed', error);
    if (!res.headersSent) res.status(500).json({ error: 'Unable to provision staff account.' });
  }
});

export default router;
