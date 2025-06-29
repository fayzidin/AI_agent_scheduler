export interface OutlookConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

export const getOutlookConfig = (): OutlookConfig => {
  const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID;
  
  if (!clientId) {
    console.warn('Outlook API credentials not found. Outlook integration will use mock data.');
  }

  return {
    clientId: clientId || '',
    // Use consumers tenant for personal Microsoft accounts
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: window.location.origin,
    scopes: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Calendars.Read',
      'openid',
      'profile',
      'email'
    ]
  };
};

export const isOutlookConfigured = (): boolean => {
  const config = getOutlookConfig();
  return !!(config.clientId);
};