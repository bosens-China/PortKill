import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { checkPorts, killProcess } from './port-process'
import { UpdateManager } from './update-manager'
import { UPDATE_CHANNELS, type UpdateInstallMode } from '../shared/update'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let updateManager: UpdateManager | null = null
let isQuitting = false

const RELEASES_URL = 'https://github.com/bosens-China/PortKill/releases/latest'

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: 'PortKill',
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show PortKill', click: () => mainWindow?.show() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setToolTip('PortKill')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

app.on('before-quit', () => {
  isQuitting = true
})

function validatePorts(value: unknown): number[] {
  if (!Array.isArray(value) || value.length > 1000) {
    throw new Error('INVALID_PORTS')
  }

  const ports = value.filter(
    (port): port is number =>
      typeof port === 'number' && Number.isInteger(port) && port > 0 && port <= 65535
  )

  if (ports.length !== value.length) throw new Error('INVALID_PORTS')
  return [...new Set(ports)]
}

function validateKillRequest(pid: unknown, force: unknown): { pid: number; force: boolean } {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0 || typeof force !== 'boolean') {
    throw new Error('INVALID_KILL_REQUEST')
  }
  return { pid, force }
}

function getUpdateInstallMode(): UpdateInstallMode {
  if (process.platform === 'win32') return 'in-app'
  if (process.platform === 'linux' && Boolean(process.env.APPIMAGE)) return 'in-app'
  return 'manual'
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.yliu.portkill')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle('get-port-status', async (_, ports: unknown) => {
    return await checkPorts(validatePorts(ports))
  })

  ipcMain.handle('kill-process', async (_, pid: unknown, force: unknown) => {
    const request = validateKillRequest(pid, force)
    return await killProcess(request.pid, request.force)
  })

  updateManager = new UpdateManager(autoUpdater, {
    currentVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    installMode: getUpdateInstallMode(),
    publishState: (state) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(UPDATE_CHANNELS.stateChanged, state)
      }
    },
    beforeInstall: () => {
      isQuitting = true
    }
  })

  ipcMain.handle(UPDATE_CHANNELS.getState, () => updateManager?.getState())
  ipcMain.handle(UPDATE_CHANNELS.check, () => updateManager?.checkForUpdates('manual'))
  ipcMain.handle(UPDATE_CHANNELS.download, () => updateManager?.downloadUpdate())
  ipcMain.handle(UPDATE_CHANNELS.install, () => updateManager?.installUpdate())
  ipcMain.handle(UPDATE_CHANNELS.openRelease, () => shell.openExternal(RELEASES_URL))

  createWindow()
  createTray()

  const updateTimer = setTimeout(() => {
    void updateManager?.checkForUpdates('automatic')
  }, 3000)
  updateTimer.unref()

  app.on('activate', function () {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow()
      return
    }
    mainWindow.show()
    mainWindow.focus()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
