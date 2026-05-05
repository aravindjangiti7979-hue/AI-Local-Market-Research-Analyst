import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  DollarSign,
  MapPin,
  Clock,
  ChevronRight,
  Download,
  Share2,
  Filter,
  Maximize2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

// Import chart components
import TrendChart from './TrendChart';
import CompetitorTable from './CompetitorTable';
import MarketMap from './MarketMap';
import SentimentGauge from './SentimentGauge';

const ResultVisualization = ({ 
  analysisResults, 
  isLoading = false,
  onExport,
  onShare,
  onTimeRangeChange,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'trends', label: 'Trends', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'competitors', label: 'Competitors', icon: <Users className="w-4 h-4" /> },
    { id: 'sentiment', label: 'Sentiment', icon: <PieChart className="w-4 h-4" /> },
    { id: 'map', label: 'Market Map', icon: <MapPin className="w-4 h-4" /> },
  ];

  const timeRanges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
  ];

  // Handle time range change
  const handleTimeRangeChange = (e) => {
    const newRange = e.target.value;
    setTimeRange(newRange);
    if (onTimeRangeChange) {
      onTimeRangeChange(newRange);
    }
  };

  // Debug - log what we received
  useEffect(() => {
    if (analysisResults) {
      console.log('📊 Dashboard data received:', {
        total_analysis: analysisResults.total_analysis,
        trend_points: analysisResults.trend_data?.length,
        competitors: analysisResults.top_competitors?.length,
        locations: analysisResults.business_locations?.length,
        sentiment: analysisResults.sentiment_score
      });
    }
  }, [analysisResults]);

  // Calculate metrics from the REAL data
  const calculateMetrics = () => {
    if (!analysisResults) return [];

    const competitors = analysisResults.top_competitors || [];
    const totalCompetitors = competitors.length;
    
    // Calculate average market share from competitors
    let avgMarketShare = 0;
    if (totalCompetitors > 0) {
      const totalShare = competitors.reduce((sum, comp) => {
        return sum + (comp.market_share_estimate || 0.05);
      }, 0);
      avgMarketShare = totalShare / totalCompetitors;
    }

    // Calculate average strength score
    let avgStrength = 0;
    if (totalCompetitors > 0) {
      const totalStrength = competitors.reduce((sum, comp) => sum + (comp.strength_score || 5), 0);
      avgStrength = totalStrength / totalCompetitors;
    }

    // Get sentiment score from REAL data
    const sentimentScore = analysisResults.sentiment_score || 0;
    
    // Get revenue opportunity from REAL data
    const revenueOpportunity = analysisResults.revenue_opportunity || 0;
    
    // Get analysis change from REAL data
    const analysisChange = analysisResults.analysis_change || 0;
    
    // Get sentiment change from REAL data
    const sentimentChange = analysisResults.sentiment_change || 0;

    return [
      { 
        id: 'market_share', 
        label: 'Market Share', 
        value: avgMarketShare > 0 ? `${(avgMarketShare * 100).toFixed(1)}%` : '0%', 
        change: analysisChange > 0 ? `+${analysisChange.toFixed(1)}%` : `${analysisChange.toFixed(1)}%`, 
        icon: <Target className="w-5 h-5" />, 
        color: 'blue' 
      },
      { 
        id: 'growth_rate', 
        label: 'Growth Rate', 
        value: avgStrength > 0 ? `${(avgStrength / 10 * 100).toFixed(1)}%` : '0%', 
        change: sentimentChange > 0 ? `+${(sentimentChange * 100).toFixed(1)}%` : `${(sentimentChange * 100).toFixed(1)}%`, 
        icon: <TrendingUp className="w-5 h-5" />, 
        color: 'green' 
      },
      { 
        id: 'customer_sentiment', 
        label: 'Customer Sentiment', 
        value: sentimentScore > 0 ? `${(sentimentScore * 5).toFixed(1)}/5` : '0/5', 
        change: sentimentChange > 0 ? `+${sentimentChange.toFixed(2)}` : sentimentChange.toFixed(2), 
        icon: <Users className="w-5 h-5" />, 
        color: 'purple' 
      },
      { 
        id: 'revenue_potential', 
        label: 'Revenue Potential', 
        value: revenueOpportunity > 0 ? `$${(revenueOpportunity / 1000).toFixed(0)}K` : '$0', 
        change: analysisChange > 0 ? `+${analysisChange.toFixed(1)}%` : `${analysisChange.toFixed(1)}%`, 
        icon: <DollarSign className="w-5 h-5" />, 
        color: 'orange' 
      },
    ];
  };

  const metrics = calculateMetrics();

  // Get insights from ai_insights (REAL data)
  const insights = analysisResults?.ai_insights
    ?.filter(i => i.type === 'insight')
    ?.map(i => i.description) || [];

  // Get recommendations from top_competitors (REAL data)
  const recommendations = analysisResults?.top_competitors
    ?.slice(0, 3)
    ?.map(comp => `Focus on competing with ${comp.competitor_name} (Strength: ${comp.strength_score}/10)`) || [];

  const getMetricColor = (color) => {
    const colors = {
      blue: 'from-blue-500 to-cyan-500',
      green: 'from-green-500 to-emerald-500',
      purple: 'from-purple-500 to-pink-500',
      orange: 'from-orange-500 to-red-500',
      default: 'from-gray-500 to-gray-700',
    };
    return colors[color] || colors.default;
  };

  const getChangeColor = (change) => {
    if (typeof change === 'string') {
      if (change.startsWith('+')) return 'text-green-600 dark:text-green-400';
      if (change.startsWith('-')) return 'text-red-600 dark:text-red-400';
    }
    if (typeof change === 'number') {
      if (change > 0) return 'text-green-600 dark:text-green-400';
      if (change < 0) return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!analysisResults) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
          <BarChart3 className="w-12 h-12 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Analysis Results
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Run a market analysis to visualize insights and trends.
        </p>
        <button className="btn-primary">
          Start Analysis
        </button>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-xl overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-0 z-50 m-4 rounded-2xl' : ''
    }`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div>
          <h2 className="text-xl font-bold">
            Market Analysis Dashboard
          </h2>
          <div className="flex items-center text-sm text-blue-100 mt-1">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{analysisResults.location || 'Multiple locations'}</span>
            <span className="mx-2">•</span>
            <Clock className="w-4 h-4 mr-2" />
            <span>Updated {analysisResults.last_updated ? format(new Date(analysisResults.last_updated), 'MMM dd, yyyy HH:mm') : 'Just now'}</span>
            <span className="mx-2">•</span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-300 mr-2"></span>
              {analysisResults.trend_data?.length || 0} trends • {analysisResults.top_competitors?.length || 0} competitors
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Time Range Selector */}
          <select
            className="text-sm py-1 px-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            value={timeRange}
            onChange={handleTimeRangeChange}
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value} className="text-gray-900">
                {range.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onExport?.()}
            className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          <button
            onClick={() => onShare?.()}
            className="px-3 py-2 rounded-lg bg-white hover:bg-white/90 text-blue-600 transition-colors flex items-center font-medium"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="px-6 flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.id === 'trends' && analysisResults.trend_data?.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                  {analysisResults.trend_data.length}
                </span>
              )}
              {tab.id === 'competitors' && analysisResults.top_competitors?.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
                  {analysisResults.top_competitors.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics - Now showing REAL data */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {metrics.map((metric) => (
                    <motion.div
                      key={metric.id}
                      whileHover={{ scale: 1.02 }}
                      className={`bg-gradient-to-br ${getMetricColor(metric.color)} p-1 rounded-xl cursor-pointer ${
                        selectedMetric === metric.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedMetric(metric.id === selectedMetric ? null : metric.id)}
                    >
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${getMetricColor(metric.color)} bg-opacity-10`}>
                            {metric.icon}
                          </div>
                          <span className={`text-sm font-medium ${getChangeColor(metric.change)}`}>
                            {metric.change}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          {metric.value}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {metric.label}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts - Now using REAL trend_data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Market Trends
                      </h3>
                      <Filter className="w-4 h-4 text-gray-400" />
                    </div>
                    {analysisResults.trend_data && analysisResults.trend_data.length > 0 ? (
                      <TrendChart 
                        data={analysisResults.trend_data}
                        height={300} 
                        timeRange={timeRange}
                        onTimeRangeChange={handleTimeRangeChange}
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        No trend data available
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Customer Sentiment
                      </h3>
                      <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700">
                        View Details
                      </button>
                    </div>
                    <SentimentGauge 
                      sentiment={analysisResults.sentiment_score || 0}
                      height={300}
                    />
                  </div>
                </div>

                {/* Summary Stats - REAL counts from database */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {analysisResults.total_analysis || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Analyses</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {analysisResults.completed_analysis || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {analysisResults.competitors_tracked || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Competitors Tracked</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {analysisResults.unique_locations || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Locations</div>
                  </div>
                </div>

                {/* Insights & Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Insights - from REAL ai_insights */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center mb-6">
                      <Lightbulb className="w-5 h-5 text-yellow-500 mr-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Key Insights
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {insights.length > 0 ? insights.slice(0, 5).map((insight, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-4 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">{insight}</p>
                          </div>
                        </motion.div>
                      )) : (
                        <p className="text-gray-500 dark:text-gray-400">No insights available</p>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Top Recommendations
                      </h3>
                      <div className="space-y-3">
                        {analysisResults.top_competitors?.slice(0, 3).map((comp, index) => (
                          <div key={index} className="flex items-start">
                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-sm font-medium mr-3 flex-shrink-0">
                              {index + 1}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">{comp.competitor_name}</span> - Strength: {comp.strength_score}/10
                            </p>
                          </div>
                        )) || (
                          <p className="text-gray-500 dark:text-gray-400">No recommendations available</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Market Health
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {Math.round((analysisResults.average_confidence || 0) * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {analysisResults.total_analysis > 0 
                              ? Math.round((analysisResults.completed_analysis / analysisResults.total_analysis) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-6">
                    Market Trends Analysis
                  </h3>
                  {analysisResults.trend_data && analysisResults.trend_data.length > 0 ? (
                    <TrendChart 
                      data={analysisResults.trend_data}
                      height={400} 
                      showControls={true}
                      timeRange={timeRange}
                      onTimeRangeChange={handleTimeRangeChange}
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      No trend data available
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Trend Summary
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {analysisResults.trend_description || 'Market trends based on historical analysis'}
                    </p>
                    {analysisResults.trend_data && analysisResults.trend_data.length > 0 && (
                      <div className="mt-4 space-y-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span>Data points:</span>
                          <span className="font-medium">{analysisResults.trend_data.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Date range:</span>
                          <span className="font-medium">
                            {analysisResults.trend_data[0]?.date} to {analysisResults.trend_data[analysisResults.trend_data.length-1]?.date}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Key Indicators
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Market Share Trend</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {analysisResults.trend_data && analysisResults.trend_data.length > 1 ? 
                              (analysisResults.trend_data[analysisResults.trend_data.length-1].market_share > 
                               analysisResults.trend_data[0].market_share ? 'Increasing 📈' : 'Decreasing 📉') : 'Stable'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Competitor Count</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {analysisResults.trend_data && analysisResults.trend_data.length > 0
                              ? analysisResults.trend_data[analysisResults.trend_data.length-1].competitors
                              : 0} total
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'competitors' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-6">
                    Top Competitors
                  </h3>
                  {analysisResults.top_competitors && analysisResults.top_competitors.length > 0 ? (
                    <CompetitorTable 
                      competitors={analysisResults.top_competitors}
                    />
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No competitor data available
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysisResults.competitors_tracked || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Competitors</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="text-2xl font-bold text-green-600">
                      {analysisResults.business_count || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Businesses Analyzed</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">
                      {analysisResults.unique_business_types || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Business Types</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sentiment' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Customer Sentiment Analysis
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Based on {analysisResults.competitors_tracked || 0} competitors
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {(analysisResults.sentiment_score || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Overall Sentiment Score
                      </div>
                    </div>
                  </div>
                  
                  <SentimentGauge 
                    sentiment={analysisResults.sentiment_score || 0}
                    height={300}
                    showDetails={true}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Sentiment Change
                    </h4>
                    <div className={`text-2xl font-bold ${analysisResults.sentiment_change > 0 ? 'text-green-600' : analysisResults.sentiment_change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {(analysisResults.sentiment_change || 0) > 0 ? '+' : ''}{(analysisResults.sentiment_change || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Change over selected period
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Confidence Level
                    </h4>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((analysisResults.average_confidence || 0) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Average confidence across analyses
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'map' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <MarketMap 
                    businesses={analysisResults.business_locations || []}
                    center={analysisResults.map_center || { lat: 40.7128, lng: -74.0060 }}
                    zoom={analysisResults.map_zoom || 10}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Geographic Coverage
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Businesses Mapped</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {analysisResults.business_locations?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Coverage Area</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {analysisResults.coverage_area || 0} mi²
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Density Score</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {analysisResults.density_score || 0}/10
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Unique Locations
                    </h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {analysisResults.unique_locations || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Different areas analyzed
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                      Map Actions
                    </h4>
                    <div className="space-y-3">
                      <button className="w-full btn-secondary text-sm flex items-center justify-center">
                        <Download className="w-4 h-4 mr-2" />
                        Export Map Data
                      </button>
                      <button className="w-full btn-primary text-sm">
                        Refresh Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {analysisResults.trend_description || `${analysisResults.trend_data?.length || 0} trend points • ${analysisResults.top_competitors?.length || 0} competitors`}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Updated: {analysisResults.last_updated ? format(new Date(analysisResults.last_updated), 'HH:mm') : 'Now'}
            </div>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-shadow"
          title="Exit fullscreen"
        >
          <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
};

export default ResultVisualization;