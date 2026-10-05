import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();
// Keep reads compatible with the currently deployed base events schema. Optional
// event metadata is supplied by the frontend mapper when the extension migration
// has not yet been applied.
const EVENT_FIELDS = 'id,college_id,title,description,event_date,location,created_by,created_at,updated_at';

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const { data: events, error } = await db.from('events').select(EVENT_FIELDS).eq('college_id', collegeId).order('event_date');
    if (error) throw error;
    const ids = (events || []).map((event: any) => event.id);
    const { data: registrations, error: registrationError } = ids.length
      ? await db.from('event_registrations').select('id,event_id,user_id,registered_at').eq('college_id', collegeId).in('event_id', ids)
      : { data: [], error: null };
    if (registrationError) throw registrationError;
    res.json({ events: events || [], registrations: registrations || [] });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Unable to load events' });
  }
});

router.post('/', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const eventDate = req.body.startDate || req.body.eventDate;
    if (!title || !eventDate) return void res.status(400).json({ error: 'title and startDate are required' });
    const id = uuidv4();
    const { error } = await db.from('events').insert([{ id, college_id: collegeId, title, description: req.body.description || null, event_date: eventDate, location: req.body.location || null, created_by: req.user?.userId }]);
    if (error) throw error;
    const { data, error: fetchError } = await db.from('events').select(EVENT_FIELDS).eq('id', id).single();
    if (fetchError) throw fetchError;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Unable to create event' });
  }
});

router.patch('/:id', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    const fields: Record<string, string> = { title: 'title', description: 'description', startDate: 'event_date', location: 'location' };
    for (const [input, column] of Object.entries(fields)) if (req.body[input] !== undefined) updates[column] = req.body[input];
    const { error } = await db.from('events').update(updates).eq('id', req.params.id).eq('college_id', collegeId);
    if (error) throw error;
    const { data, error: fetchError } = await db.from('events').select(EVENT_FIELDS).eq('id', req.params.id).eq('college_id', collegeId).single();
    if (fetchError) throw fetchError;
    res.json(data);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Unable to update event' });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'warden'), async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { error } = await db.from('events').delete().eq('id', req.params.id).eq('college_id', resolveCollegeId(req.user?.collegeId));
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Unable to delete event' });
  }
});

router.post('/:id/registrations', authenticate, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const { data: event } = await db.from('events').select('id').eq('id', req.params.id).eq('college_id', collegeId).single();
    if (!event) return void res.status(404).json({ error: 'Event not found' });
    const { data, error } = await db.from('event_registrations').insert([{ id: uuidv4(), college_id: collegeId, event_id: req.params.id, user_id: req.user?.userId }]).select('id,event_id,user_id,registered_at').single();
    if (error) return void res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Already registered' : 'Unable to register for event' });
    res.status(201).json(data);
  } catch (error) {
    console.error('Register event error:', error);
    res.status(500).json({ error: 'Unable to register for event' });
  }
});

router.delete('/:id/registrations', authenticate, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { error } = await db.from('event_registrations').delete().eq('event_id', req.params.id).eq('user_id', req.user?.userId).eq('college_id', resolveCollegeId(req.user?.collegeId));
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Unregister event error:', error);
    res.status(500).json({ error: 'Unable to unregister from event' });
  }
});

router.patch('/registrations/:registrationId/attendance', authenticate, authorize('admin', 'warden', 'staff'), async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { data, error } = await db.from('event_registrations').update({ attended: Boolean(req.body.attended) }).eq('id', req.params.registrationId).eq('college_id', resolveCollegeId(req.user?.collegeId)).select('id,event_id,user_id,registered_at,attended').single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Attendance update error:', error);
    res.status(500).json({ error: 'Unable to update attendance' });
  }
});

export default router;
