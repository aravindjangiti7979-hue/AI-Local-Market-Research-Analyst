import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  DollarSign,
  MapPin,
  BarChart3,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  Plus,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Components
import LoadingSpinner, { InlineSpinner } from '../components/LoadingSpinner';
import TrendChart from '../components/TrendChart';
import CompetitorTable from '../components/CompetitorTable';
import MarketMap from '../components/MarketMap';
import ReportCard, { ReportsGrid } from '../components/ReportCard';
import { useAuth } from '../hooks/useAuth';
import { marketDataService } from '../services/marketData';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard data - REAL DATA ONLY
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['dashboard', timeRange],
    queryFn: async () => {
      const data = await marketDataService.getDashboardData(timeRange);
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch recent reports - REAL DATA ONLY
  const {
    data: recentReports = [],
    isLoading: reportsLoading,
  } = useQuery({
    queryKey: ['recentReports'],
    queryFn: async () => {
      const data = await marketDataService.getUserReports({ 
        limit: 5, 
        sortBy: 'date', 
        sortOrder: 'desc' 
      });
      return data;
    },
  });

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Dashboard updated successfully!');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle export data
  const handleExportData = async () => {
    try {
      toast.loading('Preparing export...');
      
      const response = await marketDataService.exportDashboardData(timeRange);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `market-data-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('Export completed successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      toast.loading('Generating custom insights with AI...', { duration: 5000 });
      
      const result = await marketDataService.generateCustomInsights();
      
      toast.dismiss();
      toast.success('Insights generation started! They will appear shortly.');
      
      setTimeout(() => {
        refetch();
      }, 10000);
      
    } catch (error) {
      toast.dismiss();
      toast.error(error.message || 'Failed to generate insights');
    }
  };

  // Quick Actions
  const quickActions = [
    {
      id: 'new_analysis',
      label: 'New Analysis',
      description: 'Run market analysis',
      icon: <Plus className="w-5 h-5" />,
      color: 'blue',
      action: () => navigate('/analysis/new'),
    },
    {
      id: 'view_reports',
      label: 'View Reports',
      description: 'Browse generated reports',
      icon: <Eye className="w-5 h-5" />,
      color: 'purple',
      action: () => navigate('/reports'),
    },
    {
      id: 'export_data',
      label: 'Export Data',
      description: 'Download market data',
      icon: <Download className="w-5 h-5" />,
      color: 'green',
      action: handleExportData,
    },
    {
      id: 'manage_alerts',
      label: 'Manage Alerts',
      description: 'Configure notifications',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'red',
      action: () => navigate('/settings/alerts'),
    },
  ];

  // KPI Metrics - Display REAL data from backend
  const kpiMetrics = dashboardData ? [
    {
      id: 'total_analysis',
      label: 'Total Analysis',
      value: dashboardData.total_analysis?.toLocaleString() || '0',
      change: dashboardData.analysis_change ? 
        `${dashboardData.analysis_change > 0 ? '+' : ''}${dashboardData.analysis_change}%` : '0%',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'blue',
      description: 'Market analyses conducted',
    },
    {
      id: 'competitors_tracked',
      label: 'Competitors Tracked',
      value: dashboardData.competitors_tracked?.toLocaleString() || '0',
      change: dashboardData.competitors_change ? 
        `${dashboardData.competitors_change > 0 ? '+' : ''}${dashboardData.competitors_change}%` : '0%',
      icon: <Users className="w-6 h-6" />,
      color: 'purple',
      description: 'Active competitors monitored',
    },
    {
      id: 'revenue_opportunity',
      label: 'Revenue Opportunity',
      value: dashboardData.revenue_opportunity ? 
        `$${(dashboardData.revenue_opportunity / 1000).toFixed(0)}K` : '$0',
      change: dashboardData.revenue_change ? 
        `${dashboardData.revenue_change > 0 ? '+' : ''}${dashboardData.revenue_change}%` : '0%',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'green',
      description: 'Identified market potential',
    },
    {
      id: 'sentiment_score',
      label: 'Customer Sentiment',
      value: dashboardData.sentiment_score ? 
        dashboardData.sentiment_score.toFixed(2) : '0.00',
      change: dashboardData.sentiment_change ? 
        `${dashboardData.sentiment_change > 0 ? '+' : ''}${dashboardData.sentiment_change.toFixed(2)}` : '0.00',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'orange',
      description: 'Average customer sentiment (0-1 scale)',
    },
  ] : [];

  // Handle error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Failed to load dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error.message || 'An error occurred while fetching dashboard data'}
        </p>
        <button
          onClick={() => refetch()}
          className="btn-primary flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard data from server..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Here's what's happening with your market research today.
            <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
              Last updated: {dashboardData?.last_updated ? 
                format(new Date(dashboardData.last_updated), 'HH:mm') : 
                format(new Date(), 'HH:mm')}
            </span>
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            className="input-field text-sm py-2"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid - REAL DATA */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiMetrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-xl p-6 card-hover"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${
                  metric.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                  metric.color === 'purple' ? 'from-purple-500 to-pink-500' :
                  metric.color === 'green' ? 'from-green-500 to-emerald-500' :
                  'from-orange-500 to-red-500'
                }`}>
                  <div className="text-white">
                    {metric.icon}
                  </div>
                </div>
                
                <div className={`flex items-center text-sm font-medium ${
                  parseFloat(metric.change) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  <TrendingUp className={`w-4 h-4 mr-1 ${
                    parseFloat(metric.change) < 0 ? 'transform rotate-180' : ''
                  }`} />
                  {metric.change}
                </div>
              </div>
              
              <div className="mb-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {metric.label}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {metric.description}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts & Maps - REAL DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Trends Chart */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Market Trends
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dashboardData?.trend_description || 'Key metrics over time'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {timeRange === '7d' ? '7 Days' : 
                   timeRange === '30d' ? '30 Days' : 
                   timeRange === '90d' ? '90 Days' : '1 Year'}
                </span>
              </div>
            </div>
            
            <TrendChart 
              data={dashboardData?.trend_data || []}
              height={300}
              timeRange={timeRange}
            />
          </div>
        </div>

        {/* Market Map Preview - REAL DATA */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Market Map
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {dashboardData?.business_locations?.length || 0} businesses mapped
              </p>
            </div>
            
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          
          <MarketMap 
            businesses={dashboardData?.business_locations || []}
            center={dashboardData?.map_center}
            zoom={dashboardData?.map_zoom || 12}
            height={200}
          />
          
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {dashboardData?.business_count?.toLocaleString() || '0'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Businesses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {dashboardData?.coverage_area || '0'} mi²
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {dashboardData?.density_score || '0'}/10
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Density</div>
            </div>
          </div>
        </div>
      </div>

      {/* Competitors & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Competitors - REAL DATA */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Top Competitors
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Based on market share and growth
                </p>
              </div>
              
              <button 
                onClick={() => navigate('/competitors')}
                className="btn-secondary text-sm flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                View All
              </button>
            </div>
            
            <CompetitorTable 
              competitors={dashboardData?.top_competitors || []}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Quick Actions - FULLY FUNCTIONAL */}
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Quick Actions
            </h2>
            
            <div className="space-y-3">
              {quickActions.map((action) => (
                <motion.button
                  key={action.id}
                  onClick={action.action}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 hover:from-gray-100 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200 group"
                >
                  <div className={`p-2 rounded-lg mr-4 ${
                    action.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                    action.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                    action.color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    {action.icon}
                  </div>
                  
                  <div className="text-left flex-1">
                    <div className="font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300">
                      {action.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {action.description}
                    </div>
                  </div>
                  
                  <Sparkles className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports - REAL DATA */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Recent Reports
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Latest market analysis reports
                </p>
              </div>
              
              <button 
                onClick={() => navigate('/reports')}
                className="btn-secondary text-sm flex items-center"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View All Reports
              </button>
            </div>
            
            {reportsLoading ? (
              <div className="flex justify-center py-8">
                <InlineSpinner />
              </div>
            ) : (
              <ReportsGrid 
                reports={recentReports.slice(0, 3)}
                isLoading={false}
                emptyMessage="No reports generated yet. Create your first analysis to get started!"
              />
            )}
          </div>
        </div>

        {/* Recent Activity - REAL DATA */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                System updates and alerts
              </p>
            </div>
            
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {dashboardData?.recent_activity?.length > 0 ? (
              dashboardData.recent_activity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700"
                >
                  <div className="mr-3 mt-0.5">
                    {activity.type === 'analysis_completed' && 
                      <CheckCircle className="w-5 h-5 text-green-500" />}
                    {activity.type === 'competitor_alert' && 
                      <Users className="w-5 h-5 text-blue-500" />}
                    {activity.type === 'sentiment_change' && 
                      <TrendingUp className="w-5 h-5 text-orange-500" />}
                    {activity.type === 'report_generated' && 
                      <BarChart3 className="w-5 h-5 text-purple-500" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {activity.description}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                  
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No recent activity
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button 
              onClick={() => navigate('/activity')}
              className="w-full btn-secondary"
            >
              View All Activity
            </button>
          </div>
        </div>
      </div>

      {/* AI Insights - REAL DATA */}
      {dashboardData?.ai_insights && dashboardData.ai_insights.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 mr-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                AI Insights
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Powered by AI
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData.ai_insights.map((insight, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg ${
                  insight.type === 'opportunity' 
                    ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
                    : insight.type === 'advantage'
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                    : 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
                }`}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {insight.title}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {insight.description}
                </p>
                {insight.confidence && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Confidence: {(insight.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleGenerateInsights}
              className="btn-primary flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Custom Insights
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;