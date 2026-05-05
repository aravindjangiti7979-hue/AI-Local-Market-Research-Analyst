import { api, authApi } from './api.js'

// Create auth service object
const authService = {
  // Login with email and password
  async login(email, password) {
    try {
      // Create URL-encoded form data
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)
      
      // Send as form-urlencoded - use authApi
      const response = await authApi.login(formData)
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token)
        // Also get user info
        const userResponse = await this.getCurrentUser()
        if (userResponse) {
          localStorage.setItem('user', JSON.stringify(userResponse))
        }
        return response.data
      }
      throw new Error('No access token received')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  // Register new user
  async register(userData) {
    try {
      const response = await authApi.register(userData)
      return response.data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const response = await authApi.me()
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data))
      }
      return response.data
    } catch (error) {
      console.error('Get user error:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      throw error
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData)
      // Update stored user data
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data))
      }
      return response.data
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  },

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await api.post('/auth/change-password', passwordData)
      return response.data
    } catch (error) {
      console.error('Change password error:', error)
      throw error
    }
  },

  // Logout
  async logout() {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token')
  },

  // Get token
  getToken() {
    return localStorage.getItem('token')
  },

  // Get current user from localStorage
  getCurrentUserFromStorage() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  // Get API usage (if needed)
  async getApiUsage() {
    try {
      const response = await api.get('/market-data/api-usage')
      return response.data
    } catch (error) {
      console.error('Error fetching API usage:', error)
      return {
        total_requests: 0,
        requests_today: 0,
        requests_this_month: 0,
        plan_limit: 100,
        remaining_requests: 100,
        last_request_at: null
      }
    }
  }
}

export default authService