// Enhanced types for new functionality

export interface SMSNotification {
  id: string;
  studentId: string;
  parentContact: string;
  leaveRequestId: string;
  messageContent: string;
  sentAt: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  approvalLink: string;
  approvalCode: string;
  parentResponse?: 'approved' | 'rejected';
  responseTime?: string;
}

export interface PhotoSubmission {
  id: string;
  taskId: string;
  staffId: string;
  photos: string[];
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  taskTitle: string;
  staffName: string;
}

// Enhanced LeaveRequest with SMS functionality
export interface EnhancedLeaveRequest extends LeaveRequest {
  parentApprovalStatus?: 'pending' | 'approved' | 'rejected';
  parentApprovalTime?: string;
  smsNotificationSent?: boolean;
  smsDeliveryStatus?: 'pending' | 'delivered' | 'failed';
  approvalCode?: string;
}

// Enhanced StaffTask with photo submission
export interface EnhancedStaffTask extends StaffTask {
  photoSubmissionStatus?: 'pending' | 'approved' | 'rejected';
  photoApprovedBy?: string;
  photoApprovedAt?: string;
  workInProgressPhotos?: string[];
}

// Student dashboard data structure
export interface StudentDashboardData {
  student: Student;
  attendanceRate: number;
  recentAttendance: Attendance[];
  activeLeaveRequests: LeaveRequest[];
  roomInfo?: {
    roomNumber: string;
    bedNumber: string;
    roommates: Student[];
  };
  pendingApplications: Application[];
  upcomingEvents: Event[];
}

// Warden dashboard data structure
export interface WardenDashboardData {
  totalStudents: number;
  presentStudents: number;
  onLeaveStudents: number;
  pendingLeaveRequests: LeaveRequest[];
  pendingPhotoSubmissions: PhotoSubmission[];
  recentActivities: Activity[];
  roomOccupancy: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
  };
}

// Export configuration for student data
export interface StudentExportConfig {
  format: 'pdf' | 'excel' | 'csv';
  includePhotos: boolean;
  includeContactDetails: boolean;
  includeAcademicHistory: boolean;
  includeAttendanceData: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters: {
    course?: string;
    year?: number;
    gender?: string;
    status?: string;
  };
}

// SMS webhook payload structure
export interface SMSWebhookPayload {
  messageId: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
  status: 'delivered' | 'failed' | 'pending';
}

// Photo upload configuration
export interface PhotoUploadConfig {
  maxFileSize: number; // in bytes
  allowedFormats: string[];
  compressionQuality: number;
  maxPhotosPerSubmission: number;
  requireGeoLocation: boolean;
}

// System health monitoring
export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  smsService: 'healthy' | 'degraded' | 'down';
  fileStorage: 'healthy' | 'degraded' | 'down';
  lastChecked: string;
  uptime: number; // in seconds
  activeUsers: number;
  errorRate: number; // percentage
}

// Notification preferences
export interface NotificationPreferences {
  smsNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  leaveApprovals: boolean;
  taskAssignments: boolean;
  emergencyAlerts: boolean;
  maintenanceUpdates: boolean;
  eventReminders: boolean;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}