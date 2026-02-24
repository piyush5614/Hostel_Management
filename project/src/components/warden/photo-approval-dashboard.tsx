import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { 
  mockPhotoSubmissions, 
  approvePhotoSubmission, 
  rejectPhotoSubmission,
  enhancedMockStaffTasks 
} from '../../store/enhanced-mock-data';
import { PhotoSubmission } from '../../store/enhanced-mock-data';
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  User,
  Calendar,
  AlertTriangle,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface PhotoApprovalDashboardProps {
  userId: string;
}

export function PhotoApprovalDashboard({ userId }: PhotoApprovalDashboardProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<PhotoSubmission | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Get pending photo submissions
  const pendingSubmissions = mockPhotoSubmissions.filter(s => s.status === 'pending');
  const recentSubmissions = mockPhotoSubmissions.slice(-10);

  const handleApprove = async (submissionId: string) => {
    const success = approvePhotoSubmission(submissionId, userId);
    if (success) {
      toast.success('Task photos approved! ✅ Student portal updated.');
      // Force re-render by updating state
      setSelectedSubmission(null);
    } else {
      toast.error('Failed to approve photos');
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    const success = rejectPhotoSubmission(selectedSubmission.id, rejectionReason, userId);
    if (success) {
      toast.success('Task photos rejected with feedback sent to staff');
      setIsRejectModalOpen(false);
      setSelectedSubmission(null);
      setRejectionReason('');
    } else {
      toast.error('Failed to reject photos');
    }
  };

  const openViewModal = (submission: PhotoSubmission) => {
    setSelectedSubmission(submission);
    setIsViewModalOpen(true);
  };

  const openRejectModal = (submission: PhotoSubmission) => {
    setSelectedSubmission(submission);
    setIsRejectModalOpen(true);
  };

  const getSubmissionStats = () => {
    const total = mockPhotoSubmissions.length;
    const pending = mockPhotoSubmissions.filter(s => s.status === 'pending').length;
    const approved = mockPhotoSubmissions.filter(s => s.status === 'approved').length;
    const rejected = mockPhotoSubmissions.filter(s => s.status === 'rejected').length;

    return { total, pending, approved, rejected };
  };

  const stats = getSubmissionStats();

  return (
    <div className="space-y-6">
      {/* Enhanced header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-6 text-white overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="absolute inset-0 bg-pattern-dots opacity-30"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm border border-white/30">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">Photo Approval Dashboard</h2>
              <p className="text-primary-100 text-lg">Review and approve staff task completion photos</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-sm text-primary-200">Pending Approvals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20 border-2 border-warning-200 dark:border-warning-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-warning-600 to-warning-700 p-2 shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-warning-800 dark:text-warning-200">Pending</p>
                <p className="text-2xl font-bold text-warning-900 dark:text-warning-100">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-2 border-success-200 dark:border-success-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-success-600 to-success-700 p-2 shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-success-800 dark:text-success-200">Approved</p>
                <p className="text-2xl font-bold text-success-900 dark:text-success-100">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-error-50 to-error-100 dark:from-error-900/20 dark:to-error-800/20 border-2 border-error-200 dark:border-error-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-error-600 to-error-700 p-2 shadow-lg">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-error-800 dark:text-error-200">Rejected</p>
                <p className="text-2xl font-bold text-error-900 dark:text-error-100">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-primary-600 to-primary-700 p-2 shadow-lg">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary-800 dark:text-primary-200">Total</p>
                <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary-600" />
            <span>Pending Photo Approvals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSubmissions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingSubmissions.map((submission) => (
                <Card key={submission.id} className="bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-card dark:via-card/80 dark:to-card border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Task Info */}
                      <div>
                        <h4 className="font-bold text-lg mb-1">{submission.taskTitle}</h4>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span className="font-semibold">{submission.staffName}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(submission.submittedAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Photo Thumbnails */}
                      <div className="space-y-2">
                        <p className="text-sm font-bold">Photos ({submission.photos.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                          {submission.photos.slice(0, 3).map((photo, index) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`Submission ${index + 1}`}
                              className="h-16 w-full rounded-lg object-cover border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => openViewModal(submission)}
                            />
                          ))}
                          {submission.photos.length > 3 && (
                            <div 
                              className="h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform border border-primary-300"
                              onClick={() => openViewModal(submission)}
                            >
                              <span className="text-xs font-bold text-primary-700">+{submission.photos.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => openViewModal(submission)}
                          variant="outline"
                          className="flex-1 hover:scale-105 transition-transform"
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(submission.id)}
                          className="flex-1 bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 hover:scale-105 transition-all duration-300"
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectModal(submission)}
                          className="flex-1 hover:scale-105 transition-transform border-error-300 hover:border-error-400 hover:bg-error-50"
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center shadow-xl">
                <CheckCircle2 className="h-12 w-12 text-success-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">All Caught Up! 🎉</h3>
              <p className="text-lg">No pending photo submissions to review</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Review Task Photos"
        size="xl"
      >
        {selectedSubmission && (
          <div className="space-y-6">
            {/* Task Details */}
            <Card className="bg-gradient-to-r from-primary-50 via-white to-secondary-50 dark:from-primary-900/20 dark:via-card dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 p-2">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-primary-800 dark:text-primary-200">{selectedSubmission.taskTitle}</h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span className="flex items-center space-x-1 text-primary-700 dark:text-primary-300">
                        <User className="h-4 w-4" />
                        <span className="font-semibold">{selectedSubmission.staffName}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-primary-700 dark:text-primary-300">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(selectedSubmission.submittedAt).toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo Gallery */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <ImageIcon className="h-5 w-5 text-primary-600" />
                <span>Submitted Photos ({selectedSubmission.photos.length})</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedSubmission.photos.map((photo, index) => (
                  <div key={index} className="space-y-2">
                    <img
                      src={photo}
                      alt={`Task completion ${index + 1}`}
                      className="w-full h-64 rounded-xl object-cover border-2 border-primary-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                      onClick={() => window.open(photo, '_blank')}
                    />
                    <p className="text-sm font-bold text-center text-primary-700 dark:text-primary-300">
                      Photo {index + 1} of {selectedSubmission.photos.length}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button 
                variant="outline" 
                onClick={() => setIsViewModalOpen(false)}
                className="hover:scale-105 transition-transform"
              >
                Close
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setIsViewModalOpen(false);
                  openRejectModal(selectedSubmission);
                }}
                className="border-error-300 hover:border-error-400 hover:bg-error-50 hover:scale-105 transition-all duration-300"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject with Feedback
              </Button>
              <Button 
                onClick={() => {
                  handleApprove(selectedSubmission.id);
                  setIsViewModalOpen(false);
                }}
                className="bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Photos
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRejectionReason('');
        }}
        title="Reject Photo Submission"
        size="md"
      >
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-error-50 to-error-100 dark:from-error-900/20 dark:to-error-800/20 border-2 border-error-200 dark:border-error-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-error-600" />
                <div>
                  <h4 className="font-bold text-error-800 dark:text-error-200">Provide Rejection Feedback</h4>
                  <p className="text-sm text-error-700 dark:text-error-300">
                    Help staff understand what needs improvement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <label className="mb-3 block text-sm font-bold">Reason for Rejection</label>
            <textarea
              className="w-full rounded-xl border-2 border-input bg-gradient-to-r from-background to-background/80 px-4 py-3 text-sm transition-all duration-300 hover:border-primary-300 focus:border-primary-500 shadow-lg hover:shadow-xl"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please explain why the photos are being rejected and what improvements are needed..."
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
              className="bg-gradient-to-r from-error-600 to-error-700 hover:from-error-700 hover:to-error-800"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject with Feedback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}