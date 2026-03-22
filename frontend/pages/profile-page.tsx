import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/modal';
import { useAuthStore } from '../store/auth-store';
import { mockStudents, mockStaff, updateStudent, updateStaffMember, updateUser } from '../store/mock-data';
import { Student, Staff } from '../types';
import { Edit, Camera, Save, X, Upload, Image, Star, Sparkles, User, AlertTriangle, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser: updateAuthUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Find the matching record based on role
  const studentData = mockStudents.find(
    s => s.userId === user?.id || s.email === user?.email
  );
  const staffData = mockStaff.find(
    s => s.userId === user?.id || s.email === user?.email
  );

  const isStaffUser = user?.role === 'staff' || user?.role === 'warden' || user?.role === 'admin';
  const profileRecord = isStaffUser ? staffData : studentData;
  
  // Unified form data — works for both students and staff
  const [formData, setFormData] = useState({
    name: profileRecord?.name || user?.name || '',
    email: profileRecord?.email || user?.email || '',
    enrollmentNumber: (studentData as Student | undefined)?.enrollmentNumber || '',
    employeeId: (staffData as Staff | undefined)?.employeeId || '',
    course: (studentData as Student | undefined)?.course || '',
    year: (studentData as Student | undefined)?.year?.toString() || '1',
    gender: profileRecord?.gender || 'male',
    dateOfBirth: (profileRecord as any)?.dateOfBirth || '',
    contactNumber: profileRecord?.contactNumber || '',
    address: profileRecord?.address || '',
    guardianName: (studentData as Student | undefined)?.guardianName || '',
    guardianContact: (studentData as Student | undefined)?.guardianContact || '',
    emergencyContact: profileRecord?.emergencyContact || '',
    medicalNotes: profileRecord?.medicalNotes || '',
    position: (staffData as Staff | undefined)?.position || '',
    department: (staffData as Staff | undefined)?.department || '',
    shiftTiming: (staffData as Staff | undefined)?.shiftTiming || '',
    qualifications: (staffData as Staff | undefined)?.qualifications || '',
    joiningDate: profileRecord?.joiningDate || '',
  });

  const handleSave = async () => {
    try {
      if (studentData && !isStaffUser) {
        // Student profile save
        const updatedData = {
          ...formData,
          year: parseInt(formData.year),
          gender: formData.gender as 'male' | 'female' | 'other',
        };
        updateStudent(studentData.id, updatedData);
      } else if (staffData && isStaffUser) {
        // Staff profile save
        updateStaffMember(staffData.id, {
          name: formData.name,
          email: formData.email,
          contactNumber: formData.contactNumber,
          address: formData.address,
          gender: formData.gender as 'male' | 'female' | 'other',
          dateOfBirth: formData.dateOfBirth,
          emergencyContact: formData.emergencyContact,
          medicalNotes: formData.medicalNotes,
          qualifications: formData.qualifications,
        });
      }
      
      // Update auth user if name or email changed
      if (formData.name !== user?.name || formData.email !== user?.email) {
        updateAuthUser({
          name: formData.name,
          email: formData.email
        });
      }
      
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      name: profileRecord?.name || user?.name || '',
      email: profileRecord?.email || user?.email || '',
      enrollmentNumber: (studentData as Student | undefined)?.enrollmentNumber || '',
      employeeId: (staffData as Staff | undefined)?.employeeId || '',
      course: (studentData as Student | undefined)?.course || '',
      year: (studentData as Student | undefined)?.year?.toString() || '1',
      gender: profileRecord?.gender || 'male',
      dateOfBirth: (profileRecord as any)?.dateOfBirth || '',
      contactNumber: profileRecord?.contactNumber || '',
      address: profileRecord?.address || '',
      guardianName: (studentData as Student | undefined)?.guardianName || '',
      guardianContact: (studentData as Student | undefined)?.guardianContact || '',
      emergencyContact: profileRecord?.emergencyContact || '',
      medicalNotes: profileRecord?.medicalNotes || '',
      position: (staffData as Staff | undefined)?.position || '',
      department: (staffData as Staff | undefined)?.department || '',
      shiftTiming: (staffData as Staff | undefined)?.shiftTiming || '',
      qualifications: (staffData as Staff | undefined)?.qualifications || '',
      joiningDate: profileRecord?.joiningDate || '',
    });
    setIsEditing(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // In a real app, this would upload to a storage service
      // For now, we'll use a placeholder URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setSelectedImage(imageUrl);
      };
      reader.readAsDataURL(file);

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Image uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveImage = () => {
    if (selectedImage && user) {
      // Update user profile image
      updateAuthUser({ profileImage: selectedImage });
      
      // Update student or staff data
      if (studentData && !isStaffUser) {
        updateStudent(studentData.id, { profileImage: selectedImage });
      } else if (staffData && isStaffUser) {
        updateStaffMember(staffData.id, { profileImage: selectedImage });
      }
      
      toast.success('Profile picture updated successfully!');
      setIsImageModalOpen(false);
      setSelectedImage(null);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Enhanced header with gradient background */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="absolute inset-0 bg-pattern-dots opacity-30"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Sparkles className="h-8 w-8 text-primary-200 animate-pulse" />
            <div>
              <h1 className="text-4xl font-bold mb-2">{t('header.myProfile')}</h1>
              <p className="text-primary-100 text-lg">{t('header.managePersonalInfo')}</p>
            </div>
          </div>
          
          {user?.role === 'admin' && (
            !isEditing ? (
              <Button 
                onClick={() => setIsEditing(true)}
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 backdrop-blur-sm"
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('header.editProfile')}
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 backdrop-blur-sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-white text-primary-700 hover:bg-white/90 shadow-lg"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {t('header.saveChanges')}
                </Button>
              </div>
            )
          )}
          {user?.role !== 'admin' && (
            <span className="text-sm text-primary-200 bg-white/10 px-3 py-1.5 rounded-full">
              {t('header.viewOnly')}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Enhanced profile picture section */}
        <Card className="bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-primary-900/20 dark:via-card dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Camera className="h-6 w-6 text-primary-600" />
              <span>Profile Picture</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="relative mx-auto mb-6 h-40 w-40 group">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="h-40 w-40 rounded-full object-cover border-4 border-white shadow-2xl group-hover:shadow-3xl transition-all duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-primary-200 via-primary-300 to-primary-400 text-5xl font-bold text-primary-700 border-4 border-white shadow-2xl group-hover:shadow-3xl transition-all duration-300 hover:scale-105">
                  {user.name.charAt(0)}
                </div>
              )}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="absolute bottom-2 right-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 p-3 text-white hover:from-primary-700 hover:to-primary-800 shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 border-3 border-white group-hover:animate-pulse"
                  title="Change profile picture"
                >
                  <Camera className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                {user.name}
              </h3>
              <p className="text-muted-foreground capitalize font-semibold text-lg">{user.role}</p>
              {!isStaffUser && studentData?.enrollmentNumber && (
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-100 to-primary-200 px-3 py-2 rounded-full border border-primary-300">
                  <Star className="h-4 w-4 text-primary-600" />
                  <span className="text-sm font-mono font-bold text-primary-700">
                    {studentData.enrollmentNumber}
                  </span>
                </div>
              )}
              {isStaffUser && staffData?.employeeId && (
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-blue-200 px-3 py-2 rounded-full border border-blue-300">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-mono font-bold text-blue-700">
                    {staffData.employeeId}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced personal information */}
        <Card className="md:col-span-2 bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-card dark:via-card/80 dark:to-card border-2 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-6 w-6 text-primary-600" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {isStaffUser ? (
                <Input
                  label="Employee ID"
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
              ) : (
                <Input
                  label="Enrollment Number"
                  value={formData.enrollmentNumber}
                  onChange={(e) => handleChange('enrollmentNumber', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
                />
              )}
              <Input
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Select
                label="Gender"
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Contact Number"
                value={formData.contactNumber}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
              />
            </div>

            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              disabled={!isEditing}
              className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
            />
          </CardContent>
        </Card>

        {/* Role-specific information */}
        {isStaffUser ? (
          <Card className="md:col-span-3 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-blue-900/20 dark:via-card dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-6 w-6 text-blue-600" />
                <span>Professional Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Position / Designation"
                  value={formData.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
                />
                <Input
                  label="Department"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Shift Timing"
                  value={formData.shiftTiming}
                  onChange={(e) => handleChange('shiftTiming', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
                />
                <Input
                  label="Joining Date"
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleChange('joiningDate', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
                />
              </div>
              <Input
                label="Qualifications"
                value={formData.qualifications}
                onChange={(e) => handleChange('qualifications', e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="md:col-span-3 bg-gradient-to-br from-secondary-50 via-white to-secondary-100 dark:from-secondary-900/20 dark:via-card dark:to-secondary-800/20 border-2 border-secondary-200 dark:border-secondary-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-secondary-600" />
                <span>Academic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Course"
                  value={formData.course}
                  onChange={(e) => handleChange('course', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
                />
                <Select
                  label="Year"
                  options={[
                    { value: '1', label: '1st Year' },
                    { value: '2', label: '2nd Year' },
                    { value: '3', label: '3rd Year' },
                    { value: '4', label: '4th Year' },
                  ]}
                  value={formData.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced emergency contacts */}
        <Card className="md:col-span-3 bg-gradient-to-br from-warning-50 via-white to-warning-100 dark:from-warning-900/20 dark:via-card dark:to-warning-800/20 border-2 border-warning-200 dark:border-warning-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-warning-600" />
              <span>Emergency Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isStaffUser && (
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Guardian Name"
                  value={formData.guardianName}
                  onChange={(e) => handleChange('guardianName', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
                />
                <Input
                  label="Guardian Contact"
                  value={formData.guardianContact}
                  onChange={(e) => handleChange('guardianContact', e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
                />
              </div>
            )}

            <Input
              label="Emergency Contact"
              value={formData.emergencyContact}
              onChange={(e) => handleChange('emergencyContact', e.target.value)}
              disabled={!isEditing}
              className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
            />

            <Input
              label="Medical Notes (Optional)"
              value={formData.medicalNotes}
              onChange={(e) => handleChange('medicalNotes', e.target.value)}
              disabled={!isEditing}
              placeholder="Any medical conditions or allergies"
              className={!isEditing ? 'bg-gray-50 dark:bg-gray-800' : ''}
            />
          </CardContent>
        </Card>
      </div>

      {/* Enhanced profile picture upload modal */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title="Change Profile Picture"
        size="sm"
      >
        <div className="space-y-8">
          {/* Enhanced current image preview */}
          <div className="text-center">
            <div className="mx-auto mb-4 h-32 w-32 relative group">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="h-32 w-32 rounded-full object-cover border-4 border-primary-200 shadow-xl group-hover:shadow-2xl transition-all duration-300"
                />
              ) : user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="h-32 w-32 rounded-full object-cover border-4 border-primary-200 shadow-xl group-hover:shadow-2xl transition-all duration-300"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 text-3xl font-bold text-primary-600 border-4 border-primary-200 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {selectedImage ? '✨ New profile picture preview' : '📸 Current profile picture'}
            </p>
          </div>

          {/* Enhanced upload section */}
          <div className="space-y-4">
            <div className="rounded-2xl border-3 border-dashed border-primary-300 p-8 text-center hover:border-primary-400 transition-all duration-300 bg-gradient-to-br from-primary-50/50 to-white dark:from-primary-900/10 dark:to-card hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 shadow-lg">
                <Upload className="h-8 w-8 text-primary-600" />
              </div>
              <p className="mb-2 text-lg font-bold text-primary-800 dark:text-primary-200">Upload New Picture</p>
              <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                JPG, PNG, GIF up to 5MB<br />
                <span className="text-xs">Recommended: 400x400px square image</span>
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploadingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingImage}
                  className="pointer-events-none bg-gradient-to-r from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 border-2 border-primary-300 hover:border-primary-400"
                >
                  {isUploadingImage ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                      <span className="animate-pulse">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Image className="mr-2 h-5 w-5" />
                      Choose Image
                    </>
                  )}
                </Button>
              </label>
            </div>
          </div>

          {/* Enhanced action buttons */}
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImageModalOpen(false);
                setSelectedImage(null);
              }}
              className="hover:scale-[1.02] transition-transform"
            >
              Cancel
            </Button>
            {selectedImage && (
              <Button 
                onClick={handleSaveImage}
                className="bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Picture
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}