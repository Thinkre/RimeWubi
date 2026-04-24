# RimeWubi 设计文档

**日期：** 2026-04-25
**状态：** 已确认，待实现

---

## 项目定位

RimeWubi 是一个面向五笔用户的开箱即用 Rime 输入法配置发行版，同时配套原生 macOS GUI 配置 App。目标用户涵盖：

- **五笔老手**：不想折腾配置，直接拿来用
- **五笔新手**：想学五笔，需要开箱即用的环境 + 学码辅助

核心差异化：零命令行安装、学码辅助（拼音显五笔编码）、造词闭环（Ctrl+Enter 入库）。

---

## 仓库结构

```
RimeWubi/
├── README.md
├── install.sh                          # 开发者用：复制配置 + 重部署
├── config/                             # 完整 Rime 配置（独立 fork，不依赖上游）
│   ├── squirrel.custom.yaml            # 外观皮肤（玫枫亮/暗）
│   ├── default.custom.yaml             # 全局按键、方案列表
│   ├── wubi86_jidian_pinyin.schema.yaml
│   ├── wubi86_jidian.schema.yaml
│   ├── wubi86_jidian.dict.yaml
│   ├── wubi86_jidian_extra.dict.yaml
│   ├── wubi86_jidian_trad.schema.yaml
│   ├── wubi86_jidian_trad_pinyin.schema.yaml
│   ├── numbers.schema.yaml
│   ├── pinyin_simp.schema.yaml
│   ├── pinyin_simp.dict.yaml
│   └── lua/
│       ├── wubi_save_word.lua
│       ├── wubi86_jidian_pinyin_code_hint.lua
│       ├── wubi86_jidian_date_translator.lua
│       ├── wubi86_jidian_single_char_first_filter.lua
│       └── wubi86_jidian_single_char_only.lua
└── app/                                # Electron 配置管理 App
    ├── package.json
    ├── main.js
    └── src/
        ├── index.html
        ├── renderer.js
        └── components/
            ├── Appearance.js           # 皮肤/字体/颜色
            ├── Keybindings.js          # 按键绑定开关
            ├── LuaFeatures.js          # Lua 功能开关
            ├── AppOptions.js           # 应用英文模式列表
            ├── Vocabulary.js           # 词库管理
            └── Deploy.js               # 一键重部署
```

---

## App 功能设计

### 技术栈

- **Electron**（Web 技术栈，HTML/CSS/JS）
- 读写 `~/Library/Rime/*.custom.yaml`
- 所有修改写入 patch 层（`.custom.yaml`），不动原始配置文件
- GitHub Actions 自动打包 `.dmg`，发布到 GitHub Releases
- electron-updater 支持 App 内自动更新

### 界面结构

侧边栏导航 + 右侧内容区，风格参考 macOS 系统设置。

```
┌─────────────────────────────────────────────────────┐
│  RimeWubi                              [部署生效]    │
├──────────────┬──────────────────────────────────────┤
│  外观         │                                      │
│  按键绑定     │   （右侧内容区）                      │
│  Lua 功能     │                                      │
│  应用设置     │                                      │
│  词库管理     │                                      │
│  ─────────── │                                      │
│  关于         │                                      │
└──────────────┴──────────────────────────────────────┘
```

### 六个功能模块

| 模块 | 核心功能 |
|------|---------|
| **外观** | 亮/暗皮肤颜色、字体大小、圆角、透明度，实时预览候选框样式 |
| **按键绑定** | 开关：分号选2/引号选3、`[]`翻页、Tab 翻页、Emacs 快捷键 |
| **Lua 功能** | 开关：拼音显示五笔编码注释、Ctrl+Enter 造词 |
| **应用设置** | 列表管理哪些 App 默认英文模式（增/删/搜索） |
| **词库管理** | 查看用户词条、手动添加词条、查看 extra 词库内容 |
| **部署** | 顶部常驻「部署生效」按钮，调用 `squirrel --reload`，显示部署状态 |

---

## 安装流程

### 普通用户（推荐）

```
1. 从 GitHub Releases 下载 RimeWubi.dmg
2. 安装 App，打开
3. 首次启动：App 检测 Squirrel 是否已安装
   → 未安装：引导用户下载安装 Squirrel（弹系统授权窗口）
   → 已安装：跳过
4. App 自动将 config/ 写入 ~/Library/Rime/
5. 自动触发 squirrel --reload
6. 完成，开始使用
```

### 开发者 / 高级用户

```bash
git clone https://github.com/xxx/RimeWubi
bash install.sh   # 复制配置 + 重部署
```

### 更新

- **配置更新**：`git pull && bash install.sh`
- **App 更新**：App 内自动检测新版本，一键升级

### 冲突处理

`install.sh` 安装前自动备份现有配置到 `~/Library/Rime/backup-<timestamp>/`，README 说明还原方法。

---

## README 结构

```
# RimeWubi
> 开箱即用的五笔输入法配置，一键安装，无需编辑配置文件

## 截图（App 界面 + 输入效果）
## 特色功能
## 安装
## 方案说明（五笔老手看这里）
## 手动配置（进阶）
## 更新
## License
```

---

## 项目亮点

| 亮点 | 说明 |
|------|------|
| **学码辅助** | 拼音打字时实时显示五笔编码，帮助新手记忆字根 |
| **造词闭环** | 遇到词库没有的词，Ctrl+Enter 一键入库，不打断输入节奏 |
| **零命令行** | 从安装到配置全程 GUI，普通用户可独立完成 |
| **自更新** | App 和配置分离更新，配置文件随 git 管理 |

---

## 发布流程

- Git tag `v1.x.x` 触发 GitHub Actions
- Actions 构建 Electron App，打包 `.dmg`，签名（可选）
- 自动发布到 GitHub Releases
- electron-updater 检测新版本推送给已安装用户
