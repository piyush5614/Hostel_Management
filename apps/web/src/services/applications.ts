import { useAuthStore } from '../store/auth-store';
import { Application } from '../types';

type ApplicationRow = {
  id: string;
  student_id?: string;
  type?: string;
  title?: string;
  description?: string;
  status?: string;
  submitted_at?: string;
  created_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  comments?: string | null;
  documents?: string[] | null;
  urgency?: string;
  expected_completion_date?: string | null;
  students?: {
    enrollment_number?: string;
    users?: { name?: string };
  } | null;
};

const DEFAULT_COLLEGE_ID = (import.meta.env.VITE_DEFAULT_COLLEGE_ID as string | undefined) || 'college-default';

const getCollegeId = (): string => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('collegeId')?.trim()
      || localStorage.getItem('tc-hostel-active-college-id')?.trim()
      || useAuthStore.getState().user?.collegeId
      || DEFAULT_COLLEGE_ID;
  } catch {
    return useAuthStore.getState().user?.collegeId || DEFAULT_COLLEGE_ID;
  }
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = useAuthStore.getState().getToken();
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-college-id': getCollegeId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  const body = await response.text();
  let payload: any = null;
  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    payload = body;
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Request failed (${response.status})`);
  }

  return payload as T;
};

export const mapApplicationRow = (row: ApplicationRow): Application => ({
  id: row.id,
  studentId: row.student_id || '',
  type: (['leave', 'room-change', 'course-change', 'fee-extension', 'document-request', 'other'].includes(row.type || '')
    ? row.type
    : 'other') as Application['type'],
  title: row.title || '',
  description: row.description || '',
  status: (['pending', 'approved', 'rejected', 'under-review'].includes(row.status || '')
    ? row.status
    : 'pending') as Application['status'],
  submittedAt: row.submitted_at || row.created_at || new Date(0).toISOString(),
  reviewedAt: row.reviewed_at || undefined,
  reviewedBy: row.reviewed_by || undefined,
  comments: row.comments || undefined,
  documents: row.documents || undefined,
  urgency: (['low', 'medium', 'high'].includes(row.urgency || '') ? row.urgency : 'medium') as Application['urgency'],
  expectedCompletionDate: row.expected_completion_date || undefined,
});

export async function getApplications(): Promise<Application[]> {
  const payload = await request<ApplicationRow[] | { data?: ApplicationRow[] }>('/applications');
  const rows = Array.isArray(payload) ? payload : payload.data || [];
  return rows.map(mapApplicationRow);
}

export async function createApplication(input: {
  type: Application['type'];
  title: string;
  description: string;
  urgency?: Application['urgency'];
}): Promise<Application> {
  const row = await request<ApplicationRow>('/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return mapApplicationRow(row);
}

export async function reviewApplication(
  id: string,
  status: Application['status'],
  comments?: string,
): Promise<Application> {
  const row = await request<ApplicationRow>(`/applications/${encodeURIComponent(id)}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(comments ? { comments } : {}) }),
  });
  return mapApplicationRow(row);
}
