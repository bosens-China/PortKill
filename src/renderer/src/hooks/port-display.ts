import type { PortScanResult, PortStatus } from '../../../shared/port'

export interface DisplayPortStatus {
  port: number
  processes: PortStatus[]
  name?: string
  pid?: string
  /** undefined means this scan could not establish the port state. */
  active?: boolean
  canKill: boolean
}

export function combinePortStatuses(
  watched: number[],
  result: PortScanResult
): DisplayPortStatus[] {
  return watched
    .map((port): DisplayPortStatus => {
      const processes = result.statuses.filter((status) => status.port === port)
      return {
        port,
        processes,
        name: processes.map(({ name }) => name).join(', '),
        pid: processes.map(({ pid }) => pid).join(', '),
        active: result.errorCode ? undefined : processes.length > 0,
        canKill:
          !result.errorCode &&
          processes.length > 0 &&
          processes.every(({ startedAt }) => !!startedAt)
      }
    })
    .sort((a, b) => a.port - b.port)
}
