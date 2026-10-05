import { Visitor } from '../types';

type ApiVisitor = {
  id: string;
  name: string;
  contact_number?: string | null;
  purpose: string;
  student_id?: string | null;
  staff_id?: string | null;
  check_in_time: string;
  check_out_time?: string | null;
  id_proof_type?: string | null;
  id_proof_number?: string | null;
  vehicle_number?: string | null;
  approved_by?: string | null;
  visit_duration?: number | null;
  remarks?: string | null;
  photo?: string | null;
};

export type VisitorInput = {
  name: string;
  contactNumber?: string;
  purpose: string;
  studentId?: string;
  staffId?: string;
  idProofType?: string;
  idProofNumber?: string;
  vehicleNumber?: string;
  photo?: string;
};

const getHeaders = (): HeadersInit => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const session = JSON.parse(localStorage.getItem('tc-hostel-enhanced-session') || 'null') as {
      access_token?: string;
    } | null;
    if (session?.access_token && session.access_token !== 'mock-access-token') {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const collegeId = localStorage.getItem('tc-hostel-active-college-id');
    if (collegeId) headers['x-college-id'] = collegeId;
  } catch {
    // The API will return an authentication error when no valid session exists.
  }
  return headers;
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { ...getHeaders(), ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Request failed (${response.status})`);
  }
  return payload as T;
};

export const mapApiVisitor = (visitor: ApiVisitor): Visitor => ({
  id: visitor.id,
  name: visitor.name,
  contactNumber: visitor.contact_number || '',
  purpose: visitor.purpose,
  studentId: visitor.student_id || undefined,
  staffId: visitor.staff_id || undefined,
  checkInTime: visitor.check_in_time,
  checkOutTime: visitor.check_out_time || undefined,
  idProofType: visitor.id_proof_type || '',
  idProofNumber: visitor.id_proof_number || undefined,
  vehicleNumber: visitor.vehicle_number || undefined,
  approvedBy: visitor.approved_by || '',
  visitDuration: visitor.visit_duration || undefined,
  remarks: visitor.remarks || undefined,
  photo: visitor.photo || undefined,
});

export const visitorsService = {
  async list(): Promise<Visitor[]> {
    const result = await request<{ data: ApiVisitor[] }>('/visitors?limit=200');
    return (result.data || []).map(mapApiVisitor);
  },

  async create(input: VisitorInput): Promise<Visitor> {
    const created = await request<ApiVisitor>('/visitors', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return mapApiVisitor(created);
  },

  async checkout(id: string, remarks?: string): Promise<Visitor> {
    const updated = await request<ApiVisitor>(`/visitors/${encodeURIComponent(id)}/checkout`, {
      method: 'PATCH',
      body: JSON.stringify(remarks ? { remarks } : {}),
    });
    return mapApiVisitor(updated);
  },

  async approve(id: string): Promise<Visitor> {
    const updated = await request<ApiVisitor>(`/visitors/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    return mapApiVisitor(updated);
  },
};
