import { 
  Student, Staff, Room, Bed, 
  Attendance, StaffAttendance, LeaveRequest, 
  MaintenanceRequest, Visitor, Message,
  Report, Application, StaffShift, StaffTask,
  DailyReport, AttendanceSheet, SystemSettings,
  DashboardStats, Activity, AutoAssignCriteria
} from '../types';

// Enhanced comprehensive demo data with 50+ students
export const enhancedMockStudents: Student[] = [
  // Computer Science Students
  {
    id: '1',
    userId: 'student-1',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@tchostel.edu',
    enrollmentNumber: 'TC2024001',
    course: 'Computer Science',
    year: 2,
    gender: 'male',
    dateOfBirth: '2002-05-15',
    contactNumber: '9876543210',
    address: '123 Tech Street, Bangalore, Karnataka',
    guardianName: 'Rajesh Sharma',
    guardianContact: '9876543211',
    emergencyContact: '9876543212',
    medicalNotes: 'No known allergies',
    roomId: '1',
    bedId: '1-bed-1',
    profileImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2024-01-15',
    isActive: true,
    currentStatus: 'present'
  },
  {
    id: '2',
    userId: 'student-2',
    name: 'Priya Patel',
    email: 'priya.patel@tchostel.edu',
    enrollmentNumber: 'TC2024002',
    course: 'Computer Science',
    year: 1,
    gender: 'female',
    dateOfBirth: '2003-08-22',
    contactNumber: '9876543213',
    address: '456 Innovation Avenue, Mumbai, Maharashtra',
    guardianName: 'Suresh Patel',
    guardianContact: '9876543214',
    emergencyContact: '9876543215',
    medicalNotes: 'Asthma - carries inhaler',
    roomId: '35',
    bedId: '35-bed-1',
    profileImage: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2024-01-15',
    isActive: true,
    currentStatus: 'present'
  },
  {
    id: '3',
    userId: 'student-3',
    name: 'Rahul Kumar',
    email: 'rahul.kumar@tchostel.edu',
    enrollmentNumber: 'TC2024003',
    course: 'Computer Science',
    year: 3,
    gender: 'male',
    dateOfBirth: '2001-12-10',
    contactNumber: '9876543216',
    address: '789 Code Lane, Chennai, Tamil Nadu',
    guardianName: 'Vijay Kumar',
    guardianContact: '9876543217',
    emergencyContact: '9876543218',
    medicalNotes: '',
    roomId: '2',
    bedId: '2-bed-1',
    profileImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2023-01-15',
    isActive: true,
    currentStatus: 'present'
  },
  // Electronics Engineering Students
  {
    id: '4',
    userId: 'student-4',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@tchostel.edu',
    enrollmentNumber: 'TC2024004',
    course: 'Electronics Engineering',
    year: 2,
    gender: 'female',
    dateOfBirth: '2002-03-18',
    contactNumber: '9876543219',
    address: '321 Circuit Road, Hyderabad, Telangana',
    guardianName: 'Ravi Reddy',
    guardianContact: '9876543220',
    emergencyContact: '9876543221',
    medicalNotes: 'Diabetic - Type 1',
    roomId: '36',
    bedId: '36-bed-1',
    profileImage: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2024-01-15',
    isActive: true,
    currentStatus: 'on-leave'
  },
  {
    id: '5',
    userId: 'student-5',
    name: 'Vikram Singh',
    email: 'vikram.singh@tchostel.edu',
    enrollmentNumber: 'TC2024005',
    course: 'Electronics Engineering',
    year: 1,
    gender: 'male',
    dateOfBirth: '2003-07-25',
    contactNumber: '9876543222',
    address: '654 Voltage Street, Delhi, Delhi',
    guardianName: 'Harpreet Singh',
    guardianContact: '9876543223',
    emergencyContact: '9876543224',
    medicalNotes: '',
    roomId: '3',
    bedId: '3-bed-1',
    profileImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2024-01-15',
    isActive: true,
    currentStatus: 'present'
  },
  // Mechanical Engineering Students
  {
    id: '6',
    userId: 'student-6',
    name: 'Ananya Gupta',
    email: 'ananya.gupta@tchostel.edu',
    enrollmentNumber: 'TC2024006',
    course: 'Mechanical Engineering',
    year: 4,
    gender: 'female',
    dateOfBirth: '2000-11-08',
    contactNumber: '9876543225',
    address: '987 Gear Avenue, Pune, Maharashtra',
    guardianName: 'Amit Gupta',
    guardianContact: '9876543226',
    emergencyContact: '9876543227',
    medicalNotes: 'Lactose intolerant',
    roomId: '37',
    bedId: '37-bed-1',
    profileImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2021-01-15',
    isActive: true,
    currentStatus: 'present'
  },
  {
    id: '7',
    userId: 'student-7',
    name: 'Karthik Nair',
    email: 'karthik.nair@tchostel.edu',
    enrollmentNumber: 'TC2024007',
    course: 'Mechanical Engineering',
    year: 3,
    gender: 'male',
    dateOfBirth: '2001-09-14',
    contactNumber: '9876543228',
    address: '147 Engine Road, Kochi, Kerala',
    guardianName: 'Sunil Nair',
    guardianContact: '9876543229',
    emergencyContact: '9876543230',
    medicalNotes: '',
    roomId: '4',
    bedId: '4-bed-1',
    profileImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2022-01-15',
    isActive: true,
    currentStatus: 'present'
  },
  // Civil Engineering Students
  {
    id: '8',
    userId: 'student-8',
    name: 'Divya Krishnan',
    email: 'divya.krishnan@tchostel.edu',
    enrollmentNumber: 'TC2024008',
    course: 'Civil Engineering',
    year: 2,
    gender: 'female',
    dateOfBirth: '2002-06-30',
    contactNumber: '9876543231',
    address: '258 Structure Street, Coimbatore, Tamil Nadu',
    guardianName: 'Raman Krishnan',
    guardianContact: '9876543232',
    emergencyContact: '9876543233',
    medicalNotes: 'Migraine - takes medication',
    roomId: '38',
    bedId: '38-bed-1',
    profileImage: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2024-01-15',
    isActive: true,
    currentStatus: 'present'
  },
  {
    id: '9',
    userId: 'student-9',
    name: 'Aditya Joshi',
    email: 'aditya.joshi@tchostel.edu',
    enrollmentNumber: 'TC2024009',
    course: 'Civil Engineering',
    year: 1,
    gender: 'male',
    dateOfBirth: '2003-04-12',
    contactNumber: '9876543234',
    address: '369 Foundation Road, Jaipur, Rajasthan',
    guardianName: 'Manoj Joshi',
    guardianContact: '9876543235',
    emergencyContact: '9876543236',
    medicalNotes: '',
    roomId: '5',
    bedId: '5-bed-1',
    profileImage: 'https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2024-01-15',
    isActive: true,
    currentStatus: 'present'
  },
  // Continue with more students...
  {
    id: '10',
    userId: 'student-10',
    name: 'Meera Iyer',
    email: 'meera.iyer@tchostel.edu',
    enrollmentNumber: 'TC2024010',
    course: 'Information Technology',
    year: 4,
    gender: 'female',
    dateOfBirth: '2000-01-20',
    contactNumber: '9876543237',
    address: '741 Data Drive, Mysore, Karnataka',
    guardianName: 'Venkat Iyer',
    guardianContact: '9876543238',
    emergencyContact: '9876543239',
    medicalNotes: 'Vegetarian diet only',
    roomId: '39',
    bedId: '39-bed-1',
    profileImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    joiningDate: '2021-01-15',
    isActive: true,
    currentStatus: 'present'
  }
  // Add 40 more students with similar detailed profiles...
];

// Generate additional 40 students programmatically
const generateAdditionalStudents = (): Student[] => {
  const courses = ['Computer Science', 'Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Information Technology'];
  const maleNames = ['Rohit', 'Amit', 'Suresh', 'Deepak', 'Manoj', 'Ravi', 'Ajay', 'Vinay', 'Sanjay', 'Prakash'];
  const femaleNames = ['Kavya', 'Pooja', 'Nisha', 'Ritu', 'Swati', 'Neha', 'Preeti', 'Sunita', 'Rekha', 'Geeta'];
  const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Nair', 'Iyer', 'Joshi', 'Agarwal'];
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Maharashtra', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'];

  const additionalStudents: Student[] = [];

  for (let i = 11; i <= 50; i++) {
    const isGenderMale = Math.random() > 0.5;
    const gender = isGenderMale ? 'male' : 'female';
    const firstName = isGenderMale ? maleNames[Math.floor(Math.random() * maleNames.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const course = courses[Math.floor(Math.random() * courses.length)];
    const year = Math.floor(Math.random() * 4) + 1;
    const cityIndex = Math.floor(Math.random() * cities.length);
    const city = cities[cityIndex];
    const state = states[cityIndex];

    additionalStudents.push({
      id: i.toString(),
      userId: `student-${i}`,
      name,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@tchostel.edu`,
      enrollmentNumber: `TC2024${i.toString().padStart(3, '0')}`,
      course,
      year,
      gender,
      dateOfBirth: `${2000 + (4 - year)}-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
      contactNumber: `98765432${(10 + i).toString().slice(-2)}`,
      address: `${Math.floor(Math.random() * 999) + 1} ${course.split(' ')[0]} Street, ${city}, ${state}`,
      guardianName: `${isGenderMale ? 'Mr.' : 'Mrs.'} ${lastName}`,
      guardianContact: `98765432${(50 + i).toString().slice(-2)}`,
      emergencyContact: `98765432${(100 + i).toString().slice(-2)}`,
      medicalNotes: Math.random() > 0.7 ? 'No known medical issues' : '',
      roomId: Math.random() > 0.1 ? Math.floor(Math.random() * 50 + 1).toString() : undefined,
      bedId: Math.random() > 0.1 ? `${Math.floor(Math.random() * 50 + 1)}-bed-${Math.floor(Math.random() * 3) + 1}` : undefined,
      profileImage: `https://images.pexels.com/photos/${1000000 + Math.floor(Math.random() * 500000)}/pexels-photo-${1000000 + Math.floor(Math.random() * 500000)}.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1`,
      joiningDate: `${2021 + (4 - year)}-01-15`,
      isActive: true,
      currentStatus: Math.random() > 0.9 ? 'on-leave' : 'present'
    });
  }

  return additionalStudents;
};

// Enhanced staff data with 20+ members
export const enhancedMockStaff: Staff[] = [
  {
    id: '1',
    userId: 'staff-1',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@tchostel.edu',
    employeeId: 'TC-STAFF-001',
    position: 'Hostel Supervisor',
    contactNumber: '9876543300',
    address: '101 Staff Quarters, TC Campus',
    joiningDate: '2018-03-15',
    profileImage: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    isActive: true,
    shiftTiming: '06:00-14:00',
    department: 'Hostel Operations'
  },
  {
    id: '2',
    userId: 'warden-1',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@tchostel.edu',
    employeeId: 'TC-WARDEN-001',
    position: 'Hostel Warden',
    contactNumber: '9876543301',
    address: '102 Staff Quarters, TC Campus',
    joiningDate: '2015-06-20',
    profileImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    isActive: true,
    shiftTiming: '08:00-20:00',
    department: 'Administration'
  },
  {
    id: '3',
    userId: 'staff-3',
    name: 'Suresh Menon',
    email: 'suresh.menon@tchostel.edu',
    employeeId: 'TC-STAFF-002',
    position: 'Security Officer',
    contactNumber: '9876543302',
    address: '103 Staff Quarters, TC Campus',
    joiningDate: '2019-08-10',
    profileImage: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    isActive: true,
    shiftTiming: '22:00-06:00',
    department: 'Security'
  },
  {
    id: '4',
    userId: 'staff-4',
    name: 'Lakshmi Devi',
    email: 'lakshmi.devi@tchostel.edu',
    employeeId: 'TC-STAFF-003',
    position: 'Housekeeping Supervisor',
    contactNumber: '9876543303',
    address: '104 Staff Quarters, TC Campus',
    joiningDate: '2020-02-14',
    profileImage: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    isActive: true,
    shiftTiming: '05:00-13:00',
    department: 'Housekeeping'
  },
  {
    id: '5',
    userId: 'staff-5',
    name: 'Ramesh Babu',
    email: 'ramesh.babu@tchostel.edu',
    employeeId: 'TC-STAFF-004',
    position: 'Maintenance Technician',
    contactNumber: '9876543304',
    address: '105 Staff Quarters, TC Campus',
    joiningDate: '2017-11-22',
    profileImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    isActive: true,
    shiftTiming: '08:00-16:00',
    department: 'Maintenance'
  }
  // Add 15 more staff members...
];

// Enhanced leave requests with comprehensive data
export const enhancedMockLeaveRequests: LeaveRequest[] = [
  {
    id: '1',
    studentId: '4', // Sneha Reddy
    type: 'medical-leave',
    startDate: '2024-12-20',
    endDate: '2024-12-25',
    reason: 'Medical checkup and treatment for diabetes management',
    status: 'approved',
    submittedAt: '2024-12-18T10:30:00Z',
    reviewedAt: '2024-12-18T14:20:00Z',
    reviewedBy: 'warden-1',
    approverComments: 'Approved for medical treatment. Please submit medical certificate upon return.',
    emergencyContact: '9876543220',
    checkOutTime: '2024-12-20T09:15:00Z',
    parentApprovalStatus: 'approved',
    parentApprovalTime: '2024-12-18T11:45:00Z',
    smsNotificationSent: true,
    smsDeliveryStatus: 'delivered'
  },
  {
    id: '2',
    studentId: '1', // Arjun Sharma
    type: 'home-leave',
    startDate: '2024-12-22',
    endDate: '2024-12-26',
    reason: 'Family function - sister\'s wedding',
    status: 'pending',
    submittedAt: '2024-12-19T16:45:00Z',
    emergencyContact: '9876543211',
    parentApprovalStatus: 'pending',
    smsNotificationSent: true,
    smsDeliveryStatus: 'delivered'
  },
  {
    id: '3',
    studentId: '6', // Ananya Gupta
    type: 'emergency-leave',
    startDate: '2024-12-21',
    endDate: '2024-12-23',
    reason: 'Grandmother hospitalized - urgent family matter',
    status: 'approved',
    submittedAt: '2024-12-20T20:30:00Z',
    reviewedAt: '2024-12-20T21:00:00Z',
    reviewedBy: 'warden-1',
    approverComments: 'Emergency leave approved. Please keep us updated.',
    emergencyContact: '9876543226',
    checkOutTime: '2024-12-21T06:00:00Z',
    parentApprovalStatus: 'approved',
    parentApprovalTime: '2024-12-20T20:45:00Z',
    smsNotificationSent: true,
    smsDeliveryStatus: 'delivered'
  }
];

// Enhanced staff tasks with photo submission workflow
export const enhancedMockStaffTasks: StaffTask[] = [
  {
    id: '1',
    assignedTo: '1', // Rajesh Kumar
    assignedBy: 'warden-1',
    title: 'Room 201 Deep Cleaning',
    description: 'Complete deep cleaning of Room 201 including bathroom, windows, and furniture sanitization',
    priority: 'high',
    status: 'completed',
    dueDate: '2024-12-20T16:00:00Z',
    createdAt: '2024-12-19T08:00:00Z',
    completedAt: '2024-12-20T15:30:00Z',
    category: 'cleaning',
    estimatedHours: 3,
    actualHours: 2.5,
    notes: 'Room cleaned thoroughly. Found minor plumbing issue - reported separately.',
    attachments: [
      'https://images.pexels.com/photos/6195122/pexels-photo-6195122.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/6195123/pexels-photo-6195123.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ],
    photoSubmissionStatus: 'approved',
    photoApprovedBy: 'warden-1',
    photoApprovedAt: '2024-12-20T16:00:00Z'
  },
  {
    id: '2',
    assignedTo: '5', // Ramesh Babu
    assignedBy: 'warden-1',
    title: 'Fix AC Unit in Room 305',
    description: 'Repair malfunctioning AC unit in Room 305. Students reported no cooling.',
    priority: 'urgent',
    status: 'in-progress',
    dueDate: '2024-12-21T12:00:00Z',
    createdAt: '2024-12-20T09:00:00Z',
    category: 'maintenance',
    estimatedHours: 4,
    notes: 'Diagnosed compressor issue. Ordered replacement parts.',
    photoSubmissionStatus: 'pending',
    workInProgressPhotos: [
      'https://images.pexels.com/photos/8092/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ]
  },
  {
    id: '3',
    assignedTo: '3', // Suresh Menon
    assignedBy: 'staff-1',
    title: 'Night Security Round Documentation',
    description: 'Complete security rounds for all floors and document any issues or observations',
    priority: 'medium',
    status: 'completed',
    dueDate: '2024-12-20T06:00:00Z',
    createdAt: '2024-12-19T22:00:00Z',
    completedAt: '2024-12-20T05:45:00Z',
    category: 'security',
    estimatedHours: 8,
    actualHours: 8,
    notes: 'All floors checked. No security issues. One student returned late (logged separately).',
    attachments: [
      'https://images.pexels.com/photos/2882509/pexels-photo-2882509.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ],
    photoSubmissionStatus: 'approved',
    photoApprovedBy: 'warden-1',
    photoApprovedAt: '2024-12-20T08:00:00Z'
  }
];

// SMS notification templates and tracking
export interface SMSNotification {
  id: string;
  studentId: string;
  parentContact: string;
  leaveRequestId: string;
  messageContent: string;
  sentAt: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  approvalLink: string;
  approvalCode: string;
  parentResponse?: 'approved' | 'rejected';
  responseTime?: string;
}

export const mockSMSNotifications: SMSNotification[] = [
  {
    id: 'sms-1',
    studentId: '4',
    parentContact: '9876543220',
    leaveRequestId: '1',
    messageContent: 'TC Hostel: Your child Sneha Reddy has applied for medical leave from 20-Dec to 25-Dec. Reason: Medical checkup. Approve: Reply YES-TC001 or visit: https://tchostel.edu/approve/TC001',
    sentAt: '2024-12-18T10:31:00Z',
    deliveryStatus: 'delivered',
    approvalLink: 'https://tchostel.edu/approve/TC001',
    approvalCode: 'TC001',
    parentResponse: 'approved',
    responseTime: '2024-12-18T11:45:00Z'
  },
  {
    id: 'sms-2',
    studentId: '1',
    parentContact: '9876543211',
    leaveRequestId: '2',
    messageContent: 'TC Hostel: Your child Arjun Sharma has applied for home leave from 22-Dec to 26-Dec. Reason: Family function. Approve: Reply YES-TC002 or visit: https://tchostel.edu/approve/TC002',
    sentAt: '2024-12-19T16:46:00Z',
    deliveryStatus: 'delivered',
    approvalLink: 'https://tchostel.edu/approve/TC002',
    approvalCode: 'TC002',
    parentResponse: undefined,
    responseTime: undefined
  }
];

// Photo submission tracking
export interface PhotoSubmission {
  id: string;
  taskId: string;
  staffId: string;
  photos: string[];
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  taskTitle: string;
  staffName: string;
}

export const mockPhotoSubmissions: PhotoSubmission[] = [
  {
    id: 'photo-1',
    taskId: '1',
    staffId: '1',
    photos: [
      'https://images.pexels.com/photos/6195122/pexels-photo-6195122.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
      'https://images.pexels.com/photos/6195123/pexels-photo-6195123.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ],
    submittedAt: '2024-12-20T15:30:00Z',
    status: 'approved',
    approvedBy: 'warden-1',
    approvedAt: '2024-12-20T16:00:00Z',
    taskTitle: 'Room 201 Deep Cleaning',
    staffName: 'Dr. Rajesh Kumar'
  },
  {
    id: 'photo-2',
    taskId: '2',
    staffId: '5',
    photos: [
      'https://images.pexels.com/photos/8092/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
    ],
    submittedAt: '2024-12-20T14:20:00Z',
    status: 'pending',
    taskTitle: 'Fix AC Unit in Room 305',
    staffName: 'Ramesh Babu'
  }
];

// Historical academic data spanning 2-3 terms
export const academicTerms = [
  {
    id: 'term-1',
    name: 'Semester 1 - 2023',
    startDate: '2023-07-01',
    endDate: '2023-11-30',
    status: 'completed'
  },
  {
    id: 'term-2',
    name: 'Semester 2 - 2024',
    startDate: '2024-01-01',
    endDate: '2024-05-31',
    status: 'completed'
  },
  {
    id: 'term-3',
    name: 'Semester 1 - 2024',
    startDate: '2024-07-01',
    endDate: '2024-11-30',
    status: 'active'
  }
];

// Generate historical attendance data
export const generateHistoricalAttendance = (): Attendance[] => {
  const attendance: Attendance[] = [];
  const students = [...enhancedMockStudents, ...generateAdditionalStudents()];
  
  // Generate attendance for last 90 days
  for (let i = 90; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    students.forEach(student => {
      // 95% attendance rate with some variation
      const isPresent = Math.random() > 0.05;
      const morningStatus = isPresent ? 'present' : (Math.random() > 0.7 ? 'leave' : 'absent');
      const eveningStatus = isPresent ? 'present' : (Math.random() > 0.7 ? 'leave' : 'absent');
      
      attendance.push({
        id: `att-${student.id}-${dateString}`,
        studentId: student.id,
        date: dateString,
        morningStatus: morningStatus as 'present' | 'absent' | 'leave',
        eveningStatus: eveningStatus as 'present' | 'absent' | 'leave',
        remarks: !isPresent ? 'Marked by system' : '',
        recordedBy: 'staff-1',
        recordedAt: `${dateString}T08:00:00Z`
      });
    });
  }
  
  return attendance;
};

// Export enhanced data
export const getAllEnhancedStudents = () => {
  return [...enhancedMockStudents, ...generateAdditionalStudents()];
};

export const getAllEnhancedStaff = () => {
  return enhancedMockStaff;
};

export const getHistoricalAttendance = () => {
  return generateHistoricalAttendance();
};

// SMS service functions
export const sendLeaveApprovalSMS = async (studentId: string, leaveRequestId: string): Promise<SMSNotification> => {
  const student = getAllEnhancedStudents().find(s => s.id === studentId);
  if (!student) throw new Error('Student not found');

  const approvalCode = `TC${Date.now().toString().slice(-3)}`;
  const approvalLink = `https://tchostel.edu/approve/${approvalCode}`;
  
  const smsContent = `TC Hostel: Your child ${student.name} has applied for ${leaveRequestId} leave. Approve: Reply YES-${approvalCode} or visit: ${approvalLink}`;
  
  const notification: SMSNotification = {
    id: `sms-${Date.now()}`,
    studentId,
    parentContact: student.guardianContact,
    leaveRequestId,
    messageContent: smsContent,
    sentAt: new Date().toISOString(),
    deliveryStatus: 'pending',
    approvalLink,
    approvalCode
  };

  // Simulate SMS sending
  setTimeout(() => {
    notification.deliveryStatus = 'delivered';
  }, 2000);

  mockSMSNotifications.push(notification);
  return notification;
};

export const processParentApproval = (approvalCode: string, response: 'approved' | 'rejected'): boolean => {
  const notification = mockSMSNotifications.find(n => n.approvalCode === approvalCode);
  if (!notification) return false;

  notification.parentResponse = response;
  notification.responseTime = new Date().toISOString();

  // Update leave request status
  const leaveRequest = enhancedMockLeaveRequests.find(lr => lr.id === notification.leaveRequestId);
  if (leaveRequest) {
    leaveRequest.parentApprovalStatus = response;
    leaveRequest.parentApprovalTime = new Date().toISOString();
  }

  return true;
};

// Photo submission functions
export const submitTaskPhotos = async (taskId: string, photos: string[]): Promise<PhotoSubmission> => {
  const task = enhancedMockStaffTasks.find(t => t.id === taskId);
  const staff = enhancedMockStaff.find(s => s.id === task?.assignedTo);
  
  if (!task || !staff) throw new Error('Task or staff not found');

  const submission: PhotoSubmission = {
    id: `photo-${Date.now()}`,
    taskId,
    staffId: staff.id,
    photos,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    taskTitle: task.title,
    staffName: staff.name
  };

  mockPhotoSubmissions.push(submission);
  
  // Update task status
  task.photoSubmissionStatus = 'pending';
  task.attachments = photos;

  return submission;
};

export const approvePhotoSubmission = (submissionId: string, approverId: string): boolean => {
  const submission = mockPhotoSubmissions.find(s => s.id === submissionId);
  if (!submission) return false;

  submission.status = 'approved';
  submission.approvedBy = approverId;
  submission.approvedAt = new Date().toISOString();

  // Update related task
  const task = enhancedMockStaffTasks.find(t => t.id === submission.taskId);
  if (task) {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.photoSubmissionStatus = 'approved';
    task.photoApprovedBy = approverId;
    task.photoApprovedAt = new Date().toISOString();
  }

  return true;
};

export const rejectPhotoSubmission = (submissionId: string, reason: string, approverId: string): boolean => {
  const submission = mockPhotoSubmissions.find(s => s.id === submissionId);
  if (!submission) return false;

  submission.status = 'rejected';
  submission.rejectionReason = reason;
  submission.approvedBy = approverId;
  submission.approvedAt = new Date().toISOString();

  // Update related task
  const task = enhancedMockStaffTasks.find(t => t.id === submission.taskId);
  if (task) {
    task.photoSubmissionStatus = 'rejected';
    task.notes = `${task.notes || ''}\n\nPhoto submission rejected: ${reason}`;
  }

  return true;
};