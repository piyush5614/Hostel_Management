import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportError = () => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('Error Report:', errorReport);
    
    // In production, send to error reporting service
    // Example: Sentry, LogRocket, etc.
    
    alert('Error report logged. Please contact support if the issue persists.');
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-error-50 via-white to-error-100 p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-2 border-error-200">
            <CardHeader className="bg-gradient-to-r from-error-600 to-error-700 text-white">
              <CardTitle className="flex items-center space-x-3">
                <div className="rounded-full bg-white/20 p-2">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
                  <p className="text-error-100 text-sm">We encountered an unexpected error</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-error-100 to-error-200 flex items-center justify-center">
                  <Bug className="h-8 w-8 text-error-600" />
                </div>
                <h2 className="text-xl font-bold text-error-800 mb-2">Application Error</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The application encountered an unexpected error and needs to be refreshed. 
                  This has been automatically logged for our development team.
                </p>
              </div>

              {/* Error Details (Development Mode) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-error-600">Error Details (Development)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleReload}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Application
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="hover:scale-105 transition-transform"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleReportError}
                  className="hover:scale-105 transition-transform border-warning-300 hover:border-warning-400"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Report Error
                </Button>
              </div>

              {/* Help Information */}
              <div className="text-center text-sm text-muted-foreground">
                <p>If this problem persists, please contact:</p>
                <p className="font-semibold text-primary-600">
                  📧 support@tchostel.edu • 📞 +91-9876543210
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Loading component for async operations
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-muted-foreground font-semibold">{message}</p>
      </div>
    </div>
  );
}

// Error fallback component
export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void; 
}) {
  return (
    <Card className="m-4 border-2 border-error-200 bg-gradient-to-r from-error-50 to-error-100">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-error-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-error-800 mb-2">Something went wrong</h3>
        <p className="text-sm text-error-700 mb-4">{error.message}</p>
        <Button onClick={resetError} variant="outline" className="border-error-300 hover:border-error-400">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}