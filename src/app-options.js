// ── AppOptions 模块 ───────────────────────────────────────────

const AO_PRESETS = [
  { id: 'com.google.Chrome',         name: 'Chrome' },
  { id: 'com.apple.Safari',          name: 'Safari' },
  { id: 'com.apple.Terminal',        name: 'Terminal' },
  { id: 'com.microsoft.VSCode',      name: 'VS Code' },
  { id: 'com.googlecode.iterm2',     name: 'iTerm2' },
  { id: 'com.sublimetext.4',         name: 'Sublime Text' },
  { id: 'com.jetbrains.intellij',    name: 'IntelliJ IDEA' },
  { id: 'com.termius-dmg.mac',       name: 'Termius' },
]

let aoApps = {}   // { bundleId: { ascii_mode: true } }

async function aoInit() {
  aoApps = await window.rime.readAppOptions()
  aoRender()

  document.getElementById('ao-add-btn').addEventListener('click', () => {
    const input = document.getElementById('ao-input')
    const id = input.value.trim()
    if (!id) return
    if (!aoApps[id]) {
      aoApps[id] = { ascii_mode: true }
      aoRender()
    }
    input.value = ''
  })

  document.getElementById('ao-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('ao-add-btn').click()
  })

  document.getElementById('ao-save-btn').addEventListener('click', aoSave)
}

function aoRender() {
  aoRenderList()
  aoRenderPresets()
}

function aoRenderList() {
  const container = document.getElementById('ao-list')
  const entries = Object.entries(aoApps)

  if (!entries.length) {
    container.innerHTML = '<p class="ao-empty">暂无应用，使用下方快速添加或手动输入</p>'
    return
  }

  container.innerHTML = ''
  for (const [id] of entries) {
    const item = document.createElement('div')
    item.className = 'ao-item'
    item.innerHTML = `
      <div class="ao-item-id">${id}</div>
      <button class="btn btn-secondary ao-remove-btn" data-id="${id}">移除</button>
    `
    container.appendChild(item)
  }

  container.querySelectorAll('.ao-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      delete aoApps[btn.dataset.id]
      aoRender()
    })
  })
}

function aoRenderPresets() {
  const container = document.getElementById('ao-presets')
  container.innerHTML = ''
  for (const { id, name } of AO_PRESETS) {
    const added = !!aoApps[id]
    const chip = document.createElement('button')
    chip.className = 'ao-chip' + (added ? ' ao-chip-added' : '')
    chip.textContent = (added ? '✓ ' : '+ ') + name
    chip.dataset.id = id
    chip.addEventListener('click', () => {
      if (aoApps[id]) {
        delete aoApps[id]
      } else {
        aoApps[id] = { ascii_mode: true }
      }
      aoRender()
    })
    container.appendChild(chip)
  }
}

async function aoSave() {
  const statusEl = document.getElementById('ao-save-status')
  statusEl.textContent = '保存中…'
  try {
    await window.rime.writeAppOptions(aoApps)
    statusEl.textContent = '✓ 已保存（需点击「部署生效」生效）'
    setTimeout(() => { statusEl.textContent = '' }, 3000)
  } catch (e) {
    statusEl.textContent = `✗ ${e}`
  }
}

let aoInitialized = false
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (link.dataset.module === 'app-options' && !aoInitialized) {
      aoInitialized = true
      aoInit()
    }
  })
})
