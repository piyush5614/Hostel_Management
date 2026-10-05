import { describe, expect, it } from 'vitest';
import { mapApplicationRow } from '../services/applications';

describe('applications service response mapping', () => {
  it('maps persisted snake_case application fields to the frontend model', () => {
    expect(mapApplicationRow({
      id: 'app-1',
      student_id: 'student-1',
      type: 'room-change',
      title: 'Move rooms',
      description: 'A request',
      status: 'approved',
      submitted_at: '2026-10-05T10:00:00Z',
      reviewed_at: '2026-10-05T11:00:00Z',
      reviewed_by: 'warden-1',
      comments: 'Approved',
      urgency: 'high',
      expected_completion_date: '2026-10-10',
    })).toMatchObject({
      id: 'app-1',
      studentId: 'student-1',
      type: 'room-change',
      submittedAt: '2026-10-05T10:00:00Z',
      reviewedAt: '2026-10-05T11:00:00Z',
      reviewedBy: 'warden-1',
      expectedCompletionDate: '2026-10-10',
    });
  });

  it('uses safe defaults for nullable or unknown backend values', () => {
    expect(mapApplicationRow({
      id: 'app-2',
      title: 'Other request',
      status: 'unexpected',
      type: 'unexpected',
    })).toMatchObject({
      type: 'other',
      status: 'pending',
      description: '',
      urgency: 'medium',
    });
  });
});
