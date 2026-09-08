export type CityCode =
  | 'AUH'
  | 'SHJ'
  | 'DXB'
  | 'AJM'
  | 'UAQ'
  | 'ALA'
  | 'RAK'
  | 'FUJ'

export const CITIES: CityCode[] = ['AUH', 'SHJ', 'DXB', 'AJM', 'UAQ', 'ALA', 'RAK', 'FUJ']

export interface ProjectCode {
  id: string
  city: CityCode
  number: string
  clientRef: string
  code: string
  createdAt: string
  updatedAt: string
}

/** Builds the project code: City-Number_ClientRef, e.g. AJM-032_DesignConsultants\K1-DVR */
export function formatProjectCode(city: CityCode, number: string, clientRef: string): string {
  const num = number.trim()
  const client = clientRef.trim()
  return `${city}-${num}${client ? `_${client}` : ''}`
}