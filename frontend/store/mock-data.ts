import { 
  Student, Staff, Room, Bed, 
  Attendance, StaffAttendance, LeaveRequest, StaffLeaveRequest,
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

const DEFAULT_API_COLLEGE_ID = (import.meta.env.VITE_DEFAULT_COLLEGE_ID as string | undefined) || 'college-default';

const getStoredSession = (): { access_token?: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem('tc-hostel-enhanced-session');
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as { access_token?: string };
  } catch {
    return null;
  }
};

const getApiToken = (): string | null => {
  const token = getStoredSession()?.access_token;
  if (!token || token === 'mock-access-token') {
    return null;
  }
  return token;
};

const getApiCollegeId = (): string => {
  if (typeof window === 'undefined') {
    return DEFAULT_API_COLLEGE_ID;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('collegeId') || params.get('college');
    if (fromUrl?.trim()) {
      return fromUrl.trim();
    }

    const fromStorage = localStorage.getItem('tc-hostel-active-college-id');
    if (fromStorage?.trim()) {
      return fromStorage.trim();
    }
  } catch {
    // Ignore URL/localStorage parsing errors.
  }

  return DEFAULT_API_COLLEGE_ID;
};

const getApiHeaders = (withJson = true): HeadersInit => {
  const headers: Record<string, string> = {
    'x-college-id': getApiCollegeId(),
  };

  if (withJson) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getApiToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseApiResponse = async <T>(response: Response): Promise<T> => {
  const raw = await response.text();
  if (!raw) {
    return null as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
};

const apiRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...getApiHeaders(init.body !== undefined),
      ...(init.headers || {}),
    },
  });

  const payload = await parseApiResponse<any>(response);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
};

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
  staffLeaveRequests: StaffLeaveRequest[];
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
      staffLeaveRequests: mockStaffLeaveRequests,
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

  const floorConfigs = [
    { floor: 1, roomCount: 35 },
    { floor: 2, roomCount: 35 },
    { floor: 3, roomCount: 36 },
  ];

  floorConfigs.forEach(({ floor, roomCount }) => {
    const acCount = Math.floor(roomCount / 2);

    for (let i = 1; i <= roomCount; i++) {
      const roomNumber = `${floor}${i.toString().padStart(2, '0')}`;
      rooms.push({
        id: roomId.toString(),
        number: roomNumber,
        floor,
        capacity: 3,
        type: i <= acCount ? 'AC' : 'Non-AC',
        gender: i <= acCount ? 'male' : 'female',
        status: 'available',
        occupiedBeds: 0,
        totalBeds: 3,
        amenities: ['WiFi', 'Study Table', 'Wardrobe', 'Fan'],
        lastCleaned: new Date().toISOString()
      });
      roomId++;
    }
  });
  
  return rooms;
};

export let mockRooms: Room[] = persisted?.rooms ?? generateRooms();

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
export let mockStaffLeaveRequests: StaffLeaveRequest[] = persisted?.staffLeaveRequests ?? [];
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
export const getLinkedStudentId = (userId: string, userEmail?: string): string | null => {
  // Try direct id match first (demo accounts: user.id === "1")
  let student = mockStudents.find(s => s.id === userId);
  if (student) return student.id;
  // Then try userId match (credential-based logins: user.id === "student-17373...")
  student = mockStudents.find(s => s.userId === userId);
  if (student) return student.id;
  // Fallback: match by email (needed when userId is a backend UUID)
  if (userEmail) {
    student = mockStudents.find(s => s.email?.toLowerCase() === userEmail.toLowerCase());
    if (student) return student.id;
  }
  // Demo account mapping: student@tchostel.edu → first student (Arjun Sharma)
  if (userEmail?.toLowerCase() === 'student@tchostel.edu' && mockStudents.length > 0) {
    return mockStudents[0].id;
  }
  return null;
};

export const getLinkedStaffId = (userId: string, userEmail?: string): string | null => {
  let staff = mockStaff.find(s => s.id === userId);
  if (staff) return staff.id;
  staff = mockStaff.find(s => s.userId === userId);
  if (staff) return staff.id;
  // Fallback: match by email (needed when userId is a backend UUID)
  if (userEmail) {
    staff = mockStaff.find(s => s.email?.toLowerCase() === userEmail.toLowerCase());
    if (staff) return staff.id;
  }
  // Demo account fallback: staff@tchostel.edu → first staff member (Dr. Rajesh Kumar)
  if (userEmail?.toLowerCase() === 'staff@tchostel.edu' && mockStaff.length > 0) {
    return mockStaff[0].id;
  }
  return null;
};

export const getLinkedStudent = (userId: string, userEmail?: string): Student | null => {
  const id = getLinkedStudentId(userId, userEmail);
  return id ? mockStudents.find(s => s.id === id) ?? null : null;
};

export const getLinkedStaff = (userId: string, userEmail?: string): Staff | null => {
  const id = getLinkedStaffId(userId, userEmail);
  return id ? mockStaff.find(s => s.id === id) ?? null : null;
};

// CRUD operations
export const updateUser = (id: string, updates: any) => {
  // This would update the user in the users table
  console.log('👤 Mock updateUser:', id, updates);
  return { success: true };
};

const mapStudentFromApi = (row: any): Student => {
  const existing = mockStudents.find(
    (student) =>
      student.id === row.id ||
      student.userId === (row.user_id ?? row.userId) ||
      (student.email && row.email && student.email.toLowerCase() === String(row.email).toLowerCase())
  );

  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    name: row.name || existing?.name || '',
    email: row.email || existing?.email || '',
    enrollmentNumber: row.enrollment_number ?? row.enrollmentNumber ?? existing?.enrollmentNumber ?? '',
    course: row.course || existing?.course || '',
    year: Number(row.year ?? existing?.year ?? 1),
    gender: (row.gender || existing?.gender || 'male') as Student['gender'],
    dateOfBirth: row.date_of_birth ?? row.dateOfBirth ?? existing?.dateOfBirth ?? '',
    contactNumber: row.contact_number ?? row.contactNumber ?? existing?.contactNumber ?? '',
    address: row.address ?? existing?.address ?? '',
    guardianName: row.guardian_name ?? row.guardianName ?? existing?.guardianName ?? '',
    guardianContact: row.guardian_contact ?? row.guardianContact ?? existing?.guardianContact ?? '',
    emergencyContact: row.emergency_contact ?? row.emergencyContact ?? existing?.emergencyContact ?? '',
    medicalNotes: row.medical_notes ?? row.medicalNotes ?? existing?.medicalNotes,
    roomId: row.room_id ?? row.roomId ?? existing?.roomId,
    bedId: row.bed_id ?? row.bedId ?? existing?.bedId,
    profileImage: row.profile_image ?? row.profileImage ?? existing?.profileImage,
    parentImage1: row.parent_image_1 ?? row.parentImage1 ?? existing?.parentImage1,
    parentImage2: row.parent_image_2 ?? row.parentImage2 ?? existing?.parentImage2,
    joiningDate: row.joining_date ?? row.joiningDate ?? existing?.joiningDate ?? new Date().toISOString(),
    isActive: row.is_active === undefined ? (existing?.isActive ?? true) : Boolean(row.is_active),
    currentStatus: (row.current_status ?? row.currentStatus ?? existing?.currentStatus ?? 'present') as Student['currentStatus'],
    generatedPassword: existing?.generatedPassword,
  };
};

const upsertStudentFromApi = (row: any): Student => {
  const mapped = mapStudentFromApi(row);
  const index = mockStudents.findIndex(
    (student) => student.id === mapped.id || student.userId === mapped.userId || student.email?.toLowerCase() === mapped.email?.toLowerCase()
  );

  if (index >= 0) {
    mockStudents[index] = { ...mockStudents[index], ...mapped };
  } else {
    mockStudents.unshift(mapped);
  }

  return mapped;
};

export const syncStudentsFromApi = async (): Promise<Student[]> => {
  if (!getApiToken()) {
    return mockStudents;
  }

  try {
    const rows = await apiRequest<any[]>('/students', { method: 'GET' });
    if (Array.isArray(rows)) {
      mockStudents = rows.map(mapStudentFromApi);
      saveToStorage();
      eventBus.emit(EVENTS.STUDENT_UPDATED);
      eventBus.emit(EVENTS.ROOM_UPDATED);
    }
  } catch (error) {
    console.warn('Failed to sync students from API, using local cache:', error);
  }

  return mockStudents;
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

  void apiRequest<any>('/students', {
    method: 'POST',
    body: JSON.stringify({
      name: student.name,
      email: student.email,
      password: credential.generatedPassword,
      generatedId: credential.generatedId,
      enrollmentNumber: newStudent.enrollmentNumber,
      course: student.course,
      year: student.year,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      contactNumber: student.contactNumber,
      address: student.address,
      guardianName: student.guardianName,
      guardianContact: student.guardianContact,
      emergencyContact: student.emergencyContact,
      medicalNotes: student.medicalNotes,
      joiningDate: student.joiningDate,
      profileImage: student.profileImage,
      parentImage1: student.parentImage1,
      parentImage2: student.parentImage2,
      currentStatus: newStudent.currentStatus,
      isActive: true,
    }),
  })
    .then((row) => {
      const created = upsertStudentFromApi(row);
      credential.userId = created.userId;
      registerCredentialForLogin({
        email: credential.email,
        generatedId: credential.generatedId,
        generatedPassword: credential.generatedPassword,
        name: credential.name,
        role: credential.role,
        userId: created.userId,
        isActive: credential.isActive,
      });
      saveToStorage();
      eventBus.emit(EVENTS.STUDENT_UPDATED);
    })
    .catch((error) => {
      console.warn('Failed to persist student to API, kept local copy:', error);
    });

  return newStudent;
};

export const updateStudent = (id: string, updates: Partial<Student>) => {
  const studentIndex = mockStudents.findIndex(student => student.id === id);
  if (studentIndex !== -1) {
    mockStudents[studentIndex] = { ...mockStudents[studentIndex], ...updates };
    saveToStorage();
    eventBus.emit(EVENTS.STUDENT_UPDATED);

    if (updates.roomId !== undefined || updates.bedId !== undefined) {
      eventBus.emit(EVENTS.ROOM_UPDATED);
    }

    void apiRequest<any>(`/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
      .then((row) => {
        upsertStudentFromApi(row);
        saveToStorage();
        eventBus.emit(EVENTS.STUDENT_UPDATED);
        if (updates.roomId !== undefined || updates.bedId !== undefined) {
          eventBus.emit(EVENTS.ROOM_UPDATED);
        }
      })
      .catch((error) => {
        console.warn('Failed to persist student update to API, kept local state:', error);
      });

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
    eventBus.emit(EVENTS.ROOM_UPDATED);

    void apiRequest<{ success: boolean }>(`/students/${id}`, {
      method: 'DELETE',
    }).catch((error) => {
      console.warn('Failed to delete student in API, local state was already updated:', error);
    });

    return true;
  }
  return false;
};

const mapBedFromApi = (row: any): Bed => ({
  id: row.id,
  roomId: row.roomId ?? row.room_id,
  number: Number(row.number ?? 0),
  status: (row.status || 'available') as Bed['status'],
  studentId: row.studentId ?? row.student_id,
  assignedDate: row.assignedDate ?? row.assigned_date,
});

const mapRoomFromApi = (row: any): Room => {
  const existing = mockRooms.find((room) => room.id === row.id || room.number === row.number);
  return {
    id: row.id,
    number: row.number,
    floor: Number(row.floor ?? existing?.floor ?? 1),
    capacity: Number(row.capacity ?? row.totalBeds ?? row.total_beds ?? existing?.capacity ?? 0),
    type: (row.type || existing?.type || 'AC') as Room['type'],
    gender: (row.gender || existing?.gender || 'male') as Room['gender'],
    status: (row.status || existing?.status || 'available') as Room['status'],
    occupiedBeds: Number(row.occupiedBeds ?? row.occupied_beds ?? existing?.occupiedBeds ?? 0),
    totalBeds: Number(row.totalBeds ?? row.total_beds ?? row.capacity ?? existing?.totalBeds ?? 0),
    amenities: Array.isArray(row.amenities) ? row.amenities : existing?.amenities || [],
    lastCleaned: row.lastCleaned ?? row.last_cleaned ?? existing?.lastCleaned,
  };
};

const upsertRoomFromApi = (row: any): Room => {
  const mapped = mapRoomFromApi(row);
  const roomIndex = mockRooms.findIndex((room) => room.id === mapped.id || room.number === mapped.number);

  if (roomIndex >= 0) {
    mockRooms[roomIndex] = { ...mockRooms[roomIndex], ...mapped };
  } else {
    mockRooms.push(mapped);
  }

  if (Array.isArray(row.beds)) {
    const beds = row.beds.map(mapBedFromApi);
    mockBeds = mockBeds.filter((bed) => bed.roomId !== mapped.id);
    mockBeds.push(...beds);
  }

  return mapped;
};

export const syncRoomsFromApi = async (): Promise<Room[]> => {
  if (!getApiToken()) {
    return mockRooms;
  }

  try {
    const rows = await apiRequest<any[]>('/rooms', { method: 'GET' });
    if (Array.isArray(rows)) {
      mockRooms = rows.map(mapRoomFromApi);
      mockBeds = rows.flatMap((row) => Array.isArray(row.beds) ? row.beds.map(mapBedFromApi) : []);
      saveToStorage();
      eventBus.emit(EVENTS.ROOM_UPDATED);
    }
  } catch (error) {
    console.warn('Failed to sync rooms from API, using local cache:', error);
  }

  return mockRooms;
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

  void apiRequest<any>('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      number: room.number,
      floor: room.floor,
      capacity: room.capacity,
      type: room.type,
      gender: room.gender,
      amenities: newRoom.amenities,
    }),
  })
    .then((row) => {
      upsertRoomFromApi(row);
      saveToStorage();
      eventBus.emit(EVENTS.ROOM_UPDATED);
    })
    .catch((error) => {
      console.warn('Failed to persist room to API, kept local copy:', error);
    });

  return newRoom;
};

export const updateRoom = (id: string, updates: Partial<Room>) => {
  const roomIndex = mockRooms.findIndex(room => room.id === id);
  if (roomIndex !== -1) {
    mockRooms[roomIndex] = { ...mockRooms[roomIndex], ...updates };
    saveToStorage();
    eventBus.emit(EVENTS.ROOM_UPDATED);

    void apiRequest<any>(`/rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
      .then((row) => {
        upsertRoomFromApi(row);
        saveToStorage();
        eventBus.emit(EVENTS.ROOM_UPDATED);
      })
      .catch((error) => {
        console.warn('Failed to persist room update to API, kept local state:', error);
      });

    return mockRooms[roomIndex];
  }
  return null;
};

export const updateBed = (id: string, updates: Partial<Bed>) => {
  const bedIndex = mockBeds.findIndex(bed => bed.id === id);
  if (bedIndex !== -1) {
    mockBeds[bedIndex] = { ...mockBeds[bedIndex], ...updates };
    saveToStorage();
    eventBus.emit(EVENTS.ROOM_UPDATED);

    void apiRequest<any>(`/rooms/beds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
      .then((row) => {
        mockBeds[bedIndex] = { ...mockBeds[bedIndex], ...mapBedFromApi(row) };
        saveToStorage();
        eventBus.emit(EVENTS.ROOM_UPDATED);
      })
      .catch((error) => {
        console.warn('Failed to persist bed update to API, kept local state:', error);
      });

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

    void apiRequest<{ success: boolean; message?: string }>(`/rooms/${id}`, {
      method: 'DELETE',
    }).catch((error) => {
      console.warn('Failed to delete room in API, local state was already updated:', error);
    });

    eventBus.emit(EVENTS.ROOM_UPDATED);
    return { success: true, message: 'Room deleted successfully' };
  }
  return { success: false, message: 'Room not found' };
};

// Leave management functions
const mapLeaveRequestFromApi = (row: any): LeaveRequest => ({
  id: row.id,
  studentId: row.student_id ?? row.studentId,
  type: row.type,
  startDate: row.start_date ?? row.startDate,
  endDate: row.end_date ?? row.endDate,
  reason: row.reason || '',
  status: row.status || 'pending',
  submittedAt: row.submitted_at ?? row.submittedAt ?? new Date().toISOString(),
  reviewedAt: row.reviewed_at ?? row.reviewedAt,
  reviewedBy: row.reviewed_by ?? row.reviewedBy,
  approverComments: row.approver_comments ?? row.approverComments,
  emergencyContact: row.emergency_contact ?? row.emergencyContact,
  checkOutTime: row.check_out_time ?? row.checkOutTime,
  checkInTime: row.check_in_time ?? row.checkInTime,
  actualReturnDate: row.actual_return_date ?? row.actualReturnDate,
  parentApprovalStatus: row.parent_approval_status ?? row.parentApprovalStatus,
  parentCallVerified: Boolean(row.parent_call_verified ?? row.parentCallVerified),
  parentCallTimestamp: row.parent_call_timestamp ?? row.parentCallTimestamp,
  parentCallNotes: row.parent_call_notes ?? row.parentCallNotes,
  parentCallBy: row.parent_call_by ?? row.parentCallBy,
});

const upsertLeaveRequest = (request: LeaveRequest): LeaveRequest => {
  const idx = mockLeaveRequests.findIndex((r) => r.id === request.id);
  if (idx >= 0) {
    mockLeaveRequests[idx] = { ...mockLeaveRequests[idx], ...request };
  } else {
    mockLeaveRequests.unshift(request);
  }
  return request;
};

export const syncLeaveRequestsFromApi = async (): Promise<LeaveRequest[]> => {
  if (!getApiToken()) {
    return mockLeaveRequests;
  }

  try {
    const rows = await apiRequest<any[]>('/leave', { method: 'GET' });
    if (Array.isArray(rows)) {
      mockLeaveRequests = rows.map(mapLeaveRequestFromApi);
      saveToStorage();
      eventBus.emit(EVENTS.LEAVE_UPDATED);
    }
  } catch (error) {
    console.warn('Failed to sync leave requests from API, using local cache:', error);
  }

  return mockLeaveRequests;
};

export const submitLeaveRequest = (request: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status'>) => {
  const newRequest: LeaveRequest = {
    ...request,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };

  upsertLeaveRequest(newRequest);
  saveToStorage();
  eventBus.emit(EVENTS.LEAVE_UPDATED);

  void apiRequest<any>('/leave', {
    method: 'POST',
    body: JSON.stringify({
      studentId: request.studentId,
      type: request.type,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
      emergencyContact: request.emergencyContact,
    }),
  })
    .then((row) => {
      const mapped = mapLeaveRequestFromApi(row);
      const optimisticIndex = mockLeaveRequests.findIndex((r) => r.id === newRequest.id);
      if (optimisticIndex >= 0) {
        mockLeaveRequests[optimisticIndex] = mapped;
      } else {
        upsertLeaveRequest(mapped);
      }
      saveToStorage();
      eventBus.emit(EVENTS.LEAVE_UPDATED);
    })
    .catch((error) => {
      console.warn('Failed to persist leave request to API, kept local copy:', error);
    });

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

    void apiRequest<any>(`/leave/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ approverComments }),
    })
      .then((row) => {
        upsertLeaveRequest(mapLeaveRequestFromApi(row));
        saveToStorage();
        eventBus.emit(EVENTS.LEAVE_UPDATED);
      })
      .catch((error) => {
        console.warn('Failed to approve leave request in API, kept local state:', error);
      });

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

    void apiRequest<any>(`/leave/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ approverComments }),
    })
      .then((row) => {
        upsertLeaveRequest(mapLeaveRequestFromApi(row));
        saveToStorage();
        eventBus.emit(EVENTS.LEAVE_UPDATED);
      })
      .catch((error) => {
        console.warn('Failed to reject leave request in API, kept local state:', error);
      });

    return mockLeaveRequests[requestIndex];
  }
  return null;
};

// Record parent call verification for a leave request
export const recordParentCall = (leaveRequestId: string, calledBy: string, notes?: string) => {
  const requestIndex = mockLeaveRequests.findIndex(req => req.id === leaveRequestId);
  if (requestIndex !== -1) {
    mockLeaveRequests[requestIndex] = {
      ...mockLeaveRequests[requestIndex],
      parentCallVerified: true,
      parentCallTimestamp: new Date().toISOString(),
      parentCallBy: calledBy,
      parentCallNotes: notes || '',
    };
    saveToStorage();
    eventBus.emit(EVENTS.LEAVE_UPDATED);

    void apiRequest<any>(`/leave/${leaveRequestId}/verify-call`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    })
      .then((row) => {
        upsertLeaveRequest(mapLeaveRequestFromApi(row));
        saveToStorage();
        eventBus.emit(EVENTS.LEAVE_UPDATED);
      })
      .catch((error) => {
        console.warn('Failed to save parent-call verification in API, kept local state:', error);
      });

    return mockLeaveRequests[requestIndex];
  }
  return null;
};

// Find leave request by parent phone number (guardian contact)
export const findLeaveByParentPhone = (phone: string) => {
  // Normalize the phone: strip spaces, dashes, and leading +
  const normalize = (p: string) => p.replace(/[\s\-\+\(\)]/g, '');
  const normalizedPhone = normalize(phone);

  for (const req of mockLeaveRequests) {
    if (req.status !== 'pending') continue;
    const student = mockStudents.find(s => s.id === req.studentId);
    if (student && normalize(student.guardianContact) === normalizedPhone) {
      return { leaveRequest: req, student };
    }
  }
  return null;
};

// Staff Leave management functions
export const submitStaffLeaveRequest = (request: Omit<StaffLeaveRequest, 'id' | 'submittedAt' | 'status'>) => {
  const newRequest: StaffLeaveRequest = {
    ...request,
    id: `sl-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };
  mockStaffLeaveRequests.push(newRequest);
  saveToStorage();
  eventBus.emit(EVENTS.STAFF_LEAVE_UPDATED);
  return newRequest;
};

export const approveStaffLeaveRequest = (id: string, reviewerId: string, approverComments?: string) => {
  const idx = mockStaffLeaveRequests.findIndex(r => r.id === id);
  if (idx !== -1) {
    mockStaffLeaveRequests[idx] = {
      ...mockStaffLeaveRequests[idx],
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
      approverComments
    };
    saveToStorage();
    eventBus.emit(EVENTS.STAFF_LEAVE_UPDATED);
    return mockStaffLeaveRequests[idx];
  }
  return null;
};

export const rejectStaffLeaveRequest = (id: string, reviewerId: string, approverComments?: string) => {
  const idx = mockStaffLeaveRequests.findIndex(r => r.id === id);
  if (idx !== -1) {
    mockStaffLeaveRequests[idx] = {
      ...mockStaffLeaveRequests[idx],
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
      approverComments
    };
    saveToStorage();
    eventBus.emit(EVENTS.STAFF_LEAVE_UPDATED);
    return mockStaffLeaveRequests[idx];
  }
  return null;
};

// Export functions
export const exportData = (type: string, format: 'pdf' | 'excel' | 'csv', filters?: any) => {
  // Import and use the real export service
  const { exportService } = require('../services/export');

  let data: any[] = [];
  let headers: string[] = [];
  let title = '';

  switch (type) {
    case 'maintenance':
      title = 'Maintenance Requests Report';
      headers = ['Title', 'Category', 'Priority', 'Status', 'Room', 'Created', 'Completed'];
      data = mockMaintenanceRequests.map(r => ({
        Title: r.title,
        Category: r.category,
        Priority: r.priority,
        Status: r.status,
        Room: r.roomId ? mockRooms.find(rm => rm.id === r.roomId)?.number || '' : '',
        Created: new Date(r.createdAt).toLocaleDateString(),
        Completed: r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '-',
      }));
      break;
    case 'staff':
      title = 'Staff Report';
      headers = ['Name', 'Employee ID', 'Email', 'Position', 'Department', 'Shift', 'Status'];
      data = mockStaff.filter(s => !s.deletedAt).map(s => ({
        Name: s.name,
        'Employee ID': s.employeeId,
        Email: s.email,
        Position: s.position,
        Department: s.department,
        Shift: s.shiftTiming,
        Status: s.isActive ? 'Active' : 'Inactive',
      }));
      break;
    case 'tasks':
      title = 'Staff Tasks Report';
      headers = ['Title', 'Assigned To', 'Priority', 'Status', 'Category', 'Due Date', 'Created'];
      data = mockStaffTasks.map(t => ({
        Title: t.title,
        'Assigned To': mockStaff.find(s => s.id === t.assignedTo)?.name || '',
        Priority: t.priority,
        Status: t.status,
        Category: t.category,
        'Due Date': new Date(t.dueDate).toLocaleDateString(),
        Created: new Date(t.createdAt).toLocaleDateString(),
      }));
      break;
    default:
      break;
  }

  if (data.length > 0) {
    exportService.generateReport(title, data, format, headers);
  }

  return Promise.resolve({
    success: true,
    filename: `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`,
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

const mapAttendanceFromApi = (row: any): Attendance => ({
  id: row.id,
  studentId: row.student_id ?? row.studentId,
  date: row.date,
  morningStatus: (row.morning_status ?? row.morningStatus ?? 'present') as Attendance['morningStatus'],
  eveningStatus: (row.evening_status ?? row.eveningStatus ?? 'present') as Attendance['eveningStatus'],
  remarks: row.remarks,
  recordedBy: row.recorded_by ?? row.recordedBy ?? '',
  recordedAt: row.recorded_at ?? row.recordedAt ?? new Date().toISOString(),
});

const upsertAttendanceRecord = (record: Attendance): Attendance => {
  const idx = mockAttendance.findIndex(
    (a) => a.studentId === record.studentId && a.date === record.date
  );

  if (idx >= 0) {
    mockAttendance[idx] = { ...mockAttendance[idx], ...record };
  } else {
    mockAttendance.push(record);
  }

  return record;
};

export const syncAttendanceFromApi = async (filters?: {
  date?: string;
  studentId?: string;
  roomId?: string;
}): Promise<Attendance[]> => {
  if (!getApiToken()) {
    return mockAttendance;
  }

  try {
    const params = new URLSearchParams();
    if (filters?.date) params.set('date', filters.date);
    if (filters?.studentId) params.set('studentId', filters.studentId);
    if (filters?.roomId) params.set('roomId', filters.roomId);

    const query = params.toString();
    const rows = await apiRequest<any[]>(`/attendance${query ? `?${query}` : ''}`, { method: 'GET' });

    if (Array.isArray(rows)) {
      const mapped = rows.map(mapAttendanceFromApi);

      if (!filters?.date && !filters?.studentId && !filters?.roomId) {
        mockAttendance = mapped;
      } else {
        const incomingKeys = new Set(mapped.map((r) => `${r.studentId}:${r.date}`));
        mockAttendance = mockAttendance.filter((existing) => !incomingKeys.has(`${existing.studentId}:${existing.date}`));
        mockAttendance.push(...mapped);
      }

      saveToStorage();
      eventBus.emit(EVENTS.ATTENDANCE_UPDATED);
    }
  } catch (error) {
    console.warn('Failed to sync attendance from API, using local cache:', error);
  }

  return mockAttendance;
};

export const upsertAttendanceRecords = async (records: Omit<Attendance, 'id' | 'recordedAt'>[]): Promise<void> => {
  if (records.length === 0) {
    return;
  }

  records.forEach((record) => {
    upsertAttendanceRecord({
      id: `${Date.now()}-${record.studentId}`,
      ...record,
      recordedAt: new Date().toISOString(),
    });
  });

  saveToStorage();
  eventBus.emit(EVENTS.ATTENDANCE_UPDATED);

  void apiRequest<{ success: boolean; count: number }>('/attendance/bulk-upsert', {
    method: 'POST',
    body: JSON.stringify({ records }),
  })
    .then(() => syncAttendanceFromApi(records[0]?.date ? { date: records[0].date } : undefined))
    .catch((error) => {
      console.warn('Failed to persist attendance in API, kept local state:', error);
    });
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
  eventBus.emit(EVENTS.ATTENDANCE_UPDATED);
  return newSheet;
};

export const submitAttendanceToAdmin = (sheetId: string) => {
  const sheetIndex = mockAttendanceSheets.findIndex(sheet => sheet.id === sheetId);
  if (sheetIndex !== -1) {
    mockAttendanceSheets[sheetIndex].submittedToAdmin = true;
    saveToStorage();
    eventBus.emit(EVENTS.ATTENDANCE_UPDATED);
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

// ============================================================
// Auto-register ALL existing students & staff so they can login
// even on a fresh browser with no localStorage data.
// Students: login with email / password "student123"
// Staff:    login with email / password "staff123"
// ============================================================
(() => {
  // Register every student that has no explicit credential yet
  mockStudents.forEach(s => {
    // Use the student's own generatedPassword if available, otherwise default
    const pw = s.generatedPassword || 'student123';
    registerCredentialForLogin({
      email: s.email,
      generatedId: s.enrollmentNumber,   // e.g. TC2024001
      generatedPassword: pw,
      name: s.name,
      role: 'student',
      userId: s.userId,
      isActive: s.isActive,
    });
  });

  // Register every staff member
  mockStaff.forEach(st => {
    const pw = st.generatedPassword || 'staff123';
    registerCredentialForLogin({
      email: st.email,
      generatedId: st.employeeId,         // e.g. TC-STAFF-001
      generatedPassword: pw,
      name: st.name,
      role: 'staff',
      userId: st.userId,
      isActive: st.isActive,
      profileImage: st.profileImage,
    });
  });

  console.log(`✅ Auto-registered ${mockStudents.length} students & ${mockStaff.length} staff for login`);
})();

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

  // Re-register so the auth fallback profile includes latest staff details and image.
  registerCredentialForLogin({
    email: newStaff.email,
    generatedId: newStaff.employeeId,
    generatedPassword: credential.generatedPassword,
    name: newStaff.name,
    role: 'staff',
    userId: newStaff.userId,
    isActive: newStaff.isActive,
    profileImage: newStaff.profileImage,
  });

  mockStaff.push(newStaff);
  addActivityLog('system', 'System', 'created', 'staff', newStaff.id, `Staff member ${newStaff.name} added`);
  saveToStorage();
  eventBus.emit(EVENTS.STAFF_UPDATED);
  return newStaff;
};

export const updateStaffMember = (id: string, updates: Partial<Staff>): Staff | null => {
  const idx = mockStaff.findIndex(s => s.id === id);
  if (idx !== -1) {
    const existing = mockStaff[idx];
    mockStaff[idx] = { ...existing, ...updates };

    registerCredentialForLogin({
      email: mockStaff[idx].email,
      generatedId: mockStaff[idx].employeeId,
      generatedPassword: mockStaff[idx].generatedPassword || existing.generatedPassword || 'staff123',
      name: mockStaff[idx].name,
      role: 'staff',
      userId: mockStaff[idx].userId,
      isActive: mockStaff[idx].isActive,
      profileImage: mockStaff[idx].profileImage,
    });

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