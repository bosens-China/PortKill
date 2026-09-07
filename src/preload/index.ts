import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { UPDATE_CHANNELS, type UpdateState } from '../shared/update'
import { CLOSE_CHANNELS, type CloseBehavior } from '../shared/close-behavior'

import type { ProcessTarget } from '../shared/port'

// Custom APIs for renderer
const api = {
  getPortStatus: (ports: number[]) => ipcRenderer.invoke('get-port-status', ports),
  killProcess: (targets: ProcessTarget[], force: boolean) =>
    ipcRenderer.invoke('kill-process', targets, force),
  getUpdateState: () => ipcRenderer.invoke(UPDATE_CHANNELS.getState),
  checkForUpdates: () => ipcRenderer.invoke(UPDATE_CHANNELS.check),
  downloadUpdate: () => ipcRenderer.invoke(UPDATE_CHANNELS.download),
  installUpdate: () => ipcRenderer.invoke(UPDATE_CHANNELS.install),
  openReleasePage: () => ipcRenderer.invoke(UPDATE_CHANNELS.openRelease),
  setCloseBehavior: (behavior: CloseBehavior | null) =>
    ipcRenderer.invoke(CLOSE_CHANNELS.setBehavior, behavior),
  resolveCloseRequest: (behavior: CloseBehavior) =>
    ipcRenderer.invoke(CLOSE_CHANNELS.resolveRequest, behavior),
  onCloseRequested: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on(CLOSE_CHANNELS.requested, listener)
    return () => ipcRenderer.removeListener(CLOSE_CHANNELS.requested, listener)
  },
  onUpdateStateChanged: (callback: (state: UpdateState) => void) => {
    const listener = (_event: IpcRendererEvent, state: UpdateState): void => callback(state)
    ipcRenderer.on(UPDATE_CHANNELS.stateChanged, listener)
    return () => ipcRenderer.removeListener(UPDATE_CHANNELS.stateChanged, listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
