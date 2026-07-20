export const UPDATE_CHANNELS = {
  getState: 'update-get-state',
  check: 'update-check',
  download: 'update-download',
  install: 'update-install',
  openRelease: 'update-open-release',
  stateChanged: 'update-state-changed'
} as const

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'unsupported'

export type UpdateCheckSource = 'automatic' | 'manual'
export type UpdateInstallMode = 'in-app' | 'manual'
export type UpdateErrorCode =
  'DEVELOPMENT_MODE' | 'CHECK_FAILED' | 'DOWNLOAD_FAILED' | 'INVALID_STATE' | 'INSTALL_UNAVAILABLE'

export interface UpdateState {
  phase: UpdatePhase
  currentVersion: string
  latestVersion?: string
  progress?: number
  checkSource?: UpdateCheckSource
  installMode: UpdateInstallMode
  errorCode?: UpdateErrorCode
}

export interface UpdateActionResult {
  success: boolean
  state: UpdateState
  errorCode?: UpdateErrorCode
}
