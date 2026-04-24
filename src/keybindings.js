// ── Keybindings 模块 ──────────────────────────────────────────

// 每组定义：含该组所有绑定，以及 UI 显示信息
const KB_GROUPS = [
  {
    id: 'semicolon2',
    label: '分号选第 2 候选',
    hint: '按 ; 直接上屏第 2 候选词',
    keys: '⌨️  ;  →  候选 2',
    bindings: [
      { when: 'has_menu', accept: 'semicolon', send: 2 },
    ],
  },
  {
    id: 'apostrophe3',
    label: '引号选第 3 候选',
    hint: "按 ' 直接上屏第 3 候选词",
    keys: "⌨️  '  →  候选 3",
    bindings: [
      { when: 'has_menu', accept: 'apostrophe', send: 3 },
    ],
  },
  {
    id: 'bracket_page',
    label: '[ ] 翻页',
    hint: '[ 上翻页，] 下翻页',
    keys: '⌨️  [  →  上页　]  →  下页',
    bindings: [
      { when: 'has_menu', accept: 'bracketleft',  send: 'Page_Up'   },
      { when: 'has_menu', accept: 'bracketright', send: 'Page_Down' },
    ],
  },
  {
    id: 'tab_page',
    label: 'Tab / Shift+Tab 翻页',
    hint: 'Tab 下翻页，Shift+Tab 上翻页',
    keys: '⌨️  Tab  →  下页　⇧Tab  →  上页',
    bindings: [
      { when: 'has_menu', accept: 'Tab',       send: 'Page_Down' },
      { when: 'has_menu', accept: 'Shift+Tab', send: 'Page_Up'   },
    ],
  },
  {
    id: 'emacs',
    label: 'Emacs 编辑键',
    hint: 'Ctrl+n/p 翻页，Ctrl+b/f/a/e 光标，Ctrl+h/d 删除，Ctrl+g 退出',
    keys: '⌨️  Ctrl+n/p/b/f/a/e/d/k/h/g',
    bindings: [
      { when: 'composing', accept: 'Control+p',            send: 'Up'          },
      { when: 'composing', accept: 'Control+n',            send: 'Down'        },
      { when: 'composing', accept: 'Control+b',            send: 'Left'        },
      { when: 'composing', accept: 'Control+f',            send: 'Right'       },
      { when: 'composing', accept: 'Control+a',            send: 'Home'        },
      { when: 'composing', accept: 'Control+e',            send: 'End'         },
      { when: 'composing', accept: 'Control+d',            send: 'Delete'      },
      { when: 'composing', accept: 'Control+k',            send: 'Shift+Delete'},
      { when: 'composing', accept: 'Control+h',            send: 'BackSpace'   },
      { when: 'composing', accept: 'Control+g',            send: 'Escape'      },
      { when: 'composing', accept: 'Control+bracketleft',  send: 'Escape'      },
      { when: 'composing', accept: 'Control+v',            send: 'Page_Down'   },
    ],
  },
]

// 判断某组是否完全启用（所有绑定都存在）
function isGroupActive(allBindings, group) {
  return group.bindings.every(gb =>
    allBindings.some(b =>
      b.when === gb.when &&
      b.accept === gb.accept &&
      String(b.send) === String(gb.send)
    )
  )
}

// 启用一组：先移除该组 accept 键的旧绑定，再追加
function enableGroup(allBindings, group) {
  const accepts = new Set(group.bindings.map(b => b.when + '|' + b.accept))
  return [
    ...allBindings.filter(b => !accepts.has(b.when + '|' + b.accept)),
    ...group.bindings,
  ]
}

// 禁用一组：移除该组 accept 键的所有绑定
function disableGroup(allBindings, group) {
  const accepts = new Set(group.bindings.map(b => b.when + '|' + b.accept))
  return allBindings.filter(b => !accepts.has(b.when + '|' + b.accept))
}

// ──────────────────────────────────────────────────────────────

let kbBindings = []   // 当前完整 bindings 数组（工作副本）
let kbPending  = {}   // 待保存的 toggle 状态变化 { groupId: true/false }

async function kbInit() {
  kbBindings = await window.rime.readKeybindings()
  kbRender()
  document.getElementById('kb-save-btn').addEventListener('click', kbSave)
}

function kbRender() {
  const container = document.getElementById('kb-groups')
  container.innerHTML = ''

  for (const group of KB_GROUPS) {
    const active = kbPending[group.id] !== undefined
      ? kbPending[group.id]
      : isGroupActive(kbBindings, group)

    const row = document.createElement('div')
    row.className = 'form-row'
    row.innerHTML = `
      <div>
        <div class="form-label">${group.label}</div>
        <div class="form-hint">${group.hint}</div>
        <div class="form-hint kb-keys">${group.keys}</div>
      </div>
      <label class="kb-toggle">
        <input type="checkbox" data-group="${group.id}" ${active ? 'checked' : ''}>
        <span class="kb-slider"></span>
      </label>
    `
    container.appendChild(row)
  }

  container.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      kbPending[cb.dataset.group] = cb.checked
    })
  })
}

async function kbSave() {
  if (!Object.keys(kbPending).length) return

  const statusEl = document.getElementById('kb-save-status')
  statusEl.textContent = '保存中…'

  let bindings = [...kbBindings]
  for (const [id, active] of Object.entries(kbPending)) {
    const group = KB_GROUPS.find(g => g.id === id)
    bindings = active ? enableGroup(bindings, group) : disableGroup(bindings, group)
  }

  try {
    await window.rime.writeKeybindings(bindings)
    kbBindings = bindings
    kbPending = {}
    statusEl.textContent = '✓ 已保存（需点击「部署生效」生效）'
    setTimeout(() => { statusEl.textContent = '' }, 3000)
  } catch (e) {
    statusEl.textContent = `✗ ${e}`
  }
}

// 激活时初始化（只一次）
let kbInitialized = false
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (link.dataset.module === 'keybindings' && !kbInitialized) {
      kbInitialized = true
      kbInit()
    }
  })
})
