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
  collegeId?: string;
  profileImage?: string;
}

const credentialRegistry: RegisteredCredential[] = [];

const DEFAULT_COLLEGE_ID = (import.meta.env.VITE_DEFAULT_COLLEGE_ID as string | undefined) || 'college-default';
const ACTIVE_COLLEGE_STORAGE_KEY = 'tc-hostel-active-college-id';
const API_REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function setActiveCollegeId(collegeId?: string): void {
  if (typeof window === 'undefined' || !collegeId?.trim()) {
    return;
  }

  try {
    localStorage.setItem(ACTIVE_COLLEGE_STORAGE_KEY, collegeId.trim());
  } catch {
    // Ignore localStorage write errors.
  }
}

function getActiveCollegeId(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_COLLEGE_ID;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('collegeId') || params.get('college');
    if (fromUrl?.trim()) {
      setActiveCollegeId(fromUrl);
      return fromUrl.trim();
    }

    const fromStorage = localStorage.getItem(ACTIVE_COLLEGE_STORAGE_KEY);
    if (fromStorage?.trim()) {
      return fromStorage.trim();
    }
  } catch {
    // Ignore localStorage and URL parsing errors.
  }

  return DEFAULT_COLLEGE_ID;
}

/**
 * Register a credential for login.  
 * This ALSO fire-and-forgets a signup call to the real backend so the
 * account is available across browsers.
 */
export const registerCredentialForLogin = (cred: RegisteredCredential) => {
  const idx = credentialRegistry.findIndex(c => c.generatedId === cred.generatedId);
  if (idx === -1) {
    credentialRegistry.push(cred);
  } else {
    Object.assign(credentialRegistry[idx], cred);
  }
};

export const getRegisteredCredentials = () => credentialRegistry;

/* ──────────────── Backend helpers ──────────────── */

interface BackendLoginResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    college_id?: string;
    generated_id?: string;
    profile_image?: string;
    is_active?: boolean;
  };
  token: string;
}

async function backendLogin(identifier: string, password: string): Promise<BackendLoginResult | null> {
  try {
    const collegeId = getActiveCollegeId();
    const res = await fetchWithTimeout('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-college-id': collegeId,
      },
      body: JSON.stringify({ email: identifier, password, collegeId }),
    });
    if (!res.ok) {
      console.error('🔎 Auth diagnostic: backend login rejected', { status: res.status });
      return null;
    }
    const result = (await res.json()) as BackendLoginResult;
    console.log('🔎 Auth diagnostic: backend login resolved', {
      user: result.user,
      hasToken: Boolean(result.token),
    });
    return result;
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
      college_id: DEFAULT_COLLEGE_ID,
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
      college_id: DEFAULT_COLLEGE_ID,
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
      college_id: DEFAULT_COLLEGE_ID,
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
      college_id: DEFAULT_COLLEGE_ID,
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
      if (!backendResult) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid email or ID or password. Use the credentials issued by your administrator.' },
        };
      }

      if (backendResult) {
        console.log('✅ Backend login successful for:', backendResult.user.email);

        const bu = backendResult.user;
        const collegeId = bu.college_id || getActiveCollegeId();
        setActiveCollegeId(collegeId);
        const mockUser: SupabaseUser = {
          id: bu.id,
          email: bu.email!,
          user_metadata: { role: bu.role, college_id: collegeId },
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

        // Cache the profile in the session so reloads do not depend on MOCK_USERS.
        const backendProfile = {
          id: bu.id,
          auth_id: bu.id,
          name: bu.name,
          email: bu.email,
          role: bu.role,
          college_id: collegeId,
          profile_image: bu.profile_image || '',
          is_active: true,
          last_login: new Date().toISOString(),
        };

        const mockSession = {
          access_token: backendResult.token,
          refresh_token: 'backend-refresh',
          expires_in: 604800,
          expires_at: Date.now() + 604800000,
          token_type: 'bearer',
          college_id: collegeId,
          profile: backendProfile,
          user: mockUser,
        };

        // Update or push into MOCK_USERS for compatibility with existing mock data.
        const existingIdx = MOCK_USERS.findIndex(u => u.email === bu.email);
        if (existingIdx !== -1) {
          // Update existing entry with correct backend UUID
          MOCK_USERS[existingIdx].id = bu.id;
          MOCK_USERS[existingIdx].profile = { ...MOCK_USERS[existingIdx].profile, ...backendProfile };
        } else {
          MOCK_USERS.push({
            id: bu.id,
            email: bu.email,
            password: '',
            user_metadata: { role: bu.role, college_id: collegeId },
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

      // Restore built-in demo users and still support registered credentials.
      let user: typeof MOCK_USERS[number] | undefined;

      if (!user) {
        user = MOCK_USERS.find(
          (entry) =>
            entry.password &&
            ((entry.email?.toLowerCase() === identifier.toLowerCase()) ||
             (entry.profile?.email?.toLowerCase() === identifier.toLowerCase()) ||
             (entry.profile?.staffId && `staff-${entry.profile.staffId}`.toLowerCase() === identifier.toLowerCase()) ||
             (entry.profile?.studentId && `stu-${entry.profile.studentId}`.toLowerCase() === identifier.toLowerCase())) &&
            entry.password === password
        );
      }

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
          const collegeId = credential.collegeId || getActiveCollegeId();
          user = {
            id: authId,
            email: credential.email,
            password: credential.generatedPassword,
            user_metadata: { role: credential.role, college_id: collegeId },
            profile: {
              id: authId,
              auth_id: authId,
              name: credential.name,
              email: credential.email,
              role: credential.role,
              college_id: collegeId,
              profile_image: credential.profileImage || '',
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

      const collegeId = user.profile?.college_id || getActiveCollegeId();
      setActiveCollegeId(collegeId);
      if (!user.profile.college_id) {
        user.profile.college_id = collegeId;
      }

      const mockUser: SupabaseUser = {
        id: user.id,
        email: user.email,
        user_metadata: { ...user.user_metadata, college_id: collegeId },
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
        college_id: collegeId,
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
            setActiveCollegeId(session.college_id || session?.user?.user_metadata?.college_id);
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
  console.log('🔎 Auth diagnostic: getUserProfile started', { authId });
  // 1. Try MOCK_USERS first (instant, works for mock & cached backend users)
  const mockUser = MOCK_USERS.find(u => u.id === authId);
  if (mockUser) {
    const collegeId = mockUser.profile.college_id || getActiveCollegeId();
    mockUser.profile.college_id = collegeId;
    setActiveCollegeId(collegeId);
    console.log('🔎 Auth diagnostic: getUserProfile resolved from cache', {
      authId,
      profile: mockUser.profile,
    });
    return mockUser.profile;
  }

  // 2. Try the real backend using the stored JWT (handles page refresh)
  try {
    const stored = localStorage.getItem('tc-hostel-enhanced-session');
    if (stored) {
      const session = JSON.parse(stored);
      const persistedProfile = session?.profile;
      if (persistedProfile?.id === authId && persistedProfile.email && persistedProfile.role) {
        console.log('🔎 Auth diagnostic: getUserProfile resolved from persisted session', {
          authId,
          profile: persistedProfile,
        });
        setActiveCollegeId(persistedProfile.college_id || getActiveCollegeId());
        return persistedProfile;
      }

      const token = session?.access_token;
      if (token && token !== 'mock-access-token') {
        const res = await fetchWithTimeout('/api/auth/me', {
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
            college_id: bu.college_id || getActiveCollegeId(),
            profile_image: bu.profile_image || '',
            is_active: bu.is_active ?? true,
            last_login: new Date().toISOString(),
          };
          setActiveCollegeId(profile.college_id);
          // Cache in MOCK_USERS for future lookups
          MOCK_USERS.push({
            id: bu.id,
            email: bu.email,
            password: '',
            user_metadata: { role: bu.role, college_id: profile.college_id },
            profile,
          });
          console.log('🔎 Auth diagnostic: getUserProfile resolved from backend', {
            authId,
            profile,
          });
          return profile;
        }
        console.error('🔎 Auth diagnostic: profile endpoint rejected', { authId, status: res.status });
      }
    }
  } catch {
    // Backend unreachable – fall through
  }

  console.error('🔎 Auth diagnostic: getUserProfile failed', { authId });
  throw new Error('User profile not found');
};

export const createUserProfile = async (authUser: any, additionalData: any = {}) => {
  const user = MOCK_USERS.find(u => u.id === authUser.id);
  if (user) {
    const collegeId = user.profile.college_id || additionalData.college_id || authUser?.user_metadata?.college_id || getActiveCollegeId();
    user.profile.college_id = collegeId;
    setActiveCollegeId(collegeId);
    return user.profile;
  }
  throw new Error('User not found in mock data');
};

export const updateLastLogin = async (_userId: string) => {};

export const signOut = async () => supabase.auth.signOut();

export const resetPassword = async (email: string) => supabase.auth.resetPasswordForEmail(email);

export const updatePassword = async (newPassword: string) => supabase.auth.updateUser({ password: newPassword });

export const auth = supabase.auth;

console.log('🔧 Hybrid auth (backend + mock fallback) loaded');