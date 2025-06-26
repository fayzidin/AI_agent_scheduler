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
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Supabase Setup Required</h2>
            <p className="text-orange-200 mb-6 text-lg">
              To enable user authentication and data persistence, you need to configure Supabase.
            </p>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-6">
              <h3 className="text-blue-300 font-semibold mb-3">Quick Setup (10 minutes):</h3>
              <ol className="text-blue-200 text-left space-y-2">
                <li>1. Create a free Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">supabase.com</a></li>
                <li>2. Get your Project URL and API key</li>
                <li>3. Add them to your environment variables</li>
                <li>4. Run the database setup SQL</li>
              </ol>
            </div>

            <div className="bg-black/20 rounded-lg p-4 text-left mb-6">
              <p className="text-orange-300 text-sm font-semibold mb-2">Required Environment Variables:</p>
              <div className="text-orange-200 text-xs font-mono space-y-1">
                <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
                <div>VITE_SUPABASE_ANON_KEY=your-supabase-anon-key</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-700 transition-all duration-200"
              >
                Create Supabase Project
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                Refresh After Setup
              </button>
            </div>

            <div className="mt-6 text-sm text-orange-300">
              <p>💡 <strong>Tip:</strong> Check the SUPABASE_QUICK_SETUP.md file for detailed instructions</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Setting up your AI Meeting Assistant..." />;
  }

  if (!user) {
    return fallback || <AuthModal onClose={() => {}} />;
  }

  return <>{children}</>;
};

export default AuthGuard;