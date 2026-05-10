import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ResolutionStatus } from '@/types/report'

interface FilterBarProps {
  statusFilter: ResolutionStatus | 'All'
  searchQuery: string
  onStatusChange: (status: ResolutionStatus | 'All') => void
  onSearchChange: (q: string) => void
}

export function FilterBar({ statusFilter, searchQuery, onStatusChange, onSearchChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by client, project, or doc ref..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={(v) => v && onStatusChange(v as ResolutionStatus | 'All')}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Statuses</SelectItem>
          <SelectItem value="Resolved">Resolved</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="Escalated">Escalated</SelectItem>
          <SelectItem value="Partial">Partial</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
