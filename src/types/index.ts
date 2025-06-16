export interface ParsedEmailData {
  intent: 'schedule_meeting' | 'follow_up' | 'cancel' | 'reschedule' | 'other';
  date?: string | null;
  time?: string | null;
  participants: string[];
  contact?: string | null;
  company?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rawResponse?: string;
}

export interface SyncResponse {
  success: boolean;
  action?: 'created' | 'updated';
  record?: any;
  error?: string;
}