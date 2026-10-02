// Backend-backed auth adapter for the existing auth store.
// Backend runs on /api (proxied via Vite in dev)

import { User as SupabaseUser } from '@supabase/supabase-js';

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

        // Cache the backend profile so reloads do not depend on another request.
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

        currentSession = mockSession;
        localStorage.setItem('tc-hostel-enhanced-session', JSON.stringify(mockSession));

        return { data: { user: mockUser, session: mockSession }, error: null };
      }

      return {
        data: { user: null, session: null },
        error: { message: 'Invalid email or ID or password. Use the credentials issued by your administrator.' },
      };
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
      console.log('📧 Password reset requested for:', email);
      return { error: { message: 'Password reset must be handled by your administrator.' } };
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
  // Use the profile saved with the backend-issued session first. It contains
  // the authoritative role returned by the API and supports reloads.
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
  void authUser;
  void additionalData;
  throw new Error('A matching application profile is required. Ask an administrator to provision this account.');
};

export const updateLastLogin = async (_userId: string) => {};

export const signOut = async () => supabase.auth.signOut();

export const resetPassword = async (email: string) => supabase.auth.resetPasswordForEmail(email);

export const updatePassword = async (newPassword: string) => supabase.auth.updateUser({ password: newPassword });

export const auth = supabase.auth;

console.log('🔧 Hybrid auth (backend + mock fallback) loaded');