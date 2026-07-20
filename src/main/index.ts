import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

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
    return false
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

function createTray() {
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
  ipcMain.handle('get-port-status', async (_, ports: number[]) => {
    return await checkPorts(ports)
  })

  ipcMain.handle('kill-process', async (_, pid: number, force: boolean) => {
    return await killProcess(pid, force)
  })

  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Process Logic
interface PortStatus {
  port: number
  pid: number
  name: string
}

function execPromise(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout)
    })
  })
}

async function checkPorts(ports: number[]): Promise<PortStatus[]> {
  const result: PortStatus[] = []

  for (const port of ports) {
    try {
      if (process.platform === 'win32') {
        const cmd = `netstat -ano | findstr :${port}`
        const stdout = await execPromise(cmd)
        const lines = stdout.split('\n')
        for (const line of lines) {
          if (line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/)
            const pidStr = parts[parts.length - 1]
            const pid = parseInt(pidStr, 10)
            if (!isNaN(pid)) {
              try {
                const taskListCmd = `tasklist /FI "PID eq ${pid}" /NH`
                const taskListOut = await execPromise(taskListCmd)
                const nameMatch = taskListOut.trim().split(/\s+/)
                const name = nameMatch[0] || 'Unknown'
                result.push({ port, pid, name })
                break
              } catch (e) {
                result.push({ port, pid, name: 'Unknown' })
                break
              }
            }
          }
        }
      } else {
        const cmd = `lsof -i :${port} -sTCP:LISTEN -P -n`
        try {
          const stdout = await execPromise(cmd)
          const lines = stdout.trim().split('\n')
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/)
            const name = parts[0]
            const pid = parseInt(parts[1], 10)
            if (!isNaN(pid)) {
              result.push({ port, pid, name })
            }
          }
        } catch (e) {
          // ignore error if nothing found
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return result
}

async function killProcess(
  pid: number,
  force: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (process.platform === 'win32') {
      const flag = force ? '/F' : ''
      await execPromise(`taskkill ${flag} /PID ${pid}`)
    } else {
      const signal = force ? '-9' : '-15'
      await execPromise(`kill ${signal} ${pid}`)
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}
