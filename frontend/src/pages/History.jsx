import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  Eye, 
  TrendingUp, 
  AlertCircle,
  Clock,
  MapPin,
  Building,
  ChevronRight,
  BarChart3,
  PieChart,
  RotateCw
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

// Components
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { marketDataService, downloadBlob } from '../services/marketData'
import { formatDate, formatBytes } from '../utils/formatters'

const History = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [deletingIds, setDeletingIds] = useState(new Set())

  // Fetch analysis history
  const { data: history, isLoading, error, refetch } = useQuery({
    queryKey: ['analysis-history', user?.id],
    queryFn: async () => {
      try {
        const response = await marketDataService.getAnalysisHistory({ limit: 50 })
        return response || []
      } catch (err) {
        console.error('Error fetching history:', err)
        toast.error('Failed to load analysis history')
        return []
      }
    },
    enabled: !!user
  })

  // Fetch user reports (to get report IDs for completed analyses)
  const { data: reports, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['user-reports', user?.id],
    queryFn: async () => {
      try {
        const response = await marketDataService.getUserReports({ limit: 100 })
        return response || []
      } catch (err) {
        console.error('Error fetching reports:', err)
        return []
      }
    },
    enabled: !!user
  })

  // Create a map of analysis_id -> report_id for quick lookup
  const reportIdMap = React.useMemo(() => {
    const map = new Map()
    if (reports && reports.length > 0) {
      reports.forEach(report => {
        if (report.analysis_request_id) {
          map.set(report.analysis_request_id, report.id)
        }
      })
    }
    return map
  }, [reports])

  // Filter history
  const filteredHistory = React.useMemo(() => {
    if (!history) return []

    return history.filter(item => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.business_type && item.business_type.toLowerCase().includes(searchTerm.toLowerCase()))

      // Type filter
      const matchesType = selectedType === 'all' || 
        (item.analysis_type && item.analysis_type.toLowerCase() === selectedType.toLowerCase())

      // Status filter
      const matchesStatus = selectedStatus === 'all' || 
        (item.status && item.status.toLowerCase() === selectedStatus.toLowerCase())

      // Date filter
      let matchesDate = true
      if (dateRange.start && item.created_at) {
        const itemDate = new Date(item.created_at)
        const startDate = new Date(dateRange.start)
        matchesDate = matchesDate && itemDate >= startDate
      }
      if (dateRange.end && item.created_at) {
        const itemDate = new Date(item.created_at)
        const endDate = new Date(dateRange.end)
        endDate.setHours(23, 59, 59, 999)
        matchesDate = matchesDate && itemDate <= endDate
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate
    })
  }, [history, searchTerm, selectedType, selectedStatus, dateRange])

  // Statistics
  const stats = React.useMemo(() => {
    if (!history || history.length === 0) return null

    const totalAnalyses = history.length
    const completedAnalyses = history.filter(h => h.status === 'completed').length
    const failedAnalyses = history.filter(h => h.status === 'failed').length
    const uniqueLocations = [...new Set(history.map(h => h.location).filter(Boolean))].length
    const totalDataPoints = history.reduce((sum, h) => sum + (h.data_points || 0), 0)

    // Most analyzed location
    const locationCounts = history.reduce((acc, h) => {
      if (h.location) {
        acc[h.location] = (acc[h.location] || 0) + 1
      }
      return acc
    }, {})
    const mostAnalyzedLocation = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'

    return {
      totalAnalyses,
      completedAnalyses,
      failedAnalyses,
      uniqueLocations,
      totalDataPoints,
      mostAnalyzedLocation,
      completionRate: totalAnalyses > 0 ? (completedAnalyses / totalAnalyses * 100).toFixed(1) : 0
    }
  }, [history])

  // Handle view - go to report detail if completed, otherwise to analysis detail
  const handleView = (item) => {
    if (item.status === 'completed') {
      // Try to find the associated report
      const reportId = reportIdMap.get(item.id)
      if (reportId) {
        navigate(`/reports/${reportId}`)
      } else {
        // If no report found, go to analysis detail
        navigate(`/analysis/${item.id}`)
      }
    } else {
      // For non-completed analyses, go to analysis detail
      navigate(`/analysis/${item.id}`)
    }
  }

  // Handle download report - uses report ID, not analysis ID
  const handleDownloadReport = async (analysisId) => {
    try {
      // Get the report ID from the map
      const reportId = reportIdMap.get(analysisId)
      
      if (!reportId) {
        toast.error('No report found for this analysis')
        return
      }

      toast.loading('Preparing download...', { id: `download-${analysisId}` })
      
      const response = await marketDataService.downloadReport(reportId, 'pdf')
      
      const contentDisposition = response.headers['content-disposition']
      let filename = `report-${reportId}.pdf`
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }
      
      downloadBlob(response.data, filename)
      
      toast.success('Download completed!', { id: `download-${analysisId}` })
    } catch (err) {
      console.error('Error downloading report:', err)
      toast.error(err.message || 'Failed to download report', { id: `download-${analysisId}` })
    }
  }

  // Handle retry failed analysis
  const handleRetryAnalysis = async (requestId) => {
    try {
      toast.loading('Retrying analysis...', { id: `retry-${requestId}` })
      await marketDataService.retryAnalysis(requestId)
      toast.success('Analysis retried successfully!', { id: `retry-${requestId}` })
      refetch()
    } catch (err) {
      console.error('Error retrying analysis:', err)
      toast.error(err.message || 'Failed to retry analysis', { id: `retry-${requestId}` })
    }
  }

  // FIXED: Handle delete analysis with proper dependency checking
  const handleDeleteAnalysis = async (analysisId) => {
    // First check if this analysis has a report
    const reportId = reportIdMap.get(analysisId)
    
    let message = 'Are you sure you want to delete this analysis?'
    if (reportId) {
      message = 'This analysis has an associated report that will also be deleted. Are you sure?'
    }
    
    if (!window.confirm(message)) {
      return
    }

    // Add to deleting set to disable button
    setDeletingIds(prev => new Set(prev).add(analysisId))
    const toastId = `delete-${analysisId}`

    try {
      toast.loading('Deleting analysis...', { id: toastId })
      
      // If there's a report, delete it first (since it depends on the analysis)
      if (reportId) {
        try {
          await marketDataService.deleteReport(reportId)
          console.log(`✅ Deleted associated report: ${reportId}`)
        } catch (reportErr) {
          console.warn('Could not delete associated report:', reportErr)
          // If report deletion fails, we should stop because the analysis might still have dependencies
          throw new Error('Cannot delete analysis: associated report could not be deleted')
        }
      }
      
      // Now delete the analysis
      await marketDataService.deleteAnalysis(analysisId)
      
      toast.success('Analysis deleted successfully', { id: toastId })
      
      // Refresh both queries
      await refetch()
      await refetchReports()
      
    } catch (err) {
      console.error('Error deleting analysis:', err)
      
      // Check if it's a 400 error with a specific message
      if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.detail || 
                        err.response?.data?.message || 
                        'Cannot delete analysis because it has associated data'
        toast.error(errorMsg, { id: toastId })
      } else {
        toast.error(err.message || 'Failed to delete analysis', { id: toastId })
      }
    } finally {
      // Remove from deleting set
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(analysisId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

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
            Analysis History
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            View and manage your past market research analyses
          </p>
        </motion.div>

        {/* Stats Grid */}
        {stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <div className="glass-card rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {stats.completionRate}% success
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.totalAnalyses}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Total Analyses</p>
            </div>

            <div className="glass-card rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {stats.completedAnalyses}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.completedAnalyses}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Completed</p>
            </div>

            <div className="glass-card rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {stats.failedAnalyses}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.failedAnalyses}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Failed</p>
            </div>

            <div className="glass-card rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {stats.mostAnalyzedLocation}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.uniqueLocations}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Unique Locations</p>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by location or business type..."
                  className="input-field pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                className="input-field w-full lg:w-auto"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="comprehensive">Comprehensive</option>
                <option value="sentiment">Sentiment</option>
                <option value="competitor">Competitor</option>
                <option value="trend">Trend</option>
              </select>

              <select
                className="input-field w-full lg:w-auto"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>

              <div className="flex gap-2">
                <input
                  type="date"
                  className="input-field w-full lg:w-auto"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  className="input-field w-full lg:w-auto"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  placeholder="End Date"
                />
              </div>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedType('all')
                  setSelectedStatus('all')
                  setDateRange({ start: '', end: '' })
                }}
                className="btn-secondary whitespace-nowrap"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </motion.div>

        {/* History Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Business Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Analysis Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {filteredHistory.map((item, index) => {
                    const hasReport = reportIdMap.has(item.id)
                    const isDeleting = deletingIds.has(item.id)
                    
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.location || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {item.business_type || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {item.analysis_type || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : item.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 animate-pulse'
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {item.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {item.created_at ? formatDate(item.created_at) : 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {/* View Button - Always works */}
                            <button
                              onClick={() => handleView(item)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="View Details"
                              disabled={isDeleting}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {/* Download Button - Only for completed analyses with reports */}
                            {item.status === 'completed' && hasReport && (
                              <button
                                onClick={() => handleDownloadReport(item.id)}
                                className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Download Report"
                                disabled={isDeleting}
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Retry Button - Only for failed analyses */}
                            {item.status === 'failed' && (
                              <button
                                onClick={() => handleRetryAnalysis(item.id)}
                                className="p-1.5 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                                title="Retry Analysis"
                                disabled={isDeleting}
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Delete Button - Only if not deleting */}
                            <button
                              onClick={() => handleDeleteAnalysis(item.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isDeleting 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                              }`}
                              title={isDeleting ? 'Deleting...' : 'Delete'}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
                
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No Analysis History Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {searchTerm || selectedType !== 'all' || selectedStatus !== 'all' || dateRange.start || dateRange.end
                            ? 'Try adjusting your filters'
                            : 'Start your first market analysis to see history here'}
                        </p>
                        <button
                          onClick={() => navigate('/analysis/new')}
                          className="mt-4 btn-primary"
                        >
                          Start New Analysis
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Reports Section */}
        {reports && reports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Generated Reports
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Download and manage your market research reports
                </p>
              </div>
              <button
                onClick={() => navigate('/reports')}
                className="btn-secondary"
              >
                View All Reports
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.slice(0, 3).map((report, index) => (
                <div key={report.id} className="glass-card rounded-xl p-6 card-hover">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {report.location} • {report.business_type}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.format === 'pdf' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      report.format === 'html' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {report.format?.toUpperCase() || 'FILE'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Confidence</span>
                      <span className="font-medium">{(report.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          report.confidence_score > 0.7 ? 'bg-green-500' :
                          report.confidence_score > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${report.confidence_score * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span>{report.generated_at ? formatDate(report.generated_at) : 'Unknown'}</span>
                    <span>{formatBytes(report.size || 0)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const toastId = `download-${report.id}`
                        toast.loading('Preparing download...', { id: toastId })
                        marketDataService.downloadReport(report.id, report.format || 'pdf')
                          .then(response => {
                            const contentDisposition = response.headers['content-disposition']
                            let filename = `report-${report.id}.${report.format || 'pdf'}`
                            if (contentDisposition) {
                              const match = contentDisposition.match(/filename="?([^"]+)"?/)
                              if (match && match[1]) filename = match[1]
                            }
                            downloadBlob(response.data, filename)
                            toast.success('Download completed!', { id: toastId })
                          })
                          .catch(err => {
                            console.error('Download error:', err)
                            toast.error(err.message || 'Failed to download report', { id: toastId })
                          })
                      }}
                      className="flex-1 btn-secondary flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                    <button
                      onClick={() => navigate(`/reports/${report.id}`)}
                      className="flex-1 btn-primary flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default History