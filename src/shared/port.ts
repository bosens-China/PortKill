export interface PortStatus {
  port: number
  pid: number
  name: string
}

export type PortScanErrorCode = 'LSOF_NOT_FOUND' | 'SCAN_FAILED'

export interface PortScanResult {
  statuses: PortStatus[]
  errorCode?: PortScanErrorCode
  error?: string
}

export type ProcessActionErrorCode =
  'INVALID_REQUEST' | 'PERMISSION_DENIED' | 'PROCESS_NOT_FOUND' | 'FORCE_REQUIRED' | 'KILL_FAILED'

export interface ProcessActionResult {
  success: boolean
  errorCode?: ProcessActionErrorCode
  error?: string
}
