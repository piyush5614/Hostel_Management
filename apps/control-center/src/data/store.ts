import { v4 as uuidv4 } from 'uuid';
import type { AuditLog, CollegeRecord, CollegeStatus, PrivilegedActionRequest } from '../types.js';

const nowIso = () => new Date().toISOString();

const colleges: CollegeRecord[] = [
  {
    id: uuidv4(),
    name: 'North Valley Institute',
    code: 'NVI-01',
    status: 'active',
    contactEmail: 'admin@nvi.edu',
    domain: 'nvi.hostelcomp.com',
    region: 'APAC',
    activeStudents: 1420,
    activeStaff: 122,
    plan: 'enterprise',
    links: {
      appUrl: 'https://nvi.hostelcomp.com',
      adminUrl: 'https://nvi.hostelcomp.com/admin',
      onboardingUrl: 'https://nvi.hostelcomp.com/welcome',
      supportUrl: 'https://support.hostelcomp.com/nvi',
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: uuidv4(),
    name: 'Metro Arts College',
    code: 'MAC-07',
    status: 'onboarding',
    contactEmail: 'operations@metroarts.edu',
    domain: 'metroarts.hostelcomp.com',
    region: 'India',
    activeStudents: 430,
    activeStaff: 37,
    plan: 'growth',
    links: {
      appUrl: 'https://metroarts.hostelcomp.com',
      adminUrl: 'https://metroarts.hostelcomp.com/admin',
      onboardingUrl: 'https://metroarts.hostelcomp.com/welcome',
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const actionRequests: PrivilegedActionRequest[] = [];
const auditLogs: AuditLog[] = [];

export function listColleges(filters: { status?: CollegeStatus; search?: string }): CollegeRecord[] {
  const search = filters.search?.toLowerCase().trim();
  return colleges.filter((college) => {
    const statusOk = filters.status ? college.status === filters.status : true;
    const searchOk = search
      ? [college.name, college.code, college.domain, college.contactEmail].some((value) =>
          value.toLowerCase().includes(search)
        )
      : true;

    return statusOk && searchOk;
  });
}

export function getCollegeById(collegeId: string): CollegeRecord | undefined {
  return colleges.find((college) => college.id === collegeId);
}

export function createCollege(input: Omit<CollegeRecord, 'id' | 'createdAt' | 'updatedAt'>): CollegeRecord {
  const createdAt = nowIso();
  const record: CollegeRecord = {
    id: uuidv4(),
    createdAt,
    updatedAt: createdAt,
    ...input,
  };

  colleges.unshift(record);
  return record;
}

export function updateCollege(
  collegeId: string,
  patch: Partial<Omit<CollegeRecord, 'id' | 'createdAt' | 'updatedAt'>>
): CollegeRecord | undefined {
  const college = getCollegeById(collegeId);
  if (!college) {
    return undefined;
  }

  Object.assign(college, patch, { updatedAt: nowIso() });
  return college;
}

export function createActionRequest(
  input: Omit<PrivilegedActionRequest, 'id' | 'approvalStatus' | 'approvals' | 'createdAt' | 'updatedAt'>
): PrivilegedActionRequest {
  const createdAt = nowIso();
  const request: PrivilegedActionRequest = {
    id: uuidv4(),
    approvalStatus: 'pending',
    approvals: [],
    createdAt,
    updatedAt: createdAt,
    ...input,
  };

  actionRequests.unshift(request);
  return request;
}

export function listActionRequests(): PrivilegedActionRequest[] {
  return actionRequests;
}

export function approveActionRequest(requestId: string, approver: string): PrivilegedActionRequest | undefined {
  const request = actionRequests.find((item) => item.id === requestId);
  if (!request) {
    return undefined;
  }

  if (!request.approvals.includes(approver)) {
    request.approvals.push(approver);
  }

  request.approvalStatus = request.approvals.length >= 2 ? 'approved' : 'pending';
  request.updatedAt = nowIso();
  return request;
}

export function writeAuditLog(input: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
  const log: AuditLog = {
    id: uuidv4(),
    createdAt: nowIso(),
    ...input,
  };

  auditLogs.unshift(log);
  return log;
}

export function getAuditLogs(limit: number): AuditLog[] {
  return auditLogs.slice(0, limit);
}
