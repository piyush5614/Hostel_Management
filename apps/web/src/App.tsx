import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/error-boundary/error-boundary';
import { NotificationProvider } from './lib/notification-context';
import { NotificationHandler } from './components/notifications/notification-handler';
import { useAuthStore } from './store/auth-store';
import { LanguageProvider } from './lib/language-context';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const LoginPage = React.lazy(() => import('./pages/login').then(({ LoginPage }) => ({ default: LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/dashboard').then(({ DashboardPage }) => ({ default: DashboardPage })));
const RoomsPage = React.lazy(() => import('./pages/rooms-page').then(({ RoomsPage }) => ({ default: RoomsPage })));
const StudentsPage = React.lazy(() => import('./pages/students/students-page').then(({ StudentsPage }) => ({ default: StudentsPage })));
const ProfilePage = React.lazy(() => import('./pages/profile-page').then(({ ProfilePage }) => ({ default: ProfilePage })));
const ApplicationsPage = React.lazy(() => import('./pages/applications-page').then(({ ApplicationsPage }) => ({ default: ApplicationsPage })));
const ReportsPage = React.lazy(() => import('./pages/reports-page').then(({ ReportsPage }) => ({ default: ReportsPage })));
const EventsPage = React.lazy(() => import('./pages/events-page').then(({ EventsPage }) => ({ default: EventsPage })));
const MessagesPage = React.lazy(() => import('./pages/messages-page').then(({ MessagesPage }) => ({ default: MessagesPage })));
const SettingsPage = React.lazy(() => import('./pages/settings-page').then(({ SettingsPage }) => ({ default: SettingsPage })));
const LeaveManagementPage = React.lazy(() => import('./pages/leave-management-page').then(({ LeaveManagementPage }) => ({ default: LeaveManagementPage })));
const AttendancePage = React.lazy(() => import('./pages/attendance-page').then(({ AttendancePage }) => ({ default: AttendancePage })));
const MaintenancePage = React.lazy(() => import('./pages/maintenance-page').then(({ MaintenancePage }) => ({ default: MaintenancePage })));
const VisitorManagementPage = React.lazy(() => import('./pages/visitor-management-page').then(({ VisitorManagementPage }) => ({ default: VisitorManagementPage })));
const StaffPage = React.lazy(() => import('./pages/staff-page').then(({ StaffPage }) => ({ default: StaffPage })));
const StaffTasksPage = React.lazy(() => import('./pages/staff-tasks-page').then(({ StaffTasksPage }) => ({ default: StaffTasksPage })));
const CredentialManagementPage = React.lazy(() => import('./pages/credential-management-page').then(({ CredentialManagementPage }) => ({ default: CredentialManagementPage })));
const QRScannerPage = React.lazy(() => import('./pages/qr-scanner-page').then(({ QRScannerPage }) => ({ default: QRScannerPage })));
const StaffStudentView = React.lazy(() => import('./pages/students/staff-student-view').then(({ StaffStudentView }) => ({ default: StaffStudentView })));
const ActivityFeedPage = React.lazy(() => import('./pages/activity-feed').then(({ ActivityFeedPage }) => ({ default: ActivityFeedPage })));
const MainLayout = React.lazy(() => import('./components/layout/main-layout').then(({ MainLayout }) => ({ default: MainLayout })));
const ParentApprovalPage = React.lazy(() => import('./components/parent-approval/parent-approval-page').then(({ ParentApprovalPage }) => ({ default: ParentApprovalPage })));
const TaskStartPage = React.lazy(() => import('./pages/task-start-page').then(({ TaskStartPage }) => ({ default: TaskStartPage })));
const GateScannerPage = React.lazy(() => import('./pages/gate-scanner-page').then(({ GateScannerPage }) => ({ default: GateScannerPage })));
const CurrentlyOutPage = React.lazy(() => import('./pages/currently-out-page').then(({ CurrentlyOutPage }) => ({ default: CurrentlyOutPage })));
const MovementLogPage = React.lazy(() => import('./pages/movement-log-page').then(({ MovementLogPage }) => ({ default: MovementLogPage })));

// Create query client instance (outside component to prevent recreation)
const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const logout = useAuthStore((state) => state.logout);
  
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

  if (!useAuthStore.getState().user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Your profile could not be loaded</h1>
          <p className="text-muted-foreground">The account is authenticated, but its profile data is incomplete.</p>
          <button className="rounded-md bg-primary-600 px-4 py-2 text-white" onClick={() => void logout()}>
            Sign out and return to login
          </button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

const GateStaffRoute = ({ children }: { children: React.ReactNode }) => {
  const role = useAuthStore((state) => state.user?.role);
  if (!role || !['admin', 'warden', 'staff'].includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  const { user, isAuthenticated, logout, initialize, isInitializing } = useAuthStore();
  
  useEffect(() => {
    // Initialize authentication on app start
    initialize();
  }, []);
  
  // Show loading screen during initial authentication check
  if (isInitializing) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading application...</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <BrowserRouter>
            <NotificationHandler />
            <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading page...</div>}>
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
                <Route path="gate/scan" element={<GateStaffRoute><GateScannerPage /></GateStaffRoute>} />
                <Route path="gate/currently-out" element={<GateStaffRoute><CurrentlyOutPage /></GateStaffRoute>} />
                <Route path="gate/movements" element={<GateStaffRoute><MovementLogPage /></GateStaffRoute>} />
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
            </React.Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </NotificationProvider>
    </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;