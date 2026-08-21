// SUPABASE TEMPORARILY DISABLED
// import { supabase } from '../lib/supabase';
import { 
  Student, Room, Bed, Attendance, LeaveRequest, 
  MaintenanceRequest, Visitor, Message, Report, 
  Application, Event, EventRegistration, UserSettings,
  Staff, StaffShift, StaffTask, DailyReport, AttendanceSheet
} from '../types';
import { mockStudents, mockRooms } from '../store/mock-data';

// Students Service
export const studentsService = {
  async getAll() {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return mockStudents;
  },

  async getById(id: string) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 300));
    const student = mockStudents.find(s => s.id === id);
    if (!student) throw new Error('Student not found');
    return student;
  },

  async create(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    const newStudent = {
      ...student,
      id: Date.now().toString(),
    };
    mockStudents.push(newStudent);
    return newStudent;
  },

  async update(id: string, updates: Partial<Student>) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockStudents.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Student not found');
    
    mockStudents[index] = { ...mockStudents[index], ...updates };
    return mockStudents[index];
  },

  async delete(id: string) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockStudents.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Student not found');
    
    mockStudents.splice(index, 1);
    return true;
  }
};

// Rooms Service
export const roomsService = {
  async getAll() {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockRooms;
  },

  async create(room: Omit<Room, 'id' | 'created_at' | 'updated_at'>) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    const newRoom = {
      ...room,
      id: Date.now().toString(),
    };
    mockRooms.push(newRoom);
    return newRoom;
  },

  async update(id: string, updates: Partial<Room>) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockRooms.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Room not found');
    
    mockRooms[index] = { ...mockRooms[index], ...updates };
    return mockRooms[index];
  },

  async delete(id: string) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockRooms.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Room not found');
    
    mockRooms.splice(index, 1);
    return true;
  }
};

// Beds Service
export const bedsService = {
  async getByRoomId(roomId: string) {
    const { data, error } = await supabase
      .from('beds')
      .select(`
        *,
        student:students(*)
      `)
      .eq('room_id', roomId)
      .order('number');
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Bed>) {
    const { data, error } = await supabase
      .from('beds')
      .update({
        status: updates.status,
        student_id: updates.studentId,
        assigned_date: updates.assignedDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Attendance Service
export const attendanceService = {
  async getByDate(date: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        student:students(*)
      `)
      .eq('date', date)
      .order('recorded_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(attendance: Omit<Attendance, 'id' | 'recordedAt'>) {
    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        student_id: attendance.studentId,
        date: attendance.date,
        morning_status: attendance.morningStatus,
        evening_status: attendance.eveningStatus,
        remarks: attendance.remarks,
        recorded_by: attendance.recordedBy,
        recorded_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async bulkUpsert(attendanceRecords: Omit<Attendance, 'id' | 'recordedAt'>[]) {
    const records = attendanceRecords.map(record => ({
      student_id: record.studentId,
      date: record.date,
      morning_status: record.morningStatus,
      evening_status: record.eveningStatus,
      remarks: record.remarks,
      recorded_by: record.recordedBy,
      recorded_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'student_id,date' })
      .select();
    
    if (error) throw error;
    return data;
  }
};

// Leave Requests Service
export const leaveRequestsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        student:students(*)
      `)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByStudentId(studentId: string) {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(request: Omit<LeaveRequest, 'id' | 'submittedAt'>) {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert([{
        student_id: request.studentId,
        type: request.type,
        start_date: request.startDate,
        end_date: request.endDate,
        reason: request.reason,
        emergency_contact: request.emergencyContact,
        status: 'pending',
        submitted_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<LeaveRequest>) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: updates.status,
        reviewed_at: updates.reviewedAt,
        reviewed_by: updates.reviewedBy,
        approver_comments: updates.approverComments,
        check_out_time: updates.checkOutTime,
        check_in_time: updates.checkInTime,
        actual_return_date: updates.actualReturnDate
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Messages Service
export const messagesService = {
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(*),
        receiver:users!receiver_id(*)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(message: Omit<Message, 'id' | 'timestamp'>) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        content: message.content,
        subject: message.subject,
        message_type: message.messageType || 'direct',
        priority: message.priority || 'normal',
        timestamp: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async markAsRead(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);
    
    if (error) throw error;
  }
};

// Events Service
export const eventsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async create(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title: event.title,
        description: event.description,
        start_date: event.startDate,
        end_date: event.endDate,
        location: event.location,
        category: event.category,
        visibility: event.visibility || 'public',
        organizer: event.organizer,
        created_by: event.createdBy,
        max_participants: event.maxParticipants,
        registration_required: event.registrationRequired,
        registration_deadline: event.registrationDeadline,
        status: 'published'
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Event>) {
    const { data, error } = await supabase
      .from('events')
      .update({
        title: updates.title,
        description: updates.description,
        start_date: updates.startDate,
        end_date: updates.endDate,
        location: updates.location,
        category: updates.category,
        visibility: updates.visibility,
        organizer: updates.organizer,
        max_participants: updates.maxParticipants,
        registration_required: updates.registrationRequired,
        registration_deadline: updates.registrationDeadline,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// User Settings Service
export const userSettingsService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data;
  },

  async upsert(settings: Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert([{
        user_id: settings.userId,
        notifications: settings.notifications,
        privacy: settings.privacy,
        display: settings.display,
        security: settings.security,
        communication: settings.communication,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Export utility function for generating reports
export const exportService = {
  async generateReport(type: string, format: 'pdf' | 'excel' | 'csv', filters?: any) {
    // This would integrate with actual export libraries
    console.log(`Generating ${type} report in ${format} format with filters:`, filters);
    
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
  }
};