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
import { ArrowLeft, Edit, Trash2, Check, X } from 'lucide-react'
import { useReportStore } from '@/stores/reportStore'

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
  const deleteReport = useReportStore((s) => s.deleteReport)

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

  function handleDelete() {
    if (id) {
      deleteReport(id)
      navigate('/')
    }
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
          <Link to={`/reports/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="size-4" />
              Edit
            </Button>
          </Link>
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
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Client</h3>
            <p><span className="text-muted-foreground">Name:</span> {report.clientSignName}</p>
            <p><span className="text-muted-foreground">Date:</span> {new Date(report.clientSignDate).toLocaleDateString()}</p>
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
