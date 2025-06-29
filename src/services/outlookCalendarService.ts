import { CalendarProvider, AvailabilityResponse, CalendarEvent, ScheduleRequest, EventSearchResult, RescheduleRequest } from '../types/calendar';
import { getOutlookConfig, isOutlookConfigured } from '../config/outlook';
import * as Sentry from '@sentry/react';

class OutlookCalendarService {
  private msalInstance: any = null;
  private isInitialized = false;
  private isSignedIn = false;
  private accessToken: string = '';

  async initialize(): Promise<boolean> {
    if (!isOutlookConfigured()) {
      console.warn('Outlook Calendar API not configured');
      return false;
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Starting Outlook Calendar initialization',
        category: 'calendar',
        level: 'info',
      });

      // Load MSAL library with improved error handling and retries
      await this.loadMSALWithRetry();
      
      const config = getOutlookConfig();
      
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
      
      // Check if we already have a valid token
      const existingToken = this.loadStoredToken();
      this.isSignedIn = !!existingToken;
      
      console.log('Outlook Calendar API initialized successfully');
      
      Sentry.addBreadcrumb({
        message: 'Outlook Calendar API initialized successfully',
        category: 'calendar',
        level: 'info',
        data: { 
          hasExistingToken: !!existingToken,
          currentOrigin: window.location.origin 
        },
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Outlook Calendar API:', error);
      Sentry.captureException(error, {
        tags: { component: 'outlook-calendar-init' },
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
      const storedToken = sessionStorage.getItem('outlook_calendar_token');
      if (!storedToken) return false;

      const tokenInfo = JSON.parse(storedToken);
      
      // Check if token is still valid (with 5 minute buffer)
      if (tokenInfo.expires_at && Date.now() < (tokenInfo.expires_at - 5 * 60 * 1000)) {
        this.accessToken = tokenInfo.access_token;
        this.isSignedIn = true;
        console.log('Restored Outlook Calendar session from storage');
        return true;
      } else {
        // Token expired, remove it
        sessionStorage.removeItem('outlook_calendar_token');
        return false;
      }
    } catch (error) {
      console.warn('Failed to load stored token:', error);
      sessionStorage.removeItem('outlook_calendar_token');
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
      sessionStorage.setItem('outlook_calendar_token', JSON.stringify(tokenInfo));
    } catch (error) {
      console.warn('Failed to store token info:', error);
    }
  }

  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Outlook API');
      }
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
      
      this.storeTokenInfo(response);
      
      console.log('✅ Silent Outlook Calendar auth successful!');
      
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

      console.log('Requesting Outlook access token with interactive login...');

      Sentry.addBreadcrumb({
        message: 'Starting interactive Outlook sign-in',
        category: 'outlook',
        level: 'info',
        data: { currentOrigin: window.location.origin },
      });

      const response = await this.msalInstance.loginPopup(loginRequest);
      
      this.accessToken = response.accessToken;
      this.isSignedIn = true;
      
      this.storeTokenInfo(response);
      
      console.log('Interactive Outlook authentication successful!');
      
      Sentry.addBreadcrumb({
        message: 'Interactive Outlook sign-in successful',
        category: 'outlook',
        level: 'info',
      });
      
      return true;
    } catch (error: any) {
      console.error('Interactive Outlook auth failed:', error);
      
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
    if (!this.isInitialized) return;

    try {
      Sentry.addBreadcrumb({
        message: 'Starting Outlook Calendar sign-out',
        category: 'calendar',
        level: 'info',
      });

      if (this.msalInstance) {
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          await this.msalInstance.logoutPopup({ account: accounts[0] });
        }
      }
      
      // Clear stored session
      sessionStorage.removeItem('outlook_calendar_token');
      
      this.isSignedIn = false;
      this.accessToken = '';
      console.log('Outlook Calendar signed out successfully');
    } catch (error) {
      console.error('Outlook sign-out failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'outlook-calendar-signout' },
      });
    }
  }

  isConnected(): boolean {
    if (!this.isInitialized) return false;
    
    // Check if we have a valid access token
    const hasValidToken = this.isSignedIn && this.accessToken;
    
    // Also check stored session if not currently connected
    if (!hasValidToken) {
      return this.loadStoredToken();
    }
    
    return hasValidToken;
  }

  async checkAvailability(date: string, participants: string[], preferredTime?: string): Promise<AvailabilityResponse> {
    if (!this.isConnected()) {
      throw new Error('Outlook Calendar not connected');
    }

    try {
      Sentry.addBreadcrumb({
        message: 'Checking Outlook calendar availability',
        category: 'calendar',
        level: 'info',
        data: { date, participantCount: participants.length, preferredTime },
      });

      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      // Get free/busy information
      const freeBusyRequest = {
        schedules: ['me@outlook.com'], // Can be expanded to include participants
        startTime: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        endTime: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        availabilityViewInterval: 60
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(freeBusyRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const busyTimes = data.value?.[0]?.busyTimes || [];
      
      // Generate available time slots
      const availableSlots = this.generateAvailableSlots(date, busyTimes);
      const suggestedTimes = this.generateSuggestedTimesWithPreference(availableSlots, preferredTime);

      return {
        date,
        slots: availableSlots,
        suggestedTimes
      };
    } catch (error) {
      console.error('Failed to check Outlook availability:', error);
      Sentry.captureException(error, {
        tags: { component: 'outlook-calendar-availability' },
        extra: { date, participantCount: participants.length, preferredTime },
      });
      throw new Error('Failed to check calendar availability');
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
        const busyStart = new Date(busy.start.dateTime);
        const busyEnd = new Date(busy.end.dateTime);
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
      if (suggestions.length >= 4) break;
    }
    
    return suggestions;
  }

  private extractTimeFromDateTime(datetime: string): string | null {
    try {
      // Same time extraction logic as Google Calendar service
      const timePattern1 = /at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
      const match1 = datetime.match(timePattern1);
      if (match1) {
        let hour = parseInt(match1[1]);
        const minute = match1[2];
        const ampm = match1[3]?.toUpperCase();
        
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        return `${hour.toString().padStart(2, '0')}:${minute}`;
      }
      
      const timePattern2 = /Time:\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
      const match2 = datetime.match(timePattern2);
      if (match2) {
        let hour = parseInt(match2[1]);
        const minute = match2[2];
        const ampm = match2[3]?.toUpperCase();
        
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        return `${hour.toString().padStart(2, '0')}:${minute}`;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting time:', error);
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
      throw new Error('Outlook Calendar not connected');
    }

    try {
      const event = {
        subject: request.title,
        body: {
          contentType: 'text',
          content: request.description || ''
        },
        start: {
          dateTime: request.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: request.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: {
          displayName: request.location || ''
        },
        attendees: request.attendees.map(email => ({
          emailAddress: {
            address: email,
            name: email.split('@')[0]
          }
        }))
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const createdEvent = await response.json();
      
      return {
        id: createdEvent.id,
        title: createdEvent.subject,
        start: createdEvent.start.dateTime,
        end: createdEvent.end.dateTime,
        attendees: request.attendees,
        location: createdEvent.location?.displayName,
        description: createdEvent.body?.content,
        status: 'confirmed'
      };
    } catch (error) {
      console.error('Failed to create Outlook event:', error);
      throw new Error('Failed to schedule meeting');
    }
  }

  // Additional methods for search, reschedule, cancel, etc. would follow the same pattern
  async searchEvents(query: string, participants: string[]): Promise<EventSearchResult> {
    // Implementation similar to Google Calendar service but using Microsoft Graph API
    return { events: [], confidence: 0 };
  }

  async rescheduleEvent(request: RescheduleRequest): Promise<CalendarEvent> {
    // Implementation for rescheduling events
    throw new Error('Not implemented yet');
  }

  async cancelEvent(eventId: string, reason?: string): Promise<boolean> {
    // Implementation for canceling events
    return false;
  }

  async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    // Implementation for getting events
    return [];
  }

  async sendCalendarInvite(event: CalendarEvent): Promise<boolean> {
    return true;
  }

  async sendRescheduleNotification(event: CalendarEvent): Promise<boolean> {
    return true;
  }

  async sendCancellationNotification(event: CalendarEvent): Promise<boolean> {
    return true;
  }
}

export const outlookCalendarService = new OutlookCalendarService();