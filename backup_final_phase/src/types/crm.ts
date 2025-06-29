export interface CRMProvider {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  type: 'hubspot' | 'salesforce' | 'pipedrive' | 'googlesheets' | 'airtable';
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  title?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  customFields?: Record<string, any>;
}

export interface Meeting {
  id: string;
  contactId: string;
  title: string;
  date: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  type: 'initial' | 'follow_up' | 'demo' | 'closing' | 'other';
  notes: string;
  outcome?: string;
  nextSteps?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMActivity {
  id: string;
  contactId: string;
  type: 'email' | 'meeting' | 'call' | 'note' | 'task';
  subject: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface CRMSyncRequest {
  contact: Partial<Contact>;
  meeting?: Partial<Meeting>;
  activity?: Partial<CRMActivity>;
  emailContent?: string;
}

export interface CRMSyncResponse {
  success: boolean;
  contact?: Contact;
  meeting?: Meeting;
  activity?: CRMActivity;
  action: 'created' | 'updated' | 'found';
  error?: string;
}

export interface CRMIntegration {
  syncContact: (request: CRMSyncRequest) => Promise<CRMSyncResponse>;
  findContact: (email: string) => Promise<Contact | null>;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => Promise<Meeting>;
  addActivity: (activity: Partial<CRMActivity>) => Promise<CRMActivity>;
  getContactHistory: (contactId: string) => Promise<(Meeting | CRMActivity)[]>;
}