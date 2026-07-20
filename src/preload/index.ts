import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { UPDATE_CHANNELS, type UpdateState } from '../shared/update'

// Custom APIs for renderer
const api = {
  getPortStatus: (ports: number[]) => ipcRenderer.invoke('get-port-status', ports),
  killProcess: (pid: number, force: boolean) => ipcRenderer.invoke('kill-process', pid, force),
  getUpdateState: () => ipcRenderer.invoke(UPDATE_CHANNELS.getState),
  checkForUpdates: () => ipcRenderer.invoke(UPDATE_CHANNELS.check),
  downloadUpdate: () => ipcRenderer.invoke(UPDATE_CHANNELS.download),
  installUpdate: () => ipcRenderer.invoke(UPDATE_CHANNELS.install),
  openReleasePage: () => ipcRenderer.invoke(UPDATE_CHANNELS.openRelease),
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
