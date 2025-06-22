import React from 'react';
import { Shield, Eye, Database, Lock, Mail, Phone } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-8 shadow-2xl">
              <Shield className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xl text-indigo-200 max-w-3xl mx-auto leading-relaxed">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
            <p className="text-indigo-300 mt-4">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 space-y-8">
            
            {/* Information We Collect */}
            <section>
              <div className="flex items-center mb-6">
                <Database className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Information We Collect</h2>
              </div>
              
              <div className="space-y-6 text-indigo-100">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Account Information</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Email address and password</li>
                    <li>• Full name and company information</li>
                    <li>• Profile picture (optional)</li>
                    <li>• Subscription and billing information</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Email Content</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Email content you submit for parsing</li>
                    <li>• Extracted meeting information and contacts</li>
                    <li>• AI processing results and confidence scores</li>
                    <li>• Meeting scheduling data and calendar events</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Integration Data</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Calendar access tokens and event data</li>
                    <li>• CRM integration credentials and contact information</li>
                    <li>• Third-party service authentication tokens</li>
                    <li>• Synchronized meeting and contact records</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Usage Information</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Application usage patterns and feature interactions</li>
                    <li>• Error logs and performance metrics</li>
                    <li>• Device information and browser details</li>
                    <li>• IP address and general location data</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Information */}
            <section>
              <div className="flex items-center mb-6">
                <Eye className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">How We Use Your Information</h2>
              </div>
              
              <div className="space-y-4 text-indigo-100">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Service Provision</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Parse and analyze email content using AI</li>
                    <li>• Schedule meetings and manage calendar integrations</li>
                    <li>• Sync data with your CRM and productivity tools</li>
                    <li>• Provide customer support and technical assistance</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Service Improvement</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Improve AI parsing accuracy and performance</li>
                    <li>• Develop new features and integrations</li>
                    <li>• Monitor system performance and reliability</li>
                    <li>• Conduct security monitoring and fraud prevention</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Communication</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Send service updates and feature announcements</li>
                    <li>• Provide billing and subscription notifications</li>
                    <li>• Respond to support requests and feedback</li>
                    <li>• Send security alerts and important notices</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Data Protection */}
            <section>
              <div className="flex items-center mb-6">
                <Lock className="w-6 h-6 text-purple-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Data Protection & Security</h2>
              </div>
              
              <div className="space-y-4 text-indigo-100">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Encryption & Storage</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• All data is encrypted in transit using TLS 1.3</li>
                    <li>• Database encryption at rest with AES-256</li>
                    <li>• Secure cloud infrastructure with SOC 2 compliance</li>
                    <li>• Regular security audits and penetration testing</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Access Controls</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Multi-factor authentication for all accounts</li>
                    <li>• Role-based access control for team features</li>
                    <li>• Regular access reviews and permission audits</li>
                    <li>• Secure API authentication with rate limiting</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Data Retention</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Email content retained for 90 days unless deleted</li>
                    <li>• Account data retained while subscription is active</li>
                    <li>• Deleted data permanently removed within 30 days</li>
                    <li>• Backup data retained for disaster recovery (encrypted)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Third-Party Services */}
            <section>
              <div className="flex items-center mb-6">
                <Database className="w-6 h-6 text-yellow-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Third-Party Services</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  We integrate with the following third-party services to provide our functionality:
                </p>
                <ul className="space-y-2 text-indigo-200">
                  <li>• <strong>OpenAI:</strong> AI-powered email parsing and analysis</li>
                  <li>• <strong>Google Calendar:</strong> Calendar integration and event management</li>
                  <li>• <strong>Microsoft Outlook:</strong> Calendar and email integration</li>
                  <li>• <strong>Supabase:</strong> Database and authentication services</li>
                  <li>• <strong>Sentry:</strong> Error monitoring and performance tracking</li>
                  <li>• <strong>Stripe:</strong> Payment processing and subscription management</li>
                </ul>
                <p className="text-indigo-300 mt-4 text-sm">
                  Each service has its own privacy policy. We only share the minimum data necessary for functionality.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <div className="flex items-center mb-6">
                <Shield className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Your Rights</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  You have the following rights regarding your personal data:
                </p>
                <ul className="space-y-2 text-indigo-200">
                  <li>• <strong>Access:</strong> Request a copy of your personal data</li>
                  <li>• <strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li>• <strong>Deletion:</strong> Request deletion of your personal data</li>
                  <li>• <strong>Portability:</strong> Export your data in a machine-readable format</li>
                  <li>• <strong>Restriction:</strong> Limit how we process your data</li>
                  <li>• <strong>Objection:</strong> Object to certain types of processing</li>
                </ul>
                <p className="text-indigo-300 mt-4 text-sm">
                  To exercise these rights, contact us at privacy@aimeetingassistant.com
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <div className="flex items-center mb-6">
                <Mail className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Contact Us</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  If you have questions about this Privacy Policy or our data practices:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-blue-400 mr-3" />
                    <span className="text-white">privacy@aimeetingassistant.com</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-blue-400 mr-3" />
                    <span className="text-white">+1 (555) 123-4567</span>
                  </div>
                </div>
                <p className="text-indigo-300 mt-4 text-sm">
                  We will respond to your inquiry within 30 days.
                </p>
              </div>
            </section>

            {/* Updates */}
            <section>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">Policy Updates</h3>
                <p className="text-blue-200 text-sm">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes 
                  by email or through our service. Your continued use of the service after such modifications 
                  constitutes acceptance of the updated Privacy Policy.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;