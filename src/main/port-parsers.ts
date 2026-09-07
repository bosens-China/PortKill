import type { PortStatus } from '../shared/port'

function endpointPort(endpoint: string): number | null {
  const separator = endpoint.lastIndexOf(':')
  if (separator === -1) return null
  const port = Number(endpoint.slice(separator + 1))
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null
}

function addStatus(
  statuses: Map<string, PortStatus>,
  watched: Set<number>,
  endpoint: string,
  pid: number,
  name: string
): void {
  const port = endpointPort(endpoint)
  if (port === null || !watched.has(port) || !Number.isSafeInteger(pid) || pid <= 0) return
  statuses.set(`${port}:${pid}`, { port, pid, name })
}

export function parseWindowsNetstat(stdout: string, watched: Set<number>): PortStatus[] {
  const statuses = new Map<string, PortStatus>()
  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/)
    if (parts.length !== 5 || parts[0].toUpperCase() !== 'TCP') continue
    if (parts[3].toUpperCase() !== 'LISTENING') continue
    addStatus(statuses, watched, parts[1], Number(parts[4]), 'Unknown')
  }
  return [...statuses.values()]
}

/** lsof -Fpcn uses tagged fields, independent of table widths and command names. */
export function parseLsof(stdout: string, watched: Set<number>): PortStatus[] {
  const statuses = new Map<string, PortStatus>()
  let pid = 0
  let name = 'Unknown'
  for (const line of stdout.split(/\r?\n/)) {
    const value = line.slice(1)
    if (line[0] === 'p') {
      pid = Number(value)
      name = 'Unknown'
    } else if (line[0] === 'c') {
      name = value || 'Unknown'
    } else if (line[0] === 'n') {
      addStatus(statuses, watched, value, pid, name)
    }
  }
  return [...statuses.values()]
}
