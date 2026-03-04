import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { StudentForm } from '../../components/forms/student-form';
import { Users, Search, Plus, Edit, Trash2, UserCircle } from 'lucide-react';
import { mockStudents, deleteStudent } from '../../store/mock-data';
import { Student } from '../../types';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/auth-store';

export function StudentsPage() {
  const user = useAuthStore((state) => state.user);
  const canEdit = user?.role === 'admin' || user?.role === 'warden';
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(mockStudents);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [filter, setFilter] = useState({
    course: '',
    year: '',
    gender: '',
  });

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);

    // Apply filters
    let result = [...mockStudents];

    if (newFilter.course) {
      result = result.filter((student) => 
        student.course.toLowerCase().includes(newFilter.course.toLowerCase())
      );
    }

    if (newFilter.year) {
      result = result.filter((student) => student.year.toString() === newFilter.year);
    }

    if (newFilter.gender) {
      result = result.filter((student) => student.gender === newFilter.gender);
    }

    if (searchQuery) {
      result = result.filter((student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.enrollmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredStudents(result);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    let result = [...mockStudents];
    
    // Apply existing filters
    if (filter.course) {
      result = result.filter((student) => 
        student.course.toLowerCase().includes(filter.course.toLowerCase())
      );
    }
    
    if (filter.year) {
      result = result.filter((student) => student.year.toString() === filter.year);
    }
    
    if (filter.gender) {
      result = result.filter((student) => student.gender === filter.gender);
    }
    
    // Apply search query
    if (query) {
      result = result.filter((student) =>
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        student.enrollmentNumber.toLowerCase().includes(query.toLowerCase()) ||
        student.email.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    setFilteredStudents(result);
  };

  // Reset filters
  const resetFilters = () => {
    setFilter({
      course: '',
      year: '',
      gender: '',
    });
    setSearchQuery('');
    setFilteredStudents(mockStudents);
  };

  const handleAddStudent = () => {
    setIsAddModalOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsEditModalOpen(true);
  };

  const handleDeleteStudent = (student: Student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      if (deleteStudent(student.id)) {
        toast.success('Student deleted successfully!');
        setFilteredStudents(mockStudents);
        if (selectedStudent?.id === student.id) {
          setSelectedStudent(null);
        }
      } else {
        toast.error('Failed to delete student.');
      }
    }
  };

  const handleFormSuccess = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingStudent(null);
    setFilteredStudents(mockStudents);
    // Refresh the selected student if it was edited
    if (selectedStudent && editingStudent?.id === selectedStudent.id) {
      const updatedStudent = mockStudents.find(s => s.id === selectedStudent.id);
      setSelectedStudent(updatedStudent || null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Student Management</h1>
        {canEdit && (
          <Button onClick={handleAddStudent}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Student
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Filters */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <Input
              label="Course"
              placeholder="e.g., Computer Science"
              value={filter.course}
              onChange={(e) => handleFilterChange('course', e.target.value)}
            />

            <Select
              label="Year"
              options={[
                { value: '', label: 'All Years' },
                { value: '1', label: '1st Year' },
                { value: '2', label: '2nd Year' },
                { value: '3', label: '3rd Year' },
                { value: '4', label: '4th Year' },
              ]}
              value={filter.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
            />

            <Select
              label="Gender"
              options={[
                { value: '', label: 'All' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
              value={filter.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
            />

            <Button variant="outline" className="w-full" onClick={resetFilters}>
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Students List */}
        <div className={selectedStudent ? 'md:col-span-2' : 'md:col-span-4'}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Students ({filteredStudents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={cn(
                      'group flex items-center justify-between rounded-md border p-3 transition-colors cursor-pointer',
                      selectedStudent?.id === student.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/10'
                    )}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center space-x-3">
                      {student.profileImage ? (
                        <img
                          src={student.profileImage}
                          alt={student.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                          <UserCircle className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.enrollmentNumber} • {student.course}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {canEdit && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStudent(student);
                            }}
                            className="rounded bg-primary-600 p-1 text-white hover:bg-primary-700"
                            title="Edit student"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(student);
                            }}
                            className="rounded bg-error-600 p-1 text-white hover:bg-error-700"
                            title="Delete student"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredStudents.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  {mockStudents.length === 0 
                    ? "No students added yet. Click 'Add New Student' to get started."
                    : "No students match your search criteria"
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student Details */}
        {selectedStudent && (
        <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedStudent.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  {selectedStudent.profileImage ? (
                    <img
                      src={selectedStudent.profileImage}
                      alt={selectedStudent.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                      <UserCircle className="h-8 w-8" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                    <p className="text-muted-foreground">{selectedStudent.enrollmentNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedStudent.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Course</p>
                    <p className="text-sm">{selectedStudent.course}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Year</p>
                    <p className="text-sm">{selectedStudent.year}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Gender</p>
                    <p className="text-sm capitalize">{selectedStudent.gender}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Contact</p>
                    <p className="text-sm">{selectedStudent.contactNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Joining Date</p>
                    <p className="text-sm">{new Date(selectedStudent.joiningDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-sm">{selectedStudent.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Guardian</p>
                    <p className="text-sm">{selectedStudent.guardianName}</p>
                    <p className="text-xs text-muted-foreground">{selectedStudent.guardianContact}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                    <p className="text-sm">{selectedStudent.emergencyContact}</p>
                  </div>
                </div>

                {selectedStudent.medicalNotes && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Medical Notes</p>
                    <p className="text-sm">{selectedStudent.medicalNotes}</p>
                  </div>
                )}

                {/* Parent Images */}
                {(selectedStudent.parentImage1 || selectedStudent.parentImage2) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Parent Photos</p>
                    <div className="flex space-x-3">
                      {selectedStudent.parentImage1 && (
                        <div className="text-center">
                          <img src={selectedStudent.parentImage1} alt="Parent 1" className="w-16 h-16 rounded-lg object-cover border" />
                          <p className="text-xs text-muted-foreground mt-1">Parent 1</p>
                        </div>
                      )}
                      {selectedStudent.parentImage2 && (
                        <div className="text-center">
                          <img src={selectedStudent.parentImage2} alt="Parent 2" className="w-16 h-16 rounded-lg object-cover border" />
                          <p className="text-xs text-muted-foreground mt-1">Parent 2</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {canEdit && (
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleEditStudent(selectedStudent)}
                    >
                      Edit Student
                    </Button>
                    <Button 
                      className="flex-1"
                      disabled={selectedStudent.roomId ? true : false}
                    >
                      {selectedStudent.roomId ? 'Room Allocated' : 'Allocate Room'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student"
        size="xl"
      >
        <StudentForm
          onSuccess={handleFormSuccess}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student"
        size="xl"
      >
        {editingStudent && (
          <StudentForm
            student={editingStudent}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsEditModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}