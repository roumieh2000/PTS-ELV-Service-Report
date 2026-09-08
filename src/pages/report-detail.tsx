import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowLeft, Edit, Trash2, Check, X, Share2, PenLine } from 'lucide-react'
import { SignaturePad } from '@/components/signature-pad'
import { useReportStore } from '@/stores/reportStore'
import { useAuthStore } from '@/stores/authStore'
import { generateReportPdf } from '@/lib/pdf'
import { log } from '@/lib/logger'

const statusStyles: Record<string, string> = {
  Resolved: 'bg-emerald-100 text-emerald-800',
  Pending: 'bg-amber-100 text-amber-800',
  Escalated: 'bg-red-100 text-red-800',
  Partial: 'bg-blue-100 text-blue-800',
}

export function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const report = useReportStore((s) => (id ? s.getReport(id) : undefined))
  const reportsLoading = useReportStore((s) => s.loading)
  const deleteReport = useReportStore((s) => s.deleteReport)
  const updateReport = useReportStore((s) => s.updateReport)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const canSign = hasPermission('reports:sign')
  const [signing, setSigning] = useState(false)
  const [draftSignature, setDraftSignature] = useState<string | null>(null)

  if (reportsLoading && !report) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">
            Loading report...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="size-4" />
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">
            Report not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleShare() {
    if (!report) return
    try {
      const pdfBlob = await generateReportPdf(report)
      const file = new File([pdfBlob], `${report.docRef}.pdf`, { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Service Report ${report.docRef}` })
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = `${report.docRef}.pdf`
        a.click()
        const reportUrl = `${window.location.origin}/reports/${report.id}`
        const msg = [
          `ELV Service Report: ${report.docRef}`,
          `Client: ${report.clientName}`,
          `Project: ${report.projectName}`,
          `Status: ${report.resolutionStatus}`,
          ``,
          `Open this link to review and sign: ${reportUrl}`,
          `PDF has been downloaded — please attach it manually.`,
        ].join('\n')
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
      }
      URL.revokeObjectURL(url)
    } catch (e) {
      log('error', 'Failed to share PDF', e)
    }
  }

  async function handleDelete() {
    if (id) {
      await deleteReport(id)
      navigate('/')
    }
  }

  async function applyClientSignature() {
    if (!id || !draftSignature) return
    await updateReport(id, { clientSignature: draftSignature })
    setDraftSignature(null)
    setSigning(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold">{report.docRef}</h1>
          <Badge className={statusStyles[report.resolutionStatus]}>{report.resolutionStatus}</Badge>
        </div>
        <div className="flex gap-2">
          {hasPermission('reports:export') && (
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="size-4" />
              Share
            </Button>
          )}
          {hasPermission('reports:edit') && (
            <Link to={`/reports/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="size-4" />
                Edit
              </Button>
            </Link>
          )}
          {hasPermission('reports:delete') && (
            <Dialog>
              <DialogTrigger render={<Button variant="destructive" size="sm"><Trash2 className="size-4" />Delete</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Report?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. Report <strong>{report.docRef}</strong> will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                  <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Job Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Doc Ref:</span> <span className="font-medium">{report.docRef}</span></div>
          <div><span className="text-muted-foreground">LPO/Contract Ref:</span> <span className="font-medium">{report.lpoContractRef}</span></div>
          <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(report.date).toLocaleDateString()}</span></div>
          <div><span className="text-muted-foreground">TXN:</span> <span className="font-medium">{report.txn}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Client & Project</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{report.clientName}</span></div>
          <div><span className="text-muted-foreground">Project:</span> <span className="font-medium">{report.projectName}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Type of Jobs</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {report.jobTypes.map((j) => (
              <Badge key={j} variant="secondary">{j}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Complaints / Nature of Jobs</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{report.complaints}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Actions Taken</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{report.actionsTaken}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Sign-Off</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h3 className="font-medium">Prog Tech</h3>
            <p><span className="text-muted-foreground">Name:</span> {report.progTechName}</p>
            <p><span className="text-muted-foreground">Date:</span> {new Date(report.progTechDate).toLocaleDateString()}</p>
            {report.progTechSignature ? (
              <img src={report.progTechSignature} alt="Prog tech signature" className="mt-2 h-24 rounded-lg border bg-white object-contain p-2" />
            ) : (
              <p className="text-xs italic text-neutral-400">No signature</p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Client</h3>
            <p><span className="text-muted-foreground">Name:</span> {report.clientSignName}</p>
            <p><span className="text-muted-foreground">Date:</span> {new Date(report.clientSignDate).toLocaleDateString()}</p>
            {signing && canSign ? (
              <div className="space-y-2 pt-1">
                <SignaturePad value={draftSignature} onChange={setDraftSignature} placeholder="Client signature" />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={!draftSignature} onClick={applyClientSignature}>
                    <PenLine className="size-3.5" />
                    Apply Signature
                  </Button>
                  {report.clientSignature && (
                    <Button size="sm" variant="ghost" onClick={() => { setSigning(false); setDraftSignature(null) }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : report.clientSignature ? (
              <div className="space-y-2">
                <img src={report.clientSignature} alt="Client signature" className="mt-2 h-24 rounded-lg border bg-white object-contain p-2" />
                {canSign && (
                  <Button size="sm" variant="outline" onClick={() => { setSigning(true); setDraftSignature(null) }}>
                    <PenLine className="size-3.5" />
                    Re-sign
                  </Button>
                )}
              </div>
            ) : canSign ? (
              <Button size="sm" variant="outline" onClick={() => setSigning(true)}>
                <PenLine className="size-3.5" />
                Add Signature
              </Button>
            ) : (
              <p className="text-xs italic text-neutral-400">No signature</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Attached Documents</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {([
              { key: 'passwordRecords', label: 'Password Records' },
              { key: 'deliveryNotes', label: 'Delivery Notes' },
              { key: 'configuration', label: 'Configuration' },
              { key: 'rentMaterial', label: 'Rent Material' },
              { key: 'others', label: 'Others' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                {report.documents[key] ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <X className="size-4 text-neutral-300" />
                )}
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
