import { exec, type ExecException } from 'child_process'
import type {
  PortScanResult,
  PortStatus,
  ProcessActionErrorCode,
  ProcessActionResult
} from '../shared/port'

interface CommandError extends ExecException {
  stderr?: string
}

function execPromise(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        const commandError = error as CommandError
        commandError.stderr = stderr
        reject(commandError)
        return
      }
      resolve(stdout)
    })
  })
}

function parseEndpointPort(endpoint: string): number | null {
  const separatorIndex = endpoint.lastIndexOf(':')
  if (separatorIndex === -1) return null

  const port = Number(endpoint.slice(separatorIndex + 1))
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null
}

export function parseWindowsNetstat(stdout: string, watchedPorts: Set<number>): PortStatus[] {
  const statuses = new Map<number, PortStatus>()

  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 5 || parts[0].toUpperCase() !== 'TCP') continue

    const state = parts[parts.length - 2]?.toUpperCase()
    if (state !== 'LISTENING') continue

    const port = parseEndpointPort(parts[1])
    const pid = Number(parts[parts.length - 1])
    if (
      port === null ||
      !watchedPorts.has(port) ||
      !Number.isInteger(pid) ||
      pid <= 0 ||
      statuses.has(port)
    ) {
      continue
    }

    statuses.set(port, { port, pid, name: 'Unknown' })
  }

  return [...statuses.values()]
}

export function parseLsof(stdout: string, watchedPorts: Set<number>): PortStatus[] {
  const statuses = new Map<number, PortStatus>()

  for (const line of stdout.split(/\r?\n/).slice(1)) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 9) continue

    const protocolIndex = parts.findIndex((part) => part === 'TCP')
    if (protocolIndex === -1 || protocolIndex + 1 >= parts.length) continue

    const port = parseEndpointPort(parts[protocolIndex + 1])
    const pid = Number(parts[1])
    if (
      port === null ||
      !watchedPorts.has(port) ||
      !Number.isInteger(pid) ||
      pid <= 0 ||
      statuses.has(port)
    ) {
      continue
    }

    statuses.set(port, { port, pid, name: parts[0] || 'Unknown' })
  }

  return [...statuses.values()]
}

function parseTasklistName(stdout: string): string {
  const firstLine = stdout.trim().split(/\r?\n/)[0]
  const match = firstLine?.match(/^"((?:[^"]|"")*)"/)
  return match?.[1]?.replace(/""/g, '"') || 'Unknown'
}

async function enrichWindowsProcessNames(statuses: PortStatus[]): Promise<PortStatus[]> {
  const namesByPid = new Map<number, string>()
  const uniquePids = [...new Set(statuses.map((status) => status.pid))]

  await Promise.all(
    uniquePids.map(async (pid) => {
      try {
        const stdout = await execPromise(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`)
        namesByPid.set(pid, parseTasklistName(stdout))
      } catch {
        namesByPid.set(pid, 'Unknown')
      }
    })
  )

  return statuses.map((status) => ({
    ...status,
    name: namesByPid.get(status.pid) || 'Unknown'
  }))
}

function getCommandMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const commandError = error as CommandError
  return commandError.stderr?.trim() || commandError.message
}

function isCommandNotFound(error: unknown, command: string): boolean {
  const commandError = error as CommandError
  const message = getCommandMessage(error).toLowerCase()
  return commandError.code === 127 || message.includes(`${command}: not found`)
}

export async function checkPorts(ports: number[]): Promise<PortScanResult> {
  if (ports.length === 0) return { statuses: [] }

  const watchedPorts = new Set(ports)

  try {
    if (process.platform === 'win32') {
      const stdout = await execPromise('netstat -ano -p tcp')
      const statuses = parseWindowsNetstat(stdout, watchedPorts)
      return { statuses: await enrichWindowsProcessNames(statuses) }
    }

    try {
      const stdout = await execPromise('lsof -iTCP -sTCP:LISTEN -P -n')
      return { statuses: parseLsof(stdout, watchedPorts) }
    } catch (error) {
      const commandError = error as CommandError
      if (commandError.code === 1) return { statuses: [] }
      if (isCommandNotFound(error, 'lsof')) {
        return {
          statuses: [],
          errorCode: 'LSOF_NOT_FOUND',
          error: getCommandMessage(error)
        }
      }
      throw error
    }
  } catch (error) {
    return {
      statuses: [],
      errorCode: 'SCAN_FAILED',
      error: getCommandMessage(error)
    }
  }
}

export function classifyKillError(
  errorMessage: string,
  force: boolean,
  platform: NodeJS.Platform = process.platform
): ProcessActionErrorCode {
  const message = errorMessage.toLowerCase()

  if (
    message.includes('access is denied') ||
    message.includes('operation not permitted') ||
    message.includes('permission denied') ||
    message.includes('eacces')
  ) {
    return 'PERMISSION_DENIED'
  }

  if (
    message.includes('no such process') ||
    message.includes('not found') ||
    message.includes('no running instance')
  ) {
    return 'PROCESS_NOT_FOUND'
  }

  if (platform === 'win32' && !force) return 'FORCE_REQUIRED'
  return 'KILL_FAILED'
}

export async function killProcess(pid: number, force: boolean): Promise<ProcessActionResult> {
  try {
    if (process.platform === 'win32') {
      await execPromise(`taskkill /PID ${pid}${force ? ' /F' : ''}`)
    } else {
      await execPromise(`kill ${force ? '-9' : '-15'} ${pid}`)
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      errorCode: classifyKillError(getCommandMessage(error), force),
      error: getCommandMessage(error)
    }
  }
}
