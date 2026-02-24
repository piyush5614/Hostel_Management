// SUPABASE TEMPORARILY DISABLED FOR DEVELOPMENT
// This file contains mock implementations to replace Supabase functionality
// To re-enable Supabase: uncomment the real implementation and update environment variables

import { User as SupabaseUser } from '@supabase/supabase-js';

// Dynamic credential registry — mock-data registers credentials here so login can use them
// This avoids circular imports (supabase.ts <-> mock-data.ts)
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

export const registerCredentialForLogin = (cred: RegisteredCredential) => {
  // Avoid duplicates
  const idx = credentialRegistry.findIndex(c => c.generatedId === cred.generatedId);
  if (idx === -1) {
    credentialRegistry.push(cred);
  } else {
    Object.assign(credentialRegistry[idx], cred);
  }
};

export const getRegisteredCredentials = () => credentialRegistry;

// Enhanced mock user data for authentication with default test accounts
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

// Mock session storage with enhanced persistence
let currentSession: any = null;

// Enhanced Mock Supabase client implementation
export const supabase = {
  auth: {
    // Enhanced mock sign in with password
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const identifier = email; // Could be email OR generated ID (STAFF-XXXX / STU-XXXX)
      console.log('🔐 Enhanced mock authentication attempt for:', identifier);
      
      // Simulate realistic network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 1. Try matching against built-in demo accounts (by email)
      let user = MOCK_USERS.find(u => u.email === identifier && u.password === password);
      
      // 2. If no match, try matching against generated credentials (by email OR generated ID)
      if (!user) {
        const credential = credentialRegistry.find(
          (c) =>
            c.isActive &&
            (c.email?.toLowerCase() === identifier.toLowerCase() ||
             c.generatedId?.toLowerCase() === identifier.toLowerCase()) &&
            c.generatedPassword === password
        );
        
        if (credential) {
          // Build a user object from the credential.
          // Use credential.userId as the auth id so that after login
          // the user.id stored in auth-store matches the userId field
          // on the corresponding Staff / Student record in mock-data.
          const authId = credential.userId;   // e.g. "staff-1737373737"
          user = {
            id: authId,
            email: credential.email,
            password: credential.generatedPassword,
            user_metadata: { role: credential.role },
            profile: {
              id: authId,           // keeps user.id === profile.id === Staff.userId
              auth_id: authId,
              name: credential.name,
              email: credential.email,
              role: credential.role,
              profile_image: '',
              is_active: true,
              last_login: new Date().toISOString(),
            }
          };
          // Also add to MOCK_USERS so profile lookups work for this session
          MOCK_USERS.push(user);
        }
      }
      
      if (!user) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials. Please check your email/ID and password.' }
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
        factors: []
      };
      
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: mockUser
      };
      
      currentSession = mockSession;
      localStorage.setItem('tc-hostel-enhanced-session', JSON.stringify(mockSession));
      
      console.log('✅ Enhanced mock authentication successful for:', user.email);
      
      return {
        data: { user: mockUser, session: mockSession },
        error: null
      };
    },

    // Enhanced mock get session
    getSession: async () => {
      const stored = localStorage.getItem('tc-hostel-enhanced-session');
      if (stored) {
        try {
          const session = JSON.parse(stored);
          // Check if session is expired
          if (session.expires_at > Date.now()) {
            currentSession = session;
            return { data: { session }, error: null };
          } else {
            localStorage.removeItem('tc-hostel-enhanced-session');
          }
        } catch (error) {
          localStorage.removeItem('tc-hostel-enhanced-session');
        }
      }
      return { data: { session: null }, error: null };
    },

    // Enhanced mock get user
    getUser: async () => {
      if (currentSession?.user) {
        return { data: { user: currentSession.user }, error: null };
      }
      return { data: { user: null }, error: null };
    },

    // Enhanced mock sign out
    signOut: async () => {
      console.log('🚪 Enhanced mock sign out');
      currentSession = null;
      localStorage.removeItem('tc-hostel-enhanced-session');
      return { error: null };
    },

    // Enhanced mock password reset
    resetPasswordForEmail: async (email: string) => {
      console.log('📧 Enhanced mock password reset for:', email);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user = MOCK_USERS.find(u => u.email === email);
      if (!user) {
        return { error: { message: 'No account found with this email address' } };
      }
      
      return { error: null };
    },

    // Enhanced mock update user
    updateUser: async (updates: any) => {
      console.log('👤 Enhanced mock user update:', updates);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { error: null };
    },

    // Enhanced mock auth state change listener
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      console.log('👂 Enhanced mock auth state change listener registered');
      return {
        data: { subscription: { unsubscribe: () => {} } }
      };
    }
  },

  // Enhanced mock database operations
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          console.log(`📊 Enhanced mock query: SELECT ${columns || '*'} FROM ${table} WHERE ${column} = ${value}`);
          
          if (table === 'users') {
            const user = MOCK_USERS.find(u => u.profile.auth_id === value || u.profile.id === value);
            if (user) {
              return { data: user.profile, error: null };
            }
            return { data: null, error: { message: 'User not found' } };
          }
          
          return { data: null, error: { message: 'Mock data not implemented for this table' } };
        }
      })
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => {
          console.log(`📝 Enhanced mock insert into ${table}:`, data);
          return { data: { id: 'mock-id', ...data[0] }, error: null };
        }
      })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: () => ({
          single: async () => {
            console.log(`✏️ Enhanced mock update ${table} WHERE ${column} = ${value}:`, data);
            return { data: { id: value, ...data }, error: null };
          }
        })
      })
    })
  })
};

// Enhanced mock helper functions
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

export const getUserProfile = async (authId: string) => {
  console.log('👤 Enhanced mock getUserProfile for:', authId);
  const user = MOCK_USERS.find(u => u.id === authId);
  if (!user) {
    throw new Error('User profile not found');
  }
  return user.profile;
};

export const createUserProfile = async (authUser: any, additionalData: any = {}) => {
  console.log('📝 Enhanced mock createUserProfile for:', authUser.email);
  const user = MOCK_USERS.find(u => u.id === authUser.id);
  if (user) {
    return user.profile;
  }
  throw new Error('User not found in mock data');
};

export const updateLastLogin = async (userId: string) => {
  console.log('🕒 Enhanced mock updateLastLogin for:', userId);
  // Mock implementation - no actual update needed
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const resetPassword = async (email: string) => {
  return supabase.auth.resetPasswordForEmail(email);
};

export const updatePassword = async (newPassword: string) => {
  return supabase.auth.updateUser({ password: newPassword });
};

export const auth = supabase.auth;

console.log('🔧 Enhanced Supabase mock implementation loaded');