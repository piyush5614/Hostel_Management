import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Modal } from '../../components/ui/modal';
import { useAuthStore } from '../../store/auth-store';
import { mockMaintenanceRequests, mockRooms, exportData } from '../../store/mock-data';
import { MaintenanceRequest } from '../../types';
import { Wrench, Plus, Download, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export function MaintenancePage() {
  const user = useAuthStore((state) => state.user);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electrical' as MaintenanceRequest['category'],
    priority: 'medium' as MaintenanceRequest['priority'],
    roomId: '',
  });

  const canManageMaintenance = user?.role === 'admin' || user?.role === 'warden' || user?.role === 'staff';
  
  // Filter requests based on user role
  const visibleRequests = canManageMaintenance 
    ? mockMaintenanceRequests 
    : mockMaintenanceRequests.filter(req => req.requesterId === user?.id);

  const getStatusColor = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'pending': return 'text-warning-600 bg-warning-50';
      case 'in-progress': return 'text-primary-600 bg-primary-50';
      case 'completed': return 'text-success-600 bg-success-50';
      case 'rejected': return 'text-error-600 bg-error-50';
    }
  };

  const getPriorityColor = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-error-600 bg-error-50';
      case 'high': return 'text-warning-600 bg-warning-50';
      case 'medium': return 'text-primary-600 bg-primary-50';
      case 'low': return 'text-success-600 bg-success-50';
    }
  };

  const getMaintenanceStats = () => {
    const total = mockMaintenanceRequests.length;
    const pending = mockMaintenanceRequests.filter(r => r.status === 'pending').length;
    const inProgress = mockMaintenanceRequests.filter(r => r.status === 'in-progress').length;
    const completed = mockMaintenanceRequests.filter(r => r.status === 'completed').length;
    const urgent = mockMaintenanceRequests.filter(r => r.priority === 'urgent').length;

    return { total, pending, inProgress, completed, urgent };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;

    const newRequest: MaintenanceRequest = {
      id: Date.now().toString(),
      requesterId: user.id,
      requesterType: user.role === 'student' ? 'student' : 'staff',
      ...formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    mockMaintenanceRequests.push(newRequest);
    toast.success('Maintenance request submitted successfully!');
    setIsCreateModalOpen(false);
    setFormData({
      title: '',
      description: '',
      category: 'electrical',
      priority: 'medium',
      roomId: '',
    });
  };

  const handleStatusUpdate = (requestId: string, newStatus: MaintenanceRequest['status']) => {
    const requestIndex = mockMaintenanceRequests.findIndex(req => req.id === requestId);
    if (requestIndex !== -1) {
      mockMaintenanceRequests[requestIndex] = {
        ...mockMaintenanceRequests[requestIndex],
        status: newStatus,
        ...(newStatus === 'completed' && { completedAt: new Date().toISOString() })
      };
      toast.success(`Request marked as ${newStatus}!`);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportData('maintenance', 'excel');
      toast.success('Maintenance report exported successfully!');
    } catch (error) {
      toast.error('Failed to export maintenance report');
    } finally {
      setIsExporting(false);
    }
  };

  const stats = getMaintenanceStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Maintenance Management</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Report'}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-primary-500" />
              <div>
                <p className="text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-warning-500" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-primary-500" />
              <div>
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-error-500" />
              <div>
                <p className="text-sm font-medium">Urgent</p>
                <p className="text-2xl font-bold">{stats.urgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Maintenance Requests List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {canManageMaintenance ? 'All Maintenance Requests' : 'My Requests'}
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
                          <h3 className="font-semibold">{request.title}</h3>
                          <span className={cn(
                            'rounded-full px-2 py-1 text-xs font-medium',
                            getPriorityColor(request.priority)
                          )}>
                            {request.priority}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize mb-1">
                          {request.category}
                        </p>
                        <p className="text-sm mb-2">{request.description.substring(0, 100)}...</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                          {request.roomId && (
                            <span>
                              Room {mockRooms.find(r => r.id === request.roomId)?.number}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          getStatusColor(request.status)
                        )}>
                          {request.status.replace('-', ' ')}
                        </span>
                        
                        {canManageMaintenance && request.status === 'pending' && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(request.id, 'in-progress');
                              }}
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(request.id, 'rejected');
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        
                        {canManageMaintenance && request.status === 'in-progress' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(request.id, 'completed');
                            }}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {visibleRequests.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Wrench className="mx-auto mb-4 h-12 w-12 opacity-30" />
                    <p>No maintenance requests found.</p>
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
                <div>
                  <h3 className="font-semibold">{selectedRequest.title}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedRequest.category}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Priority:</span>
                    <span className={cn(
                      'rounded-full px-2 py-1 text-xs font-medium',
                      getPriorityColor(selectedRequest.priority)
                    )}>
                      {selectedRequest.priority}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <span className={cn(
                      'rounded-full px-2 py-1 text-xs font-medium',
                      getStatusColor(selectedRequest.status)
                    )}>
                      {selectedRequest.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {selectedRequest.roomId && (
                  <div>
                    <p className="text-sm font-medium mb-1">Room:</p>
                    <p className="text-sm">
                      {mockRooms.find(r => r.id === selectedRequest.roomId)?.number}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-1">Description:</p>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Created: {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                  {selectedRequest.completedAt && (
                    <p>Completed: {new Date(selectedRequest.completedAt).toLocaleDateString()}</p>
                  )}
                </div>

                {selectedRequest.estimatedCost && (
                  <div>
                    <p className="text-sm font-medium mb-1">Estimated Cost:</p>
                    <p className="text-sm">₹{selectedRequest.estimatedCost.toLocaleString()}</p>
                  </div>
                )}

                {selectedRequest.actualCost && (
                  <div>
                    <p className="text-sm font-medium mb-1">Actual Cost:</p>
                    <p className="text-sm">₹{selectedRequest.actualCost.toLocaleString()}</p>
                  </div>
                )}

                {selectedRequest.remarks && (
                  <div>
                    <p className="text-sm font-medium mb-1">Remarks:</p>
                    <p className="text-sm">{selectedRequest.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <Wrench className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Select a request to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Maintenance Request Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Submit Maintenance Request"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Brief description of the issue"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={[
                { value: 'electrical', label: 'Electrical' },
                { value: 'plumbing', label: 'Plumbing' },
                { value: 'furniture', label: 'Furniture' },
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'ac', label: 'Air Conditioning' },
                { value: 'other', label: 'Other' },
              ]}
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as MaintenanceRequest['category'] }))}
            />

            <Select
              label="Priority"
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as MaintenanceRequest['priority'] }))}
            />
          </div>

          <Select
            label="Room (Optional)"
            options={[
              { value: '', label: 'Select room' },
              ...mockRooms.map(room => ({
                value: room.id,
                label: `Room ${room.number} - Floor ${room.floor}`
              }))
            ]}
            value={formData.roomId}
            onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
          />

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the maintenance issue"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}