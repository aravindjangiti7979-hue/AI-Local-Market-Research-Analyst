import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../services/marketData';
import toast from 'react-hot-toast';

export const useReports = () => {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    type: 'all',
    dateRange: '30d',
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Fetch reports with filters
  const {
    data: reports = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reports', reportFilters],
    queryFn: () => reportsApi.getReports(reportFilters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: reportsApi.createReport,
    onSuccess: (newReport) => {
      queryClient.invalidateQueries(['reports']);
      toast.success('Report generated successfully!');
      setSelectedReport(newReport);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to generate report');
    },
  });

  // Update report mutation
  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }) => reportsApi.updateReport(id, data),
    onSuccess: (updatedReport) => {
      queryClient.invalidateQueries(['reports']);
      toast.success('Report updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update report');
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: reportsApi.deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      toast.success('Report deleted successfully!');
      setSelectedReport(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete report');
    },
  });

  // Export report mutation
  const exportReportMutation = useMutation({
    mutationFn: ({ id, format }) => reportsApi.exportReport(id, format),
    onSuccess: (data, variables) => {
      // Create download link
      const blob = new Blob([data], { type: `application/${variables.format}` });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${variables.id}.${variables.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Report exported as ${variables.format.toUpperCase()}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to export report');
    },
  });

  // Generate report from analysis
  const generateReport = useCallback(async (analysisId, options = {}) => {
    return createReportMutation.mutateAsync({
      analysis_id: analysisId,
      format: options.format || 'html',
      include_charts: options.includeCharts ?? true,
      executive_summary: options.executiveSummary ?? true,
      detailed_analysis: options.detailedAnalysis ?? true,
      recommendations: options.recommendations ?? true,
    });
  }, [createReportMutation]);

  // Update report
  const updateReport = useCallback(async (reportId, updates) => {
    return updateReportMutation.mutateAsync({ id: reportId, data: updates });
  }, [updateReportMutation]);

  // Delete report
  const deleteReport = useCallback(async (reportId) => {
    return deleteReportMutation.mutateAsync(reportId);
  }, [deleteReportMutation]);

  // Export report
  const exportReport = useCallback(async (reportId, format = 'pdf') => {
    return exportReportMutation.mutateAsync({ id: reportId, format });
  }, [exportReportMutation]);

  // Share report
  const shareReport = useCallback(async (reportId, options = {}) => {
    try {
      const response = await reportsApi.shareReport(reportId, options);
      toast.success('Report shared successfully!');
      return response;
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to share report');
      throw error;
    }
  }, []);

  // Get report by ID
  const getReportById = useCallback(async (reportId) => {
    try {
      const report = await reportsApi.getReportById(reportId);
      setSelectedReport(report);
      return report;
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to fetch report');
      throw error;
    }
  }, []);

  // Get report statistics
  const getReportStats = useCallback(async () => {
    try {
      return await reportsApi.getReportStats();
    } catch (error) {
      console.error('Failed to fetch report stats:', error);
      return null;
    }
  }, []);

  // Apply filters
  const applyFilters = useCallback((filters) => {
    setReportFilters(prev => ({ ...prev, ...filters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setReportFilters({
      type: 'all',
      dateRange: '30d',
      search: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  }, []);

  // Get filtered and sorted reports
  const getFilteredReports = useCallback(() => {
    let filtered = [...reports];

    // Apply search filter
    if (reportFilters.search) {
      const searchLower = reportFilters.search.toLowerCase();
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchLower) ||
        report.description?.toLowerCase().includes(searchLower) ||
        report.location?.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (reportFilters.type !== 'all') {
      filtered = filtered.filter(report => report.type === reportFilters.type);
    }

    // Apply date range filter
    const now = new Date();
    const dateRanges = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    
    if (dateRanges[reportFilters.dateRange]) {
      const daysAgo = dateRanges[reportFilters.dateRange];
      const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
      filtered = filtered.filter(report => 
        new Date(report.created_at) >= cutoffDate
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (reportFilters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'size':
          aValue = a.file_size || 0;
          bValue = b.file_size || 0;
          break;
        case 'confidence':
          aValue = a.confidence_score || 0;
          bValue = b.confidence_score || 0;
          break;
        default:
          return 0;
      }

      if (reportFilters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [reports, reportFilters]);

  // Get report types for filter
  const reportTypes = [
    { id: 'all', label: 'All Reports', count: reports.length },
    { id: 'competitor', label: 'Competitor Analysis', count: reports.filter(r => r.type === 'competitor').length },
    { id: 'sentiment', label: 'Sentiment Analysis', count: reports.filter(r => r.type === 'sentiment').length },
    { id: 'trend', label: 'Trend Analysis', count: reports.filter(r => r.type === 'trend').length },
    { id: 'comprehensive', label: 'Comprehensive', count: reports.filter(r => r.type === 'comprehensive').length },
  ];

  // Get report formats
  const reportFormats = [
    { id: 'pdf', label: 'PDF', icon: '📄' },
    { id: 'html', label: 'HTML', icon: '🌐' },
    { id: 'json', label: 'JSON', icon: '{}' },
    { id: 'csv', label: 'CSV', icon: '📊' },
  ];

  // Get report status
  const getReportStatus = useCallback((report) => {
    if (!report.status) return { label: 'Unknown', color: 'gray' };
    
    const statusMap = {
      'completed': { label: 'Completed', color: 'green' },
      'processing': { label: 'Processing', color: 'yellow' },
      'pending': { label: 'Pending', color: 'blue' },
      'failed': { label: 'Failed', color: 'red' },
    };
    
    return statusMap[report.status] || { label: report.status, color: 'gray' };
  }, []);

  // Get recent reports
  const recentReports = useCallback((limit = 5) => {
    return [...reports]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }, [reports]);

  // Get popular reports (by views or downloads)
  const popularReports = useCallback((limit = 5) => {
    return [...reports]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, limit);
  }, [reports]);

  // Get report insights
  const getReportInsights = useCallback(() => {
    if (!reports.length) return null;

    const totalReports = reports.length;
    const totalSize = reports.reduce((sum, report) => sum + (report.file_size || 0), 0);
    const avgConfidence = reports.reduce((sum, report) => sum + (report.confidence_score || 0), 0) / totalReports;
    
    const completedReports = reports.filter(r => r.status === 'completed').length;
    const failedReports = reports.filter(r => r.status === 'failed').length;
    
    const formatDistribution = reports.reduce((acc, report) => {
      acc[report.format] = (acc[report.format] || 0) + 1;
      return acc;
    }, {});
    
    const mostCommonFormat = Object.entries(formatDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';

    return {
      totalReports,
      totalSize,
      avgConfidence: avgConfidence.toFixed(2),
      completionRate: ((completedReports / totalReports) * 100).toFixed(1),
      failureRate: ((failedReports / totalReports) * 100).toFixed(1),
      mostCommonFormat,
      formatDistribution,
    };
  }, [reports]);

  // Subscribe to report updates (WebSocket/SSE)
  useEffect(() => {
    if (!reportsApi.hasWebSocketSupport()) return;

    const ws = reportsApi.subscribeToUpdates((update) => {
      if (update.type === 'report_updated') {
        queryClient.invalidateQueries(['reports']);
        
        if (selectedReport && selectedReport.id === update.report_id) {
          getReportById(update.report_id);
        }
      }
    });

    return () => {
      if (ws) ws.close();
    };
  }, [queryClient, selectedReport, getReportById]);

  return {
    // State
    reports,
    selectedReport,
    reportFilters,
    isLoading,
    error,
    
    // Actions
    generateReport,
    updateReport,
    deleteReport,
    exportReport,
    shareReport,
    getReportById,
    getReportStats,
    applyFilters,
    clearFilters,
    setSelectedReport,
    refetch,
    
    // Derived data
    filteredReports: getFilteredReports(),
    recentReports: recentReports(),
    popularReports: popularReports(),
    reportInsights: getReportInsights(),
    
    // Filter options
    reportTypes,
    reportFormats,
    
    // Helper functions
    getReportStatus,
    
    // Mutation status
    isGenerating: createReportMutation.isLoading,
    isUpdating: updateReportMutation.isLoading,
    isDeleting: deleteReportMutation.isLoading,
    isExporting: exportReportMutation.isLoading,
    
    // Mutation errors
    generationError: createReportMutation.error,
    updateError: updateReportMutation.error,
    deletionError: deleteReportMutation.error,
    exportError: exportReportMutation.error,
    
    // Clear mutations
    clearGenerationError: () => createReportMutation.reset(),
    clearUpdateError: () => updateReportMutation.reset(),
    clearDeletionError: () => deleteReportMutation.reset(),
    clearExportError: () => exportReportMutation.reset(),
  };
};

// Hook for managing a single report
export const useReport = (reportId) => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportsApi.getReportById(reportId),
    enabled: !!reportId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update report
  const updateReport = useCallback(async (updates) => {
    if (!reportId) return;
    
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      const updated = await reportsApi.updateReport(reportId, updates);
      queryClient.setQueryData(['report', reportId], updated);
      queryClient.invalidateQueries(['reports']);
      toast.success('Report updated successfully!');
      return updated;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update report';
      setUpdateError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [reportId, queryClient]);

  // Delete report
  const deleteReport = useCallback(async () => {
    if (!reportId) return;
    
    try {
      await reportsApi.deleteReport(reportId);
      queryClient.invalidateQueries(['reports']);
      toast.success('Report deleted successfully!');
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete report';
      toast.error(errorMessage);
      throw error;
    }
  }, [reportId, queryClient]);

  // Export report
  const exportReport = useCallback(async (format = 'pdf') => {
    if (!reportId) return;
    
    try {
      const data = await reportsApi.exportReport(reportId, format);
      
      // Create download link
      const blob = new Blob([data], { type: `application/${format}` });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to export report';
      toast.error(errorMessage);
      throw error;
    }
  }, [reportId]);

  // Share report
  const shareReport = useCallback(async (options = {}) => {
    if (!reportId) return;
    
    try {
      const result = await reportsApi.shareReport(reportId, options);
      toast.success('Report shared successfully!');
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to share report';
      toast.error(errorMessage);
      throw error;
    }
  }, [reportId]);

  // Get report content (for preview)
  const getReportContent = useCallback(async () => {
    if (!reportId) return null;
    
    try {
      return await reportsApi.getReportContent(reportId);
    } catch (error) {
      console.error('Failed to get report content:', error);
      return null;
    }
  }, [reportId]);

  // Get report analytics
  const getReportAnalytics = useCallback(async () => {
    if (!reportId) return null;
    
    try {
      return await reportsApi.getReportAnalytics(reportId);
    } catch (error) {
      console.error('Failed to get report analytics:', error);
      return null;
    }
  }, [reportId]);

  return {
    // State
    report,
    isLoading,
    error,
    isUpdating,
    updateError,
    
    // Actions
    updateReport,
    deleteReport,
    exportReport,
    shareReport,
    getReportContent,
    getReportAnalytics,
    refetch,
    
    // Helper functions
    clearUpdateError: () => setUpdateError(null),
  };
};

// Hook for report generation status
export const useReportGeneration = (analysisId) => {
  const [generationStatus, setGenerationStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [pollingInterval, setPollingInterval] = useState(null);

  const startGeneration = useCallback(async (options = {}) => {
    if (!analysisId) return;
    
    setGenerationStatus('starting');
    setProgress(0);
    
    try {
      // Start generation
      const response = await reportsApi.startReportGeneration(analysisId, options);
      const reportId = response.report_id;
      
      setGenerationStatus('processing');
      
      // Start polling for status
      const interval = setInterval(async () => {
        try {
          const status = await reportsApi.getGenerationStatus(reportId);
          
          setProgress(status.progress || 0);
          
          if (status.status === 'completed') {
            clearInterval(interval);
            setGenerationStatus('completed');
            setProgress(100);
            toast.success('Report generation completed!');
          } else if (status.status === 'failed') {
            clearInterval(interval);
            setGenerationStatus('failed');
            toast.error(status.error || 'Report generation failed');
          }
        } catch (error) {
          console.error('Failed to check generation status:', error);
        }
      }, 2000); // Poll every 2 seconds
      
      setPollingInterval(interval);
      
      return reportId;
    } catch (error) {
      setGenerationStatus('failed');
      toast.error(error.response?.data?.error?.message || 'Failed to start report generation');
      throw error;
    }
  }, [analysisId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const cancelGeneration = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setGenerationStatus('cancelled');
    toast.info('Report generation cancelled');
  }, [pollingInterval]);

  return {
    generationStatus,
    progress,
    startGeneration,
    cancelGeneration,
    isGenerating: generationStatus === 'processing' || generationStatus === 'starting',
    isCompleted: generationStatus === 'completed',
    isFailed: generationStatus === 'failed',
    isCancelled: generationStatus === 'cancelled',
  };
};