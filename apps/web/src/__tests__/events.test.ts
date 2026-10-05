import { describe, expect, it } from 'vitest';
import { mapEvent, mapRegistration } from '../services/events';

describe('event API mapping', () => {
  it('maps persisted snake_case event fields to the page model', () => {
    const event = mapEvent({
      id: 'event-1',
      title: 'Orientation',
      description: null,
      event_date: '2026-10-10T09:00:00Z',
      end_date: '2026-10-10T12:00:00Z',
      created_by: 'user-1',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      category: 'academic',
      visibility: 'students-only',
      registration_required: true,
    });
    expect(event).toMatchObject({
      id: 'event-1',
      startDate: '2026-10-10T09:00:00Z',
      endDate: '2026-10-10T12:00:00Z',
      description: '',
      registrationRequired: true,
    });
  });

  it('maps attendance persistence to registration status', () => {
    expect(mapRegistration({
      id: 'registration-1',
      event_id: 'event-1',
      user_id: 'student-1',
      registered_at: '2026-10-01T00:00:00Z',
      attended: true,
    }).status).toBe('attended');
  });
});
