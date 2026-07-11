const { app, BrowserWindow, shell, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const isDev = Boolean(process.env.ELECTRON_DEV) || !app.isPackaged

/** Resolve packaged assets (unpacked from asar so .ico loads on Windows). */
function assetPath(...parts) {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', ...parts)
    if (fs.existsSync(unpacked)) return unpacked
    return path.join(process.resourcesPath, 'app.asar', ...parts)
  }
  return path.join(__dirname, '..', ...parts)
}

/** Styled desktop icon (bg + rounded) — taskbar / window */
function desktopIconImage() {
  const ico = assetPath('build', 'icon.ico')
  const png = assetPath('build', 'icon.png')
  const fromIco = fs.existsSync(ico) ? nativeImage.createFromPath(ico) : null
  if (fromIco && !fromIco.isEmpty()) return fromIco
  const fromPng = fs.existsSync(png) ? nativeImage.createFromPath(png) : null
  if (fromPng && !fromPng.isEmpty()) return fromPng
  return nativeImage.createEmpty()
}

/** Carbon badge — tray (do not fall back to wide UI logo.png) */
function trayIconImage() {
  const ico = assetPath('build', 'tray.ico')
  const png2x = assetPath('build', 'tray@2x.png')
  const png = assetPath('build', 'tray.png')
  for (const p of [ico, png2x, png]) {
    if (!fs.existsSync(p)) continue
    const img = nativeImage.createFromPath(p)
    if (!img.isEmpty()) return img
  }
  return nativeImage.createEmpty()
}

let tray = null
let mainWindow = null
let pendingUpdateEvent = null

function sendUpdateEvent(payload) {
  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
  if (!win) {
    pendingUpdateEvent = payload
    return
  }
  pendingUpdateEvent = null
  win.webContents.send('cs4fun:update-event', payload)
}

function flushPendingUpdateEvent() {
  if (!pendingUpdateEvent || !mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('cs4fun:update-event', pendingUpdateEvent)
  pendingUpdateEvent = null
}

function createWindow() {
  const icon = desktopIconImage()
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 560,
    backgroundColor: '#0a0c10',
    title: 'CS4FUN',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    ...(icon.isEmpty() ? {} : { icon }),
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

  win.webContents.on('did-finish-load', () => {
    flushPendingUpdateEvent()
  })

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

function createTray(win) {
  const image = trayIconImage()
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('CS4FUN')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show CS4FUN',
        click: () => {
          win.show()
          win.focus()
        },
      },
      {
        label: 'Check for updates',
        click: () => {
          win.show()
          win.focus()
          checkForUpdates({ manual: true })
        },
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
    sendUpdateEvent({
      type: 'error',
      message: String(err?.message || err || 'Update error'),
    })
  })

  autoUpdater.on('checking-for-update', () => {
    // Manual checks set checking explicitly; silent startup stays quiet until available.
  })

  autoUpdater.on('update-available', (info) => {
    sendUpdateEvent({
      type: 'available',
      version: info?.version || '',
      currentVersion: app.getVersion(),
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateEvent({
      type: 'progress',
      percent: Math.max(0, Math.min(100, Number(progress?.percent) || 0)),
      transferred: Number(progress?.transferred) || 0,
      total: Number(progress?.total) || 0,
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    // Only surface via manual check path in checkForUpdates().
    void info
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateEvent({
      type: 'downloaded',
      version: info?.version || '',
      currentVersion: app.getVersion(),
    })
  })

  global.__cs4funAutoUpdater = autoUpdater

  ipcMain.handle('cs4fun:update-install', () => {
    try {
      autoUpdater.quitAndInstall(false, true)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err?.message || err) }
    }
  })

  ipcMain.handle('cs4fun:update-check', () => {
    checkForUpdates({ manual: true })
    return { ok: true }
  })

  checkForUpdates({ manual: false })
}

function checkForUpdates({ manual }) {
  const autoUpdater = global.__cs4funAutoUpdater
  if (!autoUpdater) {
    if (manual) {
      sendUpdateEvent({
        type: 'unavailable',
        currentVersion: app.getVersion(),
      })
    }
    return
  }

  if (manual) {
    sendUpdateEvent({
      type: 'checking',
      currentVersion: app.getVersion(),
    })
  }

  autoUpdater
    .checkForUpdates()
    .then((result) => {
      if (!manual) return
      const version = result?.updateInfo?.version
      const current = app.getVersion()
      if (!version || version === current) {
        sendUpdateEvent({
          type: 'up-to-date',
          version: current,
          currentVersion: current,
        })
      }
    })
    .catch((err) => {
      console.error('checkForUpdates failed', err)
      if (manual) {
        sendUpdateEvent({
          type: 'error',
          message: String(err?.message || err || 'Could not check for updates'),
          currentVersion: app.getVersion(),
        })
      }
    })
}

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function scheduleDailyChallengeNotification() {
  if (isDev || !app.isPackaged || !Notification.isSupported()) return
  const storePath = path.join(app.getPath('userData'), 'daily-toast.json')
  const tryShow = () => {
    const today = utcDayKey()
    let lastShown = null
    try {
      lastShown = JSON.parse(fs.readFileSync(storePath, 'utf8'))?.day
    } catch {
      /* first run */
    }
    if (lastShown === today) return
    try {
      new Notification({
        title: 'cs4fun',
        body: 'Blind Daily is live. Weekly challenges and cosmetics are waiting.',
      }).show()
      fs.writeFileSync(storePath, JSON.stringify({ day: today }), 'utf8')
    } catch (err) {
      console.error('daily notification failed', err)
    }
  }
  setTimeout(tryShow, 4000)
  setInterval(tryShow, 60 * 60 * 1000)
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('online.cs4fun.app')
  }
  mainWindow = createWindow()
  createTray(mainWindow)
  setupAutoUpdater()
  scheduleDailyChallengeNotification()
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
