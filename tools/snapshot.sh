#!/usr/bin/env bash
# 版本快照：代码+数据+资产（不含 assets/raw）+测试+工具+schema；不覆盖已存在的快照
set -euo pipefail
W="$(cd "$(dirname "$0")/.." && pwd)"; V="$1"; D="$W/versions/$V/snapshot"
[ -e "$D" ] && { echo "已存在 $D，不覆盖"; exit 1; }
mkdir -p "$D"
( cd "$W" && tar --exclude='assets/raw' --exclude='tests/e2e_out' --exclude='__pycache__' -cf - index.html legacy.html css js data assets tests tools rules schema.md README_导演.md ) | ( cd "$D" && tar -xf - )
( cd "$D" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS )
echo "快照 $D：$(find "$D" -type f | wc -l) 个文件，$(du -sh "$D" | cut -f1)"
