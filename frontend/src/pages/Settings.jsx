import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Shield, 
  Save,
  Eye,
  EyeOff,
  Bell
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// Components
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import authService from '../services/auth'
import { validatePhone } from '../utils/validators'

// Validation schemas
const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().optional(),
  phone: z.string().optional().refine(
    (val) => !val || validatePhone(val),
    'Invalid phone number format'
  )
})

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
})

const Settings = () => {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Profile form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      company: '',
      phone: ''
    }
  })

  // Password form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    }
  })

  // Update form values when user loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        full_name: user.full_name || '',
        company: user.company || '',
        phone: user.phone || ''
      })
    }
  }, [user, profileForm])

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await authService.updateProfile(data)
      return response
    },
    onSuccess: (data) => {
      updateProfile(data)
      toast.success('Profile updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update profile')
    }
  })

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await authService.changePassword({
        current_password: data.current_password,
        new_password: data.new_password
      })
      return response
    },
    onSuccess: () => {
      passwordForm.reset()
      toast.success('Password updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update password')
    }
  })

  // Handle profile update
  const handleProfileUpdate = (data) => {
    updateProfileMutation.mutate(data)
  }

  // Handle password update
  const handlePasswordUpdate = (data) => {
    updatePasswordMutation.mutate(data)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ]

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Account Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your account settings
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-64"
          >
            <div className="glass-card rounded-xl p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <tab.icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Profile Information
                </h2>
                <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        {...profileForm.register('full_name')}
                        className="input-field"
                        placeholder="John Doe"
                      />
                      {profileForm.formState.errors.full_name && (
                        <p className="mt-1 text-sm text-red-600">
                          {profileForm.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user.email || ''}
                        className="input-field bg-gray-100 dark:bg-gray-800"
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        {...profileForm.register('company')}
                        className="input-field"
                        placeholder="Your Company"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        {...profileForm.register('phone')}
                        className="input-field"
                        placeholder="+1 (555) 123-4567"
                      />
                      {profileForm.formState.errors.phone && (
                        <p className="mt-1 text-sm text-red-600">
                          {profileForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary flex items-center"
                      disabled={updateProfileMutation.isLoading}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Security Settings
                </h2>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          {...passwordForm.register('current_password')}
                          className="input-field pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.current_password && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordForm.formState.errors.current_password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          {...passwordForm.register('new_password')}
                          className="input-field pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.new_password && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordForm.formState.errors.new_password.message}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-gray-500">
                        Must be at least 8 characters with uppercase, lowercase, and numbers
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...passwordForm.register('confirm_password')}
                          className="input-field pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.confirm_password && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordForm.formState.errors.confirm_password.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary flex items-center"
                      disabled={updatePasswordMutation.isLoading}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {updatePasswordMutation.isLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Notification Alerts
                  </h2>
                  <button
                    onClick={() => navigate('/settings/alerts')}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Manage Alerts
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Configure alerts to monitor market changes, competitor activity, and sentiment shifts.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-semibold">Quick tip:</span> Set up alerts to get notified when 
                    new competitors enter your market or when customer sentiment changes significantly.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Settings