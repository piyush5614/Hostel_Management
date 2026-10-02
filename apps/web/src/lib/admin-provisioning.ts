export interface ProvisionedAccount {
  userId: string;
  id: string;
  email: string;
  role: 'student' | 'staff';
  college_id: string;
}

async function provision(path: string, account: Record<string, unknown>): Promise<ProvisionedAccount> {
  let session: { access_token?: string; college_id?: string; user?: { user_metadata?: { college_id?: string } } } | null = null;
  try {
    const raw = localStorage.getItem('tc-hostel-enhanced-session');
    session = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error('Your session is invalid. Sign in again as an administrator.');
  }

  if (!session?.access_token || session.access_token === 'mock-access-token') {
    throw new Error('Sign in as an administrator before provisioning accounts.');
  }

  const collegeId = session.college_id || session.user?.user_metadata?.college_id || localStorage.getItem('tc-hostel-active-college-id') || 'college-default';
  const response = await fetch(`/api/admin/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'x-college-id': collegeId,
    },
    body: JSON.stringify(account),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const details = Array.isArray(payload.fields) ? ` ${payload.fields.join(', ')}` : '';
    throw new Error(`${payload.error || 'Account provisioning failed.'}${details}`);
  }

  return payload as ProvisionedAccount;
}

export function provisionStudentAccount(account: Record<string, unknown>): Promise<ProvisionedAccount> {
  return provision('students', account);
}

export function provisionStaffAccount(account: Record<string, unknown>): Promise<ProvisionedAccount> {
  return provision('staff', account);
}
