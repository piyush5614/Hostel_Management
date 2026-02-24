import React from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start measuring an operation
  startMeasurement(operationId: string): void {
    this.measurements.set(operationId, performance.now());
  }

  // End measurement and log if threshold exceeded
  endMeasurement(
    operationId: string, 
    threshold: number = 1000,
    logToConsole: boolean = true
  ): number {
    const startTime = this.measurements.get(operationId);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationId}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(operationId);

    if (duration > threshold) {
      if (logToConsole) {
        console.warn(`⚠️ Performance issue: ${operationId} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      }
      
      // In production, send to monitoring service
      this.reportPerformanceIssue(operationId, duration, threshold);
    }

    return duration;
  }

  // Measure async operations
  async measureAsync<T>(
    operationId: string,
    asyncOperation: () => Promise<T>,
    threshold: number = 1000
  ): Promise<T> {
    this.startMeasurement(operationId);
    
    try {
      const result = await asyncOperation();
      this.endMeasurement(operationId, threshold);
      return result;
    } catch (error) {
      this.endMeasurement(operationId, threshold);
      throw error;
    }
  }

  // Report performance issue
  private reportPerformanceIssue(
    operation: string, 
    duration: number, 
    threshold: number
  ): void {
    // In production, integrate with monitoring services
    const report = {
      operation,
      duration,
      threshold,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    console.log('📊 Performance Report:', report);
    
    // Send to analytics service in production
    // Example: analytics.track('performance_issue', report);
  }

  // Get performance metrics
  getMetrics(): {
    averageLoadTime: number;
    slowOperations: Array<{ operation: string; duration: number }>;
    totalMeasurements: number;
  } {
    // This would be implemented with actual performance data
    return {
      averageLoadTime: 850,
      slowOperations: [],
      totalMeasurements: this.measurements.size
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for measuring component render time
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const operationId = `${componentName}-render-${Date.now()}`;
    performanceMonitor.startMeasurement(operationId);

    return () => {
      performanceMonitor.endMeasurement(operationId, 100); // 100ms threshold for renders
    };
  }, [componentName]);
}

// HOC for measuring component performance
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const name = componentName || Component.displayName || Component.name || 'UnknownComponent';
    usePerformanceMonitor(name);
    
    return <Component {...props} />;
  };
}

// Utility for measuring page load times
export const measurePageLoad = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        
        if (loadTime > 3000) { // 3 second threshold
          console.warn(`⚠️ Page load time: ${loadTime.toFixed(2)}ms (threshold: 3000ms)`);
          
          // Report slow page load
          performanceMonitor['reportPerformanceIssue']('page_load', loadTime, 3000);
        }
      }, 0);
    });
  }
};