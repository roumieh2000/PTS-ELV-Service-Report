import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { Layout } from '@/components/layout'
import { ProtectedRoute } from '@/components/protected-route'
import { Login } from '@/pages/login'
import { Dashboard } from '@/pages/dashboard'
import { ReportForm } from '@/pages/report-form'
import { ReportDetail } from '@/pages/report-detail'
import { DataConsole } from '@/pages/data-console'
import { UserManager } from '@/pages/user-manager'
import { Visits } from '@/pages/visits'
import { Projects } from '@/pages/projects'
import { useReportStore } from '@/stores/reportStore'
import { useAuthStore } from '@/stores/authStore'
import { useVisitStore } from '@/stores/visitStore'
import { useProjectStore } from '@/stores/projectStore'

function AppInit() {
  const loadReports = useReportStore((s) => s.loadReports)
  const loadUsers = useAuthStore((s) => s.loadUsers)
  const loadVisits = useVisitStore((s) => s.loadVisits)
  const loadProjects = useProjectStore((s) => s.loadProjects)

  useEffect(() => {
    loadReports()
    loadUsers()
    loadVisits()
    loadProjects()
  }, [loadReports, loadUsers, loadVisits, loadProjects])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<ProtectedRoute permission="reports:read"><Dashboard /></ProtectedRoute>} />
            <Route path="reports/new" element={<ProtectedRoute permission="reports:create"><ReportForm /></ProtectedRoute>} />
            <Route path="reports/:id" element={<ProtectedRoute permission="reports:read"><ReportDetail /></ProtectedRoute>} />
            <Route path="reports/:id/edit" element={<ProtectedRoute permission="reports:edit"><ReportForm /></ProtectedRoute>} />
            <Route path="console" element={<ProtectedRoute permission="console:access"><DataConsole /></ProtectedRoute>} />
            <Route path="visits" element={<ProtectedRoute permission="visits:access"><Visits /></ProtectedRoute>} />
            <Route path="projects" element={<ProtectedRoute permission="projects:manage"><Projects /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute permission="users:manage"><UserManager /></ProtectedRoute>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
