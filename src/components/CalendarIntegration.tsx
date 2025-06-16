import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, CheckCircle, AlertCircle, Loader2, Send, ExternalLink } from 'lucide-react';
import { calendarService } from '../services/calendarService';
import { CalendarProvider, AvailabilityResponse, CalendarEvent } from '../types/calendar';
import CRMIntegration from './CRMIntegration';

interface CalendarIntegrationProps {
  parsedData: {
    contactName: string;
    email: string;
    company: string;
    datetime: string;
    participants: string[];
    intent: string;
  };
  onScheduled?: (event: CalendarEvent) => void;
  emailContent?: string;
}

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({ parsedData, onScheduled, emailContent }) => {
  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledEvent, setScheduledEvent] = useState<CalendarEvent | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    setProviders(calendarService.getProviders());
  }, []);

  useEffect(() => {
    // Extract and set the target date from parsed data
    const targetDate = extractDateFromParsedData(parsedData.datetime);
    setSelectedDate(targetDate);
    
    // Auto-trigger availability check if intent is schedule and we have a connected provider
    if (parsedData.intent === 'schedule_meeting' && hasConnectedProvider()) {
      handleCheckAvailability(targetDate);
    }
  }, [parsedData, providers]);

  const hasConnectedProvider = () => {
    return providers.some(p => p.connected);
  };

  const handleConnectProvider = async (providerId: string) => {
    setIsConnecting(providerId);
    try {
      const success = await calendarService.connectProvider(providerId);
      if (success) {
        setProviders(calendarService.getProviders());
      }
    } catch (error) {
      console.error('Failed to connect provider:', error);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnectProvider = async (providerId: string) => {
    try {
      await calendarService.disconnectProvider(providerId);
      setProviders(calendarService.getProviders());
    } catch (error) {
      console.error('Failed to disconnect provider:', error);
    }
  };

  const handleCheckAvailability = async (targetDate?: string) => {
    if (!hasConnectedProvider()) return;

    setIsCheckingAvailability(true);
    try {
      const dateToCheck = targetDate || selectedDate;
      const result = await calendarService.checkAvailability(dateToCheck, parsedData.participants);
      setAvailability(result);
      
      // Auto-select first suggested time
      if (result.suggestedTimes.length > 0) {
        setSelectedTime(result.suggestedTimes[0]);
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!selectedTime || !hasConnectedProvider() || !selectedDate) return;

    setIsScheduling(true);
    try {
      // Create proper ISO datetime string
      const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + meetingDuration * 60000);

      const scheduleRequest = {
        title: `Meeting with ${parsedData.contactName} - ${parsedData.company}`,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        attendees: parsedData.participants,
        description: `Scheduled meeting with ${parsedData.contactName} from ${parsedData.company}`,
        location: 'Video Conference'
      };

      const event = await calendarService.scheduleEvent(scheduleRequest);
      setScheduledEvent(event);
      
      // Send calendar invites
      await calendarService.sendCalendarInvite(event);
      
      if (onScheduled) {
        onScheduled(event);
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const extractDateFromParsedData = (datetime: string): string => {
    // Enhanced date extraction
    const datePatterns = [
      // ISO format: 2024-01-15
      /(\d{4}-\d{2}-\d{2})/,
      // US format: 01/15/2024 or 1/15/2024
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      // European format: 15/01/2024
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      // Month name formats: January 15, 2024 | Jan 15, 2024
      /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const match = datetime.match(pattern);
      if (match) {
        if (pattern.source.includes('January|February')) {
          // Handle month name format
          const monthNames = {
            'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
            'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
            'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
            'august': '08', 'aug': '08', 'september': '09', 'sep': '09',
            'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
            'december': '12', 'dec': '12'
          };
          
          const monthName = match[1].toLowerCase();
          const day = match[2].padStart(2, '0');
          const year = match[3];
          const month = monthNames[monthName as keyof typeof monthNames] || '01';
          
          return `${year}-${month}-${day}`;
        } else if (pattern.source.includes('\\d{4}-\\d{2}-\\d{2}')) {
          // Already in ISO format
          return match[1];
        } else {
          // Handle numeric formats
          const parts = match[0].split('/');
          if (parts.length === 3) {
            // Assume US format: MM/DD/YYYY
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
          }
        }
      }
    }
    
    // Handle relative dates
    if (datetime.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    } else if (datetime.toLowerCase().includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    
    // Fallback to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (parsedData.intent !== 'schedule_meeting') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
        <div className="flex items-center mb-8">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Calendar Integration
            </h3>
            <p className="text-blue-200">
              Auto-scheduling detected! Let's check availability and schedule this meeting.
            </p>
          </div>
        </div>

        {/* Target Date Display */}
        {selectedDate && (
          <div className="mb-8 bg-white/10 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-300">Target Date:</span>
                <p className="text-white font-semibold text-lg">{formatDate(selectedDate)}</p>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Change Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Calendar Providers */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Calendar Providers
          </h4>
          
          <div className="grid md:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  provider.connected
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-white/10 border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{provider.icon}</span>
                    <div>
                      <p className="text-white font-semibold">{provider.name}</p>
                      <p className={`text-sm ${provider.connected ? 'text-green-300' : 'text-slate-400'}`}>
                        {provider.connected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  
                  {provider.connected ? (
                    <button
                      onClick={() => handleDisconnectProvider(provider.id)}
                      className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-all duration-200"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectProvider(provider.id)}
                      disabled={isConnecting === provider.id}
                      className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50 flex items-center space-x-1"
                    >
                      {isConnecting === provider.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : null}
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Availability Check */}
        {hasConnectedProvider() && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Availability Check
              </h4>
              
              <button
                onClick={() => handleCheckAvailability()}
                disabled={isCheckingAvailability}
                className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
              >
                {isCheckingAvailability ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>Check Availability</span>
              </button>
            </div>

            {availability && (
              <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                <div className="mb-6">
                  <h5 className="text-white font-semibold mb-3">
                    Available times for {formatDate(availability.date)}:
                  </h5>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {availability.suggestedTimes.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          selectedTime === time
                            ? 'bg-blue-500/30 border-blue-400 text-blue-200'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                        }`}
                      >
                        {formatTime(time)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-indigo-200 mb-2">
                    Meeting Duration (minutes)
                  </label>
                  <select
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(Number(e.target.value))}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30} className="bg-slate-800">30 minutes</option>
                    <option value={60} className="bg-slate-800">1 hour</option>
                    <option value={90} className="bg-slate-800">1.5 hours</option>
                    <option value={120} className="bg-slate-800">2 hours</option>
                  </select>
                </div>

                {selectedTime && (
                  <button
                    onClick={handleScheduleMeeting}
                    disabled={isScheduling}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                  >
                    {isScheduling ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span>
                      {isScheduling ? 'Scheduling...' : `Schedule for ${formatDate(selectedDate)} at ${formatTime(selectedTime)}`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Event */}
        {scheduledEvent && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400 mr-4" />
              <div>
                <h4 className="text-xl font-bold text-green-300 mb-1">
                  Meeting Scheduled Successfully!
                </h4>
                <p className="text-green-200">
                  Calendar invites have been sent to all participants
                </p>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Event Title:</span>
                <span className="text-white font-semibold">{scheduledEvent.title}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Date & Time:</span>
                <span className="text-white font-semibold">
                  {new Date(scheduledEvent.start).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Duration:</span>
                <span className="text-white font-semibold">{meetingDuration} minutes</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Attendees:</span>
                <span className="text-white font-semibold">{scheduledEvent.attendees.length} people</span>
              </div>

              <div className="pt-3 border-t border-white/20">
                <button className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  <span>View in Calendar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Connected Providers */}
        {!hasConnectedProvider() && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 text-yellow-400 mr-3" />
              <div>
                <h4 className="text-lg font-semibold text-yellow-300 mb-1">
                  Connect a Calendar Provider
                </h4>
                <p className="text-yellow-200">
                  To check availability and schedule meetings automatically, please connect at least one calendar provider above.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CRM Integration - Auto-triggered after successful scheduling */}
      {scheduledEvent && (
        <CRMIntegration 
          parsedData={parsedData}
          meetingData={scheduledEvent}
          emailContent={emailContent}
          onContactSynced={(response) => {
            console.log('Contact synced to CRM:', response);
          }}
        />
      )}
    </div>
  );
};

export default CalendarIntegration;