import { useCallback, useEffect, useState } from 'react'
import type { CloseBehavior } from '../../../shared/close-behavior'

export const CLOSE_BEHAVIOR_KEY = 'portkill_close_behavior'

function getStoredCloseBehavior(): CloseBehavior | null {
  const stored = localStorage.getItem(CLOSE_BEHAVIOR_KEY)
  return stored === 'tray' || stored === 'quit' ? stored : null
}

export function useCloseBehavior(): {
  closeBehavior: CloseBehavior | null
  closePromptOpen: boolean
  updateCloseBehavior: (behavior: CloseBehavior) => void
  resolveCloseRequest: (behavior: CloseBehavior) => void
  cancelCloseRequest: () => void
} {
  const [closeBehavior, setCloseBehavior] = useState<CloseBehavior | null>(getStoredCloseBehavior)
  const [closePromptOpen, setClosePromptOpen] = useState(false)

  useEffect(() => {
    void window.api.setCloseBehavior(closeBehavior)
  }, [closeBehavior])

  useEffect(() => window.api.onCloseRequested(() => setClosePromptOpen(true)), [])

  const updateCloseBehavior = useCallback((behavior: CloseBehavior): void => {
    localStorage.setItem(CLOSE_BEHAVIOR_KEY, behavior)
    setCloseBehavior(behavior)
  }, [])

  const resolveCloseRequest = useCallback(
    (behavior: CloseBehavior): void => {
      updateCloseBehavior(behavior)
      setClosePromptOpen(false)
      void window.api.resolveCloseRequest(behavior)
    },
    [updateCloseBehavior]
  )

  const cancelCloseRequest = useCallback((): void => setClosePromptOpen(false), [])

  return {
    closeBehavior,
    closePromptOpen,
    updateCloseBehavior,
    resolveCloseRequest,
    cancelCloseRequest
  }
}
