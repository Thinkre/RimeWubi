const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execFile } = require('child_process')
const yaml = require('js-yaml')

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

// ── Lua 功能 IPC ─────────────────────────────────────────────

const LUA_FEATURES = [
  { id: 'save_word',       file: 'wubi86_jidian_pinyin.schema.yaml', pattern: 'lua_processor@*wubi_save_word' },
  { id: 'code_hint',       file: 'wubi86_jidian_pinyin.schema.yaml', pattern: 'lua_filter@*wubi86_jidian_pinyin_code_hint' },
  { id: 'date_translator', file: 'wubi86_jidian.schema.yaml',        pattern: 'lua_translator@*wubi86_jidian_date_translator' },
  { id: 'single_char_first', file: 'wubi86_jidian.schema.yaml',      pattern: 'lua_filter@*wubi86_jidian_single_char_first_filter' },
  { id: 'single_char_only',  file: 'wubi86_jidian.schema.yaml',      pattern: 'lua_filter@*wubi86_jidian_single_char_only' },
]

function escRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

ipcMain.handle('lua:read-features', () => {
  const result = {}
  for (const f of LUA_FEATURES) {
    const p = path.join(RIME_DIR, f.file)
    if (!fs.existsSync(p)) { result[f.id] = false; continue }
    const content = fs.readFileSync(p, 'utf-8')
    result[f.id] = new RegExp(`^\\s+- ${escRx(f.pattern)}`, 'm').test(content)
  }
  return result
})

ipcMain.handle('lua:set-feature', (_, id, enabled) => {
  const feature = LUA_FEATURES.find(f => f.id === id)
  const p = path.join(RIME_DIR, feature.file)
  let content = fs.readFileSync(p, 'utf-8')
  const pat = escRx(feature.pattern)

  if (enabled) {
    content = content.replace(new RegExp(`^#(\\s+- ${pat}.*)`, 'm'), '$1')
  } else {
    content = content.replace(new RegExp(`^(\\s+- ${pat}.*)`, 'm'), '#$1')
  }

  fs.writeFileSync(p, content, 'utf-8')
  return true
})

// ── 按键绑定 IPC ─────────────────────────────────────────────

ipcMain.handle('keybindings:read', () => {
  const p = path.join(RIME_DIR, 'default.custom.yaml')
  if (!fs.existsSync(p)) return []
  const doc = yaml.load(fs.readFileSync(p, 'utf-8'))
  return doc?.patch?.key_binder?.bindings || []
})

ipcMain.handle('keybindings:write', (_, bindings) => {
  const p = path.join(RIME_DIR, 'default.custom.yaml')
  const doc = yaml.load(fs.readFileSync(p, 'utf-8'))
  if (!doc.patch) doc.patch = {}
  if (!doc.patch.key_binder) doc.patch.key_binder = {}
  doc.patch.key_binder.bindings = bindings
  fs.writeFileSync(p, yaml.dump(doc, { lineWidth: -1 }), 'utf-8')
  return true
})

// ── Squirrel 外观 IPC ────────────────────────────────────────

// 读取 squirrel.custom.yaml 中的 patch 对象
ipcMain.handle('squirrel:read-style', () => {
  const p = path.join(RIME_DIR, 'squirrel.custom.yaml')
  if (!fs.existsSync(p)) return {}
  const doc = yaml.load(fs.readFileSync(p, 'utf-8'))
  return doc?.patch || {}
})

// 逐行替换指定 scheme 下的指定字段，保留注释
ipcMain.handle('squirrel:update-scheme', (_, schemeName, fields) => {
  const p = path.join(RIME_DIR, 'squirrel.custom.yaml')
  let content = fs.readFileSync(p, 'utf-8')

  for (const [field, value] of Object.entries(fields)) {
    content = setSchemeField(content, schemeName, field, value)
  }

  fs.writeFileSync(p, content, 'utf-8')
  return true
})

// 在 scheme 块内找到字段并替换值，注释保留
function setSchemeField(content, scheme, field, value) {
  const lines = content.split('\n')
  let inScheme = false
  let schemeIndentLen = -1

  return lines.map(line => {
    const indent = line.length - line.trimStart().length
    const trimmed = line.trimStart()

    if (!inScheme) {
      if (trimmed.startsWith(`${scheme}:`)) {
        inScheme = true
        schemeIndentLen = indent
      }
      return line
    }

    // 离开 scheme 块（非空行且缩进 ≤ scheme 头部）
    if (line.trim() && indent <= schemeIndentLen) {
      inScheme = false
      return line
    }

    // 匹配字段行（带或不带行尾注释）
    const m = line.match(new RegExp(`^(\\s+${field}:\\s*)(0x[0-9a-fA-F]+|\\d+)(\\s*#.*)?$`))
    if (m) return `${m[1]}${value}${m[3] || ''}`

    return line
  }).join('\n')
}
