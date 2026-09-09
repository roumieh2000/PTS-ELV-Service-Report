import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
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
import { useProjectStore } from '@/stores/projectStore'
import type { CityCode, ProjectCode } from '@/types/project'
import { CITIES, formatProjectCode } from '@/types/project'
import { Plus, Pencil, Trash2, Save, FolderOpen } from 'lucide-react'

interface FormState {
  city: string
  customCity: string
  number: string
  clientRef: string
}

function defaultForm(): FormState {
  return { city: '', customCity: '', number: '', clientRef: '' }
}

function projectToForm(p: ProjectCode): FormState {
  const known = CITIES.includes(p.city as CityCode)
  return {
    city: known ? p.city : 'Oth',
    customCity: known ? '' : p.city,
    number: p.number,
    clientRef: p.clientRef,
  }
}

function effectiveCity(f: FormState): string {
  return f.city === 'Oth' ? f.customCity.trim().toUpperCase() : f.city
}

export function Projects() {
  const projects = useProjectStore((s) => s.projects)
  const addProject = useProjectStore((s) => s.addProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)

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

  function openEdit(p: ProjectCode) {
    setForm(projectToForm(p))
    setEditingId(p.id)
    setError('')
    setDialogOpen(true)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const previewCode = form.city
    ? formatProjectCode(effectiveCity(form) || 'OTH', form.number, form.clientRef)
    : ''

  async function handleSave() {
    setError('')
    if (!form.city) { setError('City is required'); return }
    if (form.city === 'Oth' && !form.customCity.trim()) { setError('City code is required'); return }
    if (!/^\d{3}$/.test(form.number) || Number(form.number) < 1) {
      setError('Project number must be 001-999'); return
    }
    if (!form.clientRef.trim()) { setError('Client / project name is required'); return }

    const code = formatProjectCode(effectiveCity(form), form.number, form.clientRef)
    const duplicate = projects.some(
      (p) => p.code.toLowerCase() === code.toLowerCase() && p.id !== editingId
    )
    if (duplicate) { setError('This project code already exists'); return }

    const data = { city: effectiveCity(form), number: form.number, clientRef: form.clientRef }
    if (editingId) {
      await updateProject(editingId, data)
    } else {
      await addProject(data)
    }
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteProject(id)
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-5 text-blue-600" />
          <h1 className="text-2xl font-bold">Project Codes</h1>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add Project
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Format: <span className="font-mono text-xs">City-Number_Client\Project</span>, e.g.{' '}
        <span className="font-mono text-xs">AJM-032_DesignConsultants\K1-DVR</span>
      </p>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Number</th>
                <th className="px-3 py-2">Client / Project</th>
                <th className="w-24 px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-neutral-500">
                    No project codes yet. Click "Add Project" to create one.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{p.code}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[10px]">{p.city}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p.number}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.clientRef}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(p)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => setDeleteConfirm(p.id)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>City</Label>
                <Select value={form.city} onValueChange={(v) => updateField('city', v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="Oth">Oth (other)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Number</Label>
                <Input
                  value={form.number}
                  onChange={(e) => updateField('number', e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="032"
                  inputMode="numeric"
                  maxLength={3}
                />
              </div>
            </div>

            {form.city === 'Oth' && (
              <div className="space-y-1">
                <Label>City Code (other)</Label>
                <Input
                  value={form.customCity}
                  onChange={(e) => updateField('customCity', e.target.value.toUpperCase())}
                  placeholder="Enter city code, e.g. ABC"
                  maxLength={5}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>Client / Project Name</Label>
              <Input
                value={form.clientRef}
                onChange={(e) => updateField('clientRef', e.target.value)}
                placeholder="DesignConsultants\K1-DVR"
              />
            </div>

            <Separator />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="rounded-lg border border-dashed px-3 py-2 font-mono text-sm">
                {previewCode || 'City-Number_Client\\Project'}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="size-4" />
              {editingId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This project code will be removed from the selectable list. Existing reports and visits keep their data.
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