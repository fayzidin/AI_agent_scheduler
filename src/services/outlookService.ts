import { EmailMessage, EmailThread, EmailRoom, EmailFilter, EmailSyncStatus, EmailProvider } from '../types/email';
import { getOutlookConfig, isOutlookConfigured } from '../config/outlook';
import * as Sentry from '@sentry/react';

declare global {
  interface Window {
    msal: any;
  }
}

class OutlookService {
  private msalInstance: any = null;
  private isInitialized = false;
  private isSignedIn = false;
  private accessToken: string = '';
  private currentUser: any = null;

  async initialize(): Promise<boolean> {
    if (!isOutlookConfigured()) {
      console.warn('Outlook API not configured - mock mode disabled');
      this.isInitialized = false;
      return false;
    }

    try {
      console.log('🔧 Initializing Outlook API with Microsoft Authentication Library...');
      
      Sentry.addBreadcrumb({
        message: 'Starting Outlook API initialization',
        category: 'outlook',
        level: 'info',
      });

      // Load MSAL library with improved error handling and retries
      await this.loadMSALWithRetry();
      
      const config = getOutlookConfig();
      
      if (!config.clientId) {
        throw new Error('Missing VITE_OUTLOOK_CLIENT_ID in environment variables');
      }

      // Check if MSAL is available
      if (!window.msal) {
        console.error('MSAL library not available after loading attempt');
        throw new Error('Microsoft Authentication Library (MSAL) not available');
      }

      // Initialize MSAL instance
      const msalConfig = {
        auth: {
          clientId: config.clientId,
          authority: config.authority,
          redirectUri: config.redirectUri,
        },
        cache: {
          cacheLocation: 'sessionStorage',
          storeAuthStateInCookie: false,
        }
      };

      this.msalInstance = new window.msal.PublicClientApplication(msalConfig);
      await this.msalInstance.initialize();

      this.isInitialized = true;
      
      // Try to restore from stored session
      const existingToken = this.loadStoredToken();
      this.isSignedIn = !!existingToken;
      
      console.log('✅ Outlook API initialized successfully with MSAL');
      
      Sentry.addBreadcrumb({
        message: 'Outlook API initialized successfully',
        category: 'outlook',
        level: 'info',
        data: { 
          hasStoredToken: !!existingToken,
          currentOrigin: window.location.origin,
          scopes: config.scopes
        },
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Outlook API:', error);
      Sentry.captureException(error, {
        tags: { component: 'outlook-init' },
        extra: { 
          isConfigured: isOutlookConfigured(),
          currentOrigin: window.location.origin,
          userAgent: navigator.userAgent,
          hasMsal: !!window.msal
        },
      });
      return false;
    }
  }

  private async loadMSALWithRetry(maxRetries = 3): Promise<void> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        // Check if MSAL is already loaded
        if (window.msal) {
          console.log('MSAL already loaded');
          return;
        }
        
        console.log(`Attempting to load MSAL (attempt ${retries + 1}/${maxRetries})...`);
        await this.loadMSAL();
        
        // Verify MSAL loaded successfully
        if (window.msal) {
          console.log('MSAL loaded successfully');
          return;
        } else {
          throw new Error('MSAL not available after script loaded');
        }
      } catch (error) {
        retries++;
        console.warn(`MSAL load attempt ${retries} failed:`, error);
        
        if (retries >= maxRetries) {
          console.error('All MSAL load attempts failed');
          throw new Error('Failed to load Microsoft Authentication Library after multiple attempts');
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }
  }

  private async loadMSAL(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if MSAL is already loaded
      if (window.msal) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('MSAL script load timeout'));
      }, 10000);

      const script = document.createElement('script');
      script.src = 'https://alcdn.msauth.net/browser/2.38.1/js/msal-browser.min.js';
      script.crossOrigin = 'anonymous'; // Add CORS support
      
      script.onload = () => {
        clearTimeout(timeout);
        // Verify MSAL is actually available
        if (window.msal) {
          resolve();
        } else {
          // Sometimes the script loads but the global isn't immediately available
          let checkCount = 0;
          const checkInterval = setInterval(() => {
            if (window.msal) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve();
            } else if (checkCount > 10) {
              clearInterval(checkInterval);
              reject(new Error('MSAL loaded but global object not available'));
            }
            checkCount++;
          }, 100);
        }
      };
      
      script.onerror = (e) => {
        clearTimeout(timeout);
        console.error('MSAL script failed to load:', e);
        reject(new Error('Failed to load MSAL'));
      };
      
      document.head.appendChild(script);
    });
  }

  private loadStoredToken(): boolean {
    try {
      const storedToken = sessionStorage.getItem('outlook_token');
      if (!storedToken) return false;

      const tokenInfo = JSON.parse(storedToken);
      
      // Check if token is still valid (with 5 minute buffer)
      if (tokenInfo.expires_at && Date.now() < (tokenInfo.expires_at - 5 * 60 * 1000)) {
        this.accessToken = tokenInfo.access_token;
        this.isSignedIn = true;
        console.log('🔄 Restored Outlook session from storage');
        return true;
      } else {
        // Token expired, remove it
        sessionStorage.removeItem('outlook_token');
        console.log('🗑️ Removed expired Outlook token');
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load stored Outlook token:', error);
      sessionStorage.removeItem('outlook_token');
      return false;
    }
  }

  private storeTokenInfo(tokenResponse: any) {
    const tokenInfo = {
      access_token: tokenResponse.accessToken,
      expires_at: Date.now() + (tokenResponse.expiresOn ? new Date(tokenResponse.expiresOn).getTime() - Date.now() : 3600 * 1000),
      scope: tokenResponse.scopes?.join(' ')
    };
    
    try {
      sessionStorage.setItem('outlook_token', JSON.stringify(tokenInfo));
      console.log('💾 Outlook token stored successfully');
    } catch (error) {
      console.warn('⚠️ Failed to store Outlook token info:', error);
    }
  }

  async signIn(): Promise<boolean> {
    console.log('🔐 Starting Outlook sign-in process...');
    
    if (!isOutlookConfigured()) {
      throw new Error('Outlook API not configured. Please add your Microsoft API credentials to environment variables.');
    }

    if (!this.isInitialized) {
      console.log('🔧 Initializing Outlook API first...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Outlook API');
      }
    }

    // First, try to restore from stored session
    console.log('🔍 Checking for stored token...');
    if (this.loadStoredToken()) {
      console.log('✅ Using stored Outlook token');
      return true;
    }

    // Try silent authentication first
    console.log('🤫 Attempting silent authentication...');
    const silentSuccess = await this.attemptSilentAuth();
    if (silentSuccess) {
      return true;
    }

    // If silent auth fails, fall back to interactive auth
    console.log('👤 Attempting interactive authentication...');
    return this.attemptInteractiveAuth();
  }

  private async attemptSilentAuth(): Promise<boolean> {
    try {
      const config = getOutlookConfig();
      const accounts = this.msalInstance.getAllAccounts();
      
      if (accounts.length === 0) {
        console.log('No accounts found for silent auth');
        return false;
      }
      
      const silentRequest = {
        scopes: config.scopes,
        account: accounts[0]
      };

      console.log('Attempting silent Outlook authentication...');
      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      
      this.accessToken = response.accessToken;
      this.isSignedIn = true;
      this.currentUser = response.account;
      
      this.storeTokenInfo(response);
      
      console.log('✅ Silent Outlook authentication successful!');
      
      Sentry.addBreadcrumb({
        message: 'Silent Outlook authentication successful',
        category: 'outlook',
        level: 'info',
      });
      
      return true;
    } catch (error) {
      console.log('Silent auth failed:', error);
      return false;
    }
  }

  private async attemptInteractiveAuth(): Promise<boolean> {
    try {
      const config = getOutlookConfig();
      const loginRequest = {
        scopes: config.scopes,
        prompt: 'select_account'
      };

      console.log('🔑 Requesting Outlook access token with interactive login...');

      Sentry.addBreadcrumb({
        message: 'Starting interactive Outlook sign-in',
        category: 'outlook',
        level: 'info',
        data: { currentOrigin: window.location.origin },
      });

      const response = await this.msalInstance.loginPopup(loginRequest);
      
      this.accessToken = response.accessToken;
      this.isSignedIn = true;
      this.currentUser = response.account;
      
      this.storeTokenInfo(response);
      
      console.log('✅ Interactive Outlook authentication successful!');
      
      Sentry.addBreadcrumb({
        message: 'Interactive Outlook sign-in successful',
        category: 'outlook',
        level: 'info',
      });
      
      return true;
    } catch (error: any) {
      console.error('❌ Interactive Outlook auth failed:', error);
      
      // Don't send expected auth errors to Sentry
      if (!error.message?.includes('popup_closed') && 
          !error.message?.includes('interaction_required') &&
          !error.message?.includes('window.closed') &&
          !error.message?.includes('Cross-Origin-Opener-Policy')) {
        Sentry.captureException(error, {
          tags: { component: 'outlook-signin' },
          extra: { currentOrigin: window.location.origin },
        });
      }
      
      throw new Error(`Outlook authentication failed: ${error.message}`);
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('🚪 Signing out of Outlook...');
      
      if (this.msalInstance && this.currentUser) {
        const logoutRequest = {
          account: this.currentUser
        };
        await this.msalInstance.logoutPopup(logoutRequest);
      }
      
      // Clear stored session
      sessionStorage.removeItem('outlook_token');
      this.isSignedIn = false;
      this.accessToken = '';
      this.currentUser = null;
      console.log('✅ Outlook signed out successfully');
    } catch (error) {
      console.error('❌ Outlook sign-out failed:', error);
    }
  }

  isConnected(): boolean {
    if (!isOutlookConfigured()) {
      return false; // No mock mode
    }

    if (!this.isInitialized) return false;
    
    const hasValidToken = this.isSignedIn && this.accessToken;
    
    if (!hasValidToken) {
      return this.loadStoredToken();
    }
    
    return hasValidToken;
  }

  getAccessToken(): string {
    return this.accessToken || '';
  }

  async getUserInfo(): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Outlook not connected');
    }

    try {
      if (isOutlookConfigured() && this.accessToken) {
        console.log('📧 Getting Outlook user info...');
        
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const userInfo = await response.json();
        
        const result = {
          email: userInfo.mail || userInfo.userPrincipalName,
          name: userInfo.displayName || userInfo.givenName || 'Outlook User',
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.displayName || 'Outlook User')}&background=0078d4&color=fff&size=40`
        };
        
        console.log('✅ Outlook user info retrieved successfully');
        return result;
      } else {
        throw new Error('Outlook API not properly configured');
      }
    } catch (error) {
      console.error('❌ Failed to get Outlook user info:', error);
      
      // Return fallback user info instead of throwing
      return {
        email: 'user@outlook.com',
        name: 'Outlook User',
        picture: 'https://ui-avatars.com/api/?name=Outlook%20User&background=0078d4&color=fff&size=40'
      };
    }
  }

  async getMessages(filter: EmailFilter = {}, maxResults: number = 50): Promise<EmailMessage[]> {
    if (!this.isConnected()) {
      throw new Error('Outlook not connected');
    }

    try {
      if (isOutlookConfigured() && this.accessToken) {
        console.log('📧 Fetching messages from Outlook API...');
        
        // Build OData filter
        let odataFilter = '';
        const filterParts: string[] = [];
        
        if (filter.isRead === false) filterParts.push('isRead eq false');
        if (filter.isRead === true) filterParts.push('isRead eq true');
        if (filter.sender) filterParts.push(`from/emailAddress/address eq '${filter.sender}'`);
        
        if (filterParts.length > 0) {
          odataFilter = `$filter=${filterParts.join(' and ')}`;
        }

        const url = `https://graph.microsoft.com/v1.0/me/messages?$top=${Math.min(maxResults, 50)}&$orderby=receivedDateTime desc${odataFilter ? '&' + odataFilter : ''}`;
        
        console.log('📧 Outlook query URL:', url);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const messages = data.value || [];
        
        console.log(`📧 Found ${messages.length} messages from Outlook`);
        
        const detailedMessages: EmailMessage[] = messages.map((message: any) => 
          this.parseOutlookMessage(message)
        );

        console.log(`✅ Fetched ${detailedMessages.length} messages from Outlook API`);
        return detailedMessages;
      } else {
        throw new Error('Outlook API not properly configured');
      }
    } catch (error) {
      console.error('❌ Failed to get Outlook messages:', error);
      throw error;
    }
  }

  private parseOutlookMessage(outlookMessage: any): EmailMessage {
    // Parse email addresses
    const parseEmailAddress = (emailObj: any) => {
      if (!emailObj) return { name: '', email: '' };
      return {
        name: emailObj.name || emailObj.emailAddress?.name || '',
        email: emailObj.address || emailObj.emailAddress?.address || ''
      };
    };

    return {
      id: outlookMessage.id,
      threadId: outlookMessage.conversationId,
      subject: outlookMessage.subject || 'No Subject',
      from: parseEmailAddress(outlookMessage.from?.emailAddress),
      to: (outlookMessage.toRecipients || []).map((recipient: any) => 
        parseEmailAddress(recipient.emailAddress)
      ),
      cc: (outlookMessage.ccRecipients || []).map((recipient: any) => 
        parseEmailAddress(recipient.emailAddress)
      ),
      date: outlookMessage.receivedDateTime,
      body: {
        text: this.extractTextFromBody(outlookMessage.body),
        html: outlookMessage.body?.contentType === 'html' ? outlookMessage.body.content : undefined
      },
      labels: outlookMessage.categories || [],
      isRead: outlookMessage.isRead || false,
      isStarred: outlookMessage.flag?.flagStatus === 'flagged' || false,
      isImportant: outlookMessage.importance === 'high' || false,
      snippet: outlookMessage.bodyPreview || '',
      providerId: 'outlook',
      roomId: 'outlook-room-1'
    };
  }

  private extractTextFromBody(body: any): string {
    if (!body) return '';
    
    if (body.contentType === 'text') {
      return body.content || '';
    }
    
    if (body.contentType === 'html') {
      // Convert HTML to plain text
      try {
        const div = document.createElement('div');
        div.innerHTML = body.content || '';
        
        // Remove script and style elements
        const scripts = div.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        // Get text content and clean up
        let text = div.textContent || div.innerText || '';
        
        // Clean up extra whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
      } catch (error) {
        console.warn('Failed to convert HTML to text:', error);
        return body.content || '';
      }
    }
    
    return body.content || '';
  }

  async markAsRead(messageId: string): Promise<boolean> {
    if (!isOutlookConfigured() || !this.accessToken) {
      console.warn('⚠️ markAsRead not available without proper Outlook configuration');
      return false;
    }

    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isRead: true
        })
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
      return false;
    }
  }

  async starMessage(messageId: string, starred: boolean = true): Promise<boolean> {
    if (!isOutlookConfigured() || !this.accessToken) {
      console.warn('⚠️ starMessage not available without proper Outlook configuration');
      return false;
    }

    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          flag: {
            flagStatus: starred ? 'flagged' : 'notFlagged'
          }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Failed to star/unstar message:', error);
      return false;
    }
  }

  async getUnreadCount(): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      if (isOutlookConfigured() && this.accessToken) {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders/inbox', {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          return data.unreadItemCount || 0;
        }
        return 0;
      } else {
        return 0;
      }
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }
}

export const outlookService = new OutlookService();