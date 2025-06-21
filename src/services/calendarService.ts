import { CalendarProvider, AvailabilityResponse, CalendarEvent, ScheduleRequest, TimeSlot, EventSearchResult, RescheduleRequest } from '../types/calendar';
import { googleCalendarService } from './googleCalendarService';
import { isGoogleConfigured } from '../config/google';

class CalendarService {
  private providers: CalendarProvider[] = [
    { id: 'google', name: 'Google Calendar', icon: '📅', connected: false },
    { id: 'outlook', name: 'Microsoft Outlook', icon: '📆', connected: false },
    { id: 'apple', name: 'Apple Calendar', icon: '🍎', connected: false }
  ];

  private mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Team Standup',
      start: '2024-01-15T09:00:00',
      end: '2024-01-15T09:30:00',
      attendees: ['team@company.com'],
      status: 'confirmed'
    },
    {
      id: '2',
      title: 'Meeting with John Smith - TechCorp Inc.',
      start: '2024-01-15T14:00:00',
      end: '2024-01-15T15:00:00',
      attendees: ['john.smith@example.com', 'sarah.johnson@example.com'],
      status: 'confirmed',
      description: 'Scheduled meeting with John Smith from TechCorp Inc.'
    },
    {
      id: '3',
      title: 'Client Call with Sarah Johnson',
      start: '2024-01-16T11:00:00',
      end: '2024-01-16T12:00:00',
      attendees: ['sarah.johnson@example.com'],
      status: 'confirmed'
    },
    {
      id: '4',
      title: 'Project Review Meeting',
      start: '2024-01-17T10:00:00',
      end: '2024-01-17T11:30:00',
      attendees: ['team@company.com', 'manager@company.com'],
      status: 'confirmed'
    }
  ];

  constructor() {
    // Initialize Google Calendar if configured
    if (isGoogleConfigured()) {
      googleCalendarService.initialize().then((success) => {
        if (success) {
          console.log('Google Calendar service initialized');
        }
      });
    }
  }

  getProviders(): CalendarProvider[] {
    // Update Google provider status
    const googleProvider = this.providers.find(p => p.id === 'google');
    if (googleProvider) {
      googleProvider.connected = googleCalendarService.isConnected();
    }
    
    return this.providers;
  }

  async connectProvider(providerId: string): Promise<boolean> {
    if (providerId === 'google') {
      if (!isGoogleConfigured()) {
        throw new Error('Google Calendar API not configured. Please add your Google API credentials to environment variables.');
      }
      
      const success = await googleCalendarService.signIn();
      if (success) {
        const provider = this.providers.find(p => p.id === 'google');
        if (provider) provider.connected = true;
      }
      return success;
    }
    
    // For other providers, simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      provider.connected = true;
      return true;
    }
    return false;
  }

  async disconnectProvider(providerId: string): Promise<boolean> {
    if (providerId === 'google') {
      await googleCalendarService.signOut();
      const provider = this.providers.find(p => p.id === 'google');
      if (provider) provider.connected = false;
      return true;
    }
    
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      provider.connected = false;
      return true;
    }
    return false;
  }

  async checkAvailability(date: string, participants: string[]): Promise<AvailabilityResponse> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      try {
        return await googleCalendarService.checkAvailability(date, participants);
      } catch (error) {
        console.error('Google Calendar availability check failed, falling back to mock:', error);
      }
    }
    
    // Fallback to mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const businessHours = this.generateBusinessHours();
    const busySlots = this.getBusySlots(date);
    
    const availableSlots = businessHours.filter(slot => 
      !busySlots.some(busy => this.slotsOverlap(slot, busy))
    );

    const suggestedTimes = this.generateSuggestedTimes(availableSlots);

    return {
      date,
      slots: [...availableSlots, ...busySlots],
      suggestedTimes
    };
  }

  async scheduleEvent(request: ScheduleRequest): Promise<CalendarEvent> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      try {
        const event = await googleCalendarService.scheduleEvent(request);
        return event;
      } catch (error) {
        console.error('Google Calendar scheduling failed, falling back to mock:', error);
      }
    }
    
    // Fallback to mock implementation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: request.title,
      start: request.start,
      end: request.end,
      attendees: request.attendees,
      location: request.location,
      description: request.description,
      status: 'confirmed'
    };

    this.mockEvents.push(newEvent);
    return newEvent;
  }

  async searchEvents(query: string, participants: string[]): Promise<EventSearchResult> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      try {
        return await googleCalendarService.searchEvents(query, participants);
      } catch (error) {
        console.error('Google Calendar search failed, falling back to mock:', error);
      }
    }
    
    // Fallback to mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const queryLower = query.toLowerCase();
    const relevantEvents = this.mockEvents.filter(event => {
      const titleMatch = event.title.toLowerCase().includes(queryLower);
      const attendeeMatch = participants.some(participant => 
        event.attendees.some(attendee => 
          attendee.toLowerCase().includes(participant.toLowerCase()) ||
          participant.toLowerCase().includes(attendee.toLowerCase())
        )
      );
      const descriptionMatch = event.description?.toLowerCase().includes(queryLower);
      
      return (titleMatch || attendeeMatch || descriptionMatch) && event.status !== 'cancelled';
    });

    let bestMatch: CalendarEvent | undefined;
    let highestConfidence = 0;

    for (const event of relevantEvents) {
      let confidence = 0;
      
      if (event.title.toLowerCase().includes(queryLower)) confidence += 0.4;
      
      const attendeeMatches = participants.filter(participant => 
        event.attendees.some(attendee => 
          attendee.toLowerCase().includes(participant.toLowerCase())
        )
      ).length;
      confidence += (attendeeMatches / Math.max(participants.length, 1)) * 0.4;
      
      const eventDate = new Date(event.start);
      const now = new Date();
      const daysDiff = Math.abs((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) confidence += 0.2;
      
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = event;
      }
    }

    return {
      events: relevantEvents,
      matchedEvent: bestMatch,
      confidence: highestConfidence
    };
  }

  async rescheduleEvent(request: RescheduleRequest): Promise<CalendarEvent> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      try {
        return await googleCalendarService.rescheduleEvent(request);
      } catch (error) {
        console.error('Google Calendar reschedule failed, falling back to mock:', error);
      }
    }
    
    // Fallback to mock implementation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const eventIndex = this.mockEvents.findIndex(e => e.id === request.eventId);
    if (eventIndex === -1) {
      throw new Error('Event not found');
    }

    const event = this.mockEvents[eventIndex];
    const updatedEvent: CalendarEvent = {
      ...event,
      start: request.newStart,
      end: request.newEnd,
      description: `${event.description || ''}\n\nRescheduled: ${request.reason || 'Time changed'}`
    };

    this.mockEvents[eventIndex] = updatedEvent;
    return updatedEvent;
  }

  async cancelEvent(eventId: string, reason?: string): Promise<boolean> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      try {
        return await googleCalendarService.cancelEvent(eventId, reason);
      } catch (error) {
        console.error('Google Calendar cancellation failed, falling back to mock:', error);
      }
    }
    
    // Fallback to mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const eventIndex = this.mockEvents.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      return false;
    }

    const event = this.mockEvents[eventIndex];
    this.mockEvents[eventIndex] = {
      ...event,
      status: 'cancelled',
      description: `${event.description || ''}\n\nCancelled: ${reason || 'Meeting cancelled'}`
    };

    return true;
  }

  async getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      try {
        return await googleCalendarService.getEvents(startDate, endDate);
      } catch (error) {
        console.error('Google Calendar events fetch failed, falling back to mock:', error);
      }
    }
    
    // Fallback to mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return this.mockEvents.filter(event => {
      const eventDate = new Date(event.start);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return eventDate >= start && eventDate <= end && event.status !== 'cancelled';
    });
  }

  // Helper methods for mock implementation
  private generateBusinessHours(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push({
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 1).toString().padStart(2, '0')}:00`,
        available: true
      });
    }
    return slots;
  }

  private getBusySlots(date: string): TimeSlot[] {
    return [
      { start: '09:00', end: '09:30', available: false },
      { start: '11:00', end: '12:00', available: false },
      { start: '12:00', end: '13:00', available: false }
    ];
  }

  private slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    const start1 = this.timeToMinutes(slot1.start);
    const end1 = this.timeToMinutes(slot1.end);
    const start2 = this.timeToMinutes(slot2.start);
    const end2 = this.timeToMinutes(slot2.end);

    return start1 < end2 && start2 < end1;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private generateSuggestedTimes(availableSlots: TimeSlot[]): string[] {
    return availableSlots
      .slice(0, 3)
      .map(slot => slot.start);
  }

  async sendCalendarInvite(event: CalendarEvent): Promise<boolean> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      return await googleCalendarService.sendCalendarInvite(event);
    }
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Calendar invite sent for:', event.title);
    return true;
  }

  async sendRescheduleNotification(event: CalendarEvent): Promise<boolean> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      return await googleCalendarService.sendRescheduleNotification(event);
    }
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Reschedule notification sent for:', event.title);
    return true;
  }

  async sendCancellationNotification(event: CalendarEvent): Promise<boolean> {
    const googleProvider = this.providers.find(p => p.id === 'google');
    
    if (googleProvider?.connected && googleCalendarService.isConnected()) {
      return await googleCalendarService.sendCancellationNotification(event);
    }
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Cancellation notification sent for:', event.title);
    return true;
  }
}

export const calendarService = new CalendarService();