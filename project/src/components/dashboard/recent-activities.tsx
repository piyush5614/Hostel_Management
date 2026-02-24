import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

interface RecentActivitiesProps {
  activities: ActivityItem[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Recent Activities</CardTitle>
        <Activity className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="relative pl-6">
              <div className="absolute left-0 top-1 h-3 w-3 rounded-full bg-primary-600"></div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium">{activity.action}</span>
                <span className="text-xs text-muted-foreground">
                  By {activity.user} • {activity.timestamp}
                </span>
                {activity.details && (
                  <span className="mt-1 text-xs">{activity.details}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}