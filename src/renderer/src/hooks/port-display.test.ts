import { describe, expect, it } from 'vitest'
import { combinePortStatuses } from './port-display'

const a = { port: 3000, pid: 101, name: 'node', startedAt: 'a' }
const b = { port: 3000, pid: 102, name: 'node', startedAt: 'b' }

describe('port display', () => {
  it('groups all owners in one persistent port row', () => {
    const rows = combinePortStatuses([4000, 3000], { statuses: [a, b] })
    expect(rows[0]).toMatchObject({
      port: 3000,
      processes: [a, b],
      pid: '101, 102',
      active: true,
      canKill: true
    })
    expect(rows[1]).toMatchObject({ port: 4000, processes: [], active: false, canKill: false })
  })
  it('represents a failed scan as unknown, not idle or safe to terminate', () => {
    const rows = combinePortStatuses([3000, 4000], { statuses: [a], errorCode: 'SCAN_FAILED' })
    expect(rows.every((row) => row.active === undefined && !row.canKill)).toBe(true)
    expect(rows).toHaveLength(2)
  })
  it('disables termination if even one owner cannot be identified', () => {
    const rows = combinePortStatuses([3000], { statuses: [a, { ...b, startedAt: undefined }] })
    expect(rows[0]).toMatchObject({ active: true, canKill: false })
  })
})
