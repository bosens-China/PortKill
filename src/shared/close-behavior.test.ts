import { describe, expect, it } from 'vitest'
import { isCloseBehavior } from './close-behavior'

describe('isCloseBehavior', () => {
  it.each(['tray', 'quit'])('accepts %s', (behavior) => {
    expect(isCloseBehavior(behavior)).toBe(true)
  })

  it.each([null, undefined, 'ask', 'close', 1])('rejects %s', (behavior) => {
    expect(isCloseBehavior(behavior)).toBe(false)
  })
})
