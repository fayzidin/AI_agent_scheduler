import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, AlertCircle, CheckCircle, Clock, Users, MapPin } from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{ email: string }>;
  description?: string;
}

interface GoogleCalendarService {
  isInitialized: boolean;
  isConnected: boolean;
  error: string | null;
  events: CalendarEvent[];
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

function App() {
  const [service, setService] = useState<GoogleCalendarService>({
    isInitialized: false,
    isConnected: false,
    error: null,
    events: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    initializeGoogleServices();
  }, []);

  const loadGoogleAPI = (): Promise<void> => {
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
  };

  const loadGoogleIdentityServices = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  };

  const initializeGoogleServices = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!clientId || !apiKey) {
      setService(prev => ({
        ...prev,
        error: 'Missing Google API credentials. Please check your .env file.',
        isInitialized: false
      }));
      return;
    }

    setIsLoading(true);

    try {
      // Load both Google API and Google Identity Services
      await Promise.all([
        loadGoogleAPI(),
        loadGoogleIdentityServices()
      ]);

      // Initialize gapi client
      await new Promise((resolve) => {
        window.gapi.load('client', resolve);
      });

      // Initialize the client with API key and discovery docs
      await window.gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      });

      // Initialize Google Identity Services token client
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('Token acquisition failed:', tokenResponse.error);
            setService(prev => ({
              ...prev,
              error: `Authentication failed: ${tokenResponse.error}`,
              isConnected: false
            }));
            setIsConnecting(false);
            return;
          }

          // Set the access token for gapi client
          window.gapi.client.setToken({
            access_token: tokenResponse.access_token
          });

          setService(prev => ({
            ...prev,
            isConnected: true,
            error: null
          }));

          setIsConnecting(false);
          
          // Load events after successful authentication
          loadCalendarEvents();
        }
      });

      setTokenClient(client);
      setService(prev => ({
        ...prev,
        isInitialized: true,
        error: null
      }));

    } catch (error) {
      console.error('Failed to initialize Google services:', error);
      setService(prev => ({
        ...prev,
        error: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isInitialized: false
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const connectGoogleCalendar = () => {
    if (!tokenClient) {
      setService(prev => ({
        ...prev,
        error: 'Google services not properly initialized'
      }));
      return;
    }

    setIsConnecting(true);
    setService(prev => ({ ...prev, error: null }));

    try {
      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('Failed to request access token:', error);
      setService(prev => ({
        ...prev,
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      setIsConnecting(false);
    }
  };

  const loadCalendarEvents = async () => {
    if (!service.isConnected) return;

    setIsLoading(true);
    setService(prev => ({ ...prev, error: null }));

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.result.items || [];
      
      setService(prev => ({
        ...prev,
        events: events,
        error: null
      }));

    } catch (error: any) {
      console.error('Failed to load calendar events:', error);
      let errorMessage = 'Failed to load calendar events';
      
      if (error.status === 401) {
        errorMessage = 'Authentication expired. Please reconnect.';
        setService(prev => ({ ...prev, isConnected: false }));
      } else if (error.status === 403) {
        errorMessage = 'Access denied. Please check calendar permissions.';
      }
      
      setService(prev => ({
        ...prev,
        error: errorMessage
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    try {
      const token = window.gapi.client.getToken();
      if (token && token.access_token) {
        window.google.accounts.oauth2.revoke(token.access_token);
        window.gapi.client.setToken(null);
      }
      
      setService(prev => ({
        ...prev,
        isConnected: false,
        events: [],
        error: null
      }));
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const formatEventTime = (event: CalendarEvent): string => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return 'No time specified';
    
    const date = new Date(start);
    
    if (event.start.date) {
      // All-day event
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      // Timed event
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getEventDuration = (event: CalendarEvent): string => {
    if (!event.start.dateTime || !event.end.dateTime) return '';
    
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Google Calendar Integration
            </h1>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              Connect to your Google Calendar using Google Identity Services and view your upcoming events
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            {/* Error Display */}
            {service.error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                  <p className="text-red-300">{service.error}</p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !service.isInitialized && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
                <p className="text-white text-lg">Initializing Google Services...</p>
                <p className="text-blue-200 text-sm mt-2">Loading Google API and Identity Services</p>
              </div>
            )}

            {/* Not Initialized */}
            {!isLoading && !service.isInitialized && service.error && (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Initialization Failed</h3>
                <p className="text-red-200 mb-6">Please check your Google API configuration</p>
                <button
                  onClick={initializeGoogleServices}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200"
                >
                  Retry Initialization
                </button>
              </div>
            )}

            {/* Initialized but Not Connected */}
            {service.isInitialized && !service.isConnected && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-blue-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4">Connect to Google Calendar</h3>
                <p className="text-blue-200 mb-8 max-w-md mx-auto">
                  Click the button below to authenticate with Google and access your calendar events
                </p>
                
                <button
                  onClick={connectGoogleCalendar}
                  disabled={isConnecting}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-3 mx-auto"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      <span>Connect Google Calendar</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Connected - Show Events */}
            {service.isConnected && (
              <div>
                {/* Connection Status */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                      <span className="text-green-300 font-semibold">Connected to Google Calendar</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={loadCalendarEvents}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )}
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={disconnect}
                        className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-200"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>

                {/* Events List */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Clock className="w-6 h-6 mr-3" />
                    Next 5 Events
                  </h3>

                  {isLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
                      <p className="text-white">Loading your calendar events...</p>
                    </div>
                  ) : service.events.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-xl">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300 text-lg">No upcoming events found</p>
                      <p className="text-gray-400 text-sm mt-2">Your calendar is clear for the next few days</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {service.events.map((event) => (
                        <div
                          key={event.id}
                          className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-white mb-2">
                                {event.summary || 'Untitled Event'}
                              </h4>
                              
                              <div className="flex items-center text-blue-200 text-sm mb-2">
                                <Clock className="w-4 h-4 mr-2" />
                                <span>{formatEventTime(event)}</span>
                                {getEventDuration(event) && (
                                  <span className="ml-2 px-2 py-1 bg-blue-500/20 rounded text-xs">
                                    {getEventDuration(event)}
                                  </span>
                                )}
                              </div>

                              {event.location && (
                                <div className="flex items-center text-purple-200 text-sm mb-2">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <span>{event.location}</span>
                                </div>
                              )}

                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center text-green-200 text-sm">
                                  <Users className="w-4 h-4 mr-2" />
                                  <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                                </div>
                              )}

                              {event.description && (
                                <p className="text-gray-300 text-sm mt-3 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Environment Check */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-4 px-6 py-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm text-gray-300">Client ID</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${import.meta.env.VITE_GOOGLE_API_KEY ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm text-gray-300">API Key</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;