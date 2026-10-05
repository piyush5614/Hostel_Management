import { Event, EventRegistration } from '../types';

type ApiEvent = Record<string, any>;

function token(): string | null {
  try {
    const raw = localStorage.getItem('tc-hostel-enhanced-session');
    return raw ? JSON.parse(raw).access_token || null : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const accessToken = token();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`/api/events${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Request failed (${response.status})`);
  return body as T;
}

export function mapEvent(row: ApiEvent): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    startDate: row.event_date || row.start_date,
    endDate: row.end_date || row.event_date,
    location: row.location || '',
    category: row.category || 'academic',
    visibility: row.visibility || 'public',
    maxParticipants: row.max_participants ?? undefined,
    registrationRequired: Boolean(row.registration_required),
    registrationDeadline: row.registration_deadline || undefined,
    organizer: row.organizer || row.created_by_name || '',
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status || 'published',
  };
}

export function mapRegistration(row: ApiEvent): EventRegistration {
  return {
    id: row.id,
    eventId: row.event_id,
    studentId: row.user_id,
    registeredAt: row.registered_at,
    status: row.attended ? 'attended' : 'registered',
  };
}

export const eventsService = {
  async list(): Promise<{ events: Event[]; registrations: EventRegistration[] }> {
    const result = await request<{ events: ApiEvent[]; registrations: ApiEvent[] }>('');
    return {
      events: (result.events || []).map(mapEvent),
      registrations: (result.registrations || []).map(mapRegistration),
    };
  },
  create(payload: Partial<Event>) {
    return request<ApiEvent>('', { method: 'POST', body: JSON.stringify(payload) }).then(mapEvent);
  },
  update(id: string, payload: Partial<Event>) {
    return request<ApiEvent>(`/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(mapEvent);
  },
  remove(id: string) {
    return request<{ success: boolean }>(`/${id}`, { method: 'DELETE' });
  },
  register(eventId: string) {
    return request<ApiEvent>(`/${eventId}/registrations`, { method: 'POST' }).then(mapRegistration);
  },
  unregister(eventId: string) {
    return request<{ success: boolean }>(`/${eventId}/registrations`, { method: 'DELETE' });
  },
  setAttendance(registrationId: string, attended: boolean) {
    return request<ApiEvent>(`/registrations/${registrationId}/attendance`, {
      method: 'PATCH',
      body: JSON.stringify({ attended }),
    }).then(mapRegistration);
  },
};
