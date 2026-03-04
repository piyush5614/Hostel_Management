// HYBRID AUTH — tries the real Express backend first, falls back to mock
// Backend runs on /api (proxied via Vite in dev)

import { User as SupabaseUser } from '@supabase/supabase-js';

/* ──────────────── Credential registry (kept for mock fallback) ──────────────── */
interface RegisteredCredential {
  email: string;
  generatedId: string;
  generatedPassword: string;
  name: string;
  role: string;
  userId: string;
  isActive: boolean;
}

const credentialRegistry: RegisteredCredential[] = [];

/**
 * Register a credential for login.  
 * This ALSO fire-and-forgets a signup call to the real backend so the
 * account is available across browsers.
 */
export const registerCredentialForLogin = (cred: RegisteredCredential) => {
  // Local registry (mock fallback)
  const idx = credentialRegistry.findIndex(c => c.generatedId === cred.generatedId);
  if (idx === -1) {
    credentialRegistry.push(cred);
  } else {
    Object.assign(credentialRegistry[idx], cred);
  }

  // Fire-and-forget: push to real backend
  backendSignup(cred).catch(() => {
    /* backend may not be running – that's fine */
  });
};

export const getRegisteredCredentials = () => credentialRegistry;

/* ──────────────── Backend helpers ──────────────── */

async function backendSignup(cred: RegisteredCredential): Promise<void> {
  await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cred.email,
      password: cred.generatedPassword,
      name: cred.name,
      role: cred.role,
      generatedId: cred.generatedId,
    }),
  });
}

interface BackendLoginResult {
  user: { id: string; email: string; name: string; role: string; generated_id?: string; profile_image?: string };
  token: string;
}

async function backendLogin(identifier: string, password: string): Promise<BackendLoginResult | null> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password }),
    });
    if (!res.ok) return null;
    return (await res.json()) as BackendLoginResult;
  } catch {
    return null; // backend unreachable
  }
}

/* ──────────────── Built-in demo accounts (mock fallback) ──────────────── */
const MOCK_USERS = [
  {
    id: 'admin-auth-id',
    email: 'admin@tchostel.edu',
    password: 'admin123',
    user_metadata: { role: 'admin' },
    profile: {
      id: 'admin-profile-id',
      auth_id: 'admin-auth-id',
      name: 'System Administrator',
      email: 'admin@tchostel.edu',
      role: 'admin',
      profile_image: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      is_active: true,
      last_login: new Date().toISOString(),
    }
  },
  {
    id: 'warden-auth-id',
    email: 'warden@tchostel.edu',
    password: 'warden123',
    user_metadata: { role: 'warden' },
    profile: {
      id: 'warden-profile-id',
      auth_id: 'warden-auth-id',
      name: 'Dr. Priya Sharma',
      email: 'warden@tchostel.edu',
      role: 'warden',
      profile_image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      is_active: true,
      last_login: new Date().toISOString(),
    }
  },
  {
    id: 'staff-auth-id',
    email: 'staff@tchostel.edu',
    password: 'staff123',
    user_metadata: { role: 'staff' },
    profile: {
      id: '1',
      auth_id: 'staff-auth-id',
      name: 'Rajesh Kumar',
      email: 'staff@tchostel.edu',
      role: 'staff',
      profile_image: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      is_active: true,
      last_login: new Date().toISOString(),
      staffId: '1',
    }
  },
  {
    id: 'student-auth-id',
    email: 'student@tchostel.edu',
    password: 'student123',
    user_metadata: { role: 'student' },
    profile: {
      id: '1',
      auth_id: 'student-auth-id',
      name: 'Arjun Sharma',
      email: 'student@tchostel.edu',
      role: 'student',
      profile_image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      is_active: true,
      last_login: new Date().toISOString(),
      studentId: '1',
    }
  }
];

/* ──────────────── Session storage ──────────────── */
let currentSession: any = null;

/* ──────────────── Mock Supabase client (hybrid) ──────────────── */
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const identifier = email;
      console.log('🔐 Hybrid auth – attempting login for:', identifier);

      // ───── 1.  Try the real backend first ─────
      const backendResult = await backendLogin(identifier, password);
      if (backendResult) {
        console.log('✅ Backend login successful for:', backendResult.user.email);

        const bu = backendResult.user;
        const mockUser: SupabaseUser = {
          id: bu.id,
          email: bu.email!,
          user_metadata: { role: bu.role },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          role: 'authenticated',
          confirmation_sent_at: null,
          confirmed_at: new Date().toISOString(),
          email_change_sent_at: null,
          new_email: null,
          invited_at: null,
          action_link: null,
          recovery_sent_at: null,
          phone: null,
          phone_confirmed_at: null,
          phone_change_sent_at: null,
          new_phone: null,
          identities: [],
          factors: [],
        };

        const mockSession = {
          access_token: backendResult.token,
          refresh_token: 'backend-refresh',
          expires_in: 604800,
          expires_at: Date.now() + 604800000,
          token_type: 'bearer',
          user: mockUser,
        };

        // Update or push into MOCK_USERS so getUserProfile works
        const existingIdx = MOCK_USERS.findIndex(u => u.email === bu.email);
        const backendProfile = {
          id: bu.id,
          auth_id: bu.id,
          name: bu.name,
          email: bu.email,
          role: bu.role,
          profile_image: bu.profile_image || '',
          is_active: true,
          last_login: new Date().toISOString(),
        };
        if (existingIdx !== -1) {
          // Update existing entry with correct backend UUID
          MOCK_USERS[existingIdx].id = bu.id;
          MOCK_USERS[existingIdx].profile = { ...MOCK_USERS[existingIdx].profile, ...backendProfile };
        } else {
          MOCK_USERS.push({
            id: bu.id,
            email: bu.email,
            password: '',
            user_metadata: { role: bu.role },
            profile: backendProfile,
          });
        }

        currentSession = mockSession;
        localStorage.setItem('tc-hostel-enhanced-session', JSON.stringify(mockSession));

        return { data: { user: mockUser, session: mockSession }, error: null };
      }

      // ───── 2.  Fallback: in-memory mock ─────
      console.log('⚠️  Backend unavailable – falling back to mock auth');
      await new Promise(resolve => setTimeout(resolve, 400));

      // Try built-in demo accounts
      let user = MOCK_USERS.find(u => u.email === identifier && u.password === password);

      // Try credential registry
      if (!user) {
        const credential = credentialRegistry.find(
          (c) =>
            c.isActive &&
            (c.email?.toLowerCase() === identifier.toLowerCase() ||
             c.generatedId?.toLowerCase() === identifier.toLowerCase()) &&
            c.generatedPassword === password
        );

        if (credential) {
          const authId = credential.userId;
          user = {
            id: authId,
            email: credential.email,
            password: credential.generatedPassword,
            user_metadata: { role: credential.role },
            profile: {
              id: authId,
              auth_id: authId,
              name: credential.name,
              email: credential.email,
              role: credential.role,
              profile_image: '',
              is_active: true,
              last_login: new Date().toISOString(),
            },
          };
          MOCK_USERS.push(user);
        }
      }

      if (!user) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials. Please check your email/ID and password.' },
        };
      }

      const mockUser: SupabaseUser = {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        confirmation_sent_at: null,
        confirmed_at: new Date().toISOString(),
        email_change_sent_at: null,
        new_email: null,
        invited_at: null,
        action_link: null,
        recovery_sent_at: null,
        phone: null,
        phone_confirmed_at: null,
        phone_change_sent_at: null,
        new_phone: null,
        identities: [],
        factors: [],
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: mockUser,
      };

      currentSession = mockSession;
      localStorage.setItem('tc-hostel-enhanced-session', JSON.stringify(mockSession));

      console.log('✅ Mock authentication successful for:', user.email);

      return { data: { user: mockUser, session: mockSession }, error: null };
    },

    getSession: async () => {
      const stored = localStorage.getItem('tc-hostel-enhanced-session');
      if (stored) {
        try {
          const session = JSON.parse(stored);
          if (session.expires_at > Date.now()) {
            currentSession = session;
            return { data: { session }, error: null };
          } else {
            localStorage.removeItem('tc-hostel-enhanced-session');
          }
        } catch {
          localStorage.removeItem('tc-hostel-enhanced-session');
        }
      }
      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      if (currentSession?.user) {
        return { data: { user: currentSession.user }, error: null };
      }
      return { data: { user: null }, error: null };
    },

    signOut: async () => {
      console.log('🚪 Sign out');
      currentSession = null;
      localStorage.removeItem('tc-hostel-enhanced-session');
      return { error: null };
    },

    resetPasswordForEmail: async (email: string) => {
      console.log('📧 Password reset for:', email);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const user = MOCK_USERS.find(u => u.email === email);
      if (!user) {
        return { error: { message: 'No account found with this email address' } };
      }
      return { error: null };
    },

    updateUser: async (updates: any) => {
      console.log('👤 User update:', updates);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          if (table === 'users') {
            const user = MOCK_USERS.find(u => u.profile.auth_id === value || u.profile.id === value);
            if (user) return { data: user.profile, error: null };
            return { data: null, error: { message: 'User not found' } };
          }
          return { data: null, error: { message: 'Mock data not implemented for this table' } };
        },
      }),
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => ({ data: { id: 'mock-id', ...data[0] }, error: null }),
      }),
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: () => ({
          single: async () => ({ data: { id: value, ...data }, error: null }),
        }),
      }),
    }),
  }),
};

/* ──────────────── Helper exports ──────────────── */
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

export const getUserProfile = async (authId: string) => {
  // 1. Try MOCK_USERS first (instant, works for mock & cached backend users)
  const mockUser = MOCK_USERS.find(u => u.id === authId);
  if (mockUser) return mockUser.profile;

  // 2. Try the real backend using the stored JWT (handles page refresh)
  try {
    const stored = localStorage.getItem('tc-hostel-enhanced-session');
    if (stored) {
      const session = JSON.parse(stored);
      const token = session?.access_token;
      if (token && token !== 'mock-access-token') {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const bu = await res.json();
          const profile = {
            id: bu.id,
            auth_id: bu.id,
            name: bu.name,
            email: bu.email,
            role: bu.role,
            profile_image: bu.profile_image || '',
            is_active: bu.is_active ?? true,
            last_login: new Date().toISOString(),
          };
          // Cache in MOCK_USERS for future lookups
          MOCK_USERS.push({
            id: bu.id,
            email: bu.email,
            password: '',
            user_metadata: { role: bu.role },
            profile,
          });
          return profile;
        }
      }
    }
  } catch {
    // Backend unreachable – fall through
  }

  throw new Error('User profile not found');
};

export const createUserProfile = async (authUser: any, additionalData: any = {}) => {
  const user = MOCK_USERS.find(u => u.id === authUser.id);
  if (user) return user.profile;
  throw new Error('User not found in mock data');
};

export const updateLastLogin = async (_userId: string) => {};

export const signOut = async () => supabase.auth.signOut();

export const resetPassword = async (email: string) => supabase.auth.resetPasswordForEmail(email);

export const updatePassword = async (newPassword: string) => supabase.auth.updateUser({ password: newPassword });

export const auth = supabase.auth;

console.log('🔧 Hybrid auth (backend + mock fallback) loaded');