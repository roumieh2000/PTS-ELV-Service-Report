import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
import { Users, Phone, Plus, Pencil, Trash2, Save, ListChecks, Search, CalendarDays, FileText } from 'lucide-react'

type Tab = 'clients' | 'followups'

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

function lastDate(items: { date: string }[]): string | null {
  if (items.length === 0) return null
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0].date
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

function defaultClientForm(): ClientForm {
  return { name: '', contactPerson: '', phone: '', email: '', address: '', city: '', notes: '' }
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

interface FollowUpForm {
  clientId: string
  assignedTo: string
  task: string
  dueDate: string
  status: FollowUpStatus
}

function defaultFollowUpForm(): FollowUpForm {
  return { clientId: '', assignedTo: '', task: '', dueDate: '', status: 'Open' }
}

export function Crm() {
  const clients = useCrmClientStore((s) => s.clients)
  const addClient = useCrmClientStore((s) => s.addClient)
  const updateClient = useCrmClientStore((s) => s.updateClient)
  const deleteClient = useCrmClientStore((s) => s.deleteClient)
  const followups = useCrmFollowUpStore((s) => s.followups)
  const addFollowUp = useCrmFollowUpStore((s) => s.addFollowUp)
  const updateFollowUp = useCrmFollowUpStore((s) => s.updateFollowUp)
  const deleteFollowUp = useCrmFollowUpStore((s) => s.deleteFollowUp)
  const visits = useVisitStore((s) => s.visits)
  const reports = useReportStore((s) => s.reports)
  const users = useAuthStore((s) => s.users)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManage = hasPermission('crm:manage')

  const [tab, setTab] = useState<Tab>('clients')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | FollowUpStatus>('All')
  const [clientDialog, setClientDialog] = useState(false)
  const [clientForm, setClientForm] = useState<ClientForm>(defaultClientForm)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [clientError, setClientError] = useState('')
  const [fuDialog, setFuDialog] = useState(false)
  const [fuForm, setFuForm] = useState<FollowUpForm>(defaultFollowUpForm)
  const [editingFuId, setEditingFuId] = useState<string | null>(null)
  const [fuError, setFuError] = useState('')
  const [deleteClientConfirm, setDeleteClientConfirm] = useState<string | null>(null)
  const [deleteFuConfirm, setDeleteFuConfirm] = useState<string | null>(null)

  const clientName = useMemo(() => {
    const map = new Map<string, string>()
    clients.forEach((c) => map.set(c.id, c.name))
    return map
  }, [clients])

  function isClientVisit(c: CrmClient, clientNameStr: string, clientId?: string): boolean {
    return clientId === c.id || (!clientId && namesMatch(clientNameStr, c.name))
  }

  const searchLower = search.trim().toLowerCase()
  const filteredClients = clients.filter((c) => {
    if (!searchLower) return true
    return [c.name, c.contactPerson, c.phone].join(' ').toLowerCase().includes(searchLower)
  })

  const filteredFollowups = followups.filter((f) => (statusFilter === 'All' ? true : f.status === statusFilter))

  function openAddClient() {
    setClientForm(defaultClientForm())
    setEditingClientId(null)
    setClientError('')
    setClientDialog(true)
  }

  function openEditClient(c: CrmClient) {
    setClientForm(clientToForm(c))
    setEditingClientId(c.id)
    setClientError('')
    setClientDialog(true)
  }

  function updateClientField<K extends keyof ClientForm>(key: K, value: ClientForm[K]) {
    setClientForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveClient() {
    setClientError('')
    if (!clientForm.name.trim()) {
      setClientError('Client name is required')
      return
    }
    const data = {
      name: clientForm.name.trim(),
      contactPerson: clientForm.contactPerson.trim(),
      phone: clientForm.phone.trim(),
      email: clientForm.email.trim(),
      address: clientForm.address.trim(),
      city: clientForm.city.trim(),
      notes: clientForm.notes.trim() || undefined,
    }
    if (editingClientId) {
      await updateClient(editingClientId, data)
    } else {
      await addClient(data)
    }
    setClientDialog(false)
  }

  function openAddFollowUp(clientId?: string) {
    setFuForm({ ...defaultFollowUpForm(), clientId: clientId ?? '' })
    setEditingFuId(null)
    setFuError('')
    setFuDialog(true)
  }

  function openEditFollowUp(f: CrmFollowUp) {
    setFuForm({
      clientId: f.clientId,
      assignedTo: f.assignedTo,
      task: f.task,
      dueDate: f.dueDate,
      status: f.status,
    })
    setEditingFuId(f.id)
    setFuError('')
    setFuDialog(true)
  }

  function updateFuField<K extends keyof FollowUpForm>(key: K, value: FollowUpForm[K]) {
    setFuForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveFollowUp() {
    setFuError('')
    if (!fuForm.clientId) {
      setFuError('Client is required')
      return
    }
    if (!fuForm.task.trim()) {
      setFuError('Task is required')
      return
    }
    const data = {
      clientId: fuForm.clientId,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-blue-600" />
          <h1 className="text-2xl font-bold">CRM</h1>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {tab === 'clients' && (
              <Button onClick={openAddClient}>
                <Plus className="size-4" />
                Add Client
              </Button>
            )}
            {tab === 'followups' && (
              <Button onClick={() => openAddFollowUp()}>
                <Plus className="size-4" />
                Add Follow-up
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border bg-white p-0.5">
          {(['clients', 'followups'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                tab === t ? 'bg-blue-600 text-white' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'clients' ? 'Search clients...' : 'Search...'}
            className="pl-9"
          />
        </div>
        {tab === 'followups' && (
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'All' | FollowUpStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              {allStatuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {tab === 'clients' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Open Items</th>
                  <th className="px-3 py-2">Last Visit</th>
                  <th className="px-3 py-2">Last Report</th>
                  {canManage && <th className="w-24 px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-neutral-500">
                      No clients yet. Click "Add Client" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c) => {
                    const cVisits = visits.filter((v) => isClientVisit(c, v.clientName, v.clientId))
                    const cReports = reports.filter((r) => isClientVisit(c, r.clientName, r.clientId))
                    const openItems = followups.filter(
                      (f) => f.clientId === c.id && f.status !== 'Done' && f.status !== 'Cancelled'
                    ).length
                    const lv = lastDate(cVisits)
                    const lr = lastDate(cReports)
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <Link to={`/crm/${c.id}`} className="font-medium text-blue-700 no-underline hover:underline">
                            {c.name}
                          </Link>
                          {c.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="size-3" />
                              {c.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{c.contactPerson || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.city || '—'}</td>
                        <td className="px-3 py-2">
                          {openItems > 0 ? (
                            <Badge className="bg-amber-100 text-amber-800">{openItems} open</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {cVisits.length > 0 ? `${cVisits.length} × ${lv}` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {cReports.length > 0 ? `${cReports.length} × ${lr}` : '—'}
                        </td>
                        {canManage && (
                          <td className="whitespace-nowrap px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon-xs" onClick={() => openEditClient(c)}>
                                <Pencil className="size-3" />
                              </Button>
                              <Button variant="ghost" size="icon-xs" onClick={() => setDeleteClientConfirm(c.id)}>
                                <Trash2 className="size-3 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'followups' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Task</th>
                  <th className="px-3 py-2">Assigned to</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Status</th>
                  {canManage && <th className="w-24 px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-neutral-500">
                      No follow-ups{statusFilter !== 'All' ? ' with this status' : ''} yet.
                    </td>
                  </tr>
                ) : (
                  filteredFollowups.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link to={`/crm/${f.clientId}`} className="font-medium text-blue-700 no-underline hover:underline">
                          {clientName.get(f.clientId) ?? 'Unknown client'}
                        </Link>
                      </td>
                      <td className="max-w-[260px] px-3 py-2">
                        <div className="truncate" title={f.task}>{f.task}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{f.assignedTo || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{f.dueDate || '—'}</td>
                      <td className="px-3 py-2">
                        <Badge className={statusStyles[f.status]}>{f.status}</Badge>
                      </td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-xs" onClick={() => openEditFollowUp(f)}>
                              <Pencil className="size-3" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => setDeleteFuConfirm(f.id)}>
                              <Trash2 className="size-3 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Client add/edit dialog */}
      <Dialog open={clientDialog} onOpenChange={setClientDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClientId ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {clientError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{clientError}</div>
            )}
            <div className="space-y-1">
              <Label>Client / Company Name</Label>
              <Input value={clientForm.name} onChange={(e) => updateClientField('name', e.target.value)} placeholder="e.g. Khor Fakhan School" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveClient}>
              <Save className="size-4" />
              {editingClientId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up add/edit dialog */}
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
              <Label>Client</Label>
              <Select value={fuForm.clientId} onValueChange={(v) => updateFuField('clientId', v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {/* Delete client confirm */}
      <Dialog open={!!deleteClientConfirm} onOpenChange={(o) => !o && setDeleteClientConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This client and all its follow-ups will be permanently removed. Visits and reports remain but lose the link.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteClientConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteClientConfirm) void deleteClient(deleteClientConfirm)
                setDeleteClientConfirm(null)
              }}
            >
              Delete
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

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> Visits</span>
        <span className="flex items-center gap-1"><FileText className="size-3.5" /> Reports</span>
        <span className="flex items-center gap-1"><ListChecks className="size-3.5" /> Follow-ups</span>
      </div>
    </div>
  )
}