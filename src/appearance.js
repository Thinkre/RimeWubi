// ── Appearance 模块 ───────────────────────────────────────────

const COLOR_FIELDS = [
  { key: 'back_color',                    label: '候选框背景' },
  { key: 'border_color',                  label: '边框颜色' },
  { key: 'hilited_candidate_back_color',  label: '选中项背景' },
  { key: 'hilited_candidate_text_color',  label: '选中项文字' },
  { key: 'candidate_text_color',          label: '候选词文字' },
  { key: 'comment_text_color',            label: '注释（编码）' },
  { key: 'label_color',                   label: '序号颜色' },
]

const NUM_FIELDS = [
  { key: 'corner_radius', label: '圆角大小', min: 0, max: 20, step: 1 },
  { key: 'font_point',    label: '候选字号', min: 10, max: 30, step: 1 },
]

// BGR integer (Squirrel) ↔ #RRGGBB (HTML color input)
function bgrToHex(n) {
  if (n == null) return '#888888'
  const v = typeof n === 'string' ? parseInt(n, 16) : n
  const b = (v >> 16) & 0xFF
  const g = (v >> 8) & 0xFF
  const r = v & 0xFF
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function hexToBgr(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const n = (b << 16) | (g << 8) | r
  return '0x' + n.toString(16).toUpperCase().padStart(6, '0')
}

// ──────────────────────────────────────────────────────────────

let apStyle = {}           // full patch object from squirrel.custom.yaml
let apScheme = 'roseo_maple'
let apEdits = {}           // pending edits: { fieldKey: newValue }

async function apInit() {
  apStyle = await window.rime.readSquirrelStyle()
  apRender()

  document.querySelectorAll('.ap-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ap-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      apScheme = tab.dataset.scheme
      apEdits = {}
      apRender()
    })
  })

  document.getElementById('ap-save-btn').addEventListener('click', apSave)
}

function apRender() {
  const scheme = apStyle.preset_color_schemes?.[apScheme] || {}
  apRenderPreview(scheme)
  apRenderFields(scheme)
}

function apRenderPreview(scheme) {
  const box   = document.getElementById('ap-box')
  const bg    = bgrToHex(scheme.back_color)
  const border= bgrToHex(scheme.border_color)
  const hiBg  = bgrToHex(scheme.hilited_candidate_back_color)
  const hiTxt = bgrToHex(scheme.hilited_candidate_text_color)
  const candTxt = bgrToHex(scheme.candidate_text_color)
  const cmtTxt  = bgrToHex(scheme.comment_text_color)
  const labelTxt= bgrToHex(scheme.label_color)
  const radius  = (scheme.corner_radius ?? 5) + 'px'
  const fontSize= (scheme.font_point ?? 16) + 'px'

  box.style.cssText = `
    background:${bg};
    border:1px solid ${border};
    border-radius:${radius};
    font-size:${fontSize};
    --hi-bg:${hiBg};
    --hi-txt:${hiTxt};
    --cand-txt:${candTxt};
    --cmt-txt:${cmtTxt};
    --label-txt:${labelTxt};
  `
}

function apRenderFields(scheme) {
  const container = document.getElementById('ap-fields')
  container.innerHTML = ''

  for (const { key, label } of COLOR_FIELDS) {
    const val = apEdits[key] !== undefined
      ? bgrToHex(parseInt(apEdits[key].replace('0x', ''), 16))
      : bgrToHex(scheme[key])

    const row = document.createElement('div')
    row.className = 'form-row'
    row.innerHTML = `
      <div>
        <div class="form-label">${label}</div>
      </div>
      <input type="color" value="${val}" data-field="${key}" class="ap-color-input">
    `
    container.appendChild(row)
  }

  for (const { key, label, min, max, step } of NUM_FIELDS) {
    const val = apEdits[key] !== undefined ? apEdits[key] : (scheme[key] ?? (key === 'corner_radius' ? 5 : 16))
    const row = document.createElement('div')
    row.className = 'form-row'
    row.innerHTML = `
      <div>
        <div class="form-label">${label}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="range" min="${min}" max="${max}" step="${step}" value="${val}"
               data-field="${key}" class="ap-range-input" style="width:100px">
        <span class="ap-range-value">${val}</span>
      </div>
    `
    container.appendChild(row)
  }

  // Color input listeners
  container.querySelectorAll('.ap-color-input').forEach(input => {
    input.addEventListener('input', () => {
      apEdits[input.dataset.field] = hexToBgr(input.value)
      apRenderPreview({ ...apStyle.preset_color_schemes?.[apScheme], ...flattenEdits() })
    })
  })

  // Range input listeners
  container.querySelectorAll('.ap-range-input').forEach(input => {
    input.addEventListener('input', () => {
      const val = Number(input.value)
      input.nextElementSibling.textContent = val
      apEdits[input.dataset.field] = val
      apRenderPreview({ ...apStyle.preset_color_schemes?.[apScheme], ...flattenEdits() })
    })
  })
}

function flattenEdits() {
  const out = {}
  for (const [k, v] of Object.entries(apEdits)) {
    // Color fields are BGR strings; numeric fields are numbers
    out[k] = typeof v === 'string' ? parseInt(v.replace('0x', ''), 16) : v
  }
  return out
}

async function apSave() {
  if (!Object.keys(apEdits).length) return

  const statusEl = document.getElementById('ap-save-status')
  statusEl.textContent = '保存中…'

  try {
    await window.rime.updateScheme(apScheme, apEdits)

    // 同步更新本地 apStyle 缓存
    if (!apStyle.preset_color_schemes) apStyle.preset_color_schemes = {}
    if (!apStyle.preset_color_schemes[apScheme]) apStyle.preset_color_schemes[apScheme] = {}
    Object.assign(apStyle.preset_color_schemes[apScheme], flattenEdits())
    apEdits = {}

    statusEl.textContent = '✓ 已保存（需点击「部署生效」生效）'
    setTimeout(() => { statusEl.textContent = '' }, 3000)
  } catch (e) {
    statusEl.textContent = `✗ ${e}`
  }
}

// 模块激活时初始化（只初始化一次）
let apInitialized = false
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (link.dataset.module === 'appearance' && !apInitialized) {
      apInitialized = true
      apInit()
    }
  })
})
