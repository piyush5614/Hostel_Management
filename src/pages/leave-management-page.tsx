import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/modal';
import { EnhancedLeaveForm } from '../components/leave/enhanced-leave-form';
import { ErrorBoundary } from '../components/error-boundary/error-boundary';
import { useAuthStore } from '../store/auth-store';
import { 
  mockLeaveRequests, 
  mockStudents, 
  submitLeaveRequest, 
  approveLeaveRequest, 
  rejectLeaveRequest,
  updateStudent,
  getLinkedStudent,
  getLinkedStudentId
} from '../store/mock-data';
import { LeaveRequest } from '../types';
import { Calendar, Clock, CheckCircle, XCircle, Plus, LogOut, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function LeaveManagementPage() {
  const user = useAuthStore((state) => state.user);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isCheckInOutModalOpen, setIsCheckInOutModalOpen] = useState(false);
  const [checkInOutType, setCheckInOutType] = useState<'checkin' | 'checkout'>('checkout');

  const canManageLeave = user?.role === 'admin' || user?.role === 'warden';
  
  // Resolve student ID for filtering
  const myStudentId = user?.role === 'student' && user?.id ? getLinkedStudentId(user.id) : null;

  // Filter requests based on user role
  const visibleRequests = canManageLeave 
    ? mockLeaveRequests 
    : mockLeaveRequests.filter(req => req.studentId === myStudentId);

  const getStudentName = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    return student?.name || 'Unknown Student';
  };

  const getCurrentStudent = () => {
    if (!user?.id) return null;
    return getLinkedStudent(user.id);
  };
  const getStatusColor = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending': return 'text-warning-600 bg-warning-50';
      case 'approved': return 'text-success-600 bg-success-50';
      case 'rejected': return 'text-error-600 bg-error-50';
    }
  };

  const handleLeaveFormSuccess = () => {
    setIsCreateModalOpen(false);
  };

  const handleApprove = (requestId: string, comments?: string) => {
    const result = approveLeaveRequest(requestId, comments);
    if (result) {
      toast.success('Leave request approved!');
    }
  };

  const handleReject = (requestId: string, comments?: string) => {
    const result = rejectLeaveRequest(requestId, comments);
    if (result) {
      toast.success('Leave request rejected!');
    }
  };

  const handleCheckOut = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    if (student) {
      updateStudent(studentId, { currentStatus: 'on-leave' });
      
      // Update leave request with checkout time
      const leaveRequest = mockLeaveRequests.find(req => 
        req.studentId === studentId && req.status === 'approved'
      );
      if (leaveRequest) {
        leaveRequest.checkOutTime = new Date().toISOString();
      }
      
      toast.success(`${student.name} checked out successfully!`);
    }
  };

  const handleCheckIn = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    if (student) {
      updateStudent(studentId, { currentStatus: 'present' });
      
      // Update leave request with checkin time
      const leaveRequest = mockLeaveRequests.find(req => 
        req.studentId === studentId && req.status === 'approved'
      );
      if (leaveRequest) {
        leaveRequest.checkInTime = new Date().toISOString();
        leaveRequest.actualReturnDate = new Date().toISOString();
      }
      
      toast.success(`${student.name} checked in successfully!`);
    }
  };

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <div className="flex space-x-2">
          {canManageLeave && (
            <Button variant="outline" onClick={() => setIsCheckInOutModalOpen(true)}>
              <LogOut className="mr-2 h-4 w-4" />
              Check In/Out
            </Button>
          )}
          {user?.role === 'student' && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {canManageLeave && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-warning-500" />
                <div>
                  <p className="text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold">
                    {mockLeaveRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-success-500" />
                <div>
                  <p className="text-sm font-medium">Approved</p>
                  <p className="text-2xl font-bold">
                    {mockLeaveRequests.filter(r => r.status === 'approved').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-error-500" />
                <div>
                  <p className="text-sm font-medium">Rejected</p>
                  <p className="text-2xl font-bold">
                    {mockLeaveRequests.filter(r => r.status === 'rejected').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <LogOut className="h-5 w-5 text-primary-500" />
                <div>
                  <p className="text-sm font-medium">On Leave</p>
                  <p className="text-2xl font-bold">
                    {mockStudents.filter(s => s.currentStatus === 'on-leave').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Leave Requests List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {canManageLeave ? 'All Leave Requests' : 'My Leave Requests'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {visibleRequests.map((request) => (
                  <div
                    key={request.id}
                    className={cn(
                      'cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent',
                      selectedRequest?.id === request.id && 'border-primary-500 bg-primary-50'
                    )}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold">
                            {canManageLeave ? getStudentName(request.studentId) : 'Leave Request'}
                          </h3>
                          {request.parentApprovalStatus === 'approved' && (
                            <span className="rounded-full bg-success-100 px-2 py-1 text-xs font-medium text-success-700 flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Parent Approved</span>
                            </span>
                          )}
                          <span className={cn(
                            'rounded-full px-2 py-1 text-xs font-medium',
                            getStatusColor(request.status)
                          )}>
                            {request.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize mb-1">
                          {request.type.replace('-', ' ')}
                        </p>
                        <p className="text-sm mb-2">{request.reason}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>
                            {new Date(request.startDate).toLocaleDateString()} - {' '}
                            {new Date(request.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {canManageLeave && request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(request.id);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(request.id);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {visibleRequests.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Calendar className="mx-auto mb-4 h-12 w-12 opacity-30" />
                    <p>No leave requests found.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request Details */}
        <div>
          {selectedRequest ? (
            <Card>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canManageLeave && (
                  <div>
                    <p className="text-sm font-medium mb-1">Student:</p>
                    <p className="text-sm">{getStudentName(selectedRequest.studentId)}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-1">Type:</p>
                  <p className="text-sm capitalize">{selectedRequest.type.replace('-', ' ')}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Duration:</p>
                  <p className="text-sm">
                    {new Date(selectedRequest.startDate).toLocaleDateString()} - {' '}
                    {new Date(selectedRequest.endDate).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Reason:</p>
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.emergencyContact && (
                  <div>
                    <p className="text-sm font-medium mb-1">Emergency Contact:</p>
                    <p className="text-sm">{selectedRequest.emergencyContact}</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={cn(
                    'rounded-full px-2 py-1 text-xs font-medium',
                    getStatusColor(selectedRequest.status)
                  )}>
                    {selectedRequest.status}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Submitted: {new Date(selectedRequest.submittedAt).toLocaleDateString()}</p>
                  {selectedRequest.reviewedAt && (
                    <p>Reviewed: {new Date(selectedRequest.reviewedAt).toLocaleDateString()}</p>
                  )}
                </div>

                {selectedRequest.approverComments && (
                  <div>
                    <p className="text-sm font-medium mb-1">Comments:</p>
                    <p className="text-sm">{selectedRequest.approverComments}</p>
                  </div>
                )}

                {/* Check In/Out Status */}
                {selectedRequest.status === 'approved' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Check Out:</span>
                      <span className="text-sm">
                        {selectedRequest.checkOutTime 
                          ? new Date(selectedRequest.checkOutTime).toLocaleString()
                          : 'Not checked out'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Check In:</span>
                      <span className="text-sm">
                        {selectedRequest.checkInTime 
                          ? new Date(selectedRequest.checkInTime).toLocaleString()
                          : 'Not checked in'
                        }
                      </span>
                    </div>
                  </div>
                )}

                {canManageLeave && selectedRequest.status === 'approved' && (
                  <div className="flex space-x-2 pt-2">
                    {!selectedRequest.checkOutTime && (
                      <Button
                        size="sm"
                        onClick={() => handleCheckOut(selectedRequest.studentId)}
                        className="flex-1"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Check Out
                      </Button>
                    )}
                    {selectedRequest.checkOutTime && !selectedRequest.checkInTime && (
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(selectedRequest.studentId)}
                        className="flex-1"
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Check In
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <Calendar className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Select a request to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Leave Request Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Submit Leave Request"
        size="lg"
      >
        {getCurrentStudent() && (
          <EnhancedLeaveForm
            student={getCurrentStudent()!}
            onSuccess={handleLeaveFormSuccess}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        )}
      </Modal>
    </div>
    </ErrorBoundary>
  );
}