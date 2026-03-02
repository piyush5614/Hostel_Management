import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/modal';
import { useAuthStore } from '../store/auth-store';
import { mockApplications } from '../store/mock-data';
import { Application } from '../types';
import { FileText, Plus, Eye, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function ApplicationsPage() {
  const user = useAuthStore((state) => state.user);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [formData, setFormData] = useState({
    type: 'leave' as Application['type'],
    title: '',
    description: '',
  });

  const userApplications = mockApplications.filter(app => app.studentId === user?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newApplication: Application = {
      id: Date.now().toString(),
      studentId: user?.id || '',
      ...formData,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    mockApplications.push(newApplication);
    toast.success('Application submitted successfully!');
    setIsCreateModalOpen(false);
    setFormData({
      type: 'leave',
      title: '',
      description: '',
    });
  };

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'pending': return 'text-warning-600 bg-warning-50';
      case 'under-review': return 'text-primary-600 bg-primary-50';
      case 'approved': return 'text-success-600 bg-success-50';
      case 'rejected': return 'text-error-600 bg-error-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Applications</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Application
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Applications List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>My Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userApplications.map((application) => (
                  <div
                    key={application.id}
                    className={cn(
                      'cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent',
                      selectedApplication?.id === application.id && 'border-primary-500 bg-primary-50'
                    )}
                    onClick={() => setSelectedApplication(application)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{application.title}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {application.type.replace('-', ' ')}
                        </p>
                        <p className="mt-1 text-sm">{application.description.substring(0, 100)}...</p>
                      </div>
                      <span className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        getStatusColor(application.status)
                      )}>
                        {application.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Submitted: {new Date(application.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                
                {userApplications.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-4 h-12 w-12 opacity-30" />
                    <p>No applications submitted yet.</p>
                    <p className="text-sm">Click "New Application" to submit your first application.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Details */}
        <div>
          {selectedApplication ? (
            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedApplication.title}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedApplication.type.replace('-', ' ')}
                  </p>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={cn(
                    'rounded-full px-2 py-1 text-xs font-medium',
                    getStatusColor(selectedApplication.status)
                  )}>
                    {selectedApplication.status.replace('-', ' ')}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Description:</p>
                  <p className="text-sm">{selectedApplication.description}</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Submitted: {new Date(selectedApplication.submittedAt).toLocaleDateString()}</p>
                  {selectedApplication.reviewedAt && (
                    <p>Reviewed: {new Date(selectedApplication.reviewedAt).toLocaleDateString()}</p>
                  )}
                </div>

                {selectedApplication.comments && (
                  <div>
                    <p className="text-sm font-medium mb-1">Comments:</p>
                    <p className="text-sm">{selectedApplication.comments}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <Eye className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Select an application to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Application Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Submit New Application"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Application Type"
            options={[
              { value: 'leave', label: 'Leave Application' },
              { value: 'room-change', label: 'Room Change Request' },
              { value: 'fee-extension', label: 'Fee Payment Extension' },
              { value: 'document-request', label: 'Document Request' },
              { value: 'other', label: 'Other' },
            ]}
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Application['type'] }))}
          />

          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Brief title for your application"
            required
          />

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of your request"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}