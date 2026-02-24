import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { RoomsPage } from './pages/rooms/rooms-page';
import { StudentsPage } from './pages/students/students-page';
import { ProfilePage } from './pages/profile/profile-page';
import { ApplicationsPage } from './pages/applications/applications-page';
import { ReportsPage } from './pages/reports/reports-page';
import { EventsPage } from './pages/events/events-page';
import { MessagesPage } from './pages/messages/messages-page';
import { SettingsPage } from './pages/settings/settings-page';
import { LeaveManagementPage } from './pages/leave/leave-management-page';
import { AttendancePage } from './pages/attendance/attendance-page';
import { MaintenancePage } from './pages/maintenance/maintenance-page';
import { VisitorManagementPage } from './pages/visitors/visitor-management-page';
import { StaffPage } from './pages/staff/staff-page';
import { StaffTasksPage } from './pages/staff-tasks/staff-tasks-page';
import { CredentialManagementPage } from './pages/credentials/credential-management-page';
import { StaffStudentView } from './pages/students/staff-student-view';
import { MainLayout } from './components/layout/main-layout';
import { ParentApprovalPage } from './components/parent-approval/parent-approval-page';
import { useAuthStore } from './store/auth-store';
import { useEffect } from 'react';

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
    <BrowserRouter>
      <Routes>
        {/* Public route - Login page */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
        
        {/* Public route - Parent approval page */}
        <Route path="/approve/:approvalCode" element={<ParentApprovalPage />} />
        
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

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;