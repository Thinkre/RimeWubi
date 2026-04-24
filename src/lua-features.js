// ── LuaFeatures 模块 ──────────────────────────────────────────

const LUA_DEFS = [
  {
    id: 'save_word',
    label: 'Ctrl+Enter 造词',
    hint: '选中候选词后按 Ctrl+Enter 手动造词（五笔拼音混打方案）',
    schema: 'wubi86_jidian_pinyin.schema.yaml',
  },
  {
    id: 'code_hint',
    label: '拼音注释显五笔编码',
    hint: '拼音输入时候选词下方显示对应五笔编码',
    schema: 'wubi86_jidian_pinyin.schema.yaml',
  },
  {
    id: 'date_translator',
    label: '日期 / 时间快速输入',
    hint: '输入 date / time / week 触发日期时间候选',
    schema: 'wubi86_jidian.schema.yaml',
  },
  {
    id: 'single_char_first',
    label: '单字优先',
    hint: '候选框中单字排在词组前面（与「纯单字」互斥）',
    schema: 'wubi86_jidian.schema.yaml',
    exclusive: 'single_char_only',
  },
  {
    id: 'single_char_only',
    label: '纯单字模式',
    hint: '只显示单字候选，过滤所有词组（与「单字优先」互斥）',
    schema: 'wubi86_jidian.schema.yaml',
    exclusive: 'single_char_first',
  },
]

let luaStates  = {}   // { id: bool } from backend
let luaPending = {}   // { id: bool } unsaved changes

async function luaInit() {
  luaStates = await window.rime.readLuaFeatures()
  luaRender()
  document.getElementById('lua-save-btn').addEventListener('click', luaSave)
}

function luaRender() {
  const container = document.getElementById('lua-groups')
  container.innerHTML = ''

  for (const def of LUA_DEFS) {
    const active = luaPending[def.id] !== undefined ? luaPending[def.id] : luaStates[def.id]

    const row = document.createElement('div')
    row.className = 'form-row'
    row.innerHTML = `
      <div>
        <div class="form-label">${def.label}</div>
        <div class="form-hint">${def.hint}</div>
        <div class="form-hint" style="margin-top:2px;opacity:.7">📄 ${def.schema}</div>
      </div>
      <label class="kb-toggle">
        <input type="checkbox" data-id="${def.id}" ${active ? 'checked' : ''}>
        <span class="kb-slider"></span>
      </label>
    `
    container.appendChild(row)
  }

  container.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id
      luaPending[id] = cb.checked

      // 互斥处理：开启一个时自动关闭另一个
      const def = LUA_DEFS.find(d => d.id === id)
      if (def.exclusive && cb.checked) {
        luaPending[def.exclusive] = false
        const other = container.querySelector(`input[data-id="${def.exclusive}"]`)
        if (other) other.checked = false
      }
    })
  })
}

async function luaSave() {
  if (!Object.keys(luaPending).length) return

  const statusEl = document.getElementById('lua-save-status')
  statusEl.textContent = '保存中…'

  try {
    for (const [id, enabled] of Object.entries(luaPending)) {
      await window.rime.setLuaFeature(id, enabled)
      luaStates[id] = enabled
    }
    luaPending = {}
    statusEl.textContent = '✓ 已保存（需点击「部署生效」生效）'
    setTimeout(() => { statusEl.textContent = '' }, 3000)
  } catch (e) {
    statusEl.textContent = `✗ ${e}`
  }
}

let luaInitialized = false
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (link.dataset.module === 'lua-features' && !luaInitialized) {
      luaInitialized = true
      luaInit()
    }
  })
})
