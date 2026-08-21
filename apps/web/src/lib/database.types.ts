export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string | null
          name: string
          email: string
          role: 'admin' | 'warden' | 'staff' | 'student'
          profile_image: string | null
          is_active: boolean | null
          last_login: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          auth_id?: string | null
          name: string
          email: string
          role: 'admin' | 'warden' | 'staff' | 'student'
          profile_image?: string | null
          is_active?: boolean | null
          last_login?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          auth_id?: string | null
          name?: string
          email?: string
          role?: 'admin' | 'warden' | 'staff' | 'student'
          profile_image?: string | null
          is_active?: boolean | null
          last_login?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      students: {
        Row: {
          id: string
          user_id: string | null
          enrollment_number: string
          course: string
          year: number
          gender: 'male' | 'female' | 'other'
          date_of_birth: string
          contact_number: string
          address: string
          guardian_name: string
          guardian_contact: string
          emergency_contact: string
          medical_notes: string | null
          room_id: string | null
          bed_id: string | null
          joining_date: string
          current_status: 'present' | 'on-leave' | 'absent' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          enrollment_number: string
          course: string
          year: number
          gender: 'male' | 'female' | 'other'
          date_of_birth: string
          contact_number: string
          address: string
          guardian_name: string
          guardian_contact: string
          emergency_contact: string
          medical_notes?: string | null
          room_id?: string | null
          bed_id?: string | null
          joining_date?: string
          current_status?: 'present' | 'on-leave' | 'absent' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          enrollment_number?: string
          course?: string
          year?: number
          gender?: 'male' | 'female' | 'other'
          date_of_birth?: string
          contact_number?: string
          address?: string
          guardian_name?: string
          guardian_contact?: string
          emergency_contact?: string
          medical_notes?: string | null
          room_id?: string | null
          bed_id?: string | null
          joining_date?: string
          current_status?: 'present' | 'on-leave' | 'absent' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      staff: {
        Row: {
          id: string
          user_id: string | null
          employee_id: string
          position: string
          contact_number: string
          address: string
          joining_date: string
          shift_timing: string
          department: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          employee_id: string
          position: string
          contact_number: string
          address: string
          joining_date: string
          shift_timing: string
          department: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          employee_id?: string
          position?: string
          contact_number?: string
          address?: string
          joining_date?: string
          shift_timing?: string
          department?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      rooms: {
        Row: {
          id: string
          number: string
          floor: number
          capacity: number | null
          type: 'AC' | 'Non-AC'
          gender: 'male' | 'female' | 'any'
          status: 'available' | 'full' | 'maintenance' | null
          occupied_beds: number | null
          total_beds: number | null
          amenities: string[] | null
          last_cleaned: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          number: string
          floor: number
          capacity?: number | null
          type: 'AC' | 'Non-AC'
          gender: 'male' | 'female' | 'any'
          status?: 'available' | 'full' | 'maintenance' | null
          occupied_beds?: number | null
          total_beds?: number | null
          amenities?: string[] | null
          last_cleaned?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          number?: string
          floor?: number
          capacity?: number | null
          type?: 'AC' | 'Non-AC'
          gender?: 'male' | 'female' | 'any'
          status?: 'available' | 'full' | 'maintenance' | null
          occupied_beds?: number | null
          total_beds?: number | null
          amenities?: string[] | null
          last_cleaned?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      beds: {
        Row: {
          id: string
          room_id: string | null
          number: number
          status: 'available' | 'occupied' | 'maintenance' | null
          student_id: string | null
          assigned_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          room_id?: string | null
          number: number
          status?: 'available' | 'occupied' | 'maintenance' | null
          student_id?: string | null
          assigned_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string | null
          number?: number
          status?: 'available' | 'occupied' | 'maintenance' | null
          student_id?: string | null
          assigned_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      attendance: {
        Row: {
          id: string
          student_id: string | null
          date: string
          morning_status: 'present' | 'absent' | 'leave'
          evening_status: 'present' | 'absent' | 'leave'
          remarks: string | null
          recorded_by: string | null
          recorded_at: string | null
        }
        Insert: {
          id?: string
          student_id?: string | null
          date: string
          morning_status: 'present' | 'absent' | 'leave'
          evening_status: 'present' | 'absent' | 'leave'
          remarks?: string | null
          recorded_by?: string | null
          recorded_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string | null
          date?: string
          morning_status?: 'present' | 'absent' | 'leave'
          evening_status?: 'present' | 'absent' | 'leave'
          remarks?: string | null
          recorded_by?: string | null
          recorded_at?: string | null
        }
      }
      leave_requests: {
        Row: {
          id: string
          student_id: string | null
          type: 'home-leave' | 'medical-leave' | 'emergency-leave' | 'other'
          start_date: string
          end_date: string
          reason: string
          status: 'pending' | 'approved' | 'rejected' | null
          submitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          approver_comments: string | null
          documents: string[] | null
          emergency_contact: string | null
          check_out_time: string | null
          check_in_time: string | null
          actual_return_date: string | null
        }
        Insert: {
          id?: string
          student_id?: string | null
          type: 'home-leave' | 'medical-leave' | 'emergency-leave' | 'other'
          start_date: string
          end_date: string
          reason: string
          status?: 'pending' | 'approved' | 'rejected' | null
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          approver_comments?: string | null
          documents?: string[] | null
          emergency_contact?: string | null
          check_out_time?: string | null
          check_in_time?: string | null
          actual_return_date?: string | null
        }
        Update: {
          id?: string
          student_id?: string | null
          type?: 'home-leave' | 'medical-leave' | 'emergency-leave' | 'other'
          start_date?: string
          end_date?: string
          reason?: string
          status?: 'pending' | 'approved' | 'rejected' | null
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          approver_comments?: string | null
          documents?: string[] | null
          emergency_contact?: string | null
          check_out_time?: string | null
          check_in_time?: string | null
          actual_return_date?: string | null
        }
      }
      maintenance_requests: {
        Row: {
          id: string
          requester_id: string | null
          requester_type: 'student' | 'staff'
          room_id: string | null
          title: string
          description: string
          priority: 'low' | 'medium' | 'high' | 'urgent' | null
          status: 'pending' | 'in-progress' | 'completed' | 'rejected' | null
          category: 'electrical' | 'plumbing' | 'furniture' | 'cleaning' | 'ac' | 'other'
          created_at: string | null
          assigned_to: string | null
          completed_at: string | null
          estimated_cost: number | null
          actual_cost: number | null
          remarks: string | null
          images: string[] | null
        }
        Insert: {
          id?: string
          requester_id?: string | null
          requester_type: 'student' | 'staff'
          room_id?: string | null
          title: string
          description: string
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          status?: 'pending' | 'in-progress' | 'completed' | 'rejected' | null
          category: 'electrical' | 'plumbing' | 'furniture' | 'cleaning' | 'ac' | 'other'
          created_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          remarks?: string | null
          images?: string[] | null
        }
        Update: {
          id?: string
          requester_id?: string | null
          requester_type?: 'student' | 'staff'
          room_id?: string | null
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          status?: 'pending' | 'in-progress' | 'completed' | 'rejected' | null
          category?: 'electrical' | 'plumbing' | 'furniture' | 'cleaning' | 'ac' | 'other'
          created_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          remarks?: string | null
          images?: string[] | null
        }
      }
      visitors: {
        Row: {
          id: string
          name: string
          contact_number: string
          purpose: string
          student_id: string | null
          staff_id: string | null
          check_in_time: string | null
          check_out_time: string | null
          id_proof_type: string
          id_proof_number: string
          vehicle_number: string | null
          approved_by: string | null
          visit_duration: number | null
          remarks: string | null
        }
        Insert: {
          id?: string
          name: string
          contact_number: string
          purpose: string
          student_id?: string | null
          staff_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          id_proof_type: string
          id_proof_number: string
          vehicle_number?: string | null
          approved_by?: string | null
          visit_duration?: number | null
          remarks?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact_number?: string
          purpose?: string
          student_id?: string | null
          staff_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          id_proof_type?: string
          id_proof_number?: string
          vehicle_number?: string | null
          approved_by?: string | null
          visit_duration?: number | null
          remarks?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string | null
          receiver_id: string | null
          content: string
          subject: string | null
          timestamp: string | null
          read: boolean | null
          message_type: 'direct' | 'announcement' | 'system' | null
          priority: 'low' | 'normal' | 'high' | 'urgent' | null
          attachments: string[] | null
        }
        Insert: {
          id?: string
          sender_id?: string | null
          receiver_id?: string | null
          content: string
          subject?: string | null
          timestamp?: string | null
          read?: boolean | null
          message_type?: 'direct' | 'announcement' | 'system' | null
          priority?: 'low' | 'normal' | 'high' | 'urgent' | null
          attachments?: string[] | null
        }
        Update: {
          id?: string
          sender_id?: string | null
          receiver_id?: string | null
          content?: string
          subject?: string | null
          timestamp?: string | null
          read?: boolean | null
          message_type?: 'direct' | 'announcement' | 'system' | null
          priority?: 'low' | 'normal' | 'high' | 'urgent' | null
          attachments?: string[] | null
        }
      }
      reports: {
        Row: {
          id: string
          student_id: string | null
          type: 'maintenance' | 'complaint' | 'suggestion' | 'emergency'
          title: string
          description: string
          priority: 'low' | 'medium' | 'high' | 'urgent' | null
          status: 'pending' | 'in-progress' | 'resolved' | 'closed' | null
          category: string
          created_at: string | null
          updated_at: string | null
          assigned_to: string | null
          resolution: string | null
          attachments: string[] | null
        }
        Insert: {
          id?: string
          student_id?: string | null
          type: 'maintenance' | 'complaint' | 'suggestion' | 'emergency'
          title: string
          description: string
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          status?: 'pending' | 'in-progress' | 'resolved' | 'closed' | null
          category: string
          created_at?: string | null
          updated_at?: string | null
          assigned_to?: string | null
          resolution?: string | null
          attachments?: string[] | null
        }
        Update: {
          id?: string
          student_id?: string | null
          type?: 'maintenance' | 'complaint' | 'suggestion' | 'emergency'
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          status?: 'pending' | 'in-progress' | 'resolved' | 'closed' | null
          category?: string
          created_at?: string | null
          updated_at?: string | null
          assigned_to?: string | null
          resolution?: string | null
          attachments?: string[] | null
        }
      }
      applications: {
        Row: {
          id: string
          student_id: string | null
          type: 'leave' | 'room-change' | 'course-change' | 'document-request' | 'other'
          title: string
          description: string
          status: 'pending' | 'approved' | 'rejected' | 'under-review' | null
          urgency: 'low' | 'medium' | 'high' | null
          submitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          comments: string | null
          documents: string[] | null
          expected_completion_date: string | null
        }
        Insert: {
          id?: string
          student_id?: string | null
          type: 'leave' | 'room-change' | 'course-change' | 'document-request' | 'other'
          title: string
          description: string
          status?: 'pending' | 'approved' | 'rejected' | 'under-review' | null
          urgency?: 'low' | 'medium' | 'high' | null
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          comments?: string | null
          documents?: string[] | null
          expected_completion_date?: string | null
        }
        Update: {
          id?: string
          student_id?: string | null
          type?: 'leave' | 'room-change' | 'course-change' | 'document-request' | 'other'
          title?: string
          description?: string
          status?: 'pending' | 'approved' | 'rejected' | 'under-review' | null
          urgency?: 'low' | 'medium' | 'high' | null
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          comments?: string | null
          documents?: string[] | null
          expected_completion_date?: string | null
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string
          start_date: string
          end_date: string
          location: string
          category: 'academic' | 'cultural' | 'sports' | 'social' | 'official'
          visibility: 'public' | 'students-only' | 'staff-only' | 'private' | null
          organizer: string
          created_by: string | null
          max_participants: number | null
          registration_required: boolean | null
          registration_deadline: string | null
          status: 'draft' | 'published' | 'cancelled' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          start_date: string
          end_date: string
          location: string
          category: 'academic' | 'cultural' | 'sports' | 'social' | 'official'
          visibility?: 'public' | 'students-only' | 'staff-only' | 'private' | null
          organizer: string
          created_by?: string | null
          max_participants?: number | null
          registration_required?: boolean | null
          registration_deadline?: string | null
          status?: 'draft' | 'published' | 'cancelled' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          start_date?: string
          end_date?: string
          location?: string
          category?: 'academic' | 'cultural' | 'sports' | 'social' | 'official'
          visibility?: 'public' | 'students-only' | 'staff-only' | 'private' | null
          organizer?: string
          created_by?: string | null
          max_participants?: number | null
          registration_required?: boolean | null
          registration_deadline?: string | null
          status?: 'draft' | 'published' | 'cancelled' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      event_registrations: {
        Row: {
          id: string
          event_id: string | null
          student_id: string | null
          registered_at: string | null
          status: 'registered' | 'attended' | 'cancelled' | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          student_id?: string | null
          registered_at?: string | null
          status?: 'registered' | 'attended' | 'cancelled' | null
        }
        Update: {
          id?: string
          event_id?: string | null
          student_id?: string | null
          registered_at?: string | null
          status?: 'registered' | 'attended' | 'cancelled' | null
        }
      }
      staff_shifts: {
        Row: {
          id: string
          staff_id: string | null
          date: string
          start_time: string
          end_time: string
          duration: number
          status: 'scheduled' | 'active' | 'completed' | 'missed' | null
          check_in_time: string | null
          check_out_time: string | null
          actual_duration: number | null
          location: string
          responsibilities: string[] | null
          notes: string | null
        }
        Insert: {
          id?: string
          staff_id?: string | null
          date: string
          start_time: string
          end_time: string
          duration: number
          status?: 'scheduled' | 'active' | 'completed' | 'missed' | null
          check_in_time?: string | null
          check_out_time?: string | null
          actual_duration?: number | null
          location: string
          responsibilities?: string[] | null
          notes?: string | null
        }
        Update: {
          id?: string
          staff_id?: string | null
          date?: string
          start_time?: string
          end_time?: string
          duration?: number
          status?: 'scheduled' | 'active' | 'completed' | 'missed' | null
          check_in_time?: string | null
          check_out_time?: string | null
          actual_duration?: number | null
          location?: string
          responsibilities?: string[] | null
          notes?: string | null
        }
      }
      staff_tasks: {
        Row: {
          id: string
          assigned_to: string | null
          assigned_by: string | null
          title: string
          description: string
          priority: 'low' | 'medium' | 'high' | 'urgent' | null
          status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | null
          due_date: string
          created_at: string | null
          completed_at: string | null
          category: 'maintenance' | 'cleaning' | 'security' | 'administrative' | 'other'
          estimated_hours: number | null
          actual_hours: number | null
          notes: string | null
          attachments: string[] | null
        }
        Insert: {
          id?: string
          assigned_to?: string | null
          assigned_by?: string | null
          title: string
          description: string
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          status?: 'pending' | 'in-progress' | 'completed' | 'cancelled' | null
          due_date: string
          created_at?: string | null
          completed_at?: string | null
          category: 'maintenance' | 'cleaning' | 'security' | 'administrative' | 'other'
          estimated_hours?: number | null
          actual_hours?: number | null
          notes?: string | null
          attachments?: string[] | null
        }
        Update: {
          id?: string
          assigned_to?: string | null
          assigned_by?: string | null
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null
          status?: 'pending' | 'in-progress' | 'completed' | 'cancelled' | null
          due_date?: string
          created_at?: string | null
          completed_at?: string | null
          category?: 'maintenance' | 'cleaning' | 'security' | 'administrative' | 'other'
          estimated_hours?: number | null
          actual_hours?: number | null
          notes?: string | null
          attachments?: string[] | null
        }
      }
      daily_reports: {
        Row: {
          id: string
          staff_id: string | null
          date: string
          shift_start: string
          shift_end: string
          tasks_completed: string[] | null
          incidents_reported: string[] | null
          maintenance_issues: string[] | null
          student_interactions: number | null
          visitor_count: number | null
          notes: string | null
          submitted_at: string | null
          status: 'draft' | 'submitted' | 'reviewed' | null
          reviewed_by: string | null
          review_comments: string | null
        }
        Insert: {
          id?: string
          staff_id?: string | null
          date: string
          shift_start: string
          shift_end: string
          tasks_completed?: string[] | null
          incidents_reported?: string[] | null
          maintenance_issues?: string[] | null
          student_interactions?: number | null
          visitor_count?: number | null
          notes?: string | null
          submitted_at?: string | null
          status?: 'draft' | 'submitted' | 'reviewed' | null
          reviewed_by?: string | null
          review_comments?: string | null
        }
        Update: {
          id?: string
          staff_id?: string | null
          date?: string
          shift_start?: string
          shift_end?: string
          tasks_completed?: string[] | null
          incidents_reported?: string[] | null
          maintenance_issues?: string[] | null
          student_interactions?: number | null
          visitor_count?: number | null
          notes?: string | null
          submitted_at?: string | null
          status?: 'draft' | 'submitted' | 'reviewed' | null
          reviewed_by?: string | null
          review_comments?: string | null
        }
      }
      attendance_sheets: {
        Row: {
          id: string
          date: string
          room_id: string | null
          floor: number | null
          recorded_by: string | null
          students: Json
          submitted_at: string | null
          submitted_to_admin: boolean | null
          admin_reviewed: boolean | null
          review_comments: string | null
        }
        Insert: {
          id?: string
          date: string
          room_id?: string | null
          floor?: number | null
          recorded_by?: string | null
          students: Json
          submitted_at?: string | null
          submitted_to_admin?: boolean | null
          admin_reviewed?: boolean | null
          review_comments?: string | null
        }
        Update: {
          id?: string
          date?: string
          room_id?: string | null
          floor?: number | null
          recorded_by?: string | null
          students?: Json
          submitted_at?: string | null
          submitted_to_admin?: boolean | null
          admin_reviewed?: boolean | null
          review_comments?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string | null
          notifications: Json | null
          privacy: Json | null
          display: Json | null
          security: Json | null
          communication: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          notifications?: Json | null
          privacy?: Json | null
          display?: Json | null
          security?: Json | null
          communication?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          notifications?: Json | null
          privacy?: Json | null
          display?: Json | null
          security?: Json | null
          communication?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}