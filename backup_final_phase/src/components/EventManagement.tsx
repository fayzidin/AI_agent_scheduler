import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, CheckCircle, AlertCircle, Loader2, RefreshCw, X, Edit3, Trash2 } from 'lucide-react';
import { calendarService } from '../services/calendarService';
import { CalendarEvent, EventSearchResult, RescheduleRequest } from '../types/calendar';

interface EventManagementProps {
  parsedData: {
    contactName: string;
    email: string;
    company: string;
    datetime: string;
    participants: string[];
    intent: string;
  };
  onEventUpdated?: (event: CalendarEvent) => void;
}

const EventManagement: React.FC<EventManagementProps> = ({ parsedData, onEventUpdated }) => {
  const [searchResult, setSearchResult] = useState<EventSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newDateTime, setNewDateTime] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [cancellationReason, setCancellationReason] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (parsedData.intent === 'reschedule_meeting' || parsedData.intent === 'cancel_meeting') {
      handleSearchEvents();
    }
  }, [parsedData]);

  const handleSearchEvents = async () => {
    setIsSearching(true);
    try {
      // Create search query from parsed data
      const searchQuery = `${parsedData.contactName} ${parsedData.company}`;
      const result = await calendarService.searchEvents(searchQuery, parsedData.participants);
      setSearchResult(result);
      
      // Auto-select the best match if confidence is high
      if (result.matchedEvent && result.confidence > 0.6) {
        setSelectedEvent(result.matchedEvent);
      }
    } catch (error) {
      console.error('Failed to search events:', error);
      setResult({ type: 'error', message: 'Failed to search for existing events' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRescheduleEvent = async () => {
    if (!selectedEvent || !newDateTime) return;

    setIsProcessing(true);
    try {
      const startDateTime = new Date(newDateTime);
      const endDateTime = new Date(startDateTime.getTime() + newDuration * 60000);

      const rescheduleRequest: RescheduleRequest = {
        eventId: selectedEvent.id,
        newStart: startDateTime.toISOString(),
        newEnd: endDateTime.toISOString(),
        reason: rescheduleReason || 'Meeting time changed'
      };

      const updatedEvent = await calendarService.rescheduleEvent(rescheduleRequest);
      await calendarService.sendRescheduleNotification(updatedEvent);

      setResult({ 
        type: 'success', 
        message: `Meeting successfully rescheduled to ${startDateTime.toLocaleString()}` 
      });

      if (onEventUpdated) {
        onEventUpdated(updatedEvent);
      }
    } catch (error) {
      console.error('Failed to reschedule event:', error);
      setResult({ type: 'error', message: 'Failed to reschedule the meeting' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!selectedEvent) return;

    setIsProcessing(true);
    try {
      const success = await calendarService.cancelEvent(
        selectedEvent.id, 
        cancellationReason || 'Meeting cancelled'
      );

      if (success) {
        await calendarService.sendCancellationNotification(selectedEvent);
        setResult({ 
          type: 'success', 
          message: 'Meeting successfully cancelled and notifications sent' 
        });

        if (onEventUpdated) {
          onEventUpdated({ ...selectedEvent, status: 'cancelled' });
        }
      } else {
        throw new Error('Failed to cancel event');
      }
    } catch (error) {
      console.error('Failed to cancel event:', error);
      setResult({ type: 'error', message: 'Failed to cancel the meeting' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateTime = (dateTime: string): string => {
    return new Date(dateTime).toLocaleString();
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'reschedule_meeting':
        return <Edit3 className="w-6 h-6 text-yellow-400" />;
      case 'cancel_meeting':
        return <Trash2 className="w-6 h-6 text-red-400" />;
      default:
        return <Calendar className="w-6 h-6 text-blue-400" />;
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'reschedule_meeting':
        return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20';
      case 'cancel_meeting':
        return 'from-red-500/10 to-pink-500/10 border-red-500/20';
      default:
        return 'from-blue-500/10 to-purple-500/10 border-blue-500/20';
    }
  };

  if (parsedData.intent !== 'reschedule_meeting' && parsedData.intent !== 'cancel_meeting') {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r ${getIntentColor(parsedData.intent)} border rounded-2xl p-8 mt-6`}>
      <div className="flex items-center mb-8">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4">
          {getIntentIcon(parsedData.intent)}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {parsedData.intent === 'reschedule_meeting' ? 'Reschedule Meeting' : 'Cancel Meeting'}
          </h3>
          <p className="text-blue-200">
            {parsedData.intent === 'reschedule_meeting' 
              ? 'Looking up existing meeting to reschedule...'
              : 'Looking up existing meeting to cancel...'
            }
          </p>
        </div>
      </div>

      {/* Search Results */}
      {isSearching ? (
        <div className="bg-white/10 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-white">Searching for existing meetings...</span>
          </div>
        </div>
      ) : searchResult ? (
        <div className="space-y-6">
          {/* Found Events */}
          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Found {searchResult.events.length} matching event(s)
              </h4>
              <button
                onClick={handleSearchEvents}
                className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200"
                title="Refresh Search"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {searchResult.events.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">No matching meetings found</p>
                <p className="text-slate-300">
                  Could not find any existing meetings with {parsedData.contactName} or {parsedData.company}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResult.events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedEvent?.id === event.id
                        ? 'bg-blue-500/20 border-blue-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-white font-semibold mb-1">{event.title}</h5>
                        <p className="text-sm text-slate-300 mb-2">
                          {formatDateTime(event.start)} - {formatDateTime(event.end)}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {event.attendees.length} attendees
                          </span>
                          {event === searchResult.matchedEvent && (
                            <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded">
                              Best Match
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedEvent?.id === event.id && (
                        <CheckCircle className="w-6 h-6 text-blue-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Forms */}
          {selectedEvent && (
            <div className="bg-white/10 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-white mb-6">
                {parsedData.intent === 'reschedule_meeting' ? 'Reschedule Details' : 'Cancellation Details'}
              </h4>

              {parsedData.intent === 'reschedule_meeting' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-indigo-200 mb-2">
                      New Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newDateTime}
                      onChange={(e) => setNewDateTime(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-200 mb-2">
                      Duration (minutes)
                    </label>
                    <select
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={30} className="bg-slate-800">30 minutes</option>
                      <option value={60} className="bg-slate-800">1 hour</option>
                      <option value={90} className="bg-slate-800">1.5 hours</option>
                      <option value={120} className="bg-slate-800">2 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-200 mb-2">
                      Reason for Reschedule (Optional)
                    </label>
                    <input
                      type="text"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="e.g., Schedule conflict, urgent matter..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleRescheduleEvent}
                    disabled={isProcessing || !newDateTime}
                    className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Edit3 className="w-5 h-5" />
                    )}
                    <span>{isProcessing ? 'Rescheduling...' : 'Reschedule Meeting'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-indigo-200 mb-2">
                      Reason for Cancellation (Optional)
                    </label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="e.g., No longer needed, schedule conflict, emergency..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleCancelEvent}
                    disabled={isProcessing}
                    className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-pink-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                    <span>{isProcessing ? 'Cancelling...' : 'Cancel Meeting'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className={`rounded-xl p-6 border ${
              result.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-center">
                {result.type === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400 mr-3" />
                )}
                <div>
                  <h4 className={`text-lg font-semibold mb-1 ${
                    result.type === 'success' ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {result.type === 'success' ? 'Success!' : 'Error'}
                  </h4>
                  <p className={result.type === 'success' ? 'text-green-200' : 'text-red-200'}>
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default EventManagement;