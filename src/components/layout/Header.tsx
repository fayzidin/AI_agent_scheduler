import React, { useState } from 'react';
import { User, LogOut, Settings, Menu, X, Brain } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
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
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">AI Meeting Assistant</h1>
              <p className="text-indigo-200 text-xs">Powered by OpenAI</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Bolt.new Badge */}
            <a
              href="https://bolt.new/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative"
              title="Powered by Bolt.new"
            >
              <div className="relative w-12 h-12 lg:w-14 lg:h-14 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <img
                  src="public/white_circle_360x360.png"
                  alt="Powered by Bolt.new"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Powered by Bolt.new
                </div>
              </div>
            </a>

            {user && (
              <>
                <div className="text-white/70 text-sm">
                  Welcome back, <span className="text-white font-semibold">{profile?.full_name || user.email}</span>
                </div>
                
                {/* User Menu */}
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

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl">
                      <div className="p-4 border-b border-white/10">
                        <p className="text-white font-semibold">{profile?.full_name || 'User'}</p>
                        <p className="text-indigo-200 text-sm">{user.email}</p>
                        {profile?.company && (
                          <p className="text-indigo-300 text-xs">{profile.company}</p>
                        )}
                      </div>
                      
                      <div className="p-2">
                        <button className="w-full flex items-center space-x-2 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200">
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
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-3">
            {/* Mobile Bolt.new Badge */}
            <a
              href="https://bolt.new/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative"
              title="Powered by Bolt.new"
            >
              <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110">
                <img
                  src="/white_circle_360x360.png"
                  alt="Powered by Bolt.new"
                  className="w-full h-full object-contain drop-shadow-lg"
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
          <div className="md:hidden border-t border-white/20 py-4">
            {user && (
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
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200">
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
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;