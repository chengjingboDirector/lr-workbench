#!/usr/bin/env bash
# 用法：tools/codex_review.sh <版本> <上一版>   （在后台跑，输出写 versions/<版本>/codex/）
set -u
ROOT=/workspace/story-to-screen/projects/LR-1101-01; V="$1"; P="$2"; D="workbench/versions/$V/codex"
cd "$ROOT"; mkdir -p "$D"
cat > "$D/brief.md" <<B
你是独立审阅（只读）。这是 V0.7 工作台 $V 的复检。上一轮意见：workbench/versions/$P/codex/codex_$P.md（更早的在 workbench/versions/r3-*/codex/）。
材料（相对当前目录）：
- 修复对照：workbench/versions/$V/修复对照.md；不可丢失清单：workbench/versions/$V/不可丢失清单.md；方案勘误：workbench/versions/r3-2/v4方案勘误.md
- 规格：work/codex_review/round2/合成方案_V0.7_v4.md；视听补数：work/codex_review/round2/视听补数_S04.md
- 实现快照：workbench/versions/$V/snapshot/（index.html、js/v4/*.js、js/core.js、data/*.js、css/v4.css、tests/v4/*）
- 测试：workbench/versions/$V/engine_test.txt；三引擎 e2e ×20 在另跑，结果写 workbench/versions/$V/e2e/e2e_log.json（审阅时生成了就读）
- 附图：7 张 2x 截图
硬约束（违反即 P0）：公司名 CommonxSpakloom；写「伊侧」；代选标「总监代选｜待导演确认」，视听待定推导值标「总监代填｜待视听确认」（总监指令）；英文台词逐字；单段 ≤30″；不编分；不编已批 REF；台词/事件/伤/物件/场尾改动必须导演确认；挂载 10 项＋型号＋逐镜焦段写进正文、缺项拦复制；品牌禁令只管画面内。
已同意留到后续版本、页面已标「本版未含」的：U5 真生成回路、真人走查、风格标签联动、增量交接包、新场次人工整理。这些不作为本轮 P0/P1，但请核对页面确实如实标注。
判级标准不变（同上）。另请对每条新问题额外标注触发条件，二选一：「正常操作可触发」（导演或岗位按页面正常使用就会碰到）或「只有构造的异常输入才触发」（手工改包、注入非法值、脚本调用等）。本轮按根因的归类见 workbench/versions/$V/根因归类.md（若存在）。
请输出（中文）：1. 上轮每条：已修／部分修／未修＋证据；2. 新问题 P0/P1/P2（位置、复现、触发条件标注、建议）；3. 最后一行结论只能二选一，原样写：「无 P0、无 P1，可放行」或「需返工」。
B
IMGS=""; for f in "$D"/*.png; do IMGS="$IMGS -i $f"; done
/home/box/.local/bin/codex exec -m gpt-6.1-sol -c model_reasoning_effort="ultra" -s read-only --skip-git-repo-check -C "$ROOT" -o "$D/codex_$V.md" $IMGS < "$D/brief.md"
echo "END $?"
