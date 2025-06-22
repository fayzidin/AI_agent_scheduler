# 🔧 Google OAuth Setup - Fix Gmail Integration

## 🚨 **Current Error Analysis**

You're getting "Failed to connect to Gmail at handleConnect" because your Google Cloud Console project doesn't have the correct JavaScript origins configured for your development environment.

### **Your Current Development URL:**
```
https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
```

## 🛠️ **Quick Fix Steps**

### **Step 1: Update Google Cloud Console**

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one if needed)

2. **Navigate to OAuth Settings:**
   - Go to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID (or create one)
   - Click the **Edit** button (pencil icon)

3. **Add Authorized JavaScript Origins:**
   Add these URLs to **Authorized JavaScript origins**:
   ```
   https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
   http://localhost:5173
   https://localhost:5173
   ```

4. **Save Changes:**
   - Click **Save**
   - Wait 5-10 minutes for changes to propagate

### **Step 2: Enable Required APIs**

1. **Enable Gmail API:**
   - Go to **APIs & Services** → **Library**
   - Search "Gmail API"
   - Click **Enable**

2. **Enable Calendar API:**
   - Search "Google Calendar API"
   - Click **Enable**

### **Step 3: Configure OAuth Consent Screen**

1. **Go to OAuth Consent Screen:**
   - Choose **External** user type (unless you have Google Workspace)
   - Fill required fields:
     - App name: "AI Meeting Assistant"
     - User support email: Your email
     - Developer contact: Your email

2. **Add Scopes:**
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

3. **Add Test Users:**
   - Add your email as a test user for development

### **Step 4: Get Your Credentials**

1. **Get Client ID:**
   - From **APIs & Services** → **Credentials**
   - Copy your OAuth 2.0 Client ID

2. **Get API Key:**
   - Create an API Key if you don't have one
   - Restrict it to Gmail API and Calendar API

### **Step 5: Update Environment Variables**

Update your `.env` file with the credentials:

```env
# Google API Configuration
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

## 🧪 **Testing Steps**

1. **Clear Browser Cache:**
   - Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
   - Or open DevTools → Application → Storage → Clear storage

2. **Restart Development Server:**
   ```bash
   npm run dev
   ```

3. **Test Gmail Connection:**
   - Sign in to your app
   - Go to Email Dashboard → Gmail Room
   - Click "Connect Gmail"
   - Should now work without redirect URI error

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
- Check if APIs are enabled
- Ensure OAuth client is for "Web application"

### **"Popup blocked"**
- Allow popups for this site
- Try again after allowing popups

## 📋 **Verification Checklist**

- [ ] Google Cloud project exists
- [ ] Gmail API enabled
- [ ] Calendar API enabled
- [ ] OAuth client ID created (Web application)
- [ ] Current WebContainer URL added to authorized origins
- [ ] OAuth consent screen configured
- [ ] Test user added (your email)
- [ ] Environment variables updated
- [ ] Browser cache cleared
- [ ] Development server restarted

## 🔄 **Alternative: Use Localhost**

If WebContainer URLs keep changing, you can use localhost:

1. **Update Vite Config** (vite.config.ts):
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

2. **Configure OAuth for localhost:**
   - Add `http://localhost:5173` to authorized origins
   - Access via: `http://localhost:5173`

## 🆘 **Still Having Issues?**

If you're still getting errors:

1. **Check Console Logs:**
   - Open browser DevTools
   - Look for detailed error messages in Console

2. **Verify Credentials:**
   - Double-check Client ID and API Key
   - Ensure they're from the same Google Cloud project

3. **Wait for Propagation:**
   - OAuth changes can take 5-10 minutes to take effect
   - Try again after waiting

4. **Use Incognito Mode:**
   - Test in private/incognito browser window
   - Avoids cached authentication issues

## 📝 **Manual Setup Reminder**

**You need to manually do this:**

1. Go to Google Cloud Console → OAuth Credentials
2. Under your OAuth 2.0 Client ID:
   - Add your deployed frontend domain to **Authorized JavaScript Origins**
   - Current domain: `https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io`
3. Save changes

---

**🎉 After following these steps, your Gmail integration should work seamlessly!**