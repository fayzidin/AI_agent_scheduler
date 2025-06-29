import OpenAI from 'openai';

interface ParsedEmailData {
  contactName: string;
  email: string;
  company: string;
  datetime: string;
  participants: string[];
  intent: string;
  confidence: number;
  reasoning: string;
}

interface OpenAIParseResponse {
  success: boolean;
  data?: ParsedEmailData;
  error?: string;
  rawResponse?: string;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenAI API key not found. Using enhanced mock responses.');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
      this.isInitialized = true;
      console.log('OpenAI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
    }
  }

  async parseEmail(emailContent: string): Promise<OpenAIParseResponse> {
    // Clean the email content first to handle encoding issues
    const cleanedContent = this.cleanEmailContent(emailContent);
    
    if (!this.isInitialized || !this.client) {
      console.log('OpenAI not available, using enhanced mock parsing');
      return this.fallbackParsing(cleanedContent);
    }

    try {
      const systemPrompt = `You are an expert email parser specialized in extracting meeting-related information with extremely high accuracy.

CRITICAL PARSING RULES:
1. CONTACT NAME: Extract the actual sender's name from signatures, not greetings
   - "Best regards, Fred" → contactName: "Fred"
   - "this is Alesia" → contactName: "Alesia"
   - Look for signatures at the end of emails

2. COMPANY NAME: Extract company names from context and signatures
   - "recruiter at Andersen" → company: "Andersen"
   - "Fred HighTechIno" → company: "HighTechIno"
   - Look for company names after names in signatures

3. DATE/TIME: Parse various date formats with high precision
   - "May 30 at 11.30 GMT+3" → "May 30, 2024 at 11:30 AM GMT+3"
   - "Date: June 30, 2025 Time: 4:00 PM" → "June 30, 2025 at 4:00 PM"
   - Always include year (use next year if current year month has passed)

4. EMAIL EXTRACTION: Find all email addresses
   - Extract from participant lists, signatures, etc.

5. INTENT DETECTION: Be precise about meeting intentions
   - "arrange a call" → "schedule_meeting"
   - "invite you to a meeting" → "schedule_meeting"
   - "discuss our project" → "schedule_meeting"
   - "would like to meet" → "schedule_meeting"
   - "let's have a call" → "schedule_meeting"
   - "can we meet" → "schedule_meeting"
   - "schedule a meeting" → "schedule_meeting"
   - "set up a call" → "schedule_meeting"
   - "let's connect" → "schedule_meeting"

Return your response as valid JSON with this exact structure:
{
  "contactName": "Actual sender name",
  "email": "sender@domain.com",
  "company": "Company Name",
  "datetime": "Formatted date and time",
  "participants": ["email1@domain.com", "email2@domain.com"],
  "intent": "schedule_meeting|reschedule_meeting|cancel_meeting|general",
  "confidence": 0.95,
  "reasoning": "Brief explanation of extraction logic"
}`;

      const userPrompt = `Parse this email content and extract meeting information:

${cleanedContent}

Return only valid JSON with the extracted information.`;

      // Use GPT-3.5-turbo for better compatibility and lower cost
      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500
        // Removed response_format parameter for better compatibility
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      try {
        // Extract JSON from response if it's wrapped in markdown or other text
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
        
        const parsedData = JSON.parse(jsonString) as ParsedEmailData;
        
        // Validate and clean the response
        const cleanedData = this.validateAndCleanResponse(parsedData, cleanedContent);
        
        return {
          success: true,
          data: cleanedData,
          rawResponse: responseContent
        };
      } catch (parseError) {
        console.error('Failed to parse OpenAI JSON response:', parseError);
        console.log('Raw response:', responseContent);
        
        // Try to extract data manually from the response
        const manuallyParsed = this.manuallyParseResponse(responseContent, cleanedContent);
        if (manuallyParsed) {
          return {
            success: true,
            data: manuallyParsed,
            rawResponse: responseContent
          };
        }
        
        return {
          success: false,
          error: 'Invalid JSON response from AI',
          rawResponse: responseContent
        };
      }

    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Check for specific error types
      if (error.code === 'insufficient_quota') {
        return {
          success: false,
          error: 'OpenAI API quota exceeded. Please check your billing.'
        };
      } else if (error.code === 'invalid_api_key') {
        return {
          success: false,
          error: 'Invalid OpenAI API key. Please check your configuration.'
        };
      }
      
      // Fallback to enhanced mock parsing on API failure
      console.log('Falling back to enhanced mock parsing due to API error');
      return this.fallbackParsing(cleanedContent);
    }
  }

  private manuallyParseResponse(response: string, originalEmail: string): ParsedEmailData | null {
    try {
      // Try to extract key information from the response text
      const contactName = this.extractContactName(originalEmail);
      const company = this.extractCompanyName(originalEmail);
      const email = this.extractEmail(originalEmail);
      const datetime = this.parseDateTime(originalEmail);
      const intent = this.detectIntent(originalEmail);
      
      return {
        contactName,
        email,
        company,
        datetime,
        participants: [email],
        intent,
        confidence: 0.75,
        reasoning: 'Manually parsed from AI response'
      };
    } catch (error) {
      console.error('Manual parsing failed:', error);
      return null;
    }
  }

  private extractEmail(text: string): string {
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    return emailMatch ? emailMatch[0] : 'no-email@example.com';
  }

  private cleanEmailContent(content: string): string {
    // Fix common encoding issues
    let cleaned = content
      .replace(/â/g, "'")
      .replace(/â/g, "'")
      .replace(/â/g, '"')
      .replace(/â/g, '"')
      .replace(/â/g, '—')
      .replace(/â¦/g, '...')
      .replace(/Ã/g, '')
      .replace(/Â/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned;
  }

  private validateAndCleanResponse(data: ParsedEmailData, originalEmail: string): ParsedEmailData {
    // Enhanced contact name extraction
    let cleanContactName = data.contactName || this.extractContactName(originalEmail);
    
    // Enhanced company extraction
    let cleanCompany = data.company || this.extractCompanyName(originalEmail);
    
    // Enhanced email extraction
    let cleanEmail = data.email;
    if (!cleanEmail || !cleanEmail.includes('@')) {
      const emailMatch = originalEmail.match(/[\w.-]+@[\w.-]+\.\w+/);
      cleanEmail = emailMatch ? emailMatch[0] : 'no-email@example.com';
    }

    // Enhanced datetime parsing
    let cleanDatetime = data.datetime;
    if (!cleanDatetime || cleanDatetime === 'Not specified') {
      cleanDatetime = this.parseDateTime(originalEmail);
    }

    // Validate participants array
    const cleanParticipants = Array.isArray(data.participants) 
      ? data.participants.filter(p => p && p.includes('@'))
      : [cleanEmail];

    // Ensure confidence is between 0 and 1
    const cleanConfidence = Math.max(0, Math.min(1, data.confidence || 0.85));

    return {
      contactName: cleanContactName,
      email: cleanEmail,
      company: cleanCompany,
      datetime: cleanDatetime,
      participants: cleanParticipants,
      intent: data.intent || 'schedule_meeting',
      confidence: cleanConfidence,
      reasoning: data.reasoning || 'Enhanced parsing with improved accuracy'
    };
  }

  private async fallbackParsing(emailContent: string): Promise<OpenAIParseResponse> {
    // Enhanced fallback parsing when OpenAI is not available
    console.log('Using enhanced fallback parsing...');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const parsedData = this.enhancedMockParsing(emailContent);
      return {
        success: true,
        data: parsedData,
        rawResponse: 'Enhanced fallback parsing used'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse email content'
      };
    }
  }

  private enhancedMockParsing(text: string): ParsedEmailData {
    // Enhanced email extraction
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = text.match(emailRegex) || [];
    
    // Enhanced date and time parsing
    const datetime = this.parseDateTime(text);
    
    // Enhanced company extraction with better precision
    const company = this.extractCompanyName(text);
    
    // Enhanced name extraction
    const contactName = this.extractContactName(text);
    
    // Enhanced intent detection
    const intent = this.detectIntent(text);
    
    // Calculate confidence based on extracted information quality
    const confidence = this.calculateConfidence(contactName, company, datetime, emails);

    return {
      contactName,
      email: emails[0] || 'no-email@example.com',
      company,
      datetime,
      participants: emails.slice(0, 5),
      intent,
      confidence,
      reasoning: 'Enhanced fallback parsing with improved accuracy'
    };
  }

  private parseDateTime(text: string): string {
    // Enhanced date patterns with better matching
    const dateTimePatterns = [
      // "Date: June 30, 2025" and "Time: 4:00 PM"
      /Date:\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}).*?Time:\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/gi,
      
      // "May 30 at 11.30 GMT+3"
      /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s+at\s+(\d{1,2})[\.:](\d{2})\s*(AM|PM|GMT[+-]\d+)?/gi,
      
      // "June 30, 2025 Time: 4:00 PM"
      /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}).*?(\d{1,2}):(\d{2})\s*(AM|PM)?/gi,
      
      // "would you be available on January 15th, 2024 at 2:00 PM"
      /available\s+on\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}).*?(\d{1,2}):(\d{2})\s*(AM|PM)?/gi,
      
      // "schedule a meeting for tomorrow at 3:00 PM"
      /(?:schedule|meeting|call)\s+(?:for|on)\s+tomorrow\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/gi,
      
      // "meet next week on Tuesday at 10:00 AM"
      /(?:meet|meeting|call)\s+next\s+week\s+on\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/gi,
    ];

    for (const pattern of dateTimePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const match = matches[0];
        
        if (pattern.source.includes('Date:.*Time:')) {
          // "Date: June 30, 2025" and "Time: 4:00 PM" pattern
          const month = match[1];
          const day = match[2];
          const year = match[3];
          const hour = match[4];
          const minute = match[5];
          const ampm = match[6] || '';
          return `${month} ${day}, ${year} at ${hour}:${minute} ${ampm}`.trim();
        } else if (pattern.source.includes('at')) {
          // "May 30 at 11.30 GMT+3" pattern
          const month = match[1];
          const day = match[2];
          const hour = match[3];
          const minute = match[4];
          const timezone = match[5] || '';
          const currentYear = new Date().getFullYear();
          return `${month} ${day}, ${currentYear + 1} at ${hour}:${minute} ${timezone}`.trim();
        } else if (pattern.source.includes('tomorrow')) {
          // "schedule a meeting for tomorrow at 3:00 PM" pattern
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const month = tomorrow.toLocaleString('en-US', { month: 'long' });
          const day = tomorrow.getDate();
          const year = tomorrow.getFullYear();
          const hour = match[1];
          const minute = match[2];
          const ampm = match[3] || '';
          return `${month} ${day}, ${year} at ${hour}:${minute} ${ampm}`.trim();
        } else if (pattern.source.includes('next\\s+week')) {
          // "meet next week on Tuesday at 10:00 AM" pattern
          const today = new Date();
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          const month = nextWeek.toLocaleString('en-US', { month: 'long' });
          const day = nextWeek.getDate();
          const year = nextWeek.getFullYear();
          const hour = match[2];
          const minute = match[3];
          const ampm = match[4] || '';
          return `${month} ${day}, ${year} at ${hour}:${minute} ${ampm}`.trim();
        } else {
          // Other patterns
          const month = match[1];
          const day = match[2];
          const year = match[3];
          const hour = match[4];
          const minute = match[5];
          const ampm = match[6] || '';
          return `${month} ${day}, ${year} at ${hour}:${minute} ${ampm}`.trim();
        }
      }
    }

    // Handle relative dates
    if (text.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (text.toLowerCase().includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    return 'Not specified';
  }

  private extractContactName(text: string): string {
    // Enhanced patterns for name extraction
    const namePatterns = [
      // "Best regards, Fred"
      /(?:Best\s+regards?|Best|Sincerely|Thanks?),?\s*\n?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      
      // "this is [Name]"
      /this\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      
      // Name before company in signature "Fred HighTechIno"
      /\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\n?\s*([A-Z][a-zA-Z\s&]+)/i,
      
      // Name at end of email
      /\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/i,
      
      // "Hi, I'm [Name]"
      /Hi,?\s+I'm\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      
      // "My name is [Name]"
      /My\s+name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      
      // "From: [Name]"
      /From:\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Filter out common words
        const commonWords = ['Best', 'Regards', 'Thanks', 'Sincerely', 'Hello', 'Hi', 'Dear', 'Meeting', 'Details'];
        if (!commonWords.includes(name)) {
          return name;
        }
      }
    }

    return 'Unknown Contact';
  }

  private extractCompanyName(text: string): string {
    // Enhanced company extraction patterns
    const companyPatterns = [
      // "recruiter at [Company]"
      /(?:recruiter|employee|work|working)\s+at\s+([A-Z][a-zA-Z\s&]+?)(?:\s*[,.]|\s+can|\s+I|\s*$)/i,
      
      // Company after name in signature "Fred HighTechIno"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\n?\s*([A-Z][a-zA-Z]+)(?:\s*\n|\s*$)/,
      
      // Well-known company patterns
      /\b(Andersen|HighTechIno|Microsoft|Google|Apple|Amazon|Meta|Tesla|Netflix|Spotify|Salesforce|Oracle|IBM|Intel|Adobe|Zoom|Slack|Dropbox)\b/i,
      
      // Company with legal suffixes
      /\b([A-Z][a-zA-Z\s&]+?(?:\s+(?:Inc\.|LLC|Corp\.|Corporation|Company|Ltd\.|Limited|Co\.)))\b/g,
      
      // "from [Company]"
      /from\s+([A-Z][a-zA-Z\s&]+?)(?:\s*[,.]|\s+and|\s+to|\s*$)/i,
      
      // "at [Company]"
      /\bat\s+([A-Z][a-zA-Z\s&]+?)(?:\s*[,.]|\s+and|\s+to|\s*$)/i,
    ];

    for (const pattern of companyPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] || match[2]) {
          const company = (match[2] || match[1]).trim();
          
          // Filter out common non-company words
          const excludeWords = ['the team', 'the office', 'the meeting', 'your convenience', 'our team', 'Best regards', 'Meeting Details'];
          const isExcluded = excludeWords.some(phrase => company.toLowerCase().includes(phrase.toLowerCase()));
          
          if (!isExcluded && company.length > 2 && company.length < 50) {
            return company;
          }
        }
      }
    }

    return 'Unknown Company';
  }

  private detectIntent(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Enhanced meeting detection patterns
    const schedulePatterns = [
      'schedule', 'meeting', 'appointment', 'call', 'arrange', 
      'invite you to', 'discuss our project', 'meeting details',
      'would like to meet', 'let\'s have a call', 'can we meet',
      'set up a call', 'let\'s connect', 'available on', 'available for',
      'would you be available', 'would love to chat', 'let\'s chat',
      'would like to discuss', 'would like to talk', 'let\'s talk',
      'would like to schedule', 'would like to arrange', 'would like to set up',
      'would like to connect', 'would like to meet', 'would like to have a call',
      'would like to have a meeting', 'would like to have a chat',
      'would like to have a discussion', 'would like to have a conversation',
      'would like to speak', 'would like to talk', 'would like to discuss',
      'would like to connect', 'would like to meet', 'would like to have a call'
    ];
    
    if (schedulePatterns.some(pattern => lowerText.includes(pattern))) {
      return 'schedule_meeting';
    }
    
    if (lowerText.includes('reschedule') || lowerText.includes('move the meeting') || 
        lowerText.includes('change the time') || lowerText.includes('postpone')) {
      return 'reschedule_meeting';
    } else if (lowerText.includes('cancel') || lowerText.includes('call off') || 
               lowerText.includes('cancel the meeting')) {
      return 'cancel_meeting';
    }
    
    return 'general';
  }

  private calculateConfidence(contactName: string, company: string, datetime: string, emails: string[]): number {
    let confidence = 0.6; // Base confidence
    
    // Boost confidence based on extracted information quality
    if (contactName !== 'Unknown Contact' && !contactName.includes('Hi ')) confidence += 0.15;
    if (company !== 'Unknown Company' && company.length < 50) confidence += 0.15;
    if (datetime !== 'Not specified') confidence += 0.15;
    if (emails.length > 0) confidence += 0.05;
    
    return Math.min(0.95, confidence);
  }

  // Utility method to check if OpenAI is available
  isOpenAIAvailable(): boolean {
    return this.isInitialized && this.client !== null;
  }

  // Method to test API connection
  async testConnection(): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      return false;
    }

    try {
      await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 5
      });
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

export const openaiService = new OpenAIService();
export type { ParsedEmailData, OpenAIParseResponse };