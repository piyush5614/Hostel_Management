import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { mockStaff, mockCredentials } from '../store/mock-data';

/**
 * TaskStartPage — Public route: /task-start?token=xxx
 *
 * When a staff member clicks "START TASK" in their email, the link
 * carries a base64-encoded token containing "staffId|staffEmail".
 * This page decodes it, finds the staff's login credentials,
 * auto-logs them in, and redirects to /staff-tasks.
 */

// Built-in demo staff mapping: staff userId → { loginEmail, password }
// These are the hardcoded demo accounts from supabase.ts MOCK_USERS
const DEMO_STAFF_LOGINS: Record<string, { email: string; password: string }> = {
  'staff-1':   { email: 'staff@tchostel.edu',   password: 'staff123' },
  'warden-1':  { email: 'warden@tchostel.edu',  password: 'warden123' },
};

export function TaskStartPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, logout } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid or missing token. Please use the link from your email.');
      return;
    }

    // Decode the token (base64 → "staffId|staffEmail")
    let staffId: string;
    let staffEmail: string;
    try {
      const decoded = atob(token).trim();
      const parts = decoded.split('|');
      staffId = parts[0];
      staffEmail = parts[1] || '';
    } catch {
      setStatus('error');
      setErrorMsg('Invalid token format. Please use the link from your email.');
      return;
    }

    // If already authenticated as this staff, redirect directly
    const currentUser = useAuthStore.getState().user;
    if (isAuthenticated && currentUser) {
      // Check if the logged-in user matches the staff from the email
      const staff = mockStaff.find(s => s.id === staffId);
      if (staff && (
        currentUser.id === staff.id ||
        currentUser.id === staff.userId ||
        currentUser.email?.toLowerCase() === staff.email?.toLowerCase() ||
        currentUser.email?.toLowerCase() === staffEmail.toLowerCase()
      )) {
        navigate('/staff-tasks', { replace: true });
        return;
      }
      // Logged in as a different user — log out first, then re-login
      logout().then(() => autoLogin(staffId, staffEmail));
      return;
    }

    autoLogin(staffId, staffEmail);
  }, []);

  const autoLogin = async (staffId: string, staffEmail: string) => {
    try {
      // Find the staff record 
      const staff = mockStaff.find(s => s.id === staffId) 
                 || mockStaff.find(s => s.email?.toLowerCase() === staffEmail.toLowerCase());

      if (!staff) {
        setStatus('error');
        setErrorMsg('Staff account not found. Please log in manually.');
        return;
      }

      // 1. Try built-in demo accounts (matched by staff.userId)
      const demoLogin = DEMO_STAFF_LOGINS[staff.userId];
      if (demoLogin) {
        await login(demoLogin.email, demoLogin.password);
        navigate('/staff-tasks', { replace: true });
        return;
      }

      // 2. Look up dynamically generated credentials by staff email or userId
      const credential = mockCredentials.find(
        (c) => c.isActive && (
          c.email?.toLowerCase() === staff.email?.toLowerCase() ||
          c.userId === staff.userId
        )
      );

      if (credential) {
        await login(credential.email || credential.generatedId, credential.generatedPassword);
        navigate('/staff-tasks', { replace: true });
        return;
      }

      // 3. No credentials found — redirect to login
      setStatus('error');
      setErrorMsg(
        'Could not find login credentials for your account. Please log in manually.'
      );
    } catch (err: any) {
      console.error('Auto-login failed:', err);
      setStatus('error');
      setErrorMsg('Auto-login failed. Please log in manually.');
    }
  };

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Unable to Auto-Login</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{errorMsg}</p>
          </div>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Logging you in...</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Opening your tasks dashboard</p>
      </div>
    </div>
  );
}
