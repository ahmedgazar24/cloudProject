import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TasksPage from './pages/TasksPage'
import ProjectsPage from './pages/ProjectsPage'
import TeamsPage from './pages/TeamsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import { PageLoader } from './components/ui/Spinner'

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><PageLoader /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><PageLoader /></div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function ManagerRoute({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'MANAGER' && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return children
}

// /register: manager/admin only — everyone else gets redirected
function ManagerRegisterRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><PageLoader /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'MANAGER' || user.role === 'ADMIN') return children
  return <Navigate to="/dashboard" replace />
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm font-medium',
            style: { borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
            duration: 3500,
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          {/* Register: manager/admin only */}
          <Route path="/register" element={
            <ManagerRegisterRoute>
              <RegisterPage />
            </ManagerRegisterRoute>
          } />

          {/* Protected app shell */}
          <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardPage />} />
            <Route path="tasks"      element={<TasksPage />} />
            <Route path="projects"   element={<ProjectsPage />} />
            <Route path="teams"      element={<ManagerRoute><TeamsPage /></ManagerRoute>} />
            <Route path="analytics"  element={<ManagerRoute><AnalyticsPage /></ManagerRoute>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
