import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  MapPin,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { marketDataService } from '../services/marketData';
import LoadingSpinner, { InlineSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

const Competitors = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('market_share');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch dashboard data to get competitors
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', '30d'],
    queryFn: () => marketDataService.getDashboardData('30d'),
  });

  const competitors = dashboardData?.top_competitors || [];

  // Filter and sort competitors
  const filteredCompetitors = competitors
    .filter(comp => 
      comp.competitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.location?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.competitor_name || '';
          bVal = b.competitor_name || '';
          break;
        case 'strength':
          aVal = a.strength_score || 0;
          bVal = b.strength_score || 0;
          break;
        case 'market_share':
          aVal = a.market_share_estimate || 0;
          bVal = b.market_share_estimate || 0;
          break;
        case 'sentiment':
          aVal = a.customer_sentiment || 0;
          bVal = b.customer_sentiment || 0;
          break;
        default:
          aVal = a.market_share_estimate || 0;
          bVal = b.market_share_estimate || 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 4.0) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 3.5) return 'text-yellow-600 dark:text-yellow-400';
    if (rating >= 3.0) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSentimentIcon = (score) => {
    if (score > 0.3) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (score < -0.3) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <span className="w-4 h-4 text-gray-400">−</span>;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading competitors..." />;
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
            <h1 className="text-3xl font-bold gradient-text mb-2">Competitors</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comprehensive analysis of {competitors.length} competitors in your market
            </p>
          </div>
        </div>
        
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Search and Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search competitors..."
              className="input-field pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <select
              className="input-field text-sm py-2"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="market_share">Market Share</option>
              <option value="strength">Strength Score</option>
              <option value="sentiment">Customer Sentiment</option>
              <option value="name">Name</option>
            </select>
            
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="btn-secondary px-3"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            
            <button className="btn-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Competitors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompetitors.map((competitor, index) => (
          <motion.div
            key={competitor.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card rounded-xl p-6 hover:shadow-xl transition-all cursor-pointer"
            onClick={() => navigate(`/analysis/new?competitor=${encodeURIComponent(competitor.competitor_name || '')}&location=${encodeURIComponent(competitor.location || 'Chicago, IL')}&businessType=restaurant`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {competitor.competitor_name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {competitor.competitor_name}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {competitor.location || 'Local Business'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(competitor.rating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Strength</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {competitor.strength_score?.toFixed(1) || '0.0'}/10
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                  <div 
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${(competitor.strength_score || 0) * 10}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Weakness</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {competitor.weakness_score?.toFixed(1) || '0.0'}/10
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                  <div 
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${(competitor.weakness_score || 0) * 10}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Market Share and Sentiment */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {competitor.market_share}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {getSentimentIcon(competitor.customer_sentiment)}
                <span className={`text-sm font-medium ${getRatingColor(competitor.rating)}`}>
                  {competitor.customer_sentiment?.toFixed(2) || '0.00'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {'$'.repeat(competitor.price_level || 1)}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/analysis/new?competitor=${encodeURIComponent(competitor.competitor_name || '')}&location=${encodeURIComponent(competitor.location || 'Chicago, IL')}&businessType=restaurant`);
              }}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2"
            >
              <ExternalLink className="w-4 h-4" />
              Analyze Competitor
            </button>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCompetitors.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No competitors found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Try adjusting your search or run a new market analysis.
          </p>
          <button
            onClick={() => navigate('/analysis/new')}
            className="btn-primary"
          >
            New Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export default Competitors;