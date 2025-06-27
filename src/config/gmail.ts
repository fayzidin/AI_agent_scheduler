export interface GmailConfig {
  clientId: string;
  apiKey: string;
  discoveryDocs: string[];
  scopes: string[];
}

export const getGmailConfig = (): GmailConfig => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  if (!clientId || !apiKey) {
    console.warn('Gmail API credentials not found. Gmail integration will use mock data.');
  }

  return {
    clientId: clientId || '',
    apiKey: apiKey || '',
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
      'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest'
    ],
    // Updated scopes for full Gmail access
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly', // Read Gmail emails
      'https://www.googleapis.com/auth/gmail.modify', // Modify Gmail emails (mark as read, star)
      'https://www.googleapis.com/auth/userinfo.email', // Get user email
      'https://www.googleapis.com/auth/userinfo.profile' // Get user profile info
    ]
  };
};

export const isGmailConfigured = (): boolean => {
  const config = getGmailConfig();
  return !!(config.clientId && config.apiKey);
};