import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Info,
  Lock,
  Eye,
  Settings,
  Zap
} from 'lucide-react';
import { isGmailConfigured } from '../config/gmail';

interface AddAccountModalProps {
  onClose: () => void;
  onAccountConnect: (accountType: string) => Promise<void>;
}

interface EmailProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  features: string[];
  status: 'available' | 'coming_soon' | 'configured' | 'not_configured';
  authMethod: 'oauth2' | 'imap' | 'both';
  securityLevel: 'high' | 'medium';
  setupComplexity: 'easy' | 'medium' | 'advanced';
  accessLevel: 'read_only' | 'full_access';
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onAccountConnect }) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');

  const emailProviders: EmailProvider[] = [
    {
      id: 'gmail',
      name: 'Gmail',
      icon: '📧',
      description: 'Connect your Google Gmail account with read-only access (no verification required)',
      features: [
        'Read emails and metadata',
        'AI meeting detection',
        'Contact extraction',
        'Email parsing',
        'Unread count tracking'
      ],
      status: isGmailConfigured() ? 'configured' : 'not_configured',
      authMethod: 'oauth2',
      securityLevel: 'high',
      setupComplexity: 'easy',
      accessLevel: 'read_only'
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      icon: '📮',
      description: 'Connect your Microsoft Outlook or Office 365 account',
      features: [
        'Office 365 integration',
        'Teams meeting support',
        'Exchange server sync',
        'Advanced calendar features',
        'Enterprise security'
      ],
      status: 'coming_soon',
      authMethod: 'oauth2',
      securityLevel: 'high',
      setupComplexity: 'easy',
      accessLevel: 'read_only'
    },
    {
      id: 'yahoo',
      name: 'Yahoo Mail',
      icon: '📬',
      description: 'Connect your Yahoo Mail account',
      features: [
        'Basic email sync',
        'Meeting detection',
        'Calendar export',
        'Contact sync'
      ],
      status: 'coming_soon',
      authMethod: 'both',
      securityLevel: 'medium',
      setupComplexity: 'medium',
      accessLevel: 'read_only'
    },
    {
      id: 'imap',
      name: 'Other Email (IMAP)',
      icon: '📨',
      description: 'Connect any email provider using IMAP/SMTP',
      features: [
        'Universal compatibility',
        'Custom server settings',
        'Basic email sync',
        'Manual configuration'
      ],
      status: 'coming_soon',
      authMethod: 'imap',
      securityLevel: 'medium',
      setupComplexity: 'advanced',
      accessLevel: 'read_only'
    }
  ];

  const handleConnect = async (providerId: string) => {
    const provider = emailProviders.find(p => p.id === providerId);
    if (!provider) return;

    if (provider.status === 'coming_soon') {
      setConnectionError(`${provider.name} integration is coming soon in the next update!`);
      return;
    }

    if (provider.status === 'not_configured') {
      setConnectionError(`${provider.name} API is not configured. Please check the setup documentation.`);
      return;
    }

    setIsConnecting(true);
    setConnectionError('');

    try {
      console.log(`🔗 Connecting to ${provider.name} with ${provider.accessLevel} access...`);
      await onAccountConnect(providerId);
      console.log(`✅ Successfully connected to ${provider.name}!`);
    } catch (error: any) {
      console.error(`❌ Failed to connect to ${provider.name}:`, error);
      
      let errorMessage = error.message || `Failed to connect ${provider.name}`;
      
      // Provide specific error messages for common OAuth issues
      if (error.message?.includes('access_denied')) {
        errorMessage = `Access denied. This may happen if:
        • You denied permission in the OAuth popup
        • The app requires verification for some scopes
        • Try again and make sure to grant all requested permissions`;
      } else if (error.message?.includes('redirect_uri_mismatch')) {
        errorMessage = 'OAuth configuration error. Please check the setup guide for instructions on configuring Google Cloud Console.';
      } else if (error.message?.includes('not configured')) {
        errorMessage = `${provider.name} API not configured. Please add your Google API credentials to environment variables.`;
      }
      
      setConnectionError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const getStatusBadge = (status: EmailProvider['status']) => {
    switch (status) {
      case 'configured':
        return (
          <span className="inline-flex items-center px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ready
          </span>
        );
      case 'not_configured':
        return (
          <span className="inline-flex items-center px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Setup Required
          </span>
        );
      case 'coming_soon':
        return (
          <span className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Coming Soon
          </span>
        );
      default:
        return null;
    }
  };

  const getAccessLevelBadge = (accessLevel: EmailProvider['accessLevel']) => {
    return accessLevel === 'read_only' ? (
      <span className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
        <Eye className="w-3 h-3 mr-1" />
        Read Only
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
        <Lock className="w-3 h-3 mr-1" />
        Full Access
      </span>
    );
  };

  const getSecurityIcon = (level: EmailProvider['securityLevel']) => {
    return level === 'high' ? (
      <Shield className="w-4 h-4 text-green-400" />
    ) : (
      <Shield className="w-4 h-4 text-yellow-400" />
    );
  };

  const getComplexityColor = (complexity: EmailProvider['setupComplexity']) => {
    switch (complexity) {
      case 'easy': return 'text-green-300';
      case 'medium': return 'text-yellow-300';
      case 'advanced': return 'text-red-300';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Add Email Account</h2>
            <p className="text-indigo-200 mt-1">Connect your email accounts to start managing them with AI</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Security Notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h3 className="text-blue-300 font-semibold text-sm">Secure Read-Only Access</h3>
                <p className="text-blue-200 text-sm mt-1">
                  We use OAuth 2.0 with read-only permissions to securely connect your accounts. 
                  We can only read your emails - we cannot send, delete, or modify anything.
                </p>
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Choose Your Email Provider</h3>
            
            {emailProviders.map((provider) => (
              <div
                key={provider.id}
                className={`p-6 rounded-xl border transition-all duration-200 cursor-pointer ${
                  selectedProvider === provider.id
                    ? 'bg-blue-500/20 border-blue-400'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                } ${
                  provider.status === 'coming_soon' || provider.status === 'not_configured'
                    ? 'opacity-75'
                    : ''
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Provider Icon */}
                    <div className="text-4xl">{provider.icon}</div>
                    
                    {/* Provider Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-xl font-bold text-white">{provider.name}</h4>
                        {getStatusBadge(provider.status)}
                        {getAccessLevelBadge(provider.accessLevel)}
                      </div>
                      
                      <p className="text-indigo-200 mb-3">{provider.description}</p>
                      
                      {/* Features */}
                      <div className="grid md:grid-cols-2 gap-2 mb-4">
                        {provider.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-indigo-200 text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Technical Details */}
                      <div className="flex items-center space-x-6 text-xs">
                        <div className="flex items-center space-x-1">
                          {getSecurityIcon(provider.securityLevel)}
                          <span className="text-indigo-300">
                            {provider.securityLevel === 'high' ? 'High Security' : 'Standard Security'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Lock className="w-3 h-3 text-indigo-400" />
                          <span className="text-indigo-300">
                            {provider.authMethod === 'oauth2' ? 'OAuth 2.0' : 
                             provider.authMethod === 'imap' ? 'IMAP/SMTP' : 'OAuth 2.0 + IMAP'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Settings className="w-3 h-3 text-indigo-400" />
                          <span className={getComplexityColor(provider.setupComplexity)}>
                            {provider.setupComplexity.charAt(0).toUpperCase() + provider.setupComplexity.slice(1)} Setup
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Connect Button */}
                  <div className="ml-4">
                    {selectedProvider === provider.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(provider.id);
                        }}
                        disabled={isConnecting || provider.status === 'coming_soon'}
                        className={`px-6 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center space-x-2 ${
                          provider.status === 'configured'
                            ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-green-600 hover:to-blue-700'
                            : provider.status === 'not_configured'
                            ? 'bg-orange-500/20 text-orange-300 cursor-not-allowed'
                            : 'bg-blue-500/20 text-blue-300 cursor-not-allowed'
                        }`}
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            <span>
                              {provider.status === 'configured' ? 'Connect (Read-Only)' :
                               provider.status === 'not_configured' ? 'Setup Required' :
                               'Coming Soon'}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Read-Only Notice for Gmail */}
                {selectedProvider === provider.id && provider.id === 'gmail' && provider.status === 'configured' && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="text-blue-300 font-semibold text-sm">Read-Only Access</h4>
                        <p className="text-blue-200 text-sm mt-1">
                          This connection uses read-only permissions to avoid Google's app verification requirements. 
                          You can read emails and extract meeting information, but cannot modify emails or send messages.
                        </p>
                        <div className="mt-2 text-xs text-blue-300">
                          <strong>Permissions:</strong> gmail.readonly, userinfo.email, calendar.readonly
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Setup Instructions for Not Configured */}
                {selectedProvider === provider.id && provider.status === 'not_configured' && (
                  <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div>
                        <h4 className="text-orange-300 font-semibold text-sm">Setup Required</h4>
                        <p className="text-orange-200 text-sm mt-1">
                          {provider.id === 'gmail' && (
                            <>
                              To connect Gmail, you need to configure Google API credentials. 
                              Please check the <code className="bg-orange-500/20 px-1 rounded">GOOGLE_OAUTH_SETUP.md</code> file 
                              for detailed setup instructions.
                            </>
                          )}
                        </p>
                        <div className="mt-2">
                          <a
                            href="https://console.cloud.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-orange-300 hover:text-orange-200 text-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Google Cloud Console</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Coming Soon Notice */}
                {selectedProvider === provider.id && provider.status === 'coming_soon' && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Zap className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="text-blue-300 font-semibold text-sm">Coming Soon</h4>
                        <p className="text-blue-200 text-sm mt-1">
                          {provider.name} integration is currently in development and will be available in the next update. 
                          We're working hard to bring you the best email management experience!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Error Display */}
          {connectionError && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-red-300 font-semibold text-sm">Connection Error</h4>
                  <p className="text-red-200 text-sm mt-1 whitespace-pre-line">{connectionError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center space-x-2 text-indigo-300 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Advanced Options</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                Coming Soon
              </span>
            </button>

            {showAdvancedOptions && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl">
                <p className="text-indigo-200 text-sm">
                  Advanced options like custom IMAP/SMTP settings, proxy configuration, 
                  and enterprise features will be available in future updates.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-indigo-300">
              <p>🔒 Your data is encrypted and secure. We only request read-only access.</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;