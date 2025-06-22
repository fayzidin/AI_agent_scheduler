import { EmailMessage, EmailThread, EmailRoom, EmailFilter, EmailSyncStatus, EmailProvider } from '../types/email';
import { getGmailConfig, isGmailConfigured } from '../config/gmail';
import * as Sentry from '@sentry/react';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

class GmailService {
  private isInitialized = false;
  private isSignedIn = false;
  private gapi: any = null;
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
      console.warn('Gmail API not configured');
      return false;
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Starting Gmail API initialization',
        category: 'gmail',
        level: 'info',
      });

      // Load Google API script and Google Identity Services
      await Promise.all([
        this.loadGoogleAPI(),
        this.loadGoogleIdentityServices()
      ]);
      
      const config = getGmailConfig();
      
      // Initialize gapi client
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Gmail API client initialization timeout'));
        }, 10000);

        window.gapi.load('client', () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });

      // Initialize the client
      await window.gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: config.discoveryDocs
      });

      this.gapi = window.gapi;

      // Initialize Google Identity Services token client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scopes.join(' '),
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
      
      // Check if we already have a valid token
      const existingToken = this.gapi.client.getToken();
      this.isSignedIn = existingToken && existingToken.access_token;
      
      // Try to restore from stored session
      if (!this.isSignedIn) {
        this.loadStoredToken();
      }
      
      console.log('Gmail API initialized successfully');
      
      Sentry.addBreadcrumb({
        message: 'Gmail API initialized successfully',
        category: 'gmail',
        level: 'info',
        data: { 
          hasExistingToken: !!existingToken,
          currentOrigin: window.location.origin 
        },
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Gmail API:', error);
      Sentry.captureException(error, {
        tags: { component: 'gmail-init' },
        extra: { 
          isConfigured: isGmailConfigured(),
          currentOrigin: window.location.origin,
          userAgent: navigator.userAgent
        },
      });
      return false;
    }
  }

  private handleTokenResponse(tokenResponse: any) {
    try {
      if (tokenResponse.error) {
        console.error('Gmail token acquisition failed:', tokenResponse.error);
        
        let errorMessage = `Token acquisition failed: ${tokenResponse.error}`;
        if (tokenResponse.error === 'redirect_uri_mismatch') {
          errorMessage = `OAuth configuration error: The current domain (${window.location.origin}) is not authorized in Google Cloud Console.`;
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
      
      // Set the access token for gapi client
      this.gapi.client.setToken({
        access_token: tokenResponse.access_token
      });
      
      this.isSignedIn = true;
      console.log('Gmail access token acquired successfully');
      
      Sentry.addBreadcrumb({
        message: 'Gmail token acquired successfully',
        category: 'gmail',
        level: 'info',
      });

      // Store token info for session persistence
      this.storeTokenInfo(tokenResponse);
      
    } catch (error) {
      console.error('Error in Gmail token callback:', error);
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
      sessionStorage.setItem('gmail_token', JSON.stringify(tokenInfo));
    } catch (error) {
      console.warn('Failed to store Gmail token info:', error);
    }
  }

  private loadStoredToken(): boolean {
    try {
      const storedToken = sessionStorage.getItem('gmail_token');
      if (!storedToken) return false;

      const tokenInfo = JSON.parse(storedToken);
      
      // Check if token is still valid (with 5 minute buffer)
      if (tokenInfo.expires_at && Date.now() < (tokenInfo.expires_at - 5 * 60 * 1000)) {
        this.gapi.client.setToken({
          access_token: tokenInfo.access_token
        });
        this.isSignedIn = true;
        console.log('Restored Gmail session from storage');
        return true;
      } else {
        sessionStorage.removeItem('gmail_token');
        return false;
      }
    } catch (error) {
      console.warn('Failed to load stored Gmail token:', error);
      sessionStorage.removeItem('gmail_token');
      return false;
    }
  }

  private loadGoogleAPI(): Promise<void> {
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

  private loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Google Identity Services script load timeout'));
      }, 10000);

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Google Identity Services'));
      };
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    // First, try to restore from stored session
    if (this.loadStoredToken()) {
      return true;
    }

    // Try silent authentication first
    const silentSuccess = await this.attemptSilentAuth();
    if (silentSuccess) {
      return true;
    }

    // If silent auth fails, fall back to interactive auth
    return this.attemptInteractiveAuth();
  }

  private async attemptSilentAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.tokenClient) {
          resolve(false);
          return;
        }

        console.log('Attempting silent Gmail authentication...');

        const originalCallback = this.tokenClient.callback;
        
        this.tokenClient.callback = (tokenResponse: any) => {
          try {
            originalCallback(tokenResponse);
            
            if (tokenResponse.error) {
              console.log('Silent Gmail auth failed:', tokenResponse.error);
              resolve(false);
            } else {
              console.log('Silent Gmail auth successful!');
              resolve(true);
            }
            
            this.tokenClient.callback = originalCallback;
          } catch (error) {
            console.error('Error in silent Gmail auth callback:', error);
            this.tokenClient.callback = originalCallback;
            resolve(false);
          }
        };

        this.tokenClient.requestAccessToken({ prompt: 'none' });

        setTimeout(() => {
          if (this.tokenClient.callback !== originalCallback) {
            console.log('Silent Gmail auth timeout');
            this.tokenClient.callback = originalCallback;
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('Silent Gmail auth attempt failed:', error);
        resolve(false);
      }
    });
  }

  private async attemptInteractiveAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.tokenClient) {
          console.error('Token client not initialized for Gmail interactive auth');
          resolve(false);
          return;
        }

        console.log('Attempting interactive Gmail authentication...');

        const originalCallback = this.tokenClient.callback;
        
        this.tokenClient.callback = (tokenResponse: any) => {
          try {
            originalCallback(tokenResponse);
            
            if (tokenResponse.error) {
              console.error('Interactive Gmail auth failed:', tokenResponse.error);
              resolve(false);
            } else {
              console.log('Interactive Gmail auth successful!');
              resolve(true);
            }
            
            this.tokenClient.callback = originalCallback;
          } catch (error) {
            console.error('Error in interactive Gmail auth callback:', error);
            this.tokenClient.callback = originalCallback;
            resolve(false);
          }
        };

        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        console.error('Failed to request Gmail access token:', error);
        resolve(false);
      }
    });
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const token = this.gapi.client.getToken();
      if (token && token.access_token) {
        window.google.accounts.oauth2.revoke(token.access_token);
        this.gapi.client.setToken(null);
      }
      
      sessionStorage.removeItem('gmail_token');
      this.isSignedIn = false;
      console.log('Gmail signed out successfully');
    } catch (error) {
      console.error('Gmail sign-out failed:', error);
    }
  }

  isConnected(): boolean {
    if (!this.isInitialized) return false;
    
    const token = this.gapi?.client?.getToken();
    const hasValidToken = this.isSignedIn && token && token.access_token;
    
    if (!hasValidToken && this.gapi?.client) {
      return this.loadStoredToken();
    }
    
    return hasValidToken;
  }

  async getUserInfo(): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured()) {
        const response = await this.gapi.client.request({
          path: 'https://www.googleapis.com/oauth2/v2/userinfo'
        });
        return response.result;
      } else {
        // Mock user info
        return {
          email: 'demo@gmail.com',
          name: 'Demo User',
          picture: 'https://via.placeholder.com/40'
        };
      }
    } catch (error) {
      console.error('Failed to get Gmail user info:', error);
      throw error;
    }
  }

  async getMessages(filter: EmailFilter = {}, maxResults: number = 50): Promise<EmailMessage[]> {
    if (!this.isConnected() && isGmailConfigured()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured()) {
        // Real Gmail API implementation
        let query = '';
        
        if (filter.isRead === false) query += 'is:unread ';
        if (filter.isStarred) query += 'is:starred ';
        if (filter.isImportant) query += 'is:important ';
        if (filter.hasAttachments) query += 'has:attachment ';
        if (filter.sender) query += `from:${filter.sender} `;
        if (filter.subject) query += `subject:${filter.subject} `;
        if (filter.query) query += filter.query;

        const response = await this.gapi.client.gmail.users.messages.list({
          userId: 'me',
          q: query.trim(),
          maxResults: maxResults
        });

        const messages = response.result.messages || [];
        const detailedMessages: EmailMessage[] = [];

        // Get detailed info for each message
        for (const message of messages.slice(0, 10)) { // Limit to 10 for demo
          try {
            const detailResponse = await this.gapi.client.gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full'
            });

            const emailMessage = this.parseGmailMessage(detailResponse.result);
            detailedMessages.push(emailMessage);
          } catch (error) {
            console.error('Failed to get message details:', error);
          }
        }

        return detailedMessages;
      } else {
        // Mock implementation
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
      console.error('Failed to get Gmail messages:', error);
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
    if (!this.isConnected() && isGmailConfigured()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured()) {
        await this.gapi.client.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          removeLabelIds: ['UNREAD']
        });
        return true;
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
      console.error('Failed to mark message as read:', error);
      return false;
    }
  }

  async starMessage(messageId: string, starred: boolean = true): Promise<boolean> {
    if (!this.isConnected() && isGmailConfigured()) {
      throw new Error('Gmail not connected');
    }

    try {
      if (isGmailConfigured()) {
        const labelIds = starred ? ['STARRED'] : [];
        const removeLabelIds = starred ? [] : ['STARRED'];
        
        await this.gapi.client.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          addLabelIds: labelIds,
          removeLabelIds: removeLabelIds
        });
        return true;
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
      console.error('Failed to star/unstar message:', error);
      return false;
    }
  }

  async getUnreadCount(): Promise<number> {
    if (!this.isConnected() && isGmailConfigured()) {
      return 0;
    }

    try {
      if (isGmailConfigured()) {
        const response = await this.gapi.client.gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread',
          maxResults: 1
        });
        return response.result.resultSizeEstimate || 0;
      } else {
        // Mock implementation
        return this.mockEmails.filter(email => !email.isRead).length;
      }
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }
}

export const gmailService = new GmailService();