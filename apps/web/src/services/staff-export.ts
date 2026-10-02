import { Staff, StaffTask } from '../types';
import { mockStaff, mockStaffTasks } from '../store/mock-data';
import { formatDate } from '../lib/utils';

// ============================================================
// Staff Export Functions
// ============================================================

export function exportStaffToCSV(staffList: Staff[]): string {
  const headers = [
    'Employee ID', 'Name', 'Email', 'Position', 'Department',
    'Contact Number', 'Shift Timing', 'Joining Date', 'Status',
    'Address', 'Emergency Contact', 'Qualifications',
  ];

  const rows = staffList.map(s => [
    s.employeeId,
    s.name,
    s.email,
    s.position,
    s.department,
    s.contactNumber,
    s.shiftTiming,
    formatDate(s.joiningDate),
    s.isActive ? 'Active' : 'Inactive',
    `"${s.address}"`,
    s.emergencyContact || '',
    s.qualifications || '',
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function exportTasksToCSV(tasks: StaffTask[]): string {
  const headers = [
    'Task ID', 'Title', 'Description', 'Priority', 'Status',
    'Category', 'Assigned To', 'Due Date', 'Created',
    'Est. Hours', 'Actual Hours', 'Completed At',
  ];

  const rows = tasks.map(t => {
    const staff = mockStaff.find(s => s.id === t.assignedTo);
    return [
      t.id,
      `"${t.title}"`,
      `"${t.description}"`,
      t.priority,
      t.status,
      t.category,
      staff?.name || t.assignedTo,
      formatDate(t.dueDate),
      formatDate(t.createdAt),
      t.estimatedHours || '',
      t.actualHours || '',
      t.completedAt ? formatDate(t.completedAt) : '',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Staff Import from CSV
// ============================================================

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function parseStaffCSV(csvContent: string): ImportResult {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { success: 0, failed: 0, errors: ['CSV file is empty or has only headers'] };
  }
  return {
    success: 0,
    failed: lines.length - 1,
    errors: ['CSV account import is disabled. Create each account through the Admin form so credentials are provisioned securely.'],
  };
}

// ============================================================
// Staff Performance Analytics
// ============================================================

export interface StaffPerformance {
  staffId: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  cancelledTasks: number;
  completionRate: number;
  averageCompletionHours: number;
  overdueCount: number;
  onTimeRate: number;
}

export function getStaffPerformanceAnalytics(): StaffPerformance[] {
  return mockStaff.filter(s => s.isActive).map(staff => {
    const tasks = mockStaffTasks.filter(t => t.assignedTo === staff.id);
    const completed = tasks.filter(t => t.status === 'completed');
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
    const cancelled = tasks.filter(t => t.status === 'cancelled');
    
    const overdue = tasks.filter(t => 
      t.status !== 'completed' && t.status !== 'cancelled' && 
      new Date(t.dueDate) < new Date()
    );

    const onTime = completed.filter(t => 
      t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate)
    );

    const avgHours = completed.length > 0
      ? completed.reduce((sum, t) => sum + (t.actualHours || t.estimatedHours || 0), 0) / completed.length
      : 0;

    return {
      staffId: staff.id,
      name: staff.name,
      totalTasks: tasks.length,
      completedTasks: completed.length,
      pendingTasks: pending.length,
      cancelledTasks: cancelled.length,
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      averageCompletionHours: Math.round(avgHours * 10) / 10,
      overdueCount: overdue.length,
      onTimeRate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0,
    };
  });
}
