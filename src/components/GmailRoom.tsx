import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Calendar, 
  Users, 
  Clock, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Send, 
  Brain,
  RefreshCw,
  ExternalLink,
  Shield,
  Settings
} from 'lucide-react';
import { gmailService } from '../services/gmailService';
import { openaiService } from '../services/openaiService';
import { calendarService } from '../services/calendarService';
import { EmailMessage } from '../types/email';
import { useAuth } from '../contexts/AuthContext';
import { isGmailConfigured } from '../config/gmail';
import CalendarIntegration from './CalendarIntegration';

const GmailRoom: React.FC = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchEmails();
    }
  }, [isConnected]);

  const checkConnection = () => {
    setIsConnected(gmailService.isConnected());
  };

  const handleConnect = async () => {
    if (!user) {
      setConnectionError('Please sign in to connect Gmail');
      return;
    }

    setIsConnecting(true);
    setConnectionError('');
    
    try {
      console.log('🔗 Starting Gmail connection process...');
      console.log('📧 Step 1: Checking API configuration...');
      
      if (!isGmailConfigured()) {
        console.log('⚠️ Gmail API not configured - using mock mode');
      } else {
        console.log('✅ Gmail API configured - using real Gmail');
      }
      
      console.log('📧 Step 2: Attempting authentication...');
      const success = await gmailService.signIn();
      
      if (success) {
        console.log('✅ Step 3: Gmail connection successful!');
        setIsConnected(true);
        
        // Fetch emails immediately after connection
        console.log('📧 Step 4: Fetching emails...');
        await fetchEmails();
      } else {
        throw new Error('Gmail authentication returned false');
      }
    } catch (error: any) {
      console.error('❌ Gmail connection failed:', error);
      
      let errorMessage = 'Failed to connect to Gmail';
      
      if (error.message?.includes('redirect_uri_mismatch')) {
        errorMessage = 'OAuth configuration error. Please check GOOGLE_OAUTH_SETUP.md for instructions on configuring your Google Cloud Console.';
      } else if (error.message?.includes('not configured')) {
        errorMessage = 'Gmail API not configured. Please add your Google API credentials to environment variables.';
      } else if (error.message?.includes('popup_blocked')) {
        errorMessage = 'Popup blocked. Please allow popups for this site and try again.';
      } else if (error.message?.includes('access_denied')) {
        errorMessage = 'Access denied. Please grant permission to access your Gmail account.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setConnectionError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('🚪 Disconnecting from Gmail...');
      await gmailService.signOut();
      setIsConnected(false);
      setMessages([]);
      setSelectedMessage(null);
      setParsedData(null);
      console.log('✅ Disconnected from Gmail successfully');
    } catch (error) {
      console.error('❌ Failed to disconnect Gmail:', error);
    }
  };

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      console.log('📧 Fetching recent emails from Gmail...');
      
      // Fetch recent 10 emails (unread first)
      const recentEmails = await gmailService.getMessages({ isRead: false }, 10);
      setMessages(recentEmails);
      
      console.log(`✅ Fetched ${recentEmails.length} emails from Gmail`);
      
      // Auto-select first email with meeting intent
      const meetingEmail = recentEmails.find(email => 
        email.body.text.toLowerCase().includes('meeting') ||
        email.body.text.toLowerCase().includes('schedule') ||
        email.body.text.toLowerCase().includes('appointment')
      );
      
      if (meetingEmail) {
        console.log(`🎯 Auto-selecting email with meeting intent: "${meetingEmail.subject}"`);
        setSelectedMessage(meetingEmail);
        await parseEmailWithAI(meetingEmail);
      }
    } catch (error) {
      console.error('❌ Failed to fetch Gmail messages:', error);
      setConnectionError('Failed to fetch emails. Please try reconnecting.');
    } finally {
      setIsLoading(false);
    }
  };

  const parseEmailWithAI = async (message: EmailMessage) => {
    setIsParsing(true);
    setParsedData(null);
    
    try {
      console.log(`🤖 Parsing email with AI: "${message.subject}"`);
      
      const parseResponse = await openaiService.parseEmail(message.body.text);
      
      if (parseResponse.success && parseResponse.data) {
        setParsedData(parseResponse.data);
        console.log(`✅ AI parsing completed with ${Math.round(parseResponse.data.confidence * 100)}% confidence`);
        console.log(`🎯 Detected intent: ${parseResponse.data.intent}`);
        
        // Mark as read after successful parsing
        try {
          await gmailService.markAsRead(message.id);
          console.log('✅ Marked email as read');
          
          // Update message state
          setMessages(prev => prev.map(m => 
            m.id === message.id ? { ...m, isRead: true } : m
          ));
        } catch (error) {
          console.warn('⚠️ Failed to mark email as read:', error);
        }
      } else {
        console.log('❌ AI parsing failed or no meeting intent detected');
      }
    } catch (error) {
      console.error('❌ Failed to parse email with AI:', error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!parsedData || !selectedMessage) return;

    setIsScheduling(true);
    try {
      console.log(`📅 Scheduling meeting for: ${parsedData.contactName}`);
      
      // This will trigger the CalendarIntegration component
      // which handles the actual scheduling logic
      
    } catch (error) {
      console.error('❌ Failed to schedule meeting:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return `${Math.round(diffInHours * 60)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.round(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'schedule_meeting':
        return 'text-green-300 bg-green-500/10 border-green-500/20';
      case 'reschedule_meeting':
        return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
      case 'cancel_meeting':
        return 'text-red-300 bg-red-500/10 border-red-500/20';
      default:
        return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Gmail Connection Status */}
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl mr-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Gmail Room</h2>
              <p className="text-indigo-200 mt-1">
                {isConnected ? 'Connected and ready' : 'Connect your Gmail account'}
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm">Connected</span>
                </div>
                <button
                  onClick={fetchEmails}
                  disabled={isLoading}
                  className="p-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50"
                  title="Refresh emails"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-200"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting || !user}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-orange-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-3"
              >
                {isConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
                <span>{isConnecting ? 'Connecting...' : 'Connect Gmail'}</span>
              </button>
            )}
          </div>
        </div>

        {/* API Configuration Status */}
        <div className="mb-6">
          {isGmailConfigured() ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-green-400 mr-3" />
                <div>
                  <h5 className="text-green-300 font-semibold">Gmail API Configured</h5>
                  <p className="text-green-200 text-sm">
                    Real Gmail integration is active. You'll connect to your actual Gmail account.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-blue-400 mr-3" />
                <div>
                  <h5 className="text-blue-300 font-semibold">Mock Mode Active</h5>
                  <p className="text-blue-200 text-sm">
                    Gmail API not configured. Using sample emails for demonstration. 
                    Add your Google API credentials to connect to real Gmail.
                  </p>
                </div>
              </div>
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
                  You're signed in as {user.email}. Gmail connection will be linked to your account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Error */}
        {connectionError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <p className="text-red-300 font-semibold">Connection Failed</p>
                <p className="text-red-200 text-sm">{connectionError}</p>
                {connectionError.includes('OAuth configuration') && (
                  <div className="mt-3 text-red-200 text-sm">
                    <p className="font-semibold">Quick Fix:</p>
                    <ol className="list-decimal list-inside space-y-1 mt-1">
                      <li>Go to Google Cloud Console → APIs & Services → Credentials</li>
                      <li>Edit your OAuth 2.0 Client ID</li>
                      <li>Add this domain to Authorized JavaScript origins: <code className="bg-red-500/20 px-1 rounded">{window.location.origin}</code></li>
                      <li>Save and wait 5-10 minutes</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sign In Required Notice */}
        {!user && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-400 mr-3" />
              <div>
                <h5 className="text-blue-300 font-semibold">Sign In Required</h5>
                <p className="text-blue-200 text-sm">
                  Please sign in to your account to connect Gmail and access your emails.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gmail Messages */}
      {isConnected && (
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center">
                <Loader2 className={`w-6 h-6 mr-3 ${isLoading ? 'animate-spin text-blue-400' : 'text-green-400'}`} />
                Recent Emails ({messages.length})
              </h3>
              <div className="text-sm text-indigo-200">
                {isLoading ? 'Loading emails...' : 'Click an email to parse with AI'}
              </div>
            </div>
          </div>

          <div className="flex h-[600px]">
            {/* Email List */}
            <div className="w-1/2 border-r border-white/10 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                    <p className="text-white">Fetching emails from Gmail...</p>
                    <p className="text-indigo-200 text-sm mt-2">
                      {isGmailConfigured() ? 'Using real Gmail API' : 'Using mock data'}
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Mail className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                    <p className="text-white text-lg">No emails found</p>
                    <p className="text-indigo-200">
                      {isGmailConfigured() ? 'Try refreshing or check your Gmail account' : 'Mock data will appear here'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => {
                        console.log(`📧 Selected email: "${message.subject}"`);
                        setSelectedMessage(message);
                        parseEmailWithAI(message);
                      }}
                      className={`p-4 hover:bg-white/5 cursor-pointer transition-all duration-200 ${
                        !message.isRead ? 'bg-blue-500/5 border-l-4 border-blue-500' : ''
                      } ${
                        selectedMessage?.id === message.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <p className={`font-semibold ${message.isRead ? 'text-indigo-200' : 'text-white'}`}>
                              {message.from.name || message.from.email}
                            </p>
                            <span className="text-indigo-300 text-sm">
                              {formatDate(message.date)}
                            </span>
                            {message.isStarred && (
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            )}
                            {message.isImportant && (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          <p className={`font-medium mb-1 ${message.isRead ? 'text-indigo-200' : 'text-white'}`}>
                            {message.subject}
                          </p>
                          <p className="text-indigo-300 text-sm line-clamp-2">
                            {message.snippet}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {!message.isRead && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          )}
                          <Brain className="w-4 h-4 text-purple-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email Content & AI Analysis */}
            <div className="w-1/2 flex flex-col">
              {selectedMessage ? (
                <>
                  {/* Email Header */}
                  <div className="p-6 border-b border-white/10 bg-white/5">
                    <h4 className="text-xl font-bold text-white mb-2">{selectedMessage.subject}</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-indigo-200">From: {selectedMessage.from.name || selectedMessage.from.email}</p>
                        <p className="text-indigo-300 text-sm">{formatDate(selectedMessage.date)}</p>
                      </div>
                      {isParsing && (
                        <div className="flex items-center space-x-2 text-purple-300">
                          <Brain className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">AI Analyzing...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                      <h5 className="text-white font-semibold mb-3">Email Content:</h5>
                      <div className="text-indigo-200 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {selectedMessage.body.text}
                      </div>
                    </div>

                    {/* AI Analysis Results */}
                    {parsedData && (
                      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-xl font-bold text-white flex items-center">
                            <Brain className="w-5 h-5 mr-2 text-purple-400" />
                            AI Analysis Results
                          </h5>
                          <div className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm">
                            {Math.round(parsedData.confidence * 100)}% Confidence
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm text-indigo-300">Contact:</span>
                              <p className="text-white font-semibold">{parsedData.contactName}</p>
                            </div>
                            <div>
                              <span className="text-sm text-indigo-300">Email:</span>
                              <p className="text-white font-semibold">{parsedData.email}</p>
                            </div>
                            <div>
                              <span className="text-sm text-indigo-300">Company:</span>
                              <p className="text-white font-semibold">{parsedData.company}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm text-indigo-300">Date & Time:</span>
                              <p className="text-white font-semibold">{parsedData.datetime}</p>
                            </div>
                            <div>
                              <span className="text-sm text-indigo-300">Intent:</span>
                              <div className={`inline-block px-3 py-1 rounded-lg border ${getIntentColor(parsedData.intent)}`}>
                                <span className="font-semibold capitalize">
                                  {parsedData.intent.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-sm text-indigo-300">Participants:</span>
                              <p className="text-white font-semibold">
                                {parsedData.participants.join(', ') || 'None specified'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Schedule Button */}
                        {parsedData.intent === 'schedule_meeting' && (
                          <button
                            onClick={handleScheduleMeeting}
                            disabled={isScheduling}
                            className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                          >
                            {isScheduling ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Calendar className="w-5 h-5" />
                            )}
                            <span>{isScheduling ? 'Scheduling...' : 'Schedule Meeting'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <p className="text-white text-lg">Select an email to analyze</p>
                    <p className="text-indigo-200">AI will automatically detect meeting intents</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Integration - Auto-triggered when Schedule button is clicked */}
      {parsedData && parsedData.intent === 'schedule_meeting' && isScheduling && (
        <CalendarIntegration 
          parsedData={parsedData}
          emailContent={selectedMessage?.body.text}
          onScheduled={(event) => {
            console.log('✅ Meeting scheduled successfully:', event);
            setIsScheduling(false);
          }}
        />
      )}
    </div>
  );
};

export default GmailRoom;