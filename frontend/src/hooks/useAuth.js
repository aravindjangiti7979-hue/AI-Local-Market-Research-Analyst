import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import authService from '../services/auth.js'
import toast from 'react-hot-toast'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const navigate = useNavigate()
  const location = useLocation()

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if token exists
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }
        
        // Try to get user data
        const userData = await authService.getCurrentUser()
        if (userData) {
          setUser(userData)
        }
      } catch (err) {
        console.error('Failed to load user:', err)
        if (err.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Login function
  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)

    try {
      await authService.login(email, password)
      
      // Get user data
      const userData = await authService.getCurrentUser()
      setUser(userData)
      
      toast.success('Logged in successfully!')
      
      // Redirect
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
      
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed'
      setError(errorMessage)
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [navigate, location])

  // Register function
  const register = useCallback(async (userData) => {
    setLoading(true)
    setError(null)

    try {
      await authService.register(userData)
      
      // Auto-login after registration
      await authService.login(userData.email, userData.password)
      const userDataFromApi = await authService.getCurrentUser()
      
      setUser(userDataFromApi)
      toast.success('Account created successfully!')
      navigate('/dashboard', { replace: true })
      
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Registration failed'
      setError(errorMessage)
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Update profile function
  const updateProfile = useCallback(async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData)
      setUser(updatedUser)
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update profile'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [])

  // Change password function
  const changePassword = useCallback(async (passwordData) => {
    try {
      await authService.changePassword(passwordData)
      toast.success('Password updated successfully!')
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to change password'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true)
    
    try {
      await authService.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setLoading(false)
      
      toast.success('Logged out successfully')
      navigate('/login', { replace: true })
    }
  }, [navigate])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!localStorage.getItem('token'),
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
  }
}