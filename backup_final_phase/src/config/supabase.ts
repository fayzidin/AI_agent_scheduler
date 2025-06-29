import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder.supabase.co' && 
    supabaseAnonKey !== 'placeholder-key');
};

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          company: string | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          subscription_tier: 'free' | 'pro' | 'enterprise';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          company?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          subscription_tier?: 'free' | 'pro' | 'enterprise';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          company?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          subscription_tier?: 'free' | 'pro' | 'enterprise';
          updated_at?: string;
        };
      };
      parsed_emails: {
        Row: {
          id: string;
          user_id: string;
          email_content: string;
          parsed_data: any;
          confidence_score: number;
          intent: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_content: string;
          parsed_data: any;
          confidence_score: number;
          intent: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_content?: string;
          parsed_data?: any;
          confidence_score?: number;
          intent?: string;
        };
      };
      scheduled_meetings: {
        Row: {
          id: string;
          user_id: string;
          parsed_email_id: string | null;
          title: string;
          start_time: string;
          end_time: string;
          attendees: string[];
          location: string | null;
          description: string | null;
          calendar_event_id: string | null;
          status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          parsed_email_id?: string | null;
          title: string;
          start_time: string;
          end_time: string;
          attendees: string[];
          location?: string | null;
          description?: string | null;
          calendar_event_id?: string | null;
          status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          parsed_email_id?: string | null;
          title?: string;
          start_time?: string;
          end_time?: string;
          attendees?: string[];
          location?: string | null;
          description?: string | null;
          calendar_event_id?: string | null;
          status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
          updated_at?: string;
        };
      };
      user_integrations: {
        Row: {
          id: string;
          user_id: string;
          provider_type: 'google_calendar' | 'outlook' | 'hubspot' | 'salesforce';
          provider_id: string;
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider_type: 'google_calendar' | 'outlook' | 'hubspot' | 'salesforce';
          provider_id: string;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider_type?: 'google_calendar' | 'outlook' | 'hubspot' | 'salesforce';
          provider_id?: string;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}