import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCommand } from './port-command'

const { execMock, killMock } = vi.hoisted(() => ({ execMock: vi.fn(), killMock: vi.fn() }))
vi.mock('child_process', () => ({ exec: execMock }))
afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('command watchdog', () => {
  it('cleans up its watchdog when launching a command throws', async () => {
    vi.useFakeTimers()
    execMock.mockImplementation(() => {
      throw new Error('cannot launch')
    })
    await expect(runCommand('lsof')).rejects.toThrow('cannot launch')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('settles even if a command never closes its pipes', async () => {
    vi.useFakeTimers()
    execMock.mockReturnValue({ kill: killMock })
    const pending = expect(runCommand('lsof', 50)).rejects.toMatchObject({
      code: 'COMMAND_TIMEOUT'
    })
    await vi.advanceTimersByTimeAsync(50)
    await pending
    expect(killMock).toHaveBeenCalledWith('SIGKILL')
  })

  it('retains stdout, stderr and exit status so lsof diagnostics can be handled', async () => {
    execMock.mockImplementation((_command, _options, callback) => {
      callback(Object.assign(new Error('failure'), { code: 1 }), 'partial output', 'warning')
      return { kill: killMock }
    })
    expect(await runCommand('lsof')).toEqual({
      code: 1,
      stdout: 'partial output',
      stderr: 'warning'
    })
    expect(execMock.mock.calls[0][1]).toMatchObject({ timeout: 8000, windowsHide: true })
  })
})
