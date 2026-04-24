// 侧边栏导航切换
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault()
    const target = link.dataset.module

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'))

    link.classList.add('active')
    document.getElementById(`module-${target}`)?.classList.add('active')
  })
})

// ── Deploy 模块 ──────────────────────────────────────────────

const deployBtn    = document.getElementById('deploy-btn')
const deployBtnTxt = document.getElementById('deploy-btn-text')
const deployBtnIcon= document.getElementById('deploy-btn-icon')
const deployResult = document.getElementById('deploy-result')
const deployLast   = document.getElementById('deploy-last')
const squirrelStatus = document.getElementById('squirrel-status')

deployBtn.addEventListener('click', async () => {
  deployBtn.disabled = true
  deployBtnIcon.textContent = '⏳'
  deployBtnTxt.textContent = '部署中…'
  deployResult.textContent = ''
  deployResult.className = 'deploy-result'

  try {
    await window.rime.deploy()
    const now = new Date().toLocaleString('zh-CN', { hour12: false })
    deployResult.textContent = '✓ 部署成功'
    deployLast.textContent = `上次部署：${now}`
    localStorage.setItem('lastDeploy', now)
  } catch (err) {
    deployResult.textContent = `✗ 部署失败：${err}`
    deployResult.className = 'deploy-result err'
  } finally {
    deployBtn.disabled = false
    deployBtnIcon.textContent = '⚡'
    deployBtnTxt.textContent = '重新部署'
  }
})

// 启动时检测 Squirrel
;(async () => {
  const installed = await window.rime.checkSquirrel()
  if (!installed) {
    document.getElementById('squirrel-gate').classList.add('visible')
    squirrelStatus.textContent = '未安装'
    squirrelStatus.className = 'status status-err'
  } else {
    squirrelStatus.textContent = '已安装'
    squirrelStatus.className = 'status status-ok'
    deployBtn.disabled = false
  }

  const last = localStorage.getItem('lastDeploy')
  if (last) deployLast.textContent = `上次部署：${last}`
})()
