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

// 启动时检测 Squirrel
;(async () => {
  const installed = await window.rime.checkSquirrel()
  if (!installed) {
    document.getElementById('squirrel-gate').classList.add('visible')
  }
})()
