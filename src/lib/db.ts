import type { ServiceReport } from '@/types/report'
import { log } from '@/lib/logger'

const STORAGE_KEY = 'elv-service-reports'

const seedReports: ServiceReport[] = [
  {
    id: 'seed-1',
    docRef: 'SR-2026-001',
    lpoContractRef: 'LPO-2026-0042',
    date: '2026-04-15',
    txn: 'TXN-8891',
    clientName: 'Dubai Tech Solutions',
    projectName: 'Smart Office BMS Integration',
    jobTypes: ['Project', 'Completion'],
    complaints: 'BMS gateway not communicating with HVAC controllers. Intermittent packet loss observed on Modbus RTU loop.',
    actionsTaken: 'Replaced faulty BMS gateway module. Re-terminated Modbus RTU wiring at panel DB-03. Full system reboot and loop test performed. All 12 HVAC controllers responding within expected latency.',
    resolutionStatus: 'Resolved',
    progTechName: 'Ahmed Al Mansouri',
    progTechDate: '2026-04-15',
    clientSignName: 'John Smith',
    clientSignDate: '2026-04-15',
    documents: { passwordRecords: true, deliveryNotes: true, configuration: true, rentMaterial: false, others: false },
    createdAt: '2026-04-15T08:30:00Z',
    updatedAt: '2026-04-15T08:30:00Z',
  },
  {
    id: 'seed-2',
    docRef: 'SR-2026-002',
    lpoContractRef: 'LPO-2026-0098',
    date: '2026-04-22',
    txn: 'TXN-9023',
    clientName: 'Al Ghurair Properties',
    projectName: 'Residential Tower ELV Systems',
    jobTypes: ['Service Calls'],
    complaints: 'Fire alarm panel FA-02 showing ground fault on loop B. Tenants reporting intermittent false alarms in zones 14-18.',
    actionsTaken: 'Traced ground fault to water-damaged detector head in zone 16 riser room. Replaced detector head and sealed conduit entry. Performed loop resistance test (1.2MΩ, within spec). Reset panel and monitored for 2 hours — no further faults.',
    resolutionStatus: 'Resolved',
    progTechName: 'Khalid Hassan',
    progTechDate: '2026-04-22',
    clientSignName: 'Rashid Al Ghurair',
    clientSignDate: '2026-04-22',
    documents: { passwordRecords: false, deliveryNotes: true, configuration: false, rentMaterial: false, others: true },
    createdAt: '2026-04-22T10:15:00Z',
    updatedAt: '2026-04-22T10:15:00Z',
  },
  {
    id: 'seed-3',
    docRef: 'SR-2026-003',
    lpoContractRef: 'LPO-2026-0155',
    date: '2026-05-02',
    txn: 'TXN-9156',
    clientName: 'Sharjah National Oil Co',
    projectName: 'Warehouse Security Upgrade',
    jobTypes: ['AMC', 'Service Calls'],
    complaints: 'CCTV NVR unit SN-NVR-03 not recording on channels 9-16. Access control reader at Gate B failing card swipes intermittently.',
    actionsTaken: 'Replaced faulty SATA cable on NVR-03 and reformatted RAID array — channels 9-16 now recording. Updated firmware on Gate B reader (FW v4.21→v4.28). Replaced reader cable assembly. Awaiting replacement reader head under warranty from supplier.',
    resolutionStatus: 'Pending',
    progTechName: 'Saeed Al Ameri',
    progTechDate: '2026-05-02',
    clientSignName: 'Mohammed Al Ketbi',
    clientSignDate: '2026-05-02',
    documents: { passwordRecords: true, deliveryNotes: true, configuration: true, rentMaterial: true, others: false },
    createdAt: '2026-05-02T14:00:00Z',
    updatedAt: '2026-05-02T14:00:00Z',
  },
]

export function initDB(): ServiceReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as ServiceReport[]
      log('info', 'DB loaded from localStorage', { count: data.length })
      return data
    }
  } catch (e) {
    log('error', 'Failed to load DB, re-initializing with seeds', e)
    localStorage.removeItem(STORAGE_KEY)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedReports))
  log('info', 'DB seeded with sample reports', { count: seedReports.length })
  return [...seedReports]
}

export function saveReports(reports: ServiceReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
  } catch (e) {
    log('error', 'Failed to save reports', e)
  }
}

export function generateId(): string {
  return crypto.randomUUID()
}
