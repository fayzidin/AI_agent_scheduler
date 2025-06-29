export interface CalendarEventData {
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  description?: string;
  location?: string;
  attendees?: string[];
  organizer?: string;
}

export class CalendarFileGenerator {
  /**
   * Generate .ics file content (iCalendar format)
   * Compatible with: Google Calendar, Outlook, Apple Calendar, etc.
   */
  static generateICS(event: CalendarEventData): string {
    const formatDateTime = (dateString: string): string => {
      return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@aimeetingassistant.com`;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AI Meeting Assistant//Calendar Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatDateTime(event.start)}`,
      `DTEND:${formatDateTime(event.end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `CREATED:${now}`,
      `LAST-MODIFIED:${now}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'TRANSP:OPAQUE'
    ];

    // Add description if provided
    if (event.description) {
      icsContent.push(`DESCRIPTION:${escapeText(event.description)}`);
    }

    // Add location if provided
    if (event.location) {
      icsContent.push(`LOCATION:${escapeText(event.location)}`);
    }

    // Add organizer if provided
    if (event.organizer) {
      icsContent.push(`ORGANIZER;CN=${escapeText(event.organizer)}:mailto:${event.organizer}`);
    }

    // Add attendees if provided
    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach(attendee => {
        icsContent.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee}`);
      });
    }

    // Add reminders
    icsContent.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeText(event.title)}`,
      'END:VALARM'
    );

    icsContent.push('END:VEVENT', 'END:VCALENDAR');

    return icsContent.join('\r\n');
  }

  /**
   * Generate .vcs file content (vCalendar format)
   * Compatible with: Older Outlook versions, some mobile apps
   */
  static generateVCS(event: CalendarEventData): string {
    const formatDateTime = (dateString: string): string => {
      return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };

    let vcsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:1.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDateTime(event.start)}`,
      `DTEND:${formatDateTime(event.end)}`,
      `SUMMARY:${escapeText(event.title)}`
    ];

    // Add description if provided
    if (event.description) {
      vcsContent.push(`DESCRIPTION:${escapeText(event.description)}`);
    }

    // Add location if provided
    if (event.location) {
      vcsContent.push(`LOCATION:${escapeText(event.location)}`);
    }

    vcsContent.push('END:VEVENT', 'END:VCALENDAR');

    return vcsContent.join('\r\n');
  }

  /**
   * Download .ics file
   */
  static downloadICS(event: CalendarEventData, filename?: string): void {
    const icsContent = this.generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    
    const defaultFilename = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date(event.start).toISOString().split('T')[0]}.ics`;
    const finalFilename = filename || defaultFilename;
    
    this.downloadFile(blob, finalFilename);
  }

  /**
   * Download .vcs file
   */
  static downloadVCS(event: CalendarEventData, filename?: string): void {
    const vcsContent = this.generateVCS(event);
    const blob = new Blob([vcsContent], { type: 'text/x-vCalendar;charset=utf-8' });
    
    const defaultFilename = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date(event.start).toISOString().split('T')[0]}.vcs`;
    const finalFilename = filename || defaultFilename;
    
    this.downloadFile(blob, finalFilename);
  }

  /**
   * Generate Google Calendar URL for quick add
   */
  static generateGoogleCalendarURL(event: CalendarEventData): string {
    const formatGoogleDateTime = (dateString: string): string => {
      return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatGoogleDateTime(event.start)}/${formatGoogleDateTime(event.end)}`,
    });

    if (event.description) {
      params.append('details', event.description);
    }

    if (event.location) {
      params.append('location', event.location);
    }

    if (event.attendees && event.attendees.length > 0) {
      params.append('add', event.attendees.join(','));
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate Outlook Web URL for quick add
   */
  static generateOutlookURL(event: CalendarEventData): string {
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.title,
      startdt: new Date(event.start).toISOString(),
      enddt: new Date(event.end).toISOString(),
    });

    if (event.description) {
      params.append('body', event.description);
    }

    if (event.location) {
      params.append('location', event.location);
    }

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  /**
   * Generate Yahoo Calendar URL for quick add
   */
  static generateYahooURL(event: CalendarEventData): string {
    const formatYahooDateTime = (dateString: string): string => {
      return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      v: '60',
      title: event.title,
      st: formatYahooDateTime(event.start),
      et: formatYahooDateTime(event.end),
    });

    if (event.description) {
      params.append('desc', event.description);
    }

    if (event.location) {
      params.append('in_loc', event.location);
    }

    return `https://calendar.yahoo.com/?${params.toString()}`;
  }

  /**
   * Helper method to download files
   */
  private static downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  }

  /**
   * Get all available export options for an event
   */
  static getExportOptions(event: CalendarEventData) {
    return {
      downloadICS: () => this.downloadICS(event),
      downloadVCS: () => this.downloadVCS(event),
      googleCalendarURL: this.generateGoogleCalendarURL(event),
      outlookURL: this.generateOutlookURL(event),
      yahooURL: this.generateYahooURL(event),
      icsContent: this.generateICS(event),
      vcsContent: this.generateVCS(event)
    };
  }
}