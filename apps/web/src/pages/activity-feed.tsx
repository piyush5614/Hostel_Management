/**
 * Activity Feed Page
 * Shows all real-time notifications with infinite scroll
 */

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { InfiniteList } from '../components/ui/infinite-list';
import { Button } from '../components/ui/button';
import { Bell, Trash2, CheckCircle, AlertCircle, Clock, MapPin, Gift } from 'lucide-react';
import { useNotifications, type Notification } from '../lib/notification-context';
import { PaginatedResponse } from '../lib/pagination';

export function ActivityFeedPage() {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const fetchNotifications = useCallback(
    async (cursor?: string): Promise<PaginatedResponse<Notification>> => {
      const pageSize = 50;
      let startIndex = 0;

      if (cursor) {
        const cursorIndex = notifications.findIndex((n) => n.id === cursor);
        startIndex = cursorIndex + 1;
      }

      const pageItems = notifications.slice(startIndex, startIndex + pageSize);
      const nextCursor =
        startIndex + pageSize < notifications.length
          ? pageItems[pageItems.length - 1]?.id
          : undefined;

      return {
        data: pageItems,
        cursor: nextCursor,
      };
    },
    [notifications]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Activity Feed
        </h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              Mark All Read
            </Button>
          )}
          <Button
            variant="outline"
            onClick={clearAll}
            disabled={notifications.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Notifications</p>
              <p className="text-3xl font-bold">{notifications.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Unread</p>
              <p className="text-3xl font-bold text-primary-600">{unreadCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Read</p>
              <p className="text-3xl font-bold text-gray-600">
                {notifications.length - unreadCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <InfiniteList
            queryKey={['activityFeed']}
            queryFn={fetchNotifications}
            renderItem={(notification) => (
              <div
                className={`flex items-start gap-4 p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                  !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="mt-1 flex-shrink-0">
                  {getIconForType(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {notification.body}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                )}
              </div>
            )}
            renderSkeleton={() => (
              <div className="flex items-start gap-4 p-4 border-b animate-pulse">
                <div className="h-5 w-5 bg-gray-200 rounded flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            )}
            renderEmpty={() => (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 opacity-30 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">No notifications yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Activity will appear here when events occur
                </p>
              </div>
            )}
            containerClassName="divide-y"
            skeletonCount={5}
          />
        </CardContent>
      </Card>
    </div>
  );
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
      return <Bell className="h-5 w-5 text-purple-500" />;
    case 'room_allocated':
      return <MapPin className="h-5 w-5 text-indigo-500" />;
    case 'maintenance_completed':
      return <Gift className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
