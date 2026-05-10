import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Clock, AlertTriangle, HelpCircle } from 'lucide-react'
import type { ResolutionStatus } from '@/types/report'

const statuses: { key: ResolutionStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { key: 'Resolved', label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'Pending', label: 'Pending', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  { key: 'Escalated', label: 'Escalated', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  { key: 'Partial', label: 'Partial', icon: HelpCircle, color: 'text-blue-600 bg-blue-50' },
]

export function SummaryCards({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {statuses.map((s) => (
        <Card key={s.key} className="border-l-4 border-l-current shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-full p-2 ${s.color}`}>
              <s.icon className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts[s.key] ?? 0}</p>
              <p className="text-muted-foreground text-xs">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
