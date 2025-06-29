import { 
  CRMProvider, 
  Contact, 
  Meeting, 
  CRMActivity, 
  CRMSyncRequest, 
  CRMSyncResponse,
  CRMIntegration 
} from '../types/crm';

class CRMService implements CRMIntegration {
  private providers: CRMProvider[] = [
    { id: 'hubspot', name: 'HubSpot', icon: '🔶', connected: false, type: 'hubspot' },
    { id: 'salesforce', name: 'Salesforce', icon: '☁️', connected: false, type: 'salesforce' },
    { id: 'pipedrive', name: 'Pipedrive', icon: '📊', connected: false, type: 'pipedrive' },
    { id: 'googlesheets', name: 'Google Sheets', icon: '📋', connected: false, type: 'googlesheets' },
    { id: 'airtable', name: 'Airtable', icon: '🗃️', connected: false, type: 'airtable' }
  ];

  // Mock data storage (in production, this would be replaced with actual API calls)
  private mockContacts: Contact[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@example.com',
      company: 'TechCorp Inc.',
      phone: '+1-555-0123',
      title: 'Senior Developer',
      source: 'email_parsing',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-15T14:30:00Z',
      tags: ['prospect', 'technical']
    }
  ];

  private mockMeetings: Meeting[] = [
    {
      id: '1',
      contactId: '1',
      title: 'Initial Discussion - TechCorp Project',
      date: '2024-01-15T14:00:00Z',
      duration: 60,
      status: 'scheduled',
      type: 'initial',
      notes: 'Discuss project requirements and timeline',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    }
  ];

  private mockActivities: CRMActivity[] = [
    {
      id: '1',
      contactId: '1',
      type: 'email',
      subject: 'Meeting Request - Project Discussion',
      description: 'Initial email requesting meeting to discuss project collaboration',
      date: '2024-01-10T10:00:00Z',
      createdAt: '2024-01-10T10:00:00Z'
    }
  ];

  getProviders(): CRMProvider[] {
    return this.providers;
  }

  async connectProvider(providerId: string): Promise<boolean> {
    // Simulate OAuth/API connection flow
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      provider.connected = true;
      
      // Simulate different connection flows for different providers
      switch (provider.type) {
        case 'googlesheets':
          console.log('Connected to Google Sheets - Setting up spreadsheet...');
          await this.setupGoogleSheetsStructure();
          break;
        case 'hubspot':
          console.log('Connected to HubSpot - Syncing properties...');
          break;
        case 'salesforce':
          console.log('Connected to Salesforce - Configuring objects...');
          break;
        default:
          console.log(`Connected to ${provider.name}`);
      }
      
      return true;
    }
    return false;
  }

  async disconnectProvider(providerId: string): Promise<boolean> {
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      provider.connected = false;
      return true;
    }
    return false;
  }

  hasConnectedProvider(): boolean {
    return this.providers.some(p => p.connected);
  }

  async syncContact(request: CRMSyncRequest): Promise<CRMSyncResponse> {
    if (!this.hasConnectedProvider()) {
      throw new Error('No CRM provider connected');
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Check if contact already exists
      let existingContact = await this.findContact(request.contact.email!);
      let contact: Contact;
      let action: 'created' | 'updated' | 'found';

      if (existingContact) {
        // Update existing contact
        contact = {
          ...existingContact,
          ...request.contact,
          updatedAt: new Date().toISOString()
        };
        
        const index = this.mockContacts.findIndex(c => c.id === existingContact!.id);
        this.mockContacts[index] = contact;
        action = 'updated';
      } else {
        // Create new contact
        contact = {
          id: Date.now().toString(),
          name: request.contact.name || 'Unknown',
          email: request.contact.email || '',
          company: request.contact.company || 'Unknown Company',
          source: 'email_parsing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['prospect'],
          ...request.contact
        };
        
        this.mockContacts.push(contact);
        action = 'created';
      }

      // Create meeting record if provided
      let meeting: Meeting | undefined;
      if (request.meeting) {
        meeting = {
          id: Date.now().toString() + '_meeting',
          contactId: contact.id,
          title: request.meeting.title || `Meeting with ${contact.name}`,
          date: request.meeting.date || new Date().toISOString(),
          duration: request.meeting.duration || 60,
          status: request.meeting.status || 'scheduled',
          type: request.meeting.type || 'initial',
          notes: request.meeting.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...request.meeting
        };
        
        this.mockMeetings.push(meeting);
      }

      // Create activity record if email content provided
      let activity: CRMActivity | undefined;
      if (request.emailContent) {
        activity = {
          id: Date.now().toString() + '_activity',
          contactId: contact.id,
          type: 'email',
          subject: this.extractEmailSubject(request.emailContent),
          description: request.emailContent.substring(0, 500) + (request.emailContent.length > 500 ? '...' : ''),
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        this.mockActivities.push(activity);
      }

      // Sync to connected providers
      await this.syncToProviders(contact, meeting, activity);

      return {
        success: true,
        contact,
        meeting,
        activity,
        action
      };

    } catch (error) {
      console.error('CRM sync failed:', error);
      return {
        success: false,
        action: 'created',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async findContact(email: string): Promise<Contact | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.mockContacts.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<Meeting> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const index = this.mockMeetings.findIndex(m => m.id === meetingId);
    if (index === -1) {
      throw new Error('Meeting not found');
    }

    const updatedMeeting = {
      ...this.mockMeetings[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.mockMeetings[index] = updatedMeeting;
    
    // Sync update to connected providers
    await this.syncMeetingToProviders(updatedMeeting);
    
    return updatedMeeting;
  }

  async addActivity(activity: Partial<CRMActivity>): Promise<CRMActivity> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newActivity: CRMActivity = {
      id: Date.now().toString(),
      contactId: activity.contactId || '',
      type: activity.type || 'note',
      subject: activity.subject || '',
      description: activity.description || '',
      date: activity.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...activity
    };

    this.mockActivities.push(newActivity);
    
    // Sync to connected providers
    await this.syncActivityToProviders(newActivity);
    
    return newActivity;
  }

  async getContactHistory(contactId: string): Promise<(Meeting | CRMActivity)[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const meetings = this.mockMeetings.filter(m => m.contactId === contactId);
    const activities = this.mockActivities.filter(a => a.contactId === contactId);
    
    // Combine and sort by date
    const history = [...meetings, ...activities].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return history;
  }

  private async setupGoogleSheetsStructure(): Promise<void> {
    // Simulate setting up Google Sheets with proper columns
    console.log('Setting up Google Sheets structure:');
    console.log('- Contacts sheet: Name, Email, Company, Phone, Title, Source, Created, Updated, Tags');
    console.log('- Meetings sheet: Contact, Title, Date, Duration, Status, Type, Notes, Created, Updated');
    console.log('- Activities sheet: Contact, Type, Subject, Description, Date, Created');
  }

  private async syncToProviders(contact: Contact, meeting?: Meeting, activity?: CRMActivity): Promise<void> {
    const connectedProviders = this.providers.filter(p => p.connected);
    
    for (const provider of connectedProviders) {
      try {
        switch (provider.type) {
          case 'googlesheets':
            await this.syncToGoogleSheets(contact, meeting, activity);
            break;
          case 'hubspot':
            await this.syncToHubSpot(contact, meeting, activity);
            break;
          case 'salesforce':
            await this.syncToSalesforce(contact, meeting, activity);
            break;
          case 'airtable':
            await this.syncToAirtable(contact, meeting, activity);
            break;
          default:
            console.log(`Syncing to ${provider.name}...`);
        }
      } catch (error) {
        console.error(`Failed to sync to ${provider.name}:`, error);
      }
    }
  }

  private async syncToGoogleSheets(contact: Contact, meeting?: Meeting, activity?: CRMActivity): Promise<void> {
    // Simulate Google Sheets API calls
    console.log('Syncing to Google Sheets:', {
      contact: `${contact.name} (${contact.email}) - ${contact.company}`,
      meeting: meeting ? `${meeting.title} on ${new Date(meeting.date).toLocaleDateString()}` : null,
      activity: activity ? `${activity.type}: ${activity.subject}` : null
    });
  }

  private async syncToHubSpot(contact: Contact, meeting?: Meeting, activity?: CRMActivity): Promise<void> {
    // Simulate HubSpot API calls
    console.log('Syncing to HubSpot:', {
      contact: `Creating/updating contact: ${contact.email}`,
      meeting: meeting ? `Creating meeting: ${meeting.title}` : null,
      activity: activity ? `Logging activity: ${activity.subject}` : null
    });
  }

  private async syncToSalesforce(contact: Contact, meeting?: Meeting, activity?: CRMActivity): Promise<void> {
    // Simulate Salesforce API calls
    console.log('Syncing to Salesforce:', {
      contact: `Upserting lead/contact: ${contact.email}`,
      meeting: meeting ? `Creating event: ${meeting.title}` : null,
      activity: activity ? `Creating task/activity: ${activity.subject}` : null
    });
  }

  private async syncToAirtable(contact: Contact, meeting?: Meeting, activity?: CRMActivity): Promise<void> {
    // Simulate Airtable API calls
    console.log('Syncing to Airtable:', {
      contact: `Adding record to Contacts table: ${contact.name}`,
      meeting: meeting ? `Adding record to Meetings table: ${meeting.title}` : null,
      activity: activity ? `Adding record to Activities table: ${activity.subject}` : null
    });
  }

  private async syncMeetingToProviders(meeting: Meeting): Promise<void> {
    const connectedProviders = this.providers.filter(p => p.connected);
    
    for (const provider of connectedProviders) {
      console.log(`Updating meeting in ${provider.name}: ${meeting.title}`);
    }
  }

  private async syncActivityToProviders(activity: CRMActivity): Promise<void> {
    const connectedProviders = this.providers.filter(p => p.connected);
    
    for (const provider of connectedProviders) {
      console.log(`Adding activity to ${provider.name}: ${activity.subject}`);
    }
  }

  private extractEmailSubject(emailContent: string): string {
    // Simple subject extraction - in production, use proper email parsing
    const lines = emailContent.split('\n');
    const firstLine = lines[0].trim();
    
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...';
    }
    
    return firstLine || 'Email Communication';
  }

  // Public methods for external access
  async getAllContacts(): Promise<Contact[]> {
    return [...this.mockContacts];
  }

  async getAllMeetings(): Promise<Meeting[]> {
    return [...this.mockMeetings];
  }

  async getContactMeetings(contactId: string): Promise<Meeting[]> {
    return this.mockMeetings.filter(m => m.contactId === contactId);
  }
}

export const crmService = new CRMService();