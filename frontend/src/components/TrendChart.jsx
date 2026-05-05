import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Maximize2,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const TrendChart = ({ 
  data = null,
  height = 300,
  type = 'line',
  title = 'Market Trends',
  showControls = true,
  timeRange = '30d',
  onTimeRangeChange,
}) => {
  const [chartType, setChartType] = useState(type);
  const [hoveredData, setHoveredData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('market_share');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Define metrics - FIXED: Use 'competitors' instead of 'competitor_count'
  const metrics = [
    {
      id: 'market_share',
      label: 'Market Share',
      color: '#3b82f6',
      format: (value) => value !== undefined ? `${value.toFixed(1)}%` : '0%',
      description: 'Percentage of total market',
    },
    {
      id: 'customer_sentiment',
      label: 'Customer Sentiment',
      color: '#10b981',
      format: (value) => value !== undefined ? value.toFixed(2) : '0.00',
      description: 'Customer satisfaction score (0-1 scale)',
    },
    {
      id: 'revenue_potential',
      label: 'Revenue Potential',
      color: '#8b5cf6',
      format: (value) => value !== undefined ? `$${(value / 1000).toFixed(0)}K` : '$0K',
      description: 'Estimated revenue opportunity',
    },
    {
      id: 'growth_rate',
      label: 'Growth Rate',
      color: '#f59e0b',
      format: (value) => value !== undefined ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '0%',
      description: 'Monthly growth percentage',
    },
    {
      id: 'competitors',  // FIXED: Changed from 'competitor_count' to 'competitors' to match API
      label: 'Competitors',
      color: '#ec4899',
      format: (value) => value !== undefined ? value.toString() : '0',
      description: 'Number of competitors identified',
    },
    {
      id: 'engagement_score',
      label: 'Engagement',
      color: '#14b8a6',
      format: (value) => value !== undefined ? `${value.toFixed(0)}%` : '0%',
      description: 'Customer engagement score',
    },
  ];

  // Find selected metric config with fallback
  const selectedMetricConfig = useMemo(() => {
    return metrics.find(m => m.id === selectedMetric) || metrics[0];
  }, [selectedMetric, metrics]);

  // Process data to ensure it has all required fields
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      // Log the first data point for debugging
      console.log('📈 TrendChart received data:', {
        count: data.length,
        sample: data[0],
        availableFields: Object.keys(data[0])
      });
      
      // Ensure all data points have the required fields with defaults
      return data.map(point => ({
        date: point.date || 'Unknown',
        market_share: point.market_share || 0,
        customer_sentiment: point.customer_sentiment || 0,
        revenue_potential: point.revenue_potential || 0,
        growth_rate: point.growth_rate || 0,
        competitors: point.competitors || 0,  // Use 'competitors' from API
        engagement_score: point.engagement_score || 0,
        // Also keep original data for debugging
        ...point
      }));
    }

    // Only generate mock data if no real data provided
    console.log('📈 No data provided, generating mock data');
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(now, days - i - 1);
      const baseValue = 50 + Math.random() * 30;
      const trend = i * 0.5;
      const noise = (Math.random() - 0.5) * 10;
      
      return {
        date: format(date, timeRange === '1y' ? 'MMM yy' : 'MMM dd'),
        fullDate: date,
        market_share: Math.max(0, Math.min(100, baseValue + trend + noise)),
        customer_sentiment: Math.max(-1, Math.min(1, 0.3 + (i * 0.01) + (Math.random() - 0.5) * 0.2)),
        competitors: Math.floor(5 + (i * 0.1) + Math.random() * 3),  // Use 'competitors'
        revenue_potential: Math.floor(100000 + (i * 5000) + Math.random() * 20000),
        growth_rate: Math.max(-10, Math.min(20, 5 + (i * 0.2) + (Math.random() - 0.5) * 5)),
        engagement_score: Math.max(0, Math.min(100, 60 + (i * 0.3) + (Math.random() - 0.5) * 10)),
      };
    });
  }, [data, timeRange]);

  const chartTypes = [
    { id: 'line', label: 'Line', icon: <LineChartIcon className="w-4 h-4" /> },
    { id: 'area', label: 'Area', icon: <AreaChart className="w-4 h-4" /> },
    { id: 'bar', label: 'Bar', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const timeRanges = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: '1y', label: '1Y' },
  ];

  // Calculate trend statistics
  const trendStats = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    
    const firstValue = chartData[0]?.[selectedMetric] ?? 0;
    const lastValue = chartData[chartData.length - 1]?.[selectedMetric] ?? 0;
    const change = lastValue - firstValue;
    const percentageChange = firstValue !== 0 ? (change / firstValue) * 100 : 0;
    
    // Calculate average
    const validValues = chartData
      .map(point => point?.[selectedMetric])
      .filter(val => val !== undefined && val !== null);
    
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const average = validValues.length > 0 ? sum / validValues.length : 0;
    
    // Calculate volatility (standard deviation)
    const variance = validValues.reduce((acc, val) => {
      const diff = val - average;
      return acc + diff * diff;
    }, 0) / (validValues.length || 1);
    const volatility = Math.sqrt(variance);
    
    return {
      current: lastValue,
      change,
      percentageChange,
      average,
      volatility,
      isPositive: change > 0,
    };
  }, [chartData, selectedMetric]);

  // Handle export data
  const handleExportData = async () => {
    try {
      toast.loading('Preparing export...');
      
      // Convert chart data to CSV format
      const headers = ['Date', ...metrics.map(m => m.label)];
      const rows = chartData.map(point => {
        return [
          point.date,
          ...metrics.map(m => point[m.id] || 0)
        ];
      });
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `market-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry, index) => {
            const metric = metrics.find(m => m.id === entry.dataKey);
            return (
              <div key={index} className="flex items-center justify-between mb-1 last:mb-0">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {metric?.label || entry.dataKey}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white ml-4">
                  {metric ? metric.format(entry.value) : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props) => {
    const { payload } = props;
    
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry, index) => {
          const metric = metrics.find(m => m.id === entry.dataKey);
          return (
            <div
              key={`item-${index}`}
              className="flex items-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setSelectedMetric(entry.dataKey)}
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: entry.color, opacity: selectedMetric === entry.dataKey ? 1 : 0.4 }}
              />
              <span 
                className={`text-sm ${
                  selectedMetric === entry.dataKey 
                    ? 'font-medium text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {metric?.label || entry.dataKey}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const axisProps = {
      stroke: '#9ca3af',
      strokeWidth: 1,
      fontSize: 12,
    };

    const gridProps = {
      stroke: '#e5e7eb',
      strokeDasharray: '3 3',
      strokeOpacity: 0.5,
    };

    const yAxisTickFormatter = (value) => {
      if (!selectedMetricConfig) return value;
      try {
        return selectedMetricConfig.format(value);
      } catch (e) {
        return value;
      }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis 
              dataKey="date" 
              {...axisProps}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              {...axisProps}
              tick={{ fill: '#6b7280' }}
              tickFormatter={yAxisTickFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke={selectedMetricConfig?.color || '#3b82f6'}
              fill={selectedMetricConfig?.color || '#3b82f6'}
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ stroke: selectedMetricConfig?.color || '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis 
              dataKey="date" 
              {...axisProps}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              {...axisProps}
              tick={{ fill: '#6b7280' }}
              tickFormatter={yAxisTickFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar
              dataKey={selectedMetric}
              fill={selectedMetricConfig?.color || '#3b82f6'}
              radius={[4, 4, 0, 0]}
              onMouseEnter={(data) => setHoveredData(data)}
              onMouseLeave={() => setHoveredData(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={selectedMetricConfig?.color || '#3b82f6'}
                  opacity={hoveredData?.date === entry.date ? 1 : 0.8}
                />
              ))}
            </Bar>
          </BarChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis 
              dataKey="date" 
              {...axisProps}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              {...axisProps}
              tick={{ fill: '#6b7280' }}
              tickFormatter={yAxisTickFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke={selectedMetricConfig?.color || '#3b82f6'}
              strokeWidth={2}
              dot={{ stroke: selectedMetricConfig?.color || '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className={`glass-card rounded-xl overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-0 z-50 m-4 rounded-2xl' : ''
    }`}>
      {/* Chart Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{timeRanges.find(r => r.id === timeRange)?.label || '30D'} View</span>
              {trendStats && (
                <>
                  <span className="mx-2">•</span>
                  <span className={`flex items-center ${
                    trendStats.isPositive 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trendStats.isPositive ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {trendStats.percentageChange > 0 ? '+' : ''}
                    {trendStats.percentageChange.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </div>
          
          {showControls && (
            <div className="flex items-center space-x-2">
              {/* Chart Type Selector */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {chartTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id)}
                    className={`p-2 rounded-md transition-colors ${
                      chartType === type.id
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title={type.label}
                  >
                    {type.icon}
                  </button>
                ))}
              </div>
              
              {/* Time Range Selector */}
              <select
                className="input-field text-sm py-1"
                value={timeRange}
                onChange={(e) => onTimeRangeChange?.(e.target.value)}
              >
                {timeRanges.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
              
              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="btn-secondary p-2"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Selector */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {metrics.map((metric) => (
            <button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMetric === metric.id
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 ring-2 ring-blue-500 ring-opacity-50'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-6">
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistics & Insights */}
      {trendStats && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-white dark:bg-gray-800">
              <div className="text-2xl font-bold gradient-text">
                {selectedMetricConfig?.format(trendStats.current) || '0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Current Value</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-white dark:bg-gray-800">
              <div className={`text-2xl font-bold flex items-center justify-center ${
                trendStats.isPositive 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {trendStats.isPositive ? (
                  <TrendingUp className="w-5 h-5 mr-2" />
                ) : (
                  <TrendingDown className="w-5 h-5 mr-2" />
                )}
                {selectedMetricConfig?.format(Math.abs(trendStats.change)) || '0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Change</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-white dark:bg-gray-800">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedMetricConfig?.format(trendStats.average) || '0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-white dark:bg-gray-800">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedMetricConfig?.format(trendStats.volatility) || '0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Volatility</div>
            </div>
          </div>
          
          {/* Insights */}
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="flex items-start">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 mr-3">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Trend Analysis
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {trendStats.isPositive 
                    ? `The ${selectedMetricConfig?.label?.toLowerCase() || 'metric'} shows a positive trend with ${trendStats.percentageChange.toFixed(1)}% growth over the period. This indicates improving market conditions.`
                    : `The ${selectedMetricConfig?.label?.toLowerCase() || 'metric'} shows a negative trend with ${Math.abs(trendStats.percentageChange).toFixed(1)}% decline. Consider reviewing market strategies.`
                  }
                </p>
                {selectedMetric === 'competitors' && chartData.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Latest competitor count: {chartData[chartData.length-1]?.competitors || 0} on {chartData[chartData.length-1]?.date || 'latest date'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Data points: {chartData.length} • Updated: {format(new Date(), 'MMM dd, HH:mm')}
        </div>
        <div className="flex items-center space-x-2">
          <button className="btn-secondary text-sm flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          <button 
            onClick={handleExportData}
            className="btn-primary text-sm flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-shadow"
          title="Exit fullscreen"
        >
          <Maximize2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
};

export default TrendChart;