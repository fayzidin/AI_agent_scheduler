import React from 'react';
import { FileText, Users, CreditCard, AlertTriangle, Scale, Mail } from 'lucide-react';

const TermsOfService: React.FC = () => {
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
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xl text-indigo-200 max-w-3xl mx-auto leading-relaxed">
              Please read these terms carefully before using our AI Meeting Assistant service.
            </p>
            <p className="text-indigo-300 mt-4">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 space-y-8">
            
            {/* Acceptance of Terms */}
            <section>
              <div className="flex items-center mb-6">
                <Scale className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Acceptance of Terms</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  By accessing and using AI Meeting Assistant ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
                </p>
                <p className="text-indigo-200">
                  If you do not agree to abide by the above, please do not use this service. These terms apply to all visitors, users, and others who access or use the service.
                </p>
              </div>
            </section>

            {/* Service Description */}
            <section>
              <div className="flex items-center mb-6">
                <FileText className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Service Description</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">What We Provide</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• AI-powered email parsing and meeting extraction</li>
                    <li>• Calendar integration and automated scheduling</li>
                    <li>• CRM synchronization and contact management</li>
                    <li>• Meeting coordination and notification services</li>
                    <li>• Analytics and productivity insights</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Service Availability</h3>
                  <p className="text-indigo-200">
                    We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service. 
                    Scheduled maintenance will be announced in advance. We reserve the right to modify, 
                    suspend, or discontinue any part of the service with reasonable notice.
                  </p>
                </div>
              </div>
            </section>

            {/* User Accounts */}
            <section>
              <div className="flex items-center mb-6">
                <Users className="w-6 h-6 text-purple-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">User Accounts</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Account Registration</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• You must provide accurate and complete information</li>
                    <li>• You are responsible for maintaining account security</li>
                    <li>• One account per person or organization</li>
                    <li>• You must be 18 years or older to create an account</li>
                    <li>• Business accounts require valid business information</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Account Responsibilities</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Keep your login credentials secure and confidential</li>
                    <li>• Notify us immediately of any unauthorized access</li>
                    <li>• You are liable for all activities under your account</li>
                    <li>• Update your information when it changes</li>
                    <li>• Comply with all applicable laws and regulations</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Acceptable Use */}
            <section>
              <div className="flex items-center mb-6">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Acceptable Use Policy</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Permitted Uses</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Parse legitimate business and personal emails</li>
                    <li>• Schedule meetings with consenting participants</li>
                    <li>• Integrate with your own calendar and CRM systems</li>
                    <li>• Use the service for its intended business purposes</li>
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-red-300 mb-3">Prohibited Uses</h3>
                  <ul className="space-y-2 text-red-200">
                    <li>• Process emails without proper authorization</li>
                    <li>• Send spam or unsolicited communications</li>
                    <li>• Violate privacy laws or regulations</li>
                    <li>• Attempt to reverse engineer or hack the service</li>
                    <li>• Use the service for illegal or harmful activities</li>
                    <li>• Share account credentials with unauthorized users</li>
                    <li>• Overload our systems with excessive requests</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Subscription and Billing */}
            <section>
              <div className="flex items-center mb-6">
                <CreditCard className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Subscription & Billing</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Subscription Plans</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• <strong>Free Plan:</strong> Limited features with usage restrictions</li>
                    <li>• <strong>Pro Plan:</strong> Full features with higher usage limits</li>
                    <li>• <strong>Enterprise Plan:</strong> Custom features and dedicated support</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Billing Terms</h3>
                  <ul className="space-y-2 text-indigo-200">
                    <li>• Subscriptions are billed monthly or annually in advance</li>
                    <li>• All fees are non-refundable except as required by law</li>
                    <li>• Price changes will be communicated 30 days in advance</li>
                    <li>• Failed payments may result in service suspension</li>
                    <li>• You can cancel your subscription at any time</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Cancellation & Refunds</h3>
                  <p className="text-indigo-200 mb-3">
                    You may cancel your subscription at any time through your account settings. 
                    Cancellation takes effect at the end of your current billing period.
                  </p>
                  <p className="text-indigo-200">
                    Refunds are generally not provided, but we may offer prorated refunds 
                    for annual subscriptions cancelled within 30 days of purchase.
                  </p>
                </div>
              </div>
            </section>

            {/* Data and Privacy */}
            <section>
              <div className="flex items-center mb-6">
                <FileText className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Data and Privacy</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Your Data</h3>
                <ul className="space-y-2 text-indigo-200">
                  <li>• You retain ownership of all data you provide</li>
                  <li>• We process data only as necessary to provide the service</li>
                  <li>• You can export or delete your data at any time</li>
                  <li>• We implement industry-standard security measures</li>
                  <li>• See our Privacy Policy for detailed information</li>
                </ul>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <div className="flex items-center mb-6">
                <Scale className="w-6 h-6 text-purple-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Intellectual Property</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Our Rights</h3>
                  <p className="text-indigo-200">
                    The service, including all software, algorithms, designs, and content, 
                    is owned by us and protected by intellectual property laws. You may not 
                    copy, modify, or distribute any part of the service without permission.
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Your Rights</h3>
                  <p className="text-indigo-200">
                    You retain all rights to your data and content. By using the service, 
                    you grant us a limited license to process your data solely to provide 
                    the service as described in our Privacy Policy.
                  </p>
                </div>
              </div>
            </section>

            {/* Disclaimers and Limitations */}
            <section>
              <div className="flex items-center mb-6">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Disclaimers & Limitations</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-3">Service Disclaimer</h3>
                  <p className="text-yellow-200 text-sm">
                    The service is provided "as is" without warranties of any kind. We do not guarantee 
                    that the service will be error-free, secure, or continuously available. AI parsing 
                    results may not always be accurate and should be reviewed before taking action.
                  </p>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-red-300 mb-3">Limitation of Liability</h3>
                  <p className="text-red-200 text-sm">
                    To the maximum extent permitted by law, we shall not be liable for any indirect, 
                    incidental, special, or consequential damages arising from your use of the service. 
                    Our total liability shall not exceed the amount you paid for the service in the 
                    12 months preceding the claim.
                  </p>
                </div>
              </div>
            </section>

            {/* Termination */}
            <section>
              <div className="flex items-center mb-6">
                <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Termination</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  We may terminate or suspend your account immediately, without prior notice, 
                  for conduct that we believe violates these Terms or is harmful to other users, 
                  us, or third parties, or for any other reason.
                </p>
                <p className="text-indigo-200">
                  Upon termination, your right to use the service will cease immediately. 
                  You may download your data for 30 days after termination, after which 
                  it will be permanently deleted.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <div className="flex items-center mb-6">
                <FileText className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Changes to Terms</h2>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <p className="text-blue-200 text-sm">
                  We reserve the right to modify these terms at any time. We will notify users 
                  of material changes via email or through the service. Your continued use of 
                  the service after such modifications constitutes acceptance of the updated terms.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <div className="flex items-center mb-6">
                <Mail className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Contact Us</h2>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6">
                <p className="text-indigo-200 mb-4">
                  If you have questions about these Terms of Service:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-green-400 mr-3" />
                    <span className="text-white">legal@aimeetingassistant.com</span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-green-400 mr-3" />
                    <span className="text-white">support@aimeetingassistant.com</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Governing Law */}
            <section>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Governing Law</h3>
                <p className="text-purple-200 text-sm">
                  These Terms shall be interpreted and governed by the laws of the State of California, 
                  United States, without regard to conflict of law provisions. Any disputes shall be 
                  resolved in the courts of California.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;