export interface GmailConfig {
  clientId: string;
  apiKey: string;
  discoveryDocs: string[];
  scopes: string[];
}

export const getGmailConfig = (): GmailConfig => {
  // Reuse Google Calendar config for Gmail API
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
      'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
    ],
    // ONLY read-only scopes to avoid verification requirements
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly', // Read-only Gmail access
      'https://www.googleapis.com/auth/userinfo.email', // Basic email info
      'https://www.googleapis.com/auth/calendar.readonly' // Read-only calendar access
    ]
  };
};

export const isGmailConfigured = (): boolean => {
  const config = getGmailConfig();
  return !!(config.clientId && config.apiKey);
};