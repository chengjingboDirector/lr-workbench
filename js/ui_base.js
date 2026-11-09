/* 场次工作台 · 界面层（一）基础与外框｜一次性试验品。三个 ui_*.js 共享全局作用域（经典脚本） */
'use strict';
const KEY = 'lr-s04-workbench';
const $ = (s, r) => (r || document).querySelector(s);
const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (id) => String(id).replace('S04-', '');
let st;
const UI = { tab: 'stage0', shot: 'S04-C001', group: 'G1', who: '导演', mode: '简', overlay: 'annot', ptab: {}, result: null, pendingText: '', durMode: 'absorb', drawer: null, copied: {}, finalMode: false };
window.__WB_ERRORS = [];
window.addEventListener('error', (e) => { window.__WB_ERRORS.push(String(e.message)); });

const GLOSS = {
  '低调': '画面大部分是暗部，只亮少数地方', '光比': '亮面和暗面的亮度比，1:8 表示暗面只有亮面的八分之一', '色温': '光的冷暖，数值越高越偏蓝青', '轮廓光': '从人身后打来，只勾出肩头和发梢的一圈亮边',
  '逆光': '光从被摄者身后来，朝向镜头', '顺光': '光从机位身后来，照在人脸正面', '伦勃朗光': '脸一侧亮、另一侧暗，暗侧颧骨下留一小块三角亮', '半伦勃朗': '比伦勃朗光更暗的一侧光，只留一点脸部轮廓',
  '体积光': '雨或雾让光束有了形状，能看到一道道光柱', '实用光源': '画面里本来就有的灯，比如作业灯、屏幕', '黑柔': '镜头前的柔光滤镜：亮处微微发散，暗处不变灰', '变形宽银幕': '用变形镜头拍出的 2.39:1 宽画幅，灯点会拉成横向光丝',
  '炫光': '强光直射镜头时出现的光斑或光丝', '焦外': '没对上焦的背景部分', '光晕': '亮处边缘向外溢出的柔光', '呼吸': '对焦移动时画面轻微缩放', '球面等效': '换算成普通镜头时的焦距，方便和常规焦段比较',
  '硬光': '影子边缘清楚的光', '柔光': '影子边缘模糊的光', '过路光': '扫过画面、不停留的光', '屏幕光': '屏幕本身发出的光', '光圈约束': '为了让远处物体看得清而限制光圈不能开太大',
};
const gl = (term, label) => GLOSS[term] ? `<abbr class="term" title="${esc(GLOSS[term])}" tabindex="0">${esc(label || term)}</abbr>` : esc(label || term);
const KEYZH = { rim: '轮廓光', 'screen glow': '屏幕光', backlight: '逆光', silhouette: '剪影', practical: '实用光源', 'passing light': '过路光', Rembrandt: '伦勃朗光' };

/* 状态 → 三色 */
const sc = (s) => { s = String(s || ''); if (/缺|冲突|需剧作|需重切|需复核|需确认|超|拒绝|过期|失效|红|矛盾|溢出|不一致/.test(s)) return 'bad'; if (/待|候选|草案|提议|代选|预览|建议|未批|无变化|橙/.test(s)) return 'warn'; if (/已批|锁定|已应用|导演已|已确认|已入库|通过|一致|✓/.test(s)) return 'ok'; return ''; };
const chip = (txt, cls, attrs) => `<span class="chip ${cls == null ? sc(txt) : cls}" ${attrs || ''}>${esc(txt)}</span>`;
const lineChips = (lines) => (lines || []).filter((r) => r && r[0] != null).map((r) => { const a = Array.isArray(r) ? r : [r, r]; return `<button class="chip line" data-act="lines" data-a="${a[0]}" data-b="${a[1]}" title="打开文学本原文">L${a[0]}${a[1] !== a[0] ? '–' + a[1] : ''}</button>`; }).join(' ');
const ico = {
  copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>',
  lock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>',
  side: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M10 2.5v11"/></svg>',
  tree: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12"/></svg>',
  down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 2v9M4 7l4 4 4-4M3 14h10"/></svg>',
};

let storageOK = true; const HIST = [];
function snap() { HIST.push(JSON.stringify(WB.serialize(st))); if (HIST.length > 30) HIST.shift(); }
/* 多标签页（Codex 独立 v0.7 P1-5）：每次写盘带事务号 txn；本页记住上次同步到的 txn。
   写盘前发现盘上的 txn 不是本页上次同步的那一个 → 另一页先写过：本页这笔不覆盖，先另存冲突备份，再切到对方数据并提示。
   存储失败（P2）：不再永久放弃；每次改动都重试，恢复后提示。 */
const SYNC = { txn: null, last: null };
const newTxn = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function saveUI() { try { localStorage.setItem(KEY + '-ui', JSON.stringify({ tab: UI.tab, shot: UI.shot, group: UI.group, who: UI.who, mode: UI.mode, finalMode: UI.finalMode })); } catch (e) { /* 界面偏好丢了不要紧 */ } }
function writeSt(body) { const txn = newTxn(); localStorage.setItem(KEY, JSON.stringify({ built: window.S04_DATA.built, txn, st: JSON.parse(body) })); SYNC.txn = txn; SYNC.last = body; }
function save() {
  saveUI();
  const body = JSON.stringify(WB.serialize(st)); if (body === SYNC.last && storageOK) return 'same'; /* 内容没变不写盘：不产生新事务号，也不触发别的标签页同步 */
  try {
    const cur = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (cur && cur.st && cur.built === window.S04_DATA.built && cur.txn && cur.txn !== SYNC.txn) {
      const bk = KEY + '-conflict-' + Date.now(); try { localStorage.setItem(bk, JSON.stringify({ built: window.S04_DATA.built, why: '另一个标签页先保存', st: JSON.parse(body) })); } catch (e2) { /* 备份失败也不覆盖对方 */ }
      st = WB.init(window.S04_DATA, window.REF_INDEX, cur.st); SYNC.txn = cur.txn; HIST.length = 0;
      WB.logEntry(st, { who: '系统（多标签页）', text: '另一个标签页先保存了改动：本页这笔改动没有覆盖对方，已另存为冲突备份 ' + bk, scope: '—', target: '—', variable: '冲突', before: '—', after: '—', status: '已应用' });
      toast('另一个标签页先保存了：本页这笔改动没有覆盖对方，已另存为冲突备份，页面已切到最新数据');
      writeSt(JSON.stringify(WB.serialize(st))); return 'conflict';
    }
    writeSt(body);
    if (!storageOK) { storageOK = true; toast('本地保存已恢复'); }
    return 'ok';
  } catch (e) { if (storageOK) toast('本地保存失败：改动只在本页内存里，下次改动会自动重试；请先导出 JSON'); storageOK = false; return 'fail'; }
}
function load() {
  let saved = null;
  let note = '';
  try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o.built === window.S04_DATA.built && o.st && o.st.data) { saved = o.st; SYNC.txn = o.txn || null; Object.assign(UI, o.ui || {}); try { Object.assign(UI, JSON.parse(localStorage.getItem(KEY + '-ui') || '{}')); } catch (e3) { /* 忽略 */ } } else note = '数据已重建，旧的本地改动已作废（可在旧导出 JSON 中查）'; } } catch (e) { saved = null; note = '本地缓存损坏，已隔离并从初始数据启动'; try { localStorage.setItem(KEY + '-corrupt-' + Date.now(), localStorage.getItem(KEY) || ''); } catch (e2) { storageOK = false; } }
  try { st = WB.init(window.S04_DATA, window.REF_INDEX, saved); if (saved) SYNC.last = JSON.stringify(WB.serialize(st)); } catch (e) { st = WB.init(window.S04_DATA, window.REF_INDEX); note = '本地缓存与当前代码不兼容，已从初始数据启动'; }
  if (note) setTimeout(() => toast(note), 300);
}
function imgFail(img) { const d = document.createElement('div'); d.className = 'ph'; d.textContent = '图片缺失：' + img.getAttribute('src'); img.replaceWith(d); }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }

const shots = () => st.data.shots; const groups = () => st.data.groups; const S = (id) => WB.shot(st, id);
const focalTxt = (s) => { const a = WB.actualFocal(st, s.focal.eq), b = WB.actualFocal(st, s.focal.eqOut); return `${s.focal.eq}${s.focal.eqOut ? '→' + s.focal.eqOut : ''}mm 等效（实际 ${a}${b ? '→' + b : ''}mm）`; };
const moveTxt = (s) => s.move.segments && s.move.segments.length > 1 ? s.move.segments.map((x) => `${x.t0}–${x.t1}″ ${x.move}`).join(' → ') : s.move.primary + (s.move.secondary ? '＋' + s.move.secondary : '');
function checksBy() { const m = {}; const add = (x) => { (m[x.id] = m[x.id] || []).push(x); }; WB.continuityChecks(st).forEach(add); WB.lightChecks(st).forEach(add); return m; }
function compass(s) {
  const L = WB.effLight(st, s); const src = st.data.scene.lightSources.find((x) => x.id === L.keySource); const yaw = s.position.yaw;
  if (yaw == null || !src) return '<span class="muted" title="机位朝向未填">—</span>';
  const r = WB.lightRel(st, s); const pt = (deg, len) => { const a = (deg - 90) * Math.PI / 180; return [13 + Math.cos(a) * len, 13 + Math.sin(a) * len]; };
  const [cx, cy] = pt(yaw, 10); const [lx, ly] = pt(src.az, 11);
  const col = src.id === 'L3' ? '#e8604f' : (src.id === 'L2' || src.id === 'L4') ? '#e3b448' : '#62d2e3';
  return `<svg class="compass" viewBox="0 0 26 26" role="img" aria-label="光向罗盘：${esc(r ? r.kind : '')}"><title>机位朝向 ${yaw}°（白线）｜${esc(src.id)} 来向 ${src.az}°（圆点）｜相对机位：${esc(r ? r.kind : '—')}</title><circle cx="13" cy="13" r="12" fill="none" stroke="#323a41"/><line x1="13" y1="13" x2="${cx}" y2="${cy}" stroke="#e9e5dc" stroke-width="2"/><circle cx="${lx}" cy="${ly}" r="2.6" fill="${col}"/></svg>`;
}
function lampCounts() {
  let ok = 0, warn = 0, bad = 0;
  shots().forEach((s) => { if (s.lock === '锁定') ok++; else warn++; });
  bad += Object.values(checksBy()).flat().filter((x) => x.level === '红').length;
  bad += st.proposals.filter((p) => /需|待/.test(p.status)).length;
  return { ok, warn, bad };
}
function blackbar(s, side) {
  const cam = s.fixed ? '固定' : moveTxt(s);
  return `<div class="blackbar"><b>${esc(s.id)}_${side}</b><span class="bbs num">${s.duration}″</span><div class="bbx">${esc(s.position.size || '')} · ${esc(focalTxt(s))} ${esc(s.aperture.value || 'T2.8')} · ${esc(cam)}</div></div>`;
}
function sketchBlock(s) {
  const sides = s.fixed ? ['in'] : ['in', 'out'];
  return `<div class="sketch">${sides.map((side) => {
    const f = s.sketch && s.sketch[side];
    if (!f) return `<div class="ph" title="命名：${esc(s.id)}_${side}.png">${esc(short(s.id))}_${side} 待出图</div>`;
    return `<figure><img src="${esc(f)}" alt="${esc(s.id)} ${side === 'in' ? '起幅' : '落幅'}草图" loading="lazy" onerror="imgFail(this)"><span class="figtag">${chip(s.sketch.status)}</span>${blackbar(s, side)}</figure>`;
  }).join('')}</div>`;
}

const TABS = [['stage0', '诊断与方向', 'Stage 0'], ['导演', '导演', 'Director'], ['摄影', '摄影', 'Camera'], ['剪辑', '剪辑', 'Edit'], ['美术', '美术', 'Art'], ['剧作', '剧作', 'Script'], ['prompt', '提示词', 'Prompts'], ['queue', '待导演定', 'Queue'], ['backend', '后台', 'Log']];
const FINAL_TABS = ['stage0', '导演', 'prompt', 'queue'];
function specSpan() {
  const m = st.data.scene.modelSpec; const days = Math.floor((Date.now() - new Date(m.checked + 'T00:00:00+08:00').getTime()) / 864e5);
  return `<span title="${esc(m.model)} 规格（单段 ≤${m.maxSegment}″）核对于 ${esc(m.checked)}；来源 ${esc(m.src)}" class="${days > 7 ? 'specold' : ''}">规格核对 <b class="num">${esc(m.checked)}</b>${days > 7 ? `（${days} 天前，需复核）` : ''}</span>`;
}
function renderTop() {
  const dg = st.data.scene.diagnosis; const ch = dg.chosen; const lc = lampCounts(); const g1 = WB.group(st, 'G1');
  $('#top').innerHTML = `
    <h1 class="brandh">第四场｜被扫描</h1>
    ${ch ? `<button class="dirbtn" data-act="tab" data-v="stage0" title="去「诊断与方向」改选"><span class="dot ${ch.proxy ? 'warn' : 'ok'}"></span>方向 ${esc(ch.option)}<span class="dsep">·</span>${ch.proxy ? '<span class="dlong">总监代选，待导演确认</span><span class="dshort">代选待确认</span>' : '导演已确认'}</button>` : '<span class="dirbtn bad"><span class="dot bad"></span>未选方向</span>'}
    <div class="grow"></div>
    <div class="counts" role="group" aria-label="状态计数"><span class="cnt ok" title="已锁定／已批"><span class="dot"></span>已定 <b class="num">${lc.ok}</b></span><span class="cnt warn" title="草案／候选／待批"><span class="dot"></span>待定 <b class="num">${lc.warn}</b></span><span class="cnt bad" title="需确认／冲突／超限／红色检查"><span class="dot"></span>需处理 <b class="num">${lc.bad}</b></span></div>
    <div class="ctl who"><label for="who">我是</label><select id="who">${WB.ROLES.map((r) => `<option ${r === UI.who ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
    <button class="btn sm only-narrow" data-act="toggleTree" aria-label="打开镜头树" aria-controls="tree" aria-expanded="${!!(document.getElementById('tree') && document.getElementById('tree').classList.contains('open'))}">${ico.tree}</button><button class="btn sm only-narrow" data-act="toggleSide" aria-label="打开资产栏" aria-controls="side" aria-expanded="${!!(document.getElementById('side') && document.getElementById('side').classList.contains('open'))}">${ico.side}</button>`;
  const q = WB.approvalQueue(st).filter((x) => x.proxy || x.value == null).length;
  $('#tabs').innerHTML = TABS.filter(([k]) => !UI.finalMode || FINAL_TABS.includes(k)).map(([k, zh, en]) => {
    const dis = k !== 'stage0' && !WB.unlocked(st);
    return `<button role="tab" id="tab-${k}" aria-controls="main" tabindex="${UI.tab === k ? 0 : -1}" data-act="tab" data-v="${k}" aria-selected="${UI.tab === k}" ${dis ? 'disabled title="先在「诊断与方向」选一个方向"' : ''}>${zh}${k === 'queue' && q ? `<span class="cnt num">${q}</span>` : ''}</button>`;
  }).join('') + `<div class="tabtools"><button class="btn sm ghost proc" data-act="undo" title="撤销上一笔（Ctrl/⌘+Z）">撤销</button><button class="btn sm ghost" data-act="final" aria-pressed="${UI.finalMode}" title="导演定稿视图：隐藏过程信息">${UI.finalMode ? '退出定稿视图' : '定稿视图'}</button></div>`;
  document.body.classList.toggle('final', UI.finalMode); document.body.classList.toggle('simple', UI.mode === '简');
}
function renderTree() {
  const ch = checksBy(); const total = WB.sceneSec(st); const win = st.data.scene.window;
  let h = `<div class="tthead"><h2 class="tt">镜头树</h2><button class="btn sm ghost only-narrow panel-close" data-act="toggleTree" aria-label="关闭镜头树">关闭</button></div><button class="tnode" data-act="selScene" aria-current="${!UI.group}"><b>S04 全场</b><span class="sec num ${total < win.min || total > win.max ? 'bad' : ''}">${total}″</span></button><div class="muted" style="font-size:13px;padding:0 8px 4px">窗口 ${win.min}–${win.max}″ · 中心 ${win.center}″</div>`;
  groups().forEach((g) => {
    const sec = WB.groupSec(st, g); const over = sec > WB.MAX_GROUP; const b = WB.boundaryCheck(st, g.id);
    h += `<button class="tnode g" data-act="selGroup" data-v="${g.id}" aria-current="${UI.group === g.id && !UI.shot}">${esc(g.name)} ${g.lock === '锁定' ? chip('锁定') : ''}${!b.ok ? '<span class="flag" style="background:var(--bad)" title="首尾状态不衔接"></span>' : ''}<span class="sec num ${over ? 'bad' : ''}" title="${over ? '超过 30″：Seedance 单段上限' : ''}">${sec}″${over ? ' 超' : ''}</span></button>`;
    h += `<div class="gbar" title="${sec}/30″"><i class="${over ? 'bad' : ''}" style="width:${Math.min(100, sec / 30 * 100)}%"></i></div>`;
    g.shots.forEach((id) => {
      const s = S(id); const c = ch[id] || []; const reds = c.filter((x) => x.level === '红'); const jump = c.some((x) => x.type === '光向跳');
      h += `<button class="tnode s" data-act="selShot" data-v="${id}" aria-current="${UI.shot === id}"><span class="num">${short(id)}</span>${s.lock === '锁定' ? '<span title="已锁定" class="dot ok"></span>' : ''}${reds.length ? `<span class="flag" style="background:var(--bad)" title="${esc(reds.map((x) => x.type).join('、'))}"></span>` : ''}${jump ? '<span class="flag" style="background:var(--warn)" title="光向跳"></span>' : ''}${s.protect ? '<span class="muted" style="font-size:13px" title="②「勿砍」戏核镜">核</span>' : ''}<span class="sec num">${s.duration}″</span></button>`;
    });
  });
  $('#tree').innerHTML = h;
}
function renderSide() {
  const sid = UI.shot || WB.group(st, UI.group || 'G1').shots[0]; const s = S(sid); const gaps = WB.gaps(st);
  /* 只有已批且已落地才算「有」：缺 N 含待批与待落地（Codex 第 2 轮 P1-6） */
  const missing = gaps; const pend = gaps.filter((g) => g.status !== '缺');
  let h = `<div class="tthead"><h2 class="tt">本镜 REF <span class="muted num">${esc(short(s.id))}</span></h2><button class="btn sm ghost only-narrow panel-close" data-act="toggleSide" aria-label="关闭资产栏">关闭</button></div>`;
  s.assets.filter((a) => a.inFrame !== false).forEach((a) => {
    const t = WB.assetStatus(st, a); const cls = t.state === '已批' ? '' : t.state === '缺' ? 'miss' : 'pend';
    h += `<button class="ref ${cls}" ${t.state !== '已批' ? `data-act="gap" data-v="${esc(WB.gapKey(a))}"` : 'disabled'}><span class="rid">${esc(a.id || '待补码')}</span><span>${esc(a.id ? '@' + a.state : a.name)}<br><span class="muted">${esc(a.view)}${a.id ? ' · ' + esc(st.data.registryNames[a.id] || '') : ''}</span></span><span class="st">${chip(t.type ? t.type : t.state, t.state === '缺' ? 'bad' : t.state === '已批' ? 'ok' : 'warn')}</span></button>`;
  });
  const g = WB.groupOf(st, s.id); const ff = g.firstFrameRef;
  if (ff && g.shots[0] === s.id) h += `<div class="ref ${sc(ff.status) === 'bad' ? 'miss' : 'pend'}"><span class="rid">首帧</span><span>${esc(ff.from)}<br><span class="muted">${esc(ff.file.split('/').pop())}</span></span><span class="st">${chip(ff.status)}</span></div>`;
  h += `<h2 class="tt">缺资产 ${missing.length ? `<span class="missing num" title="还没有「已批且已落地」REF 的项（含待批），按首次出现排序">缺 ${missing.length}</span>` : ''} ${pend.length ? chip('其中待批 ' + pend.length, 'warn') : ''}</h2>`;
  if (!gaps.length) h += '<div class="empty">没有缺口：全部 REF 已批</div>';
  const gapRow = (x) => `<button class="gap" data-act="gap" data-v="${esc(x.key)}"><span class="chip gt ${x.status === '缺' ? 'bad' : 'warn'}">${esc(x.type)}</span> <b>${esc(x.id || '')}</b> ${esc(x.name)} <span class="muted">@${esc(x.state)}·${esc(x.view)}｜首见 ${esc(short(x.shots[0]))}${x.shots.length > 1 ? ` 等 ${x.shots.length} 镜` : ''}</span>${x.status === '待批' ? ' ' + chip('已入库｜待批', 'warn') : ''}</button>`;;
  h += gaps.slice(0, 5).map(gapRow).join('');
  if (gaps.length > 5) h += `<details class="more gaps"><summary>其余 ${gaps.length - 5} 项</summary>${gaps.slice(5).map(gapRow).join('')}</details>`;
  h += `<p class="muted proc" style="font-size:13px;margin-top:12px">只有「已批」算有图。命名：assets/REF/&lt;ID&gt;/&lt;ID&gt;_&lt;状态&gt;_&lt;视角&gt;_v01_cA.png；选定后去掉 _cX，落选进 _候选存档/（浏览器不能挪文件，操作进后台队列，由 tools/apply_ops.py 执行）。</p>`;
  $('#side').innerHTML = h;
}
function curVal(sid, field) {
  const s = S(sid); const f = String(field || '时长');
  if (/焦距/.test(f)) return '焦距 ' + focalTxt(s); if (/光圈/.test(f)) return '光圈 ' + (s.aperture.value || 'T2.8'); if (/运镜/.test(f)) return '运镜 ' + moveTxt(s);
  if (/色温|光质/.test(f)) { const L = WB.effLight(st, s); return `${L.ct}K · ${L.quality}`; } return '时长 ' + s.duration + '″';
}
function editBar() {
  const r = UI.result; let res = '';
  if (r) {
    const it = r.intent || {};
    res = `<div class="result" role="status" aria-live="polite"><div class="row">${chip(r.status)}<span style="flex:1">${esc(r.msg || '')}</span>${r.status !== '预览' ? '<button class="btn sm ghost" data-act="cancelEdit" aria-label="收起结果">收起</button>' : ''}</div>
      ${r.intent ? `<div class="intent"><div><span class="lat">范围 Scope</span>${esc(it.scope)}｜${esc(it.target)}</div><div><span class="lat">变量 Variable</span>${esc(it.variable)}</div><div><span class="lat">约束 Constraint</span>${esc(it.constraint)}</div></div>` : ''}
      ${r.plan && r.plan.plan ? `<table class="t"><thead><tr><th>镜</th><th>现在</th><th>改后</th><th>差</th></tr></thead><tbody>${r.plan.plan.map((p) => { const d = Math.round((p.after - p.before) * 10) / 10; return `<tr><td class="num">${short(p.id)}</td><td class="num">${p.before}″</td><td class="num">${p.after}″</td><td class="num">${d > 0 ? '+' : ''}${d}″</td></tr>`; }).join('')}<tr><td>组</td><td class="num">${r.plan.groupBefore}″</td><td class="num ${r.plan.groupAfter > 30 ? 'bad' : ''}">${r.plan.groupAfter}″</td><td>全场 → <span class="num">${r.plan.sceneAfter}″</span></td></tr></tbody></table>` : ''}
      ${r.invalidates && r.invalidates.length ? `<div class="alert warn"><b>${r.status === '预览' ? '解锁将使以下内容失效：' : '已失效：'}</b><ul>${r.invalidates.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${r.status === '冲突' ? `<div class="cmp"><div><span class="lat">他的改动 Theirs</span><br><b>${esc(r.conflict.theirs.who)}</b> ${esc(r.conflict.theirs.time.slice(11, 16))}<br>${esc(r.conflict.theirs.text)}<br><span class="muted">${esc(r.conflict.theirs.before)} → ${esc(r.conflict.theirs.after)}</span></div><div><span class="lat">现值 Current</span><br>${esc(short(r.conflict.sid))} ${esc(curVal(r.conflict.sid, r.conflict.field))}</div><div><span class="lat">你的改动 Mine</span><br>${esc(r.conflict.mine)}</div></div><div class="row" style="margin-top:10px"><button class="btn" data-act="ackConflict">采纳他的（标记已读，不改）</button><button class="btn" data-act="forceConflict">在他的基础上仍改（记录在案）</button></div>` : ''}
      ${r.status === '预览' ? `<div class="row" style="margin-top:10px"><button class="btn pri" data-act="confirmEdit">确认应用</button><button class="btn ghost" data-act="cancelEdit">取消</button>${r.parsed && r.parsed.kind === 'duration' ? `<div class="seg" role="group" aria-label="秒数处理"><button data-act="durMode" data-v="absorb" aria-pressed="${UI.durMode === 'absorb'}">组内吸收</button><button data-act="durMode" data-v="total" aria-pressed="${UI.durMode === 'total'}">改组总秒</button></div>` : ''}</div>` : ''}
      ${r.status === '超限' || r.status === '需重切组' ? '<div class="alert bad">系统不会把镜头自动挪到别的组，也不会动锁定镜。请拆镜、改其他镜，或由导演决定重切组。</div>' : ''}
    </div>`;
  }
  const unseen = WB.unseenFor(st, UI.who);
  return `<div class="editbar"><form class="editbox" data-form="edit" autocomplete="off"><label for="editInput" class="lat">白话改 Edit</label><input id="editInput" placeholder="一句白话，例如：C005 改 2.5 秒（回车预览，按 / 聚焦）" value="${esc(UI.pendingText)}"><span class="muted" style="font-size:13px;white-space:nowrap">以「${esc(UI.who)}」</span><button class="btn pri" type="submit">预览</button></form>
    <div class="hints">${['前三镜快一点', 'C005 改 2.5 秒', 'C010 焦距 85', '组二节奏放慢', '这里别看见诺亚', 'C004 光再柔一点'].map((x) => `<button class="chip" data-act="hint" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    ${unseen.length ? `<div class="alert warn row"><span>其他人有 <b class="num">${unseen.length}</b> 处改动你还没看：${esc(unseen.slice(-3).map((e) => e.who + '·' + e.text).join('；'))}</span><button class="btn sm" data-act="ack">标为已读</button></div>` : ''}${res}</div>`;
}
