import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';

// Initialize Sentry with updated configuration
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '', // Add your Sentry DSN to .env
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  integrations: [
    new Sentry.BrowserTracing({
      // Set tracing origins to connect traces to your backend
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/.*\.supabase\.co/,
        /^https:\/\/api\.openai\.com/,
        /^https:\/\/.*\.googleapis\.com/,
      ],
    }),
    new Sentry.Replay({
      // Reduced session sample rate to avoid 429 errors
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Session Replay - Updated configuration to prevent 429 errors
  replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0.1, // Reduced in both environments
  replaysOnErrorSampleRate: 1.0,
  // Release Health
  autoSessionTracking: true,
  // Debug mode in development
  debug: !import.meta.env.PROD,
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (import.meta.env.PROD && event.environment === 'development') {
      return null;
    }
    
    // Add additional context for loading issues
    if (event.tags?.component === 'loading') {
      event.extra = {
        ...event.extra,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
    }
    
    // Ignore OAuth popup errors - these are expected during authentication
    if (hint.originalException && 
        (hint.originalException.message?.includes('popup_closed') || 
         hint.originalException.message?.includes('interaction_required') ||
         hint.originalException.message?.includes('window.closed') ||
         hint.originalException.message?.includes('Cross-Origin-Opener-Policy'))) {
      return null;
    }
    
    return event;
  },
});

// Create Sentry-wrapped App component
const SentryApp = Sentry.withProfiler(App);

// Enhanced error boundary with Sentry integration
const SentryErrorBoundary = Sentry.withErrorBoundary(SentryApp, {
  fallback: ({ error, resetError }) => (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
          <p className="text-red-200 mb-6">
            We've been notified about this error and are working to fix it.
          </p>
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200"
            >
              Reload Page
            </button>
          </div>
          {!import.meta.env.PROD && (
            <details className="mt-4 text-left">
              <summary className="text-red-300 cursor-pointer">Error Details (Dev)</summary>
              <pre className="mt-2 text-xs text-red-200 bg-black/20 p-2 rounded overflow-auto">
                {error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  ),
  beforeCapture: (scope, error, hint) => {
    scope.setTag('component', 'error-boundary');
    scope.setLevel('error');
    scope.setContext('error-boundary', {
      componentStack: hint.componentStack,
      errorBoundary: true,
    });
    
    // Ignore OAuth popup errors
    if (error.message?.includes('popup_closed') || 
        error.message?.includes('interaction_required') ||
        error.message?.includes('window.closed') ||
        error.message?.includes('Cross-Origin-Opener-Policy')) {
      return false; // Prevent capturing this error
    }
  },
  onError: (error) => {
    // Ignore OAuth popup errors
    if (error.message?.includes('popup_closed') || 
        error.message?.includes('interaction_required') ||
        error.message?.includes('window.closed') ||
        error.message?.includes('Cross-Origin-Opener-Policy')) {
      return false; // Prevent showing error boundary
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SentryErrorBoundary />
  </StrictMode>
);