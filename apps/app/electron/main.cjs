const { app, BrowserWindow, shell, Tray, Menu, nativeImage } = require('electron')
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
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  )
  tray.on('double-click', () => {
    win.show()
    win.focus()
  })
}

app.whenReady().then(() => {
  const win = createWindow()
  createTray(win)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (tray) {
    tray.destroy()
    tray = null
  }
  if (process.platform !== 'darwin') app.quit()
})
