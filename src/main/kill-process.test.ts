import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  classifyKillError,
  killProcesses,
  validateKillRequest,
  waitForProcessExit
} from './kill-process'
import { checkPorts } from './port-process'
import { readProcessIdentities } from './process-identity'
import { runCommand } from './port-command'
import type { PortStatus } from '../shared/port'

vi.mock('./port-process', () => ({ checkPorts: vi.fn() }))
vi.mock('./process-identity', () => ({ readProcessIdentities: vi.fn() }))
vi.mock('./port-command', async (original) => ({
  ...(await original<typeof import('./port-command')>()),
  runCommand: vi.fn()
}))
const a: PortStatus = { port: 3000, pid: 101, name: 'node', startedAt: 'start-a' }
const b: PortStatus = { port: 3000, pid: 102, name: 'node', startedAt: 'start-b' }
const missing = Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' })

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

function prepare(targets = [a, b]): void {
  vi.mocked(checkPorts).mockResolvedValue({ statuses: targets })
  vi.mocked(readProcessIdentities).mockResolvedValue(
    new Map(targets.map((target) => [target.pid, target]))
  )
  vi.mocked(runCommand).mockResolvedValue({ code: 0, stdout: '', stderr: '' })
  vi.spyOn(process, 'kill').mockImplementation(() => {
    throw missing
  })
}

describe('safe termination', () => {
  it('rejects invalid IPC input before running commands', async () => {
    for (const input of [
      123,
      [],
      [{ ...a, pid: -1 }],
      [{ ...a, startedAt: undefined }],
      [{ ...a, port: '3000; kill 1' }]
    ]) {
      expect(await killProcesses(input, true)).toMatchObject({
        success: false,
        errorCode: 'INVALID_REQUEST'
      })
    }
    expect(() => validateKillRequest([a], 'true')).toThrow()
    expect(runCommand).not.toHaveBeenCalled()
  })

  it('rejects a reused PID with a different start time', async () => {
    prepare([{ ...a, startedAt: 'new-process' }])
    expect(await killProcesses([a], true)).toMatchObject({
      errorCode: 'TARGET_CHANGED',
      endedPids: []
    })
    expect(runCommand).not.toHaveBeenCalled()
  })

  it('rejects changed port ownership even when the original process is alive', async () => {
    prepare([b])
    expect(await killProcesses([a], false)).toMatchObject({ errorCode: 'TARGET_CHANGED' })
    expect(runCommand).not.toHaveBeenCalled()
  })

  it('refuses to kill when the validation scan fails', async () => {
    prepare([a])
    vi.mocked(checkPorts).mockResolvedValue({ statuses: [], errorCode: 'SCAN_FAILED' })
    expect(await killProcesses([a], true)).toMatchObject({ errorCode: 'SCAN_FAILED' })
    expect(runCommand).not.toHaveBeenCalled()
  })

  it('rechecks identity immediately before sending the signal', async () => {
    prepare([a])
    vi.mocked(readProcessIdentities).mockResolvedValue(
      new Map([[a.pid, { ...a, startedAt: 'reused' }]])
    )
    expect(await killProcesses([a], true)).toMatchObject({ errorCode: 'TARGET_CHANGED' })
    expect(runCommand).not.toHaveBeenCalled()
  })

  it('ends every owner and deduplicates a PID across ports', async () => {
    const anotherPort = { ...a, port: 3001 }
    prepare([a, b, anotherPort])
    vi.mocked(checkPorts)
      .mockResolvedValueOnce({ statuses: [a, b, anotherPort] })
      .mockResolvedValueOnce({ statuses: [a, b, anotherPort] })
      .mockResolvedValueOnce({ statuses: [b] })
      .mockResolvedValueOnce({ statuses: [] })
    expect(await killProcesses([a, b, anotherPort], true)).toEqual({
      success: true,
      endedPids: [101, 102]
    })
    expect(runCommand).toHaveBeenCalledTimes(2)
  })

  it('reports partial completion and stops when later targets change', async () => {
    prepare()
    vi.mocked(checkPorts)
      .mockResolvedValueOnce({ statuses: [a, b] })
      .mockResolvedValueOnce({ statuses: [a, b] })
      .mockResolvedValueOnce({ statuses: [{ ...b, startedAt: 'restarted' }] })
    expect(await killProcesses([a, b], true)).toMatchObject({
      success: false,
      errorCode: 'TARGET_CHANGED',
      endedPids: [101]
    })
    expect(runCommand).toHaveBeenCalledTimes(1)
  })

  it('reports a newly restarted listener instead of claiming the port was freed', async () => {
    prepare([a])
    vi.mocked(checkPorts)
      .mockResolvedValueOnce({ statuses: [a] })
      .mockResolvedValueOnce({ statuses: [a] })
      .mockResolvedValueOnce({ statuses: [b] })
    expect(await killProcesses([a], true)).toMatchObject({
      success: false,
      errorCode: 'PORT_STILL_OCCUPIED',
      endedPids: [101]
    })
  })

  it('does not claim success when the command times out', async () => {
    prepare([a])
    vi.mocked(runCommand).mockRejectedValue(
      Object.assign(new Error('timeout'), { code: 'COMMAND_TIMEOUT' })
    )
    expect(await killProcesses([a], true)).toMatchObject({
      errorCode: 'COMMAND_TIMEOUT',
      endedPids: []
    })
  })
})

describe('exit and error reporting', () => {
  it.each(['ERROR: Access is denied.', '错误：拒绝访问。', 'kill EPERM'])(
    'recognizes permission errors: %s',
    (message) => {
      expect(classifyKillError(message, false, 'win32')).toBe('PERMISSION_DENIED')
    }
  )
  it('suggests force only for an explicit force-required error', () => {
    expect(
      classifyKillError('This process can only be terminated forcefully', false, 'win32')
    ).toBe('FORCE_REQUIRED')
    expect(classifyKillError('unknown localized failure', false, 'win32')).toBe('KILL_FAILED')
    expect(classifyKillError('did not exit within 3000ms', false, 'win32')).toBe('KILL_FAILED')
  })
  it('waits for the process to exit', async () => {
    vi.useFakeTimers()
    vi.spyOn(process, 'kill')
      .mockReturnValueOnce(true)
      .mockImplementationOnce(() => {
        throw missing
      })
    const pending = waitForProcessExit(101)
    await vi.advanceTimersByTimeAsync(100)
    await expect(pending).resolves.toBeUndefined()
  })
  it('reports an exit timeout distinctly', async () => {
    vi.useFakeTimers()
    vi.spyOn(process, 'kill').mockReturnValue(true)
    const pending = expect(waitForProcessExit(101, 100)).rejects.toMatchObject({
      code: 'EXIT_TIMEOUT'
    })
    await vi.advanceTimersByTimeAsync(100)
    await pending
  })
})
