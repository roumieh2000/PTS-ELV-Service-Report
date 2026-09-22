import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCrmClientStore } from '@/stores/crmClientStore'
import { useCrmFollowUpStore } from '@/stores/crmFollowUpStore'
import { useVisitStore } from '@/stores/visitStore'
import { useReportStore } from '@/stores/reportStore'
import { useAuthStore } from '@/stores/authStore'
import type { CrmClient, CrmFollowUp, FollowUpStatus } from '@/types/crm'
import type { User } from '@/types/auth'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  FileText,
  ListChecks,
  Pencil,
  Plus,
  Save,
  Trash2,
  User as UserIcon,
} from 'lucide-react'

const statusStyles: Record<string, string> = {
  Open: 'bg-amber-100 text-amber-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Done: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-red-100 text-red-800',
}

const allStatuses: FollowUpStatus[] = ['Open', 'In Progress', 'Done', 'Cancelled']

function userLabel(u: User): string {
  return u.name || u.username
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString()
}

interface FollowUpForm {
  assignedTo: string
  task: string
  dueDate: string
  status: FollowUpStatus
}

function defaultFollowUpForm(): FollowUpForm {
  return { assignedTo: '', task: '', dueDate: '', status: 'Open' }
}

interface ClientForm {
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  city: string
  notes: string
}

function clientToForm(c: CrmClient): ClientForm {
  return {
    name: c.name,
    contactPerson: c.contactPerson,
    phone: c.phone,
    email: c.email,
    address: c.address,
    city: c.city,
    notes: c.notes ?? '',
  }
}

type TimelineItem =
  | { kind: 'followup'; f: CrmFollowUp; sortKey: string }
  | { kind: 'visit'; clientName: string; date: string; time: string; personInCharge: string; notes?: string; projectCode?: string; sortKey: string }
  | { kind: 'report'; id: string; docRef: string; date: string; sortKey: string }

export function CrmClient() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = useCrmClientStore((s) => s.clients.find((c) => c.id === id))
  const updateClient = useCrmClientStore((s) => s.updateClient)
  const followups = useCrmFollowUpStore((s) => s.followups)
  const addFollowUp = useCrmFollowUpStore((s) => s.addFollowUp)
  const updateFollowUp = useCrmFollowUpStore((s) => s.updateFollowUp)
  const deleteFollowUp = useCrmFollowUpStore((s) => s.deleteFollowUp)
  const visits = useVisitStore((s) => s.visits)
  const reports = useReportStore((s) => s.reports)
  const users = useAuthStore((s) => s.users)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManage = hasPermission('crm:manage')

  const [fuDialog, setFuDialog] = useState(false)
  const [fuForm, setFuForm] = useState<FollowUpForm>(defaultFollowUpForm)
  const [editingFuId, setEditingFuId] = useState<string | null>(null)
  const [fuError, setFuError] = useState('')
  const [deleteFuConfirm, setDeleteFuConfirm] = useState<string | null>(null)
  const [clientDialog, setClientDialog] = useState(false)
  const [clientForm, setClientForm] = useState<ClientForm | null>(null)
  const [clientError, setClientError] = useState('')

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm')}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <p className="text-neutral-500">Client not found.</p>
      </div>
    )
  }

  const current = client

  const clientFollowups = followups.filter((f) => f.clientId === current.id)
  const clientVisits = visits.filter((v) => v.clientId === current.id || (!v.clientId && namesMatch(v.clientName, current.name)))
  const clientReports = reports.filter((r) => r.clientId === current.id || (!r.clientId && namesMatch(r.clientName, current.name)))

  const items: TimelineItem[] = [
    ...clientFollowups.map((f): TimelineItem => ({ kind: 'followup', f, sortKey: `${f.dueDate || ''}T${f.createdAt}` })),
    ...clientVisits.map((v): TimelineItem => ({
      kind: 'visit',
      clientName: v.clientName,
      date: v.date,
      time: v.time,
      personInCharge: v.personInCharge,
      notes: v.notes,
      projectCode: v.projectCode,
      sortKey: `${v.date}T${v.time}`,
    })),
    ...clientReports.map((r): TimelineItem => ({ kind: 'report', id: r.id, docRef: r.docRef, date: r.date, sortKey: `${r.date}T` })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  const openCount = clientFollowups.filter((f) => f.status !== 'Done' && f.status !== 'Cancelled').length

  function openAddFollowUp() {
    setFuForm(defaultFollowUpForm())
    setEditingFuId(null)
    setFuError('')
    setFuDialog(true)
  }

  function openEditFollowUp(f: CrmFollowUp) {
    setFuForm({ assignedTo: f.assignedTo, task: f.task, dueDate: f.dueDate, status: f.status })
    setEditingFuId(f.id)
    setFuError('')
    setFuDialog(true)
  }

  function updateFuField<K extends keyof FollowUpForm>(key: K, value: FollowUpForm[K]) {
    setFuForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveFollowUp() {
    setFuError('')
    if (!fuForm.task.trim()) {
      setFuError('Task is required')
      return
    }
    const data = {
      clientId: current.id,
      assignedTo: fuForm.assignedTo,
      task: fuForm.task.trim(),
      dueDate: fuForm.dueDate,
      status: fuForm.status,
    }
    if (editingFuId) {
      await updateFollowUp(editingFuId, data)
    } else {
      await addFollowUp(data)
    }
    setFuDialog(false)
  }

  function openEditClient() {
    setClientForm(clientToForm(current))
    setClientError('')
    setClientDialog(true)
  }

  function updateClientField<K extends keyof ClientForm>(key: K, value: ClientForm[K]) {
    setClientForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSaveClient() {
    if (!clientForm) return
    setClientError('')
    if (!clientForm.name.trim()) {
      setClientError('Client name is required')
      return
    }
    await updateClient(current.id, {
      name: clientForm.name.trim(),
      contactPerson: clientForm.contactPerson.trim(),
      phone: clientForm.phone.trim(),
      email: clientForm.email.trim(),
      address: clientForm.address.trim(),
      city: clientForm.city.trim(),
      notes: clientForm.notes.trim() || undefined,
    })
    setClientDialog(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold">{current.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button variant="outline" onClick={openEditClient}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button onClick={openAddFollowUp}>
                <Plus className="size-4" />
                Add Follow-up
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <UserIcon className="size-4" />
              {current.contactPerson || 'No contact person'}
            </span>
            {current.phone && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="size-4" />
                {current.phone}
              </span>
            )}
            {current.email && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-4" />
                {current.email}
              </span>
            )}
            {current.city && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {current.city}
              </span>
            )}
            <Badge className={openCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}>
              {openCount} open follow-up{openCount === 1 ? '' : 's'}
            </Badge>
          </div>
          {current.address && <p className="text-sm text-muted-foreground">{current.address}</p>}
          {current.notes && <p className="text-sm">{current.notes}</p>}
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="size-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Activity</h2>
          <span className="text-xs text-muted-foreground">
            {clientVisits.length} visits Â· {clientReports.length} reports Â· {clientFollowups.length} follow-ups
          </span>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-neutral-500">
                No activity yet for this current. Add a follow-up or create a visit/report.
              </CardContent>
            </Card>
          )}

          {items.map((item, i) => {
            if (item.kind === 'followup') {
              const f = item.f
              return (
                <Card key={`${item.kind}-${f.id}`}>
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <ListChecks className="mt-0.5 size-4 shrink-0 text-blue-600" />
                        <div>
                          <p className="text-sm">{f.task}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {f.assignedTo ? `Assigned to ${f.assignedTo}` : 'Unassigned'}
                            {f.dueDate ? ` Â· due ${f.dueDate}` : ''}
                          </p>
                          {f.reportId && (
                            <Link to={`/reports/${f.reportId}`} className="text-xs text-blue-700 no-underline hover:underline">
                              Related report
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge className={statusStyles[f.status]}>{f.status}</Badge>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon-xs" onClick={() => openEditFollowUp(f)}>
                              <Pencil className="size-3" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => setDeleteFuConfirm(f.id)}>
                              <Trash2 className="size-3 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }
            if (item.kind === 'visit') {
              return (
                <Card key={`${item.kind}-${item.sortKey}-${i}`}>
                  <CardContent className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">
                          Visit Â· {formatDate(item.date)} {item.time}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.clientName} Â· {item.personInCharge}
                          {item.projectCode ? ` Â· ${item.projectCode}` : ''}
                        </p>
                        {item.notes && <p className="mt-1 text-sm">{item.notes}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }
            return (
              <Card key={`${item.kind}-${item.id}`}>
                <CardContent>
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 size-4 shrink-0 text-blue-600" />
                    <div>
                      <Link to={`/reports/${item.id}`} className="text-sm font-medium text-blue-700 no-underline hover:underline">
                        Report Â· {item.docRef}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Separator />

      <p className="text-xs text-muted-foreground">
        Visits and reports are linked automatically when the client name matches an existing CRM current.
      </p>

      {/* Follow-up dialog */}
      <Dialog open={fuDialog} onOpenChange={setFuDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFuId ? 'Edit Follow-up' : 'Add Follow-up'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {fuError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{fuError}</div>
            )}
            <div className="space-y-1">
              <Label>Task</Label>
              <Textarea rows={2} value={fuForm.task} onChange={(e) => updateFuField('task', e.target.value)} placeholder="What needs to be done" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Assigned to (optional)</Label>
                <Select value={fuForm.assignedTo} onValueChange={(v) => updateFuField('assignedTo', v ?? '')}>
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
                <Label>Due date (optional)</Label>
                <Input type="date" value={fuForm.dueDate} onChange={(e) => updateFuField('dueDate', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={fuForm.status} onValueChange={(v) => updateFuField('status', v as FollowUpStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFollowUp}>
              <Save className="size-4" />
              {editingFuId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete follow-up confirm */}
      <Dialog open={!!deleteFuConfirm} onOpenChange={(o) => !o && setDeleteFuConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Follow-up?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This follow-up will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFuConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteFuConfirm) void deleteFollowUp(deleteFuConfirm)
                setDeleteFuConfirm(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit client dialog */}
      <Dialog open={clientDialog} onOpenChange={setClientDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          {clientForm && (
            <div className="space-y-4">
              {clientError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{clientError}</div>
              )}
              <div className="space-y-1">
                <Label>Client / Company Name</Label>
                <Input value={clientForm.name} onChange={(e) => updateClientField('name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Contact Person</Label>
                  <Input value={clientForm.contactPerson} onChange={(e) => updateClientField('contactPerson', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={clientForm.phone} onChange={(e) => updateClientField('phone', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={clientForm.email} onChange={(e) => updateClientField('email', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input value={clientForm.city} onChange={(e) => updateClientField('city', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input value={clientForm.address} onChange={(e) => updateClientField('address', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={clientForm.notes} onChange={(e) => updateClientField('notes', e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveClient}>
              <Save className="size-4" />
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}