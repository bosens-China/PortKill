import { ElectronAPI } from '@electron-toolkit/preload'
import type { PortScanResult, ProcessActionResult } from '../shared/port'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getPortStatus: (ports: number[]) => Promise<PortScanResult>
      killProcess: (pid: number, force: boolean) => Promise<ProcessActionResult>
    }
  }
}
