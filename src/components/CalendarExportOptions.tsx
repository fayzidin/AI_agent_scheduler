import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  FileText,
  Smartphone,
  Globe,
  Mail
} from 'lucide-react';
import { CalendarFileGenerator, CalendarEventData } from '../utils/calendarFileGenerator';

interface CalendarExportOptionsProps {
  event: CalendarEventData;
  className?: string;
}

const CalendarExportOptions: React.FC<CalendarExportOptionsProps> = ({ event, className = '' }) => {
  const [copiedContent, setCopiedContent] = useState<string | null>(null);
  const [showAllOptions, setShowAllOptions] = useState(false);

  const handleCopyContent = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(type);
      setTimeout(() => setCopiedContent(null), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const exportOptions = CalendarFileGenerator.getExportOptions(event);

  const quickAddOptions = [
    {
      id: 'google',
      name: 'Google Calendar',
      icon: '📅',
      url: exportOptions.googleCalendarURL,
      description: 'Add directly to Google Calendar'
    },
    {
      id: 'outlook',
      name: 'Outlook Web',
      icon: '📆',
      url: exportOptions.outlookURL,
      description: 'Add to Outlook.com calendar'
    },
    {
      id: 'yahoo',
      name: 'Yahoo Calendar',
      icon: '📋',
      url: exportOptions.yahooURL,
      description: 'Add to Yahoo Calendar'
    }
  ];

  const downloadOptions = [
    {
      id: 'ics',
      name: 'Download .ics',
      icon: <FileText className="w-4 h-4" />,
      action: exportOptions.downloadICS,
      description: 'Universal format (Google, Outlook, Apple)',
      compatibility: 'Most calendar apps'
    },
    {
      id: 'vcs',
      name: 'Download .vcs',
      icon: <Smartphone className="w-4 h-4" />,
      action: exportOptions.downloadVCS,
      description: 'Legacy format for older systems',
      compatibility: 'Older Outlook, some mobile apps'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Add to Calendar
        </h4>
        <button
          onClick={() => setShowAllOptions(!showAllOptions)}
          className="text-sm text-blue-300 hover:text-blue-200 transition-colors"
        >
          {showAllOptions ? 'Show Less' : 'More Options'}
        </button>
      </div>

      {/* Quick Add Options */}
      <div>
        <h5 className="text-sm font-semibold text-indigo-200 mb-3 flex items-center">
          <ExternalLink className="w-4 h-4 mr-2" />
          Quick Add (Online)
        </h5>
        <div className="grid md:grid-cols-3 gap-3">
          {quickAddOptions.map((option) => (
            <a
              key={option.id}
              href={option.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all duration-200 group"
            >
              <span className="text-2xl">{option.icon}</span>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{option.name}</p>
                <p className="text-indigo-200 text-xs">{option.description}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-indigo-300 group-hover:text-white transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Download Options */}
      <div>
        <h5 className="text-sm font-semibold text-indigo-200 mb-3 flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Download Calendar Files
        </h5>
        <div className="grid md:grid-cols-2 gap-3">
          {downloadOptions.map((option) => (
            <button
              key={option.id}
              onClick={option.action}
              className="flex items-center space-x-3 p-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all duration-200 group text-left"
            >
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300 group-hover:text-blue-200">
                {option.icon}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{option.name}</p>
                <p className="text-indigo-200 text-xs">{option.description}</p>
                <p className="text-indigo-300 text-xs mt-1">
                  <Globe className="w-3 h-3 inline mr-1" />
                  {option.compatibility}
                </p>
              </div>
              <Download className="w-4 h-4 text-indigo-300 group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      {showAllOptions && (
        <div className="space-y-4">
          <h5 className="text-sm font-semibold text-indigo-200 flex items-center">
            <Copy className="w-4 h-4 mr-2" />
            Copy Calendar Data
          </h5>
          
          <div className="space-y-3">
            {/* Copy ICS Content */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold text-sm">ICS Format</span>
                <button
                  onClick={() => handleCopyContent(exportOptions.icsContent, 'ics')}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200"
                >
                  {copiedContent === 'ics' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="text-xs">
                    {copiedContent === 'ics' ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>
              <p className="text-indigo-200 text-xs">
                Standard iCalendar format - paste into any calendar application
              </p>
            </div>

            {/* Copy VCS Content */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold text-sm">VCS Format</span>
                <button
                  onClick={() => handleCopyContent(exportOptions.vcsContent, 'vcs')}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200"
                >
                  {copiedContent === 'vcs' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="text-xs">
                    {copiedContent === 'vcs' ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>
              <p className="text-indigo-200 text-xs">
                Legacy vCalendar format - compatible with older systems
              </p>
            </div>
          </div>

          {/* Email Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center mb-2">
              <Mail className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-300 font-semibold text-sm">Email Instructions</span>
            </div>
            <p className="text-blue-200 text-xs">
              You can email the downloaded .ics file to attendees. Most email clients will show an "Add to Calendar" button when they receive the attachment.
            </p>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h6 className="text-white font-semibold text-sm mb-2">📱 How to Use</h6>
        <ul className="text-indigo-200 text-xs space-y-1">
          <li>• <strong>Quick Add:</strong> Click links above to add directly to online calendars</li>
          <li>• <strong>Download:</strong> Save .ics/.vcs files and import into any calendar app</li>
          <li>• <strong>Mobile:</strong> Downloaded files will open in your default calendar app</li>
          <li>• <strong>Desktop:</strong> Double-click downloaded files to import</li>
        </ul>
      </div>
    </div>
  );
};

export default CalendarExportOptions;