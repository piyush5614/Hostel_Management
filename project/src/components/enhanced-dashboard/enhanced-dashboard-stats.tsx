import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Camera, 
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { 
  getAllEnhancedStudents, 
  mockPhotoSubmissions, 
  mockSMSNotifications,
  enhancedMockLeaveRequests 
} from '../../store/enhanced-mock-data';
import { cn } from '../../lib/utils';

export function EnhancedDashboardStats() {
  const students = getAllEnhancedStudents();
  const photoSubmissions = mockPhotoSubmissions;
  const smsNotifications = mockSMSNotifications;
  const leaveRequests = enhancedMockLeaveRequests;

  // Calculate comprehensive statistics
  const stats = {
    totalStudents: students.length,
    presentStudents: students.filter(s => s.currentStatus === 'present').length,
    onLeaveStudents: students.filter(s => s.currentStatus === 'on-leave').length,
    pendingPhotoApprovals: photoSubmissions.filter(p => p.status === 'pending').length,
    smsDeliveryRate: smsNotifications.length > 0 
      ? Math.round((smsNotifications.filter(s => s.deliveryStatus === 'delivered').length / smsNotifications.length) * 100)
      : 100,
    parentApprovalRate: leaveRequests.filter(lr => lr.parentApprovalStatus).length > 0
      ? Math.round((leaveRequests.filter(lr => lr.parentApprovalStatus === 'approved').length / leaveRequests.filter(lr => lr.parentApprovalStatus).length) * 100)
      : 0,
    averageApprovalTime: '15 minutes', // Would be calculated from actual data
    systemHealth: 'excellent' as 'excellent' | 'good' | 'fair' | 'poor'
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-success-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-error-600" />;
      case 'stable': return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Students */}
      <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-2 border-primary-200 dark:border-primary-800 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-primary-800 dark:text-primary-200">Total Students</p>
              <p className="text-3xl font-bold text-primary-900 dark:text-primary-100">{stats.totalStudents}</p>
              <div className="flex items-center space-x-1 mt-1">
                {getTrendIcon('up')}
                <span className="text-xs text-success-600 font-semibold">+5% this month</span>
              </div>
            </div>
            <div className="rounded-full bg-gradient-to-r from-primary-600 to-primary-700 p-3 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Present Students */}
      <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-2 border-success-200 dark:border-success-800 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-success-800 dark:text-success-200">Present Today</p>
              <p className="text-3xl font-bold text-success-900 dark:text-success-100">{stats.presentStudents}</p>
              <div className="flex items-center space-x-1 mt-1">
                {getTrendIcon('stable')}
                <span className="text-xs text-success-600 font-semibold">
                  {Math.round((stats.presentStudents / stats.totalStudents) * 100)}% attendance
                </span>
              </div>
            </div>
            <div className="rounded-full bg-gradient-to-r from-success-600 to-success-700 p-3 shadow-lg">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Approvals */}
      <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20 border-2 border-warning-200 dark:border-warning-800 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-warning-800 dark:text-warning-200">Photo Approvals</p>
              <p className="text-3xl font-bold text-warning-900 dark:text-warning-100">{stats.pendingPhotoApprovals}</p>
              <div className="flex items-center space-x-1 mt-1">
                <Clock className="h-4 w-4 text-warning-600" />
                <span className="text-xs text-warning-600 font-semibold">Pending review</span>
              </div>
            </div>
            <div className="rounded-full bg-gradient-to-r from-warning-600 to-warning-700 p-3 shadow-lg">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Delivery Rate */}
      <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 border-2 border-secondary-200 dark:border-secondary-800 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-secondary-800 dark:text-secondary-200">SMS Delivery</p>
              <p className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">{stats.smsDeliveryRate}%</p>
              <div className="flex items-center space-x-1 mt-1">
                {getTrendIcon('up')}
                <span className="text-xs text-success-600 font-semibold">Excellent delivery</span>
              </div>
            </div>
            <div className="rounded-full bg-gradient-to-r from-secondary-600 to-secondary-700 p-3 shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// System health indicator
export function SystemHealthIndicator() {
  const [healthStatus, setHealthStatus] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');
  const [lastChecked, setLastChecked] = useState(new Date());

  const getHealthColor = () => {
    switch (healthStatus) {
      case 'excellent': return 'text-success-600 bg-success-50';
      case 'good': return 'text-primary-600 bg-primary-50';
      case 'fair': return 'text-warning-600 bg-warning-50';
      case 'poor': return 'text-error-600 bg-error-50';
    }
  };

  const getHealthIcon = () => {
    switch (healthStatus) {
      case 'excellent': return <CheckCircle2 className="h-5 w-5 text-success-600" />;
      case 'good': return <CheckCircle2 className="h-5 w-5 text-primary-600" />;
      case 'fair': return <AlertTriangle className="h-5 w-5 text-warning-600" />;
      case 'poor': return <AlertTriangle className="h-5 w-5 text-error-600" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-card dark:via-card/80 dark:to-card border-2 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getHealthIcon()}
          <span>System Health</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className={cn(
            'inline-flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-bold',
            getHealthColor()
          )}>
            <span className="capitalize">{healthStatus}</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Database:</span>
              <span className="text-success-600 font-semibold">✅ Online</span>
            </div>
            <div className="flex justify-between">
              <span>SMS Service:</span>
              <span className="text-success-600 font-semibold">✅ Active</span>
            </div>
            <div className="flex justify-between">
              <span>File Storage:</span>
              <span className="text-success-600 font-semibold">✅ Available</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}