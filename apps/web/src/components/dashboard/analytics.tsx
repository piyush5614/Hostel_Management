import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, TrendingUp, Home, AlertCircle } from 'lucide-react';
import { SkeletonGrid } from '../loading/skeletons';

interface AnalyticsData {
  totalStudents: number;
  presentToday: number;
  onLeave: number;
  attendanceRate: number;
  occupancyRate: number;
  maintenanceRequests: number;
  averageOccupancy: number;
  monthlyTrends: Array<{ month: string; occupancy: number; attendance: number }>;
}

interface AnalyticsDashboardProps {
  data?: AnalyticsData;
  isLoading?: boolean;
}

export function AnalyticsDashboard({ data, isLoading = false }: AnalyticsDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<'occupancy' | 'attendance'>('occupancy');

  const mockData: AnalyticsData = useMemo(() => ({
    totalStudents: 450,
    presentToday: 380,
    onLeave: 35,
    attendanceRate: 84.4,
    occupancyRate: 92,
    maintenanceRequests: 12,
    averageOccupancy: 88,
    monthlyTrends: [
      { month: 'Jan', occupancy: 85, attendance: 82 },
      { month: 'Feb', occupancy: 88, attendance: 85 },
      { month: 'Mar', occupancy: 90, attendance: 87 },
      { month: 'Apr', occupancy: 92, attendance: 88 },
      { month: 'May', occupancy: 91, attendance: 86 },
      { month: 'Jun', occupancy: 89, attendance: 84 },
    ],
  }), []);

  const analytics = data || mockData;

  if (isLoading) {
    return <SkeletonGrid columns={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2 text-primary-600" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-600">{analytics.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered in hostel</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-success-600" />
              Present Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success-600">{analytics.presentToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((analytics.presentToday / analytics.totalStudents) * 100).toFixed(1)}% attendance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Home className="h-4 w-4 mr-2 text-secondary-600" />
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary-600">{analytics.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Current capacity usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-warning-600" />
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning-600">{analytics.maintenanceRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending requests</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trends Overview</CardTitle>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setSelectedMetric('occupancy')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedMetric === 'occupancy'
                  ? 'bg-primary-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              Occupancy
            </button>
            <button
              onClick={() => setSelectedMetric('attendance')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedMetric === 'attendance'
                  ? 'bg-primary-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              Attendance
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.monthlyTrends.map((trend) => (
              <div key={trend.month} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">{trend.month}</span>
                  <span className="text-muted-foreground">
                    {selectedMetric === 'occupancy' ? trend.occupancy : trend.attendance}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      selectedMetric === 'occupancy'
                        ? 'bg-secondary-600'
                        : 'bg-success-600'
                    }`}
                    style={{
                      width: `${selectedMetric === 'occupancy' ? trend.occupancy : trend.attendance}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
