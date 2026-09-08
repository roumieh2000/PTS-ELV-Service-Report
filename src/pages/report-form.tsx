import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectSelect } from '@/components/project-select'
import { ArrowLeft, RefreshCw, Save, Trash2 } from 'lucide-react'
import { SignaturePad } from '@/components/signature-pad'
import { useReportStore } from '@/stores/reportStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { buildDocRef, randomDocRefSuffix } from '@/lib/docref'
import type { User } from '@/types/auth'
import type { JobType, ResolutionStatus } from '@/types/report'

function userLabel(u: User): string {
  return u.name || u.username
}

const jobTypeOptions: { value: JobType; label: string }[] = [
  { value: 'AMC', label: 'AMC' },
  { value: 'Service Calls', label: 'Service Calls' },
  { value: 'Project', label: 'Project' },
  { value: 'Jobwise', label: 'Jobwise' },
  { value: 'Completion', label: 'Completion' },
]

const schema = z.object({
  docRef: z.string().min(1, 'Required'),
  lpoContractRef: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  txn: z.string().min(1, 'Required'),
  clientName: z.string().min(1, 'Required'),
  projectName: z.string().min(1, 'Required'),
  jobTypes: z.array(z.string()).min(1, 'Select at least one'),
  complaints: z.string().min(1, 'Required'),
  actionsTaken: z.string().min(1, 'Required'),
  resolutionStatus: z.string().min(1, 'Required'),
  progTechName: z.string().min(1, 'Required'),
  progTechDate: z.string().min(1, 'Required'),
  progTechSignature: z.string().optional(),
  clientSignName: z.string().min(1, 'Required'),
  clientSignDate: z.string().min(1, 'Required'),
  clientSignature: z.string().optional(),
  passwordRecords: z.boolean(),
  deliveryNotes: z.boolean(),
  configuration: z.boolean(),
  rentMaterial: z.boolean(),
  others: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function ReportForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientParam = searchParams.get('client') ?? ''
  const pocParam = searchParams.get('poc') ?? ''
  const projectParam = searchParams.get('project') ?? ''
  const existing = useReportStore((s) => (id ? s.getReport(id) : undefined))
  const addReport = useReportStore((s) => s.addReport)
  const updateReport = useReportStore((s) => s.updateReport)
  const users = useAuthStore((s) => s.users)
  const projects = useProjectStore((s) => s.projects)
  const [selectedProject, setSelectedProject] = useState('')

  const { register, handleSubmit, getValues, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          docRef: existing.docRef,
          lpoContractRef: existing.lpoContractRef,
          date: existing.date,
          txn: existing.txn,
          clientName: existing.clientName,
          projectName: existing.projectName,
          jobTypes: existing.jobTypes,
          complaints: existing.complaints,
          actionsTaken: existing.actionsTaken,
          resolutionStatus: existing.resolutionStatus,
          progTechName: existing.progTechName,
          progTechDate: existing.progTechDate,
          progTechSignature: existing.progTechSignature ?? '',
          clientSignName: existing.clientSignName,
          clientSignDate: existing.clientSignDate,
          clientSignature: existing.clientSignature ?? '',
          passwordRecords: existing.documents.passwordRecords,
          deliveryNotes: existing.documents.deliveryNotes,
          configuration: existing.documents.configuration,
          rentMaterial: existing.documents.rentMaterial,
          others: existing.documents.others,
        }
      : {
          docRef: '',
          lpoContractRef: '',
          date: new Date().toISOString().slice(0, 10),
          txn: '',
          clientName: clientParam,
          projectName: '',
          jobTypes: [],
          complaints: '',
          actionsTaken: '',
          resolutionStatus: '',
          progTechName: pocParam,
          progTechDate: new Date().toISOString().slice(0, 10),
          progTechSignature: '',
          clientSignName: '',
          clientSignDate: new Date().toISOString().slice(0, 10),
          clientSignature: '',
          passwordRecords: false,
          deliveryNotes: false,
          configuration: false,
          rentMaterial: false,
          others: false,
        },
  })

  const watchedJobTypes = watch('jobTypes')
  const docChecked = {
    passwordRecords: watch('passwordRecords'),
    deliveryNotes: watch('deliveryNotes'),
    configuration: watch('configuration'),
    rentMaterial: watch('rentMaterial'),
    others: watch('others'),
  }

  useEffect(() => {
    if (isEdit || !projectParam || selectedProject) return
    const found = projects.find((p) => p.code === projectParam)
    if (found && !getValues('docRef')) {
      setSelectedProject(found.code)
      setValue('docRef', nextDocRef(found.code), { shouldValidate: true })
    }
  }, [projectParam, projects, isEdit, selectedProject, getValues, setValue])

  function baseOfDocRef(docRef: string): string {
    const m = docRef.match(/^(.+)-[A-Z2-9]{4}$/)
    return m ? m[1] : docRef
  }

  function nextDocRef(base: string): string {
    const taken = new Set(useReportStore.getState().reports.map((r) => r.docRef))
    let suffix = randomDocRefSuffix()
    while (taken.has(buildDocRef(base, suffix))) {
      suffix = randomDocRefSuffix()
    }
    return buildDocRef(base, suffix)
  }

  function handleProjectChange(code: string) {
    setSelectedProject(code)
    if (code && !getValues('docRef')) {
      setValue('docRef', nextDocRef(code), { shouldValidate: true })
    }
  }

  function regenerateDocRef() {
    const current = getValues('docRef')
    const base = selectedProject || (current ? baseOfDocRef(current) : '')
    if (!base) return
    setValue('docRef', nextDocRef(base), { shouldValidate: true })
  }

  function toggleJobType(value: JobType) {
    const current = watchedJobTypes
    if (current.includes(value)) {
      setValue('jobTypes', current.filter((j) => j !== value), { shouldValidate: true })
    } else {
      setValue('jobTypes', [...current, value], { shouldValidate: true })
    }
  }

  async function onSubmit(data: FormData) {
    const reportData = {
      docRef: data.docRef,
      lpoContractRef: data.lpoContractRef,
      date: data.date,
      txn: data.txn,
      clientName: data.clientName,
      projectName: data.projectName,
      jobTypes: data.jobTypes as JobType[],
      complaints: data.complaints,
      actionsTaken: data.actionsTaken,
      resolutionStatus: data.resolutionStatus as ResolutionStatus,
      progTechName: data.progTechName,
      progTechDate: data.progTechDate,
      progTechSignature: data.progTechSignature || undefined,
      clientSignName: data.clientSignName,
      clientSignDate: data.clientSignDate,
      clientSignature: data.clientSignature || undefined,
      documents: {
        passwordRecords: data.passwordRecords,
        deliveryNotes: data.deliveryNotes,
        configuration: data.configuration,
        rentMaterial: data.rentMaterial,
        others: data.others,
      },
    }

    if (isEdit && id) {
      await updateReport(id, reportData)
      navigate(`/reports/${id}`)
    } else {
      const created = await addReport(reportData)
      if (created) navigate(`/reports/${created.id}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Report' : 'New Service Report'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Job Header</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Project Code</Label>
              <ProjectSelect
                value={selectedProject}
                onChange={handleProjectChange}
                placeholder="Select project code"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="docRef">Doc Ref</Label>
              <div className="flex gap-2">
                <Input id="docRef" className="flex-1" {...register('docRef')} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={regenerateDocRef}
                  disabled={!selectedProject && !watch('docRef')}
                  title="Generate doc ref"
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
              {errors.docRef && <p className="text-xs text-red-500">{errors.docRef.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lpoContractRef">LPO / Contract Ref</Label>
              <Input id="lpoContractRef" {...register('lpoContractRef')} />
              {errors.lpoContractRef && <p className="text-xs text-red-500">{errors.lpoContractRef.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="txn">TXN</Label>
              <Input id="txn" {...register('txn')} />
              {errors.txn && <p className="text-xs text-red-500">{errors.txn.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Client & Project Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="clientName">Client Name</Label>
              <Input id="clientName" {...register('clientName')} />
              {errors.clientName && <p className="text-xs text-red-500">{errors.clientName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="projectName">Project Name</Label>
              <Input id="projectName" {...register('projectName')} />
              {errors.projectName && <p className="text-xs text-red-500">{errors.projectName.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Type of Jobs</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {jobTypeOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={watchedJobTypes.includes(opt.value)}
                    onCheckedChange={() => toggleJobType(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {errors.jobTypes && <p className="mt-1 text-xs text-red-500">{errors.jobTypes.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Complaints / Nature of Jobs</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={3} {...register('complaints')} />
            {errors.complaints && <p className="text-xs text-red-500">{errors.complaints.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Actions Taken & Resolution Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="actionsTaken">Actions Taken</Label>
              <Textarea id="actionsTaken" rows={4} {...register('actionsTaken')} />
              {errors.actionsTaken && <p className="text-xs text-red-500">{errors.actionsTaken.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="resolutionStatus">Resolution Status</Label>
              <Select
                value={watch('resolutionStatus')}
                onValueChange={(v) => v && setValue('resolutionStatus', v, { shouldValidate: true })}
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
              {errors.resolutionStatus && <p className="text-xs text-red-500">{errors.resolutionStatus.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Sign-Off</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium text-sm">Prog Tech</h3>
              <div className="space-y-1">
                <Label htmlFor="progTechName">Name</Label>
                <Select
                  value={watch('progTechName')}
                  onValueChange={(v) => v && setValue('progTechName', v, { shouldValidate: true })}
                >
                  <SelectTrigger id="progTechName">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={userLabel(u)}>{userLabel(u)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.progTechName && <p className="text-xs text-red-500">{errors.progTechName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="progTechDate">Date</Label>
                <Input id="progTechDate" type="date" {...register('progTechDate')} />
                {errors.progTechDate && <p className="text-xs text-red-500">{errors.progTechDate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Signature</Label>
                <SignaturePad
                  value={watch('progTechSignature') || null}
                  onChange={(sig) => setValue('progTechSignature', sig ?? '')}
                  placeholder="Prog tech signature"
                />
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium text-sm">Client</h3>
              <div className="space-y-1">
                <Label htmlFor="clientSignName">Name</Label>
                <Input id="clientSignName" {...register('clientSignName')} />
                {errors.clientSignName && <p className="text-xs text-red-500">{errors.clientSignName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientSignDate">Date</Label>
                <Input id="clientSignDate" type="date" {...register('clientSignDate')} />
                {errors.clientSignDate && <p className="text-xs text-red-500">{errors.clientSignDate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Signature</Label>
                <SignaturePad
                  value={watch('clientSignature') || null}
                  onChange={(sig) => setValue('clientSignature', sig ?? '')}
                  placeholder="Client signature"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Attached Documents</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { key: 'passwordRecords' as const, label: 'Password Records' },
                { key: 'deliveryNotes' as const, label: 'Delivery Notes' },
                { key: 'configuration' as const, label: 'Configuration' },
                { key: 'rentMaterial' as const, label: 'Rent Material' },
                { key: 'others' as const, label: 'Others' },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={docChecked[key]} onCheckedChange={(v) => setValue(key, !!v)} />
                  {label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <Trash2 className="size-4" />
            Cancel
          </Button>
          <Button type="submit">
            <Save className="size-4" />
            {isEdit ? 'Update Report' : 'Save Report'}
          </Button>
        </div>
      </form>
    </div>
  )
}
