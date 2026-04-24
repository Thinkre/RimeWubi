#!/bin/bash
set -e

RIME_DIR="$HOME/Library/Rime"
SQUIRREL="/Library/Input Methods/Squirrel.app/Contents/MacOS/Squirrel"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/config"

# 检测 Squirrel
if [ ! -f "$SQUIRREL" ]; then
  echo "错误：未检测到 Squirrel 输入法。"
  echo "请先从 https://rime.im 下载安装 Squirrel，再运行此脚本。"
  exit 1
fi

# 备份现有配置（只备份 yaml 和 lua，跳过 build/ sync/ userdb 等运行时目录）
if [ -d "$RIME_DIR" ] && [ "$(ls -A "$RIME_DIR" 2>/dev/null)" ]; then
  BACKUP_DIR="$RIME_DIR/backup-$(date +%Y%m%d-%H%M%S)"
  echo "备份现有配置到 $BACKUP_DIR ..."
  mkdir -p "$BACKUP_DIR"
  find "$RIME_DIR" -maxdepth 1 -name "*.yaml" -exec cp {} "$BACKUP_DIR/" \;
  if [ -d "$RIME_DIR/lua" ]; then
    cp -r "$RIME_DIR/lua" "$BACKUP_DIR/"
  fi
  echo "备份完成。"
fi

# 写入配置文件
echo "写入配置文件到 $RIME_DIR ..."
mkdir -p "$RIME_DIR"
cp "$CONFIG_DIR"/*.yaml "$RIME_DIR/"
mkdir -p "$RIME_DIR/lua"
cp "$CONFIG_DIR/lua"/*.lua "$RIME_DIR/lua/"

# 触发部署
echo "触发 Squirrel 重新部署..."
"$SQUIRREL" --reload

echo ""
echo "✓ 安装完成！稍候片刻，输入法即可使用五笔配置。"
