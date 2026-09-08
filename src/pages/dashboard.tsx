import { useMemo } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SummaryCards } from '@/components/summary-cards'
import { FilterBar } from '@/components/filter-bar'
import { ReportList } from '@/components/report-list'
import { useReportStore } from '@/stores/reportStore'
import { useAuthStore } from '@/stores/authStore'

export function Dashboard() {
  const reports = useReportStore((s) => s.reports)
  const statusFilter = useReportStore((s) => s.statusFilter)
  const searchQuery = useReportStore((s) => s.searchQuery)
  const setStatusFilter = useReportStore((s) => s.setStatusFilter)
  const setSearchQuery = useReportStore((s) => s.setSearchQuery)
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const visibleReports = useMemo(() => {
    let list = reports
    if (user?.role === 'customer' && user.clientName) {
      list = list.filter((r) => r.clientName === user.clientName)
    }
    return list
  }, [reports, user])

  const counts = useMemo(() => {
    const c: Record<string, number> = { Resolved: 0, Pending: 0, Escalated: 0, Partial: 0 }
    for (const r of visibleReports) c[r.resolutionStatus]++
    return c
  }, [visibleReports])

  const filtered = useMemo(() => {
    let list = visibleReports
    if (statusFilter !== 'All') {
      list = list.filter((r) => r.resolutionStatus === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          r.clientName.toLowerCase().includes(q) ||
          r.projectName.toLowerCase().includes(q) ||
          r.docRef.toLowerCase().includes(q)
      )
    }
    return list
  }, [visibleReports, statusFilter, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {hasPermission('reports:create') && (
          <Link to="/reports/new">
            <Button>
              <Plus className="size-4" />
              New Report
            </Button>
          </Link>
        )}
      </div>

      <SummaryCards counts={counts} />

      <FilterBar
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        onStatusChange={setStatusFilter}
        onSearchChange={setSearchQuery}
      />

      <ReportList reports={filtered} />
    </div>
  )
}
