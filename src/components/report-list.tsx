import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ServiceReport } from '@/types/report'

const statusStyles: Record<string, string> = {
  Resolved: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  Pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  Escalated: 'bg-red-100 text-red-800 hover:bg-red-100',
  Partial: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
}

export function ReportList({ reports }: { reports: ServiceReport[] }) {
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-neutral-500">
          No reports found.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Link key={r.id} to={`/reports/${r.id}`} className="block no-underline">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{r.docRef}</span>
                  <Badge className={`text-xs ${statusStyles[r.resolutionStatus]}`}>
                    {r.resolutionStatus}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{r.clientName}</p>
                <p className="text-muted-foreground text-xs">{r.projectName}</p>
              </div>
              <div className="text-muted-foreground flex items-center gap-3 text-xs sm:text-right">
                <span>{r.jobTypes.join(', ')}</span>
                <span>{new Date(r.date).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
