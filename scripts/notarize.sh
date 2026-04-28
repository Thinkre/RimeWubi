#!/usr/bin/env bash
# 对 .app 进行签名 + Apple 公证 + 钉入票据
# 用法：./notarize.sh <path/to/App.app>
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▸ $*${RESET}"; }
success() { echo -e "${GREEN}✔ $*${RESET}"; }
die()     { echo -e "${RED}✘ $*${RESET}"; exit 1; }

APP_PATH="${1:?用法: $0 <path/to/App.app>}"
[[ -d "$APP_PATH" ]] || die "找不到 .app：$APP_PATH"

# 加载 .env（从脚本所在目录的上级，或当前目录）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
for env_file in "${SCRIPT_DIR}/../.env" "$(pwd)/.env"; do
  [[ -f "$env_file" ]] && { set -a; source "$env_file"; set +a; break; }
done

# 检查必要变量
: "${APPLE_ID:?请先运行 setup-env.sh 或在 .env 中设置 APPLE_ID}"
: "${APPLE_APP_SPECIFIC_PASSWORD:?请设置 APPLE_APP_SPECIFIC_PASSWORD}"
: "${APPLE_TEAM_ID:?请设置 APPLE_TEAM_ID}"

BUNDLE_ID=$(defaults read "${APP_PATH}/Contents/Info" CFBundleIdentifier 2>/dev/null \
  || die "无法读取 Bundle ID，请确认 .app 路径正确")

echo ""
echo -e "${BOLD}应用：${CYAN}$(basename "$APP_PATH")${RESET}"
echo -e "${BOLD}Bundle ID：${CYAN}${BUNDLE_ID}${RESET}"
echo ""

# ── 1. 签名 ──────────────────────────────────────────────────
info "签名中..."

SIGN_IDENTITY="${CSC_NAME:-Developer ID Application: ${APPLE_TEAM_ID}}"
# 优先用 Keychain 里的 Developer ID Application 证书
KEYCHAIN_IDENTITY=$(security find-identity -v -p codesigning 2>/dev/null \
  | grep "Developer ID Application" | head -1 \
  | sed 's/.*"\(.*\)"/\1/')

if [[ -n "$KEYCHAIN_IDENTITY" ]]; then
  SIGN_IDENTITY="$KEYCHAIN_IDENTITY"
  info "使用 Keychain 证书：$SIGN_IDENTITY"
fi

codesign --deep --force --verify --verbose \
  --sign "$SIGN_IDENTITY" \
  --options runtime \
  "$APP_PATH"

success "签名完成"

# ── 2. 验证签名 ───────────────────────────────────────────────
info "验证签名..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
success "签名验证通过"

# ── 3. 提交公证 ───────────────────────────────────────────────
info "提交 Apple 公证（约 1-3 分钟）..."

xcrun notarytool submit "$APP_PATH" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait \
  --timeout 600

success "公证完成"

# ── 4. 钉入票据 ───────────────────────────────────────────────
info "钉入公证票据..."
xcrun stapler staple "$APP_PATH"
success "票据已钉入"

# ── 5. 验证 Gatekeeper ────────────────────────────────────────
info "验证 Gatekeeper..."
spctl --assess --type execute --verbose "$APP_PATH" && success "Gatekeeper 验证通过" \
  || echo -e "${YELLOW}⚠ Gatekeeper 验证未通过（在 CI 环境中属正常，本机可忽略）${RESET}"

echo ""
success "签名 + 公证全部完成：$APP_PATH"
echo ""
