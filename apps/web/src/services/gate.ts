import { useAuthStore } from '../store/auth-store';

export type GateStatus =
  | 'PENDING_REASON'
  | 'PENDING_APPROVAL'
  | 'OUT'
  | 'RETURNED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'CANCELLED';

export interface GateMovement {
  id: string;
  student_id: string;
  status: GateStatus;
  reason: string | null;
  reason_category: string | null;
  scanned_by: string;
  scanned_by_name?: string;
  scanned_at: string;
  reason_submitted_at: string | null;
  rejection_note: string | null;
  out_time: string | null;
  in_time: string | null;
  is_late_return: boolean;
  student_name: string;
  enrollment_no: string | null;
  room_number: string | null;
  hostel_block: string | null;
  mobile_number: string | null;
  course_year: string | null;
  created_at: string;
}

export interface GateStudent {
  id: string;
  userId: string;
  name: string;
  profileImage: string | null;
  enrollmentNo: string | null;
  roomNumber: string | null;
  block: string | null;
  course: string | null;
  year: number | null;
  mobileNumber: string | null;
}

interface GatePage<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().getToken();
  if (!token) throw new Error('Your session has expired. Sign in again to continue.');

  const response = await fetch(`/api/gate${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    payload = { error: text };
  }
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status})`);
  }
  return payload as T;
}

export const gateService = {
  myQr() {
    return request<{ token: string; qrVersion: number; student: GateStudent }>('/my-qr');
  },
  pendingForMe() {
    return request<{ movement: GateMovement | null }>('/movements/pending-for-me');
  },
  requestMovement() {
    return request<{ movement: GateMovement }>('/movements/request', { method: 'POST' });
  },
  scan(input: { token?: string; enrollmentNo?: string }) {
    return request<{ movement: GateMovement; student: GateStudent; created: boolean; returned: boolean }>('/scan', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  submitReason(id: string, reason: string, category: string) {
    return request<{ movement: GateMovement }>(`/movements/${encodeURIComponent(id)}/reason`, {
      method: 'POST',
      body: JSON.stringify({ reason, category }),
    });
  },
  transition(id: string, action: 'approve' | 'reject' | 'cancel', note?: string) {
    return request<{ movement: GateMovement }>(`/movements/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      body: JSON.stringify(action === 'reject' ? { note } : {}),
    });
  },
  currentlyOut(block?: string) {
    const query = block ? `?block=${encodeURIComponent(block)}` : '';
    return request<{ data: GateMovement[] }>(`/currently-out${query}`);
  },
  movements(params: {
    from?: string;
    to?: string;
    status?: string;
    studentId?: string;
    block?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return request<GatePage<GateMovement>>(`/movements?${query.toString()}`);
  },
  async exportMovements(params: {
    from: string;
    to: string;
    status?: string;
    block?: string;
    search?: string;
  }): Promise<void> {
    const token = useAuthStore.getState().getToken();
    if (!token) throw new Error('Your session has expired. Sign in again to continue.');
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const response = await fetch(`/api/gate/movements/export?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error || `Export failed (${response.status})`);
    }
    const filename = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
      || `Hostel_Movement_Report_${params.from}_to_${params.to}.xlsx`;
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  regenerateQr(studentId: string) {
    return request<{ token: string; qrVersion: number }>(`/qr/${encodeURIComponent(studentId)}/regenerate`, {
      method: 'POST',
    });
  },
};
