import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/stores/projectStore'

const NONE_VALUE = '__none__'

interface ProjectSelectProps {
  value: string
  onChange: (code: string) => void
  allowNone?: boolean
  noneLabel?: string
  placeholder?: string
  disabled?: boolean
}

export function ProjectSelect({
  value,
  onChange,
  allowNone = false,
  noneLabel = 'No project',
  placeholder = 'Select project code',
  disabled = false,
}: ProjectSelectProps) {
  const projects = useProjectStore((s) => s.projects)

  return (
    <Select
      value={value || NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? '' : (v ?? ''))}
    >
      <SelectTrigger disabled={disabled} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>}
        {projects.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No project codes yet.
          </div>
        ) : (
          projects.map((p) => (
            <SelectItem key={p.id} value={p.code}>{p.code}</SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}