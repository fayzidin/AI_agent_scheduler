import React, { useState, useEffect } from 'react';
import { Mail, Calendar, Users, Clock, Star, CheckCircle, AlertCircle, Loader2, Send, Brain, RefreshCw, ExternalLink, Shield, Settings, Info, Filter, Inbox, MailSearch as MarkEmailRead } from 'lucide-react';
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
  const [userInfo, setUserInfo] = useState<any>(null);
  const [emailFilter, setEmailFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [showCalendarIntegration, setShowCalendarIntegration] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [authAttempts, setAuthAttempts] = useState(0);
  const [showSimpleInstructions, setShowSimpleInstructions] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchUserInfo();
      fetchEmails();
    }
  }, [isConnected, emailFilter]);

  const checkConnection = () => {
    const connected = gmailService.isConnected();
    setIsConnected(connected);
    
    if (connected) {
      console.log('✅ Gmail already connected');
    }
  };

  const fetchUserInfo = async () => {
    try {
      console.log('👤 Fetching Gmail user info...');
      const info = await gmailService.getUserInfo();
      setUserInfo(info);
      setConnectionError(''); // Clear any previous errors
      console.log('✅ Gmail user info loaded:', info);
    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      setConnectionError('Failed to get user information. Please try reconnecting.');
    }
  };

  const handleConnect = async () => {
    if (!user) {
      setConnectionError('Please sign in to connect Gmail');
      return;
    }

    setIsConnecting(true);
    setConnectionError('');
    setAuthAttempts(prev => prev + 1);
    setShowSimpleInstructions(true);
    
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
        
        // Fetch user info and emails
        console.log('📧 Step 4: Loading user info and emails...');
        await fetchUserInfo();
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
      } else if (error.message?.includes('popup_closed') || error.message?.includes('Popup window closed')) {
        errorMessage = 'Authentication canceled. The sign-in popup was closed before completion. Please try again and complete the sign-in process.';
        setShowTroubleshooting(true);
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
      setUserInfo(null);
      setConnectionError('');
      setShowCalendarIntegration(false);
      console.log('✅ Disconnected from Gmail successfully');
    } catch (error) {
      console.error('❌ Failed to disconnect Gmail:', error);
    }
  };

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      console.log(`📧 Fetching ${emailFilter} emails from Gmail...`);
      
      // Build filter based on selection
      const filter: any = {};
      if (emailFilter === 'unread') {
        filter.isRead = false;
      } else if (emailFilter === 'read') {
        filter.isRead = true;
      }
      // For 'all', we don't set any read filter
      
      const recentEmails = await gmailService.getMessages(filter, 50);
      setMessages(recentEmails);
      
      console.log(`✅ Fetched ${recentEmails.length} ${emailFilter} emails from Gmail`);
      
      // Auto-select first email with meeting intent if no message is selected
      if (!selectedMessage && recentEmails.length > 0) {
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
    setShowCalendarIntegration(false);
    
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
        setParsedData(null);
      }
    } catch (error) {
      console.error('❌ Failed to parse email with AI:', error);
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!parsedData || !selectedMessage) {
      console.error('❌ No parsed data or selected message for scheduling');
      return;
    }

    console.log(`📅 Starting meeting scheduling process for: ${parsedData.contactName}`);
    setIsScheduling(true);
    setShowCalendarIntegration(true);
    
    try {
      // The CalendarIntegration component will handle the actual scheduling
      console.log('✅ Calendar integration component will handle scheduling');
    } catch (error) {
      console.error('❌ Failed to initiate scheduling:', error);
      setShowCalendarIntegration(false);
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

  const getMessageIcon = (message: EmailMessage) => {
    // Check if message has potential issues
    const hasEncodingIssues = message.body.text.includes('â') || 
                             message.body.text.includes('Ã') ||
                             message.body.text.includes('Â');
    
    if (hasEncodingIssues) {
      return <AlertCircle className="w-4 h-4 text-orange-400" title="Encoding issues detected" />;
    }
    
    if (!message.isRead) {
      return <Mail className="w-4 h-4 text-blue-400" />;
    }
    
    return <MarkEmailRead className="w-4 h-4 text-gray-400" />;
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
                {isConnected ? 'Connected to real Gmail' : 'Connect your Gmail account'}
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

        {/* Simple Instructions */}
        {showSimpleInstructions && !isConnected && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center mb-3">
              <Info className="w-5 h-5 text-blue-400 mr-3" />
              <h5 className="text-blue-300 font-semibold">Simple Connection Instructions</h5>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-blue-200 text-sm">
              <li><strong>Before connecting:</strong> Make sure you're already signed into your Google account in another browser tab</li>
              <li><strong>When the consent screen appears:</strong> Select your Google account and click "Continue"</li>
              <li><strong>Grant permissions:</strong> Click "Continue" to allow access to your Gmail</li>
              <li><strong>Wait for completion:</strong> The process will finish automatically</li>
            </ol>
          </div>
        )}

        {/* API Configuration Status */}
        <div className="mb-6">
          {isGmailConfigured() ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-green-400 mr-3" />
                <div>
                  <h5 className="text-green-300 font-semibold">Real Gmail API Configured</h5>
                  <p className="text-green-200 text-sm">
                    Connected to your actual Gmail account with full API access. You'll see your real emails and can interact with them.
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

        {/* User Info Display */}
        {isConnected && userInfo && (
          <div className="mb-6 bg-white/5 rounded-xl p-4">
            <div className="flex items-center">
              <img
                src={userInfo.picture}
                alt={userInfo.name}
                className="w-10 h-10 rounded-lg mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.name)}&background=4285f4&color=fff&size=40`;
                }}
              />
              <div>
                <h5 className="text-white font-semibold">{userInfo.name}</h5>
                <p className="text-indigo-200 text-sm">{userInfo.email}</p>
              </div>
              <div className="ml-auto">
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">
                  {isGmailConfigured() ? 'Real Gmail' : 'Mock Mode'}
                </span>
              </div>
            </div>
          </div>
        )}

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
                
                {connectionError.includes('popup') && (
                  <div className="mt-3 text-red-200 text-sm">
                    <p className="font-semibold">Popup Troubleshooting:</p>
                    <ol className="list-decimal list-inside space-y-1 mt-1">
                      <li>Make sure you're already signed into your Google account in another tab</li>
                      <li>When the popup appears, complete the sign-in process quickly</li>
                      <li>Try using Chrome or Edge browser for better compatibility</li>
                      <li>Disable any popup blocker extensions</li>
                      <li>Try using incognito/private browsing mode</li>
                    </ol>
                    <button 
                      onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                      className="mt-2 text-red-300 hover:text-red-200 underline text-sm"
                    >
                      {showTroubleshooting ? "Hide detailed troubleshooting" : "Show detailed troubleshooting"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Retry button for authentication errors */}
            {(connectionError.includes('authentication') || 
              connectionError.includes('popup') || 
              connectionError.includes('OAuth') ||
              connectionError.includes('closed')) && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Detailed troubleshooting guide */}
        {showTroubleshooting && (
          <div className="mt-4 p-4 bg-red-500/20 rounded-lg">
            <h5 className="text-red-300 font-semibold mb-2">Detailed Troubleshooting Guide</h5>
            
            <div className="space-y-3 text-red-200 text-sm">
              <p><strong>1. Browser Compatibility:</strong> Google's authentication works best with Chrome and Edge. Firefox and Safari may have stricter security settings that can interfere with the authentication popup.</p>
              
              <p><strong>2. Sign in to Google first:</strong> Before connecting, sign in to your Google account in another tab. This makes the authentication process much faster and more reliable.</p>
              
              <p><strong>3. Clear browser data:</strong> Go to your browser settings and clear cookies and site data specifically for accounts.google.com.</p>
              
              <p><strong>4. Disable extensions:</strong> Temporarily disable any privacy or ad-blocking extensions that might interfere with popups or third-party cookies.</p>
              
              <p><strong>5. Try incognito/private mode:</strong> This can bypass some browser extensions and cached credentials that might be causing issues.</p>
              
              <p><strong>6. Check for multiple Google accounts:</strong> If you have multiple Google accounts, the selection process in the popup might time out. Try signing out of all accounts except the one you want to use.</p>
              
              <p><strong>7. Allow third-party cookies:</strong> Make sure your browser allows third-party cookies, at least for accounts.google.com.</p>
              
              <p><strong>8. Check your internet connection:</strong> A slow or unstable connection can cause the authentication process to time out.</p>
            </div>
            
            <div className="mt-4 p-3 bg-blue-500/20 rounded-lg border border-blue-500/20">
              <p className="text-blue-200 text-sm">
                <strong>Alternative approach:</strong> If you continue to have issues, try refreshing the page and attempting to connect again. Sometimes the authentication flow works better on a fresh page load.
              </p>
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
                <Inbox className="w-6 h-6 mr-3 text-blue-400" />
                {isGmailConfigured() ? 'Your Gmail Inbox' : 'Sample Messages'} ({messages.length})
              </h3>
              
              {/* Email Filter */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-indigo-300" />
                  <select
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value as 'all' | 'unread' | 'read')}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all" className="bg-slate-800">All Messages</option>
                    <option value="unread" className="bg-slate-800">Unread Only</option>
                    <option value="read" className="bg-slate-800">Read Only</option>
                  </select>
                </div>
                
                <div className="text-sm text-indigo-200">
                  {isLoading ? 'Loading emails...' : 'Click an email to parse with AI'}
                </div>
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
                    <p className="text-white text-lg">No {emailFilter} emails found</p>
                    <p className="text-indigo-200">
                      {emailFilter === 'all' ? 'Your inbox appears to be empty' : 
                       emailFilter === 'unread' ? 'No unread emails' : 'No read emails'}
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
                          {getMessageIcon(message)}
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
                      
                      {/* Encoding Warning */}
                      {(selectedMessage.body.text.includes('â') || selectedMessage.body.text.includes('Ã')) && (
                        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 text-orange-400 mr-2" />
                            <p className="text-orange-300 text-xs">
                              Text encoding issues detected. This may affect AI parsing accuracy.
                            </p>
                          </div>
                        </div>
                      )}
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

                        {/* Schedule Button - Only show for schedule_meeting intent */}
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
                            <span>{isScheduling ? 'Preparing Schedule...' : 'Schedule Meeting'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Show message if no meeting intent detected */}
                    {!isParsing && !parsedData && selectedMessage && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                        <div className="flex items-center">
                          <Info className="w-5 h-5 text-yellow-400 mr-3" />
                          <div>
                            <p className="text-yellow-300 font-semibold">No Meeting Intent Detected</p>
                            <p className="text-yellow-200 text-sm">
                              This email doesn't appear to contain meeting scheduling information. Try selecting an email with meeting requests.
                            </p>
                          </div>
                        </div>
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

      {/* Calendar Integration - Show when Schedule button is clicked */}
      {showCalendarIntegration && parsedData && parsedData.intent === 'schedule_meeting' && (
        <CalendarIntegration 
          parsedData={parsedData}
          emailContent={selectedMessage?.body.text}
          onScheduled={(event) => {
            console.log('✅ Meeting scheduled successfully:', event);
            setShowCalendarIntegration(false);
            setIsScheduling(false);
          }}
        />
      )}
      
      {/* Troubleshooting Guide for Authentication Issues */}
      {(authAttempts > 1 || showTroubleshooting) && !isConnected && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-bold text-white flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-400" />
              Gmail Authentication Troubleshooting
            </h4>
            <button 
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              className="text-blue-300 hover:text-blue-200 text-sm"
            >
              {showTroubleshooting ? "Hide Details" : "Show Details"}
            </button>
          </div>
          
          {showTroubleshooting && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h5 className="text-white font-semibold mb-3">Common Issues & Solutions</h5>
                
                <div className="space-y-4 text-indigo-200 text-sm">
                  <div>
                    <p className="font-semibold text-blue-300">Popup Closing Too Quickly</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>Sign in to your Google account in another tab <strong>before</strong> connecting</li>
                      <li>When the popup appears, click your account immediately</li>
                      <li>Complete the authentication process quickly</li>
                      <li>Don't close the popup until authentication completes</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-blue-300">Browser Compatibility</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>Chrome and Edge work best with Google authentication</li>
                      <li>Firefox and Safari may have stricter security settings</li>
                      <li>Try using incognito/private browsing mode</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-blue-300">Multiple Google Accounts</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>If you have multiple Google accounts, the selection process might time out</li>
                      <li>Try signing out of all accounts except the one you want to use</li>
                      <li>Or select your account quickly when prompted</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-blue-300">Browser Settings</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>Allow popups for this site</li>
                      <li>Allow third-party cookies (at least for accounts.google.com)</li>
                      <li>Disable any privacy extensions temporarily</li>
                      <li>Clear browser cache and cookies</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <h5 className="text-green-300 font-semibold mb-2">Step-by-Step Guide</h5>
                <ol className="list-decimal list-inside space-y-2 text-green-200 text-sm">
                  <li>Open a new tab and sign in to your Google account</li>
                  <li>Return to this tab and click "Connect Gmail"</li>
                  <li>When the popup appears, select your account immediately</li>
                  <li>Grant the requested permissions</li>
                  <li>Wait for the popup to close automatically</li>
                </ol>
              </div>
              
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-3"
                >
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                  <span>Try Connecting Again</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GmailRoom;