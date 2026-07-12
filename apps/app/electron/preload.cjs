const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cs4funDesktop', {
  isDesktop: true,
  copyText(text) {
    return ipcRenderer.invoke('cs4fun:clipboard-write', String(text ?? ''))
  },
  onUpdateEvent(callback) {
    if (typeof callback !== 'function') return () => {}
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('cs4fun:update-event', handler)
    return () => ipcRenderer.removeListener('cs4fun:update-event', handler)
  },
  installUpdate() {
    return ipcRenderer.invoke('cs4fun:update-install')
  },
  checkForUpdates() {
    return ipcRenderer.invoke('cs4fun:update-check')
  },
})
