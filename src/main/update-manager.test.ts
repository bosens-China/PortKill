import { EventEmitter } from 'events'
import { describe, expect, it, vi } from 'vitest'
import type { UpdateState } from '../shared/update'
import { UpdateManager, type UpdaterLike } from './update-manager'

class FakeUpdater extends EventEmitter {
  autoDownload = true
  autoInstallOnAppQuit = true
  allowPrerelease = true
  checkResult: 'available' | 'not-available' | 'error' = 'available'
  downloadResult: 'success' | 'error' = 'success'
  installArguments: [boolean | undefined, boolean | undefined] | null = null

  async checkForUpdates(): Promise<void> {
    this.emit('checking-for-update')
    if (this.checkResult === 'error') throw new Error('network error')
    this.emit(this.checkResult === 'available' ? 'update-available' : 'update-not-available', {
      version: this.checkResult === 'available' ? '1.1.0' : '1.0.0'
    })
  }

  async downloadUpdate(): Promise<string[]> {
    if (this.downloadResult === 'error') throw new Error('download error')
    this.emit('download-progress', { percent: 42.4 })
    this.emit('update-downloaded', { version: '1.1.0' })
    return ['/tmp/portkill-update']
  }

  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void {
    this.installArguments = [isSilent, isForceRunAfter]
  }
}

function createManager(
  updater: FakeUpdater,
  overrides: Partial<{
    isPackaged: boolean
    installMode: 'in-app' | 'manual'
    beforeInstall: () => void
  }> = {}
): { manager: UpdateManager; states: UpdateState[] } {
  const states: UpdateState[] = []
  const manager = new UpdateManager(updater as UpdaterLike, {
    currentVersion: '1.0.0',
    isPackaged: overrides.isPackaged ?? true,
    installMode: overrides.installMode ?? 'in-app',
    publishState: (state) => states.push(state),
    beforeInstall: overrides.beforeInstall ?? (() => undefined)
  })
  return { manager, states }
}

describe('UpdateManager', () => {
  it('checks without auto-downloading and reports an available version', async () => {
    const updater = new FakeUpdater()
    const { manager } = createManager(updater)

    const result = await manager.checkForUpdates('manual')

    expect(result.success).toBe(true)
    expect(manager.getState()).toMatchObject({
      phase: 'available',
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
      checkSource: 'manual'
    })
    expect(updater.autoDownload).toBe(false)
    expect(updater.autoInstallOnAppQuit).toBe(false)
    expect(updater.allowPrerelease).toBe(false)
  })

  it('reports that the current version is latest', async () => {
    const updater = new FakeUpdater()
    updater.checkResult = 'not-available'
    const { manager } = createManager(updater)

    await manager.checkForUpdates('manual')

    expect(manager.getState()).toMatchObject({
      phase: 'not-available',
      latestVersion: '1.0.0'
    })
  })

  it('publishes download progress and installs after marking the app as quitting', async () => {
    const updater = new FakeUpdater()
    let isQuitting = false
    const { manager, states } = createManager(updater, {
      beforeInstall: () => {
        isQuitting = true
      }
    })
    await manager.checkForUpdates('automatic')

    await manager.downloadUpdate()
    const result = manager.installUpdate()

    expect(states).toContainEqual(expect.objectContaining({ phase: 'downloading', progress: 42.4 }))
    expect(manager.getState()).toMatchObject({ phase: 'downloaded', progress: 100 })
    expect(result.success).toBe(true)
    expect(isQuitting).toBe(true)
    expect(updater.installArguments).toEqual([false, true])
  })

  it('keeps manual-update platforms from downloading in app', async () => {
    const updater = new FakeUpdater()
    const { manager } = createManager(updater, { installMode: 'manual' })
    await manager.checkForUpdates('manual')

    const result = await manager.downloadUpdate()

    expect(result).toMatchObject({ success: false, errorCode: 'INSTALL_UNAVAILABLE' })
    expect(manager.getState()).toMatchObject({ phase: 'available', installMode: 'manual' })
  })

  it('maps download failures to a stable error code', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const updater = new FakeUpdater()
    updater.downloadResult = 'error'
    const { manager } = createManager(updater)
    await manager.checkForUpdates('manual')

    const result = await manager.downloadUpdate()

    expect(result).toMatchObject({ success: false, errorCode: 'DOWNLOAD_FAILED' })
    expect(manager.getState()).toMatchObject({ phase: 'error', errorCode: 'DOWNLOAD_FAILED' })
    consoleError.mockRestore()
  })

  it('maps check failures to a stable error code', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const updater = new FakeUpdater()
    updater.checkResult = 'error'
    const { manager } = createManager(updater)

    const result = await manager.checkForUpdates('manual')

    expect(result).toMatchObject({ success: false, errorCode: 'CHECK_FAILED' })
    expect(manager.getState()).toMatchObject({ phase: 'error', errorCode: 'CHECK_FAILED' })
    consoleError.mockRestore()
  })

  it('disables update checks in development builds', async () => {
    const updater = new FakeUpdater()
    const { manager } = createManager(updater, { isPackaged: false })

    const result = await manager.checkForUpdates('manual')

    expect(result).toMatchObject({ success: false, errorCode: 'DEVELOPMENT_MODE' })
    expect(manager.getState()).toMatchObject({
      phase: 'unsupported',
      errorCode: 'DEVELOPMENT_MODE'
    })
  })
})
