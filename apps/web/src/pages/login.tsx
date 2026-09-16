import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Modal } from '../components/ui/modal';
import { School, AlertCircle, Eye, EyeOff, Mail, Sparkles, Zap, Shield, Building2, Users, Star, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { toast } from 'sonner';
import { ErrorBoundary, LoadingState } from '../components/error-boundary/error-boundary';

export function LoginPage() {
  const navigate = useNavigate();
  const { 
    login, 
    resetPassword, 
    isLoading, 
    error, 
    clearError, 
    isAuthenticated 
  } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Password reset state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Form validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when user starts typing
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password, clearError]);

  // Validate email format
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  // Check if input is a generated ID (STAFF-XXXX or STU-XXXX)
  const isGeneratedId = (value: string): boolean => {
    return /^(STAFF|STU)-\d{4,}$/i.test(value.trim());
  };

  // Handle form validation
  const validateForm = (): boolean => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPasswordError('');

    // Validate email or generated ID
    if (!email.trim()) {
      setEmailError('Email or Staff/Student ID is required');
      isValid = false;
    } else if (!validateEmail(email.trim()) && !isGeneratedId(email.trim())) {
      setEmailError('Please enter a valid email or ID (e.g. STAFF-0001, STU-0001)');
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters long');
      isValid = false;
    }

    return isValid;
  };

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    clearError();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Pass the identifier as-is — could be email or generated ID
      const identifier = email.trim();
      await login(
        isGeneratedId(identifier) ? identifier.toUpperCase() : identifier.toLowerCase(),
        password
      );
      toast.success('Login successful! Welcome back.');
      // Navigation is handled by the useEffect hook above
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Login failed. Please try again.');
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!validateEmail(resetEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsResetting(true);
      await resetPassword(resetEmail.trim().toLowerCase());
      toast.success('Password reset email sent! Check your inbox.');
      setIsResetModalOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Password reset failed:', error);
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setIsResetting(false);
    }
  };

  // Enhanced demo login shortcuts with new passwords
  const handleDemoLogin = async (role: 'admin' | 'warden' | 'staff' | 'student') => {
    const credentials: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@tchostel.edu', password: 'admin123' },
      warden: { email: 'warden@tchostel.edu', password: 'warden123' },
      staff: { email: 'staff@tchostel.edu', password: 'staff123' },
      student: { email: 'student@tchostel.edu', password: 'student123' },
    };
    
    const { email: demoEmail, password: demoPassword } = credentials[role];
    
    setEmail(demoEmail);
    setPassword(demoPassword);
    
    // Clear any existing errors
    setEmailError('');
    setPasswordError('');
    clearError();

    // Auto-submit after a brief delay for better UX
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any);
    }
  };

  return (
    <ErrorBoundary>
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4 dark:from-primary-900/20 dark:via-background dark:to-secondary-900/20 relative overflow-hidden">
      {/* Enhanced background decoration with animations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-primary-200 to-primary-300 opacity-30 blur-3xl animate-pulse-soft"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-secondary-200 to-secondary-300 opacity-30 blur-3xl animate-pulse-soft"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 opacity-20 blur-3xl"></div>
      </div>

      <Card className="relative w-full max-w-md overflow-hidden shadow-2xl backdrop-blur-sm border-0 bg-white/95 dark:bg-card/95 card-hover-effect">
        {/* Enhanced header with premium design */}
        <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="absolute inset-0 bg-pattern-dots opacity-30"></div>
          
          <div className="relative flex items-center justify-center">
            <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm border border-white/30 shadow-xl">
              <School className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <CardHeader className="relative p-0 pt-6 text-center">
            <CardTitle className="text-3xl font-bold text-white mb-2 animate-gradient">
              TC Hostel Connect
            </CardTitle>
            <CardDescription className="text-primary-100 text-lg font-medium">
              Modern Hostel Management System
            </CardDescription>
            <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-primary-200">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="font-medium">Enhanced Development Environment</span>
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
          </CardHeader>
        </div>

        {/* Enhanced login form with premium styling */}
        <CardContent className="p-8 bg-gradient-to-b from-white to-gray-50/50 dark:from-card dark:to-card/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Enhanced email input */}
            <div className="space-y-2">
              <Input
                label="Email Address or Staff/Student ID"
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Email or ID (e.g. STAFF-0001)"
                error={emailError}
                disabled={isLoading}
                autoComplete="email"
                required
                className="transition-all duration-300 focus:scale-[1.02] hover:shadow-lg"
              />
              {isGeneratedId(email) && (
                <div className="flex items-center gap-1.5 text-xs text-primary-600 mt-1">
                  <KeyRound className="h-3 w-3" />
                  <span>Signing in with Generated ID</span>
                </div>
              )}
            </div>

            {/* Enhanced password input */}
            <div className="relative space-y-2">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your password"
                error={passwordError}
                disabled={isLoading}
                autoComplete="current-password"
                required
                className="transition-all duration-300 focus:scale-[1.02] hover:shadow-lg"
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Enhanced remember me & forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-all duration-200 group-hover:scale-110"
                />
                <span className="group-hover:text-primary-600 transition-colors">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                disabled={isLoading}
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline transition-all duration-200 hover:scale-105 font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Enhanced error display */}
            {error && (
              <div className="rounded-xl bg-gradient-to-r from-error-50 to-error-100 border border-error-200 p-4 dark:from-error-900/20 dark:to-error-800/20 dark:border-error-800 shadow-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0 animate-pulse" />
                  <p className="ml-3 text-sm text-error-700 dark:text-error-300 font-medium">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced login button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 transform transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-2xl btn-textured relative overflow-hidden group"
              isLoading={isLoading}
              disabled={isLoading || !email.trim() || !password}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {isLoading ? (
                <div className="flex items-center relative z-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  <span className="animate-pulse">Signing in...</span>
                </div>
              ) : (
                <span className="relative z-10 flex items-center justify-center">
                  <Zap className="mr-2 h-5 w-5" />
                  Sign In to Dashboard
                </span>
              )}
            </Button>
          </form>

          {/* Demo account controls are temporarily hidden. */}
          {/*
            <div className="mt-8">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg btn-textured border-2 hover:border-primary-300"
              >
                <div className="flex items-center relative z-10">
                  <Shield className="mr-2 h-4 w-4 text-primary-600 group-hover:text-primary-700 transition-colors" />
                  <div className="text-left">
                    <div className="text-xs font-bold">Admin</div>
                    <div className="text-xs text-muted-foreground">admin123</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => handleDemoLogin('warden')}
                disabled={isLoading}
                className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg btn-textured border-2 hover:border-secondary-300"
              >
                <div className="flex items-center relative z-10">
                  <Building2 className="mr-2 h-4 w-4 text-secondary-600 group-hover:text-secondary-700 transition-colors" />
                  <div className="text-left">
                    <div className="text-xs font-bold">Warden</div>
                    <div className="text-xs text-muted-foreground">warden123</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-secondary-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => handleDemoLogin('staff')}
                disabled={isLoading}
                className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg btn-textured border-2 hover:border-success-300"
              >
                <div className="flex items-center relative z-10">
                  <Users className="mr-2 h-4 w-4 text-success-600 group-hover:text-success-700 transition-colors" />
                  <div className="text-left">
                    <div className="text-xs font-bold">Staff</div>
                    <div className="text-xs text-muted-foreground">staff123</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-success-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => handleDemoLogin('student')}
                disabled={isLoading}
                className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg btn-textured border-2 hover:border-warning-300"
              >
                <div className="flex items-center relative z-10">
                  <School className="mr-2 h-4 w-4 text-warning-600 group-hover:text-warning-700 transition-colors" />
                  <div className="text-left">
                    <div className="text-xs font-bold">Student</div>
                    <div className="text-xs text-muted-foreground">student123</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-warning-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Button>
            </div>
            
            <div className="mt-6 rounded-xl bg-gradient-to-r from-primary-50 via-white to-secondary-50 p-4 dark:from-primary-900/20 dark:via-card dark:to-secondary-900/20 border border-primary-200 dark:border-primary-800 shadow-lg">
              <div className="text-center text-sm text-muted-foreground">
                <div className="flex items-center justify-center mb-2">
                  <Star className="h-4 w-4 mr-2 text-primary-600 animate-pulse" />
                  <span className="font-bold text-primary-700 dark:text-primary-300">Enhanced Demo Mode</span>
                  <Star className="h-4 w-4 ml-2 text-primary-600 animate-pulse" />
                </div>
                <p className="text-xs leading-relaxed">
                  Click any demo account button for instant access.<br />
                  <span className="font-mono bg-white/70 px-2 py-1 rounded-md dark:bg-black/30 text-primary-700 dark:text-primary-300">
                    New secure passwords implemented
                  </span>
                </p>
              </div>
            </div>
          */}

          {/* Enhanced help section */}
          <div className="mt-8 text-center">
            <div className="rounded-xl bg-gradient-to-r from-muted/30 to-muted/50 p-4 border border-muted shadow-lg">
              <div className="flex items-center justify-center mb-2">
                <Mail className="h-4 w-4 mr-2 text-primary-600" />
                <span className="font-semibold text-sm">Need Assistance?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Technical Support:{' '}
                <a 
                  href="mailto:support@tchostel.edu" 
                  className="text-primary-600 hover:text-primary-700 hover:underline font-semibold transition-all duration-200 hover:scale-105 inline-block"
                >
                  support@tchostel.edu
                </a>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                🕒 Available 24/7 • 📞 Emergency: +91-9876543210
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced password reset modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setResetEmail('');
        }}
        title="Reset Your Password"
        size="sm"
      >
        <form onSubmit={handlePasswordReset} className="space-y-6">
          <div className="rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 p-4 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800">
            <div className="flex items-start">
              <Mail className="h-6 w-6 text-primary-600 mt-0.5 flex-shrink-0" />
              <div className="ml-3">
                <h4 className="text-sm font-bold text-primary-800 dark:text-primary-200 mb-1">
                  Password Reset Instructions
                </h4>
                <p className="text-sm text-primary-700 dark:text-primary-300 leading-relaxed">
                  Enter your email address and we'll send you a secure link to reset your password. 
                  The link will expire in 24 hours for security.
                </p>
              </div>
            </div>
          </div>
          
          <Input
            label="Email Address"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Enter your registered email"
            disabled={isResetting}
            autoComplete="email"
            required
            className="transition-all duration-300 focus:scale-[1.02] hover:shadow-lg"
          />
          
          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsResetModalOpen(false);
                setResetEmail('');
              }}
              disabled={isResetting}
              className="transition-all duration-200 hover:scale-[1.02]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={isResetting}
              disabled={isResetting || !resetEmail.trim()}
              className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl btn-textured"
            >
              <Mail className="mr-2 h-4 w-4" />
              {isResetting ? 'Sending Reset Link...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
    </ErrorBoundary>
  );
}