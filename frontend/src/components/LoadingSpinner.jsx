import React from 'react';
import { motion } from 'framer-motion';
import { Brain, BarChart3, TrendingUp, PieChart } from 'lucide-react';

const LoadingSpinner = ({ 
  message = 'Analyzing market data...',
  subMessage = 'This may take a few moments',
  type = 'default',
  progress = null 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'analysis':
        return <BarChart3 className="w-8 h-8" />;
      case 'ai':
        return <Brain className="w-8 h-8" />;
      case 'trends':
        return <TrendingUp className="w-8 h-8" />;
      case 'reports':
        return <PieChart className="w-8 h-8" />;
      default:
        return <Brain className="w-8 h-8" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'analysis':
        return 'from-blue-500 to-cyan-500';
      case 'ai':
        return 'from-purple-500 to-pink-500';
      case 'trends':
        return 'from-green-500 to-emerald-500';
      case 'reports':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-blue-500 to-purple-500';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        {/* Outer ring */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 rounded-full border-4 border-transparent"
            style={{
              background: `conic-gradient(transparent 0deg, transparent 270deg, rgb(99 102 241) 270deg, rgb(99 102 241) 360deg)`,
            }}
          />
        </div>

        {/* Middle ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4"
        >
          <div className="w-24 h-24 rounded-full border-4 border-transparent"
            style={{
              background: `conic-gradient(transparent 0deg, transparent 180deg, rgb(139 92 246) 180deg, rgb(139 92 246) 360deg)`,
            }}
          />
        </motion.div>

        {/* Inner ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute inset-8"
        >
          <div className="w-16 h-16 rounded-full border-4 border-transparent"
            style={{
              background: `conic-gradient(transparent 0deg, transparent 90deg, rgb(236 72 153) 90deg, rgb(236 72 153) 360deg)`,
            }}
          />
        </motion.div>

        {/* Center icon */}
        <div className="w-40 h-40 rounded-full bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`bg-gradient-to-br ${getColor()} p-4 rounded-full`}
          >
            {getIcon()}
          </motion.div>
        </div>

        {/* Floating dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`absolute w-3 h-3 rounded-full bg-gradient-to-br ${getColor()}`}
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1, 0],
              x: [0, Math.cos((i * 120 * Math.PI) / 180) * 60],
              y: [0, Math.sin((i * 120 * Math.PI) / 180) * 60],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </motion.div>

      {/* Progress indicator */}
      {progress !== null && (
        <div className="w-64 mt-8">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Processing...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full bg-gradient-to-r ${getColor()}`}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mt-8"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {message}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {subMessage}
        </p>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        {/* Loading steps */}
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
          {[
            { label: 'Collecting Data', status: progress > 25 ? 'complete' : progress > 15 ? 'active' : 'pending' },
            { label: 'AI Analysis', status: progress > 60 ? 'complete' : progress > 40 ? 'active' : 'pending' },
            { label: 'Generating Report', status: progress > 90 ? 'complete' : progress > 75 ? 'active' : 'pending' },
          ].map((step, index) => (
            <div key={index} className="text-center">
              <div className="relative inline-block mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'complete' ? 'bg-green-100 dark:bg-green-900' :
                  step.status === 'active' ? 'bg-blue-100 dark:bg-blue-900' :
                  'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {step.status === 'complete' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-4 h-4 bg-green-500 rounded-full"
                    />
                  ) : step.status === 'active' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                    />
                  ) : (
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  )}
                </div>
                {index < 2 && (
                  <div className={`absolute top-4 left-8 w-8 h-0.5 ${
                    step.status === 'complete' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`} />
                )}
              </div>
              <span className={`text-xs font-medium ${
                step.status === 'complete' ? 'text-green-600 dark:text-green-400' :
                step.status === 'active' ? 'text-blue-600 dark:text-blue-400' :
                'text-gray-500 dark:text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-sm text-gray-500 dark:text-gray-400 max-w-md text-center"
      >
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
          <span className="mr-2">💡</span>
          <span>Tip: Larger markets may take longer to analyze</span>
        </div>
      </motion.div>
    </div>
  );
};

// Small inline spinner variant
export const InlineSpinner = ({ size = 'md', color = 'primary' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colorClasses = {
    primary: 'border-blue-500',
    secondary: 'border-gray-500',
    success: 'border-green-500',
    warning: 'border-yellow-500',
    danger: 'border-red-500',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full`}
    />
  );
};

// Full page loading overlay
export const FullPageLoader = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 z-50 flex flex-col items-center justify-center">
      <LoadingSpinner 
        message="Loading AI Market Research Analyst"
        subMessage="Initializing advanced analytics..."
        type="ai"
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-center"
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Powered by AI
        </div>
        <div className="flex items-center justify-center space-x-4">
          <div className="w-16 h-px bg-gray-300 dark:bg-gray-700" />
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Transforming market data into intelligence
          </div>
          <div className="w-16 h-px bg-gray-300 dark:bg-gray-700" />
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;