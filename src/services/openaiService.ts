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
      console.warn('OpenAI API key not found. Using mock responses.');
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
    if (!this.isInitialized || !this.client) {
      console.log('OpenAI not available, falling back to enhanced mock parsing');
      return this.fallbackParsing(emailContent);
    }

    try {
      const systemPrompt = `You are an expert email parser specialized in extracting meeting-related information with high accuracy.

CRITICAL PARSING RULES:
1. CONTACT NAME: Extract the actual sender's name, not greetings
   - "Hello, Fayzidin, this is Alesia" → contactName: "Alesia"
   - "Hi colleagues, ...Best regards, Fred" → contactName: "Fred"
   - Look for "this is [NAME]", "Best regards, [NAME]", signature lines

2. COMPANY NAME: Extract company names mentioned in context
   - "recruiter at Andersen" → company: "Andersen"
   - "Best regards, Fred HighTechIno" → company: "HighTechIno"
   - Look for "at [COMPANY]", "from [COMPANY]", signature companies

3. DATE/TIME: Parse various date formats accurately
   - "May 30 at 11.30 GMT+3" → "May 30, 2024 at 11:30 AM GMT+3"
   - "June 30, 2025 Time: 4:00 PM" → "June 30, 2025 at 4:00 PM"
   - Always include year if missing (use current year + 1 if month has passed)

4. EMAIL EXTRACTION: Find all email addresses in the content
   - Extract from signatures, participant lists, etc.

5. INTENT DETECTION: Be precise about meeting intentions
   - "can we arrange a call" → "schedule_meeting"
   - "I'd like to invite you to a meeting" → "schedule_meeting"

RESPONSE FORMAT (JSON only):
{
  "contactName": "Actual sender name",
  "email": "sender@domain.com",
  "company": "Company Name",
  "datetime": "Formatted date and time",
  "participants": ["email1@domain.com", "email2@domain.com"],
  "intent": "schedule_meeting|reschedule_meeting|cancel_meeting|general",
  "confidence": 0.95,
  "reasoning": "Brief explanation of extraction logic"
}

EXAMPLES:
Input: "Hello, Fayzidin, this is Alesia, recruiter at Andersen, can we arrange a call with our hiring manager, I suggest choosing a slot - May 30 at 11.30 GMT+3?"
Output: {
  "contactName": "Alesia",
  "email": "alesia@andersen.com",
  "company": "Andersen",
  "datetime": "May 30, 2024 at 11:30 AM GMT+3",
  "participants": ["fayzidin@example.com"],
  "intent": "schedule_meeting",
  "confidence": 0.9,
  "reasoning": "Clear meeting request from Alesia at Andersen for May 30"
}`;

      const userPrompt = `Parse this email content and extract meeting information:

${emailContent}

Return only valid JSON with the extracted information.`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsedData = JSON.parse(responseContent) as ParsedEmailData;
        
        // Validate and clean the response
        const cleanedData = this.validateAndCleanResponse(parsedData, emailContent);
        
        return {
          success: true,
          data: cleanedData,
          rawResponse: responseContent
        };
      } catch (parseError) {
        console.error('Failed to parse OpenAI JSON response:', parseError);
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
      console.log('Falling back to mock parsing due to API error');
      return this.fallbackParsing(emailContent);
    }
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
    const cleanConfidence = Math.max(0, Math.min(1, data.confidence || 0.8));

    return {
      contactName: cleanContactName,
      email: cleanEmail,
      company: cleanCompany,
      datetime: cleanDatetime,
      participants: cleanParticipants,
      intent: data.intent || 'general',
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
      participants: emails.slice(0, 3),
      intent,
      confidence,
      reasoning: 'Enhanced fallback parsing with improved accuracy'
    };
  }

  private parseDateTime(text: string): string {
    // Enhanced date patterns with better matching
    const dateTimePatterns = [
      // "May 30 at 11.30 GMT+3"
      /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s+at\s+(\d{1,2})[\.:](\d{2})\s*(AM|PM|GMT[+-]\d+)?/gi,
      
      // "June 30, 2025 Time: 4:00 PM"
      /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}).*?(?:Time:|at)\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/gi,
      
      // "Date: June 30, 2025" and "Time: 4:00 PM" on separate lines
      /Date:\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi,
      
      // Standard date formats
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
    ];

    const timePatterns = [
      /Time:\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/gi,
      /at\s+(\d{1,2})[\.:](\d{2})\s*(AM|PM|GMT[+-]\d+)?/gi,
      /(\d{1,2}):(\d{2})\s*(AM|PM)/gi
    ];

    let foundDate = '';
    let foundTime = '';
    let foundYear = '';

    // Extract date with enhanced patterns
    for (const pattern of dateTimePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const match = matches[0];
        if (match[3] && match[3].length === 4) {
          // Has year
          foundDate = `${match[1]} ${match[2]}, ${match[3]}`;
          foundYear = match[3];
          if (match[4] && match[5]) {
            foundTime = `${match[4]}:${match[5]} ${match[6] || ''}`.trim();
          }
        } else {
          // No year, add current year + 1
          const currentYear = new Date().getFullYear();
          foundDate = `${match[1]} ${match[2]}, ${currentYear + 1}`;
          foundYear = (currentYear + 1).toString();
          if (match[3] && match[4]) {
            foundTime = `${match[3]}:${match[4]} ${match[5] || ''}`.trim();
          }
        }
        break;
      }
    }

    // Extract time if not found with date
    if (!foundTime) {
      for (const pattern of timePatterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
          const match = matches[0];
          foundTime = `${match[1]}:${match[2]} ${match[3] || ''}`.trim();
          break;
        }
      }
    }

    // Handle relative dates
    if (text.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      foundDate = tomorrow.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }

    // Combine date and time
    if (foundDate && foundTime) {
      return `${foundDate} at ${foundTime}`;
    } else if (foundDate) {
      return foundDate;
    } else if (foundTime) {
      return `Today at ${foundTime}`;
    }

    return 'Not specified';
  }

  private extractContactName(text: string): string {
    // Enhanced patterns for name extraction
    const namePatterns = [
      // "this is [Name]"
      /this\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      
      // "Best regards, [Name]" or "Best, [Name]"
      /(?:Best\s+regards?|Best|Sincerely|Thanks?),?\s*\n?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      
      // Name before company in signature
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\n?\s*([A-Z][a-zA-Z\s&]+(?:Inc\.|LLC|Corp\.|Corporation|Company|Ltd\.))/i,
      
      // Name at end of email
      /\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\n?\s*([A-Z][a-zA-Z\s&]+)\s*$/i,
      
      // After greeting patterns
      /(?:Hi|Hello|Dear)\s+[^,]+,?\s+this\s+is\s+([A-Z][a-z]+)/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Filter out common words
        const commonWords = ['Best', 'Regards', 'Thanks', 'Sincerely', 'Hello', 'Hi', 'Dear'];
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
      
      // Company in signature (Name \n Company)
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\n?\s*([A-Z][a-zA-Z\s&]+)(?:\s*\n|\s*$)/,
      
      // Company with legal suffixes
      /\b([A-Z][a-zA-Z\s&]+?(?:\s+(?:Inc\.|LLC|Corp\.|Corporation|Company|Ltd\.|Limited|Co\.)))\b/g,
      
      // "from [Company]"
      /from\s+([A-Z][a-zA-Z\s&]+?)(?:\s*[,.]|\s+to|\s*$)/i,
      
      // Well-known company patterns
      /\b(Andersen|HighTechIno|Microsoft|Google|Apple|Amazon|Meta|Tesla|Netflix|Spotify|Salesforce|Oracle|IBM|Intel|Adobe|Zoom|Slack|Dropbox)\b/i,
    ];

    for (const pattern of companyPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] || match[2]) {
          const company = (match[1] || match[2]).trim();
          
          // Filter out common non-company words
          const excludeWords = ['the team', 'the office', 'the meeting', 'your convenience', 'our team', 'Best regards'];
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
    
    if (lowerText.includes('reschedule') || lowerText.includes('move the meeting') || 
        lowerText.includes('change the time') || lowerText.includes('postpone')) {
      return 'reschedule_meeting';
    } else if (lowerText.includes('cancel') || lowerText.includes('call off') || 
               lowerText.includes('cancel the meeting')) {
      return 'cancel_meeting';
    } else if (lowerText.includes('meeting') || lowerText.includes('schedule') || 
               lowerText.includes('appointment') || lowerText.includes('call') ||
               lowerText.includes('arrange') || lowerText.includes('invite you to')) {
      return 'schedule_meeting';
    }
    
    return 'general';
  }

  private calculateConfidence(contactName: string, company: string, datetime: string, emails: string[]): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on extracted information quality
    if (contactName !== 'Unknown Contact' && !contactName.includes('Hi ')) confidence += 0.2;
    if (company !== 'Unknown Company' && company.length < 50) confidence += 0.2;
    if (datetime !== 'Not specified') confidence += 0.2;
    if (emails.length > 0) confidence += 0.1;
    
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