import { EmailProvider, EmailRoom, EmailMessage, EmailFilter, EmailSyncStatus, ParsedEmailResult } from '../types/email';
import { gmailService } from './gmailService';
import { openaiService } from './openaiService';
import { calendarService } from './calendarService';
import { crmService } from './crmService';
import { isGmailConfigured } from '../config/gmail';

class EmailService {
  private providers: EmailProvider[] = [
    { 
      id: 'gmail', 
      name: 'Gmail', 
      icon: '📧', 
      connected: false, 
      type: 'gmail' 
    },
    { 
      id: 'outlook', 
      name: 'Outlook', 
      icon: '📮', 
      connected: false, 
      type: 'outlook' 
    }
  ];

  private rooms: EmailRoom[] = [];
  private syncStatuses: Map<string, EmailSyncStatus> = new Map();

  getProviders(): EmailProvider[] {
    // Update Gmail provider status
    const gmailProvider = this.providers.find(p => p.id === 'gmail');
    if (gmailProvider) {
      gmailProvider.connected = gmailService.isConnected();
    }
    
    return this.providers;
  }

  async connectProvider(providerId: string): Promise<boolean> {
    if (providerId === 'gmail') {
      if (!isGmailConfigured()) {
        throw new Error('Gmail API not configured. Please add your Google API credentials to environment variables.');
      }
      
      const success = await gmailService.signIn();
      if (success) {
        const provider = this.providers.find(p => p.id === 'gmail');
        if (provider) {
          provider.connected = true;
          
          // Get user info and create room
          try {
            const userInfo = await gmailService.getUserInfo();
            provider.accountInfo = {
              email: userInfo.email,
              name: userInfo.name,
              avatar: userInfo.picture
            };
            
            // Create or update Gmail room
            await this.createOrUpdateRoom(providerId, userInfo);
          } catch (error) {
            console.error('Failed to get Gmail user info:', error);
          }
        }
      }
      return success;
    }
    
    // For other providers (Outlook), simulate connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      provider.connected = true;
      return true;
    }
    return false;
  }

  async disconnectProvider(providerId: string): Promise<boolean> {
    if (providerId === 'gmail') {
      await gmailService.signOut();
      const provider = this.providers.find(p => p.id === 'gmail');
      if (provider) {
        provider.connected = false;
        provider.accountInfo = undefined;
      }
      
      // Remove Gmail rooms
      this.rooms = this.rooms.filter(room => room.providerId !== 'gmail');
      return true;
    }
    
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      provider.connected = false;
      provider.accountInfo = undefined;
      
      // Remove rooms for this provider
      this.rooms = this.rooms.filter(room => room.providerId !== providerId);
      return true;
    }
    return false;
  }

  private async createOrUpdateRoom(providerId: string, userInfo: any): Promise<EmailRoom> {
    const roomId = `${providerId}-${userInfo.email}`;
    
    let room = this.rooms.find(r => r.id === roomId);
    
    if (!room) {
      room = {
        id: roomId,
        name: `${userInfo.name || userInfo.email} (${providerId})`,
        providerId: providerId,
        providerType: providerId as 'gmail' | 'outlook',
        accountEmail: userInfo.email,
        isActive: true,
        unreadCount: 0,
        lastSyncTime: new Date().toISOString(),
        settings: {
          autoSync: true,
          syncInterval: 5, // 5 minutes
          aiParsing: true,
          meetingDetection: true,
          calendarIntegration: true,
          crmSync: true
        }
      };
      
      this.rooms.push(room);
    } else {
      room.isActive = true;
      room.lastSyncTime = new Date().toISOString();
    }
    
    // Get unread count
    if (providerId === 'gmail') {
      try {
        room.unreadCount = await gmailService.getUnreadCount();
      } catch (error) {
        console.error('Failed to get unread count:', error);
      }
    }
    
    return room;
  }

  getRooms(): EmailRoom[] {
    return this.rooms.filter(room => room.isActive);
  }

  getRoom(roomId: string): EmailRoom | undefined {
    return this.rooms.find(room => room.id === roomId);
  }

  async getMessages(roomId: string, filter: EmailFilter = {}): Promise<EmailMessage[]> {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.providerType === 'gmail') {
      return await gmailService.getMessages(filter);
    }
    
    // For other providers, return empty array for now
    return [];
  }

  async syncRoom(roomId: string): Promise<void> {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Set sync status
    const syncStatus: EmailSyncStatus = {
      roomId: roomId,
      issyncing: true,
      lastSyncTime: new Date().toISOString(),
      totalMessages: 0,
      syncedMessages: 0,
      errors: []
    };
    
    this.syncStatuses.set(roomId, syncStatus);

    try {
      console.log(`🔄 Syncing room: ${room.name}`);
      
      // Get messages from provider
      const messages = await this.getMessages(roomId, { isRead: false });
      
      syncStatus.totalMessages = messages.length;
      
      // Process messages with AI if enabled
      if (room.settings.aiParsing && room.settings.meetingDetection) {
        for (const message of messages) {
          try {
            await this.processMessageWithAI(message, room);
            syncStatus.syncedMessages++;
          } catch (error) {
            console.error('Failed to process message with AI:', error);
            syncStatus.errors.push(`Failed to process message ${message.id}: ${error}`);
          }
        }
      }
      
      // Update room sync time
      room.lastSyncTime = new Date().toISOString();
      room.unreadCount = messages.filter(m => !m.isRead).length;
      
      syncStatus.issyncing = false;
      console.log(`✅ Room sync completed: ${room.name} (${syncStatus.syncedMessages}/${syncStatus.totalMessages} processed)`);
      
    } catch (error) {
      console.error('Room sync failed:', error);
      syncStatus.issyncing = false;
      syncStatus.errors.push(`Sync failed: ${error}`);
    }
  }

  private async processMessageWithAI(message: EmailMessage, room: EmailRoom): Promise<ParsedEmailResult | null> {
    try {
      console.log(`🤖 Processing message with AI: ${message.subject}`);
      
      // Parse email with AI
      const parseResponse = await openaiService.parseEmail(message.body.text);
      
      if (!parseResponse.success || !parseResponse.data) {
        console.log('AI parsing failed or no meeting intent detected');
        return null;
      }

      const parsedResult: ParsedEmailResult = {
        messageId: message.id,
        roomId: room.id,
        parsedData: parseResponse.data,
        aiProcessed: true,
        meetingScheduled: false,
        crmSynced: false,
        processedAt: new Date().toISOString()
      };

      // Auto-schedule meeting if intent is detected and calendar integration is enabled
      if (room.settings.calendarIntegration && 
          parseResponse.data.intent === 'schedule_meeting' &&
          parseResponse.data.confidence > 0.7) {
        
        try {
          console.log(`📅 Auto-scheduling meeting for: ${parseResponse.data.contactName}`);
          
          // Check availability and schedule
          const availability = await calendarService.checkAvailability(
            parseResponse.data.datetime, 
            parseResponse.data.participants
          );
          
          if (availability.suggestedTimes.length > 0) {
            const startDateTime = new Date(`${availability.date}T${availability.suggestedTimes[0]}:00`);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60000); // 1 hour meeting
            
            const scheduleRequest = {
              title: `Meeting with ${parseResponse.data.contactName} - ${parseResponse.data.company}`,
              start: startDateTime.toISOString(),
              end: endDateTime.toISOString(),
              attendees: parseResponse.data.participants,
              description: `Auto-scheduled meeting based on email from ${parseResponse.data.contactName}`,
              location: 'Video Conference'
            };
            
            const event = await calendarService.scheduleEvent(scheduleRequest);
            parsedResult.meetingScheduled = true;
            parsedResult.calendarEventId = event.id;
            
            console.log(`✅ Meeting scheduled: ${event.title}`);
          }
        } catch (error) {
          console.error('Failed to auto-schedule meeting:', error);
        }
      }

      // Auto-sync to CRM if enabled
      if (room.settings.crmSync && crmService.hasConnectedProvider()) {
        try {
          console.log(`👥 Auto-syncing to CRM: ${parseResponse.data.contactName}`);
          
          const crmSyncRequest = {
            contact: {
              name: parseResponse.data.contactName,
              email: parseResponse.data.email,
              company: parseResponse.data.company,
              source: 'email_parsing'
            },
            emailContent: message.body.text
          };
          
          const crmResponse = await crmService.syncContact(crmSyncRequest);
          parsedResult.crmSynced = crmResponse.success;
          
          console.log(`✅ CRM sync completed: ${crmResponse.action}`);
        } catch (error) {
          console.error('Failed to sync to CRM:', error);
        }
      }

      return parsedResult;
    } catch (error) {
      console.error('Failed to process message with AI:', error);
      return null;
    }
  }

  getSyncStatus(roomId: string): EmailSyncStatus | undefined {
    return this.syncStatuses.get(roomId);
  }

  async markMessageAsRead(roomId: string, messageId: string): Promise<boolean> {
    const room = this.getRoom(roomId);
    if (!room) return false;

    if (room.providerType === 'gmail') {
      return await gmailService.markAsRead(messageId);
    }
    
    return false;
  }

  async starMessage(roomId: string, messageId: string, starred: boolean = true): Promise<boolean> {
    const room = this.getRoom(roomId);
    if (!room) return false;

    if (room.providerType === 'gmail') {
      return await gmailService.starMessage(messageId, starred);
    }
    
    return false;
  }

  async updateRoomSettings(roomId: string, settings: Partial<EmailRoom['settings']>): Promise<boolean> {
    const room = this.getRoom(roomId);
    if (!room) return false;

    room.settings = { ...room.settings, ...settings };
    return true;
  }

  // Auto-sync functionality
  startAutoSync(): void {
    setInterval(() => {
      this.autoSyncRooms();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async autoSyncRooms(): void {
    const activeRooms = this.getRooms().filter(room => room.settings.autoSync);
    
    for (const room of activeRooms) {
      try {
        const lastSync = new Date(room.lastSyncTime);
        const now = new Date();
        const minutesSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);
        
        if (minutesSinceLastSync >= room.settings.syncInterval) {
          console.log(`🔄 Auto-syncing room: ${room.name}`);
          await this.syncRoom(room.id);
        }
      } catch (error) {
        console.error(`Auto-sync failed for room ${room.name}:`, error);
      }
    }
  }
}

export const emailService = new EmailService();