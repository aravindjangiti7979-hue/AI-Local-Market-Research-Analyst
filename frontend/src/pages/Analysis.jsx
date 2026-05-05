import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  BarChart3, 
  TrendingUp, 
  Users, 
  MapPin, 
  Calendar,
  Clock,
  FileText,
  Download,
  Filter,
  ChevronRight,
  AlertCircle,
  Eye
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import AnalysisForm from '../components/AnalysisForm'
import { useMarketAnalysis, useAnalysisHistory } from '../hooks/useMarketAnalysis'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { marketDataService } from '../services/marketData'

const Analysis = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('new')
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null)
  const [selectedAnalysisData, setSelectedAnalysisData] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [prefilledData, setPrefilledData] = useState(null)
  const [deletingIds, setDeletingIds] = useState(new Set())
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Use ref to track if a request is in progress to prevent duplicate calls
  const loadingRef = useRef(false)
  
  const { 
    createAnalysis,
    getAnalysis,
    isRunningAnalysis 
  } = useMarketAnalysis()
  
  const { data: analyses = [], isLoading, error, refetch } = useAnalysisHistory()

  // Check for URL parameters (from templates)
  useEffect(() => {
    const location = searchParams.get('location');
    const businessType = searchParams.get('businessType');
    
    if (location || businessType) {
      setPrefilledData({
        location: location || '',
        businessType: businessType || ''
      });
      toast.success(`Template data loaded! Review and click Start Analysis.`);
      setActiveTab('new');
    }
  }, [searchParams]);

  // Poll for updates when analysis is running
  useEffect(() => {
    if (isRunningAnalysis) {
      const interval = setInterval(() => {
        refetch()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isRunningAnalysis, refetch])

  // Load analysis details when selectedAnalysisId changes
  useEffect(() => {
    const loadAnalysisDetails = async () => {
      if (!selectedAnalysisId) {
        setSelectedAnalysisData(null)
        return
      }
      
      // Prevent duplicate calls
      if (loadingRef.current) return
      
      setLoadingDetails(true)
      loadingRef.current = true
      
      try {
        const analysis = await getAnalysis(selectedAnalysisId)
        setSelectedAnalysisData(analysis)
      } catch (error) {
        toast.error('Failed to load analysis details')
        console.error('Error loading analysis details:', error)
        setSelectedAnalysisId(null)
      } finally {
        setLoadingDetails(false)
        loadingRef.current = false
      }
    }
    
    loadAnalysisDetails()
  }, [selectedAnalysisId, getAnalysis])

  // Handle new analysis creation
  const handleAnalysisComplete = async (analysisData) => {
    try {
      const result = await createAnalysis(analysisData)
      toast.success('Analysis started! Check the History tab for progress.')
      setActiveTab('history')
      refetch()
      window.history.replaceState({}, document.title, '/analysis');
      setPrefilledData(null);
      return result
    } catch (error) {
      toast.error(error.message || 'Failed to start analysis')
    }
  }

  // Handle view analysis details
  const handleViewAnalysis = (analysisId) => {
    // If clicking on the same analysis, close it
    if (selectedAnalysisId === analysisId) {
      setSelectedAnalysisId(null)
    } else {
      setSelectedAnalysisId(analysisId)
    }
  }

  // Handle view report (for completed analyses)
  const handleViewReport = (analysisId) => {
    navigate(`/reports?analysis=${analysisId}`)
  }

  // Handle delete analysis
  const handleDeleteAnalysis = async (analysisId, status) => {
    if (status === 'completed') {
      toast.error('Completed analyses cannot be deleted directly. Delete the associated report first.')
      return
    }
    
    if (!window.confirm('Are you sure you want to delete this analysis?')) {
      return
    }

    setDeletingIds(prev => new Set(prev).add(analysisId))
    const toastId = `delete-${analysisId}`

    try {
      toast.loading('Deleting analysis...', { id: toastId })
      await marketDataService.deleteAnalysis(analysisId)
      toast.success('Analysis deleted successfully', { id: toastId })
      refetch()
      // If the deleted analysis was selected, clear it
      if (selectedAnalysisId === analysisId) {
        setSelectedAnalysisId(null)
      }
    } catch (err) {
      console.error('Error deleting analysis:', err)
      toast.error(err.message || 'Failed to delete analysis', { id: toastId })
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(analysisId)
        return newSet
      })
    }
  }

  const filteredAnalyses = analyses.filter(analysis => {
    if (filterStatus !== 'all' && analysis.status !== filterStatus) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        analysis.location?.toLowerCase().includes(query) ||
        analysis.business_type?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const statusColors = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅'
      case 'processing': return '🔄'
      case 'pending': return '⏳'
      case 'failed': return '❌'
      case 'cancelled': return '🚫'
      default: return '📊'
    }
  }

  const quickStats = {
    totalAnalyses: analyses.length,
    completedAnalyses: analyses.filter(a => a.status === 'completed').length
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Failed to load analyses
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error.message || 'An error occurred'}
          </p>
          <button onClick={() => refetch()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Market Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered market research and competitor analysis
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {['new', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setSelectedAnalysisId(null)
              }}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'new' && 'New Analysis'}
              {tab === 'history' && `Analysis History (${analyses.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="fade-in">
        <AnimatePresence mode="wait">
          {activeTab === 'new' && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <AnalysisForm 
                onAnalysisComplete={handleAnalysisComplete} 
                initialData={prefilledData}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Filter and Search */}
              <div className="glass-card rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {['all', 'completed', 'processing', 'pending', 'failed'].map((status) => {
                      const count = analyses.filter(a => a.status === status).length
                      if (status !== 'all' && count === 0) return null
                      return (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            filterStatus === status
                              ? statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                          {status !== 'all' && (
                            <span className="ml-1">({count})</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search analyses..."
                        className="input-field pl-9 w-full md:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyses List */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-3 text-gray-600 dark:text-gray-400">Loading analyses...</p>
                  </div>
                ) : filteredAnalyses.length === 0 ? (
                  <div className="text-center py-12 glass-card rounded-xl">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No analyses found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {filterStatus === 'all' && !searchQuery
                        ? 'Start your first market analysis to see results here.'
                        : 'No analyses match your filters. Try adjusting your search.'
                      }
                    </p>
                    {(filterStatus !== 'all' || searchQuery) && (
                      <button
                        onClick={() => {
                          setFilterStatus('all')
                          setSearchQuery('')
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredAnalyses.map((analysis) => {
                    const isDeleting = deletingIds.has(analysis.id)
                    const isSelected = selectedAnalysisId === analysis.id
                    
                    return (
                      <motion.div
                        key={analysis.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div 
                          className="flex items-center justify-between"
                          onClick={() => handleViewAnalysis(analysis.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">
                              {getStatusIcon(analysis.status)}
                            </div>
                            <div>
                              <h4 className="font-semibold">{analysis.location || 'Unknown Location'}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {analysis.business_type || 'Unknown'}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {analysis.created_at 
                                    ? format(new Date(analysis.created_at), 'MMM dd, yyyy')
                                    : 'Unknown'
                                  }
                                </span>
                                {analysis.confidence_score && (
                                  <span className={`text-sm px-2 py-0.5 rounded-full ${
                                    analysis.confidence_score > 0.7 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    analysis.confidence_score > 0.4 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {Math.round(analysis.confidence_score * 100)}% confidence
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              statusColors[analysis.status] || 'bg-gray-100 text-gray-800'
                            }`}>
                              {analysis.status || 'unknown'}
                            </span>
                            <motion.div
                              animate={{ rotate: isSelected ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            </motion.div>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                          >
                            {loadingDetails ? (
                              <div className="flex justify-center py-4">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-4 mb-4">
                                  {analysis.status === 'completed' && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewReport(analysis.id)
                                      }}
                                      className="btn-primary text-sm py-1.5 px-3 flex items-center gap-2"
                                    >
                                      <FileText className="w-3 h-3" />
                                      View Report
                                    </button>
                                  )}
                                </div>
                                
                                {selectedAnalysisData?.summary && (
                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-medium mb-1">Summary:</p>
                                    <p className="text-gray-600 dark:text-gray-400">
                                      {selectedAnalysisData.summary}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    )
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Analysis