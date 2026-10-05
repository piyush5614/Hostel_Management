import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

/**
 * GET / - Get messages with pagination
 * Query parameters:
 *   - limit: items per page (default 50, max 200)
 *   - cursor: cursor ID for next page
 *   - withUserId: filter messages with specific user
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);
    const withUserId = typeof req.query.withUserId === 'string' ? req.query.withUserId.trim() : '';

    // Pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const cursor = req.query.cursor as string | undefined;

    let query = db
      .from('messages')
      .select('*, sender:users!sender_id(id, name), receiver:users!receiver_id(id, name)')
      .eq('college_id', collegeId)
      .or(`sender_id.eq.${user?.userId},receiver_id.eq.${user?.userId}`)
      .order('id', { ascending: true }); // Stable cursor

    if (withUserId) {
      query = query.or(
        `and(sender_id.eq.${user?.userId},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${user?.userId})`
      );
    }

    // Apply cursor filter
    if (cursor) {
      query = query.gt('id', cursor);
    }

    // Fetch one extra to detect if there are more pages
    const { data: messages, error } = await query.limit(limit + 1);

    if (error) throw error;

    const items = messages || [];
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : undefined;

    res.json({
      data: pageItems,
      cursor: nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recipients', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const { data, error } = await db
      .from('users')
      .select('id, name, email, role, profile_image')
      .eq('college_id', collegeId)
      .eq('is_active', true)
      .neq('id', req.user?.userId);

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error('Get message recipients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    const receiverId = req.body.receiverId || req.body.receiver_id;
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const messageType = req.body.messageType || req.body.message_type || 'direct';
    const priority = req.body.priority || 'normal';

    if (!receiverId || !content) {
      res.status(400).json({ error: 'receiverId and content are required' });
      return;
    }

    const { data: receiver, error: receiverError } = await db
      .from('users')
      .select('id')
      .eq('id', receiverId)
      .eq('college_id', collegeId)
      .single();

    if (receiverError || !receiver) {
      res.status(404).json({ error: 'Receiver not found for this college' });
      return;
    }

    const messageId = uuidv4();
    const { error: insertError } = await db.from('messages').insert([
      {
        id: messageId,
        college_id: collegeId,
        sender_id: user?.userId,
        receiver_id: receiverId,
        content,
        subject: typeof req.body.subject === 'string' ? req.body.subject.trim() || null : null,
        is_read: false,
        message_type: messageType,
        priority,
      },
    ]);

    if (insertError) throw insertError;

    const { data: created, error: fetchError } = await db
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('college_id', collegeId)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(created);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    const { data: existing, error: fetchError } = await db
      .from('messages')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .eq('receiver_id', user?.userId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const { error: updateError } = await db
      .from('messages')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .eq('receiver_id', user?.userId);

    if (updateError) throw updateError;

    const { data: updated, error: refetchError } = await db
      .from('messages')
      .select('*')
      .eq('id', req.params.id)
      .eq('college_id', collegeId)
      .single();

    if (refetchError) throw refetchError;

    res.json(updated);
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
