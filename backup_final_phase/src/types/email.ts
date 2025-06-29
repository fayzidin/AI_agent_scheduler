export interface EmailProvider {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  type: 'gmail' | 'outlook' | 'imap';
  accountInfo?: {
    email: string;
    name: string;
    avatar?: string;
  };
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: {
    name: string;
    email: string;
  };
  to: {
    name: string;
    email: string;
  }[];
  cc?: {
    name: string;
    email: string;
  }[];
  bcc?: {
    name: string;
    email: string;
  }[];
  date: string;
  body: {
    text: string;
    html?: string;
  };
  attachments?: EmailAttachment[];
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  snippet: string;
  providerId: string; // Which email provider this came from
  roomId: string; // Which room/workspace this belongs to
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: string; // Base64 encoded data
}

export interface EmailThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  participants: string[];
  lastMessageDate: string;
  messageCount: number;
  isRead: boolean;
  labels: string[];
  providerId: string;
  roomId: string;
}

export interface EmailRoom {
  id: string;
  name: string;
  providerId: string;
  providerType: 'gmail' | 'outlook' | 'imap';
  accountEmail: string;
  isActive: boolean;
  unreadCount: number;
  lastSyncTime: string;
  settings: {
    autoSync: boolean;
    syncInterval: number; // minutes
    aiParsing: boolean;
    meetingDetection: boolean;
    calendarIntegration: boolean;
    crmSync: boolean;
  };
}

export interface EmailFilter {
  isRead?: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  hasAttachments?: boolean;
  labels?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  sender?: string;
  subject?: string;
  query?: string;
}

export interface EmailSyncStatus {
  roomId: string;
  issyncing: boolean;
  lastSyncTime: string;
  totalMessages: number;
  syncedMessages: number;
  errors: string[];
}

export interface ParsedEmailResult {
  messageId: string;
  roomId: string;
  parsedData: {
    intent: 'schedule_meeting' | 'reschedule_meeting' | 'cancel_meeting' | 'follow_up' | 'general';
    contactName: string;
    email: string;
    company: string;
    datetime: string;
    participants: string[];
    confidence: number;
    reasoning: string;
  };
  aiProcessed: boolean;
  meetingScheduled?: boolean;
  calendarEventId?: string;
  crmSynced?: boolean;
  processedAt: string;
}