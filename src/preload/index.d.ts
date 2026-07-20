import { ElectronAPI } from '@electron-toolkit/preload'
import type { PortScanResult, ProcessActionResult } from '../shared/port'
import type { UpdateActionResult, UpdateState } from '../shared/update'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getPortStatus: (ports: number[]) => Promise<PortScanResult>
      killProcess: (pid: number, force: boolean) => Promise<ProcessActionResult>
      getUpdateState: () => Promise<UpdateState>
      checkForUpdates: () => Promise<UpdateActionResult>
      downloadUpdate: () => Promise<UpdateActionResult>
      installUpdate: () => Promise<UpdateActionResult>
      openReleasePage: () => Promise<void>
      onUpdateStateChanged: (callback: (state: UpdateState) => void) => () => void
    }
  }
}
