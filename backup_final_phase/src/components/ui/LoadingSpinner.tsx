import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface LoadingSpinnerProps {
  message?: string;
  timeout?: number; // Timeout in milliseconds
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Setting up your AI Meeting Assistant',
  timeout = 15000 // 15 seconds default timeout
}) => {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    
    // Track loading time
    const timeInterval = setInterval(() => {
      setLoadingTime(Date.now() - startTime);
    }, 1000);

    // Set timeout for loading
    const timeoutId = setTimeout(() => {
      setIsTimedOut(true);
      
      // Log to Sentry when loading takes too long
      Sentry.captureMessage('Loading timeout exceeded', {
        level: 'warning',
        tags: { 
          component: 'loading',
          timeout: true 
        },
        extra: {
          loadingTime: Date.now() - startTime,
          timeoutDuration: timeout,
          message,
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      });

      // Add breadcrumb for debugging
      Sentry.addBreadcrumb({
        message: 'Loading spinner timeout',
        category: 'ui',
        level: 'warning',
        data: {
          loadingTime: Date.now() - startTime,
          message,
        },
      });
    }, timeout);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(timeInterval);
    };
  }, [timeout, message]);

  const handleReload = () => {
    Sentry.addBreadcrumb({
      message: 'User triggered page reload from loading spinner',
      category: 'user-action',
      level: 'info',
    });
    window.location.reload();
  };

  const handleReportIssue = () => {
    Sentry.captureMessage('User reported loading issue', {
      level: 'info',
      tags: { 
        component: 'loading',
        user_reported: true 
      },
      extra: {
        loadingTime,
        message,
        url: window.location.href,
      },
    });
    
    // You could also open a support form or email client here
    alert('Issue reported! Our team has been notified.');
  };

  if (isTimedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Taking longer than expected</h2>
            <p className="text-orange-200 mb-2">
              The application has been loading for {Math.round(loadingTime / 1000)} seconds.
            </p>
            <p className="text-orange-200 mb-6">
              This might indicate a connectivity issue or a problem with our services.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleReload}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                Reload Page
              </button>
              
              <button
                onClick={handleReportIssue}
                className="w-full px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                Report Issue
              </button>
            </div>

            <div className="mt-6 text-xs text-orange-300">
              <p>If this problem persists, please check:</p>
              <ul className="mt-2 space-y-1 text-left">
                <li>• Your internet connection</li>
                <li>• Browser console for errors</li>
                <li>• Try refreshing the page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
        <p className="text-indigo-200 mb-4">{message}</p>
        
        {loadingTime > 5000 && (
          <div className="text-sm text-indigo-300">
            Loading for {Math.round(loadingTime / 1000)} seconds...
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;