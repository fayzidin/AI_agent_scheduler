/*
  # Initial Database Schema Setup

  1. New Tables
    - `profiles` - User profile information with subscription tiers
    - `parsed_emails` - Stores parsed email content and AI analysis
    - `scheduled_meetings` - Meeting data with calendar integration
    - `user_integrations` - Third-party service connections (Google, Outlook, etc.)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Secure access patterns for user isolation

  3. Performance
    - Indexes on frequently queried columns
    - Optimized for user-scoped queries
    - Automatic timestamp updates

  4. Features
    - Subscription tier management
    - Calendar integration support
    - Email parsing workflow
    - CRM integration capabilities
*/

-- Enable Row Level Security
--ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create parsed_emails table
CREATE TABLE IF NOT EXISTS public.parsed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_content TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  intent TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scheduled_meetings table
CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parsed_email_id UUID REFERENCES public.parsed_emails(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  description TEXT,
  calendar_event_id TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_integrations table
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('google_calendar', 'outlook', 'hubspot', 'salesforce')),
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider_type, provider_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parsed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Create RLS policies for parsed_emails
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parsed_emails' AND policyname = 'Users can view own parsed emails'
  ) THEN
    CREATE POLICY "Users can view own parsed emails" ON public.parsed_emails
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parsed_emails' AND policyname = 'Users can insert own parsed emails'
  ) THEN
    CREATE POLICY "Users can insert own parsed emails" ON public.parsed_emails
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parsed_emails' AND policyname = 'Users can update own parsed emails'
  ) THEN
    CREATE POLICY "Users can update own parsed emails" ON public.parsed_emails
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for scheduled_meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_meetings' AND policyname = 'Users can view own meetings'
  ) THEN
    CREATE POLICY "Users can view own meetings" ON public.scheduled_meetings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_meetings' AND policyname = 'Users can insert own meetings'
  ) THEN
    CREATE POLICY "Users can insert own meetings" ON public.scheduled_meetings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_meetings' AND policyname = 'Users can update own meetings'
  ) THEN
    CREATE POLICY "Users can update own meetings" ON public.scheduled_meetings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for user_integrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_integrations' AND policyname = 'Users can view own integrations'
  ) THEN
    CREATE POLICY "Users can view own integrations" ON public.user_integrations
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_integrations' AND policyname = 'Users can insert own integrations'
  ) THEN
    CREATE POLICY "Users can insert own integrations" ON public.user_integrations
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_integrations' AND policyname = 'Users can update own integrations'
  ) THEN
    CREATE POLICY "Users can update own integrations" ON public.user_integrations
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_integrations' AND policyname = 'Users can delete own integrations'
  ) THEN
    CREATE POLICY "Users can delete own integrations" ON public.user_integrations
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for better performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parsed_emails_user_id'
  ) THEN
    CREATE INDEX idx_parsed_emails_user_id ON public.parsed_emails(user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parsed_emails_created_at'
  ) THEN
    CREATE INDEX idx_parsed_emails_created_at ON public.parsed_emails(created_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_meetings_user_id'
  ) THEN
    CREATE INDEX idx_scheduled_meetings_user_id ON public.scheduled_meetings(user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_meetings_start_time'
  ) THEN
    CREATE INDEX idx_scheduled_meetings_start_time ON public.scheduled_meetings(start_time);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_integrations_user_id'
  ) THEN
    CREATE INDEX idx_user_integrations_user_id ON public.user_integrations(user_id);
  END IF;
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_scheduled_meetings_updated_at'
  ) THEN
    CREATE TRIGGER update_scheduled_meetings_updated_at BEFORE UPDATE ON public.scheduled_meetings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_integrations_updated_at'
  ) THEN
    CREATE TRIGGER update_user_integrations_updated_at BEFORE UPDATE ON public.user_integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;