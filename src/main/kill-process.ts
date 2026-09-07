import type { ProcessActionErrorCode, ProcessActionResult, ProcessTarget } from '../shared/port'
import { checkPorts } from './port-process'
import { commandMessage, isCommandTimeout, runCommand } from './port-command'
import { readProcessIdentities } from './process-identity'

class ProcessActionError extends Error {
  constructor(
    readonly code: ProcessActionErrorCode,
    message: string = code
  ) {
    super(message)
  }
}

export function validateKillRequest(targets: unknown, force: unknown): ProcessTarget[] {
  if (
    !Array.isArray(targets) ||
    !targets.length ||
    targets.length > 10000 ||
    typeof force !== 'boolean'
  ) {
    throw new ProcessActionError('INVALID_REQUEST')
  }
  const valid = targets.every(
    (target) =>
      target &&
      Number.isSafeInteger(target.port) &&
      target.port > 0 &&
      target.port <= 65535 &&
      Number.isSafeInteger(target.pid) &&
      target.pid > 0 &&
      target.pid <= 2147483647 &&
      typeof target.startedAt === 'string' &&
      target.startedAt.length > 0 &&
      target.startedAt.length <= 4096
  )
  if (!valid) throw new ProcessActionError('INVALID_REQUEST')
  return targets.map(({ port, pid, startedAt }) => ({ port, pid, startedAt }))
}

export function classifyKillError(
  errorMessage: string,
  force: boolean,
  platform: NodeJS.Platform = process.platform
): ProcessActionErrorCode {
  const message = errorMessage.toLowerCase()
  if (
    /access is denied|operation not permitted|permission denied|eacces|eperm|拒绝访问|权限不足/.test(
      message
    )
  ) {
    return 'PERMISSION_DENIED'
  }
  if (/no such process|not found|no running instance|找不到.*进程|没有运行的.*实例/.test(message)) {
    return 'PROCESS_NOT_FOUND'
  }
  if (
    platform === 'win32' &&
    !force &&
    /can only be terminated forcefully|只能.*强制|只能.*强行/.test(message)
  ) {
    return 'FORCE_REQUIRED'
  }
  return 'KILL_FAILED'
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}

export async function waitForProcessExit(pid: number, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (isProcessRunning(pid)) {
    if (Date.now() >= deadline) throw new ProcessActionError('EXIT_TIMEOUT')
    await new Promise<void>((resolve) => setTimeout(resolve, 100))
  }
}

async function verifyTargets(targets: ProcessTarget[]): Promise<void> {
  const ports = [...new Set(targets.map(({ port }) => port))]
  const scan = await checkPorts(ports)
  if (scan.errorCode) throw new ProcessActionError('SCAN_FAILED')
  const key = (target: ProcessTarget): string => `${target.port}:${target.pid}:${target.startedAt}`
  const expected = new Set(targets.map(key))
  const actual = new Set(scan.statuses.map(key))
  if (expected.size !== actual.size || [...actual].some((value) => !expected.has(value))) {
    throw new ProcessActionError('TARGET_CHANGED')
  }
}

export async function killProcesses(input: unknown, force: unknown): Promise<ProcessActionResult> {
  const endedPids: number[] = []
  try {
    const targets = validateKillRequest(input, force)
    await verifyTargets(targets)
    const unique = new Map(targets.map((target) => [target.pid, target]))
    for (const target of unique.values()) {
      // Recheck immediately before each signal; a batch can take several seconds.
      const remaining = targets.filter(({ pid }) => !endedPids.includes(pid))
      await verifyTargets(remaining)
      const identity = (await readProcessIdentities([target.pid])).get(target.pid)
      if (!identity?.startedAt || identity.startedAt !== target.startedAt) {
        throw new ProcessActionError('TARGET_CHANGED')
      }
      const result = await runCommand(
        process.platform === 'win32'
          ? `taskkill /PID ${target.pid}${force ? ' /F' : ''}`
          : `/bin/kill ${force ? '-9' : '-15'} ${target.pid}`
      )
      if (result.code !== 0) {
        const message = result.stderr.trim() || result.stdout.trim() || `Exit ${result.code}`
        throw new ProcessActionError(classifyKillError(message, force as boolean), message)
      }
      await waitForProcessExit(target.pid)
      endedPids.push(target.pid)
    }
    const after = await checkPorts([...new Set(targets.map(({ port }) => port))])
    if (after.errorCode) throw new ProcessActionError('SCAN_FAILED')
    if (after.statuses.length) throw new ProcessActionError('PORT_STILL_OCCUPIED')
    return { success: true, endedPids }
  } catch (error) {
    const code =
      error instanceof ProcessActionError
        ? error.code
        : classifyKillError(commandMessage(error), Boolean(force))
    return {
      success: false,
      endedPids,
      errorCode: isCommandTimeout(error) ? 'COMMAND_TIMEOUT' : code,
      error: commandMessage(error)
    }
  }
}
