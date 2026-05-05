import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import alertsService from '../services/alerts';
import toast from 'react-hot-toast';

export const useAlerts = () => {
  const queryClient = useQueryClient();

  // Fetch all alerts
  const {
    data: alerts = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        const response = await alertsService.getAlerts();
        return response || [];
      } catch (err) {
        console.error('Error fetching alerts:', err);
        toast.error('Failed to load alerts');
        return [];
      }
    }
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData) => {
      return await alertsService.createAlert(alertData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create alert');
    }
  });

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({ alertId, alertData }) => {
      return await alertsService.updateAlert(alertId, alertData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update alert');
    }
  });

  // Toggle alert mutation
  const toggleAlertMutation = useMutation({
    mutationFn: async ({ alertId, enabled }) => {
      return await alertsService.toggleAlert(alertId, enabled);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success(`Alert ${data.enabled ? 'enabled' : 'disabled'}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to toggle alert');
    }
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId) => {
      return await alertsService.deleteAlert(alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete alert');
    }
  });

  // Helper functions
  const createAlert = async (alertData) => {
    return createAlertMutation.mutateAsync(alertData);
  };

  const updateAlert = async (alertId, alertData) => {
    return updateAlertMutation.mutateAsync({ alertId, alertData });
  };

  const toggleAlert = async (alertId, enabled) => {
    return toggleAlertMutation.mutateAsync({ alertId, enabled });
  };

  const deleteAlert = async (alertId) => {
    return deleteAlertMutation.mutateAsync(alertId);
  };

  return {
    // Data
    alerts,
    isLoading,
    error,
    
    // Mutations
    createAlert,
    updateAlert,
    toggleAlert,
    deleteAlert,
    
    // Status flags
    isCreating: createAlertMutation.isLoading,
    isUpdating: updateAlertMutation.isLoading,
    isToggling: toggleAlertMutation.isLoading,
    isDeleting: deleteAlertMutation.isLoading,
    
    // Refresh
    refetch
  };
};