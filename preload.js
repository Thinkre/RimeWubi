const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('rime', {
  checkSquirrel:        ()                    => ipcRenderer.invoke('rime:check-squirrel'),
  deploy:               ()                    => ipcRenderer.invoke('rime:deploy'),
  readFile:             (filename)            => ipcRenderer.invoke('rime:read-file', filename),
  writeFile:            (fn, content)         => ipcRenderer.invoke('rime:write-file', fn, content),
  openSquirrelDownload: ()                    => ipcRenderer.invoke('rime:open-squirrel-download'),
  readSquirrelStyle:    ()                    => ipcRenderer.invoke('squirrel:read-style'),
  updateScheme:         (name, fields)        => ipcRenderer.invoke('squirrel:update-scheme', name, fields),
  readKeybindings:      ()                    => ipcRenderer.invoke('keybindings:read'),
  writeKeybindings:     (bindings)            => ipcRenderer.invoke('keybindings:write', bindings),
})
