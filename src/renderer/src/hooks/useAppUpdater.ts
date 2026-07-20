import { useCallback, useEffect, useState } from 'react'
import type { UpdateActionResult, UpdateState } from '../../../shared/update'

interface AppUpdaterActions {
  state: UpdateState | null
  checkForUpdates: () => Promise<UpdateActionResult>
  downloadUpdate: () => Promise<UpdateActionResult>
  installUpdate: () => Promise<UpdateActionResult>
  openReleasePage: () => Promise<void>
}

export function useAppUpdater(): AppUpdaterActions {
  const [state, setState] = useState<UpdateState | null>(null)

  useEffect(() => {
    let active = true
    let receivedEvent = false
    const unsubscribe = window.api.onUpdateStateChanged((nextState) => {
      receivedEvent = true
      if (active) setState(nextState)
    })

    void window.api.getUpdateState().then((initialState) => {
      if (active && !receivedEvent) setState(initialState)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const checkForUpdates = useCallback(async () => {
    return await window.api.checkForUpdates()
  }, [])

  const downloadUpdate = useCallback(async () => {
    return await window.api.downloadUpdate()
  }, [])

  const installUpdate = useCallback(async () => {
    return await window.api.installUpdate()
  }, [])

  const openReleasePage = useCallback(async () => {
    await window.api.openReleasePage()
  }, [])

  return { state, checkForUpdates, downloadUpdate, installUpdate, openReleasePage }
}
