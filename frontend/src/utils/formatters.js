import { format, formatDistance, formatRelative, parseISO } from 'date-fns'
import { enUS } from 'date-fns/locale'

// Number formatting
export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined) return 'N/A'
  
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    style = 'decimal',
    currency = 'USD',
    notation = 'standard'
  } = options

  const formatter = new Intl.NumberFormat('en-US', {
    style,
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    notation
  })

  return formatter.format(number)
}

// Currency formatting
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return 'N/A'
  
  return formatNumber(amount, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

// Percentage formatting
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return 'N/A'
  
  return `${(value * 100).toFixed(decimals)}%`
}

// Date formatting
export const formatDate = (date, formatString = 'MMM dd, yyyy HH:mm') => {
  if (!date) return 'N/A'
  
  try {
    const dateObj = date instanceof Date ? date : parseISO(date)
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    
    if (formatString === 'short') {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } else if (formatString === 'time') {
      return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else {
      return dateObj.toLocaleDateString('en-US', options)
    }
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

// Relative time formatting
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A'
  
  try {
    const dateObj = date instanceof Date ? date : parseISO(date)
    return formatDistance(dateObj, new Date(), { addSuffix: true, locale: enUS })
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return 'Invalid Date'
  }
}

// Duration formatting
export const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return 'N/A'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  const parts = []
  
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`)
  
  return parts.join(' ')
}

// File size formatting
export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes && bytes !== 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

  if (bytes === 0) return '0 Bytes'

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// Phone number formatting
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return ''
  
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  } else {
    return phoneNumber
  }
}

// Location formatting
export const formatLocation = (location) => {
  if (!location) return ''
  
  return location
    .split(',')
    .map(part => part.trim())
    .map(part => part.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    )
    .join(', ')
}

// Business type formatting
export const formatBusinessType = (type) => {
  if (!type) return 'Unknown'
  
  const typeStr = type.toString().toLowerCase()
  
  const businessTypes = {
    restaurant: 'Restaurant',
    retail: 'Retail',
    service: 'Service',
    tech: 'Technology',
    healthcare: 'Healthcare',
    other: 'Other'
  }
  
  return businessTypes[typeStr] || typeStr.charAt(0).toUpperCase() + typeStr.slice(1)
}

// Analysis type formatting
export const formatAnalysisType = (type) => {
  if (!type) return 'Unknown'
  
  const typeStr = type.toString().toLowerCase()
  
  const analysisTypes = {
    comprehensive: 'Comprehensive',
    competitor: 'Competitor',
    sentiment: 'Sentiment',
    trend: 'Trend'
  }
  
  return analysisTypes[typeStr] || typeStr.charAt(0).toUpperCase() + typeStr.slice(1)
}

// Confidence score formatting
export const formatConfidenceScore = (score) => {
  if (score === null || score === undefined) return 'N/A'
  
  const percentage = Math.round(score * 100)
  
  if (score >= 0.9) return `${percentage}% (Very High)`
  if (score >= 0.7) return `${percentage}% (High)`
  if (score >= 0.5) return `${percentage}% (Medium)`
  if (score >= 0.3) return `${percentage}% (Low)`
  return `${percentage}% (Very Low)`
}

// Sentiment score formatting
export const formatSentimentScore = (score) => {
  if (score === null || score === undefined) return 'N/A'
  
  const percentage = Math.round((score + 1) * 50)
  
  if (score >= 0.6) return `${percentage}% (Very Positive)`
  if (score >= 0.2) return `${percentage}% (Positive)`
  if (score >= -0.2) return `${percentage}% (Neutral)`
  if (score >= -0.6) return `${percentage}% (Negative)`
  return `${percentage}% (Very Negative)`
}

// Get rating color
export const getRatingColor = (rating) => {
  if (!rating) return '#9ca3af'
  if (rating >= 4.5) return '#10b981'
  if (rating >= 4.0) return '#3b82f6'
  if (rating >= 3.5) return '#f59e0b'
  if (rating >= 3.0) return '#f97316'
  return '#ef4444'
}

// Get status badge color
export const getStatusColor = (status) => {
  const statusMap = {
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'processing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'pending': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
  return statusMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

// Get format badge color
export const getFormatColor = (format) => {
  const formatMap = {
    'pdf': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'html': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'json': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'csv': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'markdown': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
  return formatMap[format] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// Generate initials from name
export const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2)
}

// Format rating with stars
export const formatRating = (rating, max = 5) => {
  if (!rating && rating !== 0) return 'No rating'
  
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0)
  
  let stars = '★'.repeat(fullStars)
  if (hasHalfStar) stars += '½'
  stars += '☆'.repeat(emptyStars)
  
  return `${stars} (${rating.toFixed(1)}/${max})`
}

// Format price level
export const formatPriceLevel = (level) => {
  if (!level && level !== 0) return 'Price not available'
  return '$'.repeat(level)
}

// Format website URL
export const formatWebsite = (url) => {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

// Format API response error
export const formatApiError = (error) => {
  if (!error) return 'An unknown error occurred'
  if (error.response?.data?.detail) return error.response.data.detail
  if (error.response?.data?.message) return error.response.data.message
  if (error.message) return error.message
  return 'An unknown error occurred'
}

// Format progress percentage
export const formatProgress = (current, total) => {
  if (!total || total === 0) return '0%'
  return `${Math.round((current / total) * 100)}%`
}

// Format physical distance
export const formatPhysicalDistance = (meters, unit = 'imperial') => {
  if (!meters && meters !== 0) return 'N/A'
  
  if (unit === 'metric') {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  } else {
    const miles = meters * 0.000621371
    if (miles < 0.1) return `${Math.round(meters * 3.28084)}ft`
    return `${miles.toFixed(1)}mi`
  }
}

// Format time remaining
export const formatTimeRemaining = (seconds) => {
  if (!seconds && seconds !== 0) return 'Calculating...'
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`
  if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
}

// Format market share
export const formatMarketShare = (value) => {
  if (value === null || value === undefined) return 'N/A'
  return `${(value * 100).toFixed(1)}%`
}

// Get sentiment color
export const getSentimentColor = (value) => {
  if (value === null || value === undefined) return 'text-gray-500'
  if (value > 0.3) return 'text-green-600 dark:text-green-400'
  if (value < -0.3) return 'text-red-600 dark:text-red-400'
  return 'text-yellow-600 dark:text-yellow-400'
}

// Time ago formatting
export const timeAgo = (dateString) => {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  return `${years} year${years > 1 ? 's' : ''} ago`
}