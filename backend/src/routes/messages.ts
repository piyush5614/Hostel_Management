import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);
    const withUserId = typeof req.query.withUserId === 'string' ? req.query.withUserId.trim() : '';

    let query = db
      .from('messages')
      .select('*, users!sender_id(id, name), users!receiver_id(id, name)')
      .eq('college_id', collegeId)
      .or(`sender_id.eq.${user?.userId},receiver_id.eq.${user?.userId}`)
      .order('created_at', { ascending: false });

    if (withUserId) {
      query = query.or(
        `and(sender_id.eq.${user?.userId},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${user?.userId})`
      );
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    res.json(messages || []);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = req.user;
    const collegeId = resolveCollegeId(user?.collegeId);

    const receiverId = req.body.receiverId || req.body.receiver_id;
    const content = req.body.content;
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
