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
      const systemPrompt = `You are an expert email parser specialized in extracting meeting-related information. 

Your task is to analyze email content and extract structured data about meeting requests, cancellations, or rescheduling.

CRITICAL INSTRUCTIONS:
1. Extract ONLY the actual contact name (e.g., "Sarah Johnson" not "Hi Sarah Johnson")
2. Extract ONLY the company name (e.g., "Microsoft Corporation" not full sentences)
3. Be precise with date/time extraction
4. Identify the correct intent based on email content
5. Provide confidence score (0-1) based on clarity of information

RESPONSE FORMAT (JSON only):
{
  "contactName": "First Last",
  "email": "email@domain.com",
  "company": "Company Name Only",
  "datetime": "January 15, 2024 at 2:00 PM",
  "participants": ["email1@domain.com", "email2@domain.com"],
  "intent": "schedule_meeting|reschedule_meeting|cancel_meeting|general",
  "confidence": 0.95,
  "reasoning": "Brief explanation of extraction logic"
}

INTENT CLASSIFICATION:
- schedule_meeting: New meeting requests
- reschedule_meeting: Changing existing meeting time
- cancel_meeting: Cancelling existing meetings
- general: Other communications

COMPANY EXTRACTION RULES:
- Extract only company names, not full sentences
- Remove phrases like "at", "with the team at", etc.
- Examples: "Microsoft", "TechCorp Inc.", "Google LLC"

NAME EXTRACTION RULES:
- Extract actual names, not greetings
- "Hi Sarah Johnson" → "Sarah Johnson"
- "Dear Mr. Smith" → "Mr. Smith"`;

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
    // Clean contact name - remove greetings
    let cleanContactName = data.contactName || 'Unknown Contact';
    cleanContactName = cleanContactName
      .replace(/^(Hi|Hello|Dear)\s+/i, '')
      .replace(/,$/, '')
      .trim();

    // Clean company name - extract only company name
    let cleanCompany = data.company || 'Unknown Company';
    
    // Remove common prefixes and suffixes that might be included
    cleanCompany = cleanCompany
      .replace(/^(at|with|from|the team at|meeting with.*at)\s+/i, '')
      .replace(/\s+(to discuss|about|regarding|for).*$/i, '')
      .replace(/^(I wanted to|We would like to).*\s+(at|with)\s+/i, '')
      .trim();

    // Extract email if not provided or invalid
    let cleanEmail = data.email;
    if (!cleanEmail || !cleanEmail.includes('@')) {
      const emailMatch = originalEmail.match(/[\w.-]+@[\w.-]+\.\w+/);
      cleanEmail = emailMatch ? emailMatch[0] : 'no-email@example.com';
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
      datetime: data.datetime || 'Not specified',
      participants: cleanParticipants,
      intent: data.intent || 'general',
      confidence: cleanConfidence,
      reasoning: data.reasoning || 'Automated parsing'
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
        rawResponse: 'Fallback parsing used'
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
    // Enhanced date patterns
    const datePatterns = [
      // Full dates with various formats
      /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi,
      // Numeric dates
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
      // Relative dates
      /(tomorrow|next\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi
    ];

    // Enhanced time patterns
    const timePatterns = [
      /(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)/gi,
      /(\d{1,2}):(\d{2})/g
    ];

    let foundDate = '';
    let foundTime = '';

    // Extract date
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        foundDate = matches[0];
        break;
      }
    }

    // Extract time
    for (const pattern of timePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        foundTime = matches[0];
        break;
      }
    }

    // Handle relative dates
    if (foundDate.toLowerCase().includes('tomorrow')) {
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
    // Remove common email prefixes and clean the text
    const cleanText = text
      .replace(/^(Hi|Hello|Dear|Hey)\s+/i, '')
      .replace(/,.*$/s, '')
      .replace(/\n.*$/s, '')
      .trim();

    // Look for proper names (capitalized words)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/;
    const nameMatch = cleanText.match(namePattern);
    
    if (nameMatch) {
      const potentialName = nameMatch[1].trim();
      
      // Filter out common words
      const commonWords = ['Best', 'Kind', 'Looking', 'Thank', 'Please', 'Hope', 'Regards', 'Sincerely'];
      const nameWords = potentialName.split(' ');
      
      const hasCommonWord = nameWords.some(word => commonWords.includes(word));
      
      if (!hasCommonWord && nameWords.length >= 2) {
        return potentialName;
      }
    }

    // Fallback: look for names after greetings
    const greetingPattern = /(?:Hi|Hello|Dear)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
    const greetingMatch = text.match(greetingPattern);
    
    if (greetingMatch) {
      return greetingMatch[1].trim();
    }

    return 'Unknown Contact';
  }

  private extractCompanyName(text: string): string {
    // Pattern 1: Company names with legal suffixes
    const companySuffixPattern = /\b([A-Z][a-zA-Z\s&]+?(?:\s+(?:Inc\.|LLC|Corp\.|Corporation|Company|Ltd\.|Limited|Co\.)))\b/g;
    const suffixMatches = [...text.matchAll(companySuffixPattern)];
    
    if (suffixMatches.length > 0) {
      for (const match of suffixMatches) {
        const company = match[1].trim();
        if (company.split(' ').length <= 4) {
          return company;
        }
      }
    }

    // Pattern 2: "at [CompanyName]" extraction
    const atPattern = /\bat\s+([A-Z][a-zA-Z\s&]{1,30}?)(?:\s+(?:to|for|about|regarding|and|,|\.|$))/gi;
    const atMatches = [...text.matchAll(atPattern)];
    
    for (const match of atMatches) {
      const company = match[1].trim();
      const excludeWords = ['the team', 'the office', 'the meeting', 'your convenience'];
      const isExcluded = excludeWords.some(phrase => company.toLowerCase().includes(phrase));
      
      if (!isExcluded && company.length > 2 && company.length < 40) {
        return company;
      }
    }

    // Pattern 3: Well-known company names
    const knownCompanies = [
      'Microsoft', 'Google', 'Apple', 'Amazon', 'Meta', 'Tesla', 'Netflix', 'Spotify',
      'Salesforce', 'Oracle', 'IBM', 'Intel', 'Adobe', 'Zoom', 'Slack', 'Dropbox'
    ];
    
    for (const company of knownCompanies) {
      const regex = new RegExp(`\\b${company}(?:\\s+(?:Inc\\.|Corp\\.|Corporation|Company))?\\b`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[0];
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
               lowerText.includes('appointment') || lowerText.includes('call')) {
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