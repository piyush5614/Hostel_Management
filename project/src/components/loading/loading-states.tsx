import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Loader2, Users, Calendar, FileText, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingStateProps {
  message?: string;
  type?: 'default' | 'students' | 'attendance' | 'reports' | 'settings';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  message = 'Loading...', 
  type = 'default',
  size = 'md',
  className 
}: LoadingStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'students': return <Users className="h-8 w-8 text-primary-600" />;
      case 'attendance': return <Calendar className="h-8 w-8 text-success-600" />;
      case 'reports': return <FileText className="h-8 w-8 text-warning-600" />;
      case 'settings': return <Settings className="h-8 w-8 text-secondary-600" />;
      default: return <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'p-4';
      case 'lg': return 'p-12';
      default: return 'p-8';
    }
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-card dark:via-card/80 dark:to-card border-2 border-gray-200 dark:border-gray-700 shadow-xl">
        <CardContent className={cn('text-center', getSizeClasses())}>
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 shadow-lg">
              {getIcon()}
            </div>
            <div>
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-lg font-bold text-primary-800 dark:text-primary-200">{message}</p>
              <p className="text-sm text-muted-foreground">Please wait while we load your data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton loading components
export function StudentCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-1/2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-2/3"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="p-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Page loading wrapper
export function PageLoading({ 
  title = 'Loading Page...', 
  description = 'Please wait while we prepare your content' 
}: { 
  title?: string; 
  description?: string; 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-primary-900/20 dark:via-background dark:to-secondary-900/20">
      <Card className="w-full max-w-md shadow-2xl border-2 border-primary-200 dark:border-primary-800">
        <CardContent className="p-8 text-center">
          <div className="space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 shadow-xl">
              <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-800 dark:text-primary-200 mb-2">{title}</h2>
              <p className="text-muted-foreground">{description}</p>
            </div>
            <div className="flex justify-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce"></div>
              <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Async component wrapper with loading and error states
export function AsyncWrapper<T>({
  asyncFunction,
  children,
  loadingComponent,
  errorComponent,
  dependencies = []
}: {
  asyncFunction: () => Promise<T>;
  children: (data: T) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: Error, retry: () => void) => React.ReactNode;
  dependencies?: any[];
}) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return loadingComponent || <LoadingState />;
  }

  if (error) {
    return errorComponent ? 
      errorComponent(error, loadData) : 
      <ErrorFallback error={error} resetError={loadData} />;
  }

  if (data === null) {
    return <LoadingState message="No data available" />;
  }

  return <>{children(data)}</>;
}