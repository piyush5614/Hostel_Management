import { Staff, StaffTask } from '../types';
import { mockStaff, mockStaffTasks, addStaff } from '../store/mock-data';
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

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const result: ImportResult = { success: 0, failed: 0, errors: [] };

  // Expected columns
  const nameIdx = headers.findIndex(h => h.includes('name'));
  const emailIdx = headers.findIndex(h => h.includes('email'));
  const positionIdx = headers.findIndex(h => h.includes('position'));
  const departmentIdx = headers.findIndex(h => h.includes('department'));
  const contactIdx = headers.findIndex(h => h.includes('contact'));
  const shiftIdx = headers.findIndex(h => h.includes('shift'));
  const addressIdx = headers.findIndex(h => h.includes('address'));

  if (nameIdx === -1 || emailIdx === -1) {
    return { success: 0, failed: 0, errors: ['CSV must have at least "name" and "email" columns'] };
  }

  for (let i = 1; i < lines.length; i++) {
    try {
      // Handle quoted commas
      const values = parseCSVLine(lines[i]);
      
      const name = values[nameIdx]?.trim();
      const email = values[emailIdx]?.trim();
      
      if (!name || !email) {
        result.failed++;
        result.errors.push(`Row ${i + 1}: Missing name or email`);
        continue;
      }

      // Check for duplicate email
      if (mockStaff.find(s => s.email === email)) {
        result.failed++;
        result.errors.push(`Row ${i + 1}: Email "${email}" already exists`);
        continue;
      }

      addStaff({
        userId: `import-${Date.now()}-${i}`,
        name,
        email,
        employeeId: '',
        position: positionIdx >= 0 ? values[positionIdx]?.trim() || 'Staff' : 'Staff',
        department: departmentIdx >= 0 ? values[departmentIdx]?.trim() || 'General' : 'General',
        contactNumber: contactIdx >= 0 ? values[contactIdx]?.trim() || '' : '',
        shiftTiming: shiftIdx >= 0 ? values[shiftIdx]?.trim() || '08:00-16:00' : '08:00-16:00',
        address: addressIdx >= 0 ? values[addressIdx]?.trim() || '' : '',
        joiningDate: new Date().toISOString().split('T')[0],
        isActive: true,
        onDuty: false,
      });

      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push(`Row ${i + 1}: Parse error`);
    }
  }

  return result;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
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
