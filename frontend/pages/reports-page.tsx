import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/modal';
import { useAuthStore } from '../store/auth-store';
import { mockReports } from '../store/mock-data';
import { Report } from '../types';
import { AlertTriangle, Plus, Eye, MessageSquare, Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportImages, setReportImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    type: 'maintenance' as Report['type'],
    title: '',
    description: '',
    priority: 'medium' as Report['priority'],
    category: 'general'
  });

  const userReports = mockReports.filter(report => report.studentId === user?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newReport: Report = {
      id: Date.now().toString(),
      studentId: user?.id || '',
      ...formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: reportImages,
    };

    mockReports.push(newReport);
    toast.success('Report submitted successfully!');
    setIsCreateModalOpen(false);
    setReportImages([]);
    setFormData({
      type: 'maintenance',
      title: '',
      description: '',
      priority: 'medium',
      category: 'general'
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploadingImage(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        // Convert to base64 for mock storage
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          setReportImages(prev => [...prev, imageUrl]);
        };
        reader.readAsDataURL(file);
      }

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Images uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const getPriorityColor = (priority: Report['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-error-600 bg-error-50';
      case 'high': return 'text-warning-600 bg-warning-50';
      case 'medium': return 'text-primary-600 bg-primary-50';
      case 'low': return 'text-success-600 bg-success-50';
    }
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending': return 'text-warning-600 bg-warning-50';
      case 'in-progress': return 'text-primary-600 bg-primary-50';
      case 'resolved': return 'text-success-600 bg-success-50';
      case 'closed': return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports & Issues</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Report
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Reports List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>My Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userReports.map((report) => (
                  <div
                    key={report.id}
                    className={cn(
                      'cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent',
                      selectedReport?.id === report.id && 'border-primary-500 bg-primary-50'
                    )}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{report.title}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {report.type.replace('-', ' ')}
                        </p>
                        <p className="mt-1 text-sm">{report.description.substring(0, 100)}...</p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          getPriorityColor(report.priority)
                        )}>
                          {report.priority}
                        </span>
                        <span className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          getStatusColor(report.status)
                        )}>
                          {report.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Submitted: {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                
                {userReports.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 opacity-30" />
                    <p>No reports submitted yet.</p>
                    <p className="text-sm">Click "Submit Report" to create your first report.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Details */}
        <div>
          {selectedReport ? (
            <Card>
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedReport.title}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedReport.type.replace('-', ' ')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Priority:</span>
                    <span className={cn(
                      'rounded-full px-2 py-1 text-xs font-medium',
                      getPriorityColor(selectedReport.priority)
                    )}>
                      {selectedReport.priority}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <span className={cn(
                      'rounded-full px-2 py-1 text-xs font-medium',
                      getStatusColor(selectedReport.status)
                    )}>
                      {selectedReport.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Description:</p>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Submitted: {new Date(selectedReport.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(selectedReport.updatedAt).toLocaleDateString()}</p>
                </div>

                {selectedReport.resolution && (
                  <div>
                    <p className="text-sm font-medium mb-1">Resolution:</p>
                    <p className="text-sm">{selectedReport.resolution}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <Eye className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Select a report to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Report Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Submit New Report"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-gradient-to-r from-warning-50 to-error-50 p-4 dark:from-warning-900/20 dark:to-error-900/20">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              <div>
                <h4 className="font-semibold text-warning-800 dark:text-warning-200">Report an Issue</h4>
                <p className="text-sm text-warning-700 dark:text-warning-300">
                  Help us improve by reporting problems or suggestions
                </p>
              </div>
            </div>
          </div>

          <Select
            label="Report Type"
            options={[
              { value: 'maintenance', label: 'Maintenance Issue' },
              { value: 'complaint', label: 'Complaint' },
              { value: 'suggestion', label: 'Suggestion' },
              { value: 'emergency', label: 'Emergency' },
            ]}
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Report['type'] }))}
          />

          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Brief description of the issue"
            required
          />

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the issue"
              required
            />
          </div>

          <Select
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Report['priority'] }))}
          />

          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="e.g., Room maintenance, Food quality, etc."
            required
          />

          {/* Image Upload Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium">Supporting Images (Optional)</label>
            <div className="rounded-lg border-2 border-dashed border-primary-300 p-6 text-center hover:border-primary-400 transition-colors">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                <Camera className="h-6 w-6 text-primary-600" />
              </div>
              <p className="mb-2 text-sm font-medium">Upload supporting images</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Photos that help explain the issue (JPG, PNG up to 5MB each)
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploadingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingImage}
                  className="pointer-events-none"
                >
                  {isUploadingImage ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Images
                    </>
                  )}
                </Button>
              </label>
            </div>

            {/* Image Preview */}
            {reportImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Attached Images ({reportImages.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {reportImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Report attachment ${index + 1}`}
                        className="h-16 w-full rounded-lg object-cover border border-border"
                      />
                      <button
                        onClick={() => setReportImages(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 rounded-full bg-error-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="shadow-lg">
              <Send className="mr-2 h-4 w-4" />
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}