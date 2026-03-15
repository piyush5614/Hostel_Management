import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  supabase, 
  getCurrentUser, 
  getUserProfile, 
  createUserProfile, 
  updateLastLogin,
  signOut as supabaseSignOut
} from '../lib/supabase';
import { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false, // Start with false for better UX
      error: null,

      clearError: () => set({ error: null }),

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Enhanced input validation
          if (!email?.trim() || !password?.trim()) {
            throw new Error('Email/ID and password are required');
          }

          // Allow email OR generated ID format (STAFF-XXXX, STU-XXXX)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const idRegex = /^(STAFF|STU)-\d{4,}$/i;
          if (!emailRegex.test(email.trim()) && !idRegex.test(email.trim())) {
            throw new Error('Please enter a valid email address or ID (e.g. STAFF-0001)');
          }

          if (password.length < 4) {
            throw new Error('Password must be at least 4 characters long');
          }

          console.log('🔐 Attempting login for:', email.trim());
          
          // Authenticate with mock Supabase — pass identifier as-is (could be email or ID)
          const identifier = email.trim();
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: identifier,
            password: password,
          });

          if (authError) {
            console.error('❌ Authentication failed:', authError);
            
            // User-friendly error messages
            let errorMessage = 'Login failed. Please try again.';
            
            if (authError.message.includes('Invalid login credentials')) {
              errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            } else if (authError.message.includes('Email not confirmed')) {
              errorMessage = 'Please check your email and click the confirmation link before logging in.';
            } else if (authError.message.includes('Too many requests')) {
              errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
            } else if (authError.message.includes('Network')) {
              errorMessage = 'Network error. Please check your internet connection and try again.';
            }
            
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          if (!authData.user) {
            const errorMessage = 'Authentication failed - no user data received';
            set({ error: errorMessage, isLoading: false });
            throw new Error(errorMessage);
          }

          console.log('✅ Authentication successful for:', authData.user.email);

          // Get user profile (mock implementation)
          let userProfile;
          try {
            userProfile = await getUserProfile(authData.user.id);
            console.log('✅ User profile found:', userProfile.email);
          } catch (profileError: any) {
            console.log('📝 User profile not found, creating new profile...');
            
            try {
              userProfile = await createUserProfile(authData.user, {
                role: authData.user.user_metadata?.role || 'student'
              });
              console.log('✅ User profile created successfully');
            } catch (createError: any) {
              console.error('❌ Failed to create user profile:', createError);
              const errorMessage = 'Failed to create user profile. Please contact support.';
              set({ error: errorMessage, isLoading: false });
              throw new Error(errorMessage);
            }
          }

          // Update last login (mock)
          try {
            await updateLastLogin(userProfile.id);
          } catch (updateError) {
            console.warn('⚠️ Failed to update last login (non-critical):', updateError);
          }

          // Create user object
          const user: User = {
            id: userProfile.id,
            name: userProfile.name,
            email: userProfile.email,
            role: userProfile.role as UserRole,
            collegeId: userProfile.college_id,
            profileImage: userProfile.profile_image,
            isActive: userProfile.is_active || true,
            lastLogin: userProfile.last_login,
          };

          console.log('✅ Login successful for user:', user.name, 'Role:', user.role);
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false, 
            error: null 
          });
          
          return user;
        } catch (error: any) {
          console.error('❌ Login error:', error);
          
          const errorMessage = error.message || 'An unexpected error occurred during login';
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: errorMessage 
          });
          
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true, error: null });
          console.log('🚪 Logging out user...');
          
          await supabaseSignOut();
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: null 
          });
          
          console.log('✅ Logout successful');
        } catch (error: any) {
          console.error('❌ Logout error:', error);
          
          // Force logout even if there's an error
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: null 
          });
        }
      },

      initialize: async () => {
        try {
          set({ isLoading: true, error: null });
          console.log('🔄 Initializing authentication...');
          
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Session initialization error:', error);
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false, 
              error: null 
            });
            return;
          }

          if (session?.user) {
            console.log('✅ Active session found for:', session.user.email);
            
            try {
              const userProfile = await getUserProfile(session.user.id);
              
              const user: User = {
                id: userProfile.id,
                name: userProfile.name,
                email: userProfile.email,
                role: userProfile.role as UserRole,
                collegeId: userProfile.college_id,
                profileImage: userProfile.profile_image,
                isActive: userProfile.is_active || true,
                lastLogin: userProfile.last_login,
              };
              
              set({ 
                user, 
                isAuthenticated: true, 
                isLoading: false, 
                error: null 
              });
              
              console.log('✅ Authentication initialized for:', user.name);
            } catch (profileError: any) {
              console.error('❌ Failed to load user profile during initialization:', profileError);
              
              // If Zustand already has a persisted user, keep using it
              const persisted = get().user;
              if (persisted && persisted.id) {
                console.log('ℹ️ Using persisted user from Zustand:', persisted.name);
                set({ isAuthenticated: true, isLoading: false, error: null });
              } else {
                // No persisted data either – sign out
                await supabaseSignOut();
                set({ 
                  user: null, 
                  isAuthenticated: false, 
                  isLoading: false, 
                  error: null 
                });
              }
            }
          } else {
            console.log('ℹ️ No active session found');
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false, 
              error: null 
            });
          }
        } catch (error: any) {
          console.error('❌ Authentication initialization error:', error);
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: null 
          });
        }
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });
          console.log('✅ User updated:', updatedUser.name);
        }
      },

      resetPassword: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          
          if (!email?.trim() || !email.includes('@')) {
            throw new Error('Please enter a valid email address');
          }

          const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

          if (error) {
            console.error('❌ Password reset error:', error);
            throw error;
          }

          set({ isLoading: false, error: null });
          console.log('✅ Password reset email sent to:', email);
        } catch (error: any) {
          console.error('❌ Password reset failed:', error);
          const errorMessage = error.message || 'Failed to send password reset email';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      updatePassword: async (newPassword: string) => {
        try {
          set({ isLoading: true, error: null });
          
          if (!newPassword || newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters long');
          }

          const { error } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (error) {
            console.error('❌ Password update error:', error);
            throw error;
          }

          set({ isLoading: false, error: null });
          console.log('✅ Password updated successfully');
        } catch (error: any) {
          console.error('❌ Password update failed:', error);
          const errorMessage = error.message || 'Failed to update password';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },
    }),
    {
      name: 'tc-hostel-auth',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Mock auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Mock auth state changed:', event);

  (async () => {
    const { initialize } = useAuthStore.getState();

    try {
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in, reinitializing...');
        await initialize();
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out, clearing state...');
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('❌ Error handling auth state change:', error);
    }
  })();
});