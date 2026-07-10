const { app, BrowserWindow, shell, Tray, Menu, nativeImage, dialog } = require('electron')
const path = require('node:path')

const isDev = Boolean(process.env.ELECTRON_DEV) || !app.isPackaged

/** Styled desktop icon (bg + rounded) — taskbar / window */
function desktopIconPath() {
  return path.join(__dirname, '..', 'build', 'icon.ico')
}

/** Transparent logo — tray */
function trayIconPath() {
  const ico = path.join(__dirname, '..', 'build', 'tray.ico')
  const png = path.join(__dirname, '..', 'build', 'tray.png')
  const fs = require('node:fs')
  if (fs.existsSync(ico)) return ico
  if (fs.existsSync(png)) return png
  return path.join(__dirname, '..', 'public', 'logo.png')
}

let tray = null
let mainWindow = null

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 560,
    backgroundColor: '#0a0c10',
    title: 'cs4fun',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: desktopIconPath(),
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const distDir = path.join(__dirname, '..', 'dist').replace(/\\/g, '/')
    const allowed = isDev
      ? url.startsWith('http://127.0.0.1:5173') || url.startsWith('http://localhost:5173')
      : url.startsWith(`file://${distDir}/`) || url.startsWith(`file:///${distDir}/`)
    if (!allowed) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(false)
  })

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

function createTray(win) {
  const image = nativeImage.createFromPath(trayIconPath())
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('cs4fun')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show cs4fun',
        click: () => {
          win.show()
          win.focus()
        },
      },
      {
        label: 'Check for updates',
        click: () => checkForUpdates({ manual: true }),
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  )
  tray.on('double-click', () => {
    win.show()
    win.focus()
  })
}

function setupAutoUpdater() {
  if (isDev || !app.isPackaged) return

  let autoUpdater
  try {
    ;({ autoUpdater } = require('electron-updater'))
  } catch (err) {
    console.error('electron-updater missing', err)
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => {
    console.error('autoUpdater error', err)
  })

  autoUpdater.on('update-available', (info) => {
    const parent = BrowserWindow.getFocusedWindow() || mainWindow
    dialog
      .showMessageBox(parent || undefined, {
        type: 'info',
        title: 'Update available',
        message: `cs4fun ${info.version} is available`,
        detail: 'Downloading the update in the background. You can keep playing.',
        buttons: ['OK'],
        defaultId: 0,
        noLink: true,
      })
      .catch(() => {})
  })

  autoUpdater.on('update-downloaded', (info) => {
    const parent = BrowserWindow.getFocusedWindow() || mainWindow
    dialog
      .showMessageBox(parent || undefined, {
        type: 'info',
        title: 'Update ready',
        message: `Version ${info.version} is ready to install`,
        detail: 'Restart now to apply the update, or choose Later and it will install when you quit.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall(false, true)
      })
      .catch(() => {})
  })

  // Expose for tray "Check for updates"
  global.__cs4funAutoUpdater = autoUpdater
  checkForUpdates({ manual: false })
}

function checkForUpdates({ manual }) {
  const autoUpdater = global.__cs4funAutoUpdater
  if (!autoUpdater) {
    if (manual) {
      dialog
        .showMessageBox(mainWindow || undefined, {
          type: 'info',
          title: 'Updates',
          message: 'Update checks are only available in the installed app.',
          buttons: ['OK'],
        })
        .catch(() => {})
    }
    return
  }

  autoUpdater
    .checkForUpdates()
    .then((result) => {
      if (!manual) return
      const version = result?.updateInfo?.version
      const current = app.getVersion()
      if (!version || version === current) {
        dialog
          .showMessageBox(mainWindow || undefined, {
            type: 'info',
            title: 'Up to date',
            message: `You're on the latest version (${current}).`,
            buttons: ['OK'],
          })
          .catch(() => {})
      }
    })
    .catch((err) => {
      console.error('checkForUpdates failed', err)
      if (manual) {
        dialog
          .showMessageBox(mainWindow || undefined, {
            type: 'warning',
            title: 'Update check failed',
            message: 'Could not check for updates right now.',
            detail: String(err?.message || err),
            buttons: ['OK'],
          })
          .catch(() => {})
      }
    })
}

app.whenReady().then(() => {
  mainWindow = createWindow()
  createTray(mainWindow)
  setupAutoUpdater()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (tray) {
    tray.destroy()
    tray = null
  }
  if (process.platform !== 'darwin') app.quit()
})
