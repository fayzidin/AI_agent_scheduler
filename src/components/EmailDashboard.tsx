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
import GmailRoom from './GmailRoom';

const EmailDashboard: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [rooms, setRooms] = useState<EmailRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<EmailRoom | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('gmail'); // Default to Gmail
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

          {/* Provider Tabs */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 mb-8">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setSelectedProvider('gmail')}
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-200 ${
                  selectedProvider === 'gmail'
                    ? 'bg-red-500/20 border border-red-500/30 text-red-300'
                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <span className="text-2xl">📧</span>
                <span className="font-semibold">Gmail Room</span>
              </button>
              
              <button
                onClick={() => setSelectedProvider('outlook')}
                disabled={true} // Disabled for Step 1
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-200 opacity-50 cursor-not-allowed ${
                  selectedProvider === 'outlook'
                    ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                    : 'bg-white/10 border border-white/20 text-white'
                }`}
              >
                <span className="text-2xl">📮</span>
                <span className="font-semibold">Outlook Room</span>
                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">Step 2</span>
              </button>
            </div>
          </div>

          {/* Gmail Room Content */}
          {selectedProvider === 'gmail' && <GmailRoom />}

          {/* Outlook Room Placeholder */}
          {selectedProvider === 'outlook' && (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 text-center">
              <div className="text-6xl mb-6">📮</div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Outlook Integration Coming Soon
              </h3>
              <p className="text-indigo-200 text-lg mb-8">
                Outlook integration will be available in Step 2 of the development process
              </p>
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span>Step 2: Outlook Integration</span>
                </div>
              </div>
            </div>
          )}

          {/* Sign In Required Notice */}
          {!user && (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
              <AlertCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Sign In Required
              </h3>
              <p className="text-indigo-200 text-lg">
                Please sign in to your account to connect email providers and access the unified inbox
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDashboard;