# 🚀 Quick Supabase Setup for AI Meeting Assistant

## Step 1: Create Supabase Project (5 minutes)

1. **Go to [Supabase](https://supabase.com)**
2. **Sign up/Sign in** with your GitHub account
3. **Click "New Project"**
4. **Fill in details:**
   - Name: `AI Meeting Assistant`
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
5. **Click "Create new project"** (takes 2-3 minutes)

## Step 2: Get Your Credentials

1. **Go to Settings → API** in your Supabase dashboard
2. **Copy these values:**
   - **Project URL**: `https://abcdefgh.supabase.co`
   - **anon public key**: `eyJ...` (long string starting with eyJ)

## Step 3: Add to Environment Variables

### For Local Development:
Create a `.env` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Your existing variables
VITE_GOOGLE_CLIENT_ID=789393805530-q0aoa150hdd2vnn459mf5sg8geqdrol9.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_OPENAI_API_KEY=your-openai-key
```

### For Netlify Deployment:
1. **Go to your Netlify dashboard**
2. **Click on your site → Site settings → Environment variables**
3. **Add these variables:**
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-supabase-anon-key`

## Step 4: Set Up Database Schema

1. **Go to SQL Editor** in your Supabase dashboard
2. **Click "New Query"**
3. **Copy and paste this SQL:**

```sql
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

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parsed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for parsed_emails
CREATE POLICY "Users can view own parsed emails" ON public.parsed_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parsed emails" ON public.parsed_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parsed emails" ON public.parsed_emails
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for scheduled_meetings
CREATE POLICY "Users can view own meetings" ON public.scheduled_meetings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings" ON public.scheduled_meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings" ON public.scheduled_meetings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for user_integrations
CREATE POLICY "Users can view own integrations" ON public.user_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON public.user_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON public.user_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON public.user_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parsed_emails_user_id ON public.parsed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_created_at ON public.parsed_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_user_id ON public.scheduled_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_start_time ON public.scheduled_meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON public.user_integrations(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_meetings_updated_at BEFORE UPDATE ON public.scheduled_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_integrations_updated_at BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. **Click "Run"** to execute the SQL

## Step 5: Configure Authentication

1. **Go to Authentication → Settings**
2. **Set Site URL:** `https://aima.netlify.app`
3. **Add Redirect URLs:**
   - `https://aima.netlify.app/**`
   - `http://localhost:5173/**` (for development)

## Step 6: Test the Setup

1. **Restart your development server** (if running locally)
2. **Try signing up** with a new account
3. **Check your Supabase dashboard** → Authentication → Users to see if the user was created

## 🎉 You're Done!

Your AI Meeting Assistant now has:
- ✅ User authentication (sign up/sign in)
- ✅ Secure database with Row Level Security
- ✅ User profiles and data persistence
- ✅ Ready for email parsing and meeting scheduling

## 🆘 Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Verify environment variables are set correctly
3. Ensure database schema was created successfully
4. Check Supabase logs in the dashboard

**Total setup time: ~10 minutes**