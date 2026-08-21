/**
 * Notifications API Routes
 * Handle notification CRUD operations and delivery (in-memory for mock system)
 */

import express, { Request, Response } from 'express';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for notifications
const notificationsStore = new Map<string, any[]>();

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export function createNotificationRoutes(io?: Server) {
  const router = express.Router();

  /**
   * GET /api/notifications
   * Fetch user's notifications with pagination
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string | undefined;

      const userNotifications = notificationsStore.get(userId) || [];
      const sorted = [...userNotifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      let startIndex = 0;
      if (cursor) {
        const cursorIndex = sorted.findIndex((n) => n.id === cursor);
        startIndex = cursorIndex + 1;
      }

      const pageItems = sorted.slice(startIndex, startIndex + limit);
      const nextCursor = startIndex + limit < sorted.length ? pageItems[pageItems.length - 1]?.id : undefined;

      res.json({
        data: pageItems,
        cursor: nextCursor,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  /**
   * GET /api/notifications/:id
   * Fetch single notification
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userNotifications = notificationsStore.get(userId) || [];
      const notification = userNotifications.find((n) => n.id === req.params.id);

      if (!notification) {
        return res.status(404).json({ error: 'Not found' });
      }

      res.json(notification);
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ error: 'Failed to fetch notification' });
    }
  });

  /**
   * PATCH /api/notifications/:id
   * Mark notification as read
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userNotifications = notificationsStore.get(userId) || [];
      const notification = userNotifications.find((n) => n.id === req.params.id);

      if (!notification) {
        return res.status(404).json({ error: 'Not found' });
      }

      notification.read = true;
      notification.read_at = new Date().toISOString();
      notificationsStore.set(userId, userNotifications);

      res.json(notification);
    } catch (error) {
      console.error('Error updating notification:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  });

  /**
   * PUT /api/notifications/read-all
   * Mark all notifications as read
   */
  router.put('/read-all', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userNotifications = notificationsStore.get(userId) || [];
      userNotifications.forEach((n) => {
        n.read = true;
        n.read_at = new Date().toISOString();
      });
      notificationsStore.set(userId, userNotifications);

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  });

  /**
   * DELETE /api/notifications/:id
   * Delete notification
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let userNotifications = notificationsStore.get(userId) || [];
      userNotifications = userNotifications.filter((n) => n.id !== req.params.id);
      notificationsStore.set(userId, userNotifications);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  /**
   * Helper function to create notifications from other routes
   */
  function createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Notification {
    const notification: Notification = {
      id: uuidv4(),
      user_id: userId,
      type,
      title,
      body,
      data,
      read: false,
      created_at: new Date().toISOString(),
    };

    const userNotifications = notificationsStore.get(userId) || [];
    userNotifications.push(notification);
    notificationsStore.set(userId, userNotifications);

    // Emit real-time event via Socket.io if available
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
    }

    return notification;
  }

  // Attach helper to express app for use in other routes
  (router as any).createNotification = createNotification;

  return router;
}

export default createNotificationRoutes;
