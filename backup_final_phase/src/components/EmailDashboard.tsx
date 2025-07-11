import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Plus,
  Settings,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { gmailService } from '../services/gmailService';
import { outlookService } from '../services/outlookService';
import { isGmailConfigured } from '../config/gmail';
import { isOutlookConfigured } from '../config/outlook';
import GmailRoom from './GmailRoom';
import OutlookRoom from './OutlookRoom';
import AddAccountModal from './AddAccountModal';

interface ConnectedAccount {
  id: string;
  type: 'gmail' | 'outlook' | 'yahoo' | 'imap';
  email: string;
  name: string;
  avatar?: string;
  isConnected: boolean;
  lastSync?: string;
  unreadCount?: number;
  status: 'active' | 'error' | 'syncing' | 'disconnected';
  errorMessage?: string;
}

const EmailDashboard: React.FC = () => {
  const { user } = useAuth();
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadConnectedAccounts();
    }
  }, [user]);

  // Load connected accounts from localStorage and check their status
  const loadConnectedAccounts = async () => {
    setIsLoading(true);
    try {
      // Load persisted accounts from localStorage
      const persistedAccounts = loadPersistedAccounts();
      
      // Check Gmail connection status
      const isGmailConnected = gmailService.isConnected();
      const accounts: ConnectedAccount[] = [...persistedAccounts];

      if (isGmailConnected) {
        try {
          const userInfo = await gmailService.getUserInfo();
          const unreadCount = await gmailService.getUnreadCount();
          
          const gmailAccountId = 'gmail-' + userInfo.email;
          
          // Check if this Gmail account is already in persisted accounts
          const existingAccountIndex = accounts.findIndex(acc => acc.id === gmailAccountId);
          
          const gmailAccount: ConnectedAccount = {
            id: gmailAccountId,
            type: 'gmail',
            email: userInfo.email,
            name: userInfo.name || userInfo.email,
            avatar: userInfo.picture,
            isConnected: true,
            lastSync: new Date().toISOString(),
            unreadCount: unreadCount,
            status: 'active'
          };
          
          if (existingAccountIndex >= 0) {
            // Update existing account
            accounts[existingAccountIndex] = gmailAccount;
          } else {
            // Add new account
            accounts.push(gmailAccount);
          }
          
          // Persist the updated accounts
          persistAccounts(accounts);
          
        } catch (error) {
          console.error('Failed to get Gmail user info:', error);
          // Still show the account but with error status
          const errorAccount: ConnectedAccount = {
            id: 'gmail-error',
            type: 'gmail',
            email: 'Gmail Account',
            name: 'Gmail Account',
            isConnected: true,
            status: 'error',
            errorMessage: 'Failed to load account details. Please refresh or reconnect.'
          };
          accounts.push(errorAccount);
        }
      }

      // Check Outlook connection status
      const isOutlookConnected = outlookService.isConnected();
      
      if (isOutlookConnected) {
        try {
          const userInfo = await outlookService.getUserInfo();
          const unreadCount = await outlookService.getUnreadCount();
          
          const outlookAccountId = 'outlook-' + userInfo.email;
          
          // Check if this Outlook account is already in persisted accounts
          const existingAccountIndex = accounts.findIndex(acc => acc.id === outlookAccountId);
          
          const outlookAccount: ConnectedAccount = {
            id: outlookAccountId,
            type: 'outlook',
            email: userInfo.email,
            name: userInfo.name || userInfo.email,
            avatar: userInfo.picture,
            isConnected: true,
            lastSync: new Date().toISOString(),
            unreadCount: unreadCount,
            status: 'active'
          };
          
          if (existingAccountIndex >= 0) {
            // Update existing account
            accounts[existingAccountIndex] = outlookAccount;
          } else {
            // Add new account
            accounts.push(outlookAccount);
          }
          
          // Persist the updated accounts
          persistAccounts(accounts);
          
        } catch (error) {
          console.error('Failed to get Outlook user info:', error);
          // Still show the account but with error status
          const errorAccount: ConnectedAccount = {
            id: 'outlook-error',
            type: 'outlook',
            email: 'Outlook Account',
            name: 'Outlook Account',
            isConnected: true,
            status: 'error',
            errorMessage: 'Failed to load account details. Please refresh or reconnect.'
          };
          accounts.push(errorAccount);
        }
      }

      setConnectedAccounts(accounts);
      
      // Auto-select first account if available and no account is currently selected
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0]);
      }
    } catch (error) {
      console.error('Failed to load connected accounts:', error);
      setConnectionError('Failed to load connected accounts. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load persisted accounts from localStorage
  const loadPersistedAccounts = (): ConnectedAccount[] => {
    try {
      const stored = localStorage.getItem('aima_connected_accounts');
      if (stored) {
        const accounts = JSON.parse(stored);
        console.log('📧 Loaded persisted accounts:', accounts.length);
        return accounts;
      }
    } catch (error) {
      console.error('Failed to load persisted accounts:', error);
    }
    return [];
  };

  // Persist accounts to localStorage
  const persistAccounts = (accounts: ConnectedAccount[]) => {
    try {
      localStorage.setItem('aima_connected_accounts', JSON.stringify(accounts));
      console.log('💾 Persisted accounts:', accounts.length);
    } catch (error) {
      console.error('Failed to persist accounts:', error);
    }
  };

  const handleAccountConnect = async (accountType: string) => {
    console.log(`🔗 Attempting to connect ${accountType} account...`);
    setConnectionError('');
    
    if (accountType === 'gmail') {
      try {
        console.log('📧 Starting Gmail connection process...');
        
        // Check if Gmail is configured
        if (!isGmailConfigured()) {
          console.warn('⚠️ Gmail API not configured - will use mock mode');
        }
        
        const success = await gmailService.signIn();
        
        if (success) {
          console.log('✅ Gmail connection successful!');
          await loadConnectedAccounts(); // This will persist the account
          setShowAddAccountModal(false);
        } else {
          console.error('❌ Gmail connection returned false');
          throw new Error('Gmail authentication failed');
        }
      } catch (error: any) {
        console.error('❌ Gmail connection failed:', error);
        
        // Show user-friendly error message
        let errorMessage = 'Failed to connect Gmail account';
        
        if (error.message?.includes('redirect_uri_mismatch')) {
          errorMessage = 'OAuth configuration error. Please check the Google Cloud Console setup.';
        } else if (error.message?.includes('not configured')) {
          errorMessage = 'Gmail API not configured. Please add your Google API credentials.';
        } else if (error.message?.includes('popup_blocked')) {
          errorMessage = 'Popup blocked. Please allow popups for this site and try again.';
        } else if (error.message?.includes('access_denied')) {
          errorMessage = 'Access denied. Please grant permission to access your Gmail account.';
        } else if (error.message?.includes('popup_closed')) {
          errorMessage = 'Authentication canceled. The sign-in popup was closed before completion. Please try again and complete the sign-in process.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setConnectionError(errorMessage);
      }
    } else if (accountType === 'outlook') {
      try {
        console.log('📧 Starting Outlook connection process...');
        
        // Check if Outlook is configured
        if (!isOutlookConfigured()) {
          console.warn('⚠️ Outlook API not configured - will use mock mode');
        }
        
        const success = await outlookService.signIn();
        
        if (success) {
          console.log('✅ Outlook connection successful!');
          await loadConnectedAccounts(); // This will persist the account
          setShowAddAccountModal(false);
        } else {
          console.error('❌ Outlook connection returned false');
          throw new Error('Outlook authentication failed');
        }
      } catch (error: any) {
        console.error('❌ Outlook connection failed:', error);
        
        // Show user-friendly error message
        let errorMessage = 'Failed to connect Outlook account';
        
        if (error.message?.includes('not configured')) {
          errorMessage = 'Outlook API not configured. Please add your Microsoft API credentials.';
        } else if (error.message?.includes('popup_blocked')) {
          errorMessage = 'Popup blocked. Please allow popups for this site and try again.';
        } else if (error.message?.includes('access_denied')) {
          errorMessage = 'Access denied. Please grant permission to access your Outlook account.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setConnectionError(errorMessage);
      }
    }
    // Other account types will be implemented in future steps
  };

  const handleAccountDisconnect = async (accountId: string) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (!account) return;

    try {
      console.log(`🚪 Disconnecting ${account.type} account...`);
      
      if (account.type === 'gmail') {
        await gmailService.signOut();
      } else if (account.type === 'outlook') {
        await outlookService.signOut();
      }
      
      // Remove from connected accounts
      const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
      setConnectedAccounts(updatedAccounts);
      
      // Persist the updated accounts
      persistAccounts(updatedAccounts);
      
      // Clear selection if this was the selected account
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(null);
      }
      
      console.log('✅ Account disconnected successfully');
    } catch (error) {
      console.error('❌ Failed to disconnect account:', error);
      setConnectionError('Failed to disconnect account. Please try again.');
    }
  };

  const handleAccountRefresh = async (accountId: string) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (!account) return;

    console.log(`🔄 Refreshing ${account.type} account...`);
    setConnectionError('');

    // Update account status to syncing
    setConnectedAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, status: 'syncing' } : acc
    ));

    try {
      if (account.type === 'gmail') {
        // Try to get user info to verify connection
        const userInfo = await gmailService.getUserInfo();
        const unreadCount = await gmailService.getUnreadCount();
        
        // Update account with new data
        const updatedAccounts = connectedAccounts.map(acc => 
          acc.id === accountId ? { 
            ...acc, 
            status: 'active' as const,
            lastSync: new Date().toISOString(),
            unreadCount: unreadCount,
            name: userInfo.name || userInfo.email,
            email: userInfo.email,
            avatar: userInfo.picture,
            errorMessage: undefined
          } : acc
        );
        
        setConnectedAccounts(updatedAccounts);
        persistAccounts(updatedAccounts);
        
        console.log('✅ Account refreshed successfully');
      } else if (account.type === 'outlook') {
        // Try to get user info to verify connection
        const userInfo = await outlookService.getUserInfo();
        const unreadCount = await outlookService.getUnreadCount();
        
        // Update account with new data
        const updatedAccounts = connectedAccounts.map(acc => 
          acc.id === accountId ? { 
            ...acc, 
            status: 'active' as const,
            lastSync: new Date().toISOString(),
            unreadCount: unreadCount,
            name: userInfo.name || userInfo.email,
            email: userInfo.email,
            avatar: userInfo.picture,
            errorMessage: undefined
          } : acc
        );
        
        setConnectedAccounts(updatedAccounts);
        persistAccounts(updatedAccounts);
        
        console.log('✅ Account refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to refresh account:', error);
      setConnectedAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { 
          ...acc, 
          status: 'error' as const,
          errorMessage: 'Failed to refresh account. Please try reconnecting.'
        } : acc
      ));
      setConnectionError('Failed to refresh account. Please try reconnecting.');
    }
  };

  const getAccountStatusIcon = (status: ConnectedAccount['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'syncing':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'disconnected':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
          <AlertCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-4">Sign In Required</h3>
          <p className="text-indigo-200 text-lg">
            Please sign in to access your email dashboard and connect your accounts.
          </p>
        </div>
      </div>
    );
  }

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
              Connect and manage your email accounts with AI-powered meeting detection
            </p>
          </div>

          {/* Connection Error Display */}
          {connectionError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                <div>
                  <p className="text-red-300 font-semibold">Connection Error</p>
                  <p className="text-red-200 text-sm">{connectionError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar - Account Management */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Connected Accounts</h2>
                  <button
                    onClick={() => setShowAddAccountModal(true)}
                    className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    title="Add Account"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="text-white ml-2">Loading accounts...</span>
                  </div>
                ) : connectedAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-2">No accounts connected</p>
                    <p className="text-indigo-200 text-sm mb-4">
                      Connect your first email account to get started
                    </p>
                    <button
                      onClick={() => setShowAddAccountModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                    >
                      Add Account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connectedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                          selectedAccount?.id === account.id
                            ? 'bg-blue-500/20 border-blue-400'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                        onClick={() => setSelectedAccount(account)}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Account Avatar */}
                          <div className="relative">
                            {account.avatar ? (
                              <img
                                src={account.avatar}
                                alt={account.name}
                                className="w-10 h-10 rounded-lg object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}&background=${account.type === 'gmail' ? '4285f4' : '0078d4'}&color=fff&size=40`;
                                }}
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                account.type === 'gmail' 
                                  ? 'bg-gradient-to-r from-red-500 to-orange-600' 
                                  : 'bg-gradient-to-r from-blue-500 to-blue-700'
                              }`}>
                                <Mail className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1">
                              {getAccountStatusIcon(account.status)}
                            </div>
                          </div>

                          {/* Account Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-semibold text-sm truncate">
                                {account.name}
                              </p>
                              <span className="text-xs px-2 py-1 bg-white/10 text-white rounded">
                                {account.type === 'gmail' ? 'GMAIL' : 'OUTLOOK'}
                              </span>
                            </div>
                            <p className="text-indigo-200 text-xs truncate">{account.email}</p>
                            
                            {/* Account Stats */}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-indigo-300">
                                {account.unreadCount !== undefined ? `${account.unreadCount} unread` : 'No data'}
                              </span>
                              <span className="text-xs text-indigo-300">
                                {formatLastSync(account.lastSync)}
                              </span>
                            </div>
                          </div>

                          {/* Account Actions */}
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAccountRefresh(account.id);
                              }}
                              disabled={account.status === 'syncing'}
                              className="p-1 text-indigo-300 hover:text-white hover:bg-white/10 rounded transition-all duration-200"
                              title="Refresh"
                            >
                              <RefreshCw className={`w-3 h-3 ${account.status === 'syncing' ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAccountDisconnect(account.id);
                              }}
                              className="p-1 text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded transition-all duration-200"
                              title="Disconnect"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Error Message */}
                        {account.status === 'error' && account.errorMessage && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-300 text-xs">{account.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Account Details Toggle */}
                {connectedAccounts.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <button
                      onClick={() => setShowAccountDetails(!showAccountDetails)}
                      className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200"
                    >
                      <span className="text-white text-sm font-semibold">Account Details</span>
                      {showAccountDetails ? (
                        <EyeOff className="w-4 h-4 text-indigo-300" />
                      ) : (
                        <Eye className="w-4 h-4 text-indigo-300" />
                      )}
                    </button>

                    {showAccountDetails && selectedAccount && (
                      <div className="mt-4 space-y-3">
                        <div className="bg-white/5 rounded-lg p-3">
                          <h4 className="text-white font-semibold text-sm mb-2">Account Information</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-indigo-300">Type:</span>
                              <span className="text-white">{selectedAccount.type.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-indigo-300">Status:</span>
                              <span className={`${
                                selectedAccount.status === 'active' ? 'text-green-300' :
                                selectedAccount.status === 'error' ? 'text-red-300' :
                                'text-yellow-300'
                              }`}>
                                {selectedAccount.status.charAt(0).toUpperCase() + selectedAccount.status.slice(1)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-indigo-300">Last Sync:</span>
                              <span className="text-white">{formatLastSync(selectedAccount.lastSync)}</span>
                            </div>
                            {selectedAccount.unreadCount !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-indigo-300">Unread:</span>
                                <span className="text-white">{selectedAccount.unreadCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {selectedAccount ? (
                <div>
                  {selectedAccount.type === 'gmail' && selectedAccount.status === 'active' && (
                    <GmailRoom />
                  )}
                  
                  {selectedAccount.type === 'outlook' && selectedAccount.status === 'active' && (
                    <OutlookRoom />
                  )}
                  
                  {selectedAccount.status === 'error' && (
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 text-center">
                      <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
                      <h3 className="text-2xl font-bold text-white mb-4">Account Error</h3>
                      <p className="text-red-200 text-lg mb-8">
                        {selectedAccount.errorMessage || 'There was an error with this account'}
                      </p>
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => handleAccountRefresh(selectedAccount.id)}
                          className="px-6 py-3 bg-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/30 transition-all duration-200"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={() => handleAccountDisconnect(selectedAccount.id)}
                          className="px-6 py-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-all duration-200"
                        >
                          Remove Account
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedAccount.status === 'disconnected' && (
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 text-center">
                      <Mail className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
                      <h3 className="text-2xl font-bold text-white mb-4">Account Disconnected</h3>
                      <p className="text-indigo-200 text-lg mb-8">
                        This account has been disconnected. Reconnect to access your emails.
                      </p>
                      <button
                        onClick={() => handleAccountConnect(selectedAccount.type)}
                        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        Reconnect Account
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 text-center">
                  <Mail className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-4">Welcome to Your Email Dashboard</h3>
                  <p className="text-indigo-200 text-lg mb-8">
                    Connect your first email account to start managing your emails with AI-powered meeting detection.
                  </p>
                  <button
                    onClick={() => setShowAddAccountModal(true)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Add Your First Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <AddAccountModal
          onClose={() => setShowAddAccountModal(false)}
          onAccountConnect={handleAccountConnect}
        />
      )}
    </div>
  );
};

export default EmailDashboard;