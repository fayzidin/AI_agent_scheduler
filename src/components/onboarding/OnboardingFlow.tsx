import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, Calendar, Users, Zap, Building, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const OnboardingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    teamSize: '',
    useCase: '',
    calendarProvider: '',
    crmProvider: '',
  });

  const { updateProfile } = useAuth();

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to AI Meeting Assistant',
      description: 'Let\'s get you set up in just a few steps',
      icon: <Zap className="w-8 h-8" />,
      component: <WelcomeStep />
    },
    {
      id: 'profile',
      title: 'Tell us about yourself',
      description: 'Help us personalize your experience',
      icon: <Building className="w-8 h-8" />,
      component: <ProfileStep formData={formData} setFormData={setFormData} />
    },
    {
      id: 'integrations',
      title: 'Connect your tools',
      description: 'Integrate with your calendar and CRM',
      icon: <Calendar className="w-8 h-8" />,
      component: <IntegrationsStep formData={formData} setFormData={setFormData} />
    },
    {
      id: 'complete',
      title: 'You\'re all set!',
      description: 'Start parsing emails and scheduling meetings',
      icon: <CheckCircle className="w-8 h-8" />,
      component: <CompleteStep />
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await updateProfile({
        company: formData.company || null,
        onboarding_completed: true,
      });
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    index <= currentStep
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-white/30 text-white/50'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                      index < currentStep ? 'bg-blue-500' : 'bg-white/20'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl text-white">
              {currentStepData.icon}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {currentStepData.title}
            </h1>
            <p className="text-indigo-200 text-lg">
              {currentStepData.description}
            </p>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {currentStepData.component}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>

            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleComplete}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span>Get Started</span>
                <CheckCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const WelcomeStep: React.FC = () => (
  <div className="text-center space-y-6">
    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-white/5 rounded-xl p-6">
        <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-white font-semibold mb-2">Smart Email Parsing</h3>
        <p className="text-indigo-200 text-sm">
          AI-powered extraction of meeting details from your emails
        </p>
      </div>
      <div className="bg-white/5 rounded-xl p-6">
        <Calendar className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-white font-semibold mb-2">Calendar Integration</h3>
        <p className="text-indigo-200 text-sm">
          Seamlessly schedule meetings across all your calendars
        </p>
      </div>
      <div className="bg-white/5 rounded-xl p-6">
        <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h3 className="text-white font-semibold mb-2">CRM Sync</h3>
        <p className="text-indigo-200 text-sm">
          Automatically sync contacts and meetings to your CRM
        </p>
      </div>
    </div>
  </div>
);

interface StepProps {
  formData: any;
  setFormData: (data: any) => void;
}

const ProfileStep: React.FC<StepProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-semibold text-indigo-200 mb-2">
          Company Name
        </label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your company name"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-indigo-200 mb-2">
          Your Role
        </label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" className="bg-slate-800">Select your role</option>
          <option value="executive" className="bg-slate-800">Executive</option>
          <option value="manager" className="bg-slate-800">Manager</option>
          <option value="sales" className="bg-slate-800">Sales</option>
          <option value="marketing" className="bg-slate-800">Marketing</option>
          <option value="other" className="bg-slate-800">Other</option>
        </select>
      </div>
    </div>
    
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-semibold text-indigo-200 mb-2">
          Team Size
        </label>
        <select
          value={formData.teamSize}
          onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" className="bg-slate-800">Select team size</option>
          <option value="1-10" className="bg-slate-800">1-10 people</option>
          <option value="11-50" className="bg-slate-800">11-50 people</option>
          <option value="51-200" className="bg-slate-800">51-200 people</option>
          <option value="200+" className="bg-slate-800">200+ people</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-indigo-200 mb-2">
          Primary Use Case
        </label>
        <select
          value={formData.useCase}
          onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" className="bg-slate-800">Select use case</option>
          <option value="sales" className="bg-slate-800">Sales meetings</option>
          <option value="client" className="bg-slate-800">Client meetings</option>
          <option value="internal" className="bg-slate-800">Internal meetings</option>
          <option value="all" className="bg-slate-800">All types</option>
        </select>
      </div>
    </div>
  </div>
);

const IntegrationsStep: React.FC<StepProps> = ({ formData, setFormData }) => (
  <div className="space-y-8">
    <div>
      <h3 className="text-xl font-semibold text-white mb-4">Calendar Integration</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { id: 'google', name: 'Google Calendar', icon: '📅' },
          { id: 'outlook', name: 'Microsoft Outlook', icon: '📆' },
          { id: 'apple', name: 'Apple Calendar', icon: '🍎' }
        ].map((provider) => (
          <button
            key={provider.id}
            onClick={() => setFormData({ ...formData, calendarProvider: provider.id })}
            className={`p-4 rounded-xl border transition-all duration-200 ${
              formData.calendarProvider === provider.id
                ? 'bg-blue-500/20 border-blue-400'
                : 'bg-white/5 border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="text-center">
              <span className="text-3xl mb-2 block">{provider.icon}</span>
              <p className="text-white font-semibold">{provider.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-xl font-semibold text-white mb-4">CRM Integration</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { id: 'hubspot', name: 'HubSpot', icon: '🔶' },
          { id: 'salesforce', name: 'Salesforce', icon: '☁️' },
          { id: 'pipedrive', name: 'Pipedrive', icon: '📊' }
        ].map((provider) => (
          <button
            key={provider.id}
            onClick={() => setFormData({ ...formData, crmProvider: provider.id })}
            className={`p-4 rounded-xl border transition-all duration-200 ${
              formData.crmProvider === provider.id
                ? 'bg-purple-500/20 border-purple-400'
                : 'bg-white/5 border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="text-center">
              <span className="text-3xl mb-2 block">{provider.icon}</span>
              <p className="text-white font-semibold">{provider.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>

    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
      <p className="text-blue-200 text-sm text-center">
        💡 Don't worry! You can set up these integrations later from your dashboard.
      </p>
    </div>
  </div>
);

const CompleteStep: React.FC = () => (
  <div className="text-center space-y-6">
    <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
      <CheckCircle className="w-12 h-12 text-white" />
    </div>
    
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-white">Welcome to the future of meeting scheduling!</h3>
      <p className="text-indigo-200 text-lg max-w-2xl mx-auto">
        You're now ready to start parsing emails and automating your meeting workflow. 
        Let's begin by parsing your first email!
      </p>
    </div>

    <div className="grid md:grid-cols-3 gap-4 mt-8">
      <div className="bg-white/5 rounded-xl p-4">
        <div className="text-2xl mb-2">📧</div>
        <h4 className="text-white font-semibold mb-1">Parse Emails</h4>
        <p className="text-indigo-200 text-sm">Extract meeting details with AI</p>
      </div>
      <div className="bg-white/5 rounded-xl p-4">
        <div className="text-2xl mb-2">📅</div>
        <h4 className="text-white font-semibold mb-1">Schedule Meetings</h4>
        <p className="text-indigo-200 text-sm">Auto-schedule in your calendar</p>
      </div>
      <div className="bg-white/5 rounded-xl p-4">
        <div className="text-2xl mb-2">🔄</div>
        <h4 className="text-white font-semibold mb-1">Sync to CRM</h4>
        <p className="text-indigo-200 text-sm">Keep your CRM up to date</p>
      </div>
    </div>
  </div>
);

export default OnboardingFlow;