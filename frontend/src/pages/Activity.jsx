import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Users,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Filter,
  Calendar,
  Download,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { marketDataService } from '../services/marketData';
import LoadingSpinner from '../components/LoadingSpinner';

const Activity = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', timeRange],
    queryFn: () => marketDataService.getDashboardData(timeRange),
  });

  const activities = dashboardData?.recent_activity || [];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'analysis_completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'competitor_alert':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'sentiment_change':
        return <TrendingUp className="w-5 h-5 text-orange-500" />;
      case 'report_generated':
        return <BarChart3 className="w-5 h-5 text-purple-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading activity..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Activity</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track all system activities and alerts
            </p>
          </div>
        </div>
        
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Log
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {['all', 'analysis_completed', 'competitor_alert', 'sentiment_change', 'report_generated'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === type
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <select
              className="input-field text-sm py-2"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button className="btn-secondary p-2">
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="glass-card rounded-xl p-6">
        <div className="space-y-4">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-8 pb-8 last:pb-0"
              >
                {/* Timeline line */}
                {index < filteredActivities.length - 1 && (
                  <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-600" />
                )}
                
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500 flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>
                
                {/* Activity card */}
                <div className="ml-4 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {activity.title}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(activity.timestamp), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {activity.description}
                  </p>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button className="text-xs btn-secondary px-3 py-1">
                      View Details
                    </button>
                    {activity.type === 'analysis_completed' && (
                      <button className="text-xs btn-primary px-3 py-1">
                        View Report
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No activities found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No activities match your current filter.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Activity;