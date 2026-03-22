import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/modal';
import { EnhancedLeaveForm } from '../components/leave/enhanced-leave-form';
import { LeaveQRCode } from '../components/leave/leave-qr-code';
import { QRScannerModal } from '../components/leave/qr-scanner-modal';
import { ErrorBoundary } from '../components/error-boundary/error-boundary';
import { useAuthStore } from '../store/auth-store';
import {
  mockLeaveRequests,
  mockStaffLeaveRequests,
  mockStudents,
  mockStaff,
  approveLeaveRequest,
  rejectLeaveRequest,
  recordParentCall,
  syncLeaveRequestsFromApi,
  submitStaffLeaveRequest,
  approveStaffLeaveRequest,
  rejectStaffLeaveRequest,
  updateStudent,
  getLinkedStudent,
  getLinkedStudentId,
  getLinkedStaffId,
} from '../store/mock-data';
import { LeaveRequest, StaffLeaveRequest } from '../types';
import {
  Calendar, Clock, CheckCircle, XCircle, Plus, LogOut, LogIn,
  Users, Briefcase, ScanLine, Phone, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useDataRefresh } from '../utils/use-data-refresh';
import { EVENTS } from '../utils/event-bus';

export function LeaveManagementPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const refreshKey = useDataRefresh([EVENTS.LEAVE_UPDATED, EVENTS.STAFF_LEAVE_UPDATED]);

  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStaffLeaveModalOpen, setIsStaffLeaveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [selectedStaffLeave, setSelectedStaffLeave] = useState<StaffLeaveRequest | null>(null);
  const [isCheckInOutModalOpen, setIsCheckInOutModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Staff leave form
  const [staffLeaveForm, setStaffLeaveForm] = useState({
    type: 'casual-leave' as StaffLeaveRequest['type'],
    startDate: '',
    endDate: '',
    reason: '',
  });

  const isAdmin = user?.role === 'admin';
  const isWarden = user?.role === 'warden';
  const isStaff = user?.role === 'staff';
  const isStudent = user?.role === 'student';
  const canManageLeave = isAdmin || isWarden;

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    void syncLeaveRequestsFromApi();
  }, [user?.id]);

  // Resolve linked IDs
  const myStudentId = isStudent && user?.id ? getLinkedStudentId(user.id, user.email) : null;
  const myStaffId = isStaff && user?.id ? getLinkedStaffId(user.id, user.email) : null;

  // Student leave requests visible to user
  const visibleStudentLeaves = useMemo(() => {
    if (canManageLeave || isStaff) return mockLeaveRequests;
    return mockLeaveRequests.filter(req => req.studentId === myStudentId);
  }, [refreshKey, canManageLeave, isStaff, myStudentId]);

  // Staff leave requests visible to user
  const visibleStaffLeaves = useMemo(() => {
    if (canManageLeave) return mockStaffLeaveRequests;
    if (isStaff) return mockStaffLeaveRequests.filter(r => r.staffId === myStaffId);
    return [];
  }, [refreshKey, canManageLeave, isStaff, myStaffId]);

  const getStudentName = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    return student?.name || 'Unknown Student';
  };

  const getCurrentStudent = () => {
    if (!user?.id) return null;
    return getLinkedStudent(user.id, user.email);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning-600 bg-warning-50';
      case 'approved': return 'text-success-600 bg-success-50';
      case 'rejected': return 'text-error-600 bg-error-50';
      default: return '';
    }
  };

  // --- Student Leave handlers ---
  // --- QR Scanner callback ---
  const handleQRCallConfirmed = (data: {
    leaveRequestId: string;
    phone: string;
    studentName: string;
    parentName: string;
    notes: string;
  }) => {
    const result = recordParentCall(data.leaveRequestId, user?.id || 'unknown', data.notes);
    if (result) {
      toast.success(`Parent call verified for ${data.studentName}'s leave request`);
      // Auto-select the verified leave request
      setSelectedRequest(result);
    } else {
      toast.error('Leave request not found or already processed.');
    }
  };

  // Helper to get student data for a leave request
  const getStudentForLeave = (studentId: string) => {
    return mockStudents.find(s => s.id === studentId) || null;
  };

  const handleApprove = (requestId: string) => {
    const request = mockLeaveRequests.find(r => r.id === requestId);
    if (request && !request.parentCallVerified && canManageLeave) {
      toast.error('You must scan the QR code and call the parent before approving.');
      return;
    }
    approveLeaveRequest(requestId);
    toast.success('Leave request approved!');
    setSelectedRequest(null);
  };

  const handleReject = (requestId: string) => {
    rejectLeaveRequest(requestId);
    toast.success('Leave request rejected!');
    setSelectedRequest(null);
  };

  const handleCheckOut = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    if (student) {
      updateStudent(studentId, { currentStatus: 'on-leave' });
      const leaveRequest = mockLeaveRequests.find(req =>
        req.studentId === studentId && req.status === 'approved'
      );
      if (leaveRequest) leaveRequest.checkOutTime = new Date().toISOString();
      toast.success(`${student.name} checked out successfully!`);
    }
  };

  const handleCheckIn = (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    if (student) {
      updateStudent(studentId, { currentStatus: 'present' });
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

  // --- Staff Leave handlers ---
  const handleStaffLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffLeaveForm.startDate || !staffLeaveForm.endDate || !staffLeaveForm.reason.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (new Date(staffLeaveForm.endDate) < new Date(staffLeaveForm.startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    const staffMember = mockStaff.find(s => s.id === myStaffId);
    submitStaffLeaveRequest({
      staffId: myStaffId || user?.id || '',
      staffName: staffMember?.name || user?.name || 'Staff',
      type: staffLeaveForm.type,
      startDate: staffLeaveForm.startDate,
      endDate: staffLeaveForm.endDate,
      reason: staffLeaveForm.reason,
    });
    toast.success('Staff leave request submitted!');
    setIsStaffLeaveModalOpen(false);
    setStaffLeaveForm({ type: 'casual-leave', startDate: '', endDate: '', reason: '' });
  };

  const handleApproveStaffLeave = (id: string) => {
    approveStaffLeaveRequest(id, user?.id || 'admin');
    toast.success('Staff leave approved!');
    setSelectedStaffLeave(null);
  };

  const handleRejectStaffLeave = (id: string) => {
    rejectStaffLeaveRequest(id, user?.id || 'admin');
    toast.success('Staff leave rejected!');
    setSelectedStaffLeave(null);
  };

  // --- Stats ---
  const studentLeaveStats = {
    pending: visibleStudentLeaves.filter(r => r.status === 'pending').length,
    approved: visibleStudentLeaves.filter(r => r.status === 'approved').length,
    rejected: visibleStudentLeaves.filter(r => r.status === 'rejected').length,
    onLeave: mockStudents.filter(s => s.currentStatus === 'on-leave').length,
  };

  const staffLeaveStats = {
    pending: visibleStaffLeaves.filter(r => r.status === 'pending').length,
    approved: visibleStaffLeaves.filter(r => r.status === 'approved').length,
    rejected: visibleStaffLeaves.filter(r => r.status === 'rejected').length,
    total: visibleStaffLeaves.length,
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <div className="flex space-x-2">
            {canManageLeave && activeTab === 'student' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsScannerOpen(true)}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300"
                >
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan QR
                </Button>
                <Button variant="outline" onClick={() => setIsCheckInOutModalOpen(true)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Check In/Out
                </Button>
              </>
            )}
            {isStudent && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            )}
            {isStaff && activeTab === 'staff' && (
              <Button onClick={() => setIsStaffLeaveModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Apply for Leave
              </Button>
            )}
          </div>
        </div>

        {/* Tabs — visible to staff, admin, warden (students only see their own student leaves) */}
        {!isStudent && (
          <div className="flex border-b">
            <button
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'student'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              )}
              onClick={() => { setActiveTab('student'); setSelectedStaffLeave(null); }}
            >
              <Users className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              Student Leaves
            </button>
            <button
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'staff'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              )}
              onClick={() => { setActiveTab('staff'); setSelectedRequest(null); }}
            >
              <Briefcase className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              Staff Leaves
            </button>
          </div>
        )}

        {/* =================== STUDENT LEAVES TAB =================== */}
        {(activeTab === 'student' || isStudent) && (
          <>
            {/* Stats Cards */}
            {(canManageLeave || isStaff) && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 p-2.5">
                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{studentLeaveStats.pending}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 dark:border-green-800 bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-xl bg-green-100 dark:bg-green-900/40 p-2.5">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Approved</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">{studentLeaveStats.approved}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-xl bg-red-100 dark:bg-red-900/40 p-2.5">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Rejected</p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{studentLeaveStats.rejected}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-xl bg-blue-100 dark:bg-blue-900/40 p-2.5">
                        <LogOut className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">On Leave</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{studentLeaveStats.onLeave}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              {/* Student Leave Requests List */}
              <div className={selectedRequest ? 'md:col-span-2' : 'md:col-span-3'}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {canManageLeave ? 'All Student Leave Requests'
                        : isStaff ? 'Student Leave Requests (View Only)'
                        : 'My Leave Requests'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {visibleStudentLeaves.map((request) => (
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
                                  {(canManageLeave || isStaff) ? getStudentName(request.studentId) : 'Leave Request'}
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

                            {/* ONLY admin/warden can approve/reject — NOT staff */}
                            {canManageLeave && request.status === 'pending' && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleReject(request.id); }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {visibleStudentLeaves.length === 0 && (
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
              {selectedRequest && (
              <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Request Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(canManageLeave || isStaff) && (
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
                        <span className={cn('rounded-full px-2 py-1 text-xs font-medium', getStatusColor(selectedRequest.status))}>
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

                      {/* QR Code — Parent Call Verification */}
                      {selectedRequest.status === 'pending' && (() => {
                        const student = getStudentForLeave(selectedRequest.studentId);
                        if (!student) return null;
                        return (
                          <div className="space-y-3">
                            {/* QR Code Display */}
                            <LeaveQRCode
                              parentPhone={student.guardianContact}
                              parentName={student.guardianName}
                              studentName={student.name}
                              leaveRequestId={selectedRequest.id}
                              compact={isStudent}
                            />

                            {/* Call Verification Status */}
                            {canManageLeave && (
                              <div className={cn(
                                'rounded-lg border p-3 flex items-center gap-2',
                                selectedRequest.parentCallVerified
                                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                              )}>
                                {selectedRequest.parentCallVerified ? (
                                  <>
                                    <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-green-700 dark:text-green-300">Parent Call Verified</p>
                                      <p className="text-[11px] text-green-600 dark:text-green-400">
                                        {selectedRequest.parentCallTimestamp
                                          ? new Date(selectedRequest.parentCallTimestamp).toLocaleString()
                                          : ''}
                                      </p>
                                      {selectedRequest.parentCallNotes && (
                                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                          Notes: {selectedRequest.parentCallNotes}
                                        </p>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="h-4 w-4 text-red-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">Parent Call Not Verified</p>
                                      <p className="text-[11px] text-red-600 dark:text-red-400">
                                        Scan QR & call parent to enable approval
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Approve/Reject from detail panel — gated behind call verification */}
                            {canManageLeave && (
                              <div className="flex space-x-2 pt-1">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  disabled={!selectedRequest.parentCallVerified}
                                  onClick={() => handleApprove(selectedRequest.id)}
                                  title={!selectedRequest.parentCallVerified ? 'Scan QR & call parent first' : 'Approve leave'}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {selectedRequest.parentCallVerified ? 'Approve Leave' : 'Call Required'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleReject(selectedRequest.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Check In/Out Status */}
                      {selectedRequest.status === 'approved' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Check Out:</span>
                            <span className="text-sm">
                              {selectedRequest.checkOutTime
                                ? new Date(selectedRequest.checkOutTime).toLocaleString()
                                : 'Not checked out'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Check In:</span>
                            <span className="text-sm">
                              {selectedRequest.checkInTime
                                ? new Date(selectedRequest.checkInTime).toLocaleString()
                                : 'Not checked in'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* admin/warden check in/out buttons */}
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
              </div>
              )}
            </div>
          </>
        )}

        {/* =================== STAFF LEAVES TAB =================== */}
        {activeTab === 'staff' && !isStudent && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 p-2.5">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{staffLeaveStats.pending}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 dark:border-green-800 bg-white dark:bg-gray-900 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-xl bg-green-100 dark:bg-green-900/40 p-2.5">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Approved</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">{staffLeaveStats.approved}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-xl bg-red-100 dark:bg-red-900/40 p-2.5">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">{staffLeaveStats.rejected}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-xl bg-blue-100 dark:bg-blue-900/40 p-2.5">
                      <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{staffLeaveStats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Staff Leave Requests List */}
              <div className={selectedStaffLeave ? 'md:col-span-2' : 'md:col-span-3'}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {canManageLeave ? 'All Staff Leave Requests' : 'My Leave Requests'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {visibleStaffLeaves.map((request) => (
                        <div
                          key={request.id}
                          className={cn(
                            'cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent',
                            selectedStaffLeave?.id === request.id && 'border-primary-500 bg-primary-50'
                          )}
                          onClick={() => setSelectedStaffLeave(request)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold">{request.staffName}</h3>
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

                            {/* Admin/Warden approve/reject */}
                            {canManageLeave && request.status === 'pending' && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleApproveStaffLeave(request.id); }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleRejectStaffLeave(request.id); }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {visibleStaffLeaves.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground">
                          <Briefcase className="mx-auto mb-4 h-12 w-12 opacity-30" />
                          <p>{isStaff ? 'No leave requests yet. Apply for leave using the button above.' : 'No staff leave requests found.'}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Staff Leave Detail Panel */}
              {selectedStaffLeave && (
              <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Staff Leave Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Staff Member:</p>
                        <p className="text-sm">{selectedStaffLeave.staffName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Leave Type:</p>
                        <p className="text-sm capitalize">{selectedStaffLeave.type.replace('-', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Duration:</p>
                        <p className="text-sm">
                          {new Date(selectedStaffLeave.startDate).toLocaleDateString()} - {' '}
                          {new Date(selectedStaffLeave.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {Math.ceil((new Date(selectedStaffLeave.endDate).getTime() - new Date(selectedStaffLeave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Reason:</p>
                        <p className="text-sm">{selectedStaffLeave.reason}</p>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <span className={cn('rounded-full px-2 py-1 text-xs font-medium', getStatusColor(selectedStaffLeave.status))}>
                          {selectedStaffLeave.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>Submitted: {new Date(selectedStaffLeave.submittedAt).toLocaleDateString()}</p>
                        {selectedStaffLeave.reviewedAt && (
                          <p>Reviewed: {new Date(selectedStaffLeave.reviewedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      {selectedStaffLeave.approverComments && (
                        <div>
                          <p className="text-sm font-medium mb-1">Reviewer Comments:</p>
                          <p className="text-sm">{selectedStaffLeave.approverComments}</p>
                        </div>
                      )}

                      {/* Admin/Warden approve/reject in detail panel */}
                      {canManageLeave && selectedStaffLeave.status === 'pending' && (
                        <div className="flex space-x-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveStaffLeave(selectedStaffLeave.id)}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectStaffLeave(selectedStaffLeave.id)}
                            className="flex-1"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
              </div>
              )}
            </div>
          </>
        )}

        {/* Create Student Leave Request Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Submit Leave Request"
          size="lg"
        >
          {getCurrentStudent() ? (
            <EnhancedLeaveForm
              student={getCurrentStudent()!}
              onSuccess={() => setIsCreateModalOpen(false)}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          ) : (
            <div className="text-center py-8 space-y-4">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
              <div>
                <p className="font-medium text-lg">Student Profile Not Found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is not linked to a student profile yet. Please contact an administrator to set up your student profile before applying for leave.
                </p>
              </div>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </Modal>

        {/* Staff Leave Request Modal */}
        <Modal
          isOpen={isStaffLeaveModalOpen}
          onClose={() => setIsStaffLeaveModalOpen(false)}
          title="Apply for Staff Leave"
          size="md"
        >
          <form onSubmit={handleStaffLeaveSubmit} className="space-y-4">
            <Select
              label="Leave Type"
              value={staffLeaveForm.type}
              onChange={(e) => setStaffLeaveForm(p => ({ ...p, type: e.target.value as StaffLeaveRequest['type'] }))}
              options={[
                { value: 'casual-leave', label: 'Casual Leave' },
                { value: 'sick-leave', label: 'Sick Leave' },
                { value: 'earned-leave', label: 'Earned Leave' },
                { value: 'emergency-leave', label: 'Emergency Leave' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={staffLeaveForm.startDate}
                onChange={(e) => setStaffLeaveForm(p => ({ ...p, startDate: e.target.value }))}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={staffLeaveForm.endDate}
                onChange={(e) => setStaffLeaveForm(p => ({ ...p, endDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[100px]"
                value={staffLeaveForm.reason}
                onChange={(e) => setStaffLeaveForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Describe your reason for leave..."
                required
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsStaffLeaveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Submit Leave Request
              </Button>
            </div>
          </form>
        </Modal>

        {/* Check In/Out Modal */}
        <Modal
          isOpen={isCheckInOutModalOpen}
          onClose={() => setIsCheckInOutModalOpen(false)}
          title="Student Check In/Out"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select from approved leave requests to check students in or out.
            </p>
            {mockLeaveRequests
              .filter(r => r.status === 'approved')
              .map(req => {
                const student = mockStudents.find(s => s.id === req.studentId);
                return (
                  <div key={req.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{student?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {!req.checkOutTime && (
                        <Button size="sm" onClick={() => { handleCheckOut(req.studentId); setIsCheckInOutModalOpen(false); }}>
                          <LogOut className="mr-1 h-3 w-3" /> Check Out
                        </Button>
                      )}
                      {req.checkOutTime && !req.checkInTime && (
                        <Button size="sm" onClick={() => { handleCheckIn(req.studentId); setIsCheckInOutModalOpen(false); }}>
                          <LogIn className="mr-1 h-3 w-3" /> Check In
                        </Button>
                      )}
                      {req.checkOutTime && req.checkInTime && (
                        <span className="text-xs text-green-600 font-medium">Completed</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Modal>

        {/* QR Scanner Modal */}
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onCallConfirmed={handleQRCallConfirmed}
        />
      </div>
    </ErrorBoundary>
  );
}