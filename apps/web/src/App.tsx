import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { RoomsPage } from './pages/rooms-page';
import { StudentsPage } from './pages/students/students-page';
import { ProfilePage } from './pages/profile-page';
import { ApplicationsPage } from './pages/applications-page';
import { ReportsPage } from './pages/reports-page';
import { EventsPage } from './pages/events-page';
import { MessagesPage } from './pages/messages-page';
import { SettingsPage } from './pages/settings-page';
import { LeaveManagementPage } from './pages/leave-management-page';
import { AttendancePage } from './pages/attendance-page';
import { MaintenancePage } from './pages/maintenance-page';
import { VisitorManagementPage } from './pages/visitor-management-page';
import { StaffPage } from './pages/staff-page';
import { StaffTasksPage } from './pages/staff-tasks-page';
import { CredentialManagementPage } from './pages/credential-management-page';
import { QRScannerPage } from './pages/qr-scanner-page';
import { StaffStudentView } from './pages/students/staff-student-view';
import { ActivityFeedPage } from './pages/activity-feed';
import { MainLayout } from './components/layout/main-layout';
import { ParentApprovalPage } from './components/parent-approval/parent-approval-page';
import { TaskStartPage } from './pages/task-start-page';
import { ErrorBoundary } from './components/error-boundary/error-boundary';
import { NotificationProvider } from './lib/notification-context';
import { NotificationHandler } from './components/notifications/notification-handler';
import { useAuthStore } from './store/auth-store';
import { LanguageProvider } from './lib/language-context';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create query client instance (outside component to prevent recreation)
const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }
  
  // If there's an authentication error, redirect to login
  if (error && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { user, isAuthenticated, logout, initialize, isLoading } = useAuthStore();
  
  useEffect(() => {
    // Initialize authentication on app start
    initialize();
  }, []);
  
  // Show loading screen during initial authentication check
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <BrowserRouter>
            <NotificationHandler />
            <Routes>
              {/* Public route - Login page */}
              <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
              
              {/* Public route - Parent approval page */}
              <Route path="/approve/:approvalCode" element={<ParentApprovalPage />} />
              
              {/* Public route - Auto-login from email task notification */}
              <Route path="/task-start" element={<TaskStartPage />} />
              
              {/* Protected routes - Main application */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout user={user!} onLogout={logout} />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="leave" element={<LeaveManagementPage />} />
                <Route path="scan" element={<QRScannerPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="maintenance" element={<MaintenancePage />} />
                <Route path="visitors" element={<VisitorManagementPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="staff/dashboard" element={<StaffPage />} />
                <Route path="staff/students" element={<StaffStudentView />} />
                <Route path="staff-tasks" element={<StaffTasksPage />} />
                <Route path="credentials" element={<CredentialManagementPage />} />
                <Route path="activity" element={<ActivityFeedPage />} />

                {/* Catch-all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </NotificationProvider>
    </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;