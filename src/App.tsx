import { BrowserRouter, Routes, Route } from 'react-router'
import { Layout } from '@/components/layout'
import { Dashboard } from '@/pages/dashboard'
import { ReportForm } from '@/pages/report-form'
import { ReportDetail } from '@/pages/report-detail'
import { DataConsole } from '@/pages/data-console'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="reports/new" element={<ReportForm />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="reports/:id/edit" element={<ReportForm />} />
          <Route path="console" element={<DataConsole />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
