#!/usr/bin/env bash
# 将 .app 打包为 DMG 并发布到 GitHub Release
# 用法：./github-release.sh <path/to/App.app> <version> <owner/repo>
# 示例：./github-release.sh ./build/RimeWubi.app 1.2.0 Thinkre/RimeWubi
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▸ $*${RESET}"; }
success() { echo -e "${GREEN}✔ $*${RESET}"; }
die()     { echo -e "${RED}✘ $*${RESET}"; exit 1; }

APP_PATH="${1:?用法: $0 <path/to/App.app> <version> <owner/repo>}"
VERSION="${2:?缺少版本号，示例: 1.2.0}"
REPO="${3:?缺少仓库，示例: Thinkre/RimeWubi}"

[[ -d "$APP_PATH" ]] || die "找不到 .app：$APP_PATH"
command -v gh >/dev/null || die "未找到 gh CLI，请先运行：brew install gh && gh auth login"
command -v hdiutil >/dev/null || die "未找到 hdiutil（需要 macOS）"

# 加载 .env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
for env_file in "${SCRIPT_DIR}/../.env" "$(pwd)/.env"; do
  [[ -f "$env_file" ]] && { set -a; source "$env_file"; set +a; break; }
done

: "${GITHUB_TOKEN:?请先运行 setup-env.sh 或在 .env 中设置 GITHUB_TOKEN}"
export GH_TOKEN="$GITHUB_TOKEN"

APP_NAME="$(basename "$APP_PATH" .app)"
TAG="v${VERSION}"
BUILD_DIR="$(dirname "$APP_PATH")"
DMG_PATH="${BUILD_DIR}/${APP_NAME}-${VERSION}.dmg"

echo ""
echo -e "${BOLD}应用：${CYAN}${APP_NAME}${RESET}"
echo -e "${BOLD}版本：${CYAN}${TAG}${RESET}"
echo -e "${BOLD}仓库：${CYAN}${REPO}${RESET}"
echo ""

# ── 1. 打包 DMG ───────────────────────────────────────────────
info "打包 DMG：$(basename "$DMG_PATH")"
rm -f "$DMG_PATH"
hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$APP_PATH" \
  -ov \
  -format UDZO \
  "$DMG_PATH"
success "DMG 打包完成：$DMG_PATH"

# ── 2. 检查 tag 是否已存在 ────────────────────────────────────
if gh release view "$TAG" --repo "$REPO" &>/dev/null; then
  echo ""
  echo -e "${YELLOW}⚠ Release ${TAG} 已存在${RESET}"
  read -p "  覆盖上传？(y/N) " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || die "已取消"
  info "上传到已有 Release ${TAG}..."
  gh release upload "$TAG" "$DMG_PATH" --repo "$REPO" --clobber
else
  # ── 3. 创建 Release 并上传 ────────────────────────────────────
  info "创建 GitHub Release ${TAG}..."
  gh release create "$TAG" "$DMG_PATH" \
    --repo "$REPO" \
    --title "$TAG" \
    --generate-notes
fi

success "发布完成"
echo ""
echo -e "  ${CYAN}https://github.com/${REPO}/releases/tag/${TAG}${RESET}"
echo ""
