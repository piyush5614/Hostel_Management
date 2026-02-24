import React from 'react';
import { Card, CardContent } from '../ui/card';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer group', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h4 className="mt-2 text-3xl font-bold">{value}</h4>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className="mt-2 flex items-center">
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend.isPositive
                      ? 'text-success-600'
                      : 'text-error-600'
                  )}
                >
                  {trend.isPositive ? '+' : '-'}
                  {Math.abs(trend.value)}%
                </span>
                <span className="ml-1 text-xs text-muted-foreground">
                  from last month
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300',
              'bg-primary-100 text-primary-600 group-hover:bg-primary-200 group-hover:scale-110',
              'dark:bg-primary-900/20 dark:group-hover:bg-primary-900/30'
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}