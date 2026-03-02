import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { StaffForm } from '../components/forms/staff-form';
import {
  Users, Search, Plus, Edit, Trash2, UserCircle,
  Phone, Mail, MapPin, Calendar, Clock, Shield,
  Briefcase, Building2, AlertCircle,
  Activity, BadgeCheck,
} from 'lucide-react';
import { mockStaff, deleteStaffMember, getTasksByStaff } from '../store/mock-data';
import { Staff } from '../types';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../store/auth-store';

export function StaffPage() {
  const user = useAuthStore(s => s.user);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [filter, setFilter] = useState({
    department: '',
    position: '',
    shiftTiming: '',
    status: '',
  });

  const filteredStaff = useMemo(() => {
    let result = [...mockStaff];

    // Exclude soft-deleted unless filtering for inactive
    if (filter.status !== 'inactive') {
      result = result.filter(s => !s.deletedAt);
    }

    if (filter.department) {
      result = result.filter(s => s.department === filter.department);
    }
    if (filter.position) {
      result = result.filter(s => s.position.toLowerCase().includes(filter.position.toLowerCase()));
    }
    if (filter.shiftTiming) {
      result = result.filter(s => s.shiftTiming === filter.shiftTiming);
    }
    if (filter.status === 'active') {
      result = result.filter(s => s.isActive);
    } else if (filter.status === 'inactive') {
      result = result.filter(s => !s.isActive);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchQuery, filter]);

  const departments = useMemo(() => {
    const deps = [...new Set(mockStaff.map(s => s.department))];
    return deps.sort();
  }, []);

  const handleDeleteStaff = (staff: Staff) => {
    if (window.confirm(`Are you sure you want to deactivate ${staff.name}?`)) {
      if (deleteStaffMember(staff.id, true)) {
        toast.success(`${staff.name} has been deactivated.`);
        if (selectedStaff?.id === staff.id) setSelectedStaff(null);
      } else {
        toast.error('Failed to deactivate staff member.');
      }
    }
  };

  const handleEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setIsEditModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingStaff(null);
    if (selectedStaff) {
      const updated = mockStaff.find(s => s.id === selectedStaff.id);
      setSelectedStaff(updated || null);
    }
  };

  const isCurrentlyOnDuty = (staff: Staff) => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    
    const [startStr, endStr] = staff.shiftTiming.split('-');
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
      // Night shift crosses midnight
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  const canManage = user?.role === 'admin' || user?.role === 'warden';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Staff Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage hostel staff, view profiles, and track assignments
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Staff</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{mockStaff.filter(s => !s.deletedAt).length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Active</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">{mockStaff.filter(s => s.isActive).length}</p>
              </div>
              <BadgeCheck className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">On Duty</p>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">{mockStaff.filter(s => s.isActive && isCurrentlyOnDuty(s)).length}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Departments</p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{departments.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Filters */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <Select
              label="Department"
              options={[
                { value: '', label: 'All Departments' },
                ...departments.map(d => ({ value: d, label: d })),
              ]}
              value={filter.department}
              onChange={(e) => setFilter(prev => ({ ...prev, department: e.target.value }))}
            />

            <Input
              label="Position"
              placeholder="Search by position..."
              value={filter.position}
              onChange={(e) => setFilter(prev => ({ ...prev, position: e.target.value }))}
            />

            <Select
              label="Shift Timing"
              options={[
                { value: '', label: 'All Shifts' },
                { value: '05:00-13:00', label: 'Morning (05:00 - 13:00)' },
                { value: '06:00-14:00', label: 'Day Early (06:00 - 14:00)' },
                { value: '08:00-16:00', label: 'Day (08:00 - 16:00)' },
                { value: '08:00-20:00', label: 'Extended (08:00 - 20:00)' },
                { value: '14:00-22:00', label: 'Evening (14:00 - 22:00)' },
                { value: '22:00-06:00', label: 'Night (22:00 - 06:00)' },
              ]}
              value={filter.shiftTiming}
              onChange={(e) => setFilter(prev => ({ ...prev, shiftTiming: e.target.value }))}
            />

            <Select
              label="Status"
              options={[
                { value: '', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
            />

            <Button variant="outline" className="w-full" onClick={() => {
              setFilter({ department: '', position: '', shiftTiming: '', status: '' });
              setSearchQuery('');
            }}>
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Staff List */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Staff Members ({filteredStaff.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
                {filteredStaff.map((staff) => {
                  const onDuty = isCurrentlyOnDuty(staff);
                  const tasks = getTasksByStaff(staff.id);
                  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length;

                  return (
                    <div
                      key={staff.id}
                      className={cn(
                        'group flex items-center justify-between rounded-xl border p-3 transition-all duration-200 cursor-pointer',
                        selectedStaff?.id === staff.id
                          ? 'border-primary-500 bg-primary-50 shadow-md dark:bg-primary-900/20 dark:border-primary-400'
                          : 'hover:border-primary-300 hover:bg-primary-50/50 hover:shadow-sm dark:hover:bg-primary-900/10',
                        !staff.isActive && 'opacity-60'
                      )}
                      onClick={() => setSelectedStaff(staff)}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          {staff.profileImage ? (
                            <img
                              src={staff.profileImage}
                              alt={staff.name}
                              className="h-11 w-11 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600 dark:from-primary-800 dark:to-primary-700 dark:text-primary-300">
                              <UserCircle className="h-6 w-6" />
                            </div>
                          )}
                          {onDuty && staff.isActive && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{staff.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{staff.position}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                              {staff.department}
                            </span>
                            {activeTasks > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                                {activeTasks} task{activeTasks > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditStaff(staff); }}
                            className="rounded-lg bg-primary-600 p-1.5 text-white hover:bg-primary-700 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteStaff(staff); }}
                            className="rounded-lg bg-red-500 p-1.5 text-white hover:bg-red-600 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredStaff.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 h-12 w-12 opacity-30" />
                    <p>No staff members found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Details */}
        <div className="lg:col-span-5">
          {selectedStaff ? (
            <StaffDetailPanel
              staff={selectedStaff}
              onEdit={() => handleEditStaff(selectedStaff)}
              onViewProfile={() => setIsProfileModalOpen(true)}
              canManage={canManage}
            />
          ) : (
            <Card className="flex h-full min-h-[400px] items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <Users className="mx-auto mb-3 h-16 w-16 opacity-20" />
                <p className="text-lg font-medium">Select a Staff Member</p>
                <p className="text-sm mt-1">Click on a staff member to view their details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Staff Member" size="xl">
        <StaffForm onSuccess={handleFormSuccess} onCancel={() => setIsAddModalOpen(false)} />
      </Modal>

      {/* Edit Staff Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Staff Member" size="xl">
        {editingStaff && (
          <StaffForm staff={editingStaff} onSuccess={handleFormSuccess} onCancel={() => setIsEditModalOpen(false)} />
        )}
      </Modal>

      {/* Profile Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Staff Profile"
        size="xl"
      >
        {selectedStaff && <StaffProfileModal staff={selectedStaff} />}
      </Modal>
    </div>
  );
}

// ============================================================
// Staff Detail Panel Component
// ============================================================
function StaffDetailPanel({
  staff,
  onEdit,
  onViewProfile,
  canManage,
}: {
  staff: Staff;
  onEdit: () => void;
  onViewProfile: () => void;
  canManage: boolean;
}) {
  const tasks = getTasksByStaff(staff.id);
  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const isOnDuty = (() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const cur = h * 60 + m;
    const [s, e] = staff.shiftTiming.split('-');
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (end < start) return cur >= start || cur < end;
    return cur >= start && cur < end;
  })();

  return (
    <Card className="overflow-hidden">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="relative">
            {staff.profileImage ? (
              <img
                src={staff.profileImage}
                alt={staff.name}
                className="h-20 w-20 rounded-xl object-cover ring-4 ring-white/30 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                onClick={onViewProfile}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
                <UserCircle className="h-10 w-10 text-white/80" />
              </div>
            )}
            {isOnDuty && staff.isActive && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-400 ring-2 ring-white">
                <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{staff.name}</h2>
            <p className="text-primary-100 text-sm">{staff.position}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                staff.isActive ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'
              )}>
                {staff.isActive ? 'Active' : 'Inactive'}
              </span>
              {isOnDuty && staff.isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                  On Duty
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                {staff.employeeId}
              </span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={staff.email} />
          <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={staff.contactNumber} />
          <InfoItem icon={<Building2 className="h-4 w-4" />} label="Department" value={staff.department} />
          <InfoItem icon={<Clock className="h-4 w-4" />} label="Shift" value={staff.shiftTiming} />
          <InfoItem icon={<Calendar className="h-4 w-4" />} label="Joined" value={formatDate(staff.joiningDate)} />
          <InfoItem icon={<MapPin className="h-4 w-4" />} label="Address" value={staff.address} truncate />
        </div>

        {/* Task Summary */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary-500" /> Task Overview
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white dark:bg-gray-700 p-2.5 shadow-sm">
              <p className="text-lg font-bold text-amber-600">{activeTasks.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Active</p>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-700 p-2.5 shadow-sm">
              <p className="text-lg font-bold text-green-600">{completedTasks.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Completed</p>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-700 p-2.5 shadow-sm">
              <p className="text-lg font-bold text-blue-600">{tasks.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Total</p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {(staff.qualifications || staff.medicalNotes || staff.emergencyContact) && (
          <div className="space-y-2">
            {staff.qualifications && (
              <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Qualifications" value={staff.qualifications} />
            )}
            {staff.emergencyContact && (
              <InfoItem icon={<AlertCircle className="h-4 w-4" />} label="Emergency Contact" value={staff.emergencyContact} />
            )}
            {staff.medicalNotes && (
              <InfoItem icon={<Shield className="h-4 w-4" />} label="Medical Notes" value={staff.medicalNotes} />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onViewProfile}>
            View Full Profile
          </Button>
          {canManage && (
            <Button className="flex-1" onClick={onEdit}>
              <Edit className="mr-2 h-3.5 w-3.5" /> Edit Staff
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Info Item Component
// ============================================================
function InfoItem({ icon, label, value, truncate }: { icon: React.ReactNode; label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={cn('text-sm font-medium', truncate && 'truncate')}>{value}</p>
      </div>
    </div>
  );
}

// ============================================================
// Staff Profile Modal
// ============================================================
function StaffProfileModal({ staff }: { staff: Staff }) {
  const tasks = getTasksByStaff(staff.id);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-6">
        {staff.profileImage ? (
          <img
            src={staff.profileImage}
            alt={staff.name}
            className="h-28 w-28 rounded-2xl object-cover shadow-lg ring-4 ring-primary-100 dark:ring-primary-800"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-700">
            <UserCircle className="h-14 w-14 text-primary-400" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold">{staff.name}</h2>
          <p className="text-muted-foreground">{staff.position}</p>
          <p className="text-sm text-muted-foreground">{staff.employeeId} &bull; {staff.department}</p>
          <div className="flex gap-2 mt-2">
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full font-medium',
              staff.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {staff.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <DetailSection title="Contact Information">
          <DetailRow label="Email" value={staff.email} />
          <DetailRow label="Phone" value={staff.contactNumber} />
          {staff.emergencyContact && <DetailRow label="Emergency" value={staff.emergencyContact} />}
          <DetailRow label="Address" value={staff.address} />
        </DetailSection>

        <DetailSection title="Employment Details">
          <DetailRow label="Employee ID" value={staff.employeeId} />
          <DetailRow label="Department" value={staff.department} />
          <DetailRow label="Position" value={staff.position} />
          <DetailRow label="Shift" value={staff.shiftTiming} />
          <DetailRow label="Joined" value={formatDate(staff.joiningDate)} />
        </DetailSection>
      </div>

      {staff.qualifications && (
        <DetailSection title="Qualifications">
          <p className="text-sm">{staff.qualifications}</p>
        </DetailSection>
      )}

      {staff.medicalNotes && (
        <DetailSection title="Medical Information">
          <p className="text-sm">{staff.medicalNotes}</p>
        </DetailSection>
      )}

      {/* Task History */}
      <DetailSection title={`Task History (${tasks.length})`}>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tasks.slice(0, 10).map(task => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border p-2.5">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.category} &bull; Due {formatDate(task.dueDate)}</p>
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  task.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  task.status === 'in-progress' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  task.status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  task.status === 'cancelled' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                )}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4">
      <h4 className="text-sm font-semibold mb-3 text-primary-700 dark:text-primary-400">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
