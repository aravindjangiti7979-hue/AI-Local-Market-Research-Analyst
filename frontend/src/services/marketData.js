import api from './api';

// Create market data service
const marketDataService = {
  // Get dashboard data
  async getDashboardData(timeRange = '30d') {
    try {
      const response = await api.get('/market-data/dashboard', { 
        params: { time_range: timeRange } 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Get user reports with filters
  async getUserReports({ limit = 10, skip = 0, format = 'all', sortBy = 'date', sortOrder = 'desc', search = '' } = {}) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        skip: skip.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (format && format !== 'all') params.append('format', format);
      if (search) params.append('search', search);
      
      const response = await api.get(`/reports/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
  },

  // Get report statistics
  async getReportStats() {
    try {
      const response = await api.get('/reports/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching report stats:', error);
      return {
        total_reports: 0,
        pdf_count: 0,
        html_count: 0,
        json_count: 0,
        total_size: 0,
        avg_size: 0,
        most_recent: null
      };
    }
  },

  // Get recent reports
  async getRecentReports(limit = 5) {
    try {
      const response = await api.get(`/reports/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent reports:', error);
      return [];
    }
  },

  // Generate report from analysis
  async generateReport(analysisId, options = {}) {
    try {
      const response = await api.post(`/reports/generate/${analysisId}`, options);
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  // Get report by ID
  async getReportById(reportId) {
    try {
      const response = await api.get(`/reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  },

  // FIXED: Download report - returns blob for file download
  async downloadReport(reportId, format = 'json') {
    try {
      const response = await api.get(`/reports/${reportId}/download`, {
        params: { format },
        responseType: 'blob', // Important: get blob for file download
      });
      
      return {
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },

  // Delete report
  async deleteReport(reportId) {
    try {
      const response = await api.delete(`/reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Share report
  async shareReport(reportId, options = {}) {
    try {
      const response = await api.post(`/reports/${reportId}/share`, options);
      return response.data;
    } catch (error) {
      console.error('Error sharing report:', error);
      throw error;
    }
  },

  // Generate custom insights
  async generateCustomInsights() {
    try {
      const response = await api.post('/analysis/generate-insights');
      return response.data;
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  },

  // Get analysis history
  async getAnalysisHistory({ limit = 20, offset = 0 } = {}) {
    try {
      const response = await api.get(`/analysis/history?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      return [];
    }
  },

  // Create new market analysis
  async createAnalysis(analysisData) {
    try {
      // Ensure data is in the format backend expects
      const payload = {
        location: analysisData.location,
        business_type: analysisData.businessType || analysisData.business_type,
        analysis_type: analysisData.analysisType || analysisData.analysis_type || 'comprehensive',
        competitors: analysisData.competitors || [],
        timeframe_days: analysisData.timeframeDays || analysisData.timeframe_days || 30,
        include_sources: analysisData.includeSources || analysisData.include_sources || ['reviews', 'news', 'social'],
        custom_prompt: analysisData.customPrompt || analysisData.custom_prompt
      };
      
      const response = await api.post('/analysis', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating analysis:', error);
      throw error;
    }
  },

  // Get analysis by ID
  async getAnalysis(analysisId) {
    try {
      const response = await api.get(`/analysis/${analysisId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching analysis:', error);
      throw error;
    }
  },

  // Get analysis status
  async getAnalysisStatus(analysisId) {
    try {
      const response = await api.get(`/analysis/${analysisId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching analysis status:', error);
      throw error;
    }
  },

  // Retry failed analysis
  async retryAnalysis(requestId) {
    try {
      const response = await api.post(`/analysis/${requestId}/retry`);
      return response.data;
    } catch (error) {
      console.error('Error retrying analysis:', error);
      throw error;
    }
  },

  // Delete analysis
  async deleteAnalysis(analysisId) {
    try {
      const response = await api.delete(`/analysis/${analysisId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting analysis:', error);
      throw error;
    }
  },

  // Get API usage stats
  async getApiUsageStats() {
    try {
      const response = await api.get('/market-data/api-usage');
      return response.data;
    } catch (error) {
      console.error('Error fetching API usage stats:', error);
      throw error;
    }
  },

  // Test API connection
  async testApiConnection(apiName) {
    try {
      const response = await api.post('/market-data/test-connection', { api_name: apiName });
      return response.data;
    } catch (error) {
      console.error('Error testing API connection:', error);
      throw error;
    }
  },

  // Reset API usage
  async resetApiUsage() {
    try {
      const response = await api.post('/market-data/reset-usage');
      return response.data;
    } catch (error) {
      console.error('Error resetting API usage:', error);
      throw error;
    }
  },

  // Export dashboard data
  async exportDashboardData(timeRange = '30d', format = 'csv') {
    try {
      const response = await api.get(`/market-data/export`, {
        params: { time_range: timeRange, format },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting dashboard data:', error);
      throw error;
    }
  }
};

// Helper function to trigger file download from blob
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export { marketDataService };
export default marketDataService;