// ── Vocabulary 模块 ───────────────────────────────────────────

let vocEntries = []   // user dict entries (working copy)
let vocDirty   = false

async function vocInit() {
  vocEntries = await window.rime.readUserVocab()
  vocRenderUser()
  vocBindTabs()
  vocBindUserActions()
}

// ── Tab 切换 ──────────────────────────────────────────────────

function vocBindTabs() {
  document.querySelectorAll('[data-voc-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-voc-tab]').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const panel = tab.dataset.vocTab
      document.getElementById('voc-user-panel').style.display  = panel === 'user'  ? '' : 'none'
      document.getElementById('voc-extra-panel').style.display = panel === 'extra' ? '' : 'none'
      if (panel === 'extra') vocLoadExtra('')
    })
  })
}

// ── 用户词条 ──────────────────────────────────────────────────

function vocRenderUser() {
  const container = document.getElementById('voc-user-list')

  if (!vocEntries.length) {
    container.innerHTML = '<p class="ao-empty">暂无用户词条</p>'
    return
  }

  const table = document.createElement('table')
  table.className = 'voc-table'
  table.innerHTML = `
    <thead>
      <tr>
        <th>词条</th><th>编码</th><th>权重</th><th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `
  const tbody = table.querySelector('tbody')
  vocEntries.forEach((e, i) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td class="voc-word">${e.word}</td>
      <td class="voc-code">${e.code}</td>
      <td class="voc-weight">${e.weight || '—'}</td>
      <td><button class="btn btn-secondary ao-remove-btn" data-idx="${i}">删除</button></td>
    `
    tbody.appendChild(tr)
  })
  container.innerHTML = ''
  container.appendChild(table)

  container.querySelectorAll('.ao-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      vocEntries.splice(Number(btn.dataset.idx), 1)
      vocDirty = true
      vocRenderUser()
    })
  })
}

function vocBindUserActions() {
  document.getElementById('voc-add-btn').addEventListener('click', () => {
    const word   = document.getElementById('voc-word').value.trim()
    const code   = document.getElementById('voc-code').value.trim().toLowerCase()
    const weight = document.getElementById('voc-weight').value.trim()

    if (!word) return vocFlash('请输入词条')
    if (!code || !/^[a-z]{1,4}$/.test(code)) return vocFlash('编码应为 1–4 个小写字母')
    if (vocEntries.some(e => e.word === word && e.code === code)) return vocFlash('该词条已存在')

    vocEntries.push({ word, code, weight })
    vocDirty = true
    document.getElementById('voc-word').value  = ''
    document.getElementById('voc-code').value  = ''
    document.getElementById('voc-weight').value = ''
    vocRenderUser()
  })

  ;['voc-word','voc-code','voc-weight'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('voc-add-btn').click()
    })
  })

  document.getElementById('voc-save-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('voc-save-status')
    statusEl.textContent = '保存中…'
    try {
      await window.rime.writeUserVocab(vocEntries)
      vocDirty = false
      statusEl.textContent = '✓ 已保存（需点击「部署生效」生效）'
      setTimeout(() => { statusEl.textContent = '' }, 3000)
    } catch (e) {
      statusEl.textContent = `✗ ${e}`
    }
  })
}

function vocFlash(msg) {
  const el = document.getElementById('voc-save-status')
  el.textContent = msg
  el.style.color = 'var(--color-danger)'
  setTimeout(() => { el.textContent = ''; el.style.color = '' }, 2000)
}

// ── 扩展词库搜索 ──────────────────────────────────────────────

let vocExtraTimer = null

async function vocLoadExtra(query) {
  const results = await window.rime.searchExtra(query)
  const container = document.getElementById('voc-extra-list')
  const countEl   = document.getElementById('voc-extra-count')

  if (!results.length) {
    container.innerHTML = '<p class="ao-empty">无匹配结果</p>'
    countEl.textContent = ''
    return
  }

  const table = document.createElement('table')
  table.className = 'voc-table'
  table.innerHTML = '<thead><tr><th>词条</th><th>编码</th></tr></thead><tbody></tbody>'
  const tbody = table.querySelector('tbody')
  results.forEach(e => {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td class="voc-word">${e.word}</td><td class="voc-code">${e.code}</td>`
    tbody.appendChild(tr)
  })
  container.innerHTML = ''
  container.appendChild(table)
  countEl.textContent = query ? `找到 ${results.length} 条` : `显示前 ${results.length} 条，输入关键字搜索`
}

// 搜索框防抖
document.getElementById('voc-search')?.addEventListener('input', e => {
  clearTimeout(vocExtraTimer)
  vocExtraTimer = setTimeout(() => vocLoadExtra(e.target.value.trim()), 250)
})

// ── 激活初始化 ────────────────────────────────────────────────

let vocInitialized = false
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (link.dataset.module === 'vocabulary' && !vocInitialized) {
      vocInitialized = true
      vocInit()
    }
  })
})
