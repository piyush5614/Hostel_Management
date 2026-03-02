// Error Reporting and Monitoring Service
export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  user?: {
    id: string;
    email: string;
    role: string;
  };
  context: {
    url: string;
    userAgent: string;
    viewport: {
      width: number;
      height: number;
    };
    component?: string;
    action?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

class ErrorReportingService {
  private reports: ErrorReport[] = [];
  private isEnabled: boolean = true;

  // Report JavaScript errors
  reportError(
    error: Error, 
    context: Partial<ErrorReport['context']> = {},
    severity: ErrorReport['severity'] = 'medium'
  ): string {
    if (!this.isEnabled) return '';

    const report: ErrorReport = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      user: this.getCurrentUser(),
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        ...context
      },
      severity,
      resolved: false
    };

    this.reports.push(report);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🐛 Error Report Generated');
      console.error('Error:', error);
      console.log('Report ID:', report.id);
      console.log('Context:', report.context);
      console.log('Severity:', report.severity);
      console.groupEnd();
    }

    // In production, send to error monitoring service
    this.sendToMonitoringService(report);

    return report.id;
  }

  // Report performance issues
  reportPerformanceIssue(
    operation: string,
    duration: number,
    threshold: number = 3000
  ): void {
    if (duration > threshold) {
      this.reportError(
        new Error(`Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`),
        { action: operation },
        'medium'
      );
    }
  }

  // Report network errors
  reportNetworkError(
    url: string,
    status: number,
    statusText: string
  ): string {
    return this.reportError(
      new Error(`Network error: ${status} ${statusText} for ${url}`),
      { action: 'network_request', url },
      status >= 500 ? 'high' : 'medium'
    );
  }

  // Get current user context
  private getCurrentUser() {
    try {
      const authStore = JSON.parse(localStorage.getItem('tc-hostel-auth') || '{}');
      return authStore.state?.user || undefined;
    } catch {
      return undefined;
    }
  }

  // Send to monitoring service (mock implementation)
  private async sendToMonitoringService(report: ErrorReport): Promise<void> {
    try {
      // In production, integrate with services like:
      // - Sentry
      // - LogRocket
      // - Bugsnag
      // - Custom error tracking API

      console.log('📊 Sending error report to monitoring service:', report.id);
      
      // Mock API call
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      }).catch(() => {
        // Silently fail - don't create error loops
        console.warn('Failed to send error report to monitoring service');
      });
    } catch {
      // Silently fail to prevent error loops
    }
  }

  // Get error reports (for admin dashboard)
  getReports(filters?: {
    severity?: ErrorReport['severity'];
    resolved?: boolean;
    userId?: string;
    dateRange?: { start: string; end: string };
  }): ErrorReport[] {
    let filtered = [...this.reports];

    if (filters?.severity) {
      filtered = filtered.filter(r => r.severity === filters.severity);
    }

    if (filters?.resolved !== undefined) {
      filtered = filtered.filter(r => r.resolved === filters.resolved);
    }

    if (filters?.userId) {
      filtered = filtered.filter(r => r.user?.id === filters.userId);
    }

    if (filters?.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      filtered = filtered.filter(r => {
        const reportDate = new Date(r.timestamp);
        return reportDate >= start && reportDate <= end;
      });
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Mark error as resolved
  resolveError(errorId: string): boolean {
    const report = this.reports.find(r => r.id === errorId);
    if (report) {
      report.resolved = true;
      return true;
    }
    return false;
  }

  // Get error statistics
  getErrorStats() {
    const total = this.reports.length;
    const resolved = this.reports.filter(r => r.resolved).length;
    const unresolved = total - resolved;
    const critical = this.reports.filter(r => r.severity === 'critical' && !r.resolved).length;
    const high = this.reports.filter(r => r.severity === 'high' && !r.resolved).length;

    return { total, resolved, unresolved, critical, high };
  }

  // Enable/disable error reporting
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Global error reporting instance
export const errorReporter = new ErrorReportingService();

// Global error handler setup
export const setupGlobalErrorHandling = () => {
  // Handle unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    errorReporter.reportError(
      new Error(event.message),
      {
        component: 'global',
        action: 'unhandled_error'
      },
      'high'
    );
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorReporter.reportError(
      new Error(`Unhandled promise rejection: ${event.reason}`),
      {
        component: 'global',
        action: 'unhandled_promise_rejection'
      },
      'high'
    );
  });

  // Handle network errors
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      
      if (!response.ok) {
        errorReporter.reportNetworkError(
          args[0].toString(),
          response.status,
          response.statusText
        );
      }
      
      return response;
    } catch (error) {
      errorReporter.reportError(
        error as Error,
        {
          action: 'fetch_error',
          url: args[0].toString()
        },
        'medium'
      );
      throw error;
    }
  };

  console.log('🛡️ Global error handling initialized');
};

// Performance monitoring
export const measurePerformance = async <T>(
  operation: string,
  asyncFunction: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await asyncFunction();
    const duration = performance.now() - startTime;
    
    errorReporter.reportPerformanceIssue(operation, duration);
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    errorReporter.reportError(
      error as Error,
      {
        action: operation,
        component: 'performance_monitor'
      },
      'medium'
    );
    
    throw error;
  }
};