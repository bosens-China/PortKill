import type {
  UpdateActionResult,
  UpdateCheckSource,
  UpdateErrorCode,
  UpdateInstallMode,
  UpdateState
} from '../shared/update'

interface VersionInfo {
  version: string
}

interface ProgressInfo {
  percent: number
}

export interface UpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  allowPrerelease: boolean
  on(event: 'checking-for-update', listener: () => void): this
  on(event: 'update-available', listener: (info: VersionInfo) => void): this
  on(event: 'update-not-available', listener: (info: VersionInfo) => void): this
  on(event: 'download-progress', listener: (info: ProgressInfo) => void): this
  on(event: 'update-downloaded', listener: (info: VersionInfo) => void): this
  on(event: 'error', listener: (error: Error) => void): this
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<string[]>
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}

interface UpdateManagerOptions {
  currentVersion: string
  isPackaged: boolean
  installMode: UpdateInstallMode
  publishState: (state: UpdateState) => void
  beforeInstall: () => void
}

export class UpdateManager {
  private state: UpdateState
  private checkSource: UpdateCheckSource = 'automatic'
  private operationErrorCode: UpdateErrorCode = 'CHECK_FAILED'

  constructor(
    private readonly updater: UpdaterLike,
    private readonly options: UpdateManagerOptions
  ) {
    this.state = {
      phase: options.isPackaged ? 'idle' : 'unsupported',
      currentVersion: options.currentVersion,
      installMode: options.installMode,
      ...(options.isPackaged ? {} : { errorCode: 'DEVELOPMENT_MODE' as const })
    }

    this.updater.autoDownload = false
    this.updater.autoInstallOnAppQuit = false
    this.updater.allowPrerelease = false
    this.registerEvents()
  }

  getState(): UpdateState {
    return { ...this.state }
  }

  async checkForUpdates(source: UpdateCheckSource): Promise<UpdateActionResult> {
    if (!this.options.isPackaged) {
      return this.failure('DEVELOPMENT_MODE')
    }
    if (this.state.phase === 'checking' || this.state.phase === 'downloading') {
      return this.failure('INVALID_STATE')
    }

    this.checkSource = source
    this.operationErrorCode = 'CHECK_FAILED'
    this.setState({
      phase: 'checking',
      checkSource: source,
      errorCode: undefined,
      latestVersion: undefined,
      progress: undefined
    })

    try {
      await this.updater.checkForUpdates()
      return this.success()
    } catch (error) {
      this.handleError('CHECK_FAILED', error)
      return this.failure('CHECK_FAILED')
    }
  }

  async downloadUpdate(): Promise<UpdateActionResult> {
    if (this.state.phase !== 'available' || this.state.installMode !== 'in-app') {
      return this.failure('INSTALL_UNAVAILABLE')
    }

    this.operationErrorCode = 'DOWNLOAD_FAILED'
    this.setState({ phase: 'downloading', progress: 0, errorCode: undefined })
    try {
      await this.updater.downloadUpdate()
      return this.success()
    } catch (error) {
      this.handleError('DOWNLOAD_FAILED', error)
      return this.failure('DOWNLOAD_FAILED')
    }
  }

  installUpdate(): UpdateActionResult {
    if (this.state.phase !== 'downloaded' || this.state.installMode !== 'in-app') {
      return this.failure('INSTALL_UNAVAILABLE')
    }

    this.options.beforeInstall()
    this.updater.quitAndInstall(false, true)
    return this.success()
  }

  private registerEvents(): void {
    this.updater.on('checking-for-update', () => {
      this.setState({
        phase: 'checking',
        checkSource: this.checkSource,
        errorCode: undefined,
        progress: undefined
      })
    })

    this.updater.on('update-available', (info) => {
      this.setState({
        phase: 'available',
        latestVersion: info.version,
        checkSource: this.checkSource,
        progress: undefined,
        errorCode: undefined
      })
    })

    this.updater.on('update-not-available', (info) => {
      this.setState({
        phase: 'not-available',
        latestVersion: info.version,
        checkSource: this.checkSource,
        progress: undefined,
        errorCode: undefined
      })
    })

    this.updater.on('download-progress', (info) => {
      this.setState({
        phase: 'downloading',
        progress: Math.min(100, Math.max(0, info.percent)),
        errorCode: undefined
      })
    })

    this.updater.on('update-downloaded', (info) => {
      this.setState({
        phase: 'downloaded',
        latestVersion: info.version,
        progress: 100,
        errorCode: undefined
      })
    })

    this.updater.on('error', (error) => {
      this.handleError(this.operationErrorCode, error)
    })
  }

  private setState(update: Partial<UpdateState>): void {
    this.state = { ...this.state, ...update }
    this.options.publishState(this.getState())
  }

  private handleError(code: UpdateErrorCode, error: unknown): void {
    console.error('Application update failed:', error)
    this.setState({ phase: 'error', errorCode: code, progress: undefined })
  }

  private success(): UpdateActionResult {
    return { success: true, state: this.getState() }
  }

  private failure(errorCode: UpdateErrorCode): UpdateActionResult {
    return { success: false, state: this.getState(), errorCode }
  }
}
