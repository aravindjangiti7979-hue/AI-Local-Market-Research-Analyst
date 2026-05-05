import { useState, useCallback, useEffect } from 'react'
import { analysisApi, reportsApi, api } from '../services/api.js'
import toast from 'react-hot-toast'

// Custom hook for fetching analysis history with React Query pattern
export const useAnalysisHistory = (options = {}) => {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Use the correct endpoint - try root endpoint first
      const response = await analysisApi.getAll()
      // Handle both response formats
      const analyses = response.data.analyses || response.data || []
      setData(analyses)
      return response.data
    } catch (err) {
      // Try the history endpoint as fallback
      try {
        const response = await analysisApi.history()
        setData(response.data || [])
        return response.data
      } catch (fallbackErr) {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch analyses'
        setError(errorMessage)
        console.error('Error fetching analyses:', errorMessage)
        // Don't show toast for 404 - might be because no analyses exist yet
        if (err.response?.status !== 404) {
          toast.error(errorMessage)
        }
        throw err
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (options.enabled !== false) {
      refetch()
    }
  }, [refetch, options.enabled])

  return {
    data,
    isLoading,
    error,
    refetch,
    isRefetching: isLoading
  }
}

// Main market analysis hook
export const useMarketAnalysis = () => {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [analysisList, setAnalysisList] = useState([])

  // Create new market analysis
  const createAnalysis = useCallback(async (analysisData) => {
    setLoading(true)
    setError(null)
    
    try {
      // Transform data to match backend expectations
      const payload = {
        location: analysisData.location,
        business_type: analysisData.businessType || analysisData.business_type,
        analysis_type: analysisData.analysisType || analysisData.analysis_type || 'comprehensive',
        competitors: analysisData.competitors || [],
        timeframe_days: analysisData.timeframeDays || analysisData.timeframe_days || 30,
        include_sources: analysisData.includeSources || analysisData.include_sources || ['reviews', 'news', 'social'],
        custom_prompt: analysisData.customPrompt || analysisData.custom_prompt
      }
      
      const response = await analysisApi.create(payload)
      setAnalysis(response.data)
      toast.success('Analysis started successfully!')
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create analysis'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Get analysis by ID
  const getAnalysis = useCallback(async (analysisId) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await analysisApi.get(analysisId)
      setAnalysis(response.data)
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch analysis'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Get analysis status
  const getAnalysisStatus = useCallback(async (analysisId) => {
    try {
      const response = await analysisApi.status(analysisId)
      return response.data
    } catch (err) {
      console.error('Error fetching analysis status:', err)
      throw err
    }
  }, [])

  // List all analyses for current user
  const listAnalyses = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await analysisApi.getAll()
      const analyses = response.data.analyses || response.data || []
      setAnalysisList(analyses)
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch analyses'
      setError(errorMessage)
      // Don't show toast for 404 - might be because no analyses exist yet
      if (err.response?.status !== 404) {
        toast.error(errorMessage)
      }
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll for analysis completion
  const pollAnalysisStatus = useCallback(async (analysisId, interval = 2000, maxAttempts = 30) => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      
      const poll = async () => {
        attempts++
        
        try {
          const status = await getAnalysisStatus(analysisId)
          
          if (status.status === 'completed') {
            // Get the full analysis once completed
            const fullAnalysis = await getAnalysis(analysisId)
            resolve(fullAnalysis)
          } else if (status.status === 'failed') {
            reject(new Error(status.error_message || 'Analysis failed'))
          } else if (attempts >= maxAttempts) {
            reject(new Error('Analysis timeout'))
          } else {
            // Continue polling
            setTimeout(poll, interval)
          }
        } catch (err) {
          reject(err)
        }
      }
      
      poll()
    })
  }, [getAnalysisStatus, getAnalysis])

  // Generate report from analysis
  const generateReport = useCallback(async (analysisId, format = 'html') => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await reportsApi.generate({
        analysis_id: analysisId,
        format: format
      })
      toast.success('Report generated successfully!')
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate report'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Download report
  const downloadReport = useCallback(async (reportId, format = 'pdf') => {
    try {
      const response = await reportsApi.download(reportId)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report-${reportId}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Report downloaded successfully!')
      return true
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to download report'
      toast.error(errorMessage)
      throw err
    }
  }, [])

  // Clear current analysis
  const clearAnalysis = useCallback(() => {
    setAnalysis(null)
    setError(null)
  }, [])

  // Delete analysis
  const deleteAnalysis = useCallback(async (analysisId) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await analysisApi.cancel(analysisId)
      toast.success('Analysis deleted successfully!')
      
      // Refresh the list
      await listAnalyses()
      
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete analysis'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [listAnalyses])

  // Retry failed analysis
  const retryAnalysis = useCallback(async (analysisId) => {
    setLoading(true)
    setError(null)
    
    try {
      // Assuming there's a retry endpoint
      const response = await api.post(`/analysis/${analysisId}/retry`)
      toast.success('Analysis retry started!')
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to retry analysis'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    // State
    loading,
    analysis,
    error,
    analysisList,
    
    // Actions
    createAnalysis,
    getAnalysis,
    getAnalysisStatus,
    listAnalyses,
    pollAnalysisStatus,
    generateReport,
    downloadReport,
    deleteAnalysis,
    retryAnalysis,
    clearAnalysis,
    
    // Custom hooks
    useAnalysisHistory,
    
    // Status checkers
    isAnalyzing: loading || (analysis?.status === 'processing'),
    hasAnalysis: !!analysis,
    isRunningAnalysis: loading || (analysis?.status === 'processing' || analysis?.status === 'pending'),
  }
}

// Export as default
export default useMarketAnalysis