import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Target,
  ChevronRight,
  Loader,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMarketAnalysis } from '../hooks/useMarketAnalysis';
import { marketDataService } from '../services/marketData';

const AnalysisForm = ({ onAnalysisComplete, initialData = null }) => {
  const navigate = useNavigate();
  const { createAnalysis, isRunningAnalysis } = useMarketAnalysis();
  
  const [formData, setFormData] = useState({
    location: initialData?.location || '',
    businessType: initialData?.businessType || 'restaurant',
    analysisType: 'comprehensive',
    competitors: initialData?.competitor ? [initialData.competitor] : [],
    competitorInput: '',
    timeframeDays: 30,
    includeSources: ['reviews', 'news', 'social'],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatedReportId, setGeneratedReportId] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [reportFormat, setReportFormat] = useState('html');
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [completedAnalyses, setCompletedAnalyses] = useState([]);
  const [showAnalysisSelector, setShowAnalysisSelector] = useState(false);

  const businessTypes = [
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { value: 'cafe', label: 'Cafe', icon: '☕' },
    { value: 'retail', label: 'Retail', icon: '🛍️' },
    { value: 'service', label: 'Service', icon: '🔧' },
    { value: 'tech', label: 'Technology', icon: '💻' },
    { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { value: 'other', label: 'Other', icon: '📊' },
  ];

  const analysisTypes = [
    { value: 'comprehensive', label: 'Comprehensive Analysis', description: 'Full market analysis including competitors, sentiment, and trends' },
    { value: 'competitor', label: 'Competitor Analysis', description: 'Focus on identifying and analyzing competitors' },
    { value: 'sentiment', label: 'Sentiment Analysis', description: 'Customer sentiment and review analysis' },
    { value: 'trend', label: 'Trend Analysis', description: 'Market trends and patterns' },
  ];

  const sourceOptions = [
    { value: 'reviews', label: 'Customer Reviews' },
    { value: 'news', label: 'News Articles' },
    { value: 'social', label: 'Social Media' },
    { value: 'business', label: 'Business Listings' },
  ];

  const reportFormats = [
    { value: 'html', label: 'HTML Report', description: 'Interactive web view with charts', icon: '🌐' },
    { value: 'pdf', label: 'PDF Document', description: 'Printable professional document', icon: '📄' },
    { value: 'json', label: 'JSON Data', description: 'Raw data for developers', icon: '📊' },
    { value: 'csv', label: 'CSV Spreadsheet', description: 'Import into Excel/Sheets', icon: '📈' },
  ];

  // Load completed analyses from history
  useEffect(() => {
    const loadCompletedAnalyses = async () => {
      try {
        const history = await marketDataService.getAnalysisHistory({ limit: 20 });
        const completed = history.filter(a => a.status === 'completed');
        setCompletedAnalyses(completed);
      } catch (error) {
        console.error('Error loading completed analyses:', error);
      }
    };
    
    loadCompletedAnalyses();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        location: initialData.location || prev.location,
        businessType: initialData.businessType || prev.businessType,
        competitors: initialData.competitor ? [initialData.competitor] : prev.competitors,
      }));
    }
  }, [initialData]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    } else if (formData.location.length < 3) {
      errors.location = 'Location must be at least 3 characters';
    }
    
    if (!formData.businessType) {
      errors.businessType = 'Business type is required';
    }
    
    if (formData.competitors.length > 10) {
      errors.competitors = 'Maximum 10 competitors allowed';
    }
    
    if (formData.timeframeDays < 1 || formData.timeframeDays > 365) {
      errors.timeframeDays = 'Timeframe must be between 1 and 365 days';
    }
    
    if (formData.includeSources.length === 0) {
      errors.includeSources = 'Select at least one data source';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleAddCompetitor = () => {
    if (formData.competitorInput.trim()) {
      setFormData(prev => ({
        ...prev,
        competitors: [...prev.competitors, prev.competitorInput.trim()],
        competitorInput: '',
      }));
    }
  };

  const handleRemoveCompetitor = (index) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCompetitor();
    }
  };

  const handleSourceToggle = (source) => {
    setFormData(prev => ({
      ...prev,
      includeSources: prev.includeSources.includes(source)
        ? prev.includeSources.filter(s => s !== source)
        : [...prev.includeSources, source],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await createAnalysis(formData);
      
      setSelectedAnalysisId(result.request_id);
      setAnalysisStatus('pending');
      
      toast.success('Analysis started successfully!', {
        duration: 5000,
        icon: '🚀',
      });
      
      // Start polling for status
      const interval = setInterval(async () => {
        try {
          const status = await marketDataService.getAnalysisStatus(result.request_id);
          setAnalysisStatus(status.status);
          
          if (status.status === 'completed') {
            clearInterval(interval);
            toast.success('Analysis completed! You can now generate a report.', {
              icon: '✅',
            });
            // Add to completed analyses list
            setCompletedAnalyses(prev => [...prev, {
              id: result.request_id,
              location: formData.location,
              business_type: formData.businessType,
              created_at: new Date().toISOString()
            }]);
          } else if (status.status === 'failed') {
            clearInterval(interval);
            toast.error('Analysis failed: ' + (status.error_message || 'Unknown error'));
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 5000);
      
      setPollingInterval(interval);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
      
    } catch (error) {
      toast.error(error.message || 'Failed to start analysis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    // Check if we have a selected analysis ID
    if (!selectedAnalysisId) {
      // If no current analysis, check if there are any completed analyses
      if (completedAnalyses.length === 0) {
        toast.error('Please start an analysis first or select a completed analysis');
        setShowAnalysisSelector(true);
        return;
      }
      
      // Use the most recent completed analysis
      const mostRecent = completedAnalyses[0];
      setSelectedAnalysisId(mostRecent.id);
    }
    
    setIsGeneratingReport(true);
    
    try {
      const analysisId = selectedAnalysisId;
      
      const result = await marketDataService.generateReport(analysisId, {
        format: reportFormat,
        include_charts: true,
        executive_summary: true,
        detailed_analysis: true,
        recommendations: true,
      });
      
      setGeneratedReportId(result.report_id);
      
      toast.success(`${reportFormat.toUpperCase()} report generated successfully!`, {
        duration: 3000,
        icon: '📄',
      });
      
      // Navigate to reports page after a short delay
      setTimeout(() => {
        navigate('/reports');
      }, 2000);
      
    } catch (error) {
      toast.error(error.message || 'Failed to generate report');
      console.error('Report generation error:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleViewReports = () => {
    navigate('/reports');
  };

  const selectAnalysisForReport = (analysisId) => {
    setSelectedAnalysisId(analysisId);
    setShowAnalysisSelector(false);
    toast.success(`Selected analysis: ${analysisId.slice(0, 8)}...`);
  };

  return (
    <div className="space-y-6">
      {/* ALWAYS VISIBLE AND ALWAYS ACTIVE REPORT GENERATION PANEL */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Generate Market Report</h3>
              <p className="text-white/80 text-sm max-w-md">
                Create a comprehensive market research report from your analysis data.
                {selectedAnalysisId ? ` Current analysis: ${selectedAnalysisId.slice(0, 8)}...` : ' No analysis selected. Start one below or select from completed analyses.'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Format Selector */}
            <select
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value)}
              className="px-4 py-2.5 rounded-lg bg-white/20 backdrop-blur-sm text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {reportFormats.map((format) => (
                <option key={format.value} value={format.value} className="text-gray-900">
                  {format.icon} {format.label}
                </option>
              ))}
            </select>
            
            {/* Analysis Selector Button */}
            {completedAnalyses.length > 0 && (
              <button
                onClick={() => setShowAnalysisSelector(!showAnalysisSelector)}
                className="px-3 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white border border-white/30 hover:bg-white/20 transition-all"
                title="Select from completed analyses"
              >
                📋 Select
              </button>
            )}
            
            {/* Generate Button - ALWAYS ACTIVE */}
            <button
              onClick={handleGenerateReport}
              className="px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all bg-white text-purple-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isGeneratingReport ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate {reportFormat.toUpperCase()} Report
                </>
              )}
            </button>
            
            {/* View Reports Button */}
            <button
              onClick={handleViewReports}
              className="px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white border border-white/30 hover:bg-white/20 transition-all"
            >
              View All Reports
            </button>
          </div>
        </div>
        
        {/* Analysis Selector Dropdown */}
        {showAnalysisSelector && completedAnalyses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/30"
          >
            <p className="text-sm text-white/80 mb-2">Select a completed analysis:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {completedAnalyses.map((analysis) => (
                <button
                  key={analysis.id}
                  onClick={() => selectAnalysisForReport(analysis.id)}
                  className={`text-left p-3 rounded-lg transition-all ${
                    selectedAnalysisId === analysis.id
                      ? 'bg-white/30 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <div className="text-xs font-mono mb-1">{analysis.id.slice(0, 12)}...</div>
                  <div className="text-sm font-medium">{analysis.location}</div>
                  <div className="text-xs opacity-70">{analysis.business_type}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Format descriptions */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {reportFormats.map((format) => (
            <div
              key={format.value}
              className={`text-xs p-2 rounded-lg transition-all ${
                reportFormat === format.value
                  ? 'bg-white/20 text-white'
                  : 'text-white/60'
              }`}
            >
              <span className="mr-1">{format.icon}</span>
              {format.description}
            </div>
          ))}
        </div>
        
        {/* Analysis Status */}
        {analysisStatus && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-white/80">Analysis Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              analysisStatus === 'completed' ? 'bg-green-500/20 text-green-200' :
              analysisStatus === 'processing' ? 'bg-yellow-500/20 text-yellow-200' :
              analysisStatus === 'failed' ? 'bg-red-500/20 text-red-200' :
              'bg-blue-500/20 text-blue-200'
            }`}>
              {analysisStatus || 'pending'}
            </span>
          </div>
        )}
        
        {/* Success Message */}
        {generatedReportId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5 text-green-300" />
            <span className="text-sm text-white">
              Report generated successfully! Redirecting to reports page...
            </span>
          </motion.div>
        )}
        
        {/* Info message */}
        {!selectedAnalysisId && completedAnalyses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-blue-300" />
            <span className="text-xs text-white/90">
              💡 Start an analysis below to generate reports with your data.
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Analysis Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 md:p-8"
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-500" />
          New Market Analysis
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Chicago, IL"
                className={`input-field pl-10 ${validationErrors.location ? 'border-red-500' : ''}`}
                disabled={isSubmitting}
              />
            </div>
            {validationErrors.location && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.location}</p>
            )}
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Business Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {businessTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, businessType: type.value }))}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.businessType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  disabled={isSubmitting}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm font-medium">{type.label}</div>
                </button>
              ))}
            </div>
            {validationErrors.businessType && (
              <p className="mt-1 text-sm text-red-500">{validationErrors.businessType}</p>
            )}
          </div>

          {/* Analysis Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Analysis Type</label>
            <div className="space-y-3">
              {analysisTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.analysisType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="analysisType"
                    value={type.value}
                    checked={formData.analysisType === type.value}
                    onChange={handleInputChange}
                    className="mt-1 mr-3"
                    disabled={isSubmitting}
                  />
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {type.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Competitors */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Competitors (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={formData.competitorInput}
                onChange={(e) => setFormData(prev => ({ ...prev, competitorInput: e.target.value }))}
                onKeyPress={handleKeyPress}
                placeholder="Enter competitor name"
                className="input-field flex-1"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={handleAddCompetitor}
                className="btn-secondary px-4"
                disabled={isSubmitting || !formData.competitorInput.trim()}
              >
                Add
              </button>
            </div>
            
            {formData.competitors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.competitors.map((competitor, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm"
                  >
                    {competitor}
                    <button
                      type="button"
                      onClick={() => handleRemoveCompetitor(index)}
                      className="ml-1 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
            >
              {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
            </button>
            
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-4 space-y-4"
              >
                {/* Timeframe */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Analysis Timeframe (days)
                  </label>
                  <input
                    type="number"
                    name="timeframeDays"
                    value={formData.timeframeDays}
                    onChange={handleInputChange}
                    min="1"
                    max="365"
                    className="input-field w-32"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Data Sources */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Data Sources
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {sourceOptions.map((source) => (
                      <label
                        key={source.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.includeSources.includes(source.value)}
                          onChange={() => handleSourceToggle(source.value)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm">{source.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  Start Analysis
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
            
            {selectedAnalysisId && (
              <p className="mt-3 text-sm text-center text-green-600 dark:text-green-400">
                ✓ Analysis ID: {selectedAnalysisId.slice(0, 8)}...
              </p>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AnalysisForm;