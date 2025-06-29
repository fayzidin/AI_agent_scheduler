# 🔧 Microsoft Outlook OAuth Setup Guide

## 🚨 **Current Error Analysis**

The error `AADSTS70002: The provided request must include a 'client_secret' input parameter` occurs because the Microsoft authentication flow is expecting a client secret, which is not required for public client applications like web apps using MSAL.js.

## 🛠️ **Quick Fix Steps**

### **Step 1: Create a New Azure App Registration**

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com/
   - Sign in with your Microsoft account

2. **Navigate to App Registrations:**
   - Search for "App registrations" in the search bar
   - Click on "App registrations" in the results

3. **Create a New Registration:**
   - Click **+ New registration**
   - **Name**: AI Meeting Assistant
   - **Supported account types**: IMPORTANT - Select "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: Web → `https://aima.netlify.app` (and add your development URL)
   - Click **Register**

### **Step 2: Configure API Permissions**

1. **In your new app registration:**
   - Go to **API permissions**
   - Click **+ Add a permission**
   - Select **Microsoft Graph**
   - Choose **Delegated permissions**
   - Add these permissions:
     - `Mail.Read` (Read user mail)
     - `User.Read` (Read user profile)
     - `Calendars.Read` (Read user calendars)
   - Click **Add permissions**

2. **Grant Admin Consent:**
   - Click **Grant admin consent for [your tenant]** if you have admin rights
   - For personal accounts, users will consent during sign-in

### **Step 3: Configure Authentication**

1. **Go to Authentication:**
   - Click **+ Add a platform**
   - Select **Single-page application (SPA)** (NOT Web)
   - Add these redirect URIs:
     ```
     https://aima.netlify.app
     http://localhost:5173
     https://localhost:5173
     ```
   - Check **Access tokens** and **ID tokens**
   - Click **Configure**

2. **Important: Use SPA Platform Type**
   - The error occurs because you're using the "Web" platform type, which requires a client secret
   - SPA applications don't use client secrets, so this will fix the error

### **Step 4: Get Your Client ID**

1. **From the Overview page:**
   - Copy the **Application (client) ID**
   - This is your `VITE_OUTLOOK_CLIENT_ID`

### **Step 5: Update Environment Variables**

Update your `.env` file with the credentials:

```env
# Microsoft Outlook API Configuration
VITE_OUTLOOK_CLIENT_ID=your-microsoft-client-id
```

## 🧪 **Testing Steps**

1. **Clear Browser Cache:**
   - Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
   - Or open DevTools → Application → Storage → Clear storage

2. **Restart Development Server:**
   ```bash
   npm run dev
   ```

3. **Test Outlook Connection:**
   - Sign in to your app
   - Go to Email Dashboard
   - Click "Add Account" → "Microsoft Outlook"
   - Click "Connect"
   - Should now work without the client_secret error

## 🚨 **Common Issues & Solutions**

### **"client_secret required" error**
- Make sure you selected "Single-page application (SPA)" as the platform type, not "Web"
- Web platform requires a client secret, SPA doesn't

### **"You can't sign in here with a personal account"**
- Make sure you selected "Accounts in any organizational directory and personal Microsoft accounts" during app registration
- Check that your authority is set to "common" in the code

### **"Access blocked"**
- Check authorized redirect URIs are correct
- Wait 5-10 minutes after saving changes
- Try incognito mode

### **"Popup blocked"**
- Allow popups for this site
- Try again after allowing popups

## 📋 **Verification Checklist**

- [ ] Azure App registration created with personal account support
- [ ] Platform type set to "Single-page application (SPA)"
- [ ] Microsoft Graph API permissions added
- [ ] Redirect URIs configured correctly
- [ ] Client ID copied to environment variables
- [ ] Authority set to "common" in code
- [ ] Browser cache cleared
- [ ] Development server restarted

## 🔄 **Handling URL Changes**

If you're using WebContainer or a similar environment where the URL changes between sessions:

1. **Update Redirect URIs:**
   - Go to your app registration in Azure Portal
   - Add the new URL to the redirect URIs list
   - Save changes

2. **Or Use Localhost:**
   - Configure your app to use localhost:5173
   - Add localhost:5173 to your redirect URIs

## 🆘 **Still Having Issues?**

If you're still getting errors:

1. **Check Console Logs:**
   - Open browser DevTools
   - Look for detailed error messages in Console

2. **Verify Credentials:**
   - Double-check Client ID
   - Ensure it's from the correct app registration

3. **Wait for Propagation:**
   - Azure changes can take 5-10 minutes to take effect
   - Try again after waiting

4. **Use Incognito Mode:**
   - Test in private/incognito browser window
   - Avoids cached authentication issues

---

**🎉 After following these steps, your Outlook integration should work without the client_secret error!**