// SMS Notification Service for Leave Applications
import { LeaveRequest, Student } from '../../types';
import { sendLeaveApprovalSMS, processParentApproval } from '../../store/enhanced-mock-data';

export interface SMSConfig {
  apiKey: string;
  senderId: string;
  baseUrl: string;
}

export class SMSNotificationService {
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
  }

  // Send leave approval SMS to parent
  async sendLeaveApprovalNotification(
    student: Student, 
    leaveRequest: LeaveRequest
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📱 Sending SMS notification for leave request:', leaveRequest.id);
      
      // Generate approval code and link
      const approvalCode = `TC${Date.now().toString().slice(-6)}`;
      const approvalLink = `${window.location.origin}/approve/${approvalCode}`;
      
      // Format leave dates
      const startDate = new Date(leaveRequest.startDate).toLocaleDateString('en-IN');
      const endDate = new Date(leaveRequest.endDate).toLocaleDateString('en-IN');
      
      // Create SMS content
      const smsContent = `🏫 TC Hostel Alert
Student: ${student.name}
Leave Request: ${startDate} to ${endDate}
Reason: ${leaveRequest.reason}

To APPROVE: Reply "YES ${approvalCode}"
To REJECT: Reply "NO ${approvalCode}"
Or click: ${approvalLink}

TC Hostel Management`;

      // In production, this would call actual SMS API
      // For demo, we'll simulate the SMS sending
      const notification = await sendLeaveApprovalSMS(student.id, leaveRequest.id);
      
      // Simulate SMS gateway response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('✅ SMS sent successfully to:', student.guardianContact);
      
      return {
        success: true,
        messageId: notification.id
      };
      
    } catch (error: any) {
      console.error('❌ SMS sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS notification'
      };
    }
  }

  // Process parent approval via SMS or web
  async processApproval(
    approvalCode: string, 
    response: 'approved' | 'rejected',
    method: 'sms' | 'web' = 'web'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = processParentApproval(approvalCode, response);
      
      if (success) {
        console.log(`✅ Parent approval processed: ${response} via ${method}`);
        return {
          success: true,
          message: `Leave request ${response} successfully`
        };
      } else {
        return {
          success: false,
          message: 'Invalid approval code or request not found'
        };
      }
    } catch (error: any) {
      console.error('❌ Approval processing failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to process approval'
      };
    }
  }

  // Check SMS delivery status
  async checkDeliveryStatus(messageId: string): Promise<'delivered' | 'pending' | 'failed'> {
    // In production, this would check with SMS gateway
    // For demo, simulate delivery check
    await new Promise(resolve => setTimeout(resolve, 500));
    return 'delivered';
  }

  // Get SMS notification history
  getNotificationHistory(studentId?: string) {
    const { mockSMSNotifications } = require('../../store/enhanced-mock-data');
    
    if (studentId) {
      return mockSMSNotifications.filter((n: any) => n.studentId === studentId);
    }
    
    return mockSMSNotifications;
  }
}

// Default SMS service instance
export const smsService = new SMSNotificationService({
  apiKey: import.meta.env.VITE_SMS_API_KEY || 'demo-api-key',
  senderId: 'TCHOSTEL',
  baseUrl: import.meta.env.VITE_SMS_API_URL || 'https://api.sms-gateway.com'
});

// SMS webhook handler for processing replies
export const handleSMSWebhook = (payload: {
  from: string;
  message: string;
  timestamp: string;
}) => {
  const { from, message, timestamp } = payload;
  
  // Parse SMS reply format: "YES TC001" or "NO TC001"
  const replyMatch = message.trim().toUpperCase().match(/^(YES|NO)\s+([A-Z0-9]+)$/);
  
  if (replyMatch) {
    const [, response, code] = replyMatch;
    const approvalResponse = response === 'YES' ? 'approved' : 'rejected';
    
    return processParentApproval(code, approvalResponse);
  }
  
  return false;
};