import { ElectronAPI } from '@electron-toolkit/preload'

export interface PortStatus {
  port: number
  pid: number
  name: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getPortStatus: (ports: number[]) => Promise<PortStatus[]>
      killProcess: (pid: number, force: boolean) => Promise<{ success: boolean; error?: string }>
    }
  }
}
