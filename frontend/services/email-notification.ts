/**
 * Email Notification Service
 * Sends task assignment email to staff via the backend API.
 * Fire-and-forget — failures are logged but never block task creation.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TaskNotificationPayload {
  staffId: string;
  staffEmail: string;
  staffName: string;
  taskTitle: string;
  taskDescription: string;
  taskPriority: string;
  taskCategory: string;
  taskDueDate: string;
  assignedByName: string;
}

export async function sendTaskAssignmentNotification(
  payload: TaskNotificationPayload
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/email/task-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.warn('Email notification failed:', data);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Could not reach email service:', error);
    return false;
  }
}
