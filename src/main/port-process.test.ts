import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  classifyKillError,
  parseLsof,
  parseWindowsNetstat,
  waitForProcessExit
} from './port-process'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('parseWindowsNetstat', () => {
  it('matches exact watched ports instead of substrings', () => {
    const output = [
      '  Proto  Local Address          Foreign Address        State           PID',
      '  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       1200',
      '  TCP    127.0.0.1:80           0.0.0.0:0              LISTENING       1300'
    ].join('\r\n')

    expect(parseWindowsNetstat(output, new Set([80]))).toEqual([
      { port: 80, pid: 1300, name: 'Unknown' }
    ])
  })

  it('parses IPv6 listeners and keeps ports sharing one process', () => {
    const output = [
      '  TCP    [::]:3000              [::]:0                 LISTENING       2000',
      '  TCP    [::1]:3001             [::]:0                 LISTENING       2000'
    ].join('\r\n')

    expect(parseWindowsNetstat(output, new Set([3000, 3001]))).toEqual([
      { port: 3000, pid: 2000, name: 'Unknown' },
      { port: 3001, pid: 2000, name: 'Unknown' }
    ])
  })
})

describe('parseLsof', () => {
  it('parses IPv4 and IPv6 listeners for watched ports', () => {
    const output = [
      'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME',
      'node 123 user 24u IPv6 0x123 0t0 TCP *:3000 (LISTEN)',
      'postgres 456 user 10u IPv4 0x456 0t0 TCP 127.0.0.1:5432 (LISTEN)',
      'redis 789 user 11u IPv4 0x789 0t0 TCP *:6379 (LISTEN)'
    ].join('\n')

    expect(parseLsof(output, new Set([3000, 5432]))).toEqual([
      { port: 3000, pid: 123, name: 'node' },
      { port: 5432, pid: 456, name: 'postgres' }
    ])
  })
})

describe('classifyKillError', () => {
  it('prioritizes permission errors on every platform', () => {
    expect(classifyKillError('ERROR: Access is denied.', false, 'win32')).toBe('PERMISSION_DENIED')
    expect(classifyKillError('kill: Operation not permitted', true, 'linux')).toBe(
      'PERMISSION_DENIED'
    )
  })

  it('suggests force kill for a non-force Windows failure', () => {
    expect(
      classifyKillError('This process can only be terminated forcefully', false, 'win32')
    ).toBe('FORCE_REQUIRED')
  })
})

describe('waitForProcessExit', () => {
  it('resolves only after the process no longer exists', async () => {
    vi.useFakeTimers()
    const missingProcess = Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' })
    const kill = vi
      .spyOn(process, 'kill')
      .mockReturnValueOnce(true)
      .mockImplementationOnce(() => {
        throw missingProcess
      })

    const waiting = waitForProcessExit(3009)
    await vi.advanceTimersByTimeAsync(100)

    await expect(waiting).resolves.toBeUndefined()
    expect(kill).toHaveBeenNthCalledWith(1, 3009, 0)
    expect(kill).toHaveBeenNthCalledWith(2, 3009, 0)
  })
})
