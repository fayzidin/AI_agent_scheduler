# 🗓️ Google Calendar API Setup Guide

## 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your project ID

## 2. Enable Calendar API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

## 3. Create Credentials

### API Key (for public data access)
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Copy the API key
4. (Optional) Restrict the key to Calendar API only

### OAuth 2.0 Client ID (for user authentication)
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Add authorized origins:
   - `http://localhost:5173` (for development)
   - Your production domain
5. Copy the Client ID

## 4. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill required fields:
   - App name: "AI Meeting Assistant"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users (your email) for testing

## 5. Add to Environment Variables

Create/update your `.env` file:

```env
# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

## 6. Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Parse an email with meeting intent
3. Click "Connect" on Google Calendar provider
4. Sign in with your Google account
5. Grant calendar permissions
6. Test scheduling a meeting

## 7. Production Considerations

### Security
- **Never expose API keys in frontend code** (current setup is for development only)
- **Use a backend proxy** for production to keep credentials secure
- **Implement proper error handling** for API failures
- **Add rate limiting** to prevent quota exhaustion

### OAuth Domain Verification
For production, you'll need to:
1. Verify your domain in Google Search Console
2. Add verified domain to OAuth consent screen
3. Submit app for verification if using sensitive scopes

### API Quotas
- **Free tier**: 1,000,000 requests/day
- **Rate limit**: 100 requests/100 seconds/user
- Monitor usage in Google Cloud Console

## 8. Troubleshooting

### Common Issues

**"API key not valid"**
- Check if Calendar API is enabled
- Verify API key is correct
- Check API key restrictions

**"Access blocked: This app's request is invalid"**
- Check OAuth consent screen configuration
- Verify authorized origins include your domain
- Ensure client ID is correct

**"Insufficient permissions"**
- Check OAuth scopes in consent screen
- Re-authenticate to grant new permissions
- Verify user has calendar access

**"Quota exceeded"**
- Check API usage in Google Cloud Console
- Implement exponential backoff
- Consider upgrading quota limits

### Debug Mode
Enable debug logging by adding to your `.env`:
```env
VITE_DEBUG_GOOGLE_API=true
```

## 9. Next Steps

After Google Calendar is working:

1. **Add Microsoft Outlook** integration
2. **Implement Supabase** for user management
3. **Add webhook support** for real-time updates
4. **Create backend proxy** for production security
5. **Add calendar sync** for multiple providers

---

**🎉 You're now ready to schedule meetings with real Google Calendar integration!**