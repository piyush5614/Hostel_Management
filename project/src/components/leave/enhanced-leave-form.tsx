import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LeaveRequest, Student } from '../../types';
import { submitLeaveRequest } from '../../store/mock-data';
import { 
  Calendar, 
  Phone, 
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedLeaveFormProps {
  student: Student;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EnhancedLeaveForm({ student, onSuccess, onCancel }: EnhancedLeaveFormProps) {
  const [formData, setFormData] = useState({
    type: 'home-leave' as LeaveRequest['type'],
    startDate: '',
    endDate: '',
    reason: '',
    emergencyContact: student.emergencyContact || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit leave request with status 'pending' — no auto SMS / auto-approve
      submitLeaveRequest({
        studentId: student.id,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        emergencyContact: formData.emergencyContact,
      });
      toast.success('Leave request submitted successfully! It will be reviewed by the warden/admin.');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Enhanced header */}
      <Card className="bg-gradient-to-r from-primary-50 via-white to-secondary-50 dark:from-primary-900/20 dark:via-card dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-800">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 p-3 shadow-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary-800 dark:text-primary-200">Submit Leave Request</h3>
              <p className="text-sm text-primary-700 dark:text-primary-300">
                Your parent will receive an SMS for instant approval
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Details */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Leave Type"
              options={[
                { value: 'home-leave', label: 'Home Leave' },
                { value: 'medical-leave', label: 'Medical Leave' },
                { value: 'emergency-leave', label: 'Emergency Leave' },
                { value: 'other', label: 'Other' },
              ]}
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Reason for Leave</label>
              <textarea
                className="w-full rounded-xl border-2 border-input bg-gradient-to-r from-background to-background/80 px-4 py-3 text-sm transition-all duration-300 hover:border-primary-300 focus:border-primary-500 shadow-lg hover:shadow-xl"
                rows={4}
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                placeholder="Please provide detailed reason for your leave request..."
                required
              />
            </div>

            <Input
              label="Emergency Contact During Leave"
              value={formData.emergencyContact}
              onChange={(e) => handleChange('emergencyContact', e.target.value)}
              placeholder="Contact number during leave period"
              required
            />
          </CardContent>
        </Card>

        {/* Guardian Info */}
        <Card className="bg-gradient-to-r from-secondary-50 via-white to-warning-50 dark:from-secondary-900/20 dark:via-card dark:to-warning-900/20 border-2 border-secondary-200 dark:border-secondary-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-warning-600" />
              <div>
                <p className="text-sm font-bold text-warning-800 dark:text-warning-200">Guardian: {student.guardianName}</p>
                <p className="text-xs text-warning-700 dark:text-warning-300">Contact: {student.guardianContact}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 shadow-lg hover:shadow-xl"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}