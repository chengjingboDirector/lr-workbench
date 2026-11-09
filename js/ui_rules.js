/* 规范检查的前台徽标与后台规则库（规则原文与来源只在后台展开） */
const SKILL_ZH = { 'cinedance-higgsfield': 'CINEDANCE 视频提示词', acting: 'ACTING 表演', 'lira-image-prompts': 'LIRA 图像提示词', 'story-to-screen': '总控 story-to-screen', 'screenwriting-rewrite-diagnosis': '改写诊断', 'audience-cold-read-panel': '观众冷读', impeccable: 'impeccable 界面', 'design-taste-frontend': 'taste 前端审美（工具型子集）', project: '项目硬约束（导演口径）' };
function rulesReady() { return !!(window.RULES && WB.lint); }
/* res：一个或多个 WB.lint 结果合并；id：展开状态的键 */
function lintBadge(list, id, label, scope) {
  if (!rulesReady()) return `<span class="chip warn" title="rules/rules.js 没加载：先运行 tools/extract_rules.py">规范检查 未加载</span>`;
  const rs = [].concat(list).filter(Boolean).flatMap((x) => x.results);
  const bad = rs.filter((x) => x.status === '违反'); const warn = rs.filter((x) => x.status === '提醒' || x.status === '提示'); const man = rs.filter((x) => x.ok === null);
  const n = bad.length + warn.length; const open = UI.lintOpen && UI.lintOpen[id];
  // ✓ 只在全部适用检查都完成时出现；待人工／待跑不算通过（Codex 第 3 轮 P0）
  const cls = bad.length ? 'bad' : n ? 'warn' : man.length ? '' : 'ok';
  const face = n ? '⚠ ' + n + (man.length ? ' · 待人工 ' + man.length : '') : man.length ? '待人工 ' + man.length : '✓';
  const btn = `<button class="chip ${cls} lintb" data-act="lintToggle" data-v="${esc(id)}" aria-expanded="${!!open}" title="${esc((label || '') + '：' + rs.length + ' 条规则，' + (n ? n + ' 条未过' : '自动项全部通过') + (man.length ? '，' + man.length + ' 条待人工／待跑' : ''))}">规范检查 ${face}</button>`;
  if (!open) return btn;
  const sk = (x) => `${x.rule.target}:${scope || id}`;
  const act = (x) => !scope ? '' : x.ok === null && x.status === '待人工' ? ` <button class="btn sm" data-act="lintSign" data-v="${esc(sk(x))}" data-r="${esc(x.rule.id)}">我已人工核过</button>` : (x.status === '提醒' || x.status === '提示') ? ` <button class="btn sm" data-act="lintSign" data-v="${esc(sk(x))}" data-r="${esc(x.rule.id)}" ${UI.who === '导演' ? '' : 'disabled title="只有导演可以接受提醒项"'}>导演接受</button>` : x.by ? ` <span class="muted" style="font-size:12px">${esc(x.by)}</span> <button class="linkbtn" data-act="lintUnsign" data-v="${esc(sk(x))}" data-r="${esc(x.rule.id)}">撤销</button>` : '';
  const row = (x) => `<li class="${x.status === '违反' ? 'bad' : x.ok === null ? 'muted' : x.ok ? 'ok' : 'warn'}"><b class="num">${esc(x.rule.id)}</b> ${esc(x.rule.rule)}${x.hits.length ? `<span class="muted">：${esc(x.hits.slice(0, 6).join('、'))}</span>` : ''} <span class="tag-src">${esc(x.status)}</span>${act(x)}</li>`;
  const fails = rs.filter((x) => x.ok !== true); const others = rs.filter((x) => x.ok === true);
  return btn + `<div class="lintbox" role="region" aria-label="${esc(label || '规范检查')}"><ul>${fails.map(row).join('') || '<li class="ok">全部通过</li>'}</ul>${fails.some((x) => x.ok === null) ? '<p class="muted" style="font-size:12px;margin:2px 0">「待人工」签核绑定当前内容 hash：内容一改，签核自动失效。</p>' : ''}${others.length ? `<details><summary class="muted">已通过 ${others.length} 条（含人工已核／导演接受 ${others.filter((x) => x.by).length}）</summary><ul>${others.map(row).join('')}</ul></details>` : ''}<p class="muted" style="font-size:12px;margin:4px 0 0">规则原文与出处在 <button class="linkbtn" data-act="tab" data-v="backend">后台 › 规则库</button></p></div>`;
}
function promptLint(g) { const c = WB.compose(st, g.id); return c.lint ? [c.lint.prompt, c.lint.acting] : []; }
function actingLint(g) { return rulesReady() ? WB.lint(WB.RULESET, 'acting', WB.lintCtx(st, 'acting', g.id, { st, g })) : null; }
function stage0Lint() { return rulesReady() ? WB.lint(WB.RULESET, 'stage0', WB.lintCtx(st, 'stage0', 's0', { st })) : null; }
function gapLint(gap, p) { return rulesReady() && p.ok ? WB.lint(WB.RULESET, 'gapPrompt', WB.lintCtx(st, 'gapPrompt', gap.key + '|' + p.cand, { st, gap, prompt: p.prompt, kind: p.kind })) : null; }
/* 回执必须对应当前代码：缺核对记录或代码 sha 不符 → 回执作废，界面规则全部「待跑」（Codex 第 4 轮） */
function uiAuditValid() { const F = window.RULES_FRESH; const u = F && F.uiAudit; const A = window.UI_AUDIT; return !!(A && u && u.codeNow && u.audited === u.codeNow && A.codeSha8 === u.codeNow); }
function uiLint() { return rulesReady() ? WB.lint(WB.RULESET, 'ui', {}, uiAuditValid() ? window.UI_AUDIT : null) : null; }
function freshness() {
  const F = window.RULES_FRESH; const R = window.RULES;
  if (!R) return { state: 'missing', msg: '规则库没加载' };
  if (!F) return { state: 'unknown', msg: '还没跑过 sha 核对（tools/extract_rules.py --check）' };
  const miss = Object.keys(R.sources).filter((k) => !F.files[k]);
  const stale = Object.keys(R.sources).filter((k) => F.files[k] && F.files[k].sha8Now !== R.sources[k].sha8).concat(window.__skillStale || []).filter((k, i, a) => a.indexOf(k) === i);
  if (!stale.length && miss.length) return { state: 'unknown', msg: '规则库来源未验证：' + miss.join('、') + ' 没有核对记录' };
  return stale.length ? { state: 'stale', stale, msg: '规则库过期：' + stale.map((k) => R.sources[k].path.split('/').slice(-3).join('/')).join('、') + ' 已变化，重新运行 tools/extract_rules.py' } : { state: 'fresh', msg: `规则库与 skill 源文件一致（核对于 ${F.checked}）` };
}
/* 后台：规则库全文、来源、sha、本机核对；拖入 SKILL.md 可在浏览器里直接核 sha */
function rulesBackend() {
  if (!rulesReady()) return '<div class="alert bad">规则库没加载：运行 <code>python3 tools/extract_rules.py</code> 生成 rules/rules.js</div>';
  const R = window.RULES; const fr = freshness(); const ua = uiLint();
  const counts = Object.entries(R.skills).map(([k, v]) => `<tr><td>${esc(SKILL_ZH[k] || k)}</td><td class="num">${v.length}</td><td>${esc(Array.from(new Set(v.map((r) => r.target))).map((t) => ({ prompt: '提示词卡', acting: '表演（组头/提示词卡）', gapPrompt: '缺资产 A/B/C 抽屉', stage0: '诊断与方向', ui: '本页界面（后台）' }[t])).join('、'))}</td></tr>`).join('');
  const rows = WB.allRules(R).map((r) => `<tr><td class="num">${esc(r.id)}</td><td>${esc(r.rule)}<div class="quote">${esc(r.quote)}</div></td><td style="word-break:break-all"><span class="num">${esc(r.src.file.replace('/home/box/', '~/'))}:${r.src.line}</span><br><span class="muted num">sha ${esc(r.sha8)}</span></td><td>${esc(r.check)}</td><td>${chip(r.severity === 'error' ? '违反即阻断正式' : r.severity === 'warn' ? '提醒' : '提示', r.severity === 'error' ? 'bad' : r.severity === 'warn' ? 'warn' : '')}</td></tr>`).join('');
  return `<section class="pane" id="rules"><h3 class="h3">规则库 <span class="lat">Skill rules</span> ${chip(fr.state === 'fresh' ? '与源文件一致' : fr.state === 'stale' ? '规则库过期' : '未核对', fr.state === 'fresh' ? 'ok' : fr.state === 'stale' ? 'bad' : 'warn')}</h3>
    <p class="${fr.state === 'stale' ? 'bad' : 'muted'}">${esc(fr.msg)}｜抽取于 ${esc(R.built)}，共 ${WB.allRules(R).length} 条。前台每张卡只显示一个「规范检查」徽标（通过／提醒条数）；不把 skill 全文放进页面。</p>
    <div id="skilldrop" class="dropzone" tabindex="0" role="button" aria-label="拖入 SKILL.md 或参考文件，在浏览器里核对 sha">把某个 SKILL.md／references 文件拖到这里，在浏览器里直接核对 sha（不上传）<input type="file" class="hide" data-act="skillFile" multiple></div><div id="skillres"></div>
    <table class="t"><thead><tr><th>skill</th><th>条数</th><th>落在哪里</th></tr></thead><tbody>${counts}</tbody></table>
    <h3 class="h3">本页界面自审（impeccable＋taste 工具型子集，本机 Playwright＋扫描器）</h3>${(() => { const F = window.RULES_FRESH; const u = F && F.uiAudit; return !u ? '<p class="bad">没有界面审计核对记录：界面规则全部待跑</p>' : !u.audited ? '<p class="muted">界面审计还没跑过（python3 tests/e2e.py）</p>' : u.audited !== u.codeNow ? `<p class="bad">界面审计是旧代码的结果（审计时 ${esc(u.audited)}，现在 ${esc(u.codeNow)}），需重跑 e2e</p>` : `<p class="muted">界面审计对应当前代码（${esc(u.codeNow)}）</p>`; })()}${ua ? lintBadge(ua, 'ui', '界面自审（impeccable＋taste）') : ''}${window.UI_AUDIT ? `<span class="muted" style="font-size:12px"> ${esc(window.UI_AUDIT.time || '')}｜${esc(window.UI_AUDIT.browser || '')}</span>` : ''}
    <details style="margin-top:10px"><summary><b>全部规则原文与出处</b>（${WB.allRules(R).length} 条）</summary><div style="overflow-x:auto"><table class="t"><thead><tr><th>编号</th><th>规则（原文引句）</th><th>出处</th><th>检查方式</th><th>严重度</th></tr></thead><tbody>${rows}</tbody></table></div></details></section>`;
}
function checkSkillFiles(files) {
  const R = window.RULES; const out = [];
  Promise.all(Array.from(files).map((f) => f.text().then((t) => { const h = WB.sha8(t); const hit = Object.entries(R.sources).find(([, v]) => v.path.endsWith('/' + f.name) && v.sha8 === h); const same = Object.entries(R.sources).filter(([, v]) => v.path.endsWith('/' + f.name)); if (!hit && same.length) { window.__skillStale = (window.__skillStale || []).concat(same.map(([k]) => k)); } out.push(`<li>${esc(f.name)} sha ${h}：${hit ? '<span class="ok">与规则库一致</span>' : same.length ? '<span class="bad">与规则库不符 → 规则库过期（库里是 ' + same.map(([, v]) => v.sha8).join('/') + '）</span>' : '<span class="muted">不是规则库的来源文件</span>'}</li>`); }))).then(() => { const el = document.getElementById('skillres'); if (el) el.innerHTML = `<ul>${out.join('')}</ul>`; if (window.__skillStale && window.__skillStale.length) { render(); const e2 = document.getElementById('skillres'); if (e2) e2.innerHTML = `<ul>${out.join('')}</ul>`; } });
}
