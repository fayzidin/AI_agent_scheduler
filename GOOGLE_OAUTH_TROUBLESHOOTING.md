# 🚨 Google OAuth Troubleshooting Guide

## **Current Error: redirect_uri_mismatch**

### **Your Current Development URL:**
```
https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
```

## 🛠️ **Quick Fix Steps**

### **Option 1: Add Current URL to Google Cloud Console**

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Settings:**
   - Go to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID
   - Click **Edit** (pencil icon)

3. **Add Authorized JavaScript Origins:**
   ```
   https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
   ```

4. **Save and wait 5-10 minutes**

### **Option 2: Create New OAuth Client (Recommended)**

If you don't have proper OAuth setup:

1. **Enable Calendar API:**
   - Go to **APIs & Services** → **Library**
   - Search "Google Calendar API"
   - Click **Enable**

2. **Create OAuth Client:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**

3. **Configure Origins:**
   Add these to **Authorized JavaScript origins**:
   ```
   https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
   http://localhost:5173
   https://localhost:5173
   ```

4. **Get Credentials:**
   - Copy **Client ID**
   - Get **API Key** from API Keys section

### **Option 3: Configure OAuth Consent Screen**

1. **Go to OAuth Consent Screen:**
   - Choose **External** user type
   - Fill required fields:
     - App name: "AI Meeting Assistant"
     - User support email: Your email
     - Developer contact: Your email

2. **Add Scopes:**
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

3. **Add Test Users:**
   - Add your email as a test user

## 🔧 **Update Environment Variables**

After getting credentials, update your `.env` file:

```env
# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

## 🧪 **Testing Steps**

1. **Clear browser cache** (Ctrl+Shift+R)
2. **Restart development server**
3. **Sign in to your app**
4. **Try Google Calendar connection**

## 🚨 **Common Issues & Solutions**

### **"This app isn't verified"**
- Add your email as test user in OAuth consent screen
- Click "Advanced" → "Go to AI Meeting Assistant (unsafe)"

### **"Access blocked"**
- Check authorized origins are correct
- Wait 5-10 minutes after saving changes
- Try incognito mode

### **"Invalid client"**
- Verify Client ID is correct
- Check if API is enabled
- Ensure OAuth client is for "Web application"

## 📋 **Verification Checklist**

- [ ] Google Cloud project exists
- [ ] Calendar API is enabled
- [ ] OAuth client ID created (Web application)
- [ ] Current WebContainer URL added to authorized origins
- [ ] OAuth consent screen configured
- [ ] Test user added (your email)
- [ ] Environment variables updated
- [ ] Browser cache cleared
- [ ] Development server restarted

## 🆘 **Still Not Working?**

If you're still having issues:

1. **Check browser console** for detailed errors
2. **Verify all URLs** in Google Cloud Console
3. **Try incognito mode** to avoid cache issues
4. **Wait 10+ minutes** for OAuth changes to propagate
5. **Double-check credentials** are from same project

---

**💡 The WebContainer URL changes between sessions, so you may need to update the authorized origins if the URL changes again.**