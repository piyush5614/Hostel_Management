import { 
  Student, Staff, Room, Bed, 
  Attendance, StaffAttendance, LeaveRequest, 
  MaintenanceRequest, Visitor, Message,
  Report, Application, StaffShift, StaffTask,
  DailyReport, AttendanceSheet, SystemSettings,
  DashboardStats, Activity, AutoAssignCriteria,
  GeneratedCredential, ActivityLog, TaskComment, TaskProgress
} from '../types';
import { registerCredentialForLogin } from '../lib/supabase';
import { eventBus, EVENTS } from '../utils/event-bus';
import { 
  getAllEnhancedStudents, 
  getAllEnhancedStaff, 
  enhancedMockLeaveRequests,
  enhancedMockStaffTasks,
  getHistoricalAttendance
} from './enhanced-mock-data';

// ============================================================
// LocalStorage Persistence Layer
// ============================================================
const STORAGE_KEY = 'tc-hostel-data';

interface PersistedData {
  students: Student[];
  staff: Staff[];
  rooms: Room[];
  beds: Bed[];
  attendance: Attendance[];
  staffAttendance: StaffAttendance[];
  leaveRequests: LeaveRequest[];
  maintenanceRequests: MaintenanceRequest[];
  visitors: Visitor[];
  messages: Message[];
  reports: Report[];
  applications: Application[];
  staffShifts: StaffShift[];
  staffTasks: StaffTask[];
  dailyReports: DailyReport[];
  attendanceSheets: AttendanceSheet[];
  systemSettings: SystemSettings[];
  events: any[];
  eventRegistrations: any[];
  userSettings: any[];
  credentials: GeneratedCredential[];
  activityLogs: ActivityLog[];
}

const saveToStorage = () => {
  try {
    const data: PersistedData = {
      students: mockStudents,
      staff: mockStaff,
      rooms: mockRooms,
      beds: mockBeds,
      attendance: mockAttendance.slice(-2000), // cap to prevent oversized localStorage
      staffAttendance: mockStaffAttendance,
      leaveRequests: mockLeaveRequests,
      maintenanceRequests: mockMaintenanceRequests,
      visitors: mockVisitors,
      messages: mockMessages,
      reports: mockReports,
      applications: mockApplications,
      staffShifts: mockStaffShifts,
      staffTasks: mockStaffTasks,
      dailyReports: mockDailyReports,
      attendanceSheets: mockAttendanceSheets,
      systemSettings: mockSystemSettings,
      events: mockEvents,
      eventRegistrations: mockEventRegistrations,
      userSettings: mockUserSettings,
      credentials: mockCredentials,
      activityLogs: mockActivityLogs,
    };
    const json = JSON.stringify(data);
    // Guard: don't write if payload > 4 MB (browser limit is ~5-10 MB)
    if (json.length > 4_000_000) {
      console.warn('⚠️ Mock data too large to persist, skipping save');
      return;
    }
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.warn('⚠️ Failed to persist data to localStorage:', e);
  }
};

const loadFromStorage = (): PersistedData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PersistedData;
    }
  } catch (e) {
    console.warn('⚠️ Failed to load persisted data:', e);
  }
  return null;
};

export const clearPersistedData = () => {
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Persisted data cleared. Reload to reset to defaults.');
};

// Load persisted data or fall back to defaults
const persisted = loadFromStorage();

// Real system data - loads from localStorage if available, otherwise defaults
export let mockStudents: Student[] = persisted?.students ?? getAllEnhancedStudents();
export let mockStaff: Staff[] = persisted?.staff ?? getAllEnhancedStaff();

// Generate rooms for 3 floors with specified counts
const generateRooms = (): Room[] => {
  const rooms: Room[] = [];
  let roomId = 1;
  
  // Floor 1: 34 rooms (101-134)
  for (let i = 1; i <= 34; i++) {
    const roomNumber = `1${i.toString().padStart(2, '0')}`;
    rooms.push({
      id: roomId.toString(),
      number: roomNumber,
      floor: 1,
      capacity: 3,
      type: i <= 17 ? 'AC' : 'Non-AC',
      gender: i <= 17 ? 'male' : 'female',
      status: 'available',
      occupiedBeds: 0,
      totalBeds: 3,
      amenities: ['WiFi', 'Study Table', 'Wardrobe', 'Fan'],
      lastCleaned: new Date().toISOString()
    });
    roomId++;
  }
  
  // Floor 2: 34 rooms (201-234)
  for (let i = 1; i <= 34; i++) {
    const roomNumber = `2${i.toString().padStart(2, '0')}`;
    rooms.push({
      id: roomId.toString(),
      number: roomNumber,
      floor: 2,
      capacity: 3,
      type: i <= 17 ? 'AC' : 'Non-AC',
      gender: i <= 17 ? 'male' : 'female',
      status: 'available',
      occupiedBeds: 0,
      totalBeds: 3,
      amenities: ['WiFi', 'Study Table', 'Wardrobe', 'Fan'],
      lastCleaned: new Date().toISOString()
    });
    roomId++;
  }
  
  // Floor 3: 38 rooms (301-338)
  for (let i = 1; i <= 38; i++) {
    const roomNumber = `3${i.toString().padStart(2, '0')}`;
    rooms.push({
      id: roomId.toString(),
      number: roomNumber,
      floor: 3,
      capacity: 3,
      type: i <= 19 ? 'AC' : 'Non-AC',
      gender: i <= 19 ? 'male' : 'female',
      status: 'available',
      occupiedBeds: 0,
      totalBeds: 3,
      amenities: ['WiFi', 'Study Table', 'Wardrobe', 'Fan'],
      lastCleaned: new Date().toISOString()
    });
    roomId++;
  }
  
  return rooms;
};

export const mockRooms: Room[] = persisted?.rooms ?? generateRooms();

// Generate beds for all rooms (or load from storage)
export let mockBeds: Bed[] = persisted?.beds ?? [];
if (!persisted?.beds) {
  mockRooms.forEach(room => {
    for (let i = 1; i <= room.totalBeds; i++) {
      mockBeds.push({
        id: `${room.id}-bed-${i}`,
        roomId: room.id,
        number: i,
        status: 'available',
      });
    }
  });
}

// Real system data stores (load from localStorage or defaults)
export let mockAttendance: Attendance[] = persisted?.attendance ?? getHistoricalAttendance();
export let mockStaffAttendance: StaffAttendance[] = persisted?.staffAttendance ?? [];
export let mockLeaveRequests: LeaveRequest[] = persisted?.leaveRequests ?? enhancedMockLeaveRequests;
export let mockMaintenanceRequests: MaintenanceRequest[] = persisted?.maintenanceRequests ?? [];
export let mockVisitors: Visitor[] = persisted?.visitors ?? [];
export let mockMessages: Message[] = persisted?.messages ?? [];
export let mockReports: Report[] = persisted?.reports ?? [];
export let mockApplications: Application[] = persisted?.applications ?? [];
export let mockStaffShifts: StaffShift[] = persisted?.staffShifts ?? [];
export let mockStaffTasks: StaffTask[] = persisted?.staffTasks ?? enhancedMockStaffTasks;
export let mockDailyReports: DailyReport[] = persisted?.dailyReports ?? [];
export let mockAttendanceSheets: AttendanceSheet[] = persisted?.attendanceSheets ?? [];
export let mockSystemSettings: SystemSettings[] = persisted?.systemSettings ?? [];
export let mockEvents: Event[] = persisted?.events ?? [];
export let mockEventRegistrations: EventRegistration[] = persisted?.eventRegistrations ?? [];
export let mockUserSettings: any[] = persisted?.userSettings ?? [];

// Real-time dashboard statistics
export const getDashboardStats = (): DashboardStats => {
  const totalStudents = mockStudents.length;
  const presentStudents = mockStudents.filter(s => s.currentStatus === 'present').length;
  const onLeaveStudents = mockStudents.filter(s => s.currentStatus === 'on-leave').length;
  
  const totalRooms = mockRooms.length;
  const occupiedRooms = mockRooms.filter(r => r.status === 'full').length;
  const availableRooms = mockRooms.filter(r => r.status === 'available').length;
  const maintenanceRooms = mockRooms.filter(r => r.status === 'maintenance').length;
  
  const pendingApplications = mockApplications.filter(a => a.status === 'pending').length;
  const pendingMaintenanceRequests = mockMaintenanceRequests.filter(m => m.status === 'pending').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayVisitors = mockVisitors.filter(v => v.checkInTime.startsWith(today)).length;
  
  const activeStaff = mockStaff.filter(s => s.isActive).length;

  return {
    totalStudents,
    presentStudents,
    onLeaveStudents,
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    pendingApplications,
    pendingMaintenanceRequests,
    todayVisitors,
    activeStaff,
    recentActivities: getRecentActivities()
  };
};

export const getRecentActivities = (userId?: string): Activity[] => {
  const activities: Activity[] = [];
  
  // Add recent activities from various modules
  let leaveSlice = mockLeaveRequests.slice(-5);
  let appSlice = mockApplications.slice(-5);

  // If userId supplied (student role), filter to personal activities only
  if (userId) {
    const studentId = getLinkedStudentId(userId);
    if (studentId) {
      leaveSlice = mockLeaveRequests.filter(l => l.studentId === studentId).slice(-5);
      appSlice = mockApplications.filter(a => (a as any).studentId === studentId).slice(-5);
    }
  }

  leaveSlice.forEach(leave => {
    const student = mockStudents.find(s => s.id === leave.studentId);
    if (student) {
      activities.push({
        id: `leave-${leave.id}`,
        type: 'other',
        description: `${student.name} submitted leave request`,
        userId: leave.studentId,
        userName: student.name,
        timestamp: leave.submittedAt,
      });
    }
  });

  appSlice.forEach(app => {
    const student = mockStudents.find(s => s.id === (app as any).studentId);
    if (student) {
      activities.push({
        id: `app-${app.id}`,
        type: 'application_submitted',
        description: `${student.name} submitted ${(app as any).type} application`,
        userId: (app as any).studentId,
        userName: student.name,
        timestamp: (app as any).submittedAt,
      });
    }
  });

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
};

// Auto-assign functionality
export const autoAssignStudents = (criteria: AutoAssignCriteria): { success: boolean; assigned: number; message: string } => {
  const unassignedStudents = mockStudents.filter(s => !s.roomId && !s.bedId);
  const filteredStudents = unassignedStudents.filter(student => {
    if (criteria.gender !== 'any' && student.gender !== criteria.gender) return false;
    if (criteria.year && student.year !== criteria.year) return false;
    if (criteria.course && !student.course.toLowerCase().includes(criteria.course.toLowerCase())) return false;
    return true;
  });

  const availableRooms = mockRooms.filter(room => {
    if (room.status !== 'available') return false;
    if (criteria.gender !== 'any' && room.gender !== criteria.gender && room.gender !== 'any') return false;
    if (criteria.roomType && room.type !== criteria.roomType) return false;
    if (criteria.floor && room.floor !== criteria.floor) return false;
    return room.occupiedBeds < room.totalBeds;
  });

  let assignedCount = 0;
  
  // Sort students based on priority
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (criteria.priority === 'year') return a.year - b.year;
    if (criteria.priority === 'course') return a.course.localeCompare(b.course);
    return Math.random() - 0.5; // random
  });

  for (const student of sortedStudents) {
    const suitableRoom = availableRooms.find(room => {
      if (room.gender !== 'any' && room.gender !== student.gender) return false;
      return room.occupiedBeds < room.totalBeds;
    });

    if (suitableRoom) {
      const availableBed = mockBeds.find(bed => 
        bed.roomId === suitableRoom.id && bed.status === 'available'
      );

      if (availableBed) {
        // Assign student to room and bed
        updateStudent(student.id, {
          roomId: suitableRoom.id,
          bedId: availableBed.id
        });

        updateBed(availableBed.id, {
          status: 'occupied',
          studentId: student.id,
          assignedDate: new Date().toISOString()
        });

        // Update room occupancy
        const newOccupiedBeds = suitableRoom.occupiedBeds + 1;
        updateRoom(suitableRoom.id, {
          occupiedBeds: newOccupiedBeds,
          status: newOccupiedBeds === suitableRoom.totalBeds ? 'full' : 'available'
        });

        assignedCount++;
      }
    }
  }

  return {
    success: assignedCount > 0,
    assigned: assignedCount,
    message: assignedCount > 0 
      ? `Successfully assigned ${assignedCount} students to rooms`
      : 'No suitable rooms available for assignment'
  };
};

// ============================================================
// Resolve logged-in user to their Student / Staff record
// ============================================================
export const getLinkedStudentId = (userId: string): string | null => {
  // Try direct id match first (demo accounts: user.id === "1")
  let student = mockStudents.find(s => s.id === userId);
  if (student) return student.id;
  // Then try userId match (credential-based logins: user.id === "student-17373...")
  student = mockStudents.find(s => s.userId === userId);
  return student?.id ?? null;
};

export const getLinkedStaffId = (userId: string): string | null => {
  let staff = mockStaff.find(s => s.id === userId);
  if (staff) return staff.id;
  staff = mockStaff.find(s => s.userId === userId);
  return staff?.id ?? null;
};

export const getLinkedStudent = (userId: string): Student | null => {
  const id = getLinkedStudentId(userId);
  return id ? mockStudents.find(s => s.id === id) ?? null : null;
};

export const getLinkedStaff = (userId: string): Staff | null => {
  const id = getLinkedStaffId(userId);
  return id ? mockStaff.find(s => s.id === id) ?? null : null;
};

// CRUD operations
export const updateUser = (id: string, updates: any) => {
  // This would update the user in the users table
  console.log('👤 Mock updateUser:', id, updates);
  return { success: true };
};

export const addStudent = (student: Omit<Student, 'id'>): Student => {
  const credential = generateCredentials(student.name, student.email, 'student');
  const newStudent: Student = {
    ...student,
    id: Date.now().toString(),
    userId: credential.userId,
    enrollmentNumber: student.enrollmentNumber || credential.generatedId,
    isActive: true,
    currentStatus: 'present',
    generatedPassword: credential.generatedPassword,
  };
  mockStudents.push(newStudent);
  addActivityLog('system', 'System', 'created', 'student', newStudent.id, `Student ${newStudent.name} added`);
  saveToStorage();
  eventBus.emit(EVENTS.STUDENT_UPDATED);
  return newStudent;
};

export const updateStudent = (id: string, updates: Partial<Student>) => {
  const studentIndex = mockStudents.findIndex(student => student.id === id);
  if (studentIndex !== -1) {
    mockStudents[studentIndex] = { ...mockStudents[studentIndex], ...updates };
    saveToStorage();
    eventBus.emit(EVENTS.STUDENT_UPDATED);
    return mockStudents[studentIndex];
  }
  return null;
};

export const deleteStudent = (id: string) => {
  const studentIndex = mockStudents.findIndex(student => student.id === id);
  if (studentIndex !== -1) {
    const student = mockStudents[studentIndex];
    // Free up room and bed if assigned
    if (student.roomId && student.bedId) {
      updateBed(student.bedId, { status: 'available', studentId: undefined });
      const room = mockRooms.find(r => r.id === student.roomId);
      if (room) {
        updateRoom(room.id, { 
          occupiedBeds: room.occupiedBeds - 1,
          status: room.occupiedBeds - 1 === 0 ? 'available' : 'available'
        });
      }
    }
    mockStudents.splice(studentIndex, 1);
    saveToStorage();
    eventBus.emit(EVENTS.STUDENT_UPDATED);
    return true;
  }
  return false;
};

export const addRoom = (room: Omit<Room, 'id'>) => {
  const newRoom: Room = {
    ...room,
    id: Date.now().toString(),
    occupiedBeds: 0,
    totalBeds: room.capacity,
    amenities: room.amenities || ['WiFi', 'Study Table', 'Wardrobe', 'Fan'],
    lastCleaned: new Date().toISOString()
  };
  
  mockRooms.push(newRoom);
  
  // Create beds for the new room
  for (let i = 1; i <= room.capacity; i++) {
    mockBeds.push({
      id: `${newRoom.id}-bed-${i}`,
      roomId: newRoom.id,
      number: i,
      status: 'available',
    });
  }
  
  saveToStorage();
  eventBus.emit(EVENTS.ROOM_UPDATED);
  return newRoom;
};

export const updateRoom = (id: string, updates: Partial<Room>) => {
  const roomIndex = mockRooms.findIndex(room => room.id === id);
  if (roomIndex !== -1) {
    mockRooms[roomIndex] = { ...mockRooms[roomIndex], ...updates };
    saveToStorage();
    eventBus.emit(EVENTS.ROOM_UPDATED);
    return mockRooms[roomIndex];
  }
  return null;
};

export const updateBed = (id: string, updates: Partial<Bed>) => {
  const bedIndex = mockBeds.findIndex(bed => bed.id === id);
  if (bedIndex !== -1) {
    mockBeds[bedIndex] = { ...mockBeds[bedIndex], ...updates };
    saveToStorage();
    return mockBeds[bedIndex];
  }
  return null;
};

export const deleteRoom = (id: string) => {
  const roomIndex = mockRooms.findIndex(room => room.id === id);
  if (roomIndex !== -1) {
    // Check if room has students
    const roomBeds = mockBeds.filter(bed => bed.roomId === id);
    const hasOccupiedBeds = roomBeds.some(bed => bed.status === 'occupied');
    
    if (hasOccupiedBeds) {
      return { success: false, message: 'Cannot delete room with assigned students' };
    }
    
    // Remove associated beds
    mockBeds = mockBeds.filter(bed => bed.roomId !== id);
    // Remove the room
    mockRooms.splice(roomIndex, 1);
    saveToStorage();
    return { success: true, message: 'Room deleted successfully' };
  }
  return { success: false, message: 'Room not found' };
};

// Leave management functions
export const submitLeaveRequest = (request: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status'>) => {
  const newRequest: LeaveRequest = {
    ...request,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };
  mockLeaveRequests.push(newRequest);
  saveToStorage();
  eventBus.emit(EVENTS.LEAVE_UPDATED);
  return newRequest;
};

export const approveLeaveRequest = (id: string, approverComments?: string) => {
  const requestIndex = mockLeaveRequests.findIndex(req => req.id === id);
  if (requestIndex !== -1) {
    mockLeaveRequests[requestIndex] = {
      ...mockLeaveRequests[requestIndex],
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      approverComments
    };
    
    // Update student status
    const student = mockStudents.find(s => s.id === mockLeaveRequests[requestIndex].studentId);
    if (student) {
      updateStudent(student.id, { currentStatus: 'on-leave' });
    }
    
    saveToStorage();
    eventBus.emit(EVENTS.LEAVE_UPDATED);
    return mockLeaveRequests[requestIndex];
  }
  return null;
};

export const rejectLeaveRequest = (id: string, approverComments?: string) => {
  const requestIndex = mockLeaveRequests.findIndex(req => req.id === id);
  if (requestIndex !== -1) {
    mockLeaveRequests[requestIndex] = {
      ...mockLeaveRequests[requestIndex],
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      approverComments
    };
    saveToStorage();
    eventBus.emit(EVENTS.LEAVE_UPDATED);
    return mockLeaveRequests[requestIndex];
  }
  return null;
};

// Export functions
export const exportData = (type: string, format: 'pdf' | 'excel' | 'csv', filters?: any) => {
  // This would integrate with actual export libraries
  console.log(`Exporting ${type} data in ${format} format with filters:`, filters);
  
  // Simulate export process
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        filename: `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`,
        downloadUrl: '#'
      });
    }, 2000);
  });
};

// Staff shift management
export const createStaffShift = (shift: Omit<StaffShift, 'id'>) => {
  const newShift: StaffShift = {
    ...shift,
    id: Date.now().toString()
  };
  mockStaffShifts.push(newShift);
  saveToStorage();
  return newShift;
};

export const updateStaffShift = (id: string, updates: Partial<StaffShift>) => {
  const shiftIndex = mockStaffShifts.findIndex(shift => shift.id === id);
  if (shiftIndex !== -1) {
    mockStaffShifts[shiftIndex] = { ...mockStaffShifts[shiftIndex], ...updates };
    saveToStorage();
    return mockStaffShifts[shiftIndex];
  }
  return null;
};

// Task management
export const createStaffTask = (task: Omit<StaffTask, 'id' | 'createdAt'>) => {
  const newTask: StaffTask = {
    ...task,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  mockStaffTasks.push(newTask);
  saveToStorage();
  eventBus.emit(EVENTS.TASK_UPDATED);
  return newTask;
};

export const updateStaffTask = (id: string, updates: Partial<StaffTask>) => {
  const taskIndex = mockStaffTasks.findIndex(task => task.id === id);
  if (taskIndex !== -1) {
    mockStaffTasks[taskIndex] = { ...mockStaffTasks[taskIndex], ...updates };
    saveToStorage();
    eventBus.emit(EVENTS.TASK_UPDATED);
    return mockStaffTasks[taskIndex];
  }
  return null;
};

// Daily report management
export const submitDailyReport = (report: Omit<DailyReport, 'id' | 'submittedAt'>) => {
  const newReport: DailyReport = {
    ...report,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString()
  };
  mockDailyReports.push(newReport);
  saveToStorage();
  return newReport;
};

// Attendance sheet management
export const createAttendanceSheet = (sheet: Omit<AttendanceSheet, 'id' | 'submittedAt'>) => {
  const newSheet: AttendanceSheet = {
    ...sheet,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString()
  };
  mockAttendanceSheets.push(newSheet);
  saveToStorage();
  return newSheet;
};

export const submitAttendanceToAdmin = (sheetId: string) => {
  const sheetIndex = mockAttendanceSheets.findIndex(sheet => sheet.id === sheetId);
  if (sheetIndex !== -1) {
    mockAttendanceSheets[sheetIndex].submittedToAdmin = true;
    saveToStorage();
    return mockAttendanceSheets[sheetIndex];
  }
  return null;
};

// ============================================================
// Credential Management
// ============================================================
export let mockCredentials: GeneratedCredential[] = persisted?.credentials ?? [];
export let mockActivityLogs: ActivityLog[] = persisted?.activityLogs ?? [];

// Re-register persisted credentials with the login system on startup
if (persisted?.credentials) {
  persisted.credentials.forEach(c => {
    if (c.isActive) {
      registerCredentialForLogin({
        email: c.email,
        generatedId: c.generatedId,
        generatedPassword: c.generatedPassword,
        name: c.name,
        role: c.role as string,
        userId: c.userId,
        isActive: c.isActive,
      });
    }
  });
}

const generateStaffId = (): string => {
  const num = mockStaff.length + mockCredentials.filter(c => c.role === 'staff').length + 1;
  return `STAFF-${num.toString().padStart(4, '0')}`;
};

const generateStudentId = (): string => {
  const num = mockStudents.length + mockCredentials.filter(c => c.role === 'student').length + 1;
  return `STU-${num.toString().padStart(4, '0')}`;
};

const generatePassword = (length = 10): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const generateCredentials = (
  name: string,
  email: string,
  role: 'staff' | 'student'
): GeneratedCredential => {
  const generatedId = role === 'staff' ? generateStaffId() : generateStudentId();
  const generatedPassword = generatePassword();
  const credential: GeneratedCredential = {
    id: Date.now().toString(),
    userId: `${role}-${Date.now()}`,
    name,
    email,
    role,
    generatedId,
    generatedPassword,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  mockCredentials.push(credential);
  saveToStorage();

  // Register with the login system so this credential can be used to sign in
  registerCredentialForLogin({
    email: credential.email,
    generatedId: credential.generatedId,
    generatedPassword: credential.generatedPassword,
    name: credential.name,
    role: credential.role,
    userId: credential.userId,
    isActive: credential.isActive,
  });

  return credential;
};

export const resetCredentialPassword = (credentialId: string): string | null => {
  const idx = mockCredentials.findIndex(c => c.id === credentialId);
  if (idx !== -1) {
    const newPassword = generatePassword();
    mockCredentials[idx].generatedPassword = newPassword;
    mockCredentials[idx].passwordResetAt = new Date().toISOString();

    // Also update the login registry
    registerCredentialForLogin({
      email: mockCredentials[idx].email,
      generatedId: mockCredentials[idx].generatedId,
      generatedPassword: newPassword,
      name: mockCredentials[idx].name,
      role: mockCredentials[idx].role as string,
      userId: mockCredentials[idx].userId,
      isActive: mockCredentials[idx].isActive,
    });
    saveToStorage();
    return newPassword;
  }
  return null;
};

// ============================================================
// Staff CRUD Operations
// ============================================================
export const addStaff = (staff: Omit<Staff, 'id'>): Staff => {
  const credential = generateCredentials(staff.name, staff.email, 'staff');
  const newStaff: Staff = {
    ...staff,
    id: Date.now().toString(),
    employeeId: staff.employeeId || credential.generatedId,
    isActive: true,
    generatedPassword: credential.generatedPassword,
  };
  mockStaff.push(newStaff);
  addActivityLog('system', 'System', 'created', 'staff', newStaff.id, `Staff member ${newStaff.name} added`);
  saveToStorage();
  eventBus.emit(EVENTS.STAFF_UPDATED);
  return newStaff;
};

export const updateStaffMember = (id: string, updates: Partial<Staff>): Staff | null => {
  const idx = mockStaff.findIndex(s => s.id === id);
  if (idx !== -1) {
    mockStaff[idx] = { ...mockStaff[idx], ...updates };
    addActivityLog('system', 'System', 'updated', 'staff', id, `Staff member ${mockStaff[idx].name} updated`);
    saveToStorage();
    eventBus.emit(EVENTS.STAFF_UPDATED);
    return mockStaff[idx];
  }
  return null;
};

export const deleteStaffMember = (id: string, soft = true): boolean => {
  const idx = mockStaff.findIndex(s => s.id === id);
  if (idx !== -1) {
    if (soft) {
      mockStaff[idx].isActive = false;
      mockStaff[idx].deletedAt = new Date().toISOString();
      addActivityLog('system', 'System', 'soft-deleted', 'staff', id, `Staff member ${mockStaff[idx].name} deactivated`);
    } else {
      addActivityLog('system', 'System', 'deleted', 'staff', id, `Staff member ${mockStaff[idx].name} permanently deleted`);
      mockStaff.splice(idx, 1);
    }
    saveToStorage();
    return true;
  }
  return false;
};

export const getStaffById = (id: string): Staff | undefined => {
  return mockStaff.find(s => s.id === id);
};

// ============================================================
// Task Operations
// ============================================================
export const deleteStaffTask = (id: string): boolean => {
  const idx = mockStaffTasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    mockStaffTasks[idx].status = 'cancelled';
    saveToStorage();
    eventBus.emit(EVENTS.TASK_UPDATED);
    return true;
  }
  return false;
};

export const addTaskComment = (taskId: string, comment: Omit<TaskComment, 'id' | 'timestamp'>): TaskComment | null => {
  const task = mockStaffTasks.find(t => t.id === taskId);
  if (task) {
    const newComment: TaskComment = {
      ...comment,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    if (!task.comments) task.comments = [];
    task.comments.push(newComment);
    saveToStorage();
    eventBus.emit(EVENTS.TASK_UPDATED);
    return newComment;
  }
  return null;
};

export const addTaskProgress = (taskId: string, progress: Omit<TaskProgress, 'id' | 'timestamp'>): TaskProgress | null => {
  const task = mockStaffTasks.find(t => t.id === taskId);
  if (task) {
    const newProgress: TaskProgress = {
      ...progress,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    if (!task.progressUpdates) task.progressUpdates = [];
    task.progressUpdates.push(newProgress);
    saveToStorage();
    return newProgress;
  }
  return null;
};

export const reassignTask = (taskId: string, newStaffId: string): StaffTask | null => {
  const task = mockStaffTasks.find(t => t.id === taskId);
  if (task) {
    task.reassignedFrom = task.assignedTo;
    task.assignedTo = newStaffId;
    task.reassignedAt = new Date().toISOString();
    addActivityLog('system', 'System', 'reassigned', 'task', taskId, `Task "${task.title}" reassigned to ${newStaffId}`);
    saveToStorage();
    eventBus.emit(EVENTS.TASK_UPDATED);
    return task;
  }
  return null;
};

export const getTasksByStaff = (staffId: string): StaffTask[] => {
  return mockStaffTasks.filter(t => t.assignedTo === staffId);
};

export const getStaffWorkload = (): { staffId: string; name: string; activeTasks: number; completedTasks: number; totalTasks: number }[] => {
  return mockStaff.filter(s => s.isActive).map(staff => {
    const tasks = mockStaffTasks.filter(t => t.assignedTo === staff.id);
    return {
      staffId: staff.id,
      name: staff.name,
      activeTasks: tasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      totalTasks: tasks.length,
    };
  });
};

// ============================================================
// Activity Logging
// ============================================================
export const addActivityLog = (
  userId: string,
  userName: string,
  action: string,
  resourceType: 'staff' | 'student' | 'task' | 'credential' | 'room',
  resourceId: string,
  details: string
) => {
  mockActivityLogs.push({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    userId,
    userName,
    action,
    resourceType,
    resourceId,
    timestamp: new Date().toISOString(),
    details,
  });
  saveToStorage();
};