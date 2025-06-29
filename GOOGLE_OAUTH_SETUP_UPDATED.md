# 🔧 Google OAuth Setup Guide - Updated for 2025

## 🚨 **Current Issue: COOP and OAuth Compatibility**

Modern browsers implement security features like Cross-Origin-Opener-Policy (COOP) that can interfere with Google's OAuth popup flow. This guide provides updated instructions to ensure your Google Calendar integration works properly.

## 🛠️ **Complete Setup Instructions**

### **Step 1: Create Google Cloud Project**

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select an existing one
3. **Note your project ID**

### **Step 2: Enable Required APIs**

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for and enable these APIs:
   - **Google Calendar API**
   - **Gmail API** (if using Gmail integration)
   - **People API** (for contact information)

### **Step 3: Configure OAuth Consent Screen**

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill required fields:
   - **App name**: "AI Meeting Assistant"
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/gmail.readonly` (if using Gmail)
5. Add test users (your email) for testing

### **Step 4: Create OAuth 2.0 Client ID**

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Set **Name**: "AI Meeting Assistant Web Client"
5. Add **Authorized JavaScript origins**:
   ```
   https://aima.netlify.app
   http://localhost:5173
   https://localhost:5173
   ```
   
   ⚠️ **IMPORTANT**: Add your current domain exactly as shown in your browser address bar!
   
6. Add **Authorized redirect URIs**:
   ```
   https://aima.netlify.app/google-auth-fix.html
   http://localhost:5173/google-auth-fix.html
   https://localhost:5173/google-auth-fix.html
   ```
7. Click **Create**
8. Copy the **Client ID**

### **Step 5: Create API Key**

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Copy the API key
4. Click **Restrict Key**
5. Under **API restrictions**, select:
   - Google Calendar API
   - Gmail API (if using Gmail)
   - People API
6. Click **Save**

### **Step 6: Add to Environment Variables**

Create/update your `.env` file:

```env
# Google API Configuration
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

### **Step 7: Deploy with Netlify Headers**

1. Create a `public/_headers` file with:
   ```
   # Disable COOP for the Google auth redirect page
   /google-auth-fix.html
     Cross-Origin-Opener-Policy: unsafe-none
     Cross-Origin-Embedder-Policy: unsafe-none
   ```

2. Deploy to Netlify

## 🧪 **Testing the Integration**

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try connecting to Google Calendar
3. If you encounter COOP errors, try:
   - Using Chrome or Edge
   - Using incognito/private mode
   - Clearing cookies and site data
   - Disabling strict COOP in browser flags

## 🔒 **Security Considerations**

### API Key Security
- **Never expose API keys in frontend code** without proper restrictions
- **Set HTTP referrer restrictions** in Google Cloud Console
- **Use a backend proxy** for production to keep credentials secure

### OAuth Domain Verification
For production, you'll need to:
1. Verify your domain in Google Search Console
2. Add verified domain to OAuth consent screen
3. Submit app for verification if using sensitive scopes

### API Quotas
- **Free tier**: 1,000,000 requests/day
- **Rate limit**: 100 requests/100 seconds/user
- Monitor usage in Google Cloud Console

## 🚨 **Troubleshooting Common Issues**

### "Cross-Origin-Opener-Policy would block the window.closed call"
- This is a browser security feature
- Try using Chrome or Edge
- Use the redirect URI approach with the auth-fix page
- See GOOGLE_OAUTH_TROUBLESHOOTING_COOP.md for more details

### "Token acquisition failed: interaction_required"
- This is normal for the first authentication attempt
- The system will automatically fall back to interactive auth
- If it persists, clear your browser cookies and cache

### "redirect_uri_mismatch"
- Double-check that your current domain is in the authorized JavaScript origins
- Ensure the redirect URIs include `/google-auth-fix.html`
- Wait 5-10 minutes for changes to propagate after updating

### "API key not valid"
- Check if Calendar API is enabled
- Verify API key is correct
- Check API key restrictions

### "Access blocked: This app's request is invalid"
- Check OAuth consent screen configuration
- Verify authorized origins include your domain
- Ensure client ID is correct

## 🔄 **2025 Updates**

Google has made several changes to their OAuth implementation:

1. **Stricter COOP policies** in modern browsers
2. **More granular scopes** for better security
3. **Enhanced verification requirements** for sensitive scopes
4. **Improved token handling** for better security

This guide has been updated to address these changes and ensure your integration works smoothly.

---

**🎉 You're now ready to use Google Calendar integration with modern browser security features!**