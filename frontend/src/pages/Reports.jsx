import React, { useState } from 'react'
import { 
  FileText, 
  Download, 
  Eye, 
  Share2, 
  Trash2, 
  Filter, 
  Search, 
  Calendar,
  FilePieChart,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

// Components
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { marketDataService , downloadBlob } from '../services/marketData'
import { 
  formatDate, 
  formatBytes, 
  getStatusColor,
  getFormatColor,
  formatConfidenceScore,
  formatBusinessType,
  formatLocation
} from '../utils/formatters'

const Reports = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [selectedReports, setSelectedReports] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pageSize = 12

  // Fetch reports with filters
  const { 
    data: reports = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['reports', user?.id],
    queryFn: async () => {
      try {
        const response = await marketDataService.getUserReports({ 
          limit: 100,
          sortBy: sortBy,
          sortOrder: sortOrder
        })
        return response || []
      } catch (err) {
        console.error('Error fetching reports:', err)
        toast.error('Failed to load reports')
        return []
      }
    },
    enabled: !!user
  })

  // Fetch report statistics
  const { 
    data: stats, 
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['reportStats', user?.id],
    queryFn: async () => {
      try {
        const response = await marketDataService.getReportStats()
        return response || {
          total_reports: 0,
          pdf_count: 0,
          html_count: 0,
          json_count: 0,
          total_size: 0,
          avg_size: 0,
          most_recent: null
        }
      } catch (err) {
        console.error('Error fetching report stats:', err)
        return {
          total_reports: 0,
          pdf_count: 0,
          html_count: 0,
          json_count: 0,
          total_size: 0,
          avg_size: 0,
          most_recent: null
        }
      }
    },
    enabled: !!user
  })

  // Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: async (reportId) => {
      await marketDataService.deleteReport(reportId)
    },
    onSuccess: () => {
      toast.success('Report deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['reportStats'] })
      setSelectedReports(new Set())
    },
    onError: (error) => {
      console.error('Error deleting report:', error)
      toast.error(error.response?.data?.detail || 'Failed to delete report')
    }
  })

  // Download report
  // In Reports.jsx, replace the handleDownload function with:
const handleDownload = async (report) => {
  try {
    toast.loading('Preparing download...', { id: `download-${report.id}` });
    
    const response = await marketDataService.downloadReport(report.id, report.format || 'json');
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `report-${report.id}.${report.format || 'json'}`;
    
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }
    
    downloadBlob(response.data, filename);
    
    toast.success('Download completed!', { id: `download-${report.id}` });
  } catch (error) {
    console.error('Download error:', error);
    toast.error(error.message || 'Failed to download report', { id: `download-${report.id}` });
  }
};

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      await refetchStats()
      toast.success('Reports refreshed!')
    } catch (error) {
      toast.error('Failed to refresh reports')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter and sort reports
  const filteredReports = React.useMemo(() => {
    let filtered = [...reports]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(report => 
        report.title?.toLowerCase().includes(searchLower) ||
        report.location?.toLowerCase().includes(searchLower) ||
        report.business_type?.toLowerCase().includes(searchLower)
      )
    }

    // Apply format filter
    if (selectedFormat !== 'all') {
      filtered = filtered.filter(report => report.format === selectedFormat)
    }

    // Apply date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start)
      filtered = filtered.filter(report => new Date(report.generated_at) >= startDate)
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(report => new Date(report.generated_at) <= endDate)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        case 'date':
          aValue = new Date(a.generated_at)
          bValue = new Date(b.generated_at)
          break
        case 'confidence':
          aValue = a.confidence_score || 0
          bValue = b.confidence_score || 0
          break
        case 'size':
          aValue = a.size || 0
          bValue = b.size || 0
          break
        default:
          return 0
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      }
    })

    return filtered
  }, [reports, searchTerm, selectedFormat, dateRange, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / pageSize)
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Handle select all
  const handleSelectAll = () => {
    if (selectedReports.size === paginatedReports.length) {
      setSelectedReports(new Set())
    } else {
      setSelectedReports(new Set(paginatedReports.map(r => r.id)))
    }
  }

  // Handle report selection
  const handleSelectReport = (reportId) => {
    const newSelected = new Set(selectedReports)
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId)
    } else {
      newSelected.add(reportId)
    }
    setSelectedReports(newSelected)
  }

  // Handle download selected
  const handleDownloadSelected = async () => {
    if (selectedReports.size === 0) {
      toast.error('Please select reports to download')
      return
    }

    toast.loading(`Downloading ${selectedReports.size} reports...`)
    
    for (const reportId of selectedReports) {
      const report = reports.find(r => r.id === reportId)
      if (report) {
        try {
          await marketDataService.downloadReport(report.id, report.format)
        } catch (err) {
          console.error(`Failed to download report ${reportId}:`, err)
        }
      }
    }
    
    toast.dismiss()
    toast.success('Downloads started!')
  }

  // Handle delete selected
  const handleDeleteSelected = async () => {
    if (selectedReports.size === 0) {
      toast.error('Please select reports to delete')
      return
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedReports.size} report(s)?`)) {
      return
    }

    toast.loading(`Deleting ${selectedReports.size} reports...`)
    
    for (const reportId of selectedReports) {
      try {
        await deleteMutation.mutateAsync(reportId)
      } catch (err) {
        console.error(`Failed to delete report ${reportId}:`, err)
      }
    }
    
    toast.dismiss()
    setSelectedReports(new Set())
  }

  // Handle share report
  const handleShareReport = async (report) => {
    try {
      const shareUrl = `${window.location.origin}/reports/${report.id}`
      
      if (navigator.share) {
        await navigator.share({
          title: report.title,
          text: `Check out this market research report: ${report.title}`,
          url: shareUrl
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied to clipboard')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share report')
      }
    }
  }

  // FIXED: Handle preview report - ALWAYS navigate to frontend route
  const handlePreviewReport = (report) => {
    // Always navigate to the frontend route, never use preview_url
    navigate(`/reports/${report.id}`)
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
          className="mb-8 flex justify-between items-center"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Market Research Reports
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Access, download, and manage your generated market research reports
            </p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {stats.pdf_count || 0} PDF
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.total_reports || 0}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Total Reports</p>
            </div>

            <div className="glass-card rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FilePieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {stats.html_count || 0} HTML
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatBytes(stats.avg_size || 0)}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Avg Report Size</p>
            </div>

            <div className="glass-card rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {stats.json_count || 0} JSON
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.most_recent ? format(new Date(stats.most_recent), 'MMM dd') : 'N/A'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Last Generated</p>
            </div>

            <div className="glass-card rounded-xl p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  {selectedReports.size} selected
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {filteredReports.length}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Filtered Reports</p>
            </div>
          </motion.div>
        )}

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedReports.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-xl p-4 mb-6 flex items-center justify-between"
            >
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedReports.size} report(s) selected
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDownloadSelected}
                  className="btn-primary flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Selected
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="btn-secondary flex items-center text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedReports(new Set())}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  placeholder="Search reports by title, location, or business type..."
                  className="input-field pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                className="input-field w-full lg:w-auto"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
                <option value="json">JSON</option>
              </select>

              <select
                className="input-field w-full lg:w-auto"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="confidence">Sort by Confidence</option>
                <option value="size">Sort by Size</option>
              </select>

              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="btn-secondary"
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>

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
                  setSelectedFormat('all')
                  setSortBy('date')
                  setSortOrder('desc')
                  setDateRange({ start: '', end: '' })
                  setCurrentPage(1)
                }}
                className="btn-secondary whitespace-nowrap"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </motion.div>

        {/* Reports Grid */}
        <AnimatePresence mode="wait">
          {paginatedReports.length > 0 ? (
            <motion.div
              key="reports-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {paginatedReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card rounded-xl overflow-hidden card-hover ${
                    selectedReports.has(report.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Report Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={selectedReports.has(report.id)}
                            onChange={() => handleSelectReport(report.id)}
                            className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                            {report.title}
                          </h3>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <span className="mr-2">📍</span>
                          {formatLocation(report.location) || 'Unknown Location'}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFormatColor(report.format)}`}>
                        {report.format.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {report.content_summary || 'Market research analysis report'}
                    </p>
                  </div>

                  {/* Report Details */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          Generated
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatDate(report.generated_at, 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <FileText className="w-4 h-4 mr-1" />
                          Size
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatBytes(report.size || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Business Type & Key Findings */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Business Type
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatBusinessType(report.business_type)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Key Findings
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {report.key_findings_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* Confidence Score */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Confidence Score
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatConfidenceScore(report.confidence_score)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                          style={{ width: `${(report.confidence_score || 0) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePreviewReport(report)}
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="View Report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(report)}
                          className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                          title="Download Report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShareReport(report)}
                          className="p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          title="Share Report"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this report?')) {
                            deleteMutation.mutate(report.id)
                          }
                        }}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete Report"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-xl p-12 text-center"
            >
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Reports Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {searchTerm || selectedFormat !== 'all' || dateRange.start || dateRange.end
                  ? 'Try adjusting your filters to see more reports'
                  : 'Generate your first market research report by running an analysis'}
              </p>
              <button
                onClick={() => navigate('/analysis/new')}
                className="btn-primary flex items-center mx-auto"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start New Analysis
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {filteredReports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex items-center justify-between"
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredReports.length)} of {filteredReports.length} reports
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Reports