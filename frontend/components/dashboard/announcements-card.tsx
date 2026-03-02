import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { BellRing, Plus } from 'lucide-react';
import { Announcement } from '../../types';
import { cn } from '../../lib/utils';

interface AnnouncementCardProps {
  announcements: Announcement[];
  canCreateAnnouncement?: boolean;
  onCreateAnnouncement?: () => void;
}

export function AnnouncementsCard({
  announcements,
  canCreateAnnouncement = false,
  onCreateAnnouncement,
}: AnnouncementCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Announcements</CardTitle>
        <div className="flex items-center space-x-2">
          <BellRing className="h-5 w-5 text-muted-foreground" />
          {canCreateAnnouncement && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateAnnouncement}
              aria-label="Create announcement"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {announcements.length > 0 ? (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={cn(
                  'rounded-md border-l-4 bg-accent/20 p-4',
                  announcement.priority === 'urgent' && 'border-error-500',
                  announcement.priority === 'high' && 'border-warning-500',
                  announcement.priority === 'medium' && 'border-primary-500',
                  announcement.priority === 'low' && 'border-success-500'
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-semibold">{announcement.title}</h4>
                  <span className="text-xs text-muted-foreground">
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{announcement.content}</p>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No announcements at this time
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}