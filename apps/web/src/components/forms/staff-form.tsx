import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Staff } from '../../types';
import { addStaff, updateStaffMember } from '../../store/mock-data';
import { toast } from 'sonner';
import { Copy, Check, Key, Upload, X, Camera } from 'lucide-react';

interface StaffFormProps {
  staff?: Staff;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StaffForm({ staff, onSuccess, onCancel }: StaffFormProps) {
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    employeeId: staff?.employeeId || '',
    position: staff?.position || '',
    department: staff?.department || '',
    contactNumber: staff?.contactNumber || '',
    address: staff?.address || '',
    shiftTiming: staff?.shiftTiming || '08:00-16:00',
    joiningDate: staff?.joiningDate || new Date().toISOString().split('T')[0],
    gender: staff?.gender || 'male',
    dateOfBirth: staff?.dateOfBirth || '',
    emergencyContact: staff?.emergencyContact || '',
    qualifications: staff?.qualifications || '',
    medicalNotes: staff?.medicalNotes || '',
    profileImage: staff?.profileImage || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<{ id: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string>('');
  const staffImgRef = useRef<HTMLInputElement>(null);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setFormData(prev => ({ ...prev, profileImage: ev.target?.result as string }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (staff) {
        updateStaffMember(staff.id, {
          ...formData,
          gender: formData.gender as 'male' | 'female' | 'other',
        });
        toast.success('Staff member updated successfully!');
        onSuccess();
      } else {
        const newStaff = addStaff({
          ...formData,
          userId: `staff-${Date.now()}`,
          gender: formData.gender as 'male' | 'female' | 'other',
          isActive: true,
          onDuty: false,
        });
        setGeneratedCreds({
          id: newStaff.employeeId,
          password: newStaff.generatedPassword || 'N/A',
        });
        toast.success('Staff member added with auto-generated credentials!');
      }
    } catch (error) {
      toast.error('Failed to save staff member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  if (generatedCreds) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
              <Key className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-800 dark:text-green-200">Credentials Generated!</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Save these credentials - the password cannot be recovered later.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800">
              <div>
                <p className="text-xs font-medium text-gray-500">Employee ID</p>
                <p className="text-lg font-mono font-bold">{generatedCreds.id}</p>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCreds.id, 'id')}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {copiedField === 'id' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800">
              <div>
                <p className="text-xs font-medium text-gray-500">Password</p>
                <p className="text-lg font-mono font-bold">{generatedCreds.password}</p>
              </div>
              <button
                onClick={() => copyToClipboard(generatedCreds.password, 'password')}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSuccess}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Full Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter staff member's full name"
          required
        />
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="staff@tchostel.edu"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Position"
          options={[
            { value: 'Hostel Supervisor', label: 'Hostel Supervisor' },
            { value: 'Hostel Warden', label: 'Hostel Warden' },
            { value: 'Security Officer', label: 'Security Officer' },
            { value: 'Housekeeping Supervisor', label: 'Housekeeping Supervisor' },
            { value: 'Maintenance Technician', label: 'Maintenance Technician' },
            { value: 'Cook', label: 'Cook' },
            { value: 'Electrician', label: 'Electrician' },
            { value: 'Plumber', label: 'Plumber' },
            { value: 'Office Assistant', label: 'Office Assistant' },
          ]}
          value={formData.position}
          onChange={(e) => handleChange('position', e.target.value)}
        />
        <Select
          label="Department"
          options={[
            { value: 'Administration', label: 'Administration' },
            { value: 'Hostel Operations', label: 'Hostel Operations' },
            { value: 'Security', label: 'Security' },
            { value: 'Housekeeping', label: 'Housekeeping' },
            { value: 'Maintenance', label: 'Maintenance' },
            { value: 'Kitchen', label: 'Kitchen' },
          ]}
          value={formData.department}
          onChange={(e) => handleChange('department', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Shift Timing"
          options={[
            { value: '05:00-13:00', label: 'Morning (05:00 - 13:00)' },
            { value: '06:00-14:00', label: 'Day Early (06:00 - 14:00)' },
            { value: '08:00-16:00', label: 'Day (08:00 - 16:00)' },
            { value: '08:00-20:00', label: 'Extended Day (08:00 - 20:00)' },
            { value: '14:00-22:00', label: 'Evening (14:00 - 22:00)' },
            { value: '22:00-06:00', label: 'Night (22:00 - 06:00)' },
          ]}
          value={formData.shiftTiming}
          onChange={(e) => handleChange('shiftTiming', e.target.value)}
        />
        <Select
          label="Gender"
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
          value={formData.gender}
          onChange={(e) => handleChange('gender', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Contact Number"
          value={formData.contactNumber}
          onChange={(e) => handleChange('contactNumber', e.target.value)}
          placeholder="9876543210"
          required
        />
        <Input
          label="Emergency Contact"
          value={formData.emergencyContact}
          onChange={(e) => handleChange('emergencyContact', e.target.value)}
          placeholder="Emergency contact number"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date of Birth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => handleChange('dateOfBirth', e.target.value)}
        />
        <Input
          label="Joining Date"
          type="date"
          value={formData.joiningDate}
          onChange={(e) => handleChange('joiningDate', e.target.value)}
          required
        />
      </div>

      <Input
        label="Address"
        value={formData.address}
        onChange={(e) => handleChange('address', e.target.value)}
        placeholder="Full address"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Qualifications"
          value={formData.qualifications}
          onChange={(e) => handleChange('qualifications', e.target.value)}
          placeholder="e.g., B.Tech, ITI Electrician"
        />
        <div>
          <label className="block text-sm font-medium mb-2">Profile Image</label>
          {formData.profileImage ? (
            <div className="relative inline-block">
              <img src={formData.profileImage} alt="Staff" className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200" />
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, profileImage: '' }))} className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 shadow-md">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div>
              <input ref={staffImgRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileUpload} />
              <Button type="button" variant="outline" onClick={() => staffImgRef.current?.click()} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
            </div>
          )}
        </div>
      </div>

      <Input
        label="Medical Notes (Optional)"
        value={formData.medicalNotes}
        onChange={(e) => handleChange('medicalNotes', e.target.value)}
        placeholder="Any medical conditions or allergies"
      />

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {staff ? 'Update Staff' : 'Add Staff Member'}
        </Button>
      </div>
    </form>
  );
}
