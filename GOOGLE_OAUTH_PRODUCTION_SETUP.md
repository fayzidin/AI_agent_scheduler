# 🔧 Google OAuth Production Setup for Netlify

## Current Issue
Your Gmail integration is failing because:
1. **Missing authorized domain**: `https://aima.netlify.app` is not in your Google OAuth client
2. **Verification-required scopes**: Some scopes need Google's app verification

## Quick Fix (5 minutes)

### Step 1: Update Google Cloud Console
1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Navigate to APIs & Services → Credentials**
3. **Find your OAuth 2.0 Client ID**: `789393805530-q0aoa150hdd2vnn459mf5sg8geqdrol9`
4. **Click Edit** (pencil icon)
5. **Under "Authorized JavaScript origins", add:**
   ```
   https://aima.netlify.app
   ```
6. **Under "Authorized redirect URIs", add:**
   ```
   https://aima.netlify.app
   https://aima.netlify.app/
   ```
7. **Click Save**
8. **Wait 5-10 minutes** for changes to propagate

### Step 2: Verify Scopes (Already Fixed)
The app now uses only read-only scopes that don't require verification:
- ✅ `gmail.readonly` - Read Gmail emails
- ✅ `userinfo.email` - Get user email
- ✅ `calendar.readonly` - Read calendar events

### Step 3: Test the Fix
1. **Wait 5-10 minutes** after saving Google Console changes
2. **Go to https://aima.netlify.app**
3. **Try connecting Gmail** from the dashboard
4. **Should work without verification errors**

## What Changed
- **Removed verification-required scopes**: `gmail.modify`, `gmail.labels`, `userinfo.profile`, `calendar`, `calendar.events`
- **Added read-only scopes only**: These don't require Google's app verification process
- **Updated OAuth configuration**: Now uses minimal, safe scopes

## Limitations with Read-Only Access
- ❌ Cannot mark emails as read
- ❌ Cannot star/unstar emails  
- ❌ Cannot create calendar events
- ✅ Can read emails and parse content
- ✅ Can get user info
- ✅ Can read calendar for availability
- ✅ Can export calendar files (.ics/.vcs)

## If You Need Full Access Later
To get full Gmail/Calendar access, you'll need to:
1. Submit your app for Google's verification process
2. Provide privacy policy and terms of service
3. Complete security assessment
4. Wait for approval (can take weeks)

For now, read-only access is perfect for:
- ✅ Email parsing and AI analysis
- ✅ Meeting detection
- ✅ Calendar export
- ✅ Contact extraction

## Troubleshooting

**Still getting 403 errors?**
- Wait 10+ minutes after updating Google Console
- Clear browser cache and cookies
- Try incognito/private browsing mode

**"redirect_uri_mismatch" error?**
- Double-check the domain is exactly: `https://aima.netlify.app`
- No trailing slashes or extra characters
- Case-sensitive match required

**"This app isn't verified" warning?**
- Click "Advanced" → "Go to AI Meeting Assistant (unsafe)"
- This is normal for development apps
- Users will see this until you get verified

## Production Checklist
- [ ] Added `https://aima.netlify.app` to authorized origins
- [ ] Waited 5-10 minutes for propagation
- [ ] Tested Gmail connection on production site
- [ ] Verified read-only scopes are working
- [ ] Confirmed no verification errors

---

**🎉 After these changes, your Gmail integration should work perfectly on production!**