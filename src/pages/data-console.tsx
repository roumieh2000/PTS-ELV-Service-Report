import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useReportStore } from '@/stores/reportStore'
import type { ServiceReport, ResolutionStatus, JobType } from '@/types/report'
import { Plus, Pencil, Trash2, Save, Database } from 'lucide-react'

const statusStyles: Record<string, string> = {
  Resolved: 'bg-emerald-100 text-emerald-800',
  Pending: 'bg-amber-100 text-amber-800',
  Escalated: 'bg-red-100 text-red-800',
  Partial: 'bg-blue-100 text-blue-800',
}

const jobTypeOptions: JobType[] = ['AMC', 'Service Calls', 'Project', 'Jobwise', 'Completion']

const documentFields = [
  { key: 'passwordRecords' as const, label: 'Password Records' },
  { key: 'deliveryNotes' as const, label: 'Delivery Notes' },
  { key: 'configuration' as const, label: 'Configuration' },
  { key: 'rentMaterial' as const, label: 'Rent Material' },
  { key: 'others' as const, label: 'Others' },
]

interface FormState {
  docRef: string
  lpoContractRef: string
  date: string
  txn: string
  clientName: string
  projectName: string
  jobTypes: JobType[]
  complaints: string
  actionsTaken: string
  resolutionStatus: ResolutionStatus | ''
  progTechName: string
  progTechDate: string
  clientSignName: string
  clientSignDate: string
  documents: Record<string, boolean>
}

function defaultForm(): FormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    docRef: '',
    lpoContractRef: '',
    date: today,
    txn: '',
    clientName: '',
    projectName: '',
    jobTypes: [],
    complaints: '',
    actionsTaken: '',
    resolutionStatus: '',
    progTechName: '',
    progTechDate: today,
    clientSignName: '',
    clientSignDate: today,
    documents: { passwordRecords: false, deliveryNotes: false, configuration: false, rentMaterial: false, others: false },
  }
}

function reportToForm(r: ServiceReport): FormState {
  return {
    docRef: r.docRef,
    lpoContractRef: r.lpoContractRef,
    date: r.date,
    txn: r.txn,
    clientName: r.clientName,
    projectName: r.projectName,
    jobTypes: r.jobTypes,
    complaints: r.complaints,
    actionsTaken: r.actionsTaken,
    resolutionStatus: r.resolutionStatus,
    progTechName: r.progTechName,
    progTechDate: r.progTechDate,
    clientSignName: r.clientSignName,
    clientSignDate: r.clientSignDate,
    documents: { ...r.documents },
  }
}

export function DataConsole() {
  const reports = useReportStore((s) => s.reports)
  const addReport = useReportStore((s) => s.addReport)
  const updateReport = useReportStore((s) => s.updateReport)
  const deleteReport = useReportStore((s) => s.deleteReport)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  function openAdd() {
    setForm(defaultForm())
    setEditingId(null)
    setErrors([])
    setDialogOpen(true)
  }

  function openEdit(r: ServiceReport) {
    setForm(reportToForm(r))
    setEditingId(r.id)
    setErrors([])
    setDialogOpen(true)
  }

  function validate(): boolean {
    const errs: string[] = []
    if (!form.docRef.trim()) errs.push('Doc Ref is required')
    if (!form.lpoContractRef.trim()) errs.push('LPO/Contract Ref is required')
    if (!form.date.trim()) errs.push('Date is required')
    if (!form.clientName.trim()) errs.push('Client Name is required')
    if (!form.projectName.trim()) errs.push('Project Name is required')
    if (form.jobTypes.length === 0) errs.push('Select at least one Job Type')
    if (!form.complaints.trim()) errs.push('Complaints is required')
    if (!form.actionsTaken.trim()) errs.push('Actions Taken is required')
    if (!form.resolutionStatus) errs.push('Resolution Status is required')
    setErrors(errs)
    return errs.length === 0
  }

  function handleSave() {
    if (!validate()) return

    const data = {
      docRef: form.docRef.trim(),
      lpoContractRef: form.lpoContractRef.trim(),
      date: form.date,
      txn: form.txn.trim(),
      clientName: form.clientName.trim(),
      projectName: form.projectName.trim(),
      jobTypes: form.jobTypes,
      complaints: form.complaints.trim(),
      actionsTaken: form.actionsTaken.trim(),
      resolutionStatus: form.resolutionStatus as ResolutionStatus,
      progTechName: form.progTechName.trim(),
      progTechDate: form.progTechDate,
      clientSignName: form.clientSignName.trim(),
      clientSignDate: form.clientSignDate,
      documents: {
        passwordRecords: form.documents.passwordRecords,
        deliveryNotes: form.documents.deliveryNotes,
        configuration: form.documents.configuration,
        rentMaterial: form.documents.rentMaterial,
        others: form.documents.others,
      },
    }

    if (editingId) {
      updateReport(editingId, data)
    } else {
      addReport(data)
    }
    setDialogOpen(false)
  }

  function handleDelete(id: string) {
    deleteReport(id)
    setDeleteConfirm(null)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleJobType(jt: JobType) {
    setForm((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(jt)
        ? prev.jobTypes.filter((j) => j !== jt)
        : [...prev.jobTypes, jt],
    }))
  }

  function toggleDoc(key: string, checked: boolean) {
    setForm((prev) => ({ ...prev, documents: { ...prev.documents, [key]: checked } }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-blue-600" />
          <h1 className="text-2xl font-bold">Data Console</h1>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add Entry
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Doc Ref</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Job Types</th>
                <th className="px-3 py-2">Status</th>
                <th className="w-24 px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-neutral-500">
                    No reports yet. Click "Add Entry" to create one.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{r.docRef}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-3 py-2">{r.clientName}</td>
                    <td className="max-w-[200px] overflow-hidden truncate px-3 py-2 text-xs text-muted-foreground" title={r.projectName}>
                      {r.projectName}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.jobTypes.map((j) => (
                          <Badge key={j} variant="secondary" className="text-[10px]">{j}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`text-[10px] ${statusStyles[r.resolutionStatus]}`}>
                        {r.resolutionStatus}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(r)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => setDeleteConfirm(r.id)}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Entry' : 'New Entry'}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-1">
            {errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errors.map((e) => <p key={e}>{e}</p>)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Doc Ref</Label>
                <Input value={form.docRef} onChange={(e) => updateField('docRef', e.target.value)} placeholder="SR-2026-XXX" />
              </div>
              <div className="space-y-1">
                <Label>LPO / Contract Ref</Label>
                <Input value={form.lpoContractRef} onChange={(e) => updateField('lpoContractRef', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>TXN</Label>
                <Input value={form.txn} onChange={(e) => updateField('txn', e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Client Name</Label>
                <Input value={form.clientName} onChange={(e) => updateField('clientName', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Project Name</Label>
                <Input value={form.projectName} onChange={(e) => updateField('projectName', e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label>Job Types</Label>
              <div className="flex flex-wrap gap-3">
                {jobTypeOptions.map((jt) => (
                  <label key={jt} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.jobTypes.includes(jt)} onCheckedChange={() => toggleJobType(jt)} />
                    {jt}
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Complaints</Label>
                <Textarea rows={3} value={form.complaints} onChange={(e) => updateField('complaints', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Actions Taken</Label>
                <Textarea rows={3} value={form.actionsTaken} onChange={(e) => updateField('actionsTaken', e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label>Resolution Status</Label>
              <Select
                value={form.resolutionStatus}
                onValueChange={(v) => updateField('resolutionStatus', v as ResolutionStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Escalated">Escalated</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 rounded-lg border p-3">
                <h3 className="text-xs font-medium">Prog Tech</h3>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.progTechName} onChange={(e) => updateField('progTechName', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.progTechDate} onChange={(e) => updateField('progTechDate', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <h3 className="text-xs font-medium">Client Sign</h3>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.clientSignName} onChange={(e) => updateField('clientSignName', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.clientSignDate} onChange={(e) => updateField('clientSignDate', e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <Label>Documents</Label>
              <div className="grid grid-cols-2 gap-2">
                {documentFields.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.documents[key]} onCheckedChange={(v) => toggleDoc(key, !!v)} />
                    {label}
                  </label>
                ))}
              </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The report will be permanently removed.
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
