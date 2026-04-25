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

// ── 词库 IPC ──────────────────────────────────────────────────

function parseDictEntries(content) {
  const idx = content.indexOf('\n...\n')
  if (idx === -1) return []
  const entries = []
  for (const line of content.slice(idx + 5).split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const parts = line.split('\t')
    if (parts.length >= 2) entries.push({ word: parts[0], code: parts[1], weight: parts[2] || '' })
  }
  return entries
}

function serializeDictEntries(content, entries) {
  const idx = content.indexOf('\n...\n')
  if (idx === -1) return content
  const header = content.slice(0, idx + 5)
  const body = entries.map(e => e.weight ? `${e.word}\t${e.code}\t${e.weight}` : `${e.word}\t${e.code}`).join('\n')
  return header + (body ? body + '\n' : '')
}

ipcMain.handle('vocab:read-user', () => {
  const p = path.join(RIME_DIR, 'wubi86_jidian_user.dict.yaml')
  return fs.existsSync(p) ? parseDictEntries(fs.readFileSync(p, 'utf-8')) : []
})

ipcMain.handle('vocab:write-user', (_, entries) => {
  const p = path.join(RIME_DIR, 'wubi86_jidian_user.dict.yaml')
  const content = fs.readFileSync(p, 'utf-8')
  fs.writeFileSync(p, serializeDictEntries(content, entries), 'utf-8')
  return true
})

ipcMain.handle('vocab:search-extra', (_, query) => {
  const p = path.join(RIME_DIR, 'wubi86_jidian_extra.dict.yaml')
  if (!fs.existsSync(p)) return []
  const all = parseDictEntries(fs.readFileSync(p, 'utf-8'))
  if (!query) return all.slice(0, 60)
  const q = query.toLowerCase()
  return all.filter(e => e.word.includes(query) || e.code.toLowerCase().startsWith(q)).slice(0, 100)
})

// ── 应用选项 IPC ─────────────────────────────────────────────

ipcMain.handle('app-options:read', () => {
  const p = path.join(RIME_DIR, 'squirrel.custom.yaml')
  if (!fs.existsSync(p)) return {}
  const doc = yaml.load(fs.readFileSync(p, 'utf-8'))
  return doc?.patch?.app_options || {}
})

ipcMain.handle('app-options:write', (_, apps) => {
  const p = path.join(RIME_DIR, 'squirrel.custom.yaml')
  let content = fs.readFileSync(p, 'utf-8')

  const lines = content.split('\n')
  let start = -1, end = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (/^ {2}app_options:/.test(lines[i])) {
      start = i
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() && /^ {0,2}\S/.test(lines[j])) { end = j; break }
      }
      break
    }
  }

  const block = ['  app_options:']
  for (const [id, opts] of Object.entries(apps)) {
    block.push(`    ${id}:`)
    for (const [k, v] of Object.entries(opts)) block.push(`      ${k}: ${v}`)
  }

  const result = start === -1
    ? content
    : [...lines.slice(0, start), ...block, ...lines.slice(end)].join('\n')

  fs.writeFileSync(p, result, 'utf-8')
  return true
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
