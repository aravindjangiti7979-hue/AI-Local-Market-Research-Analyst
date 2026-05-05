import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Share2,
  Calendar,
  MapPin,
  TrendingUp,
  BarChart3,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  Users,
  DollarSign,
  Globe,
  Building,
  Star,
  Award,
  AlertCircle,
  ChevronRight,
  HardDrive,
  FileJson,
  File as FilePdf,
  Code,
  Table,
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import toast from 'react-hot-toast';
import marketDataService, { downloadBlob } from '../services/marketData';

const ReportCard = ({ report, onView, onDownload, onShare, onDelete }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Helper functions
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-l-4 border-green-500';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-l-4 border-yellow-500';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-l-4 border-red-500';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-l-4 border-gray-500';
    }
  };

  const getFormatIcon = (format) => {
    const formatLower = format?.toLowerCase() || '';
    switch (formatLower) {
      case 'pdf':
        return <FilePdf className="w-4 h-4 text-red-500" />;
      case 'html':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-green-500" />;
      case 'csv':
        return <Table className="w-4 h-4 text-purple-500" />;
      case 'markdown':
        return <Code className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getFormatBadge = (format) => {
    const formatLower = format?.toLowerCase() || '';
    const formatColors = {
      pdf: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800',
      html: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      json: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800',
      csv: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
      markdown: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${formatColors[formatLower] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
        {getFormatIcon(format)}
        {format?.toUpperCase() || 'FILE'}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy • h:mm a');
    } catch {
      return dateString;
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getConfidenceColor = (score) => {
    if (!score) return 'bg-gray-200 dark:bg-gray-700';
    if (score >= 0.8) return 'bg-gradient-to-r from-green-400 to-green-500';
    if (score >= 0.6) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    if (score >= 0.4) return 'bg-gradient-to-r from-orange-400 to-orange-500';
    return 'bg-gradient-to-r from-red-400 to-red-500';
  };

  const getMetricIcon = (metricName) => {
    switch (metricName) {
      case 'competitors_count':
      case 'competitors':
        return <Users className="w-3 h-3 text-blue-500" />;
      case 'key_findings_count':
        return <Award className="w-3 h-3 text-purple-500" />;
      case 'confidence_score':
        return <Star className="w-3 h-3 text-yellow-500" />;
      case 'data_points':
        return <HardDrive className="w-3 h-3 text-green-500" />;
      default:
        return <BarChart3 className="w-3 h-3 text-gray-500" />;
    }
  };

  // Extract data from report with fallbacks
  const reportData = {
    id: report?.id || 'unknown',
    title: report?.title || 'Untitled Report',
    format: report?.format || 'json',
    status: report?.status || 'completed',
    location: report?.location || report?.content?.location || 'Unknown Location',
    businessType: report?.business_type || report?.content?.business_type || 'General',
    generatedAt: report?.generated_at || report?.created_at || null,
    confidence: report?.confidence_score || report?.content?.confidence_score || 0,
    summary: report?.content_summary || report?.summary || report?.content?.summary || 'No summary available',
    dataPoints: report?.data_points || report?.content?.data_points_analyzed || report?.size || 0,
    competitorsCount: report?.competitors_count || report?.content?.competitors_count || 
                     (report?.content?.competitor_analysis?.competitor_analysis?.length) || 0,
    keyFindingsCount: report?.key_findings_count || (report?.content?.key_findings?.length) || 0,
    insightsCount: report?.insights || (report?.content?.insights?.length) || 0,
    recommendationsCount: report?.recommendations || (report?.content?.recommendations?.length) || 0,
    fileSize: report?.size || report?.file_size || 0,
    downloadUrl: report?.download_url || '',
    isNew: report?.isNew || false,
    tags: report?.tags || [report?.format?.toUpperCase(), report?.businessType].filter(Boolean),
    metrics: report?.metrics || report?.content?.metrics || {},
  };

  // Handle view
  const handleView = () => {
    if (onView) {
      onView(report);
    } else {
      navigate(`/reports/${report.id}`);
    }
  };

  // Handle download - SINGLE unified function
  const handleDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    const toastId = `download-${report.id}`;
    
    try {
      toast.loading('Preparing download...', { id: toastId });
      
      let response;
      
      // Use either the passed onDownload prop or the service directly
      if (onDownload) {
        // If onDownload is provided (from parent), use it
        await onDownload(report);
        toast.dismiss();
        toast.success('Download started!', { id: toastId });
      } else {
        // Otherwise use the service directly
        response = await marketDataService.downloadReport(report.id, report.format || 'json');
        
        // Get filename from headers or create one
        const contentDisposition = response.headers['content-disposition'];
        let filename = `report-${report.id}.${report.format || 'json'}`;
        
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }
        
        // Trigger download using the helper
        downloadBlob(response.data, filename);
        
        toast.success('Download completed!', { id: toastId });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download report', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (onShare) {
      await onShare(report);
    } else {
      try {
        if (navigator.share) {
          await navigator.share({
            title: reportData.title,
            text: reportData.summary,
            url: window.location.origin + '/reports/' + report.id,
          });
        } else {
          await navigator.clipboard.writeText(window.location.origin + '/reports/' + report.id);
          toast.success('Link copied to clipboard');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Failed to share report');
        }
      }
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      if (onDelete) {
        onDelete(report);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {/* Status Bar */}
      <div className={`h-1 w-full ${getConfidenceColor(reportData.confidence)}`} />

      {/* Main Content */}
      <div className="p-6">
        {/* Header with Icon and Menu */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${
              reportData.format === 'pdf' ? 'from-red-500 to-orange-500' :
              reportData.format === 'html' ? 'from-blue-500 to-cyan-500' :
              reportData.format === 'json' ? 'from-green-500 to-emerald-500' :
              reportData.format === 'csv' ? 'from-purple-500 to-pink-500' :
              'from-gray-500 to-gray-600'
            } shadow-lg`}>
              {reportData.format === 'pdf' ? <FilePdf className="w-5 h-5 text-white" /> :
               reportData.format === 'html' ? <Globe className="w-5 h-5 text-white" /> :
               reportData.format === 'json' ? <FileJson className="w-5 h-5 text-white" /> :
               reportData.format === 'csv' ? <Table className="w-5 h-5 text-white" /> :
               <FileText className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                {reportData.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="line-clamp-1">{reportData.location}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Building className="w-3 h-3 mr-1" />
                  <span>{reportData.businessType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
              >
                <button
                  onClick={() => {
                    handleView();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Eye className="w-4 h-4 mr-3" />
                  View Report
                </button>
                <button
                  onClick={() => {
                    handleDownload();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  disabled={isDownloading}
                >
                  <Download className="w-4 h-4 mr-3" />
                  {isDownloading ? 'Downloading...' : 'Download'}
                </button>
                <button
                  onClick={() => {
                    handleShare();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Share2 className="w-4 h-4 mr-3" />
                  Share
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    handleDelete();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <XCircle className="w-4 h-4 mr-3" />
                  Delete
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Status Badges Row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(reportData.status)}`}>
            {getStatusIcon(reportData.status)}
            <span className="capitalize">{reportData.status}</span>
          </div>
          
          {getFormatBadge(reportData.format)}
          
          {reportData.confidence > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800">
              <Star className="w-3 h-3" />
              <span>{(reportData.confidence * 100).toFixed(0)}% confidence</span>
            </div>
          )}
          
          {reportData.isNew && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800">
              <Sparkles className="w-3 h-3" />
              <span>New</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {reportData.summary}
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-gray-900 dark:text-white">
              <HardDrive className="w-3 h-3 text-blue-500" />
              <span>{reportData.dataPoints > 0 ? reportData.dataPoints.toLocaleString() : 'N/A'}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Data Points</div>
          </div>
          
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-gray-900 dark:text-white">
              <Users className="w-3 h-3 text-purple-500" />
              <span>{reportData.competitorsCount}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Competitors</div>
          </div>
          
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-gray-900 dark:text-white">
              <Award className="w-3 h-3 text-green-500" />
              <span>{reportData.keyFindingsCount}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Findings</div>
          </div>
          
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-gray-900 dark:text-white">
              <TrendingUp className="w-3 h-3 text-orange-500" />
              <span>{reportData.recommendationsCount}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Actions</div>
          </div>
        </div>

        {/* Expandable Details */}
        <motion.div
          initial={false}
          animate={{ height: isExpanded ? 'auto' : 0 }}
          className="overflow-hidden"
        >
          <div className="pt-4 pb-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Key Findings</h4>
            <div className="space-y-2">
              {(report?.content?.key_findings || []).slice(0, 3).map((finding, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">{finding}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span title={formatDate(reportData.generatedAt)}>
                {getTimeAgo(reportData.generatedAt) || 'Just now'}
              </span>
            </div>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>{formatFileSize(reportData.fileSize)}</span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            {isExpanded ? 'Show less' : 'Show details'}
            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Buttons - Always visible on hover */}
      <motion.div
        initial={false}
        animate={{ y: isHovered ? 0 : 10, opacity: isHovered ? 1 : 0 }}
        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-900 dark:via-gray-900/95 dark:to-transparent backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleView}
            className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View Report
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`btn-secondary text-sm py-2 px-4 flex items-center justify-center gap-2 ${
              isDownloading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Download className="w-4 h-4" />
            {isDownloading ? '...' : ''}
          </button>
          <button
            onClick={handleShare}
            className="btn-secondary text-sm py-2 px-4 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* New Badge Animation */}
      {reportData.isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 w-3 h-3"
        >
          <span className="absolute inset-0 animate-ping bg-red-400 rounded-full opacity-75" />
          <span className="absolute inset-0 bg-red-500 rounded-full" />
        </motion.div>
      )}
    </motion.div>
  );
};

// Reports Grid Component
export const ReportsGrid = ({ reports = [], isLoading = false, emptyMessage = 'No reports found', onRefresh }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
          <FileText className="w-12 h-12 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {emptyMessage}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
          Run your first market analysis to generate detailed reports with AI-powered insights.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-primary inline-flex items-center gap-2"
          >
            <span>Refresh</span>
          </button>
        )}
        <button
          onClick={() => navigate('/analysis/new')}
          className="btn-primary inline-flex items-center gap-2 ml-2"
        >
          <Sparkles className="w-4 h-4" />
          Start Analysis
        </button>
      </div>
    );
  }

  // Single download handler for all reports
  const handleDownload = async (report) => {
    try {
      toast.loading('Preparing download...', { id: `download-${report.id}` });
      
      const response = await marketDataService.downloadReport(report.id, report.format || 'json');
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `report-${report.id}.${report.format || 'json'}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      
      downloadBlob(response.data, filename);
      
      toast.success('Download completed!', { id: `download-${report.id}` });
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download report', { id: `download-${report.id}` });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report, index) => (
        <ReportCard
          key={report.id || index}
          report={report}
          onView={(r) => navigate(`/reports/${r.id}`)}
          onDownload={handleDownload}  // Pass the unified download handler
          onShare={(r) => {
            if (navigator.share) {
              navigator.share({
                title: r.title,
                text: r.summary || 'Market research report',
                url: window.location.origin + '/reports/' + r.id,
              });
            } else {
              navigator.clipboard.writeText(window.location.origin + '/reports/' + r.id);
              toast.success('Link copied to clipboard');
            }
          }}
          onDelete={(r) => {
            console.log('Delete report:', r.id);
            toast.success('Report deleted successfully');
          }}
        />
      ))}
    </div>
  );
};

export default ReportCard;