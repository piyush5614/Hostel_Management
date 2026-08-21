export type UserRole = 'admin' | 'warden' | 'staff' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  collegeId?: string;
  profileImage?: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  enrollmentNumber: string;
  course: string;
  year: number;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  emergencyContact: string;
  medicalNotes?: string;
  roomId?: string;
  bedId?: string;
  profileImage?: string;
  parentImage1?: string;
  parentImage2?: string;
  joiningDate: string;
  isActive: boolean;
  currentStatus: 'present' | 'on-leave' | 'absent';
  generatedPassword?: string;
}

export interface Staff {
  id: string;
  userId: string;
  name: string;
  email: string;
  employeeId: string;
  position: string;
  contactNumber: string;
  address: string;
  joiningDate: string;
  profileImage?: string;
  isActive: boolean;
  shiftTiming: string;
  department: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  medicalNotes?: string;
  emergencyContact?: string;
  qualifications?: string;
  onDuty?: boolean;
  deletedAt?: string; // soft delete
  generatedPassword?: string;
}

export interface TaskProgress {
  id: string;
  taskId: string;
  staffId: string;
  status: 'started' | 'update' | 'completed';
  notes: string;
  photos: string[];
  timestamp: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  timestamp: string;
}

export interface GeneratedCredential {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  generatedId: string; // STAFF-XXXX or STU-XXXX
  generatedPassword: string;
  createdAt: string;
  passwordResetAt?: string;
  isActive: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: 'staff' | 'student' | 'task' | 'credential' | 'room';
  resourceId: string;
  timestamp: string;
  details: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  capacity: number;
  type: 'AC' | 'Non-AC';
  gender: 'male' | 'female' | 'any';
  status: 'available' | 'full' | 'maintenance';
  occupiedBeds: number;
  totalBeds: number;
  amenities: string[];
  lastCleaned?: string;
}

export interface Bed {
  id: string;
  roomId: string;
  number: number;
  status: 'available' | 'occupied' | 'maintenance';
  studentId?: string;
  assignedDate?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  morningStatus: 'present' | 'absent' | 'leave';
  eveningStatus: 'present' | 'absent' | 'leave';
  remarks?: string;
  recordedBy: string;
  recordedAt: string;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'absent' | 'leave';
  shiftDuration?: number;
  remarks?: string;
  recordedBy: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  type: 'home-leave' | 'medical-leave' | 'emergency-leave' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approverComments?: string;
  documents?: string[];
  emergencyContact?: string;
  checkOutTime?: string;
  checkInTime?: string;
  actualReturnDate?: string;
  parentApprovalStatus?: 'pending' | 'approved' | 'rejected';
  parentApprovalTime?: string;
  smsNotificationSent?: boolean;
  smsDeliveryStatus?: 'pending' | 'delivered' | 'failed';
  approvalCode?: string;
  parentCallVerified?: boolean;
  parentCallTimestamp?: string;
  parentCallNotes?: string;
  parentCallBy?: string;
}

export interface StaffLeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  type: 'casual-leave' | 'sick-leave' | 'earned-leave' | 'emergency-leave' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approverComments?: string;
}

export interface MaintenanceRequest {
  id: string;
  requesterId: string;
  requesterType: 'student' | 'staff';
  roomId?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  category: 'electrical' | 'plumbing' | 'furniture' | 'cleaning' | 'ac' | 'other';
  createdAt: string;
  assignedTo?: string;
  completedAt?: string;
  estimatedCost?: number;
  actualCost?: number;
  remarks?: string;
  images?: string[];
}

export interface Visitor {
  id: string;
  name: string;
  contactNumber: string;
  purpose: string;
  studentId?: string;
  staffId?: string;
  checkInTime: string;
  checkOutTime?: string;
  idProofType: string;
  idProofNumber?: string;
  vehicleNumber?: string;
  approvedBy: string;
  visitDuration?: number;
  remarks?: string;
  photo?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  subject?: string;
  attachments?: string[];
  messageType: 'direct' | 'announcement' | 'system';
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface Report {
  id: string;
  studentId: string;
  type: 'maintenance' | 'complaint' | 'suggestion' | 'emergency';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolution?: string;
  attachments?: string[];
  category: string;
}

export interface Application {
  id: string;
  studentId: string;
  type: 'leave' | 'room-change' | 'course-change' | 'document-request' | 'other';
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'under-review';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  comments?: string;
  documents?: string[];
  urgency: 'low' | 'medium' | 'high';
  expectedCompletionDate?: string;
}

export interface StaffShift {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'scheduled' | 'active' | 'completed' | 'missed';
  checkInTime?: string;
  checkOutTime?: string;
  actualDuration?: number;
  location: string;
  responsibilities: string[];
  notes?: string;
}

export interface StaffTask {
  id: string;
  assignedTo: string;
  assignedBy: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  category: 'maintenance' | 'cleaning' | 'security' | 'administrative' | 'other';
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  attachments?: string[];
  photoSubmissionStatus?: 'pending' | 'approved' | 'rejected';
  photoApprovedBy?: string;
  photoApprovedAt?: string;
  workInProgressPhotos?: string[];
  comments?: TaskComment[];
  progressUpdates?: TaskProgress[];
  reassignedFrom?: string;
  reassignedAt?: string;
  voiceMessage?: string;
}

export interface DailyReport {
  id: string;
  staffId: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  tasksCompleted: string[];
  incidentsReported: string[];
  maintenanceIssues: string[];
  studentInteractions: number;
  visitorCount: number;
  notes: string;
  submittedAt: string;
  status: 'draft' | 'submitted' | 'reviewed';
  reviewedBy?: string;
  reviewComments?: string;
}

export interface AttendanceSheet {
  id: string;
  date: string;
  roomId?: string;
  floor?: number;
  recordedBy: string;
  students: {
    studentId: string;
    name: string;
    enrollmentNumber: string;
    morningStatus: 'present' | 'absent' | 'leave';
    eveningStatus: 'present' | 'absent' | 'leave';
    remarks?: string;
  }[];
  submittedAt: string;
  submittedToAdmin: boolean;
  adminReviewed: boolean;
  reviewComments?: string;
}

export interface SystemSettings {
  id: string;
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    announcements: boolean;
    events: boolean;
    maintenance: boolean;
    attendance: boolean;
    leave: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'students-only' | 'private';
    showContactInfo: boolean;
    showAcademicInfo: boolean;
    allowMessages: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: 'en' | 'hi' | 'mr';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    timezone: string;
  };
  security: {
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
    sessionTimeout: number;
    passwordChangeRequired: boolean;
    lastPasswordChange?: string;
  };
  communication: {
    allowDirectMessages: boolean;
    allowGroupMessages: boolean;
    autoReply: boolean;
    autoReplyMessage?: string;
    messageRetention: number;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
  };
}

export interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv';
  dateRange: {
    start: string;
    end: string;
  };
  filters: Record<string, any>;
  includeHeaders: boolean;
  includeImages: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  presentStudents: number;
  onLeaveStudents: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  pendingApplications: number;
  pendingMaintenanceRequests: number;
  todayVisitors: number;
  activeStaff: number;
  recentActivities: Activity[];
}

export interface Activity {
  id: string;
  type: 'student_checkin' | 'student_checkout' | 'room_allocation' | 'maintenance_request' | 'visitor_entry' | 'application_submitted' | 'leave_approved' | 'other';
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AutoAssignCriteria {
  gender: 'male' | 'female' | 'any';
  year?: number;
  course?: string;
  roomType?: 'AC' | 'Non-AC';
  floor?: number;
  priority: 'year' | 'course' | 'random';
}