import React, { useState, useEffect } from 'react';
import { Users, Building, Calendar, Activity, CheckCircle, AlertCircle, Loader2, ExternalLink, Plus, Eye, Edit } from 'lucide-react';
import { crmService } from '../services/crmService';
import { CRMProvider, Contact, Meeting, CRMSyncResponse } from '../types/crm';

interface CRMIntegrationProps {
  parsedData: {
    contactName: string;
    email: string;
    company: string;
    datetime: string;
    participants: string[];
    intent: string;
  };
  meetingData?: {
    id: string;
    title: string;
    start: string;
    end: string;
    attendees: string[];
  };
  emailContent?: string;
  onContactSynced?: (response: CRMSyncResponse) => void;
}

const CRMIntegration: React.FC<CRMIntegrationProps> = ({ 
  parsedData, 
  meetingData, 
  emailContent,
  onContactSynced 
}) => {
  const [providers, setProviders] = useState<CRMProvider[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<CRMSyncResponse | null>(null);
  const [existingContact, setExistingContact] = useState<Contact | null>(null);
  const [isCheckingContact, setIsCheckingContact] = useState(false);
  const [contactHistory, setContactHistory] = useState<(Meeting | any)[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setProviders(crmService.getProviders());
    
    // Auto-check for existing contact
    if (parsedData.email && hasConnectedProvider()) {
      handleCheckExistingContact();
    }
  }, [parsedData.email]);

  useEffect(() => {
    // Auto-sync on successful meeting scheduling
    if (meetingData && hasConnectedProvider() && !syncResult) {
      handleSyncToCRM();
    }
  }, [meetingData]);

  const hasConnectedProvider = () => {
    return providers.some(p => p.connected);
  };

  const handleConnectProvider = async (providerId: string) => {
    setIsConnecting(providerId);
    try {
      const success = await crmService.connectProvider(providerId);
      if (success) {
        setProviders(crmService.getProviders());
        
        // Auto-check for existing contact after connection
        if (parsedData.email) {
          setTimeout(() => handleCheckExistingContact(), 1000);
        }
      }
    } catch (error) {
      console.error('Failed to connect CRM provider:', error);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnectProvider = async (providerId: string) => {
    try {
      await crmService.disconnectProvider(providerId);
      setProviders(crmService.getProviders());
      setExistingContact(null);
      setSyncResult(null);
    } catch (error) {
      console.error('Failed to disconnect CRM provider:', error);
    }
  };

  const handleCheckExistingContact = async () => {
    if (!hasConnectedProvider() || !parsedData.email) return;

    setIsCheckingContact(true);
    try {
      const contact = await crmService.findContact(parsedData.email);
      setExistingContact(contact);
      
      if (contact) {
        // Load contact history
        const history = await crmService.getContactHistory(contact.id);
        setContactHistory(history);
      }
    } catch (error) {
      console.error('Failed to check existing contact:', error);
    } finally {
      setIsCheckingContact(false);
    }
  };

  const handleSyncToCRM = async () => {
    if (!hasConnectedProvider()) return;

    setIsSyncing(true);
    try {
      const syncRequest = {
        contact: {
          name: parsedData.contactName,
          email: parsedData.email,
          company: parsedData.company,
          source: 'email_parsing',
          tags: ['prospect', 'ai_parsed']
        },
        meeting: meetingData ? {
          title: meetingData.title,
          date: meetingData.start,
          duration: Math.round((new Date(meetingData.end).getTime() - new Date(meetingData.start).getTime()) / (1000 * 60)),
          status: 'scheduled' as const,
          type: 'initial' as const,
          notes: `Meeting scheduled via AI assistant. Original request: ${parsedData.datetime}`
        } : undefined,
        emailContent: emailContent
      };

      const response = await crmService.syncContact(syncRequest);
      setSyncResult(response);
      
      if (response.success && response.contact) {
        setExistingContact(response.contact);
        
        // Refresh contact history
        const history = await crmService.getContactHistory(response.contact.id);
        setContactHistory(history);
      }

      if (onContactSynced) {
        onContactSynced(response);
      }
    } catch (error) {
      console.error('Failed to sync to CRM:', error);
      setSyncResult({
        success: false,
        action: 'created',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Calendar className="w-4 h-4" />;
      case 'email': return <Activity className="w-4 h-4" />;
      case 'call': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-8 mt-6">
      <div className="flex items-center mb-8">
        <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl mr-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">
            CRM Integration
          </h3>
          <p className="text-purple-200">
            Automatically sync contacts and meeting data to your CRM system
          </p>
        </div>
      </div>

      {/* CRM Providers */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2" />
          CRM Providers
        </h4>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                provider.connected
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{provider.icon}</span>
                  <div>
                    <p className="text-white font-semibold">{provider.name}</p>
                    <p className={`text-sm ${provider.connected ? 'text-green-300' : 'text-slate-400'}`}>
                      {provider.connected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                
                {provider.connected ? (
                  <button
                    onClick={() => handleDisconnectProvider(provider.id)}
                    className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-all duration-200"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectProvider(provider.id)}
                    disabled={isConnecting === provider.id}
                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-all duration-200 disabled:opacity-50 flex items-center space-x-1"
                  >
                    {isConnecting === provider.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Status */}
      {hasConnectedProvider() && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Contact Status
            </h4>
            
            <button
              onClick={handleCheckExistingContact}
              disabled={isCheckingContact}
              className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
            >
              {isCheckingContact ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span>Check Contact</span>
            </button>
          </div>

          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
            {isCheckingContact ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400 mr-3" />
                <span className="text-white">Checking for existing contact...</span>
              </div>
            ) : existingContact ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                  <div>
                    <h5 className="text-green-300 font-semibold">Existing Contact Found</h5>
                    <p className="text-green-200 text-sm">This contact already exists in your CRM</p>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-300">Name:</span>
                      <p className="text-white font-semibold">{existingContact.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-300">Company:</span>
                      <p className="text-white font-semibold">{existingContact.company}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-300">Email:</span>
                      <p className="text-white font-semibold">{existingContact.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-300">Last Updated:</span>
                      <p className="text-white font-semibold">{formatDate(existingContact.updatedAt)}</p>
                    </div>
                  </div>
                  
                  {existingContact.tags && existingContact.tags.length > 0 && (
                    <div>
                      <span className="text-sm text-slate-300">Tags:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {existingContact.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact History */}
                {contactHistory.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center space-x-2 text-purple-300 hover:text-purple-200 transition-colors"
                    >
                      <Activity className="w-4 h-4" />
                      <span>View History ({contactHistory.length} items)</span>
                    </button>
                    
                    {showHistory && (
                      <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                        {contactHistory.map((item, index) => (
                          <div key={index} className="bg-white/5 rounded-lg p-3 text-sm">
                            <div className="flex items-center space-x-2 mb-1">
                              {getActivityIcon('type' in item ? item.type : 'meeting')}
                              <span className="text-white font-medium">
                                {'title' in item ? item.title : item.subject}
                              </span>
                            </div>
                            <p className="text-slate-300 text-xs">
                              {formatDate('date' in item ? item.date : item.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <Plus className="w-6 h-6 text-blue-400 mr-3" />
                <div>
                  <h5 className="text-blue-300 font-semibold">New Contact</h5>
                  <p className="text-blue-200 text-sm">This will be a new contact in your CRM</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Action */}
      {hasConnectedProvider() && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              CRM Sync
            </h4>
            
            <button
              onClick={handleSyncToCRM}
              disabled={isSyncing}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-3"
            >
              {isSyncing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              <span>{isSyncing ? 'Syncing...' : 'Sync to CRM'}</span>
            </button>
          </div>

          {/* Sync Preview */}
          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
            <h5 className="text-white font-semibold mb-4">Sync Preview:</h5>
            
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h6 className="text-purple-300 font-semibold mb-2">Contact Information</h6>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-300">Name:</span>
                    <span className="text-white ml-2">{parsedData.contactName}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Email:</span>
                    <span className="text-white ml-2">{parsedData.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Company:</span>
                    <span className="text-white ml-2">{parsedData.company}</span>
                  </div>
                  <div>
                    <span className="text-slate-300">Source:</span>
                    <span className="text-white ml-2">Email Parsing</span>
                  </div>
                </div>
              </div>

              {meetingData && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h6 className="text-purple-300 font-semibold mb-2">Meeting Information</h6>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-300">Title:</span>
                      <span className="text-white ml-2">{meetingData.title}</span>
                    </div>
                    <div>
                      <span className="text-slate-300">Date:</span>
                      <span className="text-white ml-2">{formatDate(meetingData.start)}</span>
                    </div>
                    <div>
                      <span className="text-slate-300">Attendees:</span>
                      <span className="text-white ml-2">{meetingData.attendees.length} people</span>
                    </div>
                    <div>
                      <span className="text-slate-300">Status:</span>
                      <span className="text-white ml-2">Scheduled</span>
                    </div>
                  </div>
                </div>
              )}

              {emailContent && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h6 className="text-purple-300 font-semibold mb-2">Email Activity</h6>
                  <p className="text-sm text-slate-300">
                    Original email content will be logged as an activity record
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={`rounded-xl p-6 border ${
          syncResult.success 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-center mb-4">
            {syncResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400 mr-3" />
            )}
            <div>
              <h4 className={`text-lg font-semibold mb-1 ${
                syncResult.success ? 'text-green-300' : 'text-red-300'
              }`}>
                {syncResult.success ? 'CRM Sync Successful!' : 'CRM Sync Failed'}
              </h4>
              <p className={syncResult.success ? 'text-green-200' : 'text-red-200'}>
                {syncResult.success 
                  ? `Contact ${syncResult.action} successfully in your CRM system`
                  : syncResult.error || 'An unknown error occurred'
                }
              </p>
            </div>
          </div>

          {syncResult.success && (
            <div className="bg-white/10 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Action Taken:</span>
                <span className="text-white font-semibold capitalize">{syncResult.action}</span>
              </div>
              
              {syncResult.contact && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Contact ID:</span>
                  <span className="text-white font-mono text-sm">{syncResult.contact.id}</span>
                </div>
              )}
              
              {syncResult.meeting && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Meeting ID:</span>
                  <span className="text-white font-mono text-sm">{syncResult.meeting.id}</span>
                </div>
              )}

              <div className="pt-3 border-t border-white/20">
                <button className="flex items-center space-x-2 text-purple-300 hover:text-purple-200 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  <span>View in CRM</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Connected Providers */}
      {!hasConnectedProvider() && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-400 mr-3" />
            <div>
              <h4 className="text-lg font-semibold text-yellow-300 mb-1">
                Connect a CRM Provider
              </h4>
              <p className="text-yellow-200">
                To automatically sync contacts and meeting data, please connect at least one CRM provider above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMIntegration;