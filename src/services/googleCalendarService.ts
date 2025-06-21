import { CalendarProvider, AvailabilityResponse, CalendarEvent, ScheduleRequest, EventSearchResult, RescheduleRequest } from '../types/calendar';
import { getGoogleConfig, isGoogleConfigured } from '../config/google';

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

  async initialize(): Promise<boolean> {
    if (!isGoogleConfigured()) {
      console.warn('Google Calendar API not configured');
      return false;
    }

    try {
      // Load Google API script
      await this.loadGoogleAPI();
      
      const config = getGoogleConfig();
      
      // Initialize gapi
      await new Promise((resolve) => {
        window.gapi.load('client:auth2', resolve);
      });

      // Initialize the client
      await window.gapi.client.init({
        apiKey: config.apiKey,
        clientId: config.clientId,
        discoveryDocs: config.discoveryDocs,
        scope: config.scopes.join(' ')
      });

      this.gapi = window.gapi;
      this.isInitialized = true;
      
      // Check if user is already signed in
      const authInstance = this.gapi.auth2.getAuthInstance();
      this.isSignedIn = authInstance.isSignedIn.get();
      
      console.log('Google Calendar API initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar API:', error);
      return false;
    }
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      this.isSignedIn = true;
      return true;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isSignedIn = false;
    } catch (error) {
      console.error('Google sign-out failed:', error);
    }
  }

  isConnected(): boolean {
    return this.isInitialized && this.isSignedIn;
  }

  async checkAvailability(date: string, participants: string[]): Promise<AvailabilityResponse> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
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
      const suggestedTimes = availableSlots.slice(0, 4).map(slot => slot.start);

      return {
        date,
        slots: availableSlots,
        suggestedTimes
      };
    } catch (error) {
      console.error('Failed to check availability:', error);
      throw new Error('Failed to check calendar availability');
    }
  }

  async scheduleEvent(request: ScheduleRequest): Promise<CalendarEvent> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
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
      throw new Error('Failed to schedule meeting');
    }
  }

  async searchEvents(query: string, participants: string[]): Promise<EventSearchResult> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
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
      throw new Error('Failed to search calendar events');
    }
  }

  async rescheduleEvent(request: RescheduleRequest): Promise<CalendarEvent> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
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
      throw new Error('Failed to reschedule meeting');
    }
  }

  async cancelEvent(eventId: string, reason?: string): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Google Calendar not connected');
    }

    try {
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