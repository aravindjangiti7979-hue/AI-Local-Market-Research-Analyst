// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
}

// Business Types
export const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant & Food', icon: '🍽️' },
  { value: 'retail', label: 'Retail Store', icon: '🛍️' },
  { value: 'service', label: 'Service Business', icon: '🔧' },
  { value: 'tech', label: 'Technology', icon: '💻' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'other', label: 'Other', icon: '🏢' }
]

// Analysis Types
export const ANALYSIS_TYPES = [
  { value: 'comprehensive', label: 'Comprehensive Analysis', description: 'Full market analysis including competitors, sentiment, and trends' },
  { value: 'competitor', label: 'Competitor Analysis', description: 'Focus on competitor strengths, weaknesses, and market share' },
  { value: 'sentiment', label: 'Sentiment Analysis', description: 'Analyze customer reviews and social media sentiment' },
  { value: 'trend', label: 'Trend Analysis', description: 'Identify market trends and emerging patterns' }
]

// Data Sources
export const DATA_SOURCES = [
  { value: 'reviews', label: 'Customer Reviews', icon: '⭐' },
  { value: 'news', label: 'News Articles', icon: '📰' },
  { value: 'social', label: 'Social Media', icon: '💬' },
  { value: 'businesses', label: 'Business Listings', icon: '🏢' },
  { value: 'indicators', label: 'Market Indicators', icon: '📊' }
]

// Report Formats
export const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: '📄', mimeType: 'application/pdf' },
  { value: 'html', label: 'HTML', icon: '🌐', mimeType: 'text/html' },
  { value: 'json', label: 'JSON', icon: '📦', mimeType: 'application/json' },
  { value: 'markdown', label: 'Markdown', icon: '📝', mimeType: 'text/markdown' }
]

// Timeframes
export const TIMEFRAMES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'custom', label: 'Custom range' }
]

// API Limits
export const API_LIMITS = {
  FREE: {
    daily_analyses: 3,
    monthly_analyses: 30,
    data_points: 1000,
    report_formats: ['pdf'],
    retention_days: 30
  },
  PROFESSIONAL: {
    daily_analyses: 10,
    monthly_analyses: 100,
    data_points: 10000,
    report_formats: ['pdf', 'html', 'json'],
    retention_days: 90
  },
  ENTERPRISE: {
    daily_analyses: 50,
    monthly_analyses: 500,
    data_points: 50000,
    report_formats: ['pdf', 'html', 'json', 'markdown'],
    retention_days: 365
  }
}

// Error Codes
export const ERROR_CODES = {
  // Authentication Errors
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // API Errors
  API_RATE_LIMIT_EXCEEDED: 'API_RATE_LIMIT_EXCEEDED',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  API_INVALID_REQUEST: 'API_INVALID_REQUEST',
  API_SERVICE_UNAVAILABLE: 'API_SERVICE_UNAVAILABLE',
  
  // Analysis Errors
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  ANALYSIS_TIMEOUT: 'ANALYSIS_TIMEOUT',
  ANALYSIS_INSUFFICIENT_DATA: 'ANALYSIS_INSUFFICIENT_DATA',
  
  // Data Collection Errors
  DATA_COLLECTION_FAILED: 'DATA_COLLECTION_FAILED',
  DATA_SOURCE_UNAVAILABLE: 'DATA_SOURCE_UNAVAILABLE',
  DATA_VALIDATION_ERROR: 'DATA_VALIDATION_ERROR',
  
  // File Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_FORMAT: 'FILE_INVALID_FORMAT',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE'
}

// Analysis Status
export const ANALYSIS_STATUS = {
  PENDING: { value: 'pending', label: 'Pending', color: 'gray' },
  PROCESSING: { value: 'processing', label: 'Processing', color: 'blue' },
  COLLECTING_DATA: { value: 'collecting_data', label: 'Collecting Data', color: 'yellow' },
  ANALYZING: { value: 'analyzing', label: 'Analyzing', color: 'purple' },
  GENERATING_REPORT: { value: 'generating_report', label: 'Generating Report', color: 'indigo' },
  COMPLETED: { value: 'completed', label: 'Completed', color: 'green' },
  FAILED: { value: 'failed', label: 'Failed', color: 'red' },
  CANCELLED: { value: 'cancelled', label: 'Cancelled', color: 'gray' }
}

// Chart Colors
export const CHART_COLORS = {
  primary: [
    '#3b82f6', // blue-500
    '#1d4ed8', // blue-700
    '#60a5fa', // blue-400
    '#93c5fd', // blue-300
    '#bfdbfe', // blue-200
  ],
  success: [
    '#22c55e', // green-500
    '#16a34a', // green-600
    '#4ade80', // green-400
    '#86efac', // green-300
    '#bbf7d0', // green-200
  ],
  warning: [
    '#eab308', // yellow-500
    '#ca8a04', // yellow-600
    '#facc15', // yellow-400
    '#fde047', // yellow-300
    '#fef08a', // yellow-200
  ],
  error: [
    '#ef4444', // red-500
    '#dc2626', // red-600
    '#f87171', // red-400
    '#fca5a5', // red-300
    '#fecaca', // red-200
  ],
  neutral: [
    '#6b7280', // gray-500
    '#4b5563', // gray-600
    '#9ca3af', // gray-400
    '#d1d5db', // gray-300
    '#e5e7eb', // gray-200
  ]
}

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 12,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  DEFAULT_CENTER: [40.7128, -74.0060], // New York
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}

// Sentiment Labels
export const SENTIMENT_LABELS = {
  VERY_NEGATIVE: { min: -1.0, max: -0.6, label: 'Very Negative', color: '#dc2626' },
  NEGATIVE: { min: -0.6, max: -0.2, label: 'Negative', color: '#ef4444' },
  NEUTRAL: { min: -0.2, max: 0.2, label: 'Neutral', color: '#6b7280' },
  POSITIVE: { min: 0.2, max: 0.6, label: 'Positive', color: '#22c55e' },
  VERY_POSITIVE: { min: 0.6, max: 1.0, label: 'Very Positive', color: '#16a34a' }
}

// Confidence Levels
export const CONFIDENCE_LEVELS = {
  LOW: { min: 0, max: 0.4, label: 'Low Confidence', color: '#ef4444' },
  MEDIUM: { min: 0.4, max: 0.7, label: 'Medium Confidence', color: '#eab308' },
  HIGH: { min: 0.7, max: 0.9, label: 'High Confidence', color: '#22c55e' },
  VERY_HIGH: { min: 0.9, max: 1.0, label: 'Very High Confidence', color: '#16a34a' }
}

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy h:mm a',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss'Z'",
  SHORT: 'MM/dd/yy',
  TIME_ONLY: 'h:mm a'
}

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/json'
  ],
  MAX_FILES: 5
}

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
  LOCATION: /^[a-zA-Z\s]+,\s*[a-zA-Z\s]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
}

// Cache Keys
export const CACHE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
  ANALYSES: 'analyses',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  API_STATS: 'api_stats',
  BUSINESS_TYPES: 'business_types',
  DATA_SOURCES: 'data_sources'
}

// Cache Durations (in milliseconds)
export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  VERY_LONG: 7 * 24 * 60 * 60 * 1000 // 7 days
}

// Feature Flags
export const FEATURE_FLAGS = {
  REAL_TIME_UPDATES: true,
  ADVANCED_ANALYTICS: true,
  EXPORT_FUNCTIONALITY: true,
  SOCIAL_SHARING: true,
  BATCH_ANALYSIS: true,
  SCHEDULED_ANALYSIS: false, // Coming soon
  API_INTEGRATIONS: true,
  CUSTOM_REPORTS: true
}

// Social Media Platforms
export const SOCIAL_PLATFORMS = {
  TWITTER: { name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
  FACEBOOK: { name: 'Facebook', icon: '📘', color: '#1877F2' },
  INSTAGRAM: { name: 'Instagram', icon: '📸', color: '#E4405F' },
  LINKEDIN: { name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  REDDIT: { name: 'Reddit', icon: '👾', color: '#FF4500' },
  YOUTUBE: { name: 'YouTube', icon: '📺', color: '#FF0000' }
}

// Competitor Metrics
export const COMPETITOR_METRICS = {
  MARKET_SHARE: 'market_share',
  CUSTOMER_SATISFACTION: 'customer_satisfaction',
  PRICE_COMPETITIVENESS: 'price_competitiveness',
  PRODUCT_QUALITY: 'product_quality',
  BRAND_AWARENESS: 'brand_awareness',
  ONLINE_PRESENCE: 'online_presence'
}

// Notification Types
export const NOTIFICATION_TYPES = {
  ANALYSIS_COMPLETE: 'analysis_complete',
  REPORT_READY: 'report_ready',
  API_LIMIT_WARNING: 'api_limit_warning',
  SYSTEM_UPDATE: 'system_update',
  NEW_FEATURE: 'new_feature',
  SECURITY_ALERT: 'security_alert'
}

// Export Types
export const EXPORT_TYPES = {
  CSV: 'csv',
  EXCEL: 'excel',
  JSON: 'json',
  PDF: 'pdf'
}

// Default Values
export const DEFAULTS = {
  ANALYSIS: {
    timeframe_days: 30,
    max_results: 50,
    include_sources: ['reviews', 'news', 'social']
  },
  REPORT: {
    format: 'pdf',
    include_charts: true,
    executive_summary: true
  },
  SETTINGS: {
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    notifications: true
  }
}