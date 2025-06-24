import { EmailMessage, EmailThread, EmailRoom, EmailFilter, EmailSyncStatus, EmailProvider } from '../types/email';
import { getGmailConfig, isGmailConfigured } from '../config/gmail';
import * as Sentry from '@sentry/react';

declare global {
  interface Window {
    google: any;
  }
}

class GmailService {
  private isInitialized = false;
  private isSignedIn = false;
  private accessToken: string = '';
  private tokenClient: any = null;
  private currentUser: any = null;

  // Mock data for development
  private mockEmails: EmailMessage[] = [
    {
      id: '1',
      threadId: 'thread-1',
      subject: 'Meeting Request - Project Discussion',
      from: { name: 'John Smith', email: 'john.smith@techcorp.com' },
      to: [{ name: 'You', email: 'you@company.com' }],
      date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      body: {
        text: `Hi there,

I hope this email finds you well. I wanted to schedule a meeting with you and the team at TechCorp Inc. to discuss our upcoming project collaboration.

Would you be available on January 15th, 2024 at 2:00 PM? We could meet at our office or set up a video call, whatever works best for you.

Please let me know if this time works for your schedule, or if you'd prefer a different time.

Looking forward to hearing from you.

Best regards,
John Smith
Senior Developer
TechCorp Inc.
john.smith@techcorp.com`
      },
      labels: ['INBOX', 'UNREAD'],
      isRead: false,
      isStarred: false,
      isImportant: true,
      snippet: 'I wanted to schedule a meeting with you and the team at TechCorp Inc. to discuss our upcoming project...',
      providerId: 'gmail',
      roomId: 'gmail-room-1'
    },
    {
      id: '2',
      threadId: 'thread-2',
      subject: 'Re: Quarterly Review Meeting',
      from: { name: 'Sarah Johnson', email: 'sarah.j@microsoft.com' },
      to: [{ name: 'You', email: 'you@company.com' }],
      date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      body: {
        text: `Hi,

Thanks for your email about the quarterly review. I need to reschedule our meeting that was planned for tomorrow at 3:00 PM.

Can we move it to next week instead? I'm available on Tuesday, January 23rd at 10:00 AM or Wednesday, January 24th at 2:00 PM.

Let me know what works better for you.

Best,
Sarah Johnson
Product Manager
Microsoft Corporation`
      },
      labels: ['INBOX'],
      isRead: true,
      isStarred: true,
      isImportant: false,
      snippet: 'I need to reschedule our meeting that was planned for tomorrow at 3:00 PM...',
      providerId: 'gmail',
      roomId: 'gmail-room-1'
    },
    {
      id: '3',
      threadId: 'thread-3',
      subject: 'Cancellation: Friday Team Standup',
      from: { name: 'Team Lead', email: 'lead@company.com' },
      to: [{ name: 'You', email: 'you@company.com' }],
      date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      body: {
        text: `Team,

I need to cancel our Friday team standup meeting scheduled for January 20th, 2024 at 10:00 AM due to an emergency.

We'll reschedule for next week. I'll send out a new meeting invite once I have more clarity on everyone's availability.

Thanks for understanding.

Best,
Team Lead`
      },
      labels: ['INBOX'],
      isRead: true,
      isStarred: false,
      isImportant: false,
      snippet: 'I need to cancel our Friday team standup meeting scheduled for January 20th...',
      providerId: 'gmail',
      roomId: 'gmail-room-1'
    }
  ];

  async initialize(): Promise<boolean> {
    if (!isGmailConfigured()) {
      console.warn('Gmail API not configured - using mock data');
      this.isInitialized = true;
      return true; // Return true to allow mock mode
    }

    try {
      console.log('🔧 Initializing Gmail API with Google Identity Services...');
      
      Sentry.addBreadcrumb({
        message: 'Starting Gmail API initialization',
        category: 'gmail',
        level: 'info',
      });

      // Wait for Google Identity Services to load
      await this.waitForGoogleIdentityServices();
      
      const config = getGmailConfig();
      
      if (!config.clientId) {
        throw new Error('Missing VITE_GOOGLE_CLIENT_ID in environment variables');
      }

      // Initialize Google Identity Services token client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scopes.join(' '),
        prompt: 'consent',
        callback: (tokenResponse: any) => {
          this.handleTokenResponse(tokenResponse);
        },
        error_callback: (error: any) => {
          console.error('Gmail OAuth error:', error);
          Sentry.captureException(new Error(`Gmail OAuth error: ${JSON.stringify(error)}`), {
            tags: { component: 'gmail-oauth-error' },
            extra: { error, currentOrigin: window.location.origin },
          });
        }
      });

      this.isInitialized = true;
      
      // Try to restore from stored session
      this.loadStoredToken();
      
      console.log('✅ Gmail API initialized successfully with GIS');
      
      Sentry.addBreadcrumb({
        message: 'Gmail API initialized successfully',
        category: 'gmail',
        level: 'info',
        data: { 
          hasStoredToken: !!this.accessToken,
          currentOrigin: window.location.origin 
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
          hasGoogleAccounts: !!window.google?.accounts,
          hasOAuth2: !!window.google?.accounts?.oauth2
        },
      });
      return false;
    }
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

      if (tokenResponse.error) {
        console.error('❌ Gmail token acquisition failed:', tokenResponse.error);
        
        let errorMessage = `Token acquisition failed: ${tokenResponse.error}`;
        if (tokenResponse.error === 'redirect_uri_mismatch') {
          errorMessage = `OAuth configuration error: The current domain (${window.location.origin}) is not authorized in Google Cloud Console. Please add this domain to your OAuth client's authorized JavaScript origins.`;
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
      
      // Store the access token
      this.accessToken = tokenResponse.access_token;
      this.isSignedIn = true;
      
      console.log('✅ Gmail access token acquired successfully');
      
      Sentry.addBreadcrumb({
        message: 'Gmail token acquired successfully',
        category: 'gmail',
        level: 'info',
      });

      // Store token info for session persistence
      this.storeTokenInfo(tokenResponse);
      
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
      console.log('⚠️ Gmail API not configured - using mock mode');
      this.isSignedIn = true; // Allow mock mode
      return true;
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

    // If no stored token, request new one
    console.log('👤 Requesting new Gmail access token...');
    return this.requestAccessToken();
  }

  private async requestAccessToken(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.tokenClient) {
          console.error('❌ Token client not available');
          reject(new Error('Gmail token client not initialized'));
          return;
        }

        console.log('🔑 Requesting Gmail access token...');

        // Set up one-time callback for this request
        const originalCallback = this.tokenClient.callback;
        
        this.tokenClient.callback = (tokenResponse: any) => {
          try {
            // Call the original handler
            this.handleTokenResponse(tokenResponse);
            
            // Resolve based on success/failure
            if (tokenResponse.error) {
              console.error('❌ Gmail auth failed:', tokenResponse.error);
              
              // Provide helpful error messages
              if (tokenResponse.error === 'redirect_uri_mismatch') {
                console.error(`
🚨 OAuth Configuration Error:

The current domain (${window.location.origin}) is not authorized in your Google Cloud Console.

To fix this:
1. Go to https://console.cloud.google.com/
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add this URL to "Authorized JavaScript origins":
   ${window.location.origin}
5. Save and wait 5-10 minutes for changes to propagate

See GOOGLE_OAUTH_SETUP.md for detailed instructions.
                `);
              }
              
              reject(new Error(tokenResponse.error));
            } else {
              console.log('✅ Gmail authentication successful!');
              resolve(true);
            }
            
            // Restore original callback
            this.tokenClient.callback = originalCallback;
          } catch (error) {
            console.error('❌ Error in Gmail auth callback:', error);
            this.tokenClient.callback = originalCallback;
            reject(error);
          }
        };

        // Request access token
        this.tokenClient.requestAccessToken();

      } catch (error) {
        console.error('❌ Failed to request Gmail access token:', error);
        reject(error);
      }
    });
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized && !isGmailConfigured()) {
      this.isSignedIn = false;
      this.accessToken = '';
      return;
    }

    try {
      console.log('🚪 Signing out of Gmail...');
      
      if (this.accessToken && window.google?.accounts?.oauth2) {
        // Revoke the access token
        window.google.accounts.oauth2.revoke(this.accessToken);
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
      return this.isSignedIn; // For mock mode
    }

    if (!this.isInitialized) return false;
    
    const hasValidToken = this.isSignedIn && this.accessToken;
    
    if (!hasValidToken) {
      return this.loadStoredToken();
    }
    
    return hasValidToken;
  }

  getAccessToken(): string {
    return this.accessToken || localStorage.getItem('gmail_token') || '';
  }

  async getUserInfo(): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured() && this.accessToken) {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to get user info: ${response.statusText}`);
        }

        return await response.json();
      } else {
        // Mock user info
        return {
          email: 'demo@gmail.com',
          name: 'Demo User',
          picture: 'https://via.placeholder.com/40'
        };
      }
    } catch (error) {
      console.error('❌ Failed to get Gmail user info:', error);
      throw error;
    }
  }

  async getMessages(filter: EmailFilter = {}, maxResults: number = 50): Promise<EmailMessage[]> {
    if (!this.isConnected()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured() && this.accessToken) {
        console.log('📧 Fetching messages from Gmail API...');
        
        // Build query string
        let query = '';
        if (filter.isRead === false) query += 'is:unread ';
        if (filter.isStarred) query += 'is:starred ';
        if (filter.isImportant) query += 'is:important ';
        if (filter.hasAttachments) query += 'has:attachment ';
        if (filter.sender) query += `from:${filter.sender} `;
        if (filter.subject) query += `subject:${filter.subject} `;
        if (filter.query) query += filter.query;

        const params = new URLSearchParams({
          q: query.trim(),
          maxResults: maxResults.toString()
        });

        const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?${params}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Gmail API error: ${response.statusText}`);
        }

        const data = await response.json();
        const messages = data.messages || [];
        const detailedMessages: EmailMessage[] = [];

        // Get detailed info for each message (limit to 10 for demo)
        for (const message of messages.slice(0, 10)) {
          try {
            const detailResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`, {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`
              }
            });

            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              const emailMessage = this.parseGmailMessage(detailData);
              detailedMessages.push(emailMessage);
            }
          } catch (error) {
            console.error('❌ Failed to get message details:', error);
          }
        }

        console.log(`✅ Fetched ${detailedMessages.length} messages from Gmail`);
        return detailedMessages;
      } else {
        // Mock implementation
        console.log('📧 Using mock Gmail data...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let filteredEmails = [...this.mockEmails];
        
        if (filter.isRead === false) {
          filteredEmails = filteredEmails.filter(email => !email.isRead);
        }
        if (filter.isStarred) {
          filteredEmails = filteredEmails.filter(email => email.isStarred);
        }
        if (filter.isImportant) {
          filteredEmails = filteredEmails.filter(email => email.isImportant);
        }
        if (filter.sender) {
          filteredEmails = filteredEmails.filter(email => 
            email.from.email.toLowerCase().includes(filter.sender!.toLowerCase())
          );
        }
        if (filter.subject) {
          filteredEmails = filteredEmails.filter(email => 
            email.subject.toLowerCase().includes(filter.subject!.toLowerCase())
          );
        }
        
        return filteredEmails.slice(0, maxResults);
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

    // Get message body
    const getMessageBody = (payload: any): { text: string; html?: string } => {
      if (payload.body && payload.body.data) {
        const text = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        return { text };
      }
      
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body.data) {
            const text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            return { text };
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
      roomId: 'gmail-room-1' // Will be dynamic based on account
    };
  }

  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured() && this.accessToken) {
        const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            removeLabelIds: ['UNREAD']
          })
        });

        return response.ok;
      } else {
        // Mock implementation
        const email = this.mockEmails.find(e => e.id === messageId);
        if (email) {
          email.isRead = true;
          email.labels = email.labels.filter(label => label !== 'UNREAD');
        }
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
      return false;
    }
  }

  async starMessage(messageId: string, starred: boolean = true): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured() && this.accessToken) {
        const labelIds = starred ? ['STARRED'] : [];
        const removeLabelIds = starred ? [] : ['STARRED'];
        
        const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            addLabelIds: labelIds,
            removeLabelIds: removeLabelIds
          })
        });

        return response.ok;
      } else {
        // Mock implementation
        const email = this.mockEmails.find(e => e.id === messageId);
        if (email) {
          email.isStarred = starred;
          if (starred && !email.labels.includes('STARRED')) {
            email.labels.push('STARRED');
          } else if (!starred) {
            email.labels = email.labels.filter(label => label !== 'STARRED');
          }
        }
        return true;
      }
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
      if (isGmailConfigured() && this.accessToken) {
        const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1', {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          return data.resultSizeEstimate || 0;
        }
        return 0;
      } else {
        // Mock implementation
        return this.mockEmails.filter(email => !email.isRead).length;
      }
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }
}

export const gmailService = new GmailService();