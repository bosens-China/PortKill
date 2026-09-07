export interface PortStatus {
  port: number
  pid: number
  name: string
  /** OS process start time; missing means the process cannot safely be terminated. */
  startedAt?: string
}

export type PortScanErrorCode = 'LSOF_NOT_FOUND' | 'SCAN_FAILED' | 'SCAN_TIMEOUT'

export interface PortScanResult {
  statuses: PortStatus[]
  errorCode?: PortScanErrorCode
  error?: string
}

export type ProcessActionErrorCode =
  | 'INVALID_REQUEST'
  | 'PERMISSION_DENIED'
  | 'PROCESS_NOT_FOUND'
  | 'FORCE_REQUIRED'
  | 'KILL_FAILED'
  | 'TARGET_CHANGED'
  | 'SCAN_FAILED'
  | 'COMMAND_TIMEOUT'
  | 'EXIT_TIMEOUT'
  | 'PORT_STILL_OCCUPIED'

export type ProcessTarget = Pick<PortStatus, 'port' | 'pid' | 'startedAt'>

export interface ProcessActionResult {
  success: boolean
  errorCode?: ProcessActionErrorCode
  error?: string
  endedPids?: number[]
}
