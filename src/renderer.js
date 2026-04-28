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
async function runSquirrelCheck() {
  const installed = await window.rime.checkSquirrel()
  const gate = document.getElementById('squirrel-gate')
  if (!installed) {
    gate.classList.add('visible')
    squirrelStatus.textContent = '未安装'
    squirrelStatus.className = 'status status-err'
    deployBtn.disabled = true
  } else {
    gate.classList.remove('visible')
    squirrelStatus.textContent = '已安装'
    squirrelStatus.className = 'status status-ok'
    deployBtn.disabled = false
  }
  return installed
}

document.getElementById('download-btn').addEventListener('click', () => {
  window.rime.openSquirrelDownload()
})

document.getElementById('auto-install-btn').addEventListener('click', async () => {
  const btn = document.getElementById('auto-install-btn')
  const status = document.getElementById('install-status')
  btn.disabled = true
  btn.textContent = '下载中…'
  status.textContent = '正在下载鼠须管安装包，请稍候…'
  try {
    const result = await window.rime.installSquirrel()
    if (result === 'open') {
      status.textContent = '安装包已打开，请在系统安装界面完成安装，完成后点击「已安装，重新检测」。'
      btn.disabled = false
      btn.textContent = '自动安装（Homebrew）'
    } else {
      status.textContent = '安装成功！正在检测…'
      await runSquirrelCheck()
      status.textContent = ''
    }
  } catch (err) {
    status.textContent = `安装失败：${err}`
    btn.disabled = false
    btn.textContent = '自动安装（Homebrew）'
  }
})

document.getElementById('recheck-btn').addEventListener('click', async () => {
  const btn = document.getElementById('recheck-btn')
  btn.disabled = true
  btn.textContent = '检测中…'
  await runSquirrelCheck()
  btn.disabled = false
  btn.textContent = '已安装，重新检测'
})

;(async () => {
  await runSquirrelCheck()
  const last = localStorage.getItem('lastDeploy')
  if (last) deployLast.textContent = `上次部署：${last}`
})()
