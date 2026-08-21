export type CollegeStatus = 'active' | 'suspended' | 'onboarding' | 'archived';

export interface CollegeLinks {
  appUrl: string;
  adminUrl: string;
  onboardingUrl: string;
  supportUrl?: string;
}

export interface CollegeRecord {
  id: string;
  name: string;
  code: string;
  status: CollegeStatus;
  contactEmail: string;
  domain: string;
  region: string;
  activeStudents: number;
  activeStaff: number;
  plan: 'starter' | 'growth' | 'enterprise';
  links: CollegeLinks;
  createdAt: string;
  updatedAt: string;
}

export type PrivilegedActionType =
  | 'suspend_college'
  | 'activate_college'
  | 'transfer_ownership'
  | 'rotate_links'
  | 'emergency_read_only';

export interface PrivilegedActionRequest {
  id: string;
  collegeId: string;
  action: PrivilegedActionType;
  reasonCode: string;
  referenceId: string;
  requestedBy: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvals: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  targetType: 'college' | 'governance';
  targetId: string;
  detail: string;
  createdAt: string;
}
