import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from './AuthModal';
import LoadingSpinner from '../ui/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { user, loading, isConfigured } = useAuth();

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Setup Required</h2>
            <p className="text-orange-200 mb-6">
              Supabase authentication is not configured. Please set up your Supabase project to enable user authentication.
            </p>
            <div className="bg-black/20 rounded-lg p-4 text-left">
              <p className="text-orange-300 text-sm font-semibold mb-2">Required Environment Variables:</p>
              <div className="text-orange-200 text-xs font-mono space-y-1">
                <div>VITE_SUPABASE_URL=your-project-url</div>
                <div>VITE_SUPABASE_ANON_KEY=your-anon-key</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return fallback || <AuthModal />;
  }

  return <>{children}</>;
};

export default AuthGuard;