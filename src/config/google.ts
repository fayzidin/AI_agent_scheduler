export interface GoogleConfig {
  clientId: string;
  apiKey: string;
  discoveryDocs: string[];
  scopes: string[];
}

export const getGoogleConfig = (): GoogleConfig => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  if (!clientId || !apiKey) {
    console.warn('Google API credentials not found. Calendar integration will use mock data.');
  }

  return {
    clientId: clientId || '',
    apiKey: apiKey || '',
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  };
};

export const isGoogleConfigured = (): boolean => {
  const config = getGoogleConfig();
  return !!(config.clientId && config.apiKey);
};