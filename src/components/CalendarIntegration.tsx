import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, CheckCircle, AlertCircle, Loader2, Send, ExternalLink, Settings, Zap, Link, Shield, Download } from 'lucide-react';
import { calendarService } from '../services/calendarService';
import { CalendarProvider, AvailabilityResponse, CalendarEvent } from '../types/calendar';
import { isGoogleConfigured } from '../config/google';
import { useAuth } from '../contexts/AuthContext';
import CRMIntegration from './CRMIntegration';
import CalendarExportOptions from './CalendarExportOptions';
import { CalendarEventData } from '../utils/calendarFileGenerator';

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
  const { user } = useAuth();
  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledEvent, setScheduledEvent] = useState<CalendarEvent | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string>('');
  const [showExportOptions, setShowExportOptions] = useState(false);

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
    if (!user) {
      setConnectionError('Please sign in to connect calendar providers');
      return;
    }

    setIsConnecting(providerId);
    setConnectionError('');
    
    try {
      console.log(`🔗 Connecting to ${providerId} calendar...`);
      
      // Show user-friendly message for Google Calendar
      if (providerId === 'google') {
        console.log('📅 Attempting silent authentication first (no popup)...');
      }
      
      const success = await calendarService.connectProvider(providerId);
      if (success) {
        setProviders(calendarService.getProviders());
        
        console.log(`✅ Successfully connected to ${providerId} calendar!`);
        
        // Auto-check availability after successful connection
        if (parsedData.intent === 'schedule_meeting' && selectedDate) {
          setTimeout(() => handleCheckAvailability(selectedDate), 1000);
        }
      } else {
        setConnectionError('Failed to connect to calendar provider');
      }
    } catch (error: any) {
      console.error('Failed to connect provider:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Failed to connect to calendar provider';
      
      if (error.message?.includes('redirect_uri_mismatch')) {
        errorMessage = 'OAuth configuration error. Please check the setup guide for instructions on configuring Google Cloud Console.';
      } else if (error.message?.includes('not configured')) {
        errorMessage = 'Google Calendar API not configured. Please add your Google API credentials to environment variables.';
      }
      
      setConnectionError(errorMessage);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnectProvider = async (providerId: string) => {
    try {
      await calendarService.disconnectProvider(providerId);
      setProviders(calendarService.getProviders());
      setAvailability(null);
      setScheduledEvent(null);
    } catch (error) {
      console.error('Failed to disconnect provider:', error);
    }
  };

  const handleCheckAvailability = async (targetDate?: string) => {
    if (!hasConnectedProvider()) return;

    setIsCheckingAvailability(true);
    try {
      const dateToCheck = targetDate || selectedDate;
      console.log(`📅 Checking availability for ${dateToCheck} with preferred time: ${parsedData.datetime}`);
      
      // Pass the preferred time from AI parsing to the calendar service
      const result = await calendarService.checkAvailability(
        dateToCheck, 
        parsedData.participants, 
        parsedData.datetime // This is the key addition - pass the AI-parsed datetime
      );
      
      setAvailability(result);
      
      // Auto-select first suggested time (which should be the preferred time if available)
      if (result.suggestedTimes.length > 0) {
        setSelectedTime(result.suggestedTimes[0]);
        console.log(`✨ Auto-selected time: ${result.suggestedTimes[0]} (${result.suggestedTimes[0] === extractTimeFromDateTime(parsedData.datetime) ? 'preferred time' : 'alternative time'})`);
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const extractTimeFromDateTime = (datetime: string): string | null => {
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
      
      // Pattern 3: Simple time patterns like "14:30" or "2:30 PM"
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
  };

  const handleScheduleMeeting = async () => {
    if (!selectedTime || !hasConnectedProvider() || !selectedDate) {
      console.error('Missing required data for scheduling:', {
        selectedTime,
        hasConnectedProvider: hasConnectedProvider(),
        selectedDate,
        parsedData
      });
      setConnectionError('Missing required information for scheduling. Please ensure date and time are selected.');
      return;
    }

    // Validate parsed data
    if (!parsedData.contactName || parsedData.contactName === 'Unknown Contact') {
      setConnectionError('Contact name is required for scheduling. Please check the email parsing results.');
      return;
    }

    if (!parsedData.email || !parsedData.email.includes('@')) {
      setConnectionError('Valid email address is required for scheduling. Please check the email parsing results.');
      return;
    }

    setIsScheduling(true);
    setConnectionError('');
    
    try {
      // Create proper ISO datetime string
      const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      // Validate the date
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Invalid date/time format');
      }
      
      const endDateTime = new Date(startDateTime.getTime() + meetingDuration * 60000);

      const scheduleRequest = {
        title: `Meeting with ${parsedData.contactName} - ${parsedData.company}`,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        attendees: parsedData.participants.filter(email => email && email.includes('@')),
        description: `Scheduled meeting with ${parsedData.contactName} from ${parsedData.company}.\n\nOriginal request: ${parsedData.datetime}`,
        location: 'Video Conference'
      };

      console.log('📅 Scheduling meeting with request:', scheduleRequest);

      const event = await calendarService.scheduleEvent(scheduleRequest);
      setScheduledEvent(event);
      
      // Send calendar invites
      await calendarService.sendCalendarInvite(event);
      
      if (onScheduled) {
        onScheduled(event);
      }

      console.log('✅ Meeting scheduled successfully:', event);
    } catch (error: any) {
      console.error('Failed to schedule meeting:', error);
      setConnectionError(`Failed to schedule meeting: ${error.message || 'Unknown error'}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const extractDateFromParsedData = (datetime: string): string => {
    // Enhanced date extraction with better parsing
    console.log('📅 Extracting date from:', datetime);
    
    // If datetime is "Not specified", use tomorrow as default
    if (!datetime || datetime === 'Not specified') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Enhanced date patterns
    const datePatterns = [
      // ISO format: 2024-01-15
      /(\d{4}-\d{2}-\d{2})/,
      // Month name formats: May 30, 2024 | June 30, 2025
      /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i,
      // Month name without year: May 30 | June 30
      /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?/i,
      // US format: 01/15/2024 or 1/15/2024
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      // European format: 15/01/2024
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/
    ];

    for (const pattern of datePatterns) {
      const match = datetime.match(pattern);
      if (match) {
        if (pattern.source.includes('January|February')) {
          // Handle month name format
          const monthNames: { [key: string]: string } = {
            'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
            'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
            'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
            'august': '08', 'aug': '08', 'september': '09', 'sep': '09',
            'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
            'december': '12', 'dec': '12'
          };
          
          const monthName = match[1].toLowerCase();
          const day = match[2].padStart(2, '0');
          const year = match[3] || (new Date().getFullYear() + 1).toString(); // Use next year if no year provided
          const month = monthNames[monthName] || '01';
          
          const extractedDate = `${year}-${month}-${day}`;
          console.log('📅 Extracted date (month name):', extractedDate);
          return extractedDate;
        } else if (pattern.source.includes('\\d{4}-\\d{2}-\\d{2}')) {
          // Already in ISO format
          console.log('📅 Extracted date (ISO):', match[1]);
          return match[1];
        } else {
          // Handle numeric formats
          const parts = match[0].split('/');
          if (parts.length === 3) {
            // Assume US format: MM/DD/YYYY
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2];
            const extractedDate = `${year}-${month}-${day}`;
            console.log('📅 Extracted date (numeric):', extractedDate);
            return extractedDate;
          }
        }
      }
    }
    
    // Handle relative dates
    if (datetime.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const extractedDate = tomorrow.toISOString().split('T')[0];
      console.log('📅 Extracted date (tomorrow):', extractedDate);
      return extractedDate;
    } else if (datetime.toLowerCase().includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const extractedDate = nextWeek.toISOString().split('T')[0];
      console.log('📅 Extracted date (next week):', extractedDate);
      return extractedDate;
    }
    
    // Fallback to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fallbackDate = tomorrow.toISOString().split('T')[0];
    console.log('📅 Using fallback date:', fallbackDate);
    return fallbackDate;
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

  const getProviderStatus = (provider: CalendarProvider) => {
    if (provider.id === 'google' && !isGoogleConfigured()) {
      return { status: 'not_configured', message: 'API not configured' };
    }
    return { status: provider.connected ? 'connected' : 'disconnected', message: provider.connected ? 'Connected' : 'Not connected' };
  };

  // Convert CalendarEvent to CalendarEventData for export
  const getEventDataForExport = (event: CalendarEvent): CalendarEventData => {
    return {
      title: event.title,
      start: event.start,
      end: event.end,
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      organizer: user?.email
    };
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

        {/* Parsed Data Summary */}
        <div className="mb-8 bg-white/5 rounded-xl p-6 border border-white/10">
          <h4 className="text-lg font-semibold text-white mb-4">Meeting Details from Email</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-slate-300">Contact:</span>
              <p className="text-white font-semibold">{parsedData.contactName}</p>
            </div>
            <div>
              <span className="text-sm text-slate-300">Company:</span>
              <p className="text-white font-semibold">{parsedData.company}</p>
            </div>
            <div>
              <span className="text-sm text-slate-300">Email:</span>
              <p className="text-white font-semibold">{parsedData.email}</p>
            </div>
            <div>
              <span className="text-sm text-slate-300">Requested Time:</span>
              <p className="text-white font-semibold">{parsedData.datetime}</p>
            </div>
          </div>
          
          {/* Validation Warnings */}
          {(!parsedData.contactName || parsedData.contactName === 'Unknown Contact') && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-orange-300 text-sm">⚠️ Contact name not detected. Please verify the email parsing results.</p>
            </div>
          )}
          
          {(!parsedData.email || !parsedData.email.includes('@')) && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-orange-300 text-sm">⚠️ Valid email address not detected. Please verify the email parsing results.</p>
            </div>
          )}
        </div>

        {/* User Authentication Status */}
        {user && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-green-400 mr-3" />
              <div>
                <h5 className="text-green-300 font-semibold">Signed In</h5>
                <p className="text-green-200 text-sm">
                  You're signed in as {user.email}. Calendar connections will be seamlessly linked to your account.
                </p>
              </div>
            </div>
          </div>
        )}

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
            {providers.map((provider) => {
              const providerStatus = getProviderStatus(provider);
              
              return (
                <div
                  key={provider.id}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    providerStatus.status === 'connected'
                      ? 'bg-green-500/10 border-green-500/30'
                      : providerStatus.status === 'not_configured'
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-white/10 border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{provider.icon}</span>
                      <div>
                        <p className="text-white font-semibold">{provider.name}</p>
                        <p className={`text-sm ${
                          providerStatus.status === 'connected' ? 'text-green-300' : 
                          providerStatus.status === 'not_configured' ? 'text-orange-300' : 
                          'text-slate-400'
                        }`}>
                          {providerStatus.message}
                        </p>
                      </div>
                    </div>
                    
                    {providerStatus.status === 'not_configured' ? (
                      <div className="flex items-center space-x-1">
                        <Settings className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-orange-300">Setup Required</span>
                      </div>
                    ) : providerStatus.status === 'connected' ? (
                      <button
                        onClick={() => handleDisconnectProvider(provider.id)}
                        className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-all duration-200"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectProvider(provider.id)}
                        disabled={isConnecting === provider.id || !user}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50 flex items-center space-x-1"
                      >
                        {isConnecting === provider.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Link className="w-3 h-3" />
                        )}
                        <span>{isConnecting === provider.id ? 'Connecting...' : 'Connect'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connection Error */}
          {connectionError && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                <div>
                  <p className="text-red-300 font-semibold">Error</p>
                  <p className="text-red-200 text-sm">{connectionError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          {!isGoogleConfigured() && (
            <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <div className="flex items-center mb-3">
                <Settings className="w-5 h-5 text-orange-400 mr-3" />
                <h5 className="text-orange-300 font-semibold">Google Calendar Setup Required</h5>
              </div>
              <p className="text-orange-200 text-sm mb-3">
                To use real Google Calendar integration, you need to configure your API credentials.
              </p>
              <div className="text-orange-200 text-sm space-y-1">
                <p>1. Get Google Calendar API credentials from Google Cloud Console</p>
                <p>2. Add them to your .env file:</p>
                <div className="bg-black/20 rounded p-2 mt-2 font-mono text-xs">
                  VITE_GOOGLE_CLIENT_ID=your-client-id<br/>
                  VITE_GOOGLE_API_KEY=your-api-key
                </div>
                <p className="mt-2">3. Check GOOGLE_CALENDAR_SETUP.md for detailed instructions</p>
              </div>
            </div>
          )}

          {/* Sign In Required Notice */}
          {!user && (
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-400 mr-3" />
                <div>
                  <h5 className="text-blue-300 font-semibold">Sign In Required</h5>
                  <p className="text-blue-200 text-sm">
                    Please sign in to your account to connect calendar providers and save your integration preferences.
                  </p>
                </div>
              </div>
            </div>
          )}
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
                  
                  {/* Show preferred time indicator if it's the first suggestion */}
                  {availability.suggestedTimes.length > 0 && extractTimeFromDateTime(parsedData.datetime) === availability.suggestedTimes[0] && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-300 text-sm flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        ✨ Great news! Your requested time ({formatTime(availability.suggestedTimes[0])}) is available and shown first.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {availability.suggestedTimes.map((time, index) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-lg border transition-all duration-200 relative ${
                          selectedTime === time
                            ? 'bg-blue-500/30 border-blue-400 text-blue-200'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                        }`}
                      >
                        {formatTime(time)}
                        {/* Show preferred indicator for the first suggestion if it matches AI-parsed time */}
                        {index === 0 && extractTimeFromDateTime(parsedData.datetime) === time && (
                          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✨</span>
                          </div>
                        )}
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
                    disabled={isScheduling || !parsedData.contactName || parsedData.contactName === 'Unknown Contact' || !parsedData.email || !parsedData.email.includes('@')}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
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

            <div className="bg-white/10 rounded-lg p-4 space-y-3 mb-6">
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

              <div className="pt-3 border-t border-white/20 flex items-center justify-between">
                <button className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  <span>View in Calendar</span>
                </button>
                
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>{showExportOptions ? 'Hide' : 'Export'} Options</span>
                </button>
              </div>
            </div>

            {/* Calendar Export Options */}
            {showExportOptions && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <CalendarExportOptions 
                  event={getEventDataForExport(scheduledEvent)}
                />
              </div>
            )}
          </div>
        )}

        {/* No Connected Providers */}
        {!hasConnectedProvider() && user && (
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
                {!isGoogleConfigured() && (
                  <p className="text-yellow-200 text-sm mt-2">
                    💡 Tip: Configure Google Calendar API for real calendar integration, or use mock mode for testing.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Calendar Export - Always Available */}
        {!scheduledEvent && selectedDate && selectedTime && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Download className="w-6 h-6 text-blue-400 mr-3" />
                <div>
                  <h4 className="text-lg font-semibold text-blue-300">
                    Manual Calendar Export
                  </h4>
                  <p className="text-blue-200 text-sm">
                    Download calendar files or add to online calendars manually
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200"
              >
                {showExportOptions ? 'Hide' : 'Show'} Export Options
              </button>
            </div>

            {showExportOptions && (
              <CalendarExportOptions 
                event={{
                  title: `Meeting with ${parsedData.contactName} - ${parsedData.company}`,
                  start: new Date(`${selectedDate}T${selectedTime}:00`).toISOString(),
                  end: new Date(new Date(`${selectedDate}T${selectedTime}:00`).getTime() + meetingDuration * 60000).toISOString(),
                  description: `Scheduled meeting with ${parsedData.contactName} from ${parsedData.company}`,
                  location: 'Video Conference',
                  attendees: parsedData.participants,
                  organizer: user?.email
                }}
              />
            )}
          </div>
        )}

        {/* Fallback Mode Indicator */}
        {!isGoogleConfigured() && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center">
              <Zap className="w-5 h-5 text-blue-400 mr-3" />
              <div>
                <h5 className="text-blue-300 font-semibold">Fallback Mode Active</h5>
                <p className="text-blue-200 text-sm">
                  Using mock calendar data for demonstration. Connect real calendar providers for production use.
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