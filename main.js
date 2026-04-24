const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execFile } = require('child_process')

const RIME_DIR = path.join(os.homedir(), 'Library', 'Rime')
const SQUIRREL = '/Library/Input Methods/Squirrel.app/Contents/MacOS/Squirrel'
const CONFIG_DIR = path.join(__dirname, 'config')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 600,
    minWidth: 720,
    minHeight: 480,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile('src/index.html')
}

app.whenReady().then(async () => {
  createWindow()

  // 首次启动：检测 Squirrel → 若已安装则自动写入配置
  const squirrelInstalled = fs.existsSync(SQUIRREL)
  if (squirrelInstalled) {
    installConfig()
  }

  autoUpdater.checkForUpdatesAndNotify()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// 将 config/ 写入 ~/Library/Rime/，不覆盖用户词库
function installConfig() {
  fs.mkdirSync(RIME_DIR, { recursive: true })
  for (const file of fs.readdirSync(CONFIG_DIR)) {
    const src = path.join(CONFIG_DIR, file)
    const dest = path.join(RIME_DIR, file)
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true })
      for (const sub of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, sub), path.join(dest, sub))
      }
    } else {
      fs.copyFileSync(src, dest)
    }
  }
}

// ── IPC handlers ────────────────────────────────────────────

ipcMain.handle('rime:check-squirrel', () => fs.existsSync(SQUIRREL))

ipcMain.handle('rime:deploy', () => new Promise((resolve, reject) => {
  execFile(SQUIRREL, ['--reload'], (err) => {
    if (err) reject(err.message)
    else resolve(true)
  })
}))

ipcMain.handle('rime:read-file', (_, filename) => {
  const p = path.join(RIME_DIR, filename)
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null
})

ipcMain.handle('rime:write-file', (_, filename, content) => {
  fs.writeFileSync(path.join(RIME_DIR, filename), content, 'utf-8')
  return true
})

ipcMain.handle('rime:open-squirrel-download', () => {
  shell.openExternal('https://rime.im')
})
