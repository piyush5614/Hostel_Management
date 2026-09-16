import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../store/auth-store', () => ({
  useAuthStore: (selector: (state: { user: object }) => unknown) => selector({
    user: {
      id: 'real-user-id',
      name: 'Real User',
      email: 'real-user@example.com',
      role: 'staff',
      collegeId: 'college-with-no-dashboard-data',
      isActive: true,
    },
  }),
}));

vi.mock('../lib/i18n', () => ({ default: {} }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../utils/use-data-refresh', () => ({ useDataRefresh: () => 0 }));
vi.mock('../store/mock-data', () => ({
  getDashboardStats: () => ({
    totalStudents: 0,
    presentStudents: 0,
    onLeaveStudents: 0,
    occupiedRooms: 0,
    totalRooms: 0,
    pendingApplications: 0,
    pendingMaintenanceRequests: 0,
    todayVisitors: 0,
    activeStaff: 0,
    availableRooms: 0,
    maintenanceRooms: 0,
    recentActivities: [],
  }),
  getRecentActivities: () => [],
  getLinkedStudentId: () => null,
  getLinkedStaffId: () => null,
  mockAttendance: [],
  mockLeaveRequests: [],
  mockStudents: [],
  mockRooms: [],
  mockBeds: [],
  mockStaffTasks: [],
  mockApplications: [],
}));

import { DashboardPage } from '../pages/dashboard';

describe('DashboardPage with a real user profile', () => {
  it('renders an empty-state-capable dashboard instead of an indefinite spinner', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: 'dash.title' })).toBeInTheDocument();
    expect(screen.getByText(/Real User/)).toBeInTheDocument();
    expect(screen.queryByText(/Loading application/i)).not.toBeInTheDocument();
  });
});