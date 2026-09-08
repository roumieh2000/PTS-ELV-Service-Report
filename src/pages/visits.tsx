import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useVisitStore } from '@/stores/visitStore'
import { useAuthStore } from '@/stores/authStore'
import { ProjectSelect } from '@/components/project-select'
import type { Visit } from '@/types/visit'
import type { User } from '@/types/auth'
import { CalendarDays, Plus, Pencil, Trash2, Save, FilePlus2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function userLabel(u: User): string {
  return u.name || u.username
}

interface FormState {
  date: string
  time: string
  clientName: string
  personInCharge: string
  projectCode: string
  notes: string
}

function defaultForm(): FormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    date: today,
    time: '',
    clientName: '',
    personInCharge: '',
    projectCode: '',
    notes: '',
  }
}

function visitToForm(v: Visit): FormState {
  return {
    date: v.date,
    time: v.time,
    clientName: v.clientName,
    personInCharge: v.personInCharge,
    projectCode: v.projectCode ?? '',
    notes: v.notes ?? '',
  }
}

function isUpcoming(v: Visit): boolean {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  return v.date > today || (v.date === today && v.time >= now.toTimeString().slice(0, 5))
}

export function Visits() {
  const navigate = useNavigate()
  const visits = useVisitStore((s) => s.visits)
  const addVisit = useVisitStore((s) => s.addVisit)
  const updateVisit = useVisitStore((s) => s.updateVisit)
  const deleteVisit = useVisitStore((s) => s.deleteVisit)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const users = useAuthStore((s) => s.users)
  const canCreateReport = hasPermission('reports:create')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState('')

  function openAdd() {
    setForm(defaultForm())
    setEditingId(null)
    setError('')
    setDialogOpen(true)
  }

  function openEdit(v: Visit) {
    setForm(visitToForm(v))
    setEditingId(v.id)
    setError('')
    setDialogOpen(true)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setError('')
    if (!form.date) { setError('Date is required'); return }
    if (!form.time) { setError('Time is required'); return }
    if (!form.clientName.trim()) { setError('Client name is required'); return }
    if (!form.personInCharge.trim()) { setError('Person in charge is required'); return }

    const data = {
      date: form.date,
      time: form.time,
      clientName: form.clientName.trim(),
      personInCharge: form.personInCharge.trim(),
      projectCode: form.projectCode || undefined,
      notes: form.notes.trim() || undefined,
    }

    if (editingId) {
      await updateVisit(editingId, data)
    } else {
      await addVisit(data)
    }
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteVisit(id)
    setDeleteConfirm(null)
  }

  function goToReport(v: Visit) {
    const params = new URLSearchParams({ client: v.clientName, poc: v.personInCharge })
    if (v.projectCode) params.set('project', v.projectCode)
    navigate(`/reports/new?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-blue-600" />
          <h1 className="text-2xl font-bold">Daily Visits</h1>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add Visit
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Person in Charge</th>
                <th className="px-3 py-2">Project</th>
                {canCreateReport && <th className="w-40 px-3 py-2">Report</th>}
                <th className="w-24 px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-neutral-500">
                    No visits scheduled yet. Click "Add Visit" to create one.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2">
                      {new Date(v.date).toLocaleDateString()}
                      {isUpcoming(v) && (
                        <Badge className="ml-2 bg-blue-100 text-blue-800 text-[10px]">Upcoming</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{v.time}</td>
                    <td className="px-3 py-2 font-medium">{v.clientName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{v.personInCharge}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 font-mono text-xs" title={v.projectCode}>
                      {v.projectCode || '\u2014'}
                    </td>
                    {canCreateReport && (
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => goToReport(v)}>
                          <FilePlus2 className="size-3.5" />
                          Create Report
                        </Button>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(v)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => setDeleteConfirm(v.id)}>
                          <Trash2 className="size-3 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {visits.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: "Create Report" opens a new service report with the visit's client and person in charge pre-filled.
        </p>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Visit' : 'Add Visit'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={(e) => updateField('time', e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label>Client Name</Label>
              <Input value={form.clientName} onChange={(e) => updateField('clientName', e.target.value)} placeholder="Client / company name" />
            </div>
            <div className="space-y-1">
              <Label>Person in Charge</Label>
              <Select value={form.personInCharge} onValueChange={(v) => updateField('personInCharge', v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={userLabel(u)}>{userLabel(u)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Project Code (optional)</Label>
              <ProjectSelect value={form.projectCode} onChange={(v) => updateField('projectCode', v)} allowNone />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="size-4" />
              {editingId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Visit?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The scheduled visit will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}