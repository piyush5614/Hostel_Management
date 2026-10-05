import { Staff, StaffTask, TaskComment } from '../types';

const sessionToken = () => {
  try {
    const session = JSON.parse(localStorage.getItem('tc-hostel-enhanced-session') || 'null');
    return session?.access_token && session.access_token !== 'mock-access-token' ? session.access_token : null;
  } catch { return null; }
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionToken();
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`);
  return payload as T;
}

const mapTask = (row: any): StaffTask => ({
  ...row, assignedTo: row.assignedTo ?? row.assigned_to, assignedBy: row.assignedBy ?? row.assigned_by,
  dueDate: row.dueDate ?? row.due_date, createdAt: row.createdAt ?? row.created_at,
  completedAt: row.completedAt ?? row.completed_at, estimatedHours: row.estimatedHours ?? row.estimated_hours,
  actualHours: row.actualHours ?? row.actual_hours, workInProgressPhotos: row.workInProgressPhotos ?? row.work_in_progress_photos ?? [],
  photoSubmissionStatus: row.photoSubmissionStatus ?? row.photo_submission_status,
  comments: Array.isArray(row.comments) ? row.comments.map((comment: any) => ({
    ...comment, taskId: comment.taskId ?? comment.task_id, userId: comment.userId ?? comment.user_id,
    userName: comment.userName ?? comment.user_name, userRole: comment.userRole ?? comment.user_role,
    timestamp: comment.timestamp ?? comment.created_at,
  })) as TaskComment[] : undefined,
});

export async function getStaffTasks(): Promise<StaffTask[]> {
  return (await request<any[]>('/staff-tasks')).map(mapTask);
}
export async function getStaffMembers(): Promise<Staff[]> {
  const rows = await request<any[]>('/staff?isActive=true');
  return rows.map(row => ({ ...row, userId: row.user_id, employeeId: row.employee_id, contactNumber: row.contact_number, joiningDate: row.joining_date, isActive: row.is_active, name: row.users?.name || row.name, email: row.users?.email || row.email }));
}
export async function createStaffTask(task: Partial<StaffTask>): Promise<StaffTask> {
  return mapTask(await request('/staff-tasks', { method: 'POST', body: JSON.stringify(task) }));
}
export async function updateStaffTaskApi(id: string, updates: Partial<StaffTask>): Promise<StaffTask> {
  return mapTask(await request(`/staff-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }));
}
export async function cancelStaffTask(id: string): Promise<void> {
  await request(`/staff-tasks/${id}`, { method: 'DELETE' });
}
export async function addTaskCommentApi(id: string, content: string): Promise<TaskComment> {
  return request(`/staff-tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
}
