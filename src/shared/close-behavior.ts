export const CLOSE_CHANNELS = {
  setBehavior: 'close-behavior:set',
  resolveRequest: 'close-behavior:resolve-request',
  requested: 'close-behavior:requested'
} as const

export type CloseBehavior = 'tray' | 'quit'

export function isCloseBehavior(value: unknown): value is CloseBehavior {
  return value === 'tray' || value === 'quit'
}
