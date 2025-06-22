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
              Your privacy is important to us. This policy explains how AI Meeting Assistant collects, uses, and protects your information.
            </p>
            <p className="text-indigo-300 mt-4">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 space-y-8">
            
            {/* Company Information */}
            <section>
              <div className="flex items-center mb-6">
                <Shield className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">About AI Meeting Assistant</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  AI Meeting Assistant ("we," "our," or "us") is a productivity platform that helps professionals automate email-driven meeting scheduling through artificial intelligence. 
                  We are committed to protecting your privacy and ensuring the security of your personal information.
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-indigo-300">
                  <div>
                    <strong>Service:</strong> AI Meeting Assistant<br/>
                    <strong>Website:</strong> https://aima.netlify.app<br/>
                    <strong>Contact:</strong> privacy@aimeetingassistant.com
                  </div>
                  <div>
                    <strong>Data Controller:</strong> AI Meeting Assistant Inc.<br/>
                    <strong>Jurisdiction:</strong> United States<br/>
                    <strong>Compliance:</strong> GDPR, CCPA, SOC 2
                  </div>
                </div>
              </div>
            </section>

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
                    <li>• <strong>Email address and password:</strong> Required for account creation and authentication</li>
                    <li>• <strong>Full name and company information:</strong> Used for personalization and meeting scheduling</li>
                    <li>• <strong>Profile picture (optional):</strong> For account customization</li>
                    <li>• <strong>Subscription and billing information:</strong> For paid plan management</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Email Content and Analysis</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>Email content you submit for parsing:</strong> Only emails you explicitly choose to analyze</li>
                    <li>• <strong>Extracted meeting information:</strong> Contact details, dates, times, and meeting context</li>
                    <li>• <strong>AI processing results:</strong> Confidence scores and analysis metadata</li>
                    <li>• <strong>Meeting scheduling data:</strong> Calendar events and attendee information</li>
                  </ul>
                  <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-blue-200 text-sm">
                      <strong>Important:</strong> We only access email content that you explicitly submit through our platform. 
                      We do not scan your entire inbox or access emails without your direct action.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Integration Data</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>Calendar access tokens:</strong> Securely stored OAuth tokens for calendar integration</li>
                    <li>• <strong>Calendar event data:</strong> Meeting information and availability</li>
                    <li>• <strong>CRM integration credentials:</strong> Encrypted tokens for third-party CRM access</li>
                    <li>• <strong>Contact synchronization data:</strong> Contact information shared with connected CRM systems</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Usage and Technical Information</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>Application usage patterns:</strong> Feature interactions and workflow analytics</li>
                    <li>• <strong>Error logs and performance metrics:</strong> For service improvement and debugging</li>
                    <li>• <strong>Device and browser information:</strong> For compatibility and security</li>
                    <li>• <strong>IP address and general location:</strong> For security and fraud prevention</li>
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
                  <h3 className="text-lg font-semibold text-white mb-3">Core Service Provision</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>AI email parsing:</strong> Analyze email content to extract meeting information</li>
                    <li>• <strong>Meeting scheduling:</strong> Automatically schedule meetings and manage calendar integrations</li>
                    <li>• <strong>CRM synchronization:</strong> Sync contact and meeting data with your CRM systems</li>
                    <li>• <strong>Customer support:</strong> Provide technical assistance and resolve issues</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Service Improvement and Development</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>AI model training:</strong> Improve parsing accuracy using anonymized data</li>
                    <li>• <strong>Feature development:</strong> Develop new features based on usage patterns</li>
                    <li>• <strong>Performance monitoring:</strong> Monitor system performance and reliability</li>
                    <li>• <strong>Security enhancement:</strong> Conduct security monitoring and fraud prevention</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Communication and Marketing</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>Service updates:</strong> Send feature announcements and product updates</li>
                    <li>• <strong>Billing notifications:</strong> Provide subscription and payment information</li>
                    <li>• <strong>Support communications:</strong> Respond to support requests and feedback</li>
                    <li>• <strong>Security alerts:</strong> Send important security and account notifications</li>
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
                    <li>• <strong>Data in transit:</strong> All data is encrypted using TLS 1.3 during transmission</li>
                    <li>• <strong>Data at rest:</strong> Database encryption using AES-256 encryption</li>
                    <li>• <strong>Cloud infrastructure:</strong> Hosted on SOC 2 Type II certified cloud providers</li>
                    <li>• <strong>Security audits:</strong> Regular security assessments and penetration testing</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Access Controls</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>Multi-factor authentication:</strong> Required for all user accounts</li>
                    <li>• <strong>Role-based access:</strong> Granular permissions for team features</li>
                    <li>• <strong>Access monitoring:</strong> Regular access reviews and permission audits</li>
                    <li>• <strong>API security:</strong> Secure authentication with rate limiting and monitoring</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Data Retention and Deletion</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>Email content:</strong> Retained for 90 days unless manually deleted</li>
                    <li>• <strong>Account data:</strong> Retained while your subscription is active</li>
                    <li>• <strong>Deleted data:</strong> Permanently removed within 30 days of deletion request</li>
                    <li>• <strong>Backup data:</strong> Encrypted backups retained for disaster recovery purposes</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Third-Party Services */}
            <section>
              <div className="flex items-center mb-6">
                <Database className="w-6 h-6 text-yellow-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Third-Party Integrations</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  AI Meeting Assistant integrates with the following third-party services to provide our functionality. 
                  We only share the minimum data necessary for each integration to function:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-white font-semibold mb-2">AI and Processing</h4>
                    <ul className="space-y-1 text-indigo-200 text-sm">
                      <li>• <strong>OpenAI:</strong> AI-powered email parsing and analysis</li>
                      <li>• <strong>Supabase:</strong> Database and authentication services</li>
                      <li>• <strong>Sentry:</strong> Error monitoring and performance tracking</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">Integrations</h4>
                    <ul className="space-y-1 text-indigo-200 text-sm">
                      <li>• <strong>Google Calendar:</strong> Calendar integration and event management</li>
                      <li>• <strong>Microsoft Outlook:</strong> Calendar and email integration</li>
                      <li>• <strong>CRM Platforms:</strong> HubSpot, Salesforce contact synchronization</li>
                      <li>• <strong>Stripe:</strong> Payment processing and subscription management</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-yellow-200 text-sm">
                    <strong>Important:</strong> Each third-party service has its own privacy policy. We recommend reviewing their policies to understand how they handle your data. 
                    We only share data that is necessary for the specific integration to function.
                  </p>
                </div>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <div className="flex items-center mb-6">
                <Shield className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Your Privacy Rights</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  Under applicable privacy laws (including GDPR and CCPA), you have the following rights regarding your personal data:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <ul className="space-y-3 text-indigo-200">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <strong>Right to Access:</strong> Request a copy of all personal data we hold about you
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <strong>Right to Correction:</strong> Update or correct any inaccurate information
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <strong>Right to Deletion:</strong> Request deletion of your personal data ("right to be forgotten")
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <ul className="space-y-3 text-indigo-200">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <strong>Right to Portability:</strong> Export your data in a machine-readable format
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <strong>Right to Restriction:</strong> Limit how we process your data
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <div>
                          <strong>Right to Object:</strong> Object to certain types of data processing
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-green-200 text-sm">
                    <strong>How to Exercise Your Rights:</strong> To exercise any of these rights, please contact us at 
                    <a href="mailto:privacy@aimeetingassistant.com" className="underline ml-1">privacy@aimeetingassistant.com</a>. 
                    We will respond to your request within 30 days.
                  </p>
                </div>
              </div>
            </section>

            {/* Data Sharing */}
            <section>
              <div className="flex items-center mb-6">
                <Eye className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Data Sharing and Disclosure</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">We Do NOT Sell Your Data</h3>
                  <p className="text-indigo-200 mb-4">
                    AI Meeting Assistant does not sell, rent, or trade your personal information to third parties for marketing purposes. 
                    Your data is used solely to provide and improve our services.
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Limited Data Sharing</h3>
                  <p className="text-indigo-200 mb-3">We may share your data only in the following circumstances:</p>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>Service Providers:</strong> With trusted third-party services that help us operate our platform</li>
                    <li>• <strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                    <li>• <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
                    <li>• <strong>Safety and Security:</strong> To protect the rights, property, or safety of our users</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* International Transfers */}
            <section>
              <div className="flex items-center mb-6">
                <Database className="w-6 h-6 text-purple-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">International Data Transfers</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  AI Meeting Assistant is based in the United States. If you are accessing our services from outside the US, 
                  your data may be transferred to and processed in the United States and other countries where our service providers operate.
                </p>
                <p className="text-indigo-200">
                  We ensure that all international data transfers are protected by appropriate safeguards, including:
                </p>
                <ul className="space-y-2 text-indigo-200 mt-3">
                  <li>• Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                  <li>• Adequacy decisions for countries with equivalent data protection laws</li>
                  <li>• Binding Corporate Rules for transfers within our corporate group</li>
                </ul>
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
                  If you have questions about this Privacy Policy, want to exercise your privacy rights, or need to report a privacy concern:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 text-blue-400 mr-3" />
                      <div>
                        <p className="text-white font-semibold">Privacy Officer</p>
                        <p className="text-indigo-200">privacy@aimeetingassistant.com</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-blue-400 mr-3" />
                      <div>
                        <p className="text-white font-semibold">Support Team</p>
                        <p className="text-indigo-200">support@aimeetingassistant.com</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-white font-semibold">Response Time</p>
                      <p className="text-indigo-200">We respond to privacy requests within 30 days</p>
                    </div>
                    <div>
                      <p className="text-white font-semibold">Data Protection Officer</p>
                      <p className="text-indigo-200">dpo@aimeetingassistant.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Updates */}
            <section>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">Policy Updates</h3>
                <p className="text-blue-200 text-sm mb-3">
                  We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. 
                  When we make material changes, we will notify you by:
                </p>
                <ul className="space-y-1 text-blue-200 text-sm">
                  <li>• Sending an email notification to your registered email address</li>
                  <li>• Displaying a prominent notice in our application</li>
                  <li>• Updating the "Last updated" date at the top of this policy</li>
                </ul>
                <p className="text-blue-200 text-sm mt-3">
                  Your continued use of AI Meeting Assistant after such modifications constitutes acceptance of the updated Privacy Policy.
                </p>
              </div>
            </section>

            {/* Compliance Certifications */}
            <section>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-300 mb-3">Compliance & Certifications</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-green-200 font-semibold">SOC 2 Type II</p>
                    <p className="text-green-300 text-xs">Security & Availability</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-green-200 font-semibold">GDPR Compliant</p>
                    <p className="text-green-300 text-xs">EU Data Protection</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-green-200 font-semibold">CCPA Compliant</p>
                    <p className="text-green-300 text-xs">California Privacy Rights</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;