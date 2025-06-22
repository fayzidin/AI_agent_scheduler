import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Inbox, 
  Star, 
  Archive, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw, 
  Settings,
  Plus,
  Users,
  Calendar,
  Brain,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { emailService } from '../services/emailService';
import { EmailProvider, EmailRoom, EmailMessage, EmailFilter } from '../types/email';
import { useAuth } from '../contexts/AuthContext';

const EmailDashboard: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [rooms, setRooms] = useState<EmailRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<EmailRoom | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<EmailFilter>({});
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    loadProviders();
    loadRooms();
    
    // Start auto-sync
    emailService.startAutoSync();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages();
    }
  }, [selectedRoom, filter]);

  const loadProviders = () => {
    setProviders(emailService.getProviders());
  };

  const loadRooms = () => {
    setRooms(emailService.getRooms());
    
    // Auto-select first room if none selected
    const availableRooms = emailService.getRooms();
    if (availableRooms.length > 0 && !selectedRoom) {
      setSelectedRoom(availableRooms[0]);
    }
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;

    setIsLoading(true);
    try {
      const roomMessages = await emailService.getMessages(selectedRoom.id, {
        ...filter,
        query: searchQuery
      });
      setMessages(roomMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectProvider = async (providerId: string) => {
    if (!user) {
      setConnectionError('Please sign in to connect email providers');
      return;
    }

    setIsConnecting(providerId);
    setConnectionError('');
    
    try {
      console.log(`🔗 Connecting to ${providerId}...`);
      
      const success = await emailService.connectProvider(providerId);
      if (success) {
        loadProviders();
        loadRooms();
        
        console.log(`✅ Successfully connected to ${providerId}!`);
      } else {
        throw new Error('Failed to connect to email provider');
      }
    } catch (error: any) {
      console.error('Failed to connect provider:', error);
      
      let errorMessage = error.message || 'Failed to connect to email provider';
      
      if (error.message?.includes('redirect_uri_mismatch')) {
        errorMessage = 'OAuth configuration error. Please check the setup guide for instructions.';
      } else if (error.message?.includes('not configured')) {
        errorMessage = 'Email API not configured. Please add your API credentials to environment variables.';
      }
      
      setConnectionError(errorMessage);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnectProvider = async (providerId: string) => {
    try {
      await emailService.disconnectProvider(providerId);
      loadProviders();
      loadRooms();
      
      // Clear selected room if it belonged to disconnected provider
      if (selectedRoom && selectedRoom.providerId === providerId) {
        setSelectedRoom(null);
        setMessages([]);
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Failed to disconnect provider:', error);
    }
  };

  const handleSyncRoom = async () => {
    if (!selectedRoom) return;

    setIsSyncing(true);
    try {
      await emailService.syncRoom(selectedRoom.id);
      loadRooms();
      loadMessages();
    } catch (error) {
      console.error('Failed to sync room:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    if (!selectedRoom) return;

    try {
      await emailService.markMessageAsRead(selectedRoom.id, messageId);
      loadMessages();
      loadRooms(); // Update unread count
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleStarMessage = async (messageId: string, starred: boolean) => {
    if (!selectedRoom) return;

    try {
      await emailService.starMessage(selectedRoom.id, messageId, starred);
      loadMessages();
    } catch (error) {
      console.error('Failed to star message:', error);
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

  const getProviderStatus = (provider: EmailProvider) => {
    if (provider.id === 'gmail' && !provider.connected) {
      return { status: 'disconnected', message: 'Not connected' };
    }
    return { status: provider.connected ? 'connected' : 'disconnected', message: provider.connected ? 'Connected' : 'Not connected' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              📧 Email Management Dashboard
            </h1>
            <p className="text-xl text-indigo-200">
              Unified inbox with AI-powered meeting detection and scheduling
            </p>
          </div>

          {/* Email Providers Section */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Plus className="w-6 h-6 mr-3" />
                Connect Email Providers
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {providers.map((provider) => {
                const providerStatus = getProviderStatus(provider);
                
                return (
                  <div
                    key={provider.id}
                    className={`p-6 rounded-xl border transition-all duration-200 ${
                      providerStatus.status === 'connected'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-white/10 border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-3xl mr-4">{provider.icon}</span>
                        <div>
                          <p className="text-white font-semibold text-lg">{provider.name}</p>
                          <p className={`text-sm ${
                            providerStatus.status === 'connected' ? 'text-green-300' : 'text-slate-400'
                          }`}>
                            {providerStatus.message}
                          </p>
                          {provider.accountInfo && (
                            <p className="text-indigo-200 text-sm">
                              {provider.accountInfo.email}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {providerStatus.status === 'connected' ? (
                        <button
                          onClick={() => handleDisconnectProvider(provider.id)}
                          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-200"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnectProvider(provider.id)}
                          disabled={isConnecting === provider.id || !user}
                          className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                        >
                          {isConnecting === provider.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
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
              <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                  <div>
                    <p className="text-red-300 font-semibold">Connection Failed</p>
                    <p className="text-red-200 text-sm">{connectionError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sign In Required Notice */}
            {!user && (
              <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-blue-400 mr-3" />
                  <div>
                    <h5 className="text-blue-300 font-semibold">Sign In Required</h5>
                    <p className="text-blue-200 text-sm">
                      Please sign in to your account to connect email providers and access your unified inbox.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Email Rooms & Messages */}
          {rooms.length > 0 && (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="flex h-[600px]">
                {/* Sidebar - Rooms */}
                <div className="w-80 bg-white/5 border-r border-white/10 flex flex-col">
                  <div className="p-6 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white flex items-center">
                      <Inbox className="w-5 h-5 mr-2" />
                      Email Rooms
                    </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/10 transition-all duration-200 ${
                          selectedRoom?.id === room.id ? 'bg-blue-500/20 border-blue-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-white font-semibold truncate">{room.name}</p>
                            <p className="text-indigo-200 text-sm">{room.accountEmail}</p>
                            <p className="text-indigo-300 text-xs">
                              Last sync: {formatDate(room.lastSyncTime)}
                            </p>
                          </div>
                          {room.unreadCount > 0 && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                  {selectedRoom ? (
                    <>
                      {/* Toolbar */}
                      <div className="p-6 border-b border-white/10 bg-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <h3 className="text-xl font-bold text-white">
                              {selectedRoom.name}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={handleSyncRoom}
                                disabled={isSyncing}
                                className="p-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50"
                                title="Sync emails"
                              >
                                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                              </button>
                              <button className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200">
                                <Settings className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-300" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search emails..."
                                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <button className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200">
                              <Filter className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Messages List */}
                      <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                              <p className="text-white">Loading emails...</p>
                            </div>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <Mail className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                              <p className="text-white text-lg">No emails found</p>
                              <p className="text-indigo-200">Try syncing or adjusting your filters</p>
                            </div>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {messages.map((message) => (
                              <div
                                key={message.id}
                                onClick={() => setSelectedMessage(message)}
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
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkAsRead(message.id);
                                        }}
                                        className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                        title="Mark as read"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStarMessage(message.id, !message.isStarred);
                                      }}
                                      className={`p-1 transition-colors ${
                                        message.isStarred 
                                          ? 'text-yellow-400 hover:text-yellow-300' 
                                          : 'text-indigo-400 hover:text-indigo-300'
                                      }`}
                                      title={message.isStarred ? 'Remove star' : 'Add star'}
                                    >
                                      <Star className={`w-4 h-4 ${message.isStarred ? 'fill-current' : ''}`} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Inbox className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                        <p className="text-white text-lg">Select an email room</p>
                        <p className="text-indigo-200">Choose a connected email account to view messages</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No Rooms Connected */}
          {rooms.length === 0 && user && (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 text-center">
              <Mail className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">
                No Email Accounts Connected
              </h3>
              <p className="text-indigo-200 text-lg mb-8">
                Connect your Gmail or Outlook account to start managing emails with AI assistance
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Brain className="w-6 h-6 text-purple-400" />
                <span className="text-purple-200">AI-Powered</span>
                <Calendar className="w-6 h-6 text-green-400" />
                <span className="text-green-200">Auto-Scheduling</span>
                <Users className="w-6 h-6 text-blue-400" />
                <span className="text-blue-200">CRM Integration</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDashboard;