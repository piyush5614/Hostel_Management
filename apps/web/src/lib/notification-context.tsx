/**
 * Notification Context & Provider
 * Manages real-time notifications via WebSocket
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initializeSocket, onEvent } from './socket-client';
import { useAuthStore } from '../store/auth-store';

export interface Notification {
  id: string;
  type: 'leave_approved' | 'leave_rejected' | 'task_assigned' | 'visitor_arrived' | 'room_allocated' | 'attendance_marked' | 'maintenance_completed' | string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => void;
  isLoading: boolean;
  error: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const getToken = useAuthStore((state) => state.getToken);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize socket and fetch initial notifications
  useEffect(() => {
    if (!user) return;

    const token = getToken();
    if (!token) {
      console.warn('No token available, skipping socket initialization');
      return;
    }

    const initializeNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize socket connection
        initializeSocket(token);

        // Fetch existing notifications from API
        const response = await fetch('/api/notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch notifications');

        const result = await response.json();
        const data = result.data || [];

        if (data && Array.isArray(data)) {
          const mappedNotifications: Notification[] = data.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            data: n.data,
            read: n.read,
            createdAt: n.created_at,
          }));
          setNotifications(mappedNotifications);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize notifications:', err);
        setError('Failed to load notifications');
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, [user]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
      const newNotif: Notification = {
        ...notification,
        id: Date.now().toString(),
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
    };

    const unsubscribe = onEvent('notification:new', handleNewNotification);

    return () => {
      unsubscribe();
    };
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );

      // Update via API
      const token = useAuthStore.getState().getToken();
      if (!token) return;

      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ read: true }),
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );

      // Update via API
      const token = useAuthStore.getState().getToken();
      if (!token) return;

      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        isLoading,
        error,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
