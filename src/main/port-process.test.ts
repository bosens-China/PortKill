import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkPorts, parseLsof, parseWindowsNetstat } from './port-process'
import { runCommand } from './port-command'
import { readProcessIdentities } from './process-identity'

vi.mock('./port-command', async (original) => ({
  ...(await original<typeof import('./port-command')>()),
  runCommand: vi.fn()
}))
vi.mock('./process-identity', () => ({ readProcessIdentities: vi.fn() }))
const platform = process.platform

afterEach(() => {
  vi.resetAllMocks()
  Object.defineProperty(process, 'platform', { value: platform })
})

describe('listener parsing', () => {
  it('keeps different Windows PIDs on the same port and ignores UDP and connections', () => {
    const output = [
      'TCP 0.0.0.0:8080 0.0.0.0:0 LISTENING 1200',
      'TCP 127.0.0.1:80 0.0.0.0:0 LISTENING 1300',
      'TCP [::1]:80 [::]:0 LISTENING 1400',
      'TCP [::1]:80 [::]:0 LISTENING 1400',
      'TCP 127.0.0.1:80 1.2.3.4:5000 ESTABLISHED 1500',
      'UDP 0.0.0.0:80 *:* 1600'
    ].join('\r\n')
    expect(parseWindowsNetstat(output, new Set([80]))).toEqual([
      { port: 80, pid: 1300, name: 'Unknown' },
      { port: 80, pid: 1400, name: 'Unknown' }
    ])
  })

  it('parses tagged lsof records including spaces and a process named TCP', () => {
    const output =
      'p123\ncTCP\nn127.0.0.1:3000\nn*:3000\np456\ncmy app\nn[::1]:3000\nn*:3001\nn*:13000\n'
    expect(parseLsof(output, new Set([3000, 3001]))).toEqual([
      { port: 3000, pid: 123, name: 'TCP' },
      { port: 3000, pid: 456, name: 'my app' },
      { port: 3001, pid: 456, name: 'my app' }
    ])
  })
})

describe('scan errors', () => {
  it.each([
    { code: 1, stdout: '', stderr: 'lsof: permission denied' },
    { code: 1, stdout: 'p123\ncnode\nn*:3000', stderr: 'partial result' },
    { code: 0, stdout: 'p123\ncnode\nn*:3000', stderr: 'warning: output may be incomplete' }
  ])('does not report a diagnostic as idle: $code $stderr', async (result) => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    vi.mocked(runCommand).mockResolvedValue(result)
    expect(await checkPorts([3000])).toMatchObject({ errorCode: 'SCAN_FAILED' })
  })

  it('accepts only a quiet empty lsof exit 1 as no matches', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    vi.mocked(runCommand).mockResolvedValue({ code: 1, stdout: '', stderr: '' })
    expect(await checkPorts([3000])).toEqual({ statuses: [] })
  })

  it('reports a missing lsof separately', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    vi.mocked(runCommand).mockResolvedValue({ code: 127, stdout: '', stderr: 'not found' })
    expect(await checkPorts([3000])).toMatchObject({ errorCode: 'LSOF_NOT_FOUND' })
  })

  it('reports timeout and can scan again afterwards', async () => {
    vi.mocked(runCommand)
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'COMMAND_TIMEOUT' }))
      .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' })
    expect(await checkPorts([3000])).toMatchObject({ errorCode: 'SCAN_TIMEOUT' })
    expect(await checkPorts([3000])).toEqual({ statuses: [] })
  })

  it('retains known listeners when identity lookup fails', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    vi.mocked(runCommand).mockResolvedValue({ code: 0, stdout: 'p123\ncnode\nn*:3000', stderr: '' })
    vi.mocked(readProcessIdentities).mockRejectedValue(new Error('cannot read start time'))
    expect(await checkPorts([3000])).toEqual({ statuses: [{ port: 3000, pid: 123, name: 'node' }] })
  })

  it('enriches Windows names and identities in one lookup', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    vi.mocked(runCommand).mockResolvedValue({
      code: 0,
      stdout: 'TCP [::]:3000 [::]:0 LISTENING 123',
      stderr: ''
    })
    vi.mocked(readProcessIdentities).mockResolvedValue(
      new Map([[123, { name: '中文进程', startedAt: '638900000000000000' }]])
    )
    expect(await checkPorts([3000])).toEqual({
      statuses: [{ port: 3000, pid: 123, name: '中文进程', startedAt: '638900000000000000' }]
    })
  })
})
