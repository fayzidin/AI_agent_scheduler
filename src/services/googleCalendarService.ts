import { CalendarProvider, AvailabilityResponse, CalendarEvent, ScheduleRequest, EventSearchResult, RescheduleRequest } from '../types/calendar';
import { getGoogleConfig, isGoogleConfigured } from '../config/google';
import * as Sentry from '@sentry/react';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

class GoogleCalendarService {
  private isInitialized = false;
  private isSignedIn = false;
  private gapi: any = null;
  private tokenClient: any = null;
  private currentUser: any = null;
  private redirectUri: string;
  private authInProgress: boolean = false;
  private authTimeoutId: number | null = null;
  private popupWindow: Window | null = null;
  private popupCheckInterval: number | null = null;

  constructor() {
    // Set redirect URI for OAuth flow
    this.redirectUri = `${window.location.origin}/google-auth-fix.html`;
  }

  async initialize(): Promise<boolean> {
    if (!isGoogleConfigured()) {
      console.warn('Google Calendar API not configured');
      return false;
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Starting Google Calendar initialization',
        category: 'calendar',
        level: 'info',
      });

      // Load Google API script and Google Identity Services
      await Promise.all([
        this.loadGoogleAPI(),
        this.loadGoogleIdentityServices()
      ]);
      
      const config = getGoogleConfig();
      
      // Initialize gapi client
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Google API client initialization timeout'));
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

      // Initialize Google Identity Services token client with improved configuration
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: config.scopes.join(' '),
        callback: (tokenResponse: any) => {
          this.handleTokenResponse(tokenResponse);
        },
        error_callback: (error: any) => {
          console.error('Google OAuth error:', error);
          this.authInProgress = false;
          if (this.authTimeoutId) {
            clearTimeout(this.authTimeoutId);
            this.authTimeoutId = null;
          }
          if (this.popupCheckInterval) {
            clearInterval(this.popupCheckInterval);
            this.popupCheckInterval = null;
          }
          Sentry.captureException(new Error(`Google OAuth error: ${JSON.stringify(error)}`), {
            tags: { component: 'google-oauth-error' },
            extra: { error, currentOrigin: window.location.origin },
          });
        },
        // Add these options to help with COOP issues
        ux_mode: 'popup',
        select_account: true,
        hint: localStorage.getItem('google_user_email') || undefined
      });

      this.isInitialized = true;
      
      // Check if we already have a valid token
      const existingToken = this.gapi.client.getToken();
      this.isSignedIn = existingToken && existingToken.access_token;
      
      // Try to restore from stored session
      if (!this.isSignedIn) {
        this.loadStoredToken();
      }
      
      console.log('Google Calendar API initialized successfully');
      
      Sentry.addBreadcrumb({
        message: 'Google Calendar API initialized successfully',
        category: 'calendar',
        level: 'info',
        data: { 
          hasExistingToken: !!existingToken,
          currentOrigin: window.location.origin 
        },
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar API:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-init' },
        extra: { 
          isConfigured: isGoogleConfigured(),
          currentOrigin: window.location.origin,
          userAgent: navigator.userAgent
        },
      });
      return false;
    }
  }

  private handleTokenResponse(tokenResponse: any) {
    try {
      console.log('Google Calendar token response received:', { 
        hasToken: !!tokenResponse.access_token,
        hasError: !!tokenResponse.error 
      });
      
      this.authInProgress = false;
      if (this.authTimeoutId) {
        clearTimeout(this.authTimeoutId);
        this.authTimeoutId = null;
      }
      if (this.popupCheckInterval) {
        clearInterval(this.popupCheckInterval);
        this.popupCheckInterval = null;
      }
      
      if (tokenResponse.error) {
        console.error('Token acquisition failed:', tokenResponse.error);
        
        // Provide specific error messages for common issues
        let errorMessage = `Token acquisition failed: ${tokenResponse.error}`;
        if (tokenResponse.error === 'redirect_uri_mismatch') {
          errorMessage = `OAuth configuration error: The current domain (${window.location.origin}) is not authorized in Google Cloud Console. Please add this domain to your OAuth client's authorized JavaScript origins.`;
        } else if (tokenResponse.error === 'popup_closed_by_user') {
          errorMessage = 'Authentication canceled: The sign-in popup was closed.';
        } else if (tokenResponse.error === 'popup_blocked_by_browser') {
          errorMessage = 'Popup blocked: Please allow popups for this site and try again.';
        }
        
        Sentry.captureException(new Error(errorMessage), {
          tags: { component: 'google-calendar-auth' },
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
      console.log('Google Calendar access token acquired successfully');
      
      Sentry.addBreadcrumb({
        message: 'Google Calendar token acquired successfully',
        category: 'calendar',
        level: 'info',
      });

      // Store token info for session persistence
      this.storeTokenInfo(tokenResponse);
      
      // Store user email for future hint
      this.getUserEmail().then(email => {
        if (email) {
          localStorage.setItem('google_user_email', email);
        }
      }).catch(err => {
        console.warn('Could not get user email:', err);
      });
      
    } catch (error) {
      console.error('Error in token callback:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-token-callback' },
      });
    }
  }

  private async getUserEmail(): Promise<string | null> {
    try {
      await this.gapi.client.load('oauth2', 'v2');
      const response = await this.gapi.client.oauth2.userinfo.get();
      return response.result.email || null;
    } catch (error) {
      console.error('Failed to get user email:', error);
      return null;
    }
  }

  private storeTokenInfo(tokenResponse: any) {
    // Store token info in localStorage for better persistence
    const tokenInfo = {
      access_token: tokenResponse.access_token,
      expires_at: Date.now() + (tokenResponse.expires_in * 1000),
      scope: tokenResponse.scope
    };
    
    try {
      localStorage.setItem('google_calendar_token', JSON.stringify(tokenInfo));
      console.log('Google Calendar token stored successfully');
    } catch (error) {
      console.warn('Failed to store token info:', error);
    }
  }

  private loadStoredToken(): boolean {
    try {
      const storedToken = localStorage.getItem('google_calendar_token');
      if (!storedToken) return false;

      const tokenInfo = JSON.parse(storedToken);
      
      // Check if token is still valid (with 5 minute buffer)
      if (tokenInfo.expires_at && Date.now() < (tokenInfo.expires_at - 5 * 60 * 1000)) {
        this.gapi.client.setToken({
          access_token: tokenInfo.access_token
        });
        this.isSignedIn = true;
        console.log('Restored Google Calendar session from storage');
        return true;
      } else {
        // Token expired, remove it
        localStorage.removeItem('google_calendar_token');
        return false;
      }
    } catch (error) {
      console.warn('Failed to load stored token:', error);
      localStorage.removeItem('google_calendar_token');
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
      script.async = true;
      script.defer = true;
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

    // Try silent authentication first (no popup)
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
          console.log('Token client not initialized for silent auth');
          resolve(false);
          return;
        }

        console.log('Attempting silent Google Calendar authentication...');

        // Prevent multiple auth attempts
        if (this.authInProgress) {
          console.log('Authentication already in progress');
          resolve(false);
          return;
        }
        this.authInProgress = true;

        Sentry.addBreadcrumb({
          message: 'Attempting silent Google Calendar authentication',
          category: 'calendar',
          level: 'info',
        });

        // Store the original callback
        const originalCallback = this.tokenClient.callback;
        
        // Set up silent auth callback
        this.tokenClient.callback = (tokenResponse: any) => {
          try {
            // Call original callback first
            originalCallback(tokenResponse);
            
            // Resolve based on success/failure
            if (tokenResponse.error) {
              console.log('Silent auth failed:', tokenResponse.error);
              resolve(false);
            } else {
              console.log('Silent auth successful!');
              Sentry.addBreadcrumb({
                message: 'Silent Google Calendar authentication successful',
                category: 'calendar',
                level: 'info',
              });
              resolve(true);
            }
            
            // Restore original callback
            this.tokenClient.callback = originalCallback;
          } catch (error) {
            console.error('Error in silent auth callback:', error);
            this.tokenClient.callback = originalCallback;
            this.authInProgress = false;
            resolve(false);
          }
        };

        // Request access token silently (no user interaction)
        this.tokenClient.requestAccessToken({ 
          prompt: 'none' // This is the key - no user prompt
        });

        // Set a timeout for silent auth
        this.authTimeoutId = window.setTimeout(() => {
          if (this.tokenClient.callback !== originalCallback) {
            console.log('Silent auth timeout');
            this.tokenClient.callback = originalCallback;
            this.authInProgress = false;
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('Silent auth attempt failed:', error);
        this.authInProgress = false;
        resolve(false);
      }
    });
  }

  private async attemptInteractiveAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.tokenClient) {
          console.error('Token client not initialized for interactive auth');
          Sentry.captureMessage('Token client not initialized', {
            level: 'error',
            tags: { component: 'google-calendar-signin' },
            extra: { currentOrigin: window.location.origin },
          });
          resolve(false);
          return;
        }

        console.log('Attempting interactive Google Calendar authentication...');

        // Prevent multiple auth attempts
        if (this.authInProgress) {
          console.log('Authentication already in progress');
          resolve(false);
          return;
        }
        this.authInProgress = true;

        Sentry.addBreadcrumb({
          message: 'Starting interactive Google Calendar sign-in',
          category: 'calendar',
          level: 'info',
          data: { currentOrigin: window.location.origin },
        });

        // Store the original callback
        const originalCallback = this.tokenClient.callback;
        
        // Override callback to handle the promise resolution
        this.tokenClient.callback = (tokenResponse: any) => {
          try {
            // Call original callback first
            originalCallback(tokenResponse);
            
            // Resolve the promise based on success/failure
            if (tokenResponse.error) {
              console.error('Interactive auth failed:', tokenResponse.error);
              
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
              
              Sentry.captureException(new Error(`Interactive auth failed: ${tokenResponse.error}`), {
                tags: { component: 'google-calendar-signin' },
                extra: { 
                  error: tokenResponse.error,
                  currentOrigin: window.location.origin,
                  details: tokenResponse
                },
              });
              resolve(false);
            } else {
              console.log('Interactive auth successful!');
              Sentry.addBreadcrumb({
                message: 'Interactive Google Calendar sign-in successful',
                category: 'calendar',
                level: 'info',
              });
              resolve(true);
            }
            
            // Restore original callback
            this.tokenClient.callback = originalCallback;
          } catch (error) {
            console.error('Error in interactive auth callback:', error);
            Sentry.captureException(error, {
              tags: { component: 'google-calendar-signin-callback' },
            });
            this.tokenClient.callback = originalCallback;
            this.authInProgress = false;
            resolve(false);
          }
        };

        // Add message listener for the redirect page
        const messageListener = (event: MessageEvent) => {
          if (event.data === 'auth-complete') {
            console.log('Received auth-complete message from redirect page');
            window.removeEventListener('message', messageListener);
          }
        };
        window.addEventListener('message', messageListener);

        // Open a popup window manually to give more time for authentication
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        // Create a popup window first
        this.popupWindow = window.open(
          'about:blank',
          'google-calendar-auth-popup',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
        );
        
        if (!this.popupWindow) {
          console.error('Failed to open popup window - likely blocked by browser');
          alert('Popup blocked! Please allow popups for this site and try again.');
          this.authInProgress = false;
          window.removeEventListener('message', messageListener);
          resolve(false);
          return;
        }
        
        // Check if popup is closed prematurely
        this.popupCheckInterval = window.setInterval(() => {
          if (this.popupWindow && this.popupWindow.closed) {
            console.log('Auth popup closed by user');
            clearInterval(this.popupCheckInterval!);
            this.popupCheckInterval = null;
            this.authInProgress = false;
            window.removeEventListener('message', messageListener);
            resolve(false);
          }
        }, 1000);

        // Request access token with user interaction (popup)
        this.tokenClient.requestAccessToken({ 
          prompt: 'consent', // Show consent screen for interactive auth
          // Add these options to help with COOP issues
          ux_mode: 'popup',
          select_account: true,
          hint: localStorage.getItem('google_user_email') || undefined
        });

        // Set a longer timeout for interactive auth (60 seconds)
        this.authTimeoutId = window.setTimeout(() => {
          console.log('Interactive auth timeout after 60 seconds');
          this.authInProgress = false;
          if (this.popupCheckInterval) {
            clearInterval(this.popupCheckInterval);
            this.popupCheckInterval = null;
          }
          if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.close();
          }
          window.removeEventListener('message', messageListener);
          resolve(false);
        }, 60000);
      } catch (error) {
        console.error('Failed to request access token:', error);
        Sentry.captureException(error, {
          tags: { component: 'google-calendar-signin' },
          extra: { currentOrigin: window.location.origin },
        });
        this.authInProgress = false;
        resolve(false);
      }
    });
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      Sentry.addBreadcrumb({
        message: 'Starting Google Calendar sign-out',
        category: 'calendar',
        level: 'info',
      });

      const token = this.gapi.client.getToken();
      if (token && token.access_token) {
        // Revoke the access token
        window.google.accounts.oauth2.revoke(token.access_token);
        
        // Clear the token from gapi client
        this.gapi.client.setToken(null);
      }
      
      // Clear stored session
      localStorage.removeItem('google_calendar_token');
      
      this.isSignedIn = false;
      console.log('Google Calendar signed out successfully');
    } catch (error) {
      console.error('Google sign-out failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-signout' },
      });
    }
  }

  isConnected(): boolean {
    if (!this.isInitialized) return false;
    
    // Check if we have a valid access token
    const token = this.gapi?.client?.getToken();
    const hasValidToken = this.isSignedIn && token && token.access_token;
    
    // Also check stored session if not currently connected
    if (!hasValidToken && this.gapi?.client) {
      return this.loadStoredToken();
    }
    
    return hasValidToken;
  }

  async checkAvailability(date: string, participants: string[], preferredTime?: string): Promise<AvailabilityResponse> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Checking calendar availability',
        category: 'calendar',
        level: 'info',
        data: { date, participantCount: participants.length, preferredTime },
      });

      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      // Get busy times from primary calendar
      const response = await this.gapi.client.calendar.freebusy.query({
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: 'primary' }]
      });

      const busyTimes = response.result.calendars.primary.busy || [];
      
      // Generate available time slots
      const availableSlots = this.generateAvailableSlots(date, busyTimes);
      const suggestedTimes = this.generateSuggestedTimesWithPreference(availableSlots, preferredTime);

      return {
        date,
        slots: availableSlots,
        suggestedTimes
      };
    } catch (error) {
      console.error('Failed to check availability:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-availability' },
        extra: { date, participantCount: participants.length, preferredTime },
      });
      throw new Error('Failed to check calendar availability');
    }
  }

  private generateSuggestedTimesWithPreference(availableSlots: any[], preferredTime?: string): string[] {
    const suggestions: string[] = [];
    
    // First, check if the preferred time from AI parsing is available
    if (preferredTime) {
      const extractedTime = this.extractTimeFromDateTime(preferredTime);
      if (extractedTime) {
        const isPreferredAvailable = availableSlots.some(slot => 
          slot.start === extractedTime || 
          this.isTimeWithinSlot(extractedTime, slot)
        );
        
        if (isPreferredAvailable) {
          console.log(`✨ Preferred time ${extractedTime} is available! Adding as first suggestion.`);
          suggestions.push(extractedTime);
        }
      }
    }
    
    // Add other available times, avoiding duplicates
    for (const slot of availableSlots) {
      if (!suggestions.includes(slot.start)) {
        suggestions.push(slot.start);
      }
      if (suggestions.length >= 4) break; // Limit to 4 suggestions
    }
    
    return suggestions;
  }

  private extractTimeFromDateTime(datetime: string): string | null {
    try {
      // Handle various datetime formats and extract time
      console.log('🕐 Extracting time from:', datetime);
      
      // Pattern 1: "May 30, 2024 at 11:30 AM GMT+3"
      const timePattern1 = /at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
      const match1 = datetime.match(timePattern1);
      if (match1) {
        let hour = parseInt(match1[1]);
        const minute = match1[2];
        const ampm = match1[3]?.toUpperCase();
        
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
        console.log('🕐 Extracted time (pattern 1):', timeString);
        return timeString;
      }
      
      // Pattern 2: "June 30, 2025 Time: 4:00 PM"
      const timePattern2 = /Time:\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
      const match2 = datetime.match(timePattern2);
      if (match2) {
        let hour = parseInt(match2[1]);
        const minute = match2[2];
        const ampm = match2[3]?.toUpperCase();
        
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
        console.log('🕐 Extracted time (pattern 2):', timeString);
        return timeString;
      }
      
      // Pattern 3: Try to parse as ISO date
      const isoMatch = datetime.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
      if (isoMatch) {
        const date = new Date(isoMatch[1]);
        if (!isNaN(date.getTime())) {
          const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          console.log('🕐 Extracted time (ISO):', timeString);
          return timeString;
        }
      }
      
      // Pattern 4: Simple time patterns like "14:30" or "2:30 PM"
      const simpleTimePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
      const simpleMatch = datetime.match(simpleTimePattern);
      if (simpleMatch) {
        let hour = parseInt(simpleMatch[1]);
        const minute = simpleMatch[2];
        const ampm = simpleMatch[3]?.toUpperCase();
        
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
        console.log('🕐 Extracted time (simple):', timeString);
        return timeString;
      }
      
      console.log('⚠️ Could not extract time from:', datetime);
      return null;
    } catch (error) {
      console.error('❌ Error extracting time:', error);
      return null;
    }
  }

  private isTimeWithinSlot(time: string, slot: any): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const slotStart = this.timeToMinutes(slot.start);
    const slotEnd = this.timeToMinutes(slot.end);
    
    return timeMinutes >= slotStart && timeMinutes < slotEnd;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async scheduleEvent(request: ScheduleRequest): Promise<CalendarEvent> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Scheduling calendar event',
        category: 'calendar',
        level: 'info',
        data: { title: request.title, attendeeCount: request.attendees.length },
      });

      const event = {
        summary: request.title,
        description: request.description,
        location: request.location,
        start: {
          dateTime: request.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: request.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: request.attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 15 }
          ]
        }
      };

      const response = await this.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all'
      });

      const createdEvent = response.result;
      
      Sentry.addBreadcrumb({
        message: 'Calendar event scheduled successfully',
        category: 'calendar',
        level: 'info',
        data: { eventId: createdEvent.id },
      });
      
      return {
        id: createdEvent.id,
        title: createdEvent.summary,
        start: createdEvent.start.dateTime,
        end: createdEvent.end.dateTime,
        attendees: request.attendees,
        location: createdEvent.location,
        description: createdEvent.description,
        status: 'confirmed'
      };
    } catch (error) {
      console.error('Failed to create event:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-schedule' },
        extra: { title: request.title, attendeeCount: request.attendees.length },
      });
      throw new Error('Failed to schedule meeting');
    }
  }

  async searchEvents(query: string, participants: string[]): Promise<EventSearchResult> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Searching calendar events',
        category: 'calendar',
        level: 'info',
        data: { query, participantCount: participants.length },
      });

      // Search for events in the past 30 days and next 30 days
      const now = new Date();
      const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await this.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: pastDate.toISOString(),
        timeMax: futureDate.toISOString(),
        q: query,
        maxResults: 20,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.result.items || [];
      
      // Convert to our CalendarEvent format
      const calendarEvents: CalendarEvent[] = events
        .filter((event: any) => event.start && event.start.dateTime)
        .map((event: any) => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          start: event.start.dateTime,
          end: event.end.dateTime,
          attendees: (event.attendees || []).map((attendee: any) => attendee.email).filter(Boolean),
          location: event.location,
          description: event.description,
          status: event.status === 'cancelled' ? 'cancelled' : 'confirmed'
        }));

      // Find best match
      let bestMatch: CalendarEvent | undefined;
      let highestConfidence = 0;

      for (const event of calendarEvents) {
        let confidence = 0;
        
        // Title similarity
        if (event.title.toLowerCase().includes(query.toLowerCase())) {
          confidence += 0.4;
        }
        
        // Attendee match
        const attendeeMatches = participants.filter(participant => 
          event.attendees.some(attendee => 
            attendee.toLowerCase().includes(participant.toLowerCase())
          )
        ).length;
        confidence += (attendeeMatches / Math.max(participants.length, 1)) * 0.4;
        
        // Recent events get higher priority
        const eventDate = new Date(event.start);
        const daysDiff = Math.abs((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) confidence += 0.2;
        
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = event;
        }
      }

      return {
        events: calendarEvents,
        matchedEvent: bestMatch,
        confidence: highestConfidence
      };
    } catch (error) {
      console.error('Failed to search events:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-search' },
        extra: { query, participantCount: participants.length },
      });
      throw new Error('Failed to search calendar events');
    }
  }

  async rescheduleEvent(request: RescheduleRequest): Promise<CalendarEvent> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Rescheduling calendar event',
        category: 'calendar',
        level: 'info',
        data: { eventId: request.eventId },
      });

      // Get the existing event
      const eventResponse = await this.gapi.client.calendar.events.get({
        calendarId: 'primary',
        eventId: request.eventId
      });

      const existingEvent = eventResponse.result;
      
      // Update the event
      const updatedEvent = {
        ...existingEvent,
        start: {
          dateTime: request.newStart,
          timeZone: existingEvent.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: request.newEnd,
          timeZone: existingEvent.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        description: `${existingEvent.description || ''}\n\nRescheduled: ${request.reason || 'Time changed'}`
      };

      const response = await this.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: request.eventId,
        resource: updatedEvent,
        sendUpdates: 'all'
      });

      const result = response.result;
      
      return {
        id: result.id,
        title: result.summary,
        start: result.start.dateTime,
        end: result.end.dateTime,
        attendees: (result.attendees || []).map((attendee: any) => attendee.email).filter(Boolean),
        location: result.location,
        description: result.description,
        status: 'confirmed'
      };
    } catch (error) {
      console.error('Failed to reschedule event:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-reschedule' },
        extra: { eventId: request.eventId },
      });
      throw new Error('Failed to reschedule meeting');
    }
  }

  async cancelEvent(eventId: string, reason?: string): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Cancelling calendar event',
        category: 'calendar',
        level: 'info',
        data: { eventId },
      });

      // Get the existing event to update description
      const eventResponse = await this.gapi.client.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      const existingEvent = eventResponse.result;
      
      // Update event with cancellation reason and cancel it
      const updatedEvent = {
        ...existingEvent,
        status: 'cancelled',
        description: `${existingEvent.description || ''}\n\nCancelled: ${reason || 'Meeting cancelled'}`
      };

      await this.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: updatedEvent,
        sendUpdates: 'all'
      });

      return true;
    } catch (error) {
      console.error('Failed to cancel event:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-cancel' },
        extra: { eventId },
      });
      return false;
    }
  }

  async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
      const response = await this.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate).toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.result.items || [];
      
      return events
        .filter((event: any) => event.start && event.start.dateTime && event.status !== 'cancelled')
        .map((event: any) => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          start: event.start.dateTime,
          end: event.end.dateTime,
          attendees: (event.attendees || []).map((attendee: any) => attendee.email).filter(Boolean),
          location: event.location,
          description: event.description,
          status: 'confirmed'
        }));
    } catch (error) {
      console.error('Failed to get events:', error);
      Sentry.captureException(error, {
        tags: { component: 'google-calendar-events' },
        extra: { startDate, endDate },
      });
      throw new Error('Failed to retrieve calendar events');
    }
  }

  private generateAvailableSlots(date: string, busyTimes: any[]): any[] {
    const slots = [];
    const startDate = new Date(date);
    
    // Business hours: 9 AM to 5 PM
    for (let hour = 9; hour < 17; hour++) {
      const slotStart = new Date(startDate);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(startDate);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      // Check if this slot conflicts with busy times
      const isAvailable = !busyTimes.some((busy: any) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
      
      slots.push({
        start: slotStart.toTimeString().slice(0, 5),
        end: slotEnd.toTimeString().slice(0, 5),
        available: isAvailable
      });
    }
    
    return slots.filter(slot => slot.available);
  }

  async sendCalendarInvite(event: CalendarEvent): Promise<boolean> {
    // Calendar invites are automatically sent when creating/updating events with sendUpdates: 'all'
    console.log('Calendar invite sent automatically for:', event.title);
    return true;
  }

  async sendRescheduleNotification(event: CalendarEvent): Promise<boolean> {
    // Notifications are automatically sent when updating events with sendUpdates: 'all'
    console.log('Reschedule notification sent automatically for:', event.title);
    return true;
  }

  async sendCancellationNotification(event: CalendarEvent): Promise<boolean> {
    // Notifications are automatically sent when cancelling events with sendUpdates: 'all'
    console.log('Cancellation notification sent automatically for:', event.title);
    return true;
  }
}

export const googleCalendarService = new GoogleCalendarService();