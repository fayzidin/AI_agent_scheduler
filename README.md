# AI Meeting Assistant 📅✨

AI Meeting Assistant is a powerful tool that transforms your email workflow with AI-powered meeting detection, automatic scheduling, and seamless calendar integration.

![AI Meeting Assistant](https://user-images.githubusercontent.com/12345678/example-screenshot.png)

## 🚀 Features

- **Smart Email Parsing**: AI automatically detects meeting requests in your emails and extracts key information like contact details, dates, times, and meeting context with 95%+ accuracy.

- **Gmail & Outlook Integration**: Connect multiple email accounts in one unified dashboard. Supports both Gmail and Outlook with read-only access for privacy and security.

- **Automatic Scheduling**: Check availability, schedule meetings, and send calendar invitations to all participants without manual work.

- **CRM Integration**: Automatically sync meeting data and contact information to your CRM systems including HubSpot, Salesforce, and Google Sheets for seamless relationship management.

- **Calendar Export**: Generate calendar files (.ics/.vcs) for easy sharing and integration with any calendar system.

## 🔧 Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **AI**: OpenAI GPT API
- **Email Integration**: Gmail API, Microsoft Graph API
- **Deployment**: Netlify
- **Monitoring**: Sentry

## 🏗️ Project Structure

```
src/
├── components/     # UI components
├── contexts/       # React contexts for state management
├── services/       # Service integrations (Gmail, Outlook, OpenAI, etc.)
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── config/         # Configuration files
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key (optional, but recommended for full functionality)
- Google Cloud Console project (for Gmail/Calendar integration)
- Microsoft Azure App Registration (for Outlook integration)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI Configuration (Optional)
VITE_OPENAI_API_KEY=your-openai-api-key

# Google Calendar API Configuration (Optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_API_KEY=your-google-api-key

# Microsoft Outlook API Configuration (Optional)
VITE_OUTLOOK_CLIENT_ID=your-microsoft-client-id

# Sentry Configuration (Optional)
VITE_SENTRY_DSN=your-sentry-dsn

# Application Configuration
VITE_APP_URL=http://localhost:5173
VITE_ENVIRONMENT=development
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-meeting-assistant.git
   cd ai-meeting-assistant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL scripts in `supabase/migrations/` to set up the database schema
   - Add your Supabase URL and anon key to the `.env` file

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🚀 Deployment

The application is configured for easy deployment to Netlify:

1. Connect your GitHub repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `dist`
4. Add the environment variables from your `.env` file
5. Deploy!

## 📝 API Integration Setup

### Google API Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Gmail API and Google Calendar API
3. Create OAuth 2.0 credentials
4. Add your domain to the authorized JavaScript origins
5. Add your Google Client ID and API Key to the `.env` file

### Microsoft API Setup

1. Register an application in the [Azure Portal](https://portal.azure.com/)
2. Add the Microsoft Graph API permissions for Mail.Read and Calendars.Read
3. Configure the authentication platform as a Single-page application (SPA)
4. Add your domain to the redirect URIs
5. Add your Microsoft Client ID to the `.env` file

## 📊 Pricing Model

```
Free Tier:
- AI email parser (unlimited)
- Manual calendar export
- Basic support

Pro Tier ($19/month):
- Gmail & Outlook integration
- Automatic calendar scheduling
- CRM integrations
- Priority support

Enterprise Tier ($99/month):
- Team collaboration
- Custom integrations
- White-label options
- Dedicated support
```

## 🔒 Security & Privacy

- **Read-Only Access**: We use OAuth 2.0 with read-only permissions to securely connect your accounts
- **Data Encryption**: All data is encrypted in transit and at rest
- **Privacy First**: We only process emails you explicitly submit for analysis
- **No Data Selling**: We never sell your data or use it for advertising

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [OpenAI](https://openai.com/) for the AI capabilities
- [Supabase](https://supabase.com/) for authentication and database
- [Netlify](https://www.netlify.com/) for hosting
- [Sentry](https://sentry.io/) for error monitoring
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React](https://reactjs.org/) for the UI framework
- [TypeScript](https://www.typescriptlang.org/) for type safety
- [Vite](https://vitejs.dev/) for the build tool

## 📬 Contact

For questions or support, please email [support@aimeetingassistant.com](mailto:support@aimeetingassistant.com)

---

Built with ❤️ for productivity professionals