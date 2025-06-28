export interface CalendarProvider {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;
  slots: TimeSlot[];
  suggestedTimes: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  location?: string;
  description?: string;
  status?: 'confirmed' | 'cancelled' | 'tentative';
}

export interface ScheduleRequest {
  title: string;
  start: string;
  end: string;
  attendees: string[];
  description?: string;
  location?: string;
}

export interface EventSearchResult {
  events: CalendarEvent[];
  matchedEvent?: CalendarEvent;
  confidence: number;
}

export interface RescheduleRequest {
  eventId: string;
  newStart: string;
  newEnd: string;
  reason?: string;
}

export interface CalendarIntegration {
  checkAvailability: (date: string, participants: string[], preferredTime?: string) => Promise<AvailabilityResponse>;
  scheduleEvent: (request: ScheduleRequest) => Promise<CalendarEvent>;
  getEvents: (startDate: string, endDate: string) => Promise<CalendarEvent[]>;
  searchEvents: (query: string, participants: string[]) => Promise<EventSearchResult>;
  rescheduleEvent: (request: RescheduleRequest) => Promise<CalendarEvent>;
  cancelEvent: (eventId: string, reason?: string) => Promise<boolean>;
}