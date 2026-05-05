import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  FileText,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Star,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

import LoadingSpinner from '../components/LoadingSpinner'
import { marketDataService, downloadBlob } from '../services/marketData'
import { 
  formatDate, 
  formatBytes, 
  formatCurrency,
  formatMarketShare,
  formatConfidenceScore,
  formatBusinessType
} from '../utils/formatters'

const ReportDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isDownloading, setIsDownloading] = useState(false)
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: () => marketDataService.getReportById(id),
    enabled: !!id
  })

  // FIXED: Proper download handler
  const handleDownload = async () => {
    if (isDownloading) return
    
    setIsDownloading(true)
    const toastId = `download-${id}`
    
    try {
      toast.loading('Preparing download...', { id: toastId })
      
      // Call the download service
      const response = await marketDataService.downloadReport(id, report?.format || 'json')
      
      // Get filename from headers or create one
      const contentDisposition = response.headers['content-disposition']
      let filename = `report-${id}.${report?.format || 'json'}`
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }
      
      // Trigger download using the helper
      downloadBlob(response.data, filename)
      
      toast.success('Download completed!', { id: toastId })
    } catch (error) {
      console.error('Download error:', error)
      toast.error(error.message || 'Failed to download report', { id: toastId })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: report?.title,
          text: report?.content?.summary || 'Market research report',
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share report')
      }
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this report?')) return
    
    try {
      await marketDataService.deleteReport(id)
      toast.success('Report deleted successfully')
      navigate('/reports')
    } catch (error) {
      toast.error('Failed to delete report')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Report Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The report you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/reports')}
            className="btn-primary"
          >
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  const content = report.content || {}

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Reports
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`btn-primary flex items-center ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
            <button
              onClick={handleShare}
              className="btn-secondary flex items-center"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
            <button
              onClick={handleDelete}
              className="btn-secondary text-red-600 hover:text-red-700 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>

        {/* Report Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-8"
        >
          {/* Title and Meta */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {report.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {report.location || content.location || 'Unknown Location'}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(report.generated_at)}
              </div>
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                {report.format?.toUpperCase()}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {formatBytes(report.size || 0)}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Executive Summary
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {content.summary || 'No summary available'}
            </p>
          </div>

          {/* Key Findings */}
          {content.key_findings && content.key_findings.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Key Findings
              </h2>
              <ul className="space-y-3">
                {content.key_findings.map((finding, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Competitors */}
          {content.competitor_analysis?.competitor_analysis?.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Competitor Analysis
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Competitor</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Strength</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Weakness</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Sentiment</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Market Share</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.competitor_analysis.competitor_analysis.slice(0, 10).map((comp, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{comp.competitor_name}</td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{comp.strength_score}/10</td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{comp.weakness_score}/10</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            comp.customer_sentiment > 0.3 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            comp.customer_sentiment < -0.3 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {comp.customer_sentiment?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{formatMarketShare(comp.market_share_estimate)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 mr-1" />
                            <span className="text-gray-700 dark:text-gray-300">{comp.rating?.toFixed(1) || 'N/A'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Opportunities & Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {content.market_opportunities && content.market_opportunities.length > 0 && (
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 text-green-500 mr-2" />
                  Market Opportunities
                </h3>
                <ul className="space-y-2">
                  {content.market_opportunities.map((opp, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {content.potential_risks && content.potential_risks.length > 0 && (
              <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                  Potential Risks
                </h3>
                <ul className="space-y-2">
                  {content.potential_risks.map((risk, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {content.recommendations && content.recommendations.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recommendations
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                {content.recommendations.map((rec, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">
                    {rec}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">Analysis ID</div>
                <div className="font-mono text-gray-900 dark:text-white">{report.analysis_request_id || 'N/A'}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">Business Type</div>
                <div className="text-gray-900 dark:text-white">{formatBusinessType(report.business_type)}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">Confidence</div>
                <div className="text-gray-900 dark:text-white">{formatConfidenceScore(report.confidence_score)}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">Data Sources</div>
                <div className="text-gray-900 dark:text-white">{content.data_sources_used?.length || 0}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ReportDetail