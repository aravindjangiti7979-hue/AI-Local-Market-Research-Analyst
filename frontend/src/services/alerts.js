import api from './api';

/**
 * Alerts service for managing user notifications
 */
const alertsService = {
  /**
   * Get all alerts for current user
   * @param {boolean} enabledOnly - Filter by enabled status
   */
  async getAlerts(enabledOnly = false) {
    try {
      const response = await api.get('/alerts', {
        params: { enabled_only: enabledOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  },

  /**
   * Get a single alert by ID
   * @param {number} alertId - Alert ID
   */
  async getAlert(alertId) {
    try {
      const response = await api.get(`/alerts/${alertId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw error;
    }
  },

  /**
   * Create a new alert
   * @param {Object} alertData - Alert data
   */
  async createAlert(alertData) {
    try {
      const response = await api.post('/alerts', alertData);
      return response.data;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  },

  /**
   * Update an existing alert
   * @param {number} alertId - Alert ID
   * @param {Object} alertData - Updated alert data
   */
  async updateAlert(alertId, alertData) {
    try {
      const response = await api.put(`/alerts/${alertId}`, alertData);
      return response.data;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  },

  /**
   * Toggle alert enabled status
   * @param {number} alertId - Alert ID
   * @param {boolean} enabled - New enabled status
   */
  async toggleAlert(alertId, enabled) {
    try {
      const response = await api.patch(`/alerts/${alertId}/toggle`, null, {
        params: { enabled }
      });
      return response.data;
    } catch (error) {
      console.error('Error toggling alert:', error);
      throw error;
    }
  },

  /**
   * Delete an alert
   * @param {number} alertId - Alert ID
   */
  async deleteAlert(alertId) {
    try {
      const response = await api.delete(`/alerts/${alertId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  }
};

export default alertsService;