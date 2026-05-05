import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Search,
  Settings,
  User,
  LogOut,
  BarChart3,
  FileText,
  History,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Navigation items
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { path: '/analysis', label: 'Analysis', icon: <Search className="w-4 h-4" /> },
    { path: '/reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { path: '/history', label: 'History', icon: <History className="w-4 h-4" /> },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/analysis?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <Link to="/dashboard" className="flex items-center ml-2 lg:ml-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Market Analyst
                </h1>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:block relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </form>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '🌞' : '🌙'}
            </button>

            {/* Settings Link */}
            <Link
              to="/settings"
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>

            {/* Logout Button - Always Visible */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label="Logout"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.full_name || 'User'}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {user?.full_name || 'User'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      <Link
                        to="/settings"
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
                        Settings
                      </Link>
                      
                      <button
                        onClick={() => {
                          toggleTheme();
                          setIsProfileOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        {theme === 'dark' ? (
                          <>
                            <span className="mr-3">🌞</span>
                            Light Mode
                          </>
                        ) : (
                          <>
                            <span className="mr-3">🌙</span>
                            Dark Mode
                          </>
                        )}
                      </button>
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-200 dark:border-gray-700 mt-2 pt-4 pb-6 overflow-hidden"
            >
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="px-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </form>

              {/* Mobile Navigation */}
              <div className="space-y-1 px-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                      location.pathname === item.path
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Mobile User Actions */}
              <div className="px-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Link
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full btn-secondary text-sm py-2 flex items-center justify-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      toggleTheme();
                      setIsMenuOpen(false);
                    }}
                    className="w-full btn-secondary text-sm py-2 flex items-center justify-center"
                  >
                    {theme === 'dark' ? (
                      <>
                        <span className="mr-2">🌞</span>
                        Light Mode
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🌙</span>
                        Dark Mode
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full btn-primary text-sm py-2 flex items-center justify-center bg-red-600 hover:bg-red-700"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;