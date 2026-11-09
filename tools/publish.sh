#!/usr/bin/env bash
# 发布快照（GitHub Pages 子路径 /lr-workbench/ 用）：只含运行所需的前台文件 + 导演说明；
# 不含 tests/、versions/、tools/、Codex 审查、内部日志、assets/raw。不推送，由总监推送。
set -euo pipefail
W="$(cd "$(dirname "$0")/.." && pwd)"; V="$1"; D="$W/versions/$V/publish"
[ -e "$D" ] && { echo "已存在 $D，不覆盖"; exit 1; }
mkdir -p "$D"
( cd "$W" && tar --exclude='assets/raw' --exclude='__pycache__' -cf - index.html legacy.html css js data assets rules README_导演.md ) | ( cd "$D" && tar -xf - )
touch "$D/.nojekyll"
# 自检：index.html 里引用都是相对路径且文件存在
grep -oE '(src|href)="[^"#][^"]*"' "$D/index.html" | sed -E 's/^(src|href)="//;s/"$//' | while read -r f; do case "$f" in /*|http*) echo "绝对路径：$f"; exit 2;; esac; [ -f "$D/$f" ] || { echo "缺文件：$f"; exit 3; }; done
( cd "$D" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS )
echo "发布快照 $D：$(find "$D" -type f | wc -l) 个文件，$(du -sh "$D" | cut -f1)"
