/**
 * Notifications API Routes
 * Handle notification CRUD operations and delivery (in-memory for mock system)
 */

import express, { Request, Response } from 'express';
import { Server } from 'socket.io';
import { authenticate } from '../middleware/auth.js';
import { getDb } from '../db/init.js';
import { resolveCollegeId } from '../utils/tenant.js';

interface Notification {
  id?: string;
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
  router.use(authenticate);

  /**
   * GET /api/notifications
   * Fetch user's notifications with pagination
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const collegeId = resolveCollegeId(req.user?.collegeId);
      const db = await getDb();

      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string | undefined;

      let query = db
        .from('notifications')
        .select('*')
        .eq('college_id', collegeId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 100));

      if (cursor) {
        const { data: cursorNotification } = await db
          .from('notifications')
          .select('created_at')
          .eq('id', cursor)
          .eq('college_id', collegeId)
          .eq('user_id', userId)
          .single();
        if (cursorNotification?.created_at) {
          query = query.lt('created_at', cursorNotification.created_at);
        }
      }

      const { data: pageItems, error } = await query;
      if (error) throw error;

      res.json({
        data: pageItems || [],
        cursor: pageItems && pageItems.length === Math.min(Math.max(limit, 1), 100)
          ? pageItems[pageItems.length - 1]?.id
          : undefined,
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
      const userId = req.user!.userId;
      const collegeId = resolveCollegeId(req.user?.collegeId);
      const db = await getDb();
      const { data: notification, error } = await db
        .from('notifications')
        .select('*')
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .eq('user_id', userId)
        .single();
      if (error || !notification) {
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
      const userId = req.user!.userId;
      const collegeId = resolveCollegeId(req.user?.collegeId);
      const db = await getDb();
      const { data: notification, error: fetchError } = await db
        .from('notifications')
        .select('*')
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .eq('user_id', userId)
        .single();
      if (fetchError || !notification) {
        return res.status(404).json({ error: 'Not found' });
      }

      const { data: updated, error } = await db
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;

      res.json(updated);
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
      const userId = req.user!.userId;
      const collegeId = resolveCollegeId(req.user?.collegeId);
      const db = await getDb();
      const { error } = await db
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('college_id', collegeId)
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw error;

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
      const userId = req.user!.userId;
      const collegeId = resolveCollegeId(req.user?.collegeId);
      const db = await getDb();
      const { error } = await db
        .from('notifications')
        .delete()
        .eq('id', req.params.id)
        .eq('college_id', collegeId)
        .eq('user_id', userId);
      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  /**
   * Helper function to create notifications from other routes
   */
  async function createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    const db = await getDb();
    const notification: Notification = {
      user_id: userId,
      type,
      title,
      body,
      data,
      read: false,
      created_at: new Date().toISOString(),
    };

    const { data: created, error } = await db
      .from('notifications')
      .insert([{ ...notification, college_id: resolveCollegeId(undefined) }])
      .select('*')
      .single();
    if (error) throw error;

    // Emit real-time event via Socket.io if available
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', created);
    }

    return created;
  }

  // Attach helper to express app for use in other routes
  (router as any).createNotification = createNotification;

  return router;
}

export default createNotificationRoutes;
