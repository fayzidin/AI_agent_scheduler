import React, { useState } from 'react';
import { User, LogOut, Settings, Menu, X, Brain } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from '../auth/AuthModal';

const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
      setShowMobileMenu(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
    setShowMobileMenu(false);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
    setShowMobileMenu(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center space-x-2">
              <a href="/" className="flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl px-4 py-2 shadow-2xl">
                <Brain className="w-5 h-5 text-white" />
                <div className="w-14 h-10 flex items-center justify-center">
                  <img
                    src="/AIMA_logo.svg"
                    alt="AIMA"
                    className="w-20 h-16 object-contain filter brightness-0 invert"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<span class="text-white font-bold text-lg">AIMA</span>';
                      }
                    }}
                  />
                </div>
              </a>
              
              <div>
                <h1 className="text-white font-bold text-xl">AI Meeting Assistant</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Navigation Links */}
              <nav className="flex items-center space-x-6">
                <a href="/" className="text-white hover:text-blue-300 transition-colors">
                  Home
                </a>
                <a href="/parser" className="text-white hover:text-blue-300 transition-colors">
                  Try AI Parser
                </a>
                {user && (
                  <a href="/dashboard" className="text-white hover:text-blue-300 transition-colors">
                    Dashboard
                  </a>
                )}
              </nav>

              {/* Bolt.new Badge */}
              <a
                href="https://bolt.new/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center"
                title="Powered by Bolt.new"
              >
                <div className="relative w-16 h-16 lg:w-18 lg:h-18 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 shadow-2xl"></div>
                  <img
                    src="/white_circle_360x360.svg"
                    alt="Powered by Bolt.new"
                    className="relative w-full h-full object-contain p-1 filter drop-shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-16 h-16 lg:w-18 lg:h-18 bg-white rounded-full flex items-center justify-center shadow-2xl border border-gray-200">
                            <span class="text-black font-bold text-xs text-center leading-tight">BOLT<br/>.NEW</span>
                          </div>
                        `;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-500/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"></div>
                </div>
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                  <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl border border-white/10">
                    Powered by Bolt.new
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-2 h-2 bg-black/90 rotate-45"></div>
                  </div>
                </div>
              </a>

              {/* User Section */}
              {user ? (
                <>
                  <div className="text-white/70 text-sm">
                    Welcome back, <span className="text-white font-semibold">{profile?.full_name || user.email}</span>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                          {getInitials(profile?.full_name || user.email || 'U')}
                        </div>
                      )}
                    </button>

                    {showUserMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowUserMenu(false)}
                        ></div>
                        
                        <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-20">
                          <div className="p-4 border-b border-white/10">
                            <p className="text-white font-semibold">{profile?.full_name || 'User'}</p>
                            <p className="text-indigo-200 text-sm">{user.email}</p>
                            {profile?.company && (
                              <p className="text-indigo-300 text-xs">{profile.company}</p>
                            )}
                          </div>
                          
                          <div className="p-2">
                            <button 
                              onClick={() => {
                                setShowUserMenu(false);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                            >
                              <Settings className="w-4 h-4" />
                              <span>Settings</span>
                            </button>
                            
                            <button
                              onClick={handleSignOut}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={handleSignIn}
                    className="text-white hover:text-blue-300 transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={handleSignUp}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-3">
              <a
                href="https://bolt.new/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center"
                title="Powered by Bolt.new"
              >
                <div className="relative w-12 h-12 transition-transform duration-300 group-hover:scale-110">
                  <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 shadow-xl"></div>
                  <img
                    src="/white_circle_360x360.svg"
                    alt="Powered by Bolt.new"
                    className="relative w-full h-full object-contain p-1 filter drop-shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl border border-gray-200">
                            <span class="text-black font-bold text-xs text-center leading-tight">BOLT<br/>.NEW</span>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
              </a>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-30 md:hidden" 
                onClick={() => setShowMobileMenu(false)}
              ></div>
              
              <div className="md:hidden border-t border-white/20 py-4 relative z-40 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
                <nav className="space-y-2 px-4 mb-4">
                  <a href="/" className="block px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                    Home
                  </a>
                  <a href="/parser" className="block px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                    Try AI Parser
                  </a>
                  {user && (
                    <a href="/dashboard" className="block px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                      Dashboard
                    </a>
                  )}
                </nav>

                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 px-4">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                          {getInitials(profile?.full_name || user.email || 'U')}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-semibold">{profile?.full_name || 'User'}</p>
                        <p className="text-indigo-200 text-sm">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 px-4">
                      <button 
                        onClick={() => {
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 px-4">
                    <button 
                      onClick={handleSignIn}
                      className="w-full px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-left"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={handleSignUp}
                      className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          initialMode={authMode}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
};

export default Header;