// Email validation
export const validateEmail = (email) => {
  if (!email) return 'Email is required'
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
  
  return null
}

// Password validation
export const validatePassword = (password) => {
  if (!password) return 'Password is required'
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number'
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    return 'Password must contain at least one special character (@$!%*?&)'
  }
  
  return null
}

// Phone number validation
export const validatePhone = (phone) => {
  if (!phone) return null // Phone is optional
  
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number'
  }
  
  return null
}

// Location validation
export const validateLocation = (location) => {
  if (!location) return 'Location is required'
  
  if (location.length > 100) {
    return 'Location must be less than 100 characters'
  }
  
  if (!/,/.test(location)) {
    return 'Please include city and state/country (e.g., "New York, NY")'
  }
  
  const parts = location.split(',').map(part => part.trim())
  if (parts.length < 2) {
    return 'Please include city and state/country separated by a comma'
  }
  
  if (parts[0].length < 2) {
    return 'City name is too short'
  }
  
  if (parts[1].length < 2) {
    return 'State/Country name is too short'
  }
  
  return null
}

// Business name validation
export const validateBusinessName = (name) => {
  if (!name) return 'Business name is required'
  
  if (name.length > 200) {
    return 'Business name must be less than 200 characters'
  }
  
  if (!/^[a-zA-Z0-9\s\-\'&.,]+$/.test(name)) {
    return 'Business name contains invalid characters'
  }
  
  return null
}

// URL validation
export const validateUrl = (url) => {
  if (!url) return null // URL is optional
  
  try {
    new URL(url)
    return null
  } catch (error) {
    return 'Please enter a valid URL'
  }
}

// Number validation
export const validateNumber = (value, options = {}) => {
  const { required = false, min, max, integer = false } = options
  
  if (!value && value !== 0) {
    return required ? 'This field is required' : null
  }
  
  const num = Number(value)
  
  if (isNaN(num)) {
    return 'Please enter a valid number'
  }
  
  if (integer && !Number.isInteger(num)) {
    return 'Please enter an integer'
  }
  
  if (min !== undefined && num < min) {
    return `Value must be at least ${min}`
  }
  
  if (max !== undefined && num > max) {
    return `Value must be at most ${max}`
  }
  
  return null
}

// Date validation
export const validateDate = (date, options = {}) => {
  const { required = false, minDate, maxDate } = options
  
  if (!date) {
    return required ? 'Date is required' : null
  }
  
  const dateObj = new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    return 'Please enter a valid date'
  }
  
  if (minDate) {
    const minDateObj = new Date(minDate)
    if (dateObj < minDateObj) {
      return `Date must be on or after ${minDateObj.toLocaleDateString()}`
    }
  }
  
  if (maxDate) {
    const maxDateObj = new Date(maxDate)
    if (dateObj > maxDateObj) {
      return `Date must be on or before ${maxDateObj.toLocaleDateString()}`
    }
  }
  
  return null
}

// Timeframe validation
export const validateTimeframe = (days) => {
  const error = validateNumber(days, { required: true, min: 1, max: 365, integer: true })
  
  if (error) {
    return error === 'This field is required' 
      ? 'Timeframe is required'
      : error
  }
  
  return null
}

// Competitor list validation
export const validateCompetitors = (competitors) => {
  if (!competitors || !Array.isArray(competitors)) {
    return 'Competitors must be an array'
  }
  
  if (competitors.length > 20) {
    return 'Maximum 20 competitors allowed'
  }
  
  for (let i = 0; i < competitors.length; i++) {
    const competitor = competitors[i]
    const error = validateBusinessName(competitor)
    if (error) {
      return `Competitor ${i + 1}: ${error}`
    }
  }
  
  return null
}

// API key validation
export const validateApiKey = (key, apiName = '') => {
  if (!key) return `${apiName} API key is required`
  
  if (key.length < 20) {
    return `${apiName} API key must be at least 20 characters`
  }
  
  if (!/^[A-Za-z0-9_\-]{20,}$/.test(key)) {
    return `${apiName} API key contains invalid characters`
  }
  
  return null
}

// File validation
export const validateFile = (file, options = {}) => {
  const { 
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/json'
    ]
  } = options
  
  if (!file) return 'File is required'
  
  if (file.size > maxSize) {
    return `File size must be less than ${formatBytes(maxSize)}`
  }
  
  if (!allowedTypes.includes(file.type)) {
    return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
  }
  
  return null
}

// Form validation
export const validateForm = (formData, rules) => {
  const errors = {}
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field]
    let error = null
    
    if (rule.required && !value && value !== 0 && value !== false) {
      error = rule.requiredMessage || `${field} is required`
    } else if (rule.validate && value) {
      error = rule.validate(value, rule.options)
    } else if (rule.pattern && value && !rule.pattern.test(value)) {
      error = rule.patternMessage || `${field} is invalid`
    } else if (rule.minLength && value && value.length < rule.minLength) {
      error = `${field} must be at least ${rule.minLength} characters`
    } else if (rule.maxLength && value && value.length > rule.maxLength) {
      error = `${field} must be at most ${rule.maxLength} characters`
    } else if (rule.min && value != null && Number(value) < rule.min) {
      error = `${field} must be at least ${rule.min}`
    } else if (rule.max && value != null && Number(value) > rule.max) {
      error = `${field} must be at most ${rule.max}`
    } else if (rule.equals && value !== rule.equals) {
      error = `${field} must match ${rule.equalsField || 'required value'}`
    } else if (rule.custom && value) {
      error = rule.custom(value)
    }
    
    if (error) {
      errors[field] = error
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null
}

// Business type validation
export const validateBusinessType = (type) => {
  const validTypes = ['restaurant', 'retail', 'service', 'tech', 'healthcare', 'other']
  
  if (!type) return 'Business type is required'
  
  if (!validTypes.includes(type)) {
    return `Invalid business type. Must be one of: ${validTypes.join(', ')}`
  }
  
  return null
}

// Analysis type validation
export const validateAnalysisType = (type) => {
  const validTypes = ['comprehensive', 'competitor', 'sentiment', 'trend']
  
  if (!type) return 'Analysis type is required'
  
  if (!validTypes.includes(type)) {
    return `Invalid analysis type. Must be one of: ${validTypes.join(', ')}`
  }
  
  return null
}

// Data sources validation
export const validateDataSources = (sources) => {
  const validSources = ['reviews', 'news', 'social', 'businesses', 'indicators']
  
  if (!sources || !Array.isArray(sources)) {
    return 'Data sources must be an array'
  }
  
  if (sources.length === 0) {
    return 'At least one data source is required'
  }
  
  for (const source of sources) {
    if (!validSources.includes(source)) {
      return `Invalid data source: ${source}. Must be one of: ${validSources.join(', ')}`
    }
  }
  
  return null
}

// Custom prompt validation
export const validateCustomPrompt = (prompt) => {
  if (!prompt) return null // Optional field
  
  if (prompt.length > 1000) {
    return 'Custom prompt must be less than 1000 characters'
  }
  
  return null
}

// ZIP code validation
export const validateZipCode = (zipCode) => {
  if (!zipCode) return null // Optional field
  
  const zipRegex = /^\d{5}(-\d{4})?$/
  if (!zipRegex.test(zipCode)) {
    return 'Please enter a valid ZIP code'
  }
  
  return null
}

// Credit card validation
export const validateCreditCard = (cardNumber) => {
  if (!cardNumber) return 'Credit card number is required'
  
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, '')
  
  // Check if it's all numbers
  if (!/^\d+$/.test(cleaned)) {
    return 'Credit card number must contain only digits'
  }
  
  // Check length
  if (cleaned.length < 13 || cleaned.length > 19) {
    return 'Credit card number must be 13-19 digits'
  }
  
  // Luhn algorithm check
  let sum = 0
  let isEven = false
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10)
    
    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }
    
    sum += digit
    isEven = !isEven
  }
  
  if (sum % 10 !== 0) {
    return 'Invalid credit card number'
  }
  
  return null
}

// CVV validation
export const validateCVV = (cvv) => {
  if (!cvv) return 'CVV is required'
  
  if (!/^\d+$/.test(cvv)) {
    return 'CVV must contain only digits'
  }
  
  if (cvv.length < 3 || cvv.length > 4) {
    return 'CVV must be 3-4 digits'
  }
  
  return null
}

// Expiration date validation
export const validateExpirationDate = (date) => {
  if (!date) return 'Expiration date is required'
  
  const [month, year] = date.split('/').map(part => part.trim())
  
  if (!month || !year) {
    return 'Please enter date in MM/YY format'
  }
  
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)
  
  if (isNaN(monthNum) || isNaN(yearNum)) {
    return 'Please enter valid numbers'
  }
  
  if (monthNum < 1 || monthNum > 12) {
    return 'Month must be between 01 and 12'
  }
  
  const currentYear = new Date().getFullYear() % 100
  const currentMonth = new Date().getMonth() + 1
  
  if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
    return 'Card has expired'
  }
  
  if (yearNum > currentYear + 20) {
    return 'Invalid expiration year'
  }
  
  return null
}

// Helper function to format bytes (used in file validation)
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  
  if (bytes === 0) return '0 Bytes'
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}