# 🔧 Google OAuth Setup - Fix Redirect URI Mismatch

## 🚨 **Current Error Analysis**

You're getting this error because your Google Cloud Console project doesn't have the correct JavaScript origins configured for your development environment.

**Error Details:**
- **Error**: `redirect_uri_mismatch`
- **Origin**: `https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io`
- **Issue**: This WebContainer URL is not registered in Google Cloud Console

## 🛠️ **Quick Fix Steps**

### **Step 1: Get Your Current Development URL**
Your current development URL is:
```
https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
```

### **Step 2: Update Google Cloud Console**

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Settings**
   - Go to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID
   - Click the **Edit** button (pencil icon)

3. **Add Authorized JavaScript Origins**
   Add these URLs to **Authorized JavaScript origins**:
   ```
   https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
   http://localhost:5173
   https://localhost:5173
   ```

4. **Add Authorized Redirect URIs** (if needed)
   Add these URLs to **Authorized redirect URIs**:
   ```
   https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
   http://localhost:5173
   https://localhost:5173
   ```

5. **Save Changes**
   - Click **Save**
   - Wait 5-10 minutes for changes to propagate

### **Step 3: Alternative - Create New OAuth Client**

If you don't have a Google Cloud project yet:

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Click **New Project**
   - Name it "AI Meeting Assistant"

2. **Enable Calendar API**
   - Go to **APIs & Services** → **Library**
   - Search "Google Calendar API"
   - Click **Enable**

3. **Create OAuth Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Name: "AI Meeting Assistant - Dev"

4. **Configure Origins**
   - **Authorized JavaScript origins**:
     ```
     https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--10996a95.local-credentialless.webcontainer-api.io
     http://localhost:5173
     https://localhost:5173
     ```

5. **Get Credentials**
   - Copy **Client ID**
   - Copy **API Key** (from API Keys section)

### **Step 4: Update Environment Variables**

Update your `.env` file with the new credentials:

```env
# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=your-new-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-new-api-key
```

## 🔄 **Testing the Fix**

1. **Restart Development Server**
   ```bash
   npm run dev
   ```

2. **Clear Browser Cache**
   - Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
   - Or open DevTools → Application → Storage → Clear storage

3. **Test Google Calendar Connection**
   - Sign in to your app
   - Go to Calendar Integration
   - Click "Connect" for Google Calendar
   - Should now work without redirect URI error

## 🚨 **Important Notes**

### **WebContainer URLs Change**
- WebContainer URLs are dynamic and change between sessions
- You may need to update the authorized origins if the URL changes
- For production, use your actual domain

### **Development vs Production**
- **Development**: Use WebContainer URL + localhost
- **Production**: Use your actual domain (e.g., `https://yourdomain.com`)

### **OAuth Consent Screen**
If you see "This app isn't verified":
1. Go to **OAuth consent screen** in Google Cloud Console
2. Add your email as a test user
3. For production, submit for verification

## 🔧 **Alternative: Use Localhost Proxy**

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

2. **Use Localhost URL**:
   - Access via: `http://localhost:5173`
   - Configure Google OAuth for: `http://localhost:5173`

## ✅ **Verification Checklist**

- [ ] Google Cloud project created
- [ ] Calendar API enabled
- [ ] OAuth client ID created
- [ ] Authorized JavaScript origins added
- [ ] Environment variables updated
- [ ] Development server restarted
- [ ] Browser cache cleared
- [ ] Google Calendar connection tested

## 🆘 **Still Having Issues?**

If you're still getting errors:

1. **Check Console Logs**
   - Open browser DevTools
   - Look for detailed error messages

2. **Verify Credentials**
   - Double-check Client ID and API Key
   - Ensure they're from the same Google Cloud project

3. **Wait for Propagation**
   - OAuth changes can take 5-10 minutes to take effect
   - Try again after waiting

4. **Use Incognito Mode**
   - Test in private/incognito browser window
   - Avoids cached authentication issues

---

**🎉 After following these steps, your Google Calendar integration should work seamlessly!**