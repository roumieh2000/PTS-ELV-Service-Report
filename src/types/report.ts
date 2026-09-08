export type ResolutionStatus = 'Resolved' | 'Pending' | 'Escalated' | 'Partial'
export type JobType = 'AMC' | 'Service Calls' | 'Project' | 'Jobwise' | 'Completion'

export interface ServiceReport {
  id: string
  docRef: string
  lpoContractRef: string
  date: string
  txn: string
  clientName: string
  projectName: string
  jobTypes: JobType[]
  complaints: string
  actionsTaken: string
  resolutionStatus: ResolutionStatus
  progTechName: string
  progTechDate: string
  progTechSignature?: string
  clientSignName: string
  clientSignDate: string
  clientSignature?: string
  documents: {
    passwordRecords: boolean
    deliveryNotes: boolean
    configuration: boolean
    rentMaterial: boolean
    others: boolean
  }
  createdAt: string
  updatedAt: string
}
