import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  Info,
} from 'lucide-react';

const SentimentGauge = ({ 
  sentiment = 0,
  height = 300,
  showDetails = false,
  size = 'lg',
  animate = true,
}) => {
  const [localSentiment, setLocalSentiment] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const svgRef = useRef(null);
  
  const sizeConfig = {
    sm: { width: 200, height: 120, strokeWidth: 8, fontSize: '14px' },
    md: { width: 300, height: 180, strokeWidth: 12, fontSize: '16px' },
    lg: { width: 400, height: 240, strokeWidth: 16, fontSize: '20px' },
  };
  
  const config = sizeConfig[size] || sizeConfig.lg;
  
  // Animate sentiment change
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setLocalSentiment(sentiment);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setLocalSentiment(sentiment);
    }
  }, [sentiment, animate]);
  
  // Calculate gauge values
  const clampedSentiment = Math.max(-1, Math.min(1, localSentiment));
  const angle = (clampedSentiment + 1) * 90; // -1 to 1 maps to 0 to 180 degrees
  const percentage = ((clampedSentiment + 1) / 2) * 100;
  
  // Get sentiment category
  const getSentimentCategory = () => {
    if (clampedSentiment >= 0.3) return { label: 'Positive', color: '#10b981', icon: <Smile className="w-5 h-5" /> };
    if (clampedSentiment <= -0.3) return { label: 'Negative', color: '#ef4444', icon: <Frown className="w-5 h-5" /> };
    return { label: 'Neutral', color: '#f59e0b', icon: <Meh className="w-5 h-5" /> };
  };
  
  const sentimentCategory = getSentimentCategory();
  
  // Get sentiment description
  const getSentimentDescription = () => {
    if (clampedSentiment >= 0.8) return 'Extremely Positive';
    if (clampedSentiment >= 0.6) return 'Very Positive';
    if (clampedSentiment >= 0.4) return 'Positive';
    if (clampedSentiment >= 0.2) return 'Somewhat Positive';
    if (clampedSentiment >= 0.1) return 'Slightly Positive';
    if (clampedSentiment <= -0.8) return 'Extremely Negative';
    if (clampedSentiment <= -0.6) return 'Very Negative';
    if (clampedSentiment <= -0.4) return 'Negative';
    if (clampedSentiment <= -0.2) return 'Somewhat Negative';
    if (clampedSentiment <= -0.1) return 'Slightly Negative';
    return 'Neutral';
  };
  
  // Calculate arc for the gauge
  const radius = config.height / 2 - config.strokeWidth;
  const centerX = config.width / 2;
  const centerY = config.height / 2;
  
  const startAngle = -180;
  const endAngle = 0;
  
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };
  
  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  };
  
  const needleAngle = startAngle + (angle * (endAngle - startAngle) / 180);
  const needleTip = polarToCartesian(centerX, centerY, radius * 0.9, needleAngle);
  const needleBase1 = polarToCartesian(centerX, centerY, radius * 0.2, needleAngle - 5);
  const needleBase2 = polarToCartesian(centerX, centerY, radius * 0.2, needleAngle + 5);
  
  // Get color gradient based on sentiment
  const getGradientColors = () => {
    if (clampedSentiment >= 0.3) return ['#10b981', '#34d399', '#059669'];
    if (clampedSentiment <= -0.3) return ['#ef4444', '#f87171', '#dc2626'];
    return ['#f59e0b', '#fbbf24', '#d97706'];
  };
  
  const gradientColors = getGradientColors();
  
  // Get segments for detailed view
  const segments = [
    { label: 'Very Negative', range: [-1, -0.6], color: '#dc2626' },
    { label: 'Negative', range: [-0.6, -0.3], color: '#ef4444' },
    { label: 'Somewhat Negative', range: [-0.3, -0.1], color: '#f97316' },
    { label: 'Neutral', range: [-0.1, 0.1], color: '#f59e0b' },
    { label: 'Somewhat Positive', range: [0.1, 0.3], color: '#22c55e' },
    { label: 'Positive', range: [0.3, 0.6], color: '#10b981' },
    { label: 'Very Positive', range: [0.6, 1], color: '#059669' },
  ];
  
  const currentSegment = segments.find(s => 
    clampedSentiment >= s.range[0] && clampedSentiment <= s.range[1]
  );
  
  return (
    <div 
      className={`relative ${showDetails ? 'glass-card rounded-xl p-6' : ''}`}
      style={{ height: showDetails ? 'auto' : `${height}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showDetails && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sentiment Analysis
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Customer sentiment based on reviews and feedback
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Real-time Analysis
            </span>
          </div>
        </div>
      )}
      
      <div className={`flex ${showDetails ? 'flex-col lg:flex-row' : 'flex-col'} items-center justify-center`}>
        {/* Gauge Visualization */}
        <div className={`${showDetails ? 'lg:w-1/2' : 'w-full'} flex justify-center mb-${showDetails ? '6 lg:mb-0' : '4'}`}>
          <div className="relative" style={{ width: config.width, height: config.height }}>
            <svg
              ref={svgRef}
              width={config.width}
              height={config.height}
              className="overflow-visible"
            >
              {/* Background Arc */}
              <path
                d={describeArc(centerX, centerY, radius, startAngle, endAngle)}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                className="dark:stroke-gray-700"
              />
              
              {/* Colored Arc Segments */}
              {segments.map((segment, index) => {
                const segmentStart = startAngle + ((segment.range[0] + 1) * 90);
                const segmentEnd = startAngle + ((segment.range[1] + 1) * 90);
                const isActive = currentSegment === segment;
                
                return (
                  <path
                    key={index}
                    d={describeArc(centerX, centerY, radius, segmentStart, segmentEnd)}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={config.strokeWidth}
                    strokeLinecap="round"
                    opacity={isActive ? 1 : 0.3}
                    className="transition-opacity duration-300"
                  />
                );
              })}
              
              {/* Animated Fill Arc */}
              <motion.path
                d={describeArc(centerX, centerY, radius, startAngle, needleAngle)}
                fill="none"
                stroke="url(#sentimentGradient)"
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              
              {/* Gradient Definition */}
              <defs>
                <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={gradientColors[0]} />
                  <stop offset="50%" stopColor={gradientColors[1]} />
                  <stop offset="100%" stopColor={gradientColors[2]} />
                </linearGradient>
                
                {/* Needle Gradient */}
                <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>
              </defs>
              
              {/* Needle */}
              <motion.g
                initial={{ rotate: startAngle }}
                animate={{ rotate: needleAngle }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
              >
                {/* Needle Base */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={radius * 0.15}
                  fill="url(#needleGradient)"
                  className="shadow-lg"
                />
                
                {/* Needle */}
                <polygon
                  points={`
                    ${needleBase1.x},${needleBase1.y}
                    ${needleTip.x},${needleTip.y}
                    ${needleBase2.x},${needleBase2.y}
                  `}
                  fill="url(#needleGradient)"
                  className="shadow-lg"
                />
                
                {/* Needle Center */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={radius * 0.05}
                  fill="#1f2937"
                  className="dark:fill-gray-900"
                />
              </motion.g>
              
              {/* Labels */}
              <text
                x={centerX - radius * 0.7}
                y={centerY + radius * 0.3}
                textAnchor="middle"
                style={{ fontSize: config.fontSize }}
                className="fill-gray-600 dark:fill-gray-400 font-medium"
              >
                -1.0
              </text>
              <text
                x={centerX}
                y={centerY - radius * 1.2}
                textAnchor="middle"
                style={{ fontSize: config.fontSize }}
                className="fill-gray-600 dark:fill-gray-400 font-medium"
              >
                0.0
              </text>
              <text
                x={centerX + radius * 0.7}
                y={centerY + radius * 0.3}
                textAnchor="middle"
                style={{ fontSize: config.fontSize }}
                className="fill-gray-600 dark:fill-gray-400 font-medium"
              >
                1.0
              </text>
            </svg>
            
            {/* Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-center"
              >
                <div className={`font-bold ${size === 'lg' ? 'text-4xl' : 'text-2xl'} mb-1`}
                     style={{ color: sentimentCategory.color }}>
                  {clampedSentiment.toFixed(2)}
                </div>
                <div className={`${size === 'lg' ? 'text-lg' : 'text-sm'} font-medium text-gray-600 dark:text-gray-400`}>
                  Sentiment Score
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        
        {/* Details Panel */}
        {showDetails && (
          <div className="lg:w-1/2 lg:pl-8">
            <div className="space-y-6">
              {/* Sentiment Summary */}
              <div className="glass-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg mr-3" style={{ backgroundColor: `${sentimentCategory.color}20` }}>
                      {sentimentCategory.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {sentimentCategory.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {getSentimentDescription()}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold`} style={{ color: sentimentCategory.color }}>
                    {percentage.toFixed(1)}%
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${gradientColors[0]}, ${gradientColors[1]}, ${gradientColors[2]})` }}
                  />
                </div>
              </div>
              
              {/* Trend Indicator */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {clampedSentiment > 0 ? '+' : ''}{clampedSentiment.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Current Score</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 mr-1" />
                    +0.12
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Week Trend</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {currentSegment?.label.split(' ')[0]}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Segment</div>
                </div>
              </div>
              
              {/* Segments Legend */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Sentiment Segments
                </h4>
                <div className="space-y-2">
                  {segments.map((segment, index) => {
                    const isCurrent = currentSegment === segment;
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                          isCurrent ? 'ring-2 ring-offset-2' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        style={{
                          backgroundColor: isCurrent ? `${segment.color}10` : '',
                          borderColor: isCurrent ? segment.color : 'transparent',
                          ringColor: isCurrent ? segment.color : '',
                        }}
                      >
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: segment.color }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {segment.label}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {segment.range[0].toFixed(1)} to {segment.range[1].toFixed(1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Insights */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"
                >
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        Insight
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {clampedSentiment >= 0.3 
                          ? 'Customer sentiment is positive. Focus on maintaining quality and addressing any negative feedback promptly.'
                          : clampedSentiment <= -0.3
                          ? 'Customer sentiment requires attention. Consider reviewing feedback and implementing improvements.'
                          : 'Customer sentiment is neutral. Look for opportunities to enhance customer experience.'
                        }
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Compact View Footer */}
      {!showDetails && (
        <div className="text-center mt-4">
          <div className="flex items-center justify-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: sentimentCategory.color }}
            />
            <span className="font-medium text-gray-900 dark:text-white">
              {sentimentCategory.label}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getSentimentDescription()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Mini sentiment indicator for tables/lists
export const MiniSentimentIndicator = ({ sentiment, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };
  
  const getSentimentIcon = () => {
    if (sentiment >= 0.3) return <Smile className="w-full h-full text-green-500" />;
    if (sentiment <= -0.3) return <Frown className="w-full h-full text-red-500" />;
    return <Meh className="w-full h-full text-yellow-500" />;
  };
  
  return (
    <div className={`${sizeClasses[size]} relative`}>
      <div className="absolute inset-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {getSentimentIcon()}
      </div>
      <div className="absolute inset-0 rounded-full border-2"
           style={{
             borderColor: sentiment >= 0.3 ? '#10b981' : 
                         sentiment <= -0.3 ? '#ef4444' : '#f59e0b',
             opacity: 0.3
           }} />
    </div>
  );
};

export default SentimentGauge;