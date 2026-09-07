import { runCommand } from './port-command'

export interface ProcessIdentity {
  name: string
  startedAt?: string
}

export function parsePs(stdout: string): Map<number, ProcessIdentity> {
  const identities = new Map<number, ProcessIdentity>()
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/
    )
    if (match) {
      identities.set(Number(match[1]), {
        name: match[3].trim(),
        startedAt: `${match[2].replace(/\s+/g, ' ')}:${match[3].trim()}`
      })
    }
  }
  return identities
}

export function parseWindowsProcesses(stdout: string): Map<number, ProcessIdentity> {
  const identities = new Map<number, ProcessIdentity>()
  if (!stdout.trim()) return identities
  const parsed: unknown = JSON.parse(stdout.replace(/^\uFEFF/, ''))
  for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
    if (
      !item ||
      !Number.isSafeInteger(item.pid) ||
      item.pid <= 0 ||
      typeof item.name !== 'string'
    ) {
      throw new Error('Invalid process identity output')
    }
    identities.set(item.pid, {
      name: item.name,
      startedAt:
        typeof item.startedAt === 'string' && /^\d+$/.test(item.startedAt)
          ? item.startedAt
          : undefined
    })
  }
  return identities
}

export async function readProcessIdentities(pids: number[]): Promise<Map<number, ProcessIdentity>> {
  const identities = new Map<number, ProcessIdentity>()
  const unique = [...new Set(pids)]
  if (unique.some((pid) => !Number.isSafeInteger(pid) || pid <= 0 || pid > 2147483647)) {
    throw new Error('Invalid process ID')
  }
  // Bound both command length (cmd.exe) and the number of concurrent native commands.
  for (let offset = 0; offset < unique.length; offset += 100) {
    const ids = unique.slice(offset, offset + 100).join(',')
    let command = `/bin/ps -p ${ids} -o pid= -o lstart= -o comm=`
    if (process.platform === 'win32') {
      const script = [
        '[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)',
        `$items = @(Get-Process -Id ${ids} -ErrorAction SilentlyContinue | ForEach-Object {`,
        '$started = $null; try { $started = $_.StartTime.ToUniversalTime().Ticks.ToString() } catch {}',
        '[pscustomobject]@{ pid = $_.Id; name = $_.ProcessName; startedAt = $started }',
        '})',
        'ConvertTo-Json -InputObject $items -Compress'
      ].join('\n')
      command = `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(script, 'utf16le').toString('base64')}`
    }
    const result = await runCommand(command)
    if (result.code !== 0 && !(result.code === 1 && !result.stderr.trim())) {
      throw new Error(result.stderr || 'Cannot read process identities')
    }
    const batch =
      process.platform === 'win32' ? parseWindowsProcesses(result.stdout) : parsePs(result.stdout)
    for (const [pid, identity] of batch) identities.set(pid, identity)
  }
  return identities
}
