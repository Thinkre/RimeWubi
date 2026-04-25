# RimeWubi 任务清单

**计划文档：** `docs/plans/rimewubi.md`
**设计文档：** `docs/superpowers/specs/2026-04-25-rimewubi-design.md`
**最后更新：** 2026-04-25

---

## Phase 1：Rime 配置层

| ID | 任务 | 状态 | 备注 |
|----|------|------|------|
| P1-1 | 建仓 + init `config/` 结构 + `install.sh` | ✅ 完成 | |
| P1-2 | 整理核心配置文件进 `config/` | ✅ 完成 | 共11个 yaml |
| P1-3 | 整理 Lua 脚本进 `config/lua/` | ✅ 完成 | 共5个 lua |
| P1-4 | GitHub Actions CI + README 初稿 | ✅ 完成 | https://github.com/Thinkre/RimeWubi |
| P1-5 | Phase 1 验收 | ✅ 完成 | install.sh 本地验收通过 |

---

## Phase 2：Electron App

| ID | 任务 | 状态 | 备注 |
|----|------|------|------|
| P2-1 | Electron 骨架（main.js + index.html + renderer.js）| ✅ 完成 | |
| P2-2a | Deploy 模块（最小 MVP）| ✅ 完成 | |
| P2-2b | Appearance 模块 | ✅ 完成 | BGR↔hex + 实时预览 |
| P2-2c | Keybindings 模块 | ✅ 完成 | |
| P2-2d | LuaFeatures 模块 | ✅ 完成 | 互斥逻辑 |
| P2-2e | AppOptions 模块 | ✅ 完成 | |
| P2-2f | Vocabulary 模块 | ✅ 完成 | 用户词条增删 + 扩展词库搜索 |
| P2-3 | 首次启动流程（Squirrel 检测 + 引导）| ✅ 完成 | installConfig skip-if-exists + 重新检测按钮 |
| P2-4 | GitHub Actions 打包 + electron-updater | ✅ 完成 | arm64 dmg 已发布至 v0.1.0 |
| P2-5 | Phase 2 验收 | ✅ 完成 | 三层连通全绿，CI 绿 |

---

## 状态说明

- ⬜ 待做
- 🔄 进行中
- ✅ 完成
- ❌ 阻塞（需解决后继续）
