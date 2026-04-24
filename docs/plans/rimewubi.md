# RimeWubi 实现计划

**日期：** 2026-04-25
**设计文档：** `docs/superpowers/specs/2026-04-25-rimewubi-design.md`
**状态：** 待执行

---

## 项目概述

RimeWubi = Rime 五笔配置发行版 + 原生 macOS GUI 配置 App（Electron）。

两个独立子系统，分阶段交付：
- **Phase 1**：Rime 配置层（可独立使用）
- **Phase 2**：Electron 配置 App

---

## Phase 1：Rime 配置层

### 目标
打包完整可用的五笔配置，用户 `bash install.sh` 即可使用，无需手动编辑任何文件。

### 任务清单

#### P1-1 建仓结构
- 新建 GitHub 仓库 `RimeWubi`
- 初始化 `config/` 目录
- 写 `install.sh`（复制到 `~/Library/Rime/` + 触发 `squirrel --reload`）
- 写冲突备份逻辑（`~/Library/Rime/backup-<timestamp>/`）

#### P1-2 核心配置文件
从现有可用配置中整理以下文件进 `config/`：
- `squirrel.custom.yaml`（玫枫亮/暗皮肤）
- `default.custom.yaml`（全局按键、方案列表）
- `wubi86_jidian.schema.yaml`
- `wubi86_jidian.dict.yaml`
- `wubi86_jidian_extra.dict.yaml`
- `wubi86_jidian_pinyin.schema.yaml`（五笔拼音混打）
- `wubi86_jidian_trad.schema.yaml`（繁体）
- `wubi86_jidian_trad_pinyin.schema.yaml`
- `numbers.schema.yaml`
- `pinyin_simp.schema.yaml` + `pinyin_simp.dict.yaml`

#### P1-3 Lua 脚本
整理进 `config/lua/`：
- `wubi_save_word.lua`（Ctrl+Enter 造词）
- `wubi86_jidian_pinyin_code_hint.lua`（拼音显五笔编码注释）
- `wubi86_jidian_date_translator.lua`
- `wubi86_jidian_single_char_first_filter.lua`
- `wubi86_jidian_single_char_only.lua`

#### P1-4 GitHub Actions CI
- workflow：tag `v*` 触发，验证配置完整性
- README 初稿：截图占位 + 安装说明 + 方案说明

#### P1-5 验收标准
- [ ] 全新 macOS + Squirrel 环境，`bash install.sh` 一键完成
- [ ] 五笔基础输入正常
- [ ] Ctrl+Enter 造词生效
- [ ] 拼音打字能看到五笔编码注释

---

## Phase 2：Electron 配置 App

### 目标
提供 GUI，用户无需接触任何 yaml 文件，一键安装 + 配置 + 部署。

### 关键设计约束
- **绑定 Squirrel**：App 内检测 Squirrel 是否安装，未装则引导下载（选方案 B，RimeWubi.dmg 包含引导，不打包 Squirrel 本身）
- **只写 patch 层**：所有修改写 `.custom.yaml`，不改原始配置文件
- **部署按钮常驻**：调用 `squirrel --reload`，改完立即生效

### 任务清单

#### P2-1 Electron 骨架
- `package.json`（electron, electron-builder, electron-updater）
- `main.js`（主进程：窗口管理、IPC、文件读写、squirrel --reload 调用）
- `src/index.html`（侧边栏导航结构）
- `src/renderer.js`（渲染进程入口）

#### P2-2 六个功能模块
按以下顺序实现（每个独立可测试）：

| 顺序 | 模块 | 核心能力 |
|------|------|---------|
| 1 | Deploy.js | 顶部「部署生效」按钮 + 状态显示，最小 MVP |
| 2 | Appearance.js | 读写皮肤颜色/字体/圆角，实时预览候选框 |
| 3 | Keybindings.js | 分号选2/引号选3/[]翻页/Tab翻页/Emacs 开关 |
| 4 | LuaFeatures.js | 拼音注释/造词开关（写 lua 对应 custom.yaml）|
| 5 | AppOptions.js | 应用英文模式列表增删 |
| 6 | Vocabulary.js | 用户词条查看/添加/extra 词库查看 |

#### P2-3 首次启动流程
- 检测 Squirrel 是否安装（检查 `/Library/Input Methods/Squirrel.app`）
- 未安装：弹引导窗口，提供 Squirrel 官方 dmg 下载链接
- 已安装：自动将 `config/` 写入 `~/Library/Rime/`，触发部署

#### P2-4 GitHub Actions 打包
- 构建 `.dmg`（electron-builder）
- 发布到 GitHub Releases
- electron-updater 自动更新支持

#### P2-5 验收标准
- [ ] 下载 RimeWubi.dmg，安装后双击打开 App
- [ ] 未装 Squirrel → 看到引导，点击跳转下载页
- [ ] 已装 Squirrel → 自动完成配置写入和部署
- [ ] 六个模块改完点「部署生效」，输入法即时反映变化
- [ ] App 有可用更新时，弹提示并支持一键升级

---

## 执行顺序建议

```
Phase 1 → Phase 1 验收通过 → Phase 2
```

Phase 1 完成后即可对外发布（开发者/高级用户群体可用），Phase 2 完成后面向普通用户。

---

## 风险与注意

| 风险 | 说明 |
|------|------|
| Squirrel API | `squirrel --reload` 路径在不同版本可能不同，需实际测试 |
| Lua 兼容性 | Rime 内置 Lua 版本需确认，部分 Lua 特性可能不可用 |
| App 签名 | 无签名的 dmg macOS 会拦截，发布前需申请开发者证书或说明用户如何绕过 |
| 配置覆盖 | install.sh 和 App 首次启动都会覆盖用户现有配置，备份逻辑必须健壮 |
