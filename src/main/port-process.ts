import type { PortScanResult, PortStatus } from '../shared/port'
import { commandMessage, isCommandTimeout, runCommand } from './port-command'
import { parseLsof, parseWindowsNetstat } from './port-parsers'
import { readProcessIdentities } from './process-identity'

export { parseLsof, parseWindowsNetstat } from './port-parsers'

export async function checkPorts(ports: number[]): Promise<PortScanResult> {
  if (ports.length === 0) return { statuses: [] }
  const watched = new Set(ports)
  try {
    const windows = process.platform === 'win32'
    const result = await runCommand(
      windows ? 'netstat -ano' : 'lsof -iTCP -sTCP:LISTEN -P -n -Fpcn'
    )
    if (!windows && result.code === 127) {
      return { statuses: [], errorCode: 'LSOF_NOT_FOUND', error: result.stderr }
    }
    // lsof uses 1 both for no matches and genuine errors. Never hide diagnostics.
    const emptyLsof =
      !windows && result.code === 1 && !result.stdout.trim() && !result.stderr.trim()
    if (!emptyLsof && (result.code !== 0 || result.stderr.trim())) {
      return {
        statuses: [],
        errorCode: 'SCAN_FAILED',
        error: result.stderr || `Exit ${result.code}`
      }
    }
    const statuses = windows
      ? parseWindowsNetstat(result.stdout, watched)
      : parseLsof(result.stdout, watched)
    if (statuses.length === 0) return { statuses }
    // Failure to read start time must not turn a known listener into an idle port.
    try {
      const identities = await readProcessIdentities(statuses.map(({ pid }) => pid))
      return {
        statuses: statuses.map((status): PortStatus => ({
          ...status,
          name: windows ? (identities.get(status.pid)?.name ?? status.name) : status.name,
          startedAt: identities.get(status.pid)?.startedAt
        }))
      }
    } catch {
      return { statuses }
    }
  } catch (error) {
    return {
      statuses: [],
      errorCode: isCommandTimeout(error) ? 'SCAN_TIMEOUT' : 'SCAN_FAILED',
      error: commandMessage(error)
    }
  }
}
