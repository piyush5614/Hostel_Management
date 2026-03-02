import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Student } from '../../types';
import { addStudent, updateStudent } from '../../store/mock-data';
import { toast } from 'sonner';
import { Key, Copy, Check } from 'lucide-react';

interface StudentFormProps {
  student?: Student;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StudentForm({ student, onSuccess, onCancel }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    email: student?.email || '',
    enrollmentNumber: student?.enrollmentNumber || '',
    course: student?.course || '',
    year: student?.year?.toString() || '1',
    gender: student?.gender || 'male',
    dateOfBirth: student?.dateOfBirth || '',
    contactNumber: student?.contactNumber || '',
    address: student?.address || '',
    guardianName: student?.guardianName || '',
    guardianContact: student?.guardianContact || '',
    emergencyContact: student?.emergencyContact || '',
    medicalNotes: student?.medicalNotes || '',
    joiningDate: student?.joiningDate || new Date().toISOString().split('T')[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<{ id: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const studentData = {
        ...formData,
        userId: student?.userId || Date.now().toString(),
        year: parseInt(formData.year),
        gender: formData.gender as 'male' | 'female' | 'other',
      };

      if (student) {
        // Update existing student
        updateStudent(student.id, studentData);
        toast.success('Student updated successfully!');
        onSuccess();
      } else {
        // Add new student — generates credentials automatically
        const newStudent = addStudent(studentData);
        setGeneratedCreds({
          id: newStudent.enrollmentNumber,
          password: newStudent.generatedPassword || 'N/A',
        });
        toast.success('Student added with auto-generated credentials!');
      }
    } catch (error) {
      toast.error('Failed to save student. Please try again.');
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

  // Show credentials card after successful creation
  if (generatedCreds) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
              <Key className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-800 dark:text-green-200">Student Credentials Generated!</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Save these credentials — the password cannot be recovered later.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800">
              <div>
                <p className="text-xs font-medium text-gray-500">Student ID</p>
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
          placeholder="Enter student's full name"
          required
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="student@tchostel.edu"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Enrollment Number"
          value={formData.enrollmentNumber}
          onChange={(e) => handleChange('enrollmentNumber', e.target.value)}
          placeholder="TC2024001"
          required
        />

        <Input
          label="Course"
          value={formData.course}
          onChange={(e) => handleChange('course', e.target.value)}
          placeholder="Computer Science"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
          label="Date of Birth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          required
        />

        <Input
          label="Contact Number"
          value={formData.contactNumber}
          onChange={(e) => handleChange('contactNumber', e.target.value)}
          placeholder="9876543210"
          required
        />
      </div>

      <Input
        label="Address"
        value={formData.address}
        onChange={(e) => handleChange('address', e.target.value)}
        placeholder="Complete address"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Guardian Name"
          value={formData.guardianName}
          onChange={(e) => handleChange('guardianName', e.target.value)}
          placeholder="Guardian's full name"
          required
        />

        <Input
          label="Guardian Contact"
          value={formData.guardianContact}
          onChange={(e) => handleChange('guardianContact', e.target.value)}
          placeholder="Guardian's phone number"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Emergency Contact"
          value={formData.emergencyContact}
          onChange={(e) => handleChange('emergencyContact', e.target.value)}
          placeholder="Emergency contact number"
          required
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
          {student ? 'Update Student' : 'Add Student'}
        </Button>
      </div>
    </form>
  );
}