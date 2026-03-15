import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Modal } from '../components/ui/modal';
import { useAuthStore } from '../store/auth-store';
import { 
  mockAttendance, 
  mockStudents, 
  mockRooms,
  createAttendanceSheet,
  submitAttendanceToAdmin,
  syncAttendanceFromApi,
  upsertAttendanceRecords,
  exportData,
  getLinkedStudentId
} from '../store/mock-data';
import { AttendanceSheet, Attendance } from '../types';
import { Calendar, Download, Send, Users, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useDataRefresh } from '../utils/use-data-refresh';
import { EVENTS } from '../utils/event-bus';

export function AttendancePage() {
  const user = useAuthStore((state) => state.user);
  const refreshKey = useDataRefresh([EVENTS.ATTENDANCE_UPDATED, EVENTS.STUDENT_UPDATED]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Record<string, { morning: string; evening: string; remarks: string }>>({});
  const [isExporting, setIsExporting] = useState(false);

  const isStudent = user?.role === 'student';
  const canManageAttendance = user?.role === 'admin' || user?.role === 'warden' || user?.role === 'staff';

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    void syncAttendanceFromApi();
  }, [user?.id, isStudent]);

  // For student: resolve their linked student record
  const myStudentId = useMemo(() => {
    if (!isStudent || !user?.id) return null;
    return getLinkedStudentId(user.id, user.email);
  }, [user?.id, isStudent]);

  const myStudent = useMemo(() => {
    if (!myStudentId) return null;
    return mockStudents.find(s => s.id === myStudentId) ?? null;
  }, [myStudentId, refreshKey]);

  // Student personal attendance records
  const myAttendanceRecords = useMemo(() => {
    if (!myStudentId) return [];
    return mockAttendance
      .filter(a => a.studentId === myStudentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [myStudentId, refreshKey]);

  // Student personal stats
  const myStats = useMemo(() => {
    if (!myStudentId) return null;
    const records = myAttendanceRecords;
    const totalDays = records.length;
    const morningPresent = records.filter(a => a.morningStatus === 'present').length;
    const eveningPresent = records.filter(a => a.eveningStatus === 'present').length;
    const totalSessions = totalDays * 2;
    const presentSessions = morningPresent + eveningPresent;
    const attendancePercent = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
    return { totalDays, morningPresent, eveningPresent, attendancePercent, totalSessions, presentSessions };
  }, [myAttendanceRecords, refreshKey]);

  // Get students for attendance marking
  const getStudentsForAttendance = () => {
    let students = mockStudents.filter(s => s.isActive);
    
    if (selectedRoom) {
      students = students.filter(s => s.roomId === selectedRoom);
    } else if (selectedFloor) {
      const floorRooms = mockRooms.filter(r => r.floor.toString() === selectedFloor);
      const floorRoomIds = floorRooms.map(r => r.id);
      students = students.filter(s => s.roomId && floorRoomIds.includes(s.roomId));
    }
    
    return students;
  };

  // Get today's attendance statistics
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = mockAttendance.filter(a => a.date === today);
    
    const totalStudents = mockStudents.filter(s => s.isActive).length;
    const morningPresent = todayAttendance.filter(a => a.morningStatus === 'present').length;
    const eveningPresent = todayAttendance.filter(a => a.eveningStatus === 'present').length;
    
    return {
      totalStudents,
      morningPresent,
      eveningPresent,
      morningPercentage: totalStudents > 0 ? Math.round((morningPresent / totalStudents) * 100) : 0,
      eveningPercentage: totalStudents > 0 ? Math.round((eveningPresent / totalStudents) * 100) : 0,
    };
  };

  const handleMarkAttendance = () => {
    const students = getStudentsForAttendance();
    const initialData: Record<string, { morning: string; evening: string; remarks: string }> = {};
    
    students.forEach(student => {
      // Check if attendance already exists for this date
      const existingAttendance = mockAttendance.find(
        a => a.studentId === student.id && a.date === selectedDate
      );
      
      initialData[student.id] = {
        morning: existingAttendance?.morningStatus || 'present',
        evening: existingAttendance?.eveningStatus || 'present',
        remarks: existingAttendance?.remarks || ''
      };
    });
    
    setAttendanceData(initialData);
    setIsMarkingAttendance(true);
  };

  const handleSaveAttendance = async () => {
    const students = getStudentsForAttendance();

    const records: Omit<Attendance, 'id' | 'recordedAt'>[] = students
      .filter((student) => Boolean(attendanceData[student.id]))
      .map((student) => ({
        studentId: student.id,
        date: selectedDate,
        morningStatus: attendanceData[student.id].morning as 'present' | 'absent' | 'leave',
        eveningStatus: attendanceData[student.id].evening as 'present' | 'absent' | 'leave',
        remarks: attendanceData[student.id].remarks,
        recordedBy: user?.id || '',
      }));

    await upsertAttendanceRecords(records);

    // Create attendance sheet
    createAttendanceSheet({
      date: selectedDate,
      roomId: selectedRoom || undefined,
      floor: selectedFloor ? parseInt(selectedFloor) : undefined,
      recordedBy: user?.id || '',
      students: students.map(student => ({
        studentId: student.id,
        name: student.name,
        enrollmentNumber: student.enrollmentNumber,
        morningStatus: attendanceData[student.id]?.morning as 'present' | 'absent' | 'leave',
        eveningStatus: attendanceData[student.id]?.evening as 'present' | 'absent' | 'leave',
        remarks: attendanceData[student.id]?.remarks
      })),
      submittedToAdmin: false,
      adminReviewed: false
    });

    toast.success('Attendance saved successfully!');
    setIsMarkingAttendance(false);
    setAttendanceData({});
  };

  const handleSubmitToAdmin = (sheetId: string) => {
    submitAttendanceToAdmin(sheetId);
    toast.success('Attendance sheet submitted to admin!');
  };

  const handleExportAttendance = async () => {
    setIsExporting(true);
    try {
      const result = await exportData('attendance', 'excel', {
        date: selectedDate,
        room: selectedRoom,
        floor: selectedFloor
      });
      toast.success('Attendance report exported successfully!');
    } catch (error) {
      toast.error('Failed to export attendance report');
    } finally {
      setIsExporting(false);
    }
  };

  const updateAttendanceData = (studentId: string, field: string, value: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const stats = getTodayStats();
  const studentsForAttendance = getStudentsForAttendance();

  // ======== STUDENT PERSONAL VIEW ========
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Attendance</h1>
        </div>

        {/* Personal Stats */}
        {myStats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium">Attendance Rate</p>
                    <p className="text-2xl font-bold">{myStats.attendancePercent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-sm font-medium">Total Days</p>
                    <p className="text-2xl font-bold">{myStats.totalDays}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-success-500" />
                  <div>
                    <p className="text-sm font-medium">Morning Present</p>
                    <p className="text-2xl font-bold">{myStats.morningPresent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-success-500" />
                  <div>
                    <p className="text-sm font-medium">Evening Present</p>
                    <p className="text-2xl font-bold">{myStats.eveningPresent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Personal Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {myAttendanceRecords.length > 0 ? (
              <div className="space-y-3">
                {myAttendanceRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-5 w-5 text-primary-500" />
                      <div>
                        <p className="font-medium">{new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        {record.remarks && <p className="text-xs text-muted-foreground">{record.remarks}</p>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Morning</p>
                        <span className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          record.morningStatus === 'present' && 'bg-success-100 text-success-700',
                          record.morningStatus === 'absent' && 'bg-error-100 text-error-700',
                          record.morningStatus === 'leave' && 'bg-warning-100 text-warning-700'
                        )}>
                          {record.morningStatus}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Evening</p>
                        <span className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          record.eveningStatus === 'present' && 'bg-success-100 text-success-700',
                          record.eveningStatus === 'absent' && 'bg-error-100 text-error-700',
                          record.eveningStatus === 'leave' && 'bg-warning-100 text-warning-700'
                        )}>
                          {record.eveningStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Calendar className="mx-auto mb-4 h-12 w-12 opacity-30" />
                <p>No attendance records found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ======== ADMIN / STAFF / WARDEN VIEW ========

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleExportAttendance}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Report'}
          </Button>
          {canManageAttendance && (
            <Button onClick={handleMarkAttendance}>
              <Calendar className="mr-2 h-4 w-4" />
              Mark Attendance
            </Button>
          )}
        </div>
      </div>

      {/* Today's Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary-500" />
              <div>
                <p className="text-sm font-medium">Total Students</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success-500" />
              <div>
                <p className="text-sm font-medium">Morning Present</p>
                <p className="text-2xl font-bold">{stats.morningPresent}</p>
                <p className="text-xs text-muted-foreground">{stats.morningPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success-500" />
              <div>
                <p className="text-sm font-medium">Evening Present</p>
                <p className="text-2xl font-bold">{stats.eveningPresent}</p>
                <p className="text-xs text-muted-foreground">{stats.eveningPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-error-500" />
              <div>
                <p className="text-sm font-medium">Absent</p>
                <p className="text-2xl font-bold">
                  {stats.totalStudents - stats.morningPresent}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              label="Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <Select
              label="Floor"
              options={[
                { value: '', label: 'All Floors' },
                ...[...new Set(mockRooms.map(r => r.floor))].sort((a, b) => a - b).map(floor => ({
                  value: floor.toString(),
                  label: `Floor ${floor}`
                }))
              ]}
              value={selectedFloor}
              onChange={(e) => {
                setSelectedFloor(e.target.value);
                setSelectedRoom(''); // Clear room selection when floor changes
              }}
            />
            <Select
              label="Room"
              options={[
                { value: '', label: 'All Rooms' },
                ...mockRooms
                  .filter(room => !selectedFloor || room.floor.toString() === selectedFloor)
                  .map(room => ({
                    value: room.id,
                    label: `Room ${room.number}`
                  }))
              ]}
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            />
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setSelectedRoom('');
                  setSelectedFloor('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>
            Attendance Overview - {new Date(selectedDate).toLocaleDateString()}
            {selectedRoom && ` - Room ${mockRooms.find(r => r.id === selectedRoom)?.number}`}
            {selectedFloor && !selectedRoom && ` - Floor ${selectedFloor}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentsForAttendance.length > 0 ? (
            <div className="space-y-4">
              {studentsForAttendance.map((student) => {
                const attendance = mockAttendance.find(
                  a => a.studentId === student.id && a.date === selectedDate
                );
                
                return (
                  <div key={student.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-4">
                      {student.profileImage ? (
                        <img
                          src={student.profileImage}
                          alt={student.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                          {student.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.enrollmentNumber} • Room {mockRooms.find(r => r.id === student.roomId)?.number}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Morning</p>
                        <span className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          attendance?.morningStatus === 'present' && 'bg-success-100 text-success-700',
                          attendance?.morningStatus === 'absent' && 'bg-error-100 text-error-700',
                          attendance?.morningStatus === 'leave' && 'bg-warning-100 text-warning-700',
                          !attendance && 'bg-muted text-muted-foreground'
                        )}>
                          {attendance?.morningStatus || 'Not marked'}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Evening</p>
                        <span className={cn(
                          'rounded-full px-2 py-1 text-xs font-medium',
                          attendance?.eveningStatus === 'present' && 'bg-success-100 text-success-700',
                          attendance?.eveningStatus === 'absent' && 'bg-error-100 text-error-700',
                          attendance?.eveningStatus === 'leave' && 'bg-warning-100 text-warning-700',
                          !attendance && 'bg-muted text-muted-foreground'
                        )}>
                          {attendance?.eveningStatus || 'Not marked'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p>No students found for the selected criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={isMarkingAttendance}
        onClose={() => setIsMarkingAttendance(false)}
        title={`Mark Attendance - ${new Date(selectedDate).toLocaleDateString()}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-primary-50 p-4 dark:bg-primary-900/20">
            <p className="text-sm">
              Marking attendance for {studentsForAttendance.length} students
              {selectedRoom && ` in Room ${mockRooms.find(r => r.id === selectedRoom)?.number}`}
              {selectedFloor && !selectedRoom && ` on Floor ${selectedFloor}`}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4">
            {studentsForAttendance.map((student) => (
              <div key={student.id} className="rounded-lg border p-4">
                <div className="flex items-center space-x-4 mb-3">
                  {student.profileImage ? (
                    <img
                      src={student.profileImage}
                      alt={student.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                      {student.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.enrollmentNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Select
                    label="Morning"
                    options={[
                      { value: 'present', label: 'Present' },
                      { value: 'absent', label: 'Absent' },
                      { value: 'leave', label: 'Leave' },
                    ]}
                    value={attendanceData[student.id]?.morning || 'present'}
                    onChange={(e) => updateAttendanceData(student.id, 'morning', e.target.value)}
                  />
                  <Select
                    label="Evening"
                    options={[
                      { value: 'present', label: 'Present' },
                      { value: 'absent', label: 'Absent' },
                      { value: 'leave', label: 'Leave' },
                    ]}
                    value={attendanceData[student.id]?.evening || 'present'}
                    onChange={(e) => updateAttendanceData(student.id, 'evening', e.target.value)}
                  />
                  <Input
                    label="Remarks"
                    value={attendanceData[student.id]?.remarks || ''}
                    onChange={(e) => updateAttendanceData(student.id, 'remarks', e.target.value)}
                    placeholder="Optional remarks"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsMarkingAttendance(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAttendance}>
              Save Attendance
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}