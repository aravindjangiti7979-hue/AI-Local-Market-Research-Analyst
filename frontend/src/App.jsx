import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Analysis from './pages/Analysis'
import Reports from './pages/Reports'
import History from './pages/History'
import Settings from './pages/Settings'
import Competitors from './pages/Competitors' // NEW - Create this page
import Activity from './pages/Activity'       // NEW - Create this page
import Alerts from './pages/Alerts'           // NEW - Create this page
import Login from './pages/Login'
import Register from './pages/Register'
import { Toaster } from 'react-hot-toast'
import ReportDetail from './pages/ReportDetail'
// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Add future flags to BrowserRouter */}
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ThemeProvider>
          <AuthProvider>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#fff',
                },
              }}
            />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="settings/alerts" element={<Alerts />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="analysis" element={<Analysis />} />
                <Route path="analysis/new" element={<Analysis />} />
                <Route path="reports" element={<Reports />} />
                <Route path="history" element={<History />} />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/alerts/:id/edit" element={<Alerts />} /> {/* Add this */}
                <Route path="settings/usage" element={<Settings />} /> {/* ADDED */}
                <Route path="competitors" element={<Competitors />} /> {/* ADDED */}
                <Route path="activity" element={<Activity />} /> {/* ADDED */}
                <Route path="reports/:id" element={<ReportDetail />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App