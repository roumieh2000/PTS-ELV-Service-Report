export type VisitStatus = 'Done' | 'Pending' | 'Cancelled'

export interface Visit {
  id: string
  date: string
  time: string
  clientName: string
  personInCharge: string
  projectCode?: string
  notes?: string
  reportId?: string
  clientId?: string
  status: VisitStatus
  invoiceFollowup?: string
  createdAt: string
  updatedAt: string
}