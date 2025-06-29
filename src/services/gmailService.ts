import { EmailMessage, EmailThread, EmailRoom, EmailFilter, EmailSyncStatus, EmailProvider } from '../types/email';
import { getGmailConfig, isGmailConfigured } from '../config/gmail';
import * as Sentry from '@sentry/react';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

class GmailService {
  private isInitialized = false;
  private isSignedIn = false;
  private accessToken: string = '';
  private tokenClient: any = null;
  private currentUser: any = null;
  private redirectUri: string;
  private authInProgress: boolean = false;
  private authTimeoutId: number | null = null;

  constructor() {
    // Set redirect URI for OAuth flow
    this.redirectUri = `${window.location.origin}/google-auth-fix.html`;
  }

  async initialize(): Promise<boolean> {
    if (!isGmailConfigured()) {
      console.warn('Gmail API not configured - mock mode disabled');
      this.isInitialized = false;
      return false;
    }

    try {
      console.log('🔧 Initializing Gmail API with Google Identity Services and GAPI...');
      
      Sentry.addBreadcrumb({
        message: 'Starting Gmail API initialization',
        category: 'gmail',
        level: 'info',
      });

      // Load both Google Identity Services and GAPI
      await Promise.all([
        this.waitForGoogleIdentityServices(),
        this.loadGoogleAPI()
      ]);
      
      const config = getGmailConfig();
      
      if (!config.clientId) {
        throw new Error('Missing VITE_GOOGLE_CLIENT_ID in environment variables');
      }

      // Initialize GAPI client first
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('GAPI client initialization timeout'));
        }, 10000);

        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: config.apiKey,
              discoveryDocs: config.discoveryDocs
            });
            clearTimeout(timeout);
            resolve(undefined);
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });

      // Initialize Google Identity Services token client with simplified configuration
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scopes.join(' '),
        callback: (tokenResponse: any) => {
          this.handleTokenResponse(tokenResponse);
        },
        error_callback: (error: any) => {
          console.error('Gmail OAuth error:', error);
          this.authInProgress = false;
          if (this.authTimeoutId) {
            clearTimeout(this.authTimeoutId);
            this.authTimeoutId = null;
          }
          Sentry.captureException(new Error(`Gmail OAuth error: ${JSON.stringify(error)}`), {
            tags: { component: 'gmail-oauth-error' },
            extra: { error, currentOrigin: window.location.origin },
          });
        }
      });

      this.isInitialized = true;
      
      // Try to restore from stored session
      this.loadStoredToken();
      
      console.log('✅ Gmail API initialized successfully with GAPI + GIS');
      
      Sentry.addBreadcrumb({
        message: 'Gmail API initialized successfully',
        category: 'gmail',
        level: 'info',
        data: { 
          hasStoredToken: !!this.accessToken,
          currentOrigin: window.location.origin,
          scopes: config.scopes
        },
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gmail API:', error);
      Sentry.captureException(error, {
        tags: { component: 'gmail-init' },
        extra: { 
          isConfigured: isGmailConfigured(),
          currentOrigin: window.location.origin,
          userAgent: navigator.userAgent,
          hasGoogleGlobal: !!window.google,
          hasGapi: !!window.gapi
        },
      });
      return false;
    }
  }

  private async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Google API script load timeout'));
      }, 10000);

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Google API'));
      };
      document.head.appendChild(script);
    });
  }

  private async waitForGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Google Identity Services script load timeout'));
      }, 10000);

      const checkGIS = () => {
        if (window.google?.accounts?.oauth2) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkGIS, 100);
        }
      };

      checkGIS();
    });
  }

  private handleTokenResponse(tokenResponse: any) {
    try {
      console.log('📧 Gmail token response received:', { 
        hasToken: !!tokenResponse.access_token,
        hasError: !!tokenResponse.error 
      });

      this.authInProgress = false;
      if (this.authTimeoutId) {
        clearTimeout(this.authTimeoutId);
        this.authTimeoutId = null;
      }

      if (tokenResponse.error) {
        console.error('❌ Gmail token acquisition failed:', tokenResponse.error);
        
        let errorMessage = `Token acquisition failed: ${tokenResponse.error}`;
        if (tokenResponse.error === 'access_denied') {
          errorMessage = 'Access denied. Please grant permission to access your Gmail account.';
        } else if (tokenResponse.error === 'redirect_uri_mismatch') {
          errorMessage = `OAuth configuration error: The current domain (${window.location.origin}) is not authorized in Google Cloud Console. Please add this domain to your OAuth client's authorized JavaScript origins.`;
        } else if (tokenResponse.error === 'popup_closed_by_user') {
          errorMessage = 'Authentication canceled: The sign-in popup was closed.';
        } else if (tokenResponse.error === 'popup_blocked_by_browser') {
          errorMessage = 'Popup blocked: Please allow popups for this site and try again.';
        }
        
        Sentry.captureException(new Error(errorMessage), {
          tags: { component: 'gmail-auth' },
          extra: { 
            error: tokenResponse.error,
            currentOrigin: window.location.origin,
            details: tokenResponse
          },
        });
        this.isSignedIn = false;
        return;
      }
      
      // Store the access token and set it in GAPI client
      this.accessToken = tokenResponse.access_token;
      window.gapi.client.setToken({
        access_token: tokenResponse.access_token
      });
      this.isSignedIn = true;
      
      console.log('✅ Gmail access token acquired successfully');
      
      Sentry.addBreadcrumb({
        message: 'Gmail token acquired successfully',
        category: 'gmail',
        level: 'info',
      });

      // Store token info for session persistence
      this.storeTokenInfo(tokenResponse);

      // Store email for future hint
      this.getUserInfo().then(userInfo => {
        if (userInfo && userInfo.email) {
          localStorage.setItem('gmail_user_email', userInfo.email);
        }
      }).catch(err => {
        console.warn('Could not get user email:', err);
      });
      
    } catch (error) {
      console.error('❌ Error in Gmail token callback:', error);
      Sentry.captureException(error, {
        tags: { component: 'gmail-token-callback' },
      });
    }
  }

  private storeTokenInfo(tokenResponse: any) {
    const tokenInfo = {
      access_token: tokenResponse.access_token,
      expires_at: Date.now() + (tokenResponse.expires_in * 1000),
      scope: tokenResponse.scope
    };
    
    try {
      localStorage.setItem('gmail_token', JSON.stringify(tokenInfo));
      console.log('💾 Gmail token stored successfully');
    } catch (error) {
      console.warn('⚠️ Failed to store Gmail token info:', error);
    }
  }

  private loadStoredToken(): boolean {
    try {
      const storedToken = localStorage.getItem('gmail_token');
      if (!storedToken) return false;

      const tokenInfo = JSON.parse(storedToken);
      
      // Check if token is still valid (with 5 minute buffer)
      if (tokenInfo.expires_at && Date.now() < (tokenInfo.expires_at - 5 * 60 * 1000)) {
        this.accessToken = tokenInfo.access_token;
        window.gapi.client.setToken({
          access_token: tokenInfo.access_token
        });
        this.isSignedIn = true;
        console.log('🔄 Restored Gmail session from storage');
        return true;
      } else {
        localStorage.removeItem('gmail_token');
        console.log('🗑️ Removed expired Gmail token');
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load stored Gmail token:', error);
      localStorage.removeItem('gmail_token');
      return false;
    }
  }

  async signIn(): Promise<boolean> {
    console.log('🔐 Starting Gmail sign-in process...');
    
    if (!isGmailConfigured()) {
      throw new Error('Gmail API not configured. Please add your Google API credentials to environment variables.');
    }

    if (!this.isInitialized) {
      console.log('🔧 Initializing Gmail API first...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Gmail API');
      }
    }

    // First, try to restore from stored session
    console.log('🔍 Checking for stored token...');
    if (this.loadStoredToken()) {
      console.log('✅ Using stored Gmail token');
      return true;
    }

    // Use a simpler approach - just request token with consent
    return new Promise((resolve) => {
      try {
        if (!this.tokenClient) {
          console.error('Token client not initialized');
          resolve(false);
          return;
        }

        console.log('🔑 Requesting Gmail access token...');
        
        // Prevent multiple auth attempts
        if (this.authInProgress) {
          console.log('Authentication already in progress');
          resolve(false);
          return;
        }
        this.authInProgress = true;

        // Store the original callback
        const originalCallback = this.tokenClient.callback;
        
        // Override callback to handle the promise resolution
        this.tokenClient.callback = (tokenResponse: any) => {
          try {
            // Call the original handler
            this.handleTokenResponse(tokenResponse);
            
            // Resolve the promise based on success/failure
            if (tokenResponse.error) {
              console.error('Auth failed:', tokenResponse.error);
              resolve(false);
            } else {
              console.log('Auth successful!');
              resolve(true);
            }
            
            // Restore original callback
            this.tokenClient.callback = originalCallback;
          } catch (error) {
            console.error('Error in auth callback:', error);
            this.tokenClient.callback = originalCallback;
            this.authInProgress = false;
            resolve(false);
          }
        };

        // Request access token with consent
        this.tokenClient.requestAccessToken({ 
          prompt: 'consent'
        });

        // Set a timeout for auth (2 minutes)
        this.authTimeoutId = window.setTimeout(() => {
          console.log('Auth timeout after 2 minutes');
          this.authInProgress = false;
          resolve(false);
        }, 120000);
      } catch (error) {
        console.error('Failed to request access token:', error);
        this.authInProgress = false;
        resolve(false);
      }
    });
  }

  async signOut(): Promise<void> {
    try {
      console.log('🚪 Signing out of Gmail...');
      
      if (this.accessToken && window.google?.accounts?.oauth2) {
        // Revoke the access token
        window.google.accounts.oauth2.revoke(this.accessToken);
      }
      
      if (window.gapi?.client) {
        window.gapi.client.setToken(null);
      }
      
      // Clear stored session
      localStorage.removeItem('gmail_token');
      this.isSignedIn = false;
      this.accessToken = '';
      console.log('✅ Gmail signed out successfully');
    } catch (error) {
      console.error('❌ Gmail sign-out failed:', error);
    }
  }

  isConnected(): boolean {
    if (!isGmailConfigured()) {
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
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured() && this.accessToken && window.gapi?.client) {
        console.log('👤 Getting Gmail user info...');
        
        // Method 1: Try to get user info from Gmail API profile (most reliable)
        try {
          await window.gapi.client.load('gmail', 'v1');
          const profileResponse = await window.gapi.client.gmail.users.getProfile({
            userId: 'me'
          });
          
          if (profileResponse.result && profileResponse.result.emailAddress) {
            const email = profileResponse.result.emailAddress;
            const name = email.split('@')[0] || 'Gmail User';
            
            const result = {
              email: email,
              name: name,
              picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285f4&color=fff&size=40`
            };
            
            console.log('✅ Gmail user info retrieved from Gmail API profile');
            
            // Store email for future hint
            localStorage.setItem('gmail_user_email', email);
            
            return result;
          }
        } catch (gmailError) {
          console.warn('⚠️ Gmail API profile failed, using fallback method:', gmailError);
        }
        
        // Method 2: Fallback - use a default user info
        const fallbackEmail = 'user@gmail.com';
        const fallbackName = 'Gmail User';
        
        return {
          email: fallbackEmail,
          name: fallbackName,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=4285f4&color=fff&size=40`
        };
      } else {
        throw new Error('Gmail API not properly configured');
      }
    } catch (error) {
      console.error('❌ Failed to get Gmail user info:', error);
      
      // Return fallback user info instead of throwing
      return {
        email: 'user@gmail.com',
        name: 'Gmail User',
        picture: 'https://ui-avatars.com/api/?name=Gmail%20User&background=4285f4&color=fff&size=40'
      };
    }
  }

  async getMessages(filter: EmailFilter = {}, maxResults: number = 50): Promise<EmailMessage[]> {
    if (!this.isConnected()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured() && this.accessToken && window.gapi?.client) {
        console.log('📧 Fetching messages from Gmail API...');
        
        // Load Gmail API
        await window.gapi.client.load('gmail', 'v1');
        
        // Build query string - Modified to get all messages, not just unread
        let query = '';
        if (filter.isRead === false) query += 'is:unread ';
        if (filter.isRead === true) query += 'is:read ';
        if (filter.isStarred) query += 'is:starred ';
        if (filter.isImportant) query += 'is:important ';
        if (filter.hasAttachments) query += 'has:attachment ';
        if (filter.sender) query += `from:${filter.sender} `;
        if (filter.subject) query += `subject:${filter.subject} `;
        if (filter.query) query += filter.query;

        // If no specific filter is set, get all inbox messages
        if (!query.trim()) {
          query = 'in:inbox';
        }

        console.log('📧 Gmail query:', query.trim());

        // Get message list
        const listResponse = await window.gapi.client.gmail.users.messages.list({
          userId: 'me',
          q: query.trim(),
          maxResults: Math.min(maxResults, 50) // Increased limit
        });

        const messages = listResponse.result.messages || [];
        console.log(`📧 Found ${messages.length} messages matching query`);
        
        const detailedMessages: EmailMessage[] = [];

        // Get detailed info for each message
        for (const message of messages.slice(0, 50)) {
          try {
            const detailResponse = await window.gapi.client.gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full'
            });

            if (detailResponse.result) {
              const emailMessage = this.parseGmailMessage(detailResponse.result);
              detailedMessages.push(emailMessage);
            }
          } catch (error) {
            console.error('❌ Failed to get message details for:', message.id, error);
          }
        }

        console.log(`✅ Fetched ${detailedMessages.length} messages from Gmail API`);
        return detailedMessages;
      } else {
        throw new Error('Gmail API not properly configured');
      }
    } catch (error) {
      console.error('❌ Failed to get Gmail messages:', error);
      throw error;
    }
  }

  private parseGmailMessage(gmailMessage: any): EmailMessage {
    const headers = gmailMessage.payload.headers;
    const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';

    // Parse email addresses
    const parseEmailAddress = (emailStr: string) => {
      const match = emailStr.match(/^(.+?)\s*<(.+)>$/) || emailStr.match(/^(.+)$/);
      if (match && match[2]) {
        return { name: match[1].trim(), email: match[2].trim() };
      } else {
        return { name: match?.[1] || emailStr, email: match?.[1] || emailStr };
      }
    };

    // Get message body with proper encoding handling
    const getMessageBody = (payload: any): { text: string; html?: string } => {
      if (payload.body && payload.body.data) {
        const text = this.decodeBase64(payload.body.data);
        return { text };
      }
      
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body.data) {
            const text = this.decodeBase64(part.body.data);
            return { text };
          }
        }
        
        // If no plain text, try HTML
        for (const part of payload.parts) {
          if (part.mimeType === 'text/html' && part.body.data) {
            const html = this.decodeBase64(part.body.data);
            // Convert HTML to plain text for display
            const text = this.htmlToText(html);
            return { text, html };
          }
        }
      }
      
      return { text: gmailMessage.snippet || '' };
    };

    return {
      id: gmailMessage.id,
      threadId: gmailMessage.threadId,
      subject: getHeader('Subject'),
      from: parseEmailAddress(getHeader('From')),
      to: [parseEmailAddress(getHeader('To'))],
      date: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
      body: getMessageBody(gmailMessage.payload),
      labels: gmailMessage.labelIds || [],
      isRead: !gmailMessage.labelIds?.includes('UNREAD'),
      isStarred: gmailMessage.labelIds?.includes('STARRED') || false,
      isImportant: gmailMessage.labelIds?.includes('IMPORTANT') || false,
      snippet: gmailMessage.snippet || '',
      providerId: 'gmail',
      roomId: 'gmail-room-1'
    };
  }

  // Helper method to properly decode base64 with URL-safe characters
  private decodeBase64(data: string): string {
    try {
      // Replace URL-safe characters
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      // Decode and handle UTF-8 properly
      const decoded = atob(padded);
      
      // Convert to UTF-8
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      
      return new TextDecoder('utf-8').decode(bytes);
    } catch (error) {
      console.warn('Failed to decode base64 content:', error);
      return data; // Return original if decoding fails
    }
  }

  // Helper method to convert HTML to plain text
  private htmlToText(html: string): string {
    try {
      // Create a temporary div to parse HTML
      const div = document.createElement('div');
      div.innerHTML = html;
      
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
      return html; // Return original if conversion fails
    }
  }

  async markAsRead(messageId: string): Promise<boolean> {
    if (!isGmailConfigured() || !this.accessToken) {
      console.warn('⚠️ markAsRead not available without proper Gmail configuration');
      return false;
    }

    try {
      await window.gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      });
      return true;
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
      return false;
    }
  }

  async starMessage(messageId: string, starred: boolean = true): Promise<boolean> {
    if (!isGmailConfigured() || !this.accessToken) {
      console.warn('⚠️ starMessage not available without proper Gmail configuration');
      return false;
    }

    try {
      const labelIds = starred ? ['STARRED'] : [];
      const removeLabelIds = starred ? [] : ['STARRED'];

      await window.gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          addLabelIds: labelIds,
          removeLabelIds: removeLabelIds
        }
      });
      return true;
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
      if (isGmailConfigured() && this.accessToken && window.gapi?.client) {
        await window.gapi.client.load('gmail', 'v1');
        
        const response = await window.gapi.client.gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread',
          maxResults: 1
        });

        if (response.result) {
          return response.result.resultSizeEstimate || 0;
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

export const gmailService = new GmailService();