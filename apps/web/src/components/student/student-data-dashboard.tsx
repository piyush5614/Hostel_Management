import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Modal } from '../ui/modal';
import {
  getAllEnhancedStudents,
  enhancedMockStaff,
  getHistoricalAttendance
} from '../../store/enhanced-mock-data';
import { Student } from '../../types';
import { Users, Search, Download, Eye, CircleUser as UserCircle, Phone, Mail, MapPin, Calendar, BookOpen, Heart, AlertTriangle, CheckCircle2, Clock, Filter, Grid2x2 as Grid, List, Star, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface StudentDataDashboardProps {
  userRole: string;
}

export function StudentDataDashboard({ userRole }: StudentDataDashboardProps) {
  const [students] = useState(getAllEnhancedStudents());
  const [filteredStudents, setFilteredStudents] = useState(students);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    course: '',
    year: '',
    gender: '',
    status: '',
    roomStatus: ''
  });

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const courses = [...new Set(students.map(s => s.course))];
    const years = [...new Set(students.map(s => s.year))].sort();
    
    return {
      courses: courses.map(c => ({ value: c, label: c })),
      years: years.map(y => ({ value: y.toString(), label: `Year ${y}` }))
    };
  }, [students]);

  // Apply filters and search
  const applyFilters = () => {
    let result = [...students];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(student =>
        student.name.toLowerCase().includes(query) ||
        student.enrollmentNumber.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.course.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (filters.course) {
      result = result.filter(s => s.course === filters.course);
    }
    if (filters.year) {
      result = result.filter(s => s.year.toString() === filters.year);
    }
    if (filters.gender) {
      result = result.filter(s => s.gender === filters.gender);
    }
    if (filters.status) {
      result = result.filter(s => s.currentStatus === filters.status);
    }
    if (filters.roomStatus) {
      if (filters.roomStatus === 'allocated') {
        result = result.filter(s => s.roomId && s.bedId);
      } else if (filters.roomStatus === 'unallocated') {
        result = result.filter(s => !s.roomId || !s.bedId);
      }
    }

    setFilteredStudents(result);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Apply filters when dependencies change
  React.useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, students]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setFilters({
      course: '',
      year: '',
      gender: '',
      status: '',
      roomStatus: ''
    });
  };

  // Get student statistics
  const getStudentStats = () => {
    const total = students.length;
    const present = students.filter(s => s.currentStatus === 'present').length;
    const onLeave = students.filter(s => s.currentStatus === 'on-leave').length;
    const allocated = students.filter(s => s.roomId && s.bedId).length;
    const unallocated = total - allocated;

    return { total, present, onLeave, allocated, unallocated };
  };

  // Export student data
  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Student data exported successfully in ${format.toUpperCase()} format!`);
    } catch (error) {
      toast.error('Failed to export student data');
    } finally {
      setIsExporting(false);
    }
  };

  // Open student detail modal
  const openStudentDetail = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  // Get attendance percentage for student
  const getAttendancePercentage = (studentId: string): number => {
    const attendance = getHistoricalAttendance().filter(a => a.studentId === studentId);
    if (attendance.length === 0) return 100;
    
    const presentCount = attendance.filter(a => 
      a.morningStatus === 'present' && a.eveningStatus === 'present'
    ).length;
    
    return Math.round((presentCount / attendance.length) * 100);
  };

  const stats = getStudentStats();

  return (
    <div className="space-y-6">
      {/* Enhanced header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="absolute inset-0 bg-pattern-dots opacity-30"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm border border-white/30">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Student Data Dashboard</h1>
              <p className="text-primary-100 text-lg">Comprehensive student information management</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30 text-center">
              <div className="text-2xl font-bold">{filteredStudents.length}</div>
              <div className="text-sm text-primary-200">Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-primary-600 to-primary-700 p-2 shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary-800 dark:text-primary-200">Total Students</p>
                <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-2 border-success-200 dark:border-success-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-success-600 to-success-700 p-2 shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-success-800 dark:text-success-200">Present</p>
                <p className="text-2xl font-bold text-success-900 dark:text-success-100">{stats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20 border-2 border-warning-200 dark:border-warning-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-warning-600 to-warning-700 p-2 shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-warning-800 dark:text-warning-200">On Leave</p>
                <p className="text-2xl font-bold text-warning-900 dark:text-warning-100">{stats.onLeave}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 border-2 border-secondary-200 dark:border-secondary-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-secondary-600 to-secondary-700 p-2 shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-secondary-800 dark:text-secondary-200">Room Allocated</p>
                <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{stats.allocated}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-error-50 to-error-100 dark:from-error-900/20 dark:to-error-800/20 border-2 border-error-200 dark:border-error-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gradient-to-r from-error-600 to-error-700 p-2 shadow-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-error-800 dark:text-error-200">Unallocated</p>
                <p className="text-2xl font-bold text-error-900 dark:text-error-100">{stats.unallocated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters and Controls */}
      <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-card dark:via-card/80 dark:to-card border-2 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-6 w-6 text-primary-600" />
              <span>Search & Filters</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="hover:scale-105 transition-transform"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="hover:scale-105 transition-transform"
                >
                  <Download className="mr-1 h-3 w-3" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                  className="hover:scale-105 transition-transform"
                >
                  <Download className="mr-1 h-3 w-3" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="relative">
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <Select
              options={[
                { value: '', label: 'All Courses' },
                ...filterOptions.courses
              ]}
              value={filters.course}
              onChange={(e) => handleFilterChange('course', e.target.value)}
            />

            <Select
              options={[
                { value: '', label: 'All Years' },
                ...filterOptions.years
              ]}
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
            />

            <Select
              options={[
                { value: '', label: 'All Genders' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' }
              ]}
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
            />

            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'present', label: 'Present' },
                { value: 'on-leave', label: 'On Leave' },
                { value: 'absent', label: 'Absent' }
              ]}
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            />

            <Button 
              variant="outline" 
              onClick={resetFilters}
              className="hover:scale-105 transition-transform"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary-600" />
              <span>Students ({filteredStudents.length})</span>
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'grid' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredStudents.map((student) => (
                <Card 
                  key={student.id} 
                  className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-card dark:via-card/80 dark:to-card border-2 border-gray-200 dark:border-gray-700 group"
                  onClick={() => openStudentDetail(student)}
                >
                  <CardContent className="p-4">
                    <div className="text-center space-y-3">
                      {/* Profile Photo */}
                      <div className="relative mx-auto">
                        {student.profileImage ? (
                          <img
                            src={student.profileImage}
                            alt={student.name}
                            className="h-20 w-20 rounded-full object-cover border-3 border-white shadow-lg group-hover:shadow-xl transition-all duration-300"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 text-primary-700 text-xl font-bold border-3 border-white shadow-lg group-hover:shadow-xl transition-all duration-300">
                            {student.name.charAt(0)}
                          </div>
                        )}
                        
                        {/* Status Indicator */}
                        <div className={cn(
                          'absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg',
                          student.currentStatus === 'present' && 'bg-gradient-to-r from-success-500 to-success-600',
                          student.currentStatus === 'on-leave' && 'bg-gradient-to-r from-warning-500 to-warning-600',
                          student.currentStatus === 'absent' && 'bg-gradient-to-r from-error-500 to-error-600'
                        )}>
                          {student.currentStatus === 'present' && <CheckCircle2 className="h-3 w-3 text-white" />}
                          {student.currentStatus === 'on-leave' && <Clock className="h-3 w-3 text-white" />}
                          {student.currentStatus === 'absent' && <AlertTriangle className="h-3 w-3 text-white" />}
                        </div>
                      </div>

                      {/* Student Info */}
                      <div>
                        <h3 className="font-bold text-lg group-hover:text-primary-700 transition-colors">{student.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono font-bold">{student.enrollmentNumber}</p>
                        <p className="text-sm text-primary-600 font-semibold">{student.course}</p>
                        <p className="text-xs text-muted-foreground">Year {student.year}</p>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex justify-between text-xs">
                        <div className="text-center">
                          <div className="font-bold text-success-600">{getAttendancePercentage(student.id)}%</div>
                          <div className="text-muted-foreground">Attendance</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-primary-600">
                            {student.roomId ? `Room ${student.roomId}` : 'Unallocated'}
                          </div>
                          <div className="text-muted-foreground">Room</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={cn(
                        'inline-flex items-center space-x-1 rounded-full px-3 py-1 text-xs font-bold',
                        student.currentStatus === 'present' && 'bg-gradient-to-r from-success-100 to-success-200 text-success-800 border border-success-300',
                        student.currentStatus === 'on-leave' && 'bg-gradient-to-r from-warning-100 to-warning-200 text-warning-800 border border-warning-300',
                        student.currentStatus === 'absent' && 'bg-gradient-to-r from-error-100 to-error-200 text-error-800 border border-error-300'
                      )}>
                        <span className="capitalize">{student.currentStatus.replace('-', ' ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <Card 
                  key={student.id}
                  className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01] bg-gradient-to-r from-white to-gray-50/50 dark:from-card dark:to-card/80 border border-gray-200 dark:border-gray-700"
                  onClick={() => openStudentDetail(student)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {/* Profile Photo */}
                      {student.profileImage ? (
                        <img
                          src={student.profileImage}
                          alt={student.name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-lg"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 text-primary-700 text-lg font-bold border-2 border-white shadow-lg">
                          {student.name.charAt(0)}
                        </div>
                      )}

                      {/* Student Details */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-lg">{student.name}</h3>
                          <div className={cn(
                            'inline-flex items-center space-x-1 rounded-full px-3 py-1 text-xs font-bold',
                            student.currentStatus === 'present' && 'bg-success-100 text-success-800',
                            student.currentStatus === 'on-leave' && 'bg-warning-100 text-warning-800',
                            student.currentStatus === 'absent' && 'bg-error-100 text-error-800'
                          )}>
                            <span className="capitalize">{student.currentStatus.replace('-', ' ')}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground font-semibold">Enrollment</p>
                            <p className="font-mono font-bold">{student.enrollmentNumber}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold">Course</p>
                            <p className="font-bold">{student.course}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold">Year</p>
                            <p className="font-bold">Year {student.year}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold">Room</p>
                            <p className="font-bold">{student.roomId ? `Room ${student.roomId}` : 'Unallocated'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-col space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudentDetail(student);
                          }}
                          className="hover:scale-105 transition-transform"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        <div className="text-center">
                          <div className="text-xs font-bold text-success-600">{getAttendancePercentage(student.id)}%</div>
                          <div className="text-xs text-muted-foreground">Attendance</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredStudents.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center shadow-xl">
                <Users className="h-12 w-12 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Students Found</h3>
              <p className="text-lg">Try adjusting your search criteria or filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Student Profile Details"
        size="xl"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Student Header */}
            <Card className="bg-gradient-to-r from-primary-50 via-white to-secondary-50 dark:from-primary-900/20 dark:via-card dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-6">
                  {selectedStudent.profileImage ? (
                    <img
                      src={selectedStudent.profileImage}
                      alt={selectedStudent.name}
                      className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-xl"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 text-primary-700 text-2xl font-bold border-4 border-white shadow-xl">
                      {selectedStudent.name.charAt(0)}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-primary-800 dark:text-primary-200 mb-2">{selectedStudent.name}</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-primary-600" />
                        <span className="font-semibold">{selectedStudent.enrollmentNumber}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-primary-600" />
                        <span>{selectedStudent.course} - Year {selectedStudent.year}</span>
                      </div>
                    </div>
                    
                    <div className={cn(
                      'inline-flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-bold mt-3',
                      selectedStudent.currentStatus === 'present' && 'bg-gradient-to-r from-success-100 to-success-200 text-success-800 border border-success-300',
                      selectedStudent.currentStatus === 'on-leave' && 'bg-gradient-to-r from-warning-100 to-warning-200 text-warning-800 border border-warning-300',
                      selectedStudent.currentStatus === 'absent' && 'bg-gradient-to-r from-error-100 to-error-200 text-error-800 border border-error-300'
                    )}>
                      <span className="capitalize">{selectedStudent.currentStatus.replace('-', ' ')}</span>
                      <Star className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Information Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserCircle className="h-5 w-5 text-primary-600" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-muted-foreground">Date of Birth</p>
                      <p className="font-bold">{new Date(selectedStudent.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Gender</p>
                      <p className="font-bold capitalize">{selectedStudent.gender}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Contact</p>
                      <p className="font-bold">{selectedStudent.contactNumber}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Email</p>
                      <p className="font-bold text-primary-600">{selectedStudent.email}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">Address</p>
                    <p className="text-sm font-medium">{selectedStudent.address}</p>
                  </div>
                  
                  {selectedStudent.medicalNotes && (
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">Medical Notes</p>
                      <p className="text-sm font-medium text-warning-700 bg-warning-50 p-2 rounded-lg">
                        {selectedStudent.medicalNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-success-600" />
                    <span>Emergency Contacts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-success-50 to-success-100 p-3 rounded-lg border border-success-200">
                      <p className="font-semibold text-success-800 mb-1">Guardian</p>
                      <p className="font-bold text-success-900">{selectedStudent.guardianName}</p>
                      <p className="text-sm font-mono font-bold text-success-700">{selectedStudent.guardianContact}</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-error-50 to-error-100 p-3 rounded-lg border border-error-200">
                      <p className="font-semibold text-error-800 mb-1">Emergency Contact</p>
                      <p className="text-sm font-mono font-bold text-error-700">{selectedStudent.emergencyContact}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Academic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-secondary-600" />
                    <span>Academic Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-muted-foreground">Course</p>
                      <p className="font-bold text-secondary-700">{selectedStudent.course}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Academic Year</p>
                      <p className="font-bold">Year {selectedStudent.year}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Joining Date</p>
                      <p className="font-bold">{new Date(selectedStudent.joiningDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Attendance Rate</p>
                      <p className="font-bold text-success-600">{getAttendancePercentage(selectedStudent.id)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Room Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-warning-600" />
                    <span>Room Allocation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedStudent.roomId && selectedStudent.bedId ? (
                    <div className="bg-gradient-to-r from-success-50 to-success-100 p-4 rounded-lg border border-success-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-success-600" />
                        <span className="font-bold text-success-800">Room Allocated</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-semibold text-success-700">Room Number</p>
                          <p className="font-bold text-success-900">{selectedStudent.roomId}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-success-700">Bed Number</p>
                          <p className="font-bold text-success-900">{selectedStudent.bedId}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-error-50 to-error-100 p-4 rounded-lg border border-error-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-error-600" />
                        <span className="font-bold text-error-800">Room Not Allocated</span>
                      </div>
                      <p className="text-sm text-error-700">Student needs room assignment</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}