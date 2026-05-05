import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CompetitorTable = ({ competitors = [], isLoading = false }) => {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState({ key: 'strength', direction: 'desc' });
  const [expandedRow, setExpandedRow] = useState(null);

  // Sort competitors based on config - REAL DATA ONLY
  const sortedCompetitors = useMemo(() => {
    if (!competitors || competitors.length === 0) return [];

    return [...competitors].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'name':
          aValue = a.competitor_name?.toLowerCase() || '';
          bValue = b.competitor_name?.toLowerCase() || '';
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;

        case 'strength':
          aValue = a.strength_score ?? 0;
          bValue = b.strength_score ?? 0;
          break;

        case 'weakness':
          aValue = a.weakness_score ?? 0;
          bValue = b.weakness_score ?? 0;
          break;

        case 'sentiment':
          aValue = a.customer_sentiment ?? 0;
          bValue = b.customer_sentiment ?? 0;
          break;

        case 'share':
          aValue = a.market_share_estimate ?? 0;
          bValue = b.market_share_estimate ?? 0;
          break;

        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [competitors, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getStrengthColor = (score) => {
    if (score === null || score === undefined) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    if (score >= 8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 6) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getSentimentIcon = (score) => {
    if (score === null || score === undefined) return <Minus className="w-4 h-4 text-gray-500" />;
    if (score > 0.3) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (score < -0.3) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value !== 'number') return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value, decimals = 1) => {
    if (value === null || value === undefined) return '0.0';
    if (typeof value !== 'number') return '0.0';
    return value.toFixed(decimals);
  };

  // Handle analyze competitor click
  const handleAnalyzeCompetitor = (competitor, e) => {
    e.stopPropagation();
    
    // Build URL with all available competitor data
    const params = new URLSearchParams();
    params.append('competitor', competitor.competitor_name || '');
    
    // Extract location from the competitor data
    let location = competitor.location || '';
    
    // If location is empty or 'Local Business', use a default
    if (!location || location === 'Local Business' || location === 'N/A') {
      location = 'Chicago, IL'; // Default location
    }
    
    params.append('location', location);
    
    // Determine business type from categories
    let businessType = 'restaurant'; // Default
    
    if (competitor.categories && competitor.categories.length > 0) {
      const categoryStr = competitor.categories.join(' ').toLowerCase();
      
      if (categoryStr.includes('restaurant') || categoryStr.includes('cafe') || 
          categoryStr.includes('food') || categoryStr.includes('pizza') || 
          categoryStr.includes('sushi') || categoryStr.includes('burger')) {
        businessType = 'restaurant';
      } else if (categoryStr.includes('retail') || categoryStr.includes('shop') || 
                 categoryStr.includes('store') || categoryStr.includes('clothing')) {
        businessType = 'retail';
      } else if (categoryStr.includes('service') || categoryStr.includes('salon') || 
                 categoryStr.includes('spa') || categoryStr.includes('barber')) {
        businessType = 'service';
      } else if (categoryStr.includes('tech') || categoryStr.includes('it') || 
                 categoryStr.includes('software') || categoryStr.includes('computer')) {
        businessType = 'tech';
      } else if (categoryStr.includes('health') || categoryStr.includes('medical') || 
                 categoryStr.includes('clinic') || categoryStr.includes('pharmacy')) {
        businessType = 'healthcare';
      }
    }
    
    params.append('businessType', businessType);
    
    // Navigate to analysis page with parameters
    navigate(`/analysis/new?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!competitors || competitors.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Competitor Data Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Run a market analysis to discover competitors in your area.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Competitive Landscape
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} analyzed
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
            <select
              className="input-field text-sm py-1"
              value={sortConfig.key}
              onChange={(e) => handleSort(e.target.value)}
            >
              <option value="strength">Strength Score</option>
              <option value="weakness">Weakness Score</option>
              <option value="sentiment">Customer Sentiment</option>
              <option value="share">Market Share</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Competitor
              </th>
              <th 
                className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('strength')}
              >
                <div className="flex items-center space-x-1">
                  <span>Strength</span>
                  {sortConfig.key === 'strength' && (
                    sortConfig.direction === 'asc' ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('weakness')}
              >
                <div className="flex items-center space-x-1">
                  <span>Weakness</span>
                  {sortConfig.key === 'weakness' && (
                    sortConfig.direction === 'asc' ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('sentiment')}
              >
                <div className="flex items-center space-x-1">
                  <span>Sentiment</span>
                  {sortConfig.key === 'sentiment' && (
                    sortConfig.direction === 'asc' ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th 
                className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('share')}
              >
                <div className="flex items-center space-x-1">
                  <span>Market Share</span>
                  {sortConfig.key === 'share' && (
                    sortConfig.direction === 'asc' ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedCompetitors.map((competitor, index) => (
              <React.Fragment key={competitor.id || index}>
                {/* Main Row */}
                <tr 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {competitor.competitor_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {competitor.competitor_name || 'Unknown Competitor'}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span>{competitor.location || 'Local Business'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                          style={{ width: `${Math.min(100, (competitor.strength_score || 0) * 10)}%` }}
                        />
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStrengthColor(competitor.strength_score)}`}>
                        {formatNumber(competitor.strength_score)}/10
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-600"
                          style={{ width: `${Math.min(100, (competitor.weakness_score || 0) * 10)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatNumber(competitor.weakness_score)}/10
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      {getSentimentIcon(competitor.customer_sentiment)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatNumber(competitor.customer_sentiment, 2)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPercentage(competitor.market_share_estimate)}
                      </span>
                    </div>
                  </td>
                 
                  <td className="py-4 px-6">
                    <button
                      onClick={(e) => handleAnalyzeCompetitor(competitor, e)}
                      className="btn-secondary text-sm flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Analyze
                    </button>
                  </td>
                </tr>
                
                {/* Expanded Row - Only show if there are insights */}
                {expandedRow === index && competitor.key_insights && competitor.key_insights.length > 0 && (
                  <tr>
                    <td colSpan="6" className="bg-gray-50 dark:bg-gray-800/30 px-6 py-4">
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Key Insights */}
                          {competitor.key_insights && competitor.key_insights.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                                Key Insights
                              </h4>
                              <ul className="space-y-2">
                                {competitor.key_insights.slice(0, 3).map((insight, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{insight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Recommendations */}
                          {competitor.recommendations && competitor.recommendations.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                <TrendingDown className="w-4 h-4 mr-2 text-blue-500" />
                                Recommendations
                              </h4>
                              <ul className="space-y-2">
                                {competitor.recommendations.slice(0, 3).map((rec, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {/* Competitive Position Summary */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Competitive Position
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold gradient-text">
                                {formatNumber(competitor.strength_score)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Strength Score</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatPercentage(competitor.market_share_estimate)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Market Share</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatNumber(competitor.customer_sentiment, 2)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Sentiment</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {Math.min(competitors.length, 10)} of {competitors.length} competitor{competitors.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                if (competitors.length > 0) {
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + "Name,Strength,Weakness,Sentiment,Market Share\n"
                    + competitors.map(c => 
                        `${c.competitor_name || 'Unknown'},${c.strength_score || 0},${c.weakness_score || 0},${c.customer_sentiment || 0},${c.market_share_estimate || 0}`
                      ).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "competitors.csv");
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }
              }}
              className="btn-secondary text-sm"
              disabled={competitors.length === 0}
            >
              Export Data
            </button>
            <button 
              onClick={() => {
                navigate('/analysis/new?compare=true');
              }}
              className="btn-primary text-sm"
              disabled={competitors.length === 0}
            >
              Compare Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorTable;