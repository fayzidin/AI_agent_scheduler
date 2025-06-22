import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Mail, Shield, FileText, Github, Twitter, Linkedin, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/20 backdrop-blur-md border-t border-white/10 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">AI Meeting Assistant</h3>
                <p className="text-indigo-300 text-xs">Powered by OpenAI</p>
              </div>
            </div>
            <p className="text-indigo-200 text-sm">
              Transform your email workflow with AI-powered meeting detection, automatic scheduling, and seamless calendar integration.
            </p>
            <div className="flex items-center space-x-2 text-xs text-indigo-300">
              <Shield className="w-4 h-4" />
              <span>SOC 2 Certified • GDPR Compliant</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/parser" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Email Parser
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Email Dashboard
                </Link>
              </li>
              <li>
                <a href="#calendar-integration" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Calendar Integration
                </a>
              </li>
              <li>
                <a href="#crm-sync" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  CRM Sync
                </a>
              </li>
              <li>
                <a href="#analytics" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Analytics
                </a>
              </li>
              <li>
                <a href="#api" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  API Access
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  About Us
                </a>
              </li>
              <li>
                <a href="#blog" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Blog
                </a>
              </li>
              <li>
                <a href="#careers" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Careers
                </a>
              </li>
              <li>
                <a href="mailto:support@aimeetingassistant.com" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Contact
                </a>
              </li>
              <li>
                <a href="#help" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#security" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal & Support</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/privacy" 
                  className="text-indigo-200 hover:text-white transition-colors text-sm flex items-center"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="text-indigo-200 hover:text-white transition-colors text-sm flex items-center"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <a href="#cookies" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#compliance" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Compliance
                </a>
              </li>
              <li>
                <a href="mailto:support@aimeetingassistant.com" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Support
                </a>
              </li>
              <li>
                <a href="mailto:privacy@aimeetingassistant.com" className="text-indigo-200 hover:text-white transition-colors text-sm">
                  Privacy Officer
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-indigo-300 text-sm">
              © {new Date().getFullYear()} AI Meeting Assistant. All rights reserved. | 
              <span className="ml-1">Made with ❤️ for productivity professionals</span>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <a 
                href="https://twitter.com/aimeetingassist" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 hover:text-white transition-colors"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/company/ai-meeting-assistant" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 hover:text-white transition-colors"
                aria-label="Connect on LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/ai-meeting-assistant" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 hover:text-white transition-colors"
                aria-label="View on GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="mailto:support@aimeetingassistant.com" 
                className="text-indigo-300 hover:text-white transition-colors"
                aria-label="Email Support"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-indigo-300 text-sm">All systems operational</span>
              <a 
                href="#status" 
                className="text-indigo-300 hover:text-white transition-colors"
                aria-label="System Status"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Additional Legal Notice */}
        <div className="border-t border-white/10 mt-6 pt-6">
          <div className="text-center">
            <p className="text-indigo-300 text-xs leading-relaxed max-w-4xl mx-auto">
              AI Meeting Assistant is a productivity platform that helps professionals automate email-driven meeting scheduling. 
              We use artificial intelligence to parse email content and extract meeting information with your explicit consent. 
              Your privacy is our priority - we never sell your data and only access emails you explicitly submit for analysis. 
              All data is encrypted and stored securely in compliance with SOC 2, GDPR, and CCPA standards.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;