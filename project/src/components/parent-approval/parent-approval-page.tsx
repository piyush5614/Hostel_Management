import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  mockSMSNotifications, 
  enhancedMockLeaveRequests,
  getAllEnhancedStudents,
  processParentApproval 
} from '../../store/enhanced-mock-data';
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  User, 
  Phone, 
  MessageSquare,
  Clock,
  AlertTriangle,
  School
} from 'lucide-react';
import { toast } from 'sonner';

export function ParentApprovalPage() {
  const { approvalCode } = useParams<{ approvalCode: string }>();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | 'invalid'>('pending');

  // Find the SMS notification and related data
  const notification = mockSMSNotifications.find(n => n.approvalCode === approvalCode);
  const leaveRequest = notification ? enhancedMockLeaveRequests.find(lr => lr.id === notification.leaveRequestId) : null;
  const student = notification ? getAllEnhancedStudents().find(s => s.id === notification.studentId) : null;

  useEffect(() => {
    if (!notification || !leaveRequest || !student) {
      setApprovalStatus('invalid');
    } else if (notification.parentResponse) {
      setApprovalStatus(notification.parentResponse);
    }
  }, [notification, leaveRequest, student]);

  const handleApproval = async (response: 'approved' | 'rejected') => {
    if (!approvalCode) return;

    setIsProcessing(true);

    try {
      const success = processParentApproval(approvalCode, response);
      
      if (success) {
        setApprovalStatus(response);
        toast.success(`Leave request ${response} successfully!`);
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        toast.error('Failed to process approval. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred while processing your response.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (approvalStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-error-50 via-white to-error-100 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-error-200">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-gradient-to-br from-error-100 to-error-200 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-error-600" />
            </div>
            <h2 className="text-xl font-bold text-error-800 mb-2">Invalid Approval Link</h2>
            <p className="text-muted-foreground mb-6">
              This approval link is invalid or has expired. Please contact the hostel administration.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-success-50 via-white to-success-100 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-success-200">
          <CardContent className="p-8 text-center">
            <div className={cn(
              'mx-auto mb-6 h-16 w-16 rounded-full flex items-center justify-center',
              approvalStatus === 'approved' 
                ? 'bg-gradient-to-br from-success-100 to-success-200' 
                : 'bg-gradient-to-br from-error-100 to-error-200'
            )}>
              {approvalStatus === 'approved' ? (
                <CheckCircle2 className="h-8 w-8 text-success-600" />
              ) : (
                <XCircle className="h-8 w-8 text-error-600" />
              )}
            </div>
            <h2 className={cn(
              'text-xl font-bold mb-2',
              approvalStatus === 'approved' ? 'text-success-800' : 'text-error-800'
            )}>
              Leave Request {approvalStatus === 'approved' ? 'Approved' : 'Rejected'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {approvalStatus === 'approved' 
                ? 'Your child\'s leave request has been approved successfully.'
                : 'Your child\'s leave request has been rejected.'
              }
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to homepage in 3 seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-primary-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm border border-white/30">
              <School className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">TC Hostel Connect</h1>
              <p className="text-primary-100">Parent Leave Approval</p>
            </div>
          </div>
        </div>

        <CardContent className="p-8">
          {student && leaveRequest && (
            <div className="space-y-6">
              {/* Student Information */}
              <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    {student.profileImage ? (
                      <img
                        src={student.profileImage}
                        alt={student.name}
                        className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-lg"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 text-xl font-bold border-2 border-white shadow-lg">
                        {student.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-primary-800">{student.name}</h3>
                      <p className="text-sm text-primary-600 font-semibold">{student.enrollmentNumber}</p>
                      <p className="text-sm text-muted-foreground">{student.course} - Year {student.year}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Request Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-6 w-6 text-primary-600" />
                    <span>Leave Request Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Leave Type</p>
                      <p className="font-bold capitalize">{leaveRequest.type.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Duration</p>
                      <p className="font-bold">
                        {new Date(leaveRequest.startDate).toLocaleDateString()} - {' '}
                        {new Date(leaveRequest.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Reason</p>
                    <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
                      {leaveRequest.reason}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Emergency Contact</p>
                    <p className="font-bold">{leaveRequest.emergencyContact}</p>
                  </div>

                  <div className="text-xs text-muted-foreground bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                    <p className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Submitted: {new Date(leaveRequest.submittedAt).toLocaleString()}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Approval Actions */}
              <Card className="bg-gradient-to-r from-warning-50 to-warning-100 border-2 border-warning-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-warning-800">
                    <MessageSquare className="h-6 w-6" />
                    <span>Parent Approval Required</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-warning-700 leading-relaxed">
                      Your child has requested leave from the hostel. Please review the details above and 
                      choose your response below. Your decision will be immediately communicated to the hostel administration.
                    </p>

                    <div className="flex space-x-4">
                      <Button
                        onClick={() => handleApproval('approved')}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="flex-1 bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 shadow-lg hover:shadow-xl"
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Approve Leave Request
                      </Button>
                      <Button
                        onClick={() => handleApproval('rejected')}
                        disabled={isProcessing}
                        variant="outline"
                        className="flex-1 border-error-300 hover:border-error-400 hover:bg-error-50"
                      >
                        <XCircle className="mr-2 h-5 w-5" />
                        Reject Leave Request
                      </Button>
                    </div>

                    <div className="text-xs text-warning-600 bg-warning-100 p-3 rounded-lg">
                      <p className="font-semibold mb-1">📱 SMS Alternative:</p>
                      <p>You can also reply to the SMS with:</p>
                      <p className="font-mono font-bold">
                        "YES {approvalCode}" to approve or "NO {approvalCode}" to reject
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="bg-gradient-to-r from-secondary-50 to-secondary-100 border border-secondary-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <h4 className="font-bold text-secondary-800 mb-2">Need Help?</h4>
                    <div className="space-y-1 text-sm text-secondary-700">
                      <p className="flex items-center justify-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>Hostel Office: +91-9876543210</span>
                      </p>
                      <p className="flex items-center justify-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>Email: warden@tchostel.edu</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Available 24/7 for emergencies
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}