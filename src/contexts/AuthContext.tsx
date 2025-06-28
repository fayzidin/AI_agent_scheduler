import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import type { Database } from '../config/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured] = useState(isSupabaseConfigured());

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        Sentry.addBreadcrumb({
          message: 'Starting auth initialization',
          category: 'auth',
          level: 'info',
        });

        if (!isConfigured) {
          Sentry.captureMessage('Supabase not configured', 'warning');
          setLoading(false);
          return;
        }

        // Get initial session with increased timeout and retry logic
        let sessionResult = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries && !sessionResult) {
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session fetch timeout')), 15000)
            );

            sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any;
            break;
          } catch (error) {
            retryCount++;
            console.warn(`Session fetch attempt ${retryCount} failed:`, error);
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            }
          }
        }

        if (!sessionResult) {
          console.warn('Failed to get session after retries, continuing without session');
          setLoading(false);
          return;
        }

        const { data: { session }, error } = sessionResult;

        if (error) {
          throw error;
        }

        Sentry.addBreadcrumb({
          message: `Session retrieved: ${session ? 'found' : 'none'}`,
          category: 'auth',
          level: 'info',
        });

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setLoading(false);
        }

      } catch (error) {
        console.error('Auth initialization failed:', error);
        Sentry.captureException(error, {
          tags: { component: 'auth-initialization' },
          extra: { isConfigured },
        });
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        Sentry.addBreadcrumb({
          message: `Auth state changed: ${event}`,
          category: 'auth',
          level: 'info',
        });

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Set user context for Sentry
          Sentry.setUser({
            id: session.user.id,
            email: session.user.email,
          });
          
          await loadProfile(session.user.id);
        } else {
          Sentry.setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        Sentry.captureException(error, {
          tags: { component: 'auth-state-change' },
          extra: { event, hasSession: !!session },
        });
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const loadProfile = async (userId: string) => {
    try {
      Sentry.addBreadcrumb({
        message: 'Loading user profile',
        category: 'profile',
        level: 'info',
        data: { userId },
      });

      // Retry logic for profile loading
      let profileResult = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !profileResult) {
        try {
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 20000)
          );

          profileResult = await Promise.race([profilePromise, timeoutPromise]) as any;
          break;
        } catch (error) {
          retryCount++;
          console.warn(`Profile fetch attempt ${retryCount} failed:`, error);
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
          }
        }
      }

      if (!profileResult) {
        console.warn('Failed to load profile after retries');
        setLoading(false);
        return;
      }

      const { data, error } = profileResult;

      if (error) {
        throw error;
      } else if (data) {
        setProfile(data);
        Sentry.setContext('user_profile', {
          company: data.company,
          onboarding_completed: data.onboarding_completed,
          subscription_tier: data.subscription_tier,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Sentry.captureException(error, {
        tags: { component: 'profile-loading' },
        extra: { userId },
      });
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!isConfigured) {
      const error = new Error('Supabase not configured') as AuthError;
      Sentry.captureException(error, { tags: { component: 'signup' } });
      return { error };
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Starting user signup',
        category: 'auth',
        level: 'info',
        data: { email, hasFullName: !!fullName },
      });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (!error && data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName || null,
            onboarding_completed: false,
            subscription_tier: 'free',
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          Sentry.captureException(profileError, {
            tags: { component: 'profile-creation' },
            extra: { userId: data.user.id },
          });
        }
      }

      if (error) {
        Sentry.captureException(error, { tags: { component: 'signup' } });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      Sentry.captureException(authError, { tags: { component: 'signup' } });
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      const error = new Error('Supabase not configured') as AuthError;
      Sentry.captureException(error, { tags: { component: 'signin' } });
      return { error };
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Starting user signin',
        category: 'auth',
        level: 'info',
        data: { email },
      });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Sentry.captureException(error, { tags: { component: 'signin' } });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      Sentry.captureException(authError, { tags: { component: 'signin' } });
      return { error: authError };
    }
  };

  const signOut = async () => {
    if (!isConfigured) return;
    
    try {
      Sentry.addBreadcrumb({
        message: 'User signing out',
        category: 'auth',
        level: 'info',
      });

      await supabase.auth.signOut();
      setProfile(null);
      Sentry.setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      Sentry.captureException(error, { tags: { component: 'signout' } });
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!isConfigured || !user) {
      const error = new Error('Not authenticated');
      Sentry.captureException(error, { tags: { component: 'profile-update' } });
      return { error };
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Updating user profile',
        category: 'profile',
        level: 'info',
        data: { updates: Object.keys(updates) },
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update local profile state
      if (profile) {
        setProfile({ ...profile, ...updates });
      }

      return { error: null };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'profile-update' },
        extra: { userId: user.id, updates },
      });
      return { error: error as Error };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};