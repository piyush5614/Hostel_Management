import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const collegeId = process.env.DEFAULT_COLLEGE_ID?.trim() || 'college-default';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error('Set ADMIN_EMAIL to the administrator email address.');
}
if (!password || password.length < 8) {
  throw new Error('Set ADMIN_PASSWORD to a password of at least 8 characters.');
}
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserByEmail(targetEmail: string) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }

  throw new Error('Could not search all Auth users safely.');
}

async function main() {
  const existing = await findAuthUserByEmail(email!);
  let authUserId: string;
  let createdAuthUser = false;

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: password!,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, name: 'Administrator', role: 'admin', college_id: collegeId },
    });
    if (error) throw error;
    authUserId = data.user.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email!,
      password: password!,
      email_confirm: true,
      user_metadata: { name: 'Administrator', role: 'admin', college_id: collegeId },
    });
    if (error) throw error;
    authUserId = data.user.id;
    createdAuthUser = true;
  }

  const { error: profileError } = await supabase.rpc('provision_managed_user', {
    p_auth_id: authUserId,
    p_college_id: collegeId,
    p_name: 'Administrator',
    p_email: email!,
    p_role: 'admin',
    p_generated_id: null,
    p_profile: {},
  });

  if (profileError) {
    if (createdAuthUser) {
      const { error: rollbackError } = await supabase.auth.admin.deleteUser(authUserId);
      if (rollbackError) {
        console.error('Admin profile provisioning failed and Auth rollback also failed.');
      }
    }
    throw profileError;
  }

  console.log(`Admin account provisioned for ${collegeId}: ${email}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown provisioning error';
  console.error(`Admin provisioning failed: ${message}`);
  process.exitCode = 1;
});
