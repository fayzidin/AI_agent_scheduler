import React, { useState, useEffect } from 'react';
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Calendar, Users, Building, Clock, Zap, Brain } from 'lucide-react';
import { openaiService, ParsedEmailData, OpenAIParseResponse } from '../services/openaiService';
import CalendarIntegration from './CalendarIntegration';
import EventManagement from './EventManagement';

interface ParseResponse {
  success: boolean;
  data?: ParsedEmailData;
  error?: string;
  rawResponse?: string;
}

const EmailParser: React.FC = () => {
  const [emailText, setEmailText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [isOpenAIAvailable, setIsOpenAIAvailable] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    // Check if OpenAI is available on component mount
    setIsOpenAIAvailable(openaiService.isOpenAIAvailable());
    
    // Test connection if API key is available
    if (openaiService.isOpenAIAvailable()) {
      testOpenAIConnection();
    }
  }, []);

  const testOpenAIConnection = async () => {
    setIsTestingConnection(true);
    try {
      const isConnected = await openaiService.testConnection();
      setIsOpenAIAvailable(isConnected);
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsOpenAIAvailable(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleParseEmail = async () => {
    if (!emailText.trim()) {
      setResult({ success: false, error: 'Please enter email content' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response: OpenAIParseResponse = await openaiService.parseEmail(emailText);
      setResult(response);
    } catch (error) {
      console.error('Parse error:', error);
      setResult({ 
        success: false, 
        error: 'Failed to parse email. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatParticipants = (participants: string[]) => {
    return participants && participants.length > 0 ? participants.join(', ') : 'None specified';
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'schedule_meeting':
        return <Calendar className="w-5 h-5 text-green-400" />;
      case 'cancel_meeting':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'reschedule_meeting':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Mail className="w-5 h-5 text-blue-400" />;
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'schedule_meeting':
        return 'text-green-300 bg-green-500/10 border-green-500/20';
      case 'cancel_meeting':
        return 'text-red-300 bg-red-500/10 border-red-500/20';
      case 'reschedule_meeting':
        return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-300 bg-green-500/10';
    if (confidence >= 0.6) return 'text-yellow-300 bg-yellow-500/10';
    return 'text-red-300 bg-red-500/10';
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">AI Email Parser</h2>
              <p className="text-indigo-200 mt-1">Powered by OpenAI GPT-4</p>
            </div>
          </div>

          {/* AI Status Indicator */}
          <div className="flex items-center space-x-3">
            {isTestingConnection ? (
              <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                <span className="text-yellow-300 text-sm">Testing...</span>
              </div>
            ) : isOpenAIAvailable ? (
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Brain className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm">AI Ready</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300 text-sm">Fallback Mode</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-semibold text-indigo-200 mb-4">
              Email Content
            </label>
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="Paste your email content here... 

Examples:

SCHEDULE:
Hi Sarah Johnson, I wanted to schedule a meeting with you and the team at Microsoft Corporation to discuss our upcoming project. Would you be available on January 15th, 2024 at 2:00 PM? Please let me know if this works for your schedule.

RESCHEDULE:
Hi John Smith, I need to reschedule our meeting with TechCorp Inc. that was planned for tomorrow at 3:00 PM. Can we move it to next week instead?

CANCEL:
Hi Sarah, I'm sorry but I need to cancel our meeting scheduled for Friday, January 20th, 2024 at 10:00 AM due to an emergency. Let's reschedule for next week."
              rows={12}
              className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Parse Button */}
          <button
            onClick={handleParseEmail}
            disabled={isLoading || !emailText.trim()}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] flex items-center justify-center space-x-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg">
                  {isOpenAIAvailable ? 'Analyzing with AI...' : 'Processing...'}
                </span>
              </>
            ) : (
              <>
                {isOpenAIAvailable ? <Brain className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                <span className="text-lg">
                  {isOpenAIAvailable ? 'Parse with AI' : 'Parse Email'}
                </span>
              </>
            )}
          </button>

          {/* Results */}
          {result && (
            <div className="mt-8 space-y-6">
              {result.success ? (
                <>
                  {/* Success Header */}
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="w-8 h-8 text-green-400 mr-4" />
                        <div>
                          <h3 className="text-2xl font-bold text-green-300 mb-2">
                            Email Parsed Successfully
                          </h3>
                          <p className="text-green-200">
                            {isOpenAIAvailable ? 'AI has extracted' : 'System has extracted'} the following meeting information
                          </p>
                        </div>
                      </div>
                      
                      {/* Confidence Score */}
                      {result.data?.confidence && (
                        <div className={`px-4 py-2 rounded-xl border ${getConfidenceColor(result.data.confidence)}`}>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {Math.round(result.data.confidence * 100)}%
                            </div>
                            <div className="text-xs opacity-80">Confidence</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parsed Data */}
                  {result.data && (
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                      <h4 className="text-2xl font-bold text-white mb-8 flex items-center">
                        <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg mr-3">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        Meeting Information
                      </h4>
                      
                      <div className="grid lg:grid-cols-2 gap-8">
                        {/* Contact Information */}
                        <div className="space-y-6">
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Users className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Contact Name</span>
                            </div>
                            <p className="text-white font-bold text-lg">
                              {result.data.contactName}
                            </p>
                          </div>
                          
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Mail className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Email Address</span>
                            </div>
                            <p className="text-white font-bold text-lg break-all">
                              {result.data.email}
                            </p>
                          </div>
                          
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Building className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Company</span>
                            </div>
                            <p className="text-white font-bold text-lg">
                              {result.data.company}
                            </p>
                          </div>
                        </div>
                        
                        {/* Meeting Details */}
                        <div className="space-y-6">
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Calendar className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Date & Time</span>
                            </div>
                            <p className="text-white font-bold text-lg">
                              {result.data.datetime}
                            </p>
                          </div>
                          
                          <div className={`rounded-xl p-6 border ${getIntentColor(result.data.intent)}`}>
                            <div className="flex items-center mb-3">
                              {getIntentIcon(result.data.intent)}
                              <span className="text-sm font-semibold ml-2">Intent</span>
                            </div>
                            <p className="font-bold text-lg capitalize">
                              {result.data.intent.replace('_', ' ')}
                            </p>
                          </div>
                          
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Users className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Participants</span>
                            </div>
                            <p className="text-white font-bold text-lg break-all">
                              {formatParticipants(result.data.participants)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* AI Reasoning (if available) */}
                      {result.data.reasoning && isOpenAIAvailable && (
                        <div className="mt-6 bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                          <div className="flex items-center mb-2">
                            <Brain className="w-4 h-4 text-blue-400 mr-2" />
                            <span className="text-sm font-semibold text-blue-300">AI Analysis</span>
                          </div>
                          <p className="text-blue-200 text-sm">{result.data.reasoning}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-2xl p-6">
                  <div className="flex items-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mr-4" />
                    <div>
                      <h3 className="text-2xl font-bold text-red-300 mb-2">
                        Parsing Failed
                      </h3>
                      <p className="text-red-200">
                        {result.error || 'An unknown error occurred while parsing the email'}
                      </p>
                      {!isOpenAIAvailable && (
                        <p className="text-red-200 text-sm mt-2">
                          💡 Tip: Add your OpenAI API key to environment variables for better accuracy
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendar Integration - Auto-triggered for schedule intent */}
      {result?.success && result.data && result.data.intent === 'schedule_meeting' && (
        <CalendarIntegration 
          parsedData={result.data}
          emailContent={emailText}
          onScheduled={(event) => {
            console.log('Meeting scheduled:', event);
          }}
        />
      )}

      {/* Event Management - Auto-triggered for reschedule/cancel intents */}
      {result?.success && result.data && (result.data.intent === 'reschedule_meeting' || result.data.intent === 'cancel_meeting') && (
        <EventManagement 
          parsedData={result.data}
          onEventUpdated={(event) => {
            console.log('Event updated:', event);
          }}
        />
      )}
    </div>
  );
};

export default EmailParser;