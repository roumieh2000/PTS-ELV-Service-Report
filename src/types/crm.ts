export type FollowUpStatus = 'Open' | 'In Progress' | 'Done' | 'Cancelled'

export interface CrmClient {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  city: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CrmFollowUp {
  id: string
  clientId: string
  reportId?: string
  visitId?: string
  assignedTo: string
  task: string
  dueDate: string
  status: FollowUpStatus
  createdAt: string
  updatedAt: string
}