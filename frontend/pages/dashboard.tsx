import React, { useMemo } from 'react';
import { useAuthStore } from '../store/auth-store';
import { StatCard } from '../components/dashboard/stat-card';
import { OccupancyChart } from '../components/dashboard/occupancy-chart';
import { RecentActivities } from '../components/dashboard/recent-activities';
import { PhotoApprovalDashboard } from '../components/warden/photo-approval-dashboard';
import { StudentDataDashboard } from '../components/student/student-data-dashboard';
import { ErrorBoundary } from '../components/error-boundary/error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Building2, Users, Calendar, AlertTriangle, UserCheck, Clock, Star, Sparkles, Zap, Heart, ListChecks, BarChart3 } from 'lucide-react';
import { getDashboardStats, getRecentActivities, getLinkedStudent, getLinkedStaff, getLinkedStudentId, getLinkedStaffId, mockAttendance, mockLeaveRequests, mockStudents, mockRooms, mockBeds, mockStaffTasks, mockApplications } from '../store/mock-data';
import { useDataRefresh } from '../utils/use-data-refresh';
import { EVENTS } from '../utils/event-bus';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || 'student';
  const refreshKey = useDataRefresh([EVENTS.STUDENT_UPDATED, EVENTS.LEAVE_UPDATED, EVENTS.TASK_UPDATED, EVENTS.ATTENDANCE_UPDATED, EVENTS.ROOM_UPDATED, EVENTS.STAFF_UPDATED]);
  const stats = useMemo(() => getDashboardStats(), [refreshKey]);

  // === Student computed data ===
  const studentData = useMemo(() => {
    if (userRole !== 'student' || !user?.id) return null;
    const studentId = getLinkedStudentId(user.id);
    if (!studentId) return null;
    const student = mockStudents.find(s => s.id === studentId);
    if (!student) return null;

    const records = mockAttendance.filter(a => a.studentId === studentId);
    const totalSessions = records.length * 2;
    const presentSessions = records.filter(a => a.morningStatus === 'present').length + records.filter(a => a.eveningStatus === 'present').length;
    const attendancePercent = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

    const myLeaves = mockLeaveRequests.filter(l => l.studentId === studentId);
    const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;
    const approvedLeaves = myLeaves.filter(l => l.status === 'approved').length;

    const myApps = mockApplications.filter((a: any) => a.studentId === studentId);
    const pendingApps = myApps.filter((a: any) => a.status === 'pending').length;
    const totalApps = myApps.length;

    const room = student.roomId ? mockRooms.find(r => r.id === student.roomId) : null;
    const bed = student.bedId ? mockBeds.find(b => b.id === student.bedId) : null;
    const roomLabel = room ? `Room ${room.number}${bed ? `, Bed ${bed.number}` : ''}` : 'Not Assigned';

    const activities = getRecentActivities(user.id);

    return { student, attendancePercent, pendingLeaves, approvedLeaves, pendingApps, totalApps, roomLabel, activities };
  }, [user?.id, userRole, refreshKey]);

  // === Staff computed data ===
  const staffData = useMemo(() => {
    if (userRole !== 'staff' || !user?.id) return null;
    const staffId = getLinkedStaffId(user.id);
    if (!staffId) return null;

    const myTasks = mockStaffTasks.filter(t => t.assignedTo === staffId);
    const pendingTasks = myTasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = myTasks.filter(t => t.status === 'in-progress').length;
    const completedTasks = myTasks.filter(t => t.status === 'completed').length;
    const totalTasks = myTasks.length;

    return { pendingTasks, inProgressTasks, completedTasks, totalTasks };
  }, [user?.id, userRole, refreshKey]);

  return (
    <ErrorBoundary>
    <div className="space-y-8">
      {/* Enhanced welcome header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="absolute inset-0 bg-pattern-dots opacity-30"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm border border-white/30">
              <Sparkles className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-primary-100 text-lg">Welcome back, {user?.name}! ✨</p>
            </div>
          </div>
          <div className="text-sm text-primary-200 font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Admin/Warden Dashboard */}
      {(userRole === 'admin' || userRole === 'warden') && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={Users}
              description="Registered students"
              trend={{
                value: 2,
                isPositive: true,
              }}
              className="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 dark:from-primary-900/20 dark:via-primary-800/20 dark:to-primary-700/20 border-2 border-primary-200 dark:border-primary-800"
            />
            <StatCard
              title="Present Today"
              value={stats.presentStudents}
              icon={UserCheck}
              description={`${stats.onLeaveStudents} on leave`}
              className="bg-gradient-to-br from-success-50 via-success-100 to-success-200 dark:from-success-900/20 dark:via-success-800/20 dark:to-success-700/20 border-2 border-success-200 dark:border-success-800"
            />
            <StatCard
              title="Room Occupancy"
              value={`${stats.occupiedRooms}/${stats.totalRooms}`}
              icon={Building2}
              description="Occupied rooms"
              trend={{
                value: 5,
                isPositive: true,
              }}
              className="bg-gradient-to-br from-secondary-50 via-secondary-100 to-secondary-200 dark:from-secondary-900/20 dark:via-secondary-800/20 dark:to-secondary-700/20 border-2 border-secondary-200 dark:border-secondary-800"
            />
            <StatCard
              title="Pending Requests"
              value={stats.pendingApplications + stats.pendingMaintenanceRequests}
              icon={Clock}
              description="Applications & Maintenance"
              className="bg-gradient-to-br from-warning-50 via-warning-100 to-warning-200 dark:from-warning-900/20 dark:via-warning-800/20 dark:to-warning-700/20 border-2 border-warning-200 dark:border-warning-800"
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
            <OccupancyChart
              occupied={stats.occupiedRooms}
              available={stats.availableRooms}
              maintenance={stats.maintenanceRooms}
            />
            <RecentActivities activities={stats.recentActivities} />
            <div className="space-y-6">
              <StatCard
                title="Today's Visitors"
                value={stats.todayVisitors}
                icon={Users}
                description="Visitor entries"
                className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800"
              />
              <StatCard
                title="Active Staff"
                value={stats.activeStaff}
                icon={UserCheck}
                description="On duty today"
                className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-2 border-success-200 dark:border-success-800"
              />
            </div>
          </div>

          {/* Enhanced quick actions */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4 flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary-600" />
                  <span>Quick Actions</span>
                </h3>
                <div className="space-y-3">
                  <button className="w-full text-left text-sm text-primary-600 hover:text-primary-700 hover:underline font-semibold transition-all duration-200 hover:scale-105">
                    📝 Mark Attendance
                  </button>
                  <button className="w-full text-left text-sm text-primary-600 hover:text-primary-700 hover:underline font-semibold transition-all duration-200 hover:scale-105">
                    👥 Add New Student
                  </button>
                  <button className="w-full text-left text-sm text-primary-600 hover:text-primary-700 hover:underline font-semibold transition-all duration-200 hover:scale-105">
                    🔧 Create Maintenance Request
                  </button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20 border-2 border-warning-200 dark:border-warning-800 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4 flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                  <span>Pending Approvals</span>
                </h3>
                <div className="space-y-3">
                  <div className="text-sm font-semibold">
                    <span className="text-2xl font-bold text-warning-700">{stats.pendingApplications}</span> Applications
                  </div>
                  <div className="text-sm font-semibold">
                    <span className="text-2xl font-bold text-warning-700">{stats.pendingMaintenanceRequests}</span> Maintenance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-2 border-success-200 dark:border-success-800 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4 flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-success-600" />
                  <span>Room Status</span>
                </h3>
                <div className="space-y-3">
                  <div className="text-sm font-semibold flex items-center space-x-2">
                    <span className="text-2xl font-bold text-success-700">{stats.availableRooms}</span> 
                    <span>Available</span>
                    <Heart className="h-4 w-4 text-success-500" />
                  </div>
                  <div className="text-sm font-semibold flex items-center space-x-2">
                    <span className="text-2xl font-bold text-warning-700">{stats.maintenanceRooms}</span> 
                    <span>Maintenance</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 border-2 border-secondary-200 dark:border-secondary-800 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4 flex items-center space-x-2">
                  <Star className="h-5 w-5 text-secondary-600" />
                  <span>System Health</span>
                </h3>
                <div className="space-y-3">
                  <div className="text-sm text-success-600 font-bold flex items-center space-x-1">
                    <span>✅ All systems operational</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-semibold">
                    🔄 Last backup: {new Date().toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Staff Dashboard */}
      {userRole === 'staff' && staffData && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="My Tasks"
              value={staffData.totalTasks}
              icon={ListChecks}
              description="Total assigned tasks"
              className="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 dark:from-primary-900/20 dark:via-primary-800/20 dark:to-primary-700/20 border-2 border-primary-200 dark:border-primary-800"
            />
            <StatCard
              title="Pending"
              value={staffData.pendingTasks}
              icon={Clock}
              description="Tasks awaiting start"
              className="bg-gradient-to-br from-warning-50 via-warning-100 to-warning-200 dark:from-warning-900/20 dark:via-warning-800/20 dark:to-warning-700/20 border-2 border-warning-200 dark:border-warning-800"
            />
            <StatCard
              title="In Progress"
              value={staffData.inProgressTasks}
              icon={BarChart3}
              description="Currently working on"
              className="bg-gradient-to-br from-secondary-50 via-secondary-100 to-secondary-200 dark:from-secondary-900/20 dark:via-secondary-800/20 dark:to-secondary-700/20 border-2 border-secondary-200 dark:border-secondary-800"
            />
            <StatCard
              title="Completed"
              value={staffData.completedTasks}
              icon={UserCheck}
              description="Finished tasks"
              className="bg-gradient-to-br from-success-50 via-success-100 to-success-200 dark:from-success-900/20 dark:via-success-800/20 dark:to-success-700/20 border-2 border-success-200 dark:border-success-800"
            />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Quick actions for staff */}
            <Card className="bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-primary-900/20 dark:via-card dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Zap className="h-6 w-6 text-primary-600" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full h-12 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300" onClick={() => window.location.href = '/staff-tasks'}>
                  <ListChecks className="mr-2 h-5 w-5" />
                  View My Tasks
                </Button>
                <Button variant="outline" className="w-full h-12 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 border-2 border-primary-200 hover:border-primary-300 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl" onClick={() => window.location.href = '/attendance'}>
                  <Calendar className="mr-2 h-5 w-5" />
                  Mark Attendance
                </Button>
                <Button variant="outline" className="w-full h-12 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 border-2 border-secondary-200 hover:border-secondary-300 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl" onClick={() => window.location.href = '/staff/students'}>
                  <Users className="mr-2 h-5 w-5" />
                  View Students
                </Button>
              </CardContent>
            </Card>

            {/* Task progress summary */}
            <Card className="bg-gradient-to-br from-secondary-50 via-white to-secondary-100 dark:from-secondary-900/20 dark:via-card dark:to-secondary-800/20 border-2 border-secondary-200 dark:border-secondary-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <BarChart3 className="h-6 w-6 text-secondary-600" />
                  <span>Task Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm font-bold text-success-600">{staffData.totalTasks > 0 ? Math.round((staffData.completedTasks / staffData.totalTasks) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-success-500 to-success-600 h-3 rounded-full transition-all duration-500" style={{ width: `${staffData.totalTasks > 0 ? (staffData.completedTasks / staffData.totalTasks) * 100 : 0}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-xl border-2 border-warning-200 bg-warning-50 dark:bg-warning-900/20 p-3 text-center">
                    <div className="text-2xl font-bold text-warning-700">{staffData.pendingTasks}</div>
                    <div className="text-xs font-medium text-warning-600">Pending</div>
                  </div>
                  <div className="rounded-xl border-2 border-secondary-200 bg-secondary-50 dark:bg-secondary-900/20 p-3 text-center">
                    <div className="text-2xl font-bold text-secondary-700">{staffData.inProgressTasks}</div>
                    <div className="text-xs font-medium text-secondary-600">Active</div>
                  </div>
                  <div className="rounded-xl border-2 border-success-200 bg-success-50 dark:bg-success-900/20 p-3 text-center">
                    <div className="text-2xl font-bold text-success-700">{staffData.completedTasks}</div>
                    <div className="text-xs font-medium text-success-600">Done</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Enhanced Student Dashboard */}
      {userRole === 'student' && studentData && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Attendance Rate"
              value={`${studentData.attendancePercent}%`}
              icon={Calendar}
              description="Overall attendance"
              className="bg-gradient-to-br from-success-50 via-success-100 to-success-200 dark:from-success-900/20 dark:via-success-800/20 dark:to-success-700/20 border-2 border-success-200 dark:border-success-800"
            />
            <StatCard
              title="Leave Requests"
              value={studentData.pendingLeaves + studentData.approvedLeaves}
              icon={Clock}
              description={`${studentData.pendingLeaves} pending, ${studentData.approvedLeaves} approved`}
              className="bg-gradient-to-br from-warning-50 via-warning-100 to-warning-200 dark:from-warning-900/20 dark:via-warning-800/20 dark:to-warning-700/20 border-2 border-warning-200 dark:border-warning-800"
            />
            <StatCard
              title="Applications"
              value={studentData.totalApps}
              icon={AlertTriangle}
              description={`${studentData.pendingApps} pending`}
              className="bg-gradient-to-br from-secondary-50 via-secondary-100 to-secondary-200 dark:from-secondary-900/20 dark:via-secondary-800/20 dark:to-secondary-700/20 border-2 border-secondary-200 dark:border-secondary-800"
            />
            <StatCard
              title="Room Status"
              value={studentData.student.roomId ? 'Allocated' : 'Unassigned'}
              icon={Building2}
              description={studentData.roomLabel}
              className="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 dark:from-primary-900/20 dark:via-primary-800/20 dark:to-primary-700/20 border-2 border-primary-200 dark:border-primary-800"
            />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Enhanced quick actions for students */}
            <Card className="bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-primary-900/20 dark:via-card dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Zap className="h-6 w-6 text-primary-600" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full h-12 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 hover:from-primary-700 hover:via-primary-800 hover:to-primary-900 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300" onClick={() => window.location.href = '/leave'}>
                  <Calendar className="mr-2 h-5 w-5" />
                  Submit Leave Request
                </Button>
                <Button variant="outline" className="w-full h-12 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 border-2 border-primary-200 hover:border-primary-300 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl" onClick={() => window.location.href = '/maintenance'}>
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Report Issue
                </Button>
                <Button variant="outline" className="w-full h-12 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 border-2 border-secondary-200 hover:border-secondary-300 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl" onClick={() => window.location.href = '/attendance'}>
                  <Users className="mr-2 h-5 w-5" />
                  View Attendance
                </Button>
              </CardContent>
            </Card>

            {/* Personal recent activities for students */}
            <Card className="bg-gradient-to-br from-secondary-50 via-white to-secondary-100 dark:from-secondary-900/20 dark:via-card dark:to-secondary-800/20 border-2 border-secondary-200 dark:border-secondary-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Star className="h-6 w-6 text-secondary-600" />
                  <span>My Recent Activities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {studentData.activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-3 bg-gradient-to-r from-white to-gray-50/50 dark:from-card dark:to-card/80 hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
                    <div className="font-bold text-sm">{activity.description}</div>
                    <div className="text-muted-foreground text-xs font-semibold mt-1 flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                
                {studentData.activities.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center">
                      <Star className="h-6 w-6 text-secondary-600" />
                    </div>
                    <p className="font-bold">No recent activities</p>
                    <p className="text-xs">Your activities will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Enhanced Warden/Admin-specific sections */}
      {(userRole === 'warden' || userRole === 'admin') && (
        <>
          <PhotoApprovalDashboard userId={user?.id || ''} />
          <StudentDataDashboard userRole={userRole} />
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}