import { afterEach, describe, expect, it, vi } from 'vitest'
import { parsePs, parseWindowsProcesses, readProcessIdentities } from './process-identity'
import { runCommand } from './port-command'

vi.mock('./port-command', () => ({ runCommand: vi.fn() }))
const platform = process.platform
afterEach(() => {
  Object.defineProperty(process, 'platform', { value: platform })
  vi.resetAllMocks()
})

describe('process identities', () => {
  it('preserves ps start dates and executable paths containing spaces', () => {
    expect(parsePs(' 123 Mon Sep  7 11:15:23 2026 /Applications/My App\n').get(123)).toEqual({
      name: '/Applications/My App',
      startedAt: 'Mon Sep 7 11:15:23 2026:/Applications/My App'
    })
  })
  it('keeps Windows ticks as strings without losing precision and handles Unicode', () => {
    expect(
      parseWindowsProcesses(
        '\uFEFF[{"pid":123,"name":"测试","startedAt":"638929485230000001"}]'
      ).get(123)
    ).toEqual({ name: '测试', startedAt: '638929485230000001' })
  })
  it('marks unavailable start time as unverifiable', () => {
    expect(
      parseWindowsProcesses('{"pid":123,"name":"System","startedAt":null}').get(123)?.startedAt
    ).toBeUndefined()
    expect(parseWindowsProcesses('[]').size).toBe(0)
  })
  it('rejects unsafe PIDs before shell interpolation', async () => {
    await expect(readProcessIdentities([NaN])).rejects.toThrow('Invalid process ID')
    expect(runCommand).not.toHaveBeenCalled()
  })
  it('batches Windows queries and uses encoded scripts with UTF-8 JSON output', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    vi.mocked(runCommand).mockResolvedValue({ code: 0, stdout: '[]', stderr: '' })
    await readProcessIdentities(Array.from({ length: 101 }, (_, i) => i + 1))
    expect(runCommand).toHaveBeenCalledTimes(2)
    const command = vi.mocked(runCommand).mock.calls[0][0]
    const script = Buffer.from(command.split(' ').at(-1)!, 'base64').toString('utf16le')
    expect(script).toContain('OutputEncoding')
    expect(script).toContain('StartTime.ToUniversalTime().Ticks.ToString()')
    expect(command.length).toBeLessThan(8191)
  })
})
