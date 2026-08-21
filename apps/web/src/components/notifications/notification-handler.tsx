/**
 * Notification Toast Handler
 * Automatically displays toast notifications for new events
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNotifications } from '../../lib/notification-context';
import { Bell, CheckCircle, AlertCircle, Info, Gift, MapPin, Clock } from 'lucide-react';

export function NotificationHandler() {
  const { notifications } = useNotifications();
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check for new unread notifications
    notifications.forEach((notification) => {
      if (!notification.read && !shownNotificationsRef.current.has(notification.id)) {
        shownNotificationsRef.current.add(notification.id);
        displayToast(notification);
      }
    });
  }, [notifications]);

  return null; // This component handles side effects only, no UI rendering
}

function displayToast(notification: any) {
  const icon = getIconForType(notification.type);
  const color = getColorForType(notification.type);

  toast.custom((toastId) => (
    <div className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border ${color} bg-white dark:bg-gray-900 max-w-md`}>
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-gray-900 dark:text-white">{notification.title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notification.body}</p>
      </div>
      <button
        onClick={() => toast.dismiss(toastId)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        ✕
      </button>
    </div>
  ));
}

function getIconForType(type: string) {
  switch (type) {
    case 'leave_approved':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'leave_rejected':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'task_assigned':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'visitor_arrived':
      return <Info className="h-5 w-5 text-purple-500" />;
    case 'room_allocated':
      return <MapPin className="h-5 w-5 text-indigo-500" />;
    case 'maintenance_completed':
      return <Gift className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

function getColorForType(type: string) {
  switch (type) {
    case 'leave_approved':
      return 'border-green-200 dark:border-green-800';
    case 'leave_rejected':
      return 'border-red-200 dark:border-red-800';
    case 'task_assigned':
      return 'border-blue-200 dark:border-blue-800';
    case 'visitor_arrived':
      return 'border-purple-200 dark:border-purple-800';
    case 'room_allocated':
      return 'border-indigo-200 dark:border-indigo-800';
    case 'maintenance_completed':
      return 'border-orange-200 dark:border-orange-800';
    default:
      return 'border-gray-200 dark:border-gray-800';
  }
}
