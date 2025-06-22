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
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  };
};

export const isGmailConfigured = (): boolean => {
  const config = getGmailConfig();
  return !!(config.clientId && config.apiKey);
};