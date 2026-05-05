import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Users, 
  Building2, 
  FileText, 
  AlertCircle,
  ChevronRight,
  Download,
  Calendar,
  MapPin
} from 'lucide-react'
import { motion } from 'framer-motion'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMarketAnalysis } from '../hooks/useMarketAnalysis'
import { useReports } from '../hooks/useReports'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    completedAnalyses: 0,
    reportsGenerated: 0,
    avgConfidence: 0,
    recentAnalyses: [],
    topLocations: [],
    sentimentTrend: [],
    businessTypeDistribution: [],
  })

  const { getAnalysisHistory } = useMarketAnalysis()
  const { getUserReports } = useReports()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // In a real app, you would have a dedicated dashboard API endpoint
      // For now, we'll simulate with mock data
      const history = await getAnalysisHistory()
      const reports = await getUserReports()

      // Calculate statistics
      const totalAnalyses = history.length
      const completedAnalyses = history.filter(a => a.status === 'completed').length
      const reportsGenerated = reports.length
      const avgConfidence = history.length > 0 
        ? history.reduce((sum, a) => sum + (a.confidence_score || 0), 0) / history.length
        : 0

      // Get recent analyses
      const recentAnalyses = history
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

      // Calculate top locations
      const locationCounts = {}
      history.forEach(analysis => {
        locationCounts[analysis.location] = (locationCounts[analysis.location] || 0) + 1
      })
      const topLocations = Object.entries(locationCounts)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Generate sentiment trend (mock data for demo)
      const sentimentTrend = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: format(date, 'MMM dd'),
          sentiment: Math.random() * 2 - 1 // -1 to 1
        }
      })

      // Business type distribution
      const businessTypeCounts = {}
      history.forEach(analysis => {
        businessTypeCounts[analysis.business_type] = (businessTypeCounts[analysis.business_type] || 0) + 1
      })
      const businessTypeDistribution = Object.entries(businessTypeCounts)
        .map(([type, count]) => ({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value: count,
          color: getBusinessTypeColor(type)
        }))

      setStats({
        totalAnalyses,
        completedAnalyses,
        reportsGenerated,
        avgConfidence,
        recentAnalyses,
        topLocations,
        sentimentTrend,
        businessTypeDistribution,
      })

    } catch (error) {
      toast.error('Failed to load dashboard data')
    }
  }

  const getBusinessTypeColor = (type) => {
    const colors = {
      restaurant: '#10b981',
      retail: '#3b82f6',
      service: '#8b5cf6',
      tech: '#f59e0b',
      healthcare: '#ef4444',
      other: '#6b7280',
    }
    return colors[type] || '#6b7280'
  }

  const StatCard = ({ icon: Icon, title, value, change, color }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="glass-card rounded-xl p-6 card-hover"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('text-', 'text-')}`} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${change >= 0 ? '' : 'rotate-180'}`} />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold mb-1">{value}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{title}</p>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Overview of your market research activities and insights
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FileText}
          title="Total Analyses"
          value={stats.totalAnalyses}
          change={12}
          color="text-blue-600"
        />
        <StatCard
          icon={TrendingUp}
          title="Completed"
          value={stats.completedAnalyses}
          change={8}
          color="text-green-600"
        />
        <StatCard
          icon={Building2}
          title="Reports Generated"
          value={stats.reportsGenerated}
          change={15}
          color="text-purple-600"
        />
        <StatCard
          icon={Users}
          title="Avg. Confidence"
          value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
          change={5}
          color="text-orange-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Trend Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl p-6 card-hover"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Sentiment Trend</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Average sentiment score over last 7 days
              </p>
            </div>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.sentimentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[-1, 1]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sentiment" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Business Type Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl p-6 card-hover"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Analysis by Business Type</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Distribution of your market analyses
              </p>
            </div>
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.businessTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.businessTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [value, 'Analyses']}
                  contentStyle={{ 
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity & Top Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Analyses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6 card-hover"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Recent Analyses</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your latest market research activities
              </p>
            </div>
            <AlertCircle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {stats.recentAnalyses.map((analysis, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    analysis.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20' :
                    analysis.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/20' :
                    'bg-yellow-100 dark:bg-yellow-900/20'
                  }`}>
                    <FileText className={`w-4 h-4 ${
                      analysis.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                      analysis.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium">{analysis.location}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {analysis.business_type} • {format(new Date(analysis.created_at), 'MMM dd')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
            {stats.recentAnalyses.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No analyses yet. Start your first analysis!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Locations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6 card-hover"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Top Locations</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Most analyzed cities and regions
              </p>
            </div>
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {stats.topLocations.map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">{location.location}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {location.count} analysis{location.count !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(location.count / Math.max(...stats.topLocations.map(l => l.count))) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{location.count}</span>
                </div>
              </div>
            ))}
            {stats.topLocations.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No location data available</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard