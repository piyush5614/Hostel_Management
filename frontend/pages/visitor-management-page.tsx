import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/modal';
import { useAuthStore } from '../store/auth-store';
import { mockVisitors, mockStudents, mockStaff, exportData } from '../store/mock-data';
import { Visitor } from '../types';
import { Users, Plus, Download, LogIn, LogOut, Clock, Camera, Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function VisitorManagementPage() {
  const user = useAuthStore((state) => state.user);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    purpose: '',
    studentId: '',
    staffId: '',
    idProofType: 'aadhar',
    idProofNumber: '',
    vehicleNumber: '',
    photo: '',
  });
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  const getVisitorStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = mockVisitors.filter(v => v.checkInTime.startsWith(today));
    const activeVisitors = mockVisitors.filter(v => v.checkInTime && !v.checkOutTime);
    const totalVisitors = mockVisitors.length;

    return {
      today: todayVisitors.length,
      active: activeVisitors.length,
      total: totalVisitors,
      averageStay: 2.5 // hours - would be calculated from actual data
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;

    const newVisitor: Visitor = {
      id: Date.now().toString(),
      ...formData,
      checkInTime: new Date().toISOString(),
      approvedBy: user.id,
    };

    mockVisitors.push(newVisitor);
    toast.success('Visitor registered successfully!');
    setIsCreateModalOpen(false);
    setFormData({
      name: '',
      contactNumber: '',
      purpose: '',
      studentId: '',
      staffId: '',
      idProofType: 'aadhar',
      idProofNumber: '',
      vehicleNumber: '',
      photo: '',
    });
  };

  const handleCheckOut = (visitorId: string) => {
    const visitorIndex = mockVisitors.findIndex(v => v.id === visitorId);
    if (visitorIndex !== -1) {
      const checkOutTime = new Date().toISOString();
      const checkInTime = new Date(mockVisitors[visitorIndex].checkInTime);
      const visitDuration = Math.round((new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60)); // minutes

      mockVisitors[visitorIndex] = {
        ...mockVisitors[visitorIndex],
        checkOutTime,
        visitDuration
      };
      
      toast.success('Visitor checked out successfully!');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportData('visitors', 'excel');
      toast.success('Visitor log exported successfully!');
    } catch (error) {
      toast.error('Failed to export visitor log');
    } finally {
      setIsExporting(false);
    }
  };

  const getPersonName = (visitor: Visitor) => {
    if (visitor.studentId) {
      const student = mockStudents.find(s => s.id === visitor.studentId);
      return student ? `Student: ${student.name}` : 'Unknown Student';
    }
    if (visitor.staffId) {
      const staff = mockStaff.find(s => s.id === visitor.staffId);
      return staff ? `Staff: ${staff.name}` : 'Unknown Staff';
    }
    return 'General Visit';
  };

  const stats = getVisitorStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Visitor Management</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Log'}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Register Visitor
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary-500" />
              <div>
                <p className="text-sm font-medium">Today's Visitors</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <LogIn className="h-5 w-5 text-success-500" />
              <div>
                <p className="text-sm font-medium">Currently Inside</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Visitors</p>
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
                <p className="text-sm font-medium">Avg. Stay</p>
                <p className="text-2xl font-bold">{stats.averageStay}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Visitors List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Visitor Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockVisitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className={cn(
                      'cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent',
                      selectedVisitor?.id === visitor.id && 'border-primary-500 bg-primary-50',
                      !visitor.checkOutTime && 'border-l-4 border-l-success-500'
                    )}
                    onClick={() => setSelectedVisitor(visitor)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {visitor.photo ? (
                          <img src={visitor.photo} alt={visitor.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 flex-shrink-0">
                            <Users className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{visitor.name}</h3>
                          {!visitor.checkOutTime && (
                            <span className="rounded-full bg-success-100 px-2 py-1 text-xs font-medium text-success-700">
                              Inside
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {visitor.purpose}
                        </p>
                        <p className="text-sm mb-2">{getPersonName(visitor)}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>
                            In: {new Date(visitor.checkInTime).toLocaleString()}
                          </span>
                          {visitor.checkOutTime && (
                            <span>
                              Out: {new Date(visitor.checkOutTime).toLocaleString()}
                            </span>
                          )}
                          {visitor.visitDuration && (
                            <span>
                              Duration: {Math.floor(visitor.visitDuration / 60)}h {visitor.visitDuration % 60}m
                            </span>
                          )}
                        </div>
                        </div>
                      </div>
                      
                      {!visitor.checkOutTime && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckOut(visitor.id);
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Check Out
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {mockVisitors.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-4 h-12 w-12 opacity-30" />
                    <p>No visitors registered yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visitor Details */}
        <div>
          {selectedVisitor ? (
            <Card>
              <CardHeader>
                <CardTitle>Visitor Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedVisitor.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedVisitor.contactNumber}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Purpose:</p>
                  <p className="text-sm">{selectedVisitor.purpose}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Visiting:</p>
                  <p className="text-sm">{getPersonName(selectedVisitor)}</p>
                </div>

                {selectedVisitor.photo && (
                  <div>
                    <p className="text-sm font-medium mb-1">Photo:</p>
                    <img src={selectedVisitor.photo} alt={selectedVisitor.name} className="w-24 h-24 rounded-lg object-cover border" />
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-1">ID Proof:</p>
                  <p className="text-sm capitalize">
                    {selectedVisitor.idProofType}{selectedVisitor.idProofNumber ? `: ${selectedVisitor.idProofNumber}` : ''}
                  </p>
                </div>

                {selectedVisitor.vehicleNumber && (
                  <div>
                    <p className="text-sm font-medium mb-1">Vehicle:</p>
                    <p className="text-sm">{selectedVisitor.vehicleNumber}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Check In:</p>
                    <p className="text-sm">
                      {new Date(selectedVisitor.checkInTime).toLocaleString()}
                    </p>
                  </div>
                  
                  {selectedVisitor.checkOutTime ? (
                    <div>
                      <p className="text-sm font-medium">Check Out:</p>
                      <p className="text-sm">
                        {new Date(selectedVisitor.checkOutTime).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-success-50 p-3 dark:bg-success-900/20">
                      <p className="text-sm font-medium text-success-800 dark:text-success-200">
                        Currently Inside
                      </p>
                      <p className="text-xs text-success-600 dark:text-success-400">
                        Duration: {Math.floor((new Date().getTime() - new Date(selectedVisitor.checkInTime).getTime()) / (1000 * 60))} minutes
                      </p>
                    </div>
                  )}
                </div>

                {selectedVisitor.visitDuration && (
                  <div>
                    <p className="text-sm font-medium mb-1">Total Duration:</p>
                    <p className="text-sm">
                      {Math.floor(selectedVisitor.visitDuration / 60)}h {selectedVisitor.visitDuration % 60}m
                    </p>
                  </div>
                )}

                {selectedVisitor.remarks && (
                  <div>
                    <p className="text-sm font-medium mb-1">Remarks:</p>
                    <p className="text-sm">{selectedVisitor.remarks}</p>
                  </div>
                )}

                {!selectedVisitor.checkOutTime && (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckOut(selectedVisitor.id)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Check Out Visitor
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <Users className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Select a visitor to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Register Visitor Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Visitor"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Visitor Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />
            <Input
              label="Contact Number"
              value={formData.contactNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
              placeholder="Phone number"
              required
            />
          </div>

          <Input
            label="Purpose of Visit"
            value={formData.purpose}
            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
            placeholder="Reason for visiting"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Visiting Student (Optional)"
              options={[
                { value: '', label: 'Select student' },
                ...mockStudents.map(student => ({
                  value: student.id,
                  label: `${student.name} (${student.enrollmentNumber})`
                }))
              ]}
              value={formData.studentId}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, studentId: e.target.value, staffId: '' }));
              }}
            />
            <Select
              label="Visiting Staff (Optional)"
              options={[
                { value: '', label: 'Select staff' },
                ...mockStaff.map(staff => ({
                  value: staff.id,
                  label: `${staff.name} (${staff.position})`
                }))
              ]}
              value={formData.staffId}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, staffId: e.target.value, studentId: '' }));
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="ID Proof Type"
              options={[
                { value: 'aadhar', label: 'Aadhar Card' },
                { value: 'pan', label: 'PAN Card' },
                { value: 'driving-license', label: 'Driving License' },
                { value: 'passport', label: 'Passport' },
                { value: 'voter-id', label: 'Voter ID' },
              ]}
              value={formData.idProofType}
              onChange={(e) => setFormData(prev => ({ ...prev, idProofType: e.target.value }))}
            />
            <Input
              label="ID Proof Number (Optional)"
              value={formData.idProofNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, idProofNumber: e.target.value }))}
              placeholder="ID number"
            />
          </div>

          <Input
            label="Vehicle Number (Optional)"
            value={formData.vehicleNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
            placeholder="Vehicle registration number"
          />

          {/* Photo Capture Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Visitor Photo</label>
            {formData.photo ? (
              <div className="relative inline-block">
                <img src={formData.photo} alt="Visitor" className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200" />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                  className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 shadow-md"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex space-x-3">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) { toast.error('Please select a valid image'); return; }
                    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => setFormData(prev => ({ ...prev, photo: ev.target?.result as string }));
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) { toast.error('Please select a valid image'); return; }
                    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => setFormData(prev => ({ ...prev, photo: ev.target?.result as string }));
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Register Visitor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}