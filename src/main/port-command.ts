import { exec, type ExecException, type ChildProcess } from 'child_process'

export interface CommandResult {
  stdout: string
  stderr: string
  code: number
}

export const COMMAND_TIMEOUT_MS = 8000

export function runCommand(
  command: string,
  timeoutMs = COMMAND_TIMEOUT_MS
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess
    // The watchdog also settles the promise if a descendant keeps a pipe open.
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(Object.assign(new Error('System command timed out'), { code: 'COMMAND_TIMEOUT' }))
    }, timeoutMs)
    try {
      child = exec(
        process.platform === 'win32' ? command : `exec ${command}`,
        {
          timeout: timeoutMs,
          killSignal: 'SIGKILL',
          maxBuffer: 8 * 1024 * 1024,
          windowsHide: true,
          env: { ...process.env, LC_ALL: 'C', LANG: 'C' }
        },
        (error: ExecException | null, stdout, stderr) => {
          clearTimeout(timer)
          if (error && typeof error.code !== 'number') {
            reject(error)
            return
          }
          resolve({ stdout, stderr, code: error?.code ?? 0 })
        }
      )
    } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
}

export function commandMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function isCommandTimeout(error: unknown): boolean {
  const details = error as { code?: string | number; killed?: boolean }
  return details?.code === 'COMMAND_TIMEOUT' || (details?.killed === true && details.code == null)
}
