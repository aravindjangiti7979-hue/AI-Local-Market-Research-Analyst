import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  TrendingUp,
  Users,
  DollarSign,
  MapPin,
  Clock,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Edit,
  Loader
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useAlerts } from '../hooks/useAlerts';
import LoadingSpinner from '../components/LoadingSpinner';

// Validation schema
const alertSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(500).optional(),
  type: z.enum(['competitor', 'sentiment', 'market_share', 'price']),
  frequency: z.enum(['realtime', 'daily', 'weekly', 'monthly']),
  threshold: z.number().min(0).optional().nullable()
});

const Alerts = () => {
  const navigate = useNavigate();
  const { alerts, isLoading, createAlert, toggleAlert, deleteAlert } = useAlerts();
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'competitor',
      frequency: 'daily',
      threshold: null
    }
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await createAlert(data);
      setShowNewAlert(false);
      reset();
    } catch (error) {
      console.error('Error creating alert:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAlert = async (alertId, currentStatus) => {
    await toggleAlert(alertId, !currentStatus);
  };

  const handleDeleteAlert = async (alertId) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      await deleteAlert(alertId);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'competitor':
        return <Users className="w-6 h-6" />;
      case 'sentiment':
        return <TrendingUp className="w-6 h-6" />;
      case 'market_share':
        return <DollarSign className="w-6 h-6" />;
      case 'price':
        return <MapPin className="w-6 h-6" />;
      default:
        return <Bell className="w-6 h-6" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'competitor':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'sentiment':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'market_share':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
      case 'price':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="btn-secondary p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Alerts</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure notifications and monitoring alerts
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowNewAlert(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
      </div>

      {/* Alerts Grid */}
      {alerts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Alerts Configured
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create your first alert to get notified about market changes and opportunities.
          </p>
          <button
            onClick={() => setShowNewAlert(true)}
            className="btn-primary"
          >
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${getTypeColor(alert.type)}`}>
                    {getTypeIcon(alert.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {alert.name}
                    </h3>
                    {alert.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {alert.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                  className="text-2xl"
                >
                  {alert.enabled ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Alert Details */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frequency</div>
                  <div className="font-medium text-gray-900 dark:text-white capitalize">
                    {alert.frequency}
                  </div>
                </div>
                
                {alert.threshold !== null && alert.threshold !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Threshold</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {alert.threshold}{alert.type === 'sentiment' ? '' : '%'}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/settings/alerts/${alert.id}/edit`)}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Alert Modal */}
      {showNewAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold mb-4">Create New Alert</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alert Name *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="input-field w-full"
                  placeholder="e.g., New Competitor Alert"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  className="input-field w-full"
                  rows="3"
                  placeholder="Describe when this alert should trigger"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alert Type *
                </label>
                <select {...register('type')} className="input-field w-full">
                  <option value="competitor">Competitor</option>
                  <option value="sentiment">Sentiment</option>
                  <option value="market_share">Market Share</option>
                  <option value="price">Price Level</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency *
                </label>
                <select {...register('frequency')} className="input-field w-full">
                  <option value="realtime">Real-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Threshold (optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('threshold', { valueAsNumber: true })}
                  className="input-field w-full"
                  placeholder="e.g., 5%"
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAlert(false);
                    reset();
                  }}
                  className="flex-1 btn-secondary py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary py-2 flex items-center justify-center"
                >
                  {submitting ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    'Create Alert'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Alerts;