# RimeWubi

基于 [极点五笔](https://github.com/KyleBing/rime-wubi86-jidian) 的 Rime 五笔配置发行版，适配 macOS Squirrel。

一条命令完成安装，无需手动编辑任何配置文件。

---

## 预览

> 截图占位 — 待补充（候选框亮色/暗色皮肤效果图）

---

## 特性

| 功能 | 说明 |
|------|------|
| 五笔拼音混打 | 不会五笔的字可直接拼音输入 |
| Ctrl+Enter 造词 | 选中候选词后按 Ctrl+Enter 手动造词 |
| 拼音注释 | 候选词下方显示对应五笔编码 |
| 单字优先模式 | 可切换为单字优先上屏 |
| 日期输入 | 输入 `date` / `time` 快速插入日期时间 |
| 简繁切换 | 内置简入繁出方案 |
| 玫枫皮肤 | 自适应系统亮色/暗色模式 |

---

## 输入方案

| 方案 | 说明 |
|------|------|
| 五笔拼音混输（默认） | 五笔为主，不会的字拼音补救 |
| 纯五笔 | 严格五笔，无拼音回退 |
| 五笔·简入繁出 | 输入简体，上屏繁体 |
| 五笔拼音·简入繁出 | 混打 + 繁体输出 |
| 大写数字 | 输入阿拉伯数字，候选为大写金额 |
| 普通拼音 | 系统级备用拼音方案 |

---

## 快捷键

| 按键 | 功能 |
|------|------|
| `;` | 选第 2 候选词 |
| `'` | 选第 3 候选词 |
| `[` / `]` | 上/下翻页 |
| `Tab` | 翻页（同 `]`） |
| `Shift` | 切换中英文 |
| `Caps Lock` | 上屏编码并切英文 |
| `Ctrl+0` | 打开方案切换菜单 |
| `Ctrl+Enter` | 造词（五笔拼音混打方案） |

---

## 安装

**前置要求：** macOS + [Squirrel 鼠须管](https://rime.im)

```bash
git clone https://github.com/你的用户名/RimeWubi.git
cd RimeWubi
bash install.sh
```

脚本会自动：
1. 检测 Squirrel 是否已安装
2. 备份现有 `~/Library/Rime/` 配置（保存到 `backup-<时间戳>/`）
3. 写入本仓库配置文件
4. 触发 Squirrel 重新部署

---

## 目录结构

```
RimeWubi/
├── install.sh              # 一键安装脚本
└── config/
    ├── default.custom.yaml         # 全局按键、方案列表
    ├── squirrel.custom.yaml        # macOS 外观（玫枫皮肤）
    ├── wubi86_jidian.schema.yaml   # 纯五笔方案
    ├── wubi86_jidian.dict.yaml     # 五笔词库
    ├── wubi86_jidian_extra.dict.yaml
    ├── wubi86_jidian_pinyin.schema.yaml
    ├── wubi86_jidian_trad.schema.yaml
    ├── wubi86_jidian_trad_pinyin.schema.yaml
    ├── numbers.schema.yaml
    ├── pinyin_simp.schema.yaml
    ├── pinyin_simp.dict.yaml
    └── lua/
        ├── wubi_save_word.lua                      # Ctrl+Enter 造词
        ├── wubi86_jidian_pinyin_code_hint.lua      # 拼音显五笔编码
        ├── wubi86_jidian_date_translator.lua       # 日期输入
        ├── wubi86_jidian_single_char_first_filter.lua
        └── wubi86_jidian_single_char_only.lua
```

---

## License

MIT
