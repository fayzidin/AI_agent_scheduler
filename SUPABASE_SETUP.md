# 🗄️ Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Sign up or sign in to your account
3. Click **New Project**
4. Choose your organization
5. Fill in project details:
   - **Name**: AI Meeting Assistant
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
6. Click **Create new project**

## 2. Get Project Credentials

1. Go to **Settings > API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project API Keys > anon public** (starts with `eyJ...`)

## 3. Set Up Database Schema

### Option A: Using Supabase SQL Editor

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy and paste the following SQL:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
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
CREATE TABLE public.parsed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_content TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  intent TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scheduled_meetings table
CREATE TABLE public.scheduled_meetings (
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
CREATE TABLE public.user_integrations (
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
CREATE INDEX idx_parsed_emails_user_id ON public.parsed_emails(user_id);
CREATE INDEX idx_parsed_emails_created_at ON public.parsed_emails(created_at DESC);
CREATE INDEX idx_scheduled_meetings_user_id ON public.scheduled_meetings(user_id);
CREATE INDEX idx_scheduled_meetings_start_time ON public.scheduled_meetings(start_time);
CREATE INDEX idx_user_integrations_user_id ON public.user_integrations(user_id);

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

4. Click **Run** to execute the SQL

### Option B: Using Supabase CLI (Advanced)

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref your-project-ref`
4. Create migration: `supabase migration new initial_schema`
5. Add the SQL above to the migration file
6. Apply: `supabase db push`

## 4. Configure Authentication

1. Go to **Authentication > Settings** in Supabase dashboard
2. Configure **Site URL**: `http://localhost:5173` (development)
3. Add **Redirect URLs**:
   - `http://localhost:5173/**` (development)
   - `https://yourdomain.com/**` (production)
4. **Email Templates**: Customize if needed
5. **Email Auth**: Ensure it's enabled

## 5. Add Environment Variables

Create/update your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 6. Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Try to sign up with a new account
3. Check if the profile is created in Supabase dashboard
4. Test email parsing and data persistence

## 7. Production Considerations

### Security
- **Row Level Security (RLS)** is enabled on all tables
- **API keys** are properly scoped (anon key for client)
- **Environment variables** are secure
- **CORS** is configured for your domain

### Performance
- **Indexes** are created for common queries
- **Connection pooling** is handled by Supabase
- **Caching** can be added with Redis if needed

### Monitoring
- **Logs** available in Supabase dashboard
- **Metrics** for API usage and performance
- **Alerts** for errors and quota limits

## 8. Advanced Features

### Real-time Subscriptions
```typescript
// Listen to changes in user's meetings
const subscription = supabase
  .channel('meetings')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'scheduled_meetings',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    console.log('Meeting updated:', payload);
  })
  .subscribe();
```

### Edge Functions
```bash
# Create edge function for webhooks
supabase functions new webhook-handler
```

### Storage for Attachments
```sql
-- Create bucket for user files
INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', false);

-- Create policy for user files
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 9. Troubleshooting

### Common Issues

**"Invalid API key"**
- Check if VITE_SUPABASE_ANON_KEY is correct
- Verify the key is the anon/public key, not service role

**"Row Level Security policy violation"**
- Check if RLS policies are correctly set up
- Verify user is authenticated before accessing data

**"relation does not exist"**
- Ensure all tables are created
- Check if migrations were applied successfully

**"CORS error"**
- Add your domain to allowed origins in Supabase
- Check if Site URL is configured correctly

### Debug Mode
Enable debug logging:
```env
VITE_DEBUG_SUPABASE=true
```

## 10. Next Steps

After Supabase is working:

1. **Add data persistence** to email parsing
2. **Implement user dashboard** with history
3. **Add subscription management** with Stripe
4. **Create admin panel** for user management
5. **Set up monitoring** and analytics

---

**🎉 You're now ready with a production-ready authentication and database system!**