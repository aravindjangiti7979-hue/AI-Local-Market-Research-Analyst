import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BarChart3,
  Search,
  FileText,
  Clock,
  Settings,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Users,
  MapPin,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Globe,
  Database,
} from 'lucide-react';

const Sidebar = ({ isCollapsed = false, onToggleCollapse }) => {
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const location = useLocation();

  const mainNavItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      description: 'Overview & metrics',
    },
    {
      path: '/analysis',
      label: 'Analysis',
      icon: <Search className="w-5 h-5" />,
      description: 'Run market analysis',
      badge: 'AI',
      badgeColor: 'purple',
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: <FileText className="w-5 h-5" />,
      description: 'Generated reports',
      badge: '12',
      badgeColor: 'blue',
    },
    {
      path: '/history',
      label: 'History',
      icon: <Clock className="w-5 h-5" />,
      description: 'Analysis history',
    },
  ];

  const analysisTypes = [
    {
      id: 'quick',
      label: 'Quick Analysis',
      icon: <Zap className="w-4 h-4" />,
      description: 'Fast market scan',
      color: 'yellow',
    },
    {
      id: 'competitor',
      label: 'Competitor Analysis',
      icon: <Users className="w-4 h-4" />,
      description: 'Analyze competitors',
      color: 'blue',
    },
    {
      id: 'sentiment',
      label: 'Sentiment Analysis',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Customer sentiment',
      color: 'green',
    },
    {
      id: 'geographic',
      label: 'Geographic Analysis',
      icon: <MapPin className="w-4 h-4" />,
      description: 'Location-based insights',
      color: 'red',
    },
    {
      id: 'financial',
      label: 'Financial Analysis',
      icon: <DollarSign className="w-4 h-4" />,
      description: 'Market economics',
      color: 'emerald',
    },
  ];

  const secondaryNavItems = [
    {
      path: '/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
    {
      path: '/help',
      label: 'Help & Support',
      icon: <HelpCircle className="w-5 h-5" />,
    },
  ];

  const getBadgeColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[color] || colors.blue;
  };

  const getAnalysisColor = (color) => {
    const colors = {
      yellow: 'bg-yellow-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      emerald: 'bg-emerald-500',
      purple: 'bg-purple-500',
    };
    return colors[color] || colors.blue;
  };

  return (
    <motion.aside
      initial={{ width: isCollapsed ? 80 : 280 }}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="hidden lg:flex flex-col h-screen sticky top-0 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300"
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mr-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Market Analyst
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI-Powered Insights</p>
              </div>
            </motion.div>
          )}
          
          {isCollapsed && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          )}
          
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* User Quick Stats */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 mx-4 my-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-800/30"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Pro Plan
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  12 analyses left
                </div>
              </div>
            </div>
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
              style={{ width: '75%' }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>75% used</span>
            <span>Renews: 15 days</span>
          </div>
        </motion.div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  group flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} 
                  px-4 py-3 rounded-xl text-sm font-medium transition-all relative
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
                onClick={() => item.path === '/analysis' && setActiveSubmenu(activeSubmenu === 'analysis' ? null : 'analysis')}
              >
                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full"
                  />
                )}
                
                <div className="flex items-center">
                  <div className={`${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {item.icon}
                  </div>
                  
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-3 text-left"
                    >
                      <div className="flex items-center">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${getBadgeColor(item.badgeColor)}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {!isCollapsed && item.badge && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeColor(item.badgeColor)}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Analysis Types Submenu */}
        <AnimatePresence>
          {!isCollapsed && activeSubmenu === 'analysis' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700"
            >
              <div className="py-2 space-y-1">
                {analysisTypes.map((type) => (
                  <button
                    key={type.id}
                    className="group flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center flex-1">
                      <div className={`w-2 h-2 rounded-full ${getAnalysisColor(type.color)} mr-3`} />
                      <div className="text-left">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {type.description}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Sources Section */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8"
          >
            <div className="px-4 mb-3">
              <div className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Database className="w-4 h-4 mr-2" />
                Data Sources
              </div>
            </div>
            
            <div className="space-y-2">
              {[
                { name: 'Google Places', status: 'active', icon: <Globe className="w-4 h-4" /> },
                { name: 'Yelp API', status: 'active', icon: <Sparkles className="w-4 h-4" /> },
                { name: 'News API', status: 'limited', icon: <FileText className="w-4 h-4" /> },
                { name: 'Social Media', status: 'inactive', icon: <Users className="w-4 h-4" /> },
              ].map((source) => (
                <div
                  key={source.name}
                  className="flex items-center px-4 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    source.status === 'active' ? 'bg-green-500' :
                    source.status === 'limited' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1 flex items-center">
                    <div className="text-gray-500 dark:text-gray-400 mr-2">
                      {source.icon}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{source.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    source.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    source.status === 'limited' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {source.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Secondary Navigation & Collapsed Menu */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed ? (
          <>
            <div className="space-y-1">
              {secondaryNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <div className={`${location.pathname === item.path ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {item.icon}
                  </div>
                  <span className="ml-3">{item.label}</span>
                </NavLink>
              ))}
            </div>
            
            {/* Quick Actions */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Quick Actions
              </h4>
              <div className="space-y-2">
                <button className="w-full btn-primary text-sm py-2">
                  New Analysis
                </button>
                <button className="w-full btn-secondary text-sm py-2">
                  Export Data
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className="p-3 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                title={item.label}
              >
                {item.icon}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* AI Status Indicator */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
              <span className="text-xs text-gray-600 dark:text-gray-400">AI Active</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              v1.2.0
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
};

export default Sidebar;