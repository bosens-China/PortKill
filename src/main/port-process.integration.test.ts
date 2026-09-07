import { spawn, type ChildProcess } from 'child_process'
import { once } from 'events'
import { afterEach, describe, expect, it } from 'vitest'
import { checkPorts } from './port-process'
import { killProcesses } from './kill-process'

const children: ChildProcess[] = []

afterEach(async () => {
  await Promise.all(
    children.splice(0).map(async (child) => {
      if (child.exitCode !== null || child.signalCode !== null) return
      const exited = once(child, 'exit')
      child.kill('SIGKILL')
      await exited
    })
  )
})

async function listener(host: string, port = 0): Promise<{ pid: number; port: number }> {
  const script = `
    const net = require('net');
    const server = net.createServer();
    server.listen({ host: ${JSON.stringify(host)}, port: ${port}, ipv6Only: true }, () => {
      console.log(server.address().port);
    });
  `
  const child = spawn(process.execPath, ['-e', script], { stdio: ['ignore', 'pipe', 'pipe'] })
  children.push(child)
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.stderr!.once('data', (data) => reject(new Error(String(data))))
    child.stdout!.once('data', (data) =>
      resolve({ pid: child.pid!, port: Number(String(data).trim()) })
    )
  })
}

describe('native port commands', () => {
  it.each([false, true])(
    'ends both IPv4/IPv6 owners with force=%s',
    async (force) => {
      const first = await listener('127.0.0.1')
      const second = await listener('::1', first.port)
      const scan = await checkPorts([first.port])
      expect(scan.errorCode).toBeUndefined()
      // Never invoke termination if discovery returned anything except our own test children.
      expect(scan.statuses.map(({ pid }) => pid).sort()).toEqual([first.pid, second.pid].sort())
      expect(scan.statuses.every(({ startedAt }) => !!startedAt)).toBe(true)
      let result = await killProcesses(scan.statuses, force)
      const ended = [...(result.endedPids ?? [])]
      if (process.platform === 'win32' && !force && !result.success) {
        // Windows console processes can require /F rather than graceful termination.
        expect(result.errorCode).toBe('FORCE_REQUIRED')
        const remaining = await checkPorts([first.port])
        expect(remaining.statuses.every(({ pid }) => [first.pid, second.pid].includes(pid))).toBe(
          true
        )
        result = await killProcesses(remaining.statuses, true)
        ended.push(...(result.endedPids ?? []))
      }
      expect(result).toMatchObject({ success: true })
      expect(ended.sort()).toEqual([first.pid, second.pid].sort())
      expect(await checkPorts([first.port])).toEqual({ statuses: [] })
    },
    60000
  )

  it('rejects stale process identity without terminating a live listener', async () => {
    const own = await listener('127.0.0.1')
    const scan = await checkPorts([own.port])
    expect(scan.statuses).toHaveLength(1)
    expect(scan.statuses[0].pid).toBe(own.pid)
    const result = await killProcesses([{ ...scan.statuses[0], startedAt: 'stale' }], true)
    expect(result).toMatchObject({ success: false, errorCode: 'TARGET_CHANGED' })
    expect(process.kill(own.pid, 0)).toBe(true)
  }, 30000)
})
