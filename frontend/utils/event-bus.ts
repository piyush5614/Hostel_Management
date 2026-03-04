// Simple pub/sub event bus for auto-updating UI when data changes.
// All CRUD mutations in mock-data.ts emit events here so that
// subscribed page components can re-render automatically.

type Callback = () => void;

class EventBus {
  private listeners: Record<string, Set<Callback>> = {};

  on(event: string, cb: Callback) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(cb);
    return () => this.off(event, cb);           // return unsubscribe fn
  }

  off(event: string, cb: Callback) {
    this.listeners[event]?.delete(cb);
  }

  emit(event: string) {
    this.listeners[event]?.forEach(cb => cb());
    // Also fire a wildcard so components that want "any change" can listen on '*'
    if (event !== '*') {
      this.listeners['*']?.forEach(cb => cb());
    }
  }
}

export const eventBus = new EventBus();

// Convenience event names
export const EVENTS = {
  ATTENDANCE_UPDATED: 'attendance-updated',
  LEAVE_UPDATED: 'leave-updated',
  STAFF_LEAVE_UPDATED: 'staff-leave-updated',
  TASK_UPDATED: 'task-updated',
  STUDENT_UPDATED: 'student-updated',
  STAFF_UPDATED: 'staff-updated',
  ROOM_UPDATED: 'room-updated',
  DATA_CHANGED: '*',
} as const;
