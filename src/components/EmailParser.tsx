import React, { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Calendar, Users, Building, Clock } from 'lucide-react';
import CalendarIntegration from './CalendarIntegration';
import EventManagement from './EventManagement';

interface ParsedData {
  contactName: string;
  email: string;
  company: string;
  datetime: string;
  participants: string[];
  intent: string;
}

interface ParseResponse {
  success: boolean;
  data?: ParsedData;
  error?: string;
}

const EmailParser: React.FC = () => {
  const [emailText, setEmailText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);

  // Enhanced date and time parsing function
  const parseDateTime = (text: string): string => {
    // Enhanced date patterns
    const datePatterns = [
      // Full dates: January 15th, 2024 | Jan 15, 2024 | 15 January 2024
      /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi,
      // Numeric dates: 01/15/2024 | 15/01/2024 | 2024-01-15
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
      // Relative dates: tomorrow, next week, next Monday
      /(tomorrow|next\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi
    ];

    // Enhanced time patterns
    const timePatterns = [
      // 2:00 PM | 14:00 | 2 PM | 2:30 PM
      /(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)/gi,
      // 24-hour format: 14:00 | 09:30
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
    } else if (foundDate.toLowerCase().includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      foundDate = nextWeek.toLocaleDateString('en-US', { 
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
  };

  // Enhanced contact name extraction
  const extractContactName = (text: string): string => {
    // Remove common email prefixes and clean the text
    const cleanText = text
      .replace(/^(Hi|Hello|Dear|Hey)\s+/i, '')
      .replace(/,.*$/s, '') // Remove everything after first comma
      .replace(/\n.*$/s, '') // Remove everything after first line break
      .trim();

    // Look for proper names (two capitalized words)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/;
    const nameMatch = cleanText.match(namePattern);
    
    if (nameMatch) {
      const potentialName = nameMatch[1].trim();
      
      // Filter out common words that might be capitalized
      const commonWords = ['Best', 'Kind', 'Looking', 'Thank', 'Please', 'Hope', 'Regards', 'Sincerely'];
      const nameWords = potentialName.split(' ');
      
      // Check if any word in the name is a common word
      const hasCommonWord = nameWords.some(word => commonWords.includes(word));
      
      if (!hasCommonWord && nameWords.length >= 2) {
        return potentialName;
      }
    }

    // Fallback: look for names after "Hi", "Hello", "Dear"
    const greetingPattern = /(?:Hi|Hello|Dear)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
    const greetingMatch = text.match(greetingPattern);
    
    if (greetingMatch) {
      return greetingMatch[1].trim();
    }

    return 'Unknown Contact';
  };

  // Enhanced company name extraction with precise patterns
  const extractCompany = (text: string): string => {
    // Pattern 1: Company names with suffixes (most precise)
    const companySuffixPattern = /\b([A-Z][a-zA-Z\s&]+?(?:\s+(?:Inc\.|LLC|Corp\.|Corporation|Company|Ltd\.|Limited|Co\.)))\b/g;
    const suffixMatches = [...text.matchAll(companySuffixPattern)];
    
    if (suffixMatches.length > 0) {
      for (const match of suffixMatches) {
        const company = match[1].trim();
        // Make sure it's not part of a longer sentence
        if (company.split(' ').length <= 4) { // Reasonable company name length
          return company;
        }
      }
    }

    // Pattern 2: "at [CompanyName]" - very specific extraction
    const atPattern = /\bat\s+([A-Z][a-zA-Z\s&]{1,30}?)(?:\s+(?:to|for|about|regarding|and|,|\.|$|that|which|who))/gi;
    const atMatches = [...text.matchAll(atPattern)];
    
    for (const match of atMatches) {
      const company = match[1].trim();
      
      // Filter out common non-company phrases
      const excludeWords = ['the team', 'the office', 'the meeting', 'the same', 'the time', 'your convenience', 'your office'];
      const isExcluded = excludeWords.some(phrase => company.toLowerCase().includes(phrase));
      
      if (!isExcluded && company.length > 2 && company.length < 40 && /^[A-Z]/.test(company)) {
        return company;
      }
    }

    // Pattern 3: "from [CompanyName]" - specific extraction
    const fromPattern = /\bfrom\s+([A-Z][a-zA-Z\s&]{1,30}?)(?:\s+(?:to|for|about|regarding|and|,|\.|$|that|which|who))/gi;
    const fromMatches = [...text.matchAll(fromPattern)];
    
    for (const match of fromMatches) {
      const company = match[1].trim();
      
      // Filter out common non-company phrases
      const excludeWords = ['the team', 'the office', 'the meeting', 'what', 'where', 'when'];
      const isExcluded = excludeWords.some(phrase => company.toLowerCase().includes(phrase));
      
      if (!isExcluded && company.length > 2 && company.length < 40 && /^[A-Z]/.test(company)) {
        return company;
      }
    }

    // Pattern 4: "with [CompanyName]" - specific extraction
    const withPattern = /\bwith\s+(?:the\s+team\s+at\s+)?([A-Z][a-zA-Z\s&]{1,30}?)(?:\s+(?:to|for|about|regarding|and|,|\.|$|that|which|who))/gi;
    const withMatches = [...text.matchAll(withPattern)];
    
    for (const match of withMatches) {
      const company = match[1].trim();
      
      // Filter out personal references
      const excludeWords = ['you', 'me', 'us', 'them', 'the team', 'everyone', 'all'];
      const isExcluded = excludeWords.some(phrase => company.toLowerCase().includes(phrase));
      
      if (!isExcluded && company.length > 2 && company.length < 40 && /^[A-Z]/.test(company)) {
        return company;
      }
    }

    // Pattern 5: Well-known company names (standalone)
    const knownCompanies = [
      'Microsoft', 'Google', 'Apple', 'Amazon', 'Meta', 'Tesla', 'Netflix', 'Spotify',
      'Salesforce', 'Oracle', 'IBM', 'Intel', 'Adobe', 'Zoom', 'Slack', 'Dropbox',
      'TechCorp', 'DataSoft', 'CloudTech', 'InnovateLab', 'DigitalWorks'
    ];
    
    for (const company of knownCompanies) {
      const regex = new RegExp(`\\b${company}(?:\\s+(?:Inc\\.|Corp\\.|Corporation|Company|Ltd\\.|Limited))?\\b`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[0];
      }
    }

    // Pattern 6: Standalone capitalized words that look like companies (2-3 words max)
    const standalonePattern = /\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,2})\b/g;
    const standaloneMatches = [...text.matchAll(standalonePattern)];
    
    for (const match of standaloneMatches) {
      const company = match[1].trim();
      
      // Exclude common words that aren't companies
      const excludeWords = [
        'Hi', 'Hello', 'Dear', 'Best', 'Kind', 'Looking', 'Thank', 'Please', 'Hope', 
        'Regards', 'Sincerely', 'Would', 'Could', 'Should', 'Meeting', 'Project',
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December', 'Monday', 'Tuesday', 
        'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ];
      
      const isExcluded = excludeWords.some(word => company.toLowerCase().includes(word.toLowerCase()));
      
      if (!isExcluded && company.length > 3 && company.length < 30) {
        // Check if it appears in a company-like context
        const companyContext = new RegExp(`(?:at|from|with|company|corp|inc)\\s+${company}|${company}\\s+(?:inc|corp|company|team|office)`, 'i');
        if (companyContext.test(text)) {
          return company;
        }
      }
    }

    return 'Unknown Company';
  };

  // Mock AI parsing function - simulates API call
  const parseEmailWithAI = async (text: string): Promise<ParsedData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Enhanced email extraction
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = text.match(emailRegex) || [];
    
    // Enhanced date and time parsing
    const datetime = parseDateTime(text);
    
    // Enhanced company extraction
    const company = extractCompany(text);
    
    // Enhanced name extraction
    const contactName = extractContactName(text);
    
    // Enhanced intent detection with better keyword matching
    let intent = 'general';
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('reschedule') || lowerText.includes('move the meeting') || 
        lowerText.includes('change the time') || lowerText.includes('postpone')) {
      intent = 'reschedule_meeting';
    } else if (lowerText.includes('cancel') || lowerText.includes('call off') || 
               lowerText.includes('cancel the meeting')) {
      intent = 'cancel_meeting';
    } else if (lowerText.includes('meeting') || lowerText.includes('schedule') || 
               lowerText.includes('appointment') || lowerText.includes('call')) {
      intent = 'schedule_meeting';
    }
    
    return {
      contactName: contactName,
      email: emails[0] || 'no-email@example.com',
      company: company,
      datetime: datetime,
      participants: emails.slice(0, 3),
      intent: intent
    };
  };

  const handleParseEmail = async () => {
    if (!emailText.trim()) {
      setResult({ success: false, error: 'Please enter email content' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const parsedData = await parseEmailWithAI(emailText);
      setResult({ success: true, data: parsedData });
    } catch (error) {
      console.error('Parse error:', error);
      setResult({ 
        success: false, 
        error: 'Failed to parse email. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatParticipants = (participants: string[]) => {
    return participants && participants.length > 0 ? participants.join(', ') : 'None specified';
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'schedule_meeting':
        return <Calendar className="w-5 h-5 text-green-400" />;
      case 'cancel_meeting':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'reschedule_meeting':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Mail className="w-5 h-5 text-blue-400" />;
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'schedule_meeting':
        return 'text-green-300 bg-green-500/10 border-green-500/20';
      case 'cancel_meeting':
        return 'text-red-300 bg-red-500/10 border-red-500/20';
      case 'reschedule_meeting':
        return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
        <div className="flex items-center mb-8">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">Email Parser</h2>
        </div>

        <div className="space-y-8">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-semibold text-indigo-200 mb-4">
              Email Content
            </label>
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="Paste your email content here... 

Examples:

SCHEDULE:
Hi Sarah Johnson, I wanted to schedule a meeting with you and the team at Microsoft Corporation to discuss our upcoming project. Would you be available on January 15th, 2024 at 2:00 PM? Please let me know if this works for your schedule.

RESCHEDULE:
Hi John Smith, I need to reschedule our meeting with TechCorp Inc. that was planned for tomorrow at 3:00 PM. Can we move it to next week instead?

CANCEL:
Hi Sarah, I'm sorry but I need to cancel our meeting scheduled for Friday, January 20th, 2024 at 10:00 AM due to an emergency. Let's reschedule for next week."
              rows={12}
              className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Parse Button */}
          <button
            onClick={handleParseEmail}
            disabled={isLoading || !emailText.trim()}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] flex items-center justify-center space-x-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg">Analyzing Email...</span>
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                <span className="text-lg">Parse with AI</span>
              </>
            )}
          </button>

          {/* Results */}
          {result && (
            <div className="mt-8 space-y-6">
              {result.success ? (
                <>
                  {/* Success Header */}
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6">
                    <div className="flex items-center">
                      <CheckCircle className="w-8 h-8 text-green-400 mr-4" />
                      <div>
                        <h3 className="text-2xl font-bold text-green-300 mb-2">
                          Email Parsed Successfully
                        </h3>
                        <p className="text-green-200">
                          AI has extracted the following meeting information from your email
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Parsed Data */}
                  {result.data && (
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                      <h4 className="text-2xl font-bold text-white mb-8 flex items-center">
                        <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg mr-3">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        Meeting Information
                      </h4>
                      
                      <div className="grid lg:grid-cols-2 gap-8">
                        {/* Contact Information */}
                        <div className="space-y-6">
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Users className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Contact Name</span>
                            </div>
                            <p className="text-white font-bold text-lg">
                              {result.data.contactName}
                            </p>
                          </div>
                          
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Mail className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Email Address</span>
                            </div>
                            <p className="text-white font-bold text-lg break-all">
                              {result.data.email}
                            </p>
                          </div>
                          
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Building className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Company</span>
                            </div>
                            <p className="text-white font-bold text-lg">
                              {result.data.company}
                            </p>
                          </div>
                        </div>
                        
                        {/* Meeting Details */}
                        <div className="space-y-6">
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Calendar className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Date & Time</span>
                            </div>
                            <p className="text-white font-bold text-lg">
                              {result.data.datetime}
                            </p>
                          </div>
                          
                          <div className={`rounded-xl p-6 border ${getIntentColor(result.data.intent)}`}>
                            <div className="flex items-center mb-3">
                              {getIntentIcon(result.data.intent)}
                              <span className="text-sm font-semibold ml-2">Intent</span>
                            </div>
                            <p className="font-bold text-lg capitalize">
                              {result.data.intent.replace('_', ' ')}
                            </p>
                          </div>
                          
                          <div className="bg-white/10 rounded-xl p-6 border border-white/10">
                            <div className="flex items-center mb-3">
                              <Users className="w-5 h-5 text-blue-400 mr-2" />
                              <span className="text-sm font-semibold text-indigo-200">Participants</span>
                            </div>
                            <p className="text-white font-bold text-lg break-all">
                              {formatParticipants(result.data.participants)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-2xl p-6">
                  <div className="flex items-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mr-4" />
                    <div>
                      <h3 className="text-2xl font-bold text-red-300 mb-2">
                        Parsing Failed
                      </h3>
                      <p className="text-red-200">
                        {result.error || 'An unknown error occurred while parsing the email'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendar Integration - Auto-triggered for schedule intent */}
      {result?.success && result.data && result.data.intent === 'schedule_meeting' && (
        <CalendarIntegration 
          parsedData={result.data}
          emailContent={emailText}
          onScheduled={(event) => {
            console.log('Meeting scheduled:', event);
          }}
        />
      )}

      {/* Event Management - Auto-triggered for reschedule/cancel intents */}
      {result?.success && result.data && (result.data.intent === 'reschedule_meeting' || result.data.intent === 'cancel_meeting') && (
        <EventManagement 
          parsedData={result.data}
          onEventUpdated={(event) => {
            console.log('Event updated:', event);
          }}
        />
      )}
    </div>
  );
};

export default EmailParser;