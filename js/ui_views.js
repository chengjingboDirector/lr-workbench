/* 场次工作台 · 界面层（二）各视角 */
'use strict';
function groupHead(g) {
  const sec = WB.groupSec(st, g); const b = WB.boundaryCheck(st, g.id); const cl = WB.canLockGroup(st, g.id);
  return `<div class="grouphead" id="grp-${g.id}"><div><div class="secbig ${sec > 30 ? 'bad' : ''} num">${sec}″<span class="muted" style="font-size:13px"> / 30″</span></div><div class="muted num" style="font-size:12px">${esc(g.id)} 段</div></div>
    <div class="meta"><h2 class="h2" style="margin:0">${esc(g.name)}｜${esc(g.beat)}</h2><div class="ink2">${esc(g.rhythm)}</div>
    <div class="row" style="margin-top:6px">${g.acting ? lintBadge(actingLint(g), 'act-' + g.id, g.name + ' 表演设计（ACTING）', g.id) : ''}${g.version ? chip('现行 ' + g.version.current, '', `title="${esc(g.version.note)}"`) : ''}${g.id === 'G1' ? chip('视听 ② cc1c1b2c 组一 001–008/29″：版本冲突，未合并', 'warn') : ''}${g.chain && g.chain.length ? chip(`不可切链 ${short(g.chain[0])}–${short(g.chain[g.chain.length - 1])}`, 'warn', 'title="链内镜头只能组内吸收；超限即需重切组，不跨组挪"') : ''}${b.ok ? (b.prev ? chip('与上组首尾衔接 ✓', 'ok') : '') : chip('首尾不衔接：' + b.diffs.map((d) => d.k).join('、'), 'bad')}${g.lock === '锁定' ? chip('组已锁定') : `<button class="btn sm proc" data-act="lockGroup" data-v="${g.id}" ${cl.ok ? '' : `title="${esc(cl.why.join('；'))}"`}>${ico.lock}锁组</button>`}</div>
    ${!b.ok ? `<div class="alert bad" style="font-size:13px">${b.diffs.map((d) => `「${esc(d.k)}」上组末：${esc(d.prevEnd || '—')} ≠ 本组起：${esc(d.start || '—')}`).join('<br>')}</div>` : ''}</div></div>`;
}
function mapBlock(g) {
  if (!g.map) return '';
  const m = g.map; const [W, H] = m.size; let svg = '';
  if (UI.overlay === 'annot') {
    const ax = m.axis; svg += `<line x1="${ax.a[0]}" y1="${ax.a[1]}" x2="${ax.b[0]}" y2="${ax.b[1]}" stroke="#e9e5dc" stroke-dasharray="6 6" stroke-width="1.5"/><text x="${ax.b[0] + 6}" y="${ax.b[1] - 6}" fill="#e9e5dc" font-size="13">${esc(ax.label)}</text>`;
    m.lights.forEach((l) => { svg += l.point ? `<circle cx="${l.from[0]}" cy="${l.from[1]}" r="9" fill="${l.color}" opacity=".85"/><text x="${l.from[0] + 14}" y="${l.from[1] + 4}" fill="${l.color}" font-size="13">${esc(l.label)}</text>` : `<line x1="${l.from[0]}" y1="${l.from[1]}" x2="${l.to[0]}" y2="${l.to[1]}" stroke="${l.color}" stroke-width="3" ${l.dashed ? 'stroke-dasharray="10 6"' : ''}/><text x="${l.to[0] - 10}" y="${l.to[1] + 20}" fill="${l.color}" font-size="13" text-anchor="end">${esc(l.label)}</text>`; });
    m.people.forEach((p) => { svg += `<polyline points="${p.points.map((q) => q.xy.join(',')).join(' ')}" fill="none" stroke="${p.color}" stroke-width="2" stroke-dasharray="4 4"/>`; p.points.forEach((q) => { const left = p.who === '诺亚'; svg += `<circle cx="${q.xy[0]}" cy="${q.xy[1]}" r="11" fill="${p.color}"/><text x="${q.xy[0]}" y="${q.xy[1] + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#0e1113">${q.n}</text><text x="${q.xy[0] + (left ? -16 : 16)}" y="${q.xy[1] - 12}" text-anchor="${left ? 'end' : 'start'}" font-size="12" fill="${p.color}">${esc(p.who.slice(0, 2))}${q.n} ${esc(q.shot)}${q.note ? ' ' + esc(q.note) : ''}</text>`; }); });
    m.cameras.forEach((c) => { const a = c.dir * Math.PI / 180; const x2 = c.xy[0] + Math.cos(a) * 26, y2 = c.xy[1] + Math.sin(a) * 26; svg += `<rect x="${c.xy[0] - 7}" y="${c.xy[1] - 5}" width="14" height="10" fill="#e9e5dc"/><line x1="${c.xy[0]}" y1="${c.xy[1]}" x2="${x2}" y2="${y2}" stroke="#e9e5dc" stroke-width="1.5"/><text x="${c.xy[0] + 10}" y="${c.xy[1] + 18}" font-size="11" fill="#b9b4aa">${esc(c.shot)} ${esc(c.move)}</text>`; });
    (m.distances || []).forEach((d) => { svg += `<line x1="${d.a[0]}" y1="${d.a[1]}" x2="${d.b[0]}" y2="${d.b[1]}" stroke="#e3b448" stroke-width="1"/><text x="${(d.a[0] + d.b[0]) / 2 + 8}" y="${(d.a[1] + d.b[1]) / 2}" fill="#e3b448" font-size="12">${esc(d.label)}</text>`; });
    m.props.forEach((p) => { svg += `<text x="${p.xy[0]}" y="${p.xy[1]}" fill="#b9b4aa" font-size="11">${esc(p.code)}</text>`; });
  }
  const img = UI.overlay === 'notext' ? m.notext : m.base;
  return `<h3 class="h3">鸟瞰站位图 <span class="lat">${esc(m.code)}</span> ${chip(m.status)}</h3>
    <div class="mapctl"><div class="seg" role="group" aria-label="鸟瞰图版本"><button data-act="overlay" data-v="annot" aria-pressed="${UI.overlay === 'annot'}">标注版</button><button data-act="overlay" data-v="notext" aria-pressed="${UI.overlay === 'notext'}">无字版（进提示词）</button></div><a class="proc" href="${esc(m.annot)}" download>下载标注 PNG</a> <a class="proc" href="${esc(m.notext)}" download>下载无字 PNG</a></div>
    <div class="mapwrap"><img src="${esc(img)}" alt="组一鸟瞰站位图（${UI.overlay === 'notext' ? '无字版' : '底图＋数据标注'}）"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${svg}</svg></div>
    <p class="muted" style="font-size:12px">底图由图像模型只画白模；人物、机位、光源、轴线全部按数据叠加，所以图与数据一致。</p>`;
}
function shotCheckAlerts(list) {
  return (list || []).map((x) => `<div class="alert ${x.level === '红' ? 'bad' : 'warn'}" style="font-size:13px"><b>${esc(x.type)}</b>：${esc(x.text)}${x.fix ? `<div class="fix">建议：${esc(x.fix)}（不会自动改）</div>` : ''}${x.src ? `<div class="fix">来源：${esc(x.src)}</div>` : ''}</div>`).join('');
}
function dlgBlock(s) {
  if (!s.dialogue.length) return '';
  return `<div class="lines">${s.dialogue.map((d) => { const src = st.data.literary.dialogue.find((x) => x.id === d.ref) || {}; return `<div class="ln"><span class="muted" style="font-size:12px">${esc(d.speaker)}${d.type !== '对白' ? '（' + esc(d.type) + '）' : ''} · +${d.t0}″</span> <span class="en">"${esc(d.en)}"</span> ${lineChips([[src.line, src.line]])}${d.t1 > s.duration + 0.05 ? ' ' + chip(`念完约 +${d.t1}″ ＞ ${s.duration}″`, 'bad') : ''}<div class="zh">${esc(d.zh)}</div></div>`; }).join('')}</div>`;
}
const visibleGroups = () => groups().filter((g) => !UI.group || UI.group === g.id);
function viewDirector() {
  const ch = checksBy(); let h = '';
  visibleGroups().forEach((g) => {
    h += groupHead(g) + (g.id === 'G1' ? mapBlock(g) : '');
    g.shots.forEach((id) => {
      const s = S(id); const L = WB.effLight(st, s);
      h += `<article class="shotcard ${UI.shot === id ? 'sel' : ''}" id="card-${id}"><div><div class="sid">${short(id)}<small>${s.duration}″ · ${esc(s.position.size || '')}</small></div><div style="margin-top:6px">${chip(s.lock)}</div>${s.protect ? '<div class="muted" style="font-size:11px;margin-top:4px">戏核·勿砍</div>' : ''}</div>
        <div><div class="effect">${esc(s.performance.action || s.performance.raw)}</div><div class="muted" style="font-size:13px">${s.performance.goal ? '目标：' + esc(s.performance.goal) : ''}${s.performance.eyeline ? '｜视线：' + esc(s.performance.eyeline) : ''}</div>
        ${dlgBlock(s)}${s.screenText.map((x) => `<div class="ln" style="margin-top:6px">${chip('屏幕字·后期叠加' + (x.track ? '·需跟踪' : ''), 'warn')} <span style="font-family:var(--latin);font-size:13px">${esc(x.en)}</span> ${lineChips([[x.line, x.line]])}</div>`).join('')}
        <div class="row" style="margin-top:8px">${compass(s)}<span>${esc(L.summary || st.data.scene.lighting.summary)}</span>${L.badge !== '继承自场' ? `<span class="ydot" title="${esc(L.badge)}"></span>` : ''}</div>
        ${shotCheckAlerts(ch[id])}
        ${s.beatNote ? `<div class="alert ok" style="font-size:13px">${esc(s.beatNote)}</div>` : ''}
        <div class="row proc" style="margin-top:8px">${lineChips([s.literary.lines])}<span class="pro">${(s.literary.events || []).map((e) => chip(e, '')).join(' ')}</span><button class="btn sm" data-act="lockShot" data-v="${id}">${ico.lock}${s.lock === '锁定' ? '解锁' : '锁定'}</button></div></div>
        <div class="col3">${sketchBlock(s)}</div></article>`;
    });
  });
  return h;
}
function toneBlock() {
  const refs = st.data.scene.toneRefs || [];
  return `<h3 class="h3">影调参考 <span class="lat">Tone Reference</span></h3>
    <label class="empty" style="display:block;cursor:pointer" id="dropzone" tabindex="0">把 1–2 张参考图拖到这里，或点此选择（只在本机分析，不上传）<input type="file" accept="image/*" multiple class="hide" data-act="toneFile"></label>
    ${refs.map((t, i) => `<div class="pane row" style="margin-top:10px;align-items:flex-start"><img src="${t.thumb}" alt="影调参考 ${i + 1}" style="width:160px;border-radius:6px"><div style="flex:1;min-width:220px"><div class="kv"><span class="k">主光方向</span><span>${esc(t.dir)}</span><span></span><span class="k">光比</span><span>${esc(t.ratio)}</span><span></span><span class="k">色温</span><span>${esc(t.ct)}</span><span></span><span class="k">反差</span><span>${esc(t.contrast)}</span><span></span></div>
      <div class="row" style="margin-top:8px">${(t.samples || []).map((sm, j) => `<div class="pane" style="padding:8px 10px"><div class="row">${chip('候选')}<span>样图槽 ${j + 1}：待生成</span></div><button class="btn sm" style="margin-top:6px" data-act="toneSend" data-i="${i}" data-j="${j}" ${sm.sent ? 'disabled' : ''}>${sm.sent ? '已交导演定' : '交导演定'}</button></div>`).join('')}<button class="btn sm ghost" data-act="toneDel" data-i="${i}">移除</button></div></div></div>`).join('')}`;
}
function camTab(s, tab) {
  const L = WB.effLight(st, s); const r = WB.lightRel(st, s); const opt = WB.deriveOptics(st, s);
  const fl = (k, z) => `<button class="flagp" data-act="fieldLock" data-v="${s.id}|${k}" title="${UI.who === '导演' ? '导演：点击锁/解锁这个字段' : '只有导演可以锁字段'}" aria-pressed="${!!s.fieldLocks[k]}">${s.fieldLocks[k] ? ico.lock + ' 已锁' : '锁'}${z ? ' ' + z : ''}</button>`;
  if (tab === 'p') return `<div class="row" style="gap:6px;margin-bottom:6px"><span class="muted" style="font-size:12px">字段锁：</span>${fl('duration', '时长')}${fl('focal', '焦距')}${fl('aperture', '光圈')}${fl('move', '运镜')}${fl('lighting', '灯光')}</div><div class="kv"><span class="k">景别</span><span>${esc(s.position.size)}</span><span class="flagp in">进提示词</span><span class="k">运镜</span><span>${esc(moveTxt(s))}</span><span class="flagp in">进提示词</span><span class="k">机位</span><span>${esc(s.position.raw || '')}${s.position.height ? ` · 高 ${s.position.height}m` : ''}${s.position.distance ? ` · 距 ${s.position.distance}m` : ''}${s.position.yaw != null ? ` · 朝向 ${s.position.yaw}°` : ''}</span><span class="flagp in">进提示词</span><span class="k">焦距</span><span>${gl('球面等效', focalTxt(s))}</span><span class="flagp in">等效进提示词</span><span class="k">光圈</span><span>${esc(s.aperture.value || 'T2.8')}${s.aperture.inherit ? '（继承）' : ''}</span><span class="flagp in">进提示词</span><span class="k">器材</span><span>${esc(s.move.primary)}</span><span class="flagp">仅实拍参考</span></div>`;
  if (tab === 'l') return `<div class="kv"><span class="k">一句话</span><span>${esc(L.summary || '—')}</span><span>${chip(L.badge, L.badge === '继承自场' ? '' : 'warn')}</span><span class="k">主光</span><span>${gl(KEYZH[L.key] || L.keyZh || L.key)}${L.keyOut ? ' → ' + gl(KEYZH[L.keyOut] || L.keyOutZh || L.keyOut) : ''}</span><span></span><span class="k">辅光</span><span>${esc(L.fill || '无（让暗部掉黑）')}</span><span></span><span class="k">戏剧目的</span><span>${esc(L.purpose || '—')}</span><span>${L.eventId ? chip(L.eventId, '') : ''}</span><span class="k">光源</span><span>${esc((L.sources || []).join('、'))}｜主 ${esc(L.keySource)}</span><span>${compass(s)}</span><span class="k">相对机位</span><span>${esc(r ? r.kind : '—')}</span><span></span><span class="k">光比/色温</span><span>${gl('光比', L.ratio)} · ${esc(L.ct)}K · ${gl(L.quality === '硬' ? '硬光' : '柔光', L.quality)}</span><span></span><span class="k">行为</span><span>${L.flicker ? `闪烁 ${L.flicker.map((x) => x + '″').join('、')}` : esc(L.behavior || '固定')}${L.l3path ? '｜L3 路径：' + L.l3path.map((x) => `${x.t}″ ${esc(x.pos)}${x.onFace ? '' : '（不上脸）'}`).join(' → ') : ''}</span><span></span><span class="k">介质</span><span>${esc(L.medium)}</span><span></span><span class="k">来源</span><span>${esc(L.litLine ? '文学本原文 L' + L.litLine : (L.origin || '视听设计'))}</span><span>${L.litLine ? lineChips([[L.litLine, L.litLine]]) : ''}</span>${L.jumpReason ? `<span class="k">换主光</span><span>${esc(L.jumpReason)}</span><span></span>` : ''}<span class="k">进提示词</span><span>${esc(L.flag || '进提示词')}</span><span></span></div>`;
  return opt.length ? `<ul style="margin:0;padding-left:18px">${opt.map((x) => `<li>${gl(x.k)}：${esc(x.v)} <span class="muted">（触发：${esc(x.trig)}）</span></li>`).join('')}</ul><p class="muted" style="font-size:12px">只列被触发的项；没触发的光学特性自动不写进提示词。</p>` : '<div class="empty">本镜没有触发光学特性</div>';
}
function viewCamera() {
  const sc0 = st.data.scene; const op = sc0.optics; const pk = op.package; const ch = checksBy();
  let h = `<h2 class="h2">摄影 <span class="lat">Lighting &amp; Optics</span></h2>
    <div class="pane"><div class="row"><b>${esc(pk.machine.value)}｜${esc(pk.format.value)}｜${esc(pk.lens.value)}｜${esc(pk.filter.value)}</b>${chip(st.decisions.OPTICS && st.decisions.OPTICS.proxy ? '总监代选｜待导演确认' : op.status)}</div>
    <p class="lead" style="margin:8px 0 0">${esc(op.line)}</p>
    <details style="margin-top:8px"><summary>为什么这样配；谁负责</summary><ul>${op.why.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="muted" style="font-size:12px">摄影负责灯光、光学、光圈、实际焦距、器材；视听负责景别、运镜、焦段区间、机位、分组。进提示词：${esc(pk.format.promptText)}；${esc(pk.lens.promptText)}；${esc(pk.filter.promptText)}。器材品牌只作实拍参考。焦距按球面等效存，界面同时显示实际焦距（×${op.anamorphicFactor}）。</p></details></div>
    <div class="pane" style="margin-top:12px"><div class="row"><b>场光</b><span>${gl('低调')} ${esc(sc0.lighting.ratio)} · ${gl('色温')} ${esc(sc0.lighting.ct)}K · ${esc(sc0.lighting.quality)} · ${gl('体积光', sc0.lighting.medium)}</span></div><p style="margin:6px 0 0">「${esc(sc0.lighting.summary)}」</p>
    <div class="row" style="margin-top:6px">${sc0.lightSources.map((l) => `<span class="chip" title="${esc(l.en)}｜来向 ${l.az}°｜${esc(l.origin)}">${esc(l.id)} ${esc(l.name)}${l.asset ? '' : '（待补码）'}</span>`).join('')}</div></div>
    ${toneBlock()}`;
  visibleGroups().forEach((g) => {
    h += groupHead(g) + (g.lighting && g.lighting.summary ? `<div class="alert warn" style="font-size:13px">组覆盖：${esc(g.lighting.summary)}${g.lighting.note ? '｜' + esc(g.lighting.note) : ''}</div>` : '') + (op.groupNotes[g.id] ? `<div class="alert ok" style="font-size:13px">${esc(op.groupNotes[g.id])}</div>` : '');
    g.shots.forEach((id) => {
      const s = S(id); const L = WB.effLight(st, s); const tab = UI.ptab[id] || 'p'; const opt = WB.deriveOptics(st, s);
      h += `<article class="shotcard ${UI.shot === id ? 'sel' : ''}" id="card-${id}"><div><div class="sid">${short(id)}<small>${s.duration}″</small></div></div><div>
        <div class="camcard"><div class="pk">${esc(pk.machine.value)}｜${esc(pk.format.value.replace(/（.*）/, ''))}｜${esc(pk.lens.value)}｜${esc(pk.filter.value)}</div><div class="why">${esc(L.summary || sc0.lighting.summary)}；${esc(focalTxt(s))}。</div><div class="row" style="margin-top:6px">${chip('灯光·' + L.badge, L.badge === '继承自场' ? '' : 'warn')}${opt.map((x) => chip(`${x.k}（${x.trig}）`, '')).join(' ')}</div>
        <div class="ptabs" role="tablist" aria-label="${short(id)} 参数">${[['p', '参数'], ['l', '灯光'], ['o', '光学特性']].map(([k, z]) => `<button role="tab" data-act="ptab" data-id="${id}" data-v="${k}" aria-selected="${tab === k}">${z}</button>`).join('')}</div>${camTab(s, tab)}</div>
        ${shotCheckAlerts((ch[id] || []).filter((x) => /光/.test(x.type)))}</div><div class="col3">${sketchBlock(s)}</div></article>`;
    });
  });
  return h;
}
function viewEdit() {
  let h = `<h2 class="h2">剪辑 <span class="lat">Timeline</span></h2><p class="muted">虚线是 Seedance 单段 30″ 上限；青条是台词估算时长（2.8 词/秒），红条表示本镜念不完。</p>`;
  groups().forEach((g) => {
    const sec = WB.groupSec(st, g); const scale = 100 / Math.max(30, sec); let t = 0;
    h += `<h3 class="h3">${esc(g.name)} <span class="num ${sec > 30 ? 'bad' : 'muted'}">${sec}″</span></h3><div class="tl"><div class="lane"><div class="limit" style="left:${30 * scale}%"></div>${g.shots.map((id) => { const s = S(id); const x = t; t += s.duration; return `<div class="blk ${s.protect ? 'prot' : ''}" data-act="selShot" data-v="${id}" role="button" tabindex="0" style="left:${x * scale}%;width:calc(${s.duration * scale}% - 2px)" title="${short(id)} ${s.duration}″"><span class="num">${short(id).slice(1)}</span> <span class="muted num">${s.duration}</span>${s.dialogue.map((d) => `<i class="dl ${d.t1 > s.duration + 0.05 ? 'over' : ''}" style="left:${d.t0 / s.duration * 100}%;width:${Math.max(2, Math.min(100 - d.t0 / s.duration * 100, (d.t1 - d.t0) / s.duration * 100))}%"></i>`).join('')}</div>`; }).join('')}</div><div class="ruler"><span>0″</span><span>10″</span><span>20″</span><span>30″</span></div></div>`;
    const dls = g.shots.map(S).filter((s) => s.dialogue.length);
    if (dls.length) h += `<details class="pane" style="margin-bottom:12px" ${dls.some((s) => s.dialogue.some((d) => d.t1 > s.duration + 0.05)) ? 'open' : ''}><summary><b>台词时序</b> <span class="muted">改起点／止点秒，不改台词；红 = 本镜念不完；止点手填短于估算会标「要试听」</span></summary><div style="overflow-x:auto"><table class="t"><thead><tr><th>镜</th><th>台词</th><th>起点</th><th>止点</th><th>镜长</th><th></th></tr></thead><tbody>${dls.map((s) => s.dialogue.map((d, i) => { const over = d.t1 > s.duration + 0.05; const ov = s.dialogue.some((x, j) => j !== i && x.t0 < d.t1 && d.t0 < x.t1); return `<tr><td class="num">${short(s.id)}</td><td style="font-family:var(--latin)">${esc(d.en)}</td><td><input class="inp num" style="width:72px" type="number" step="0.1" min="0" value="${d.t0}" aria-label="${short(s.id)} 第 ${i + 1} 句起点" data-dt="${s.id}|${i}"></td><td class="num ${over ? 'bad' : ''}"><input class="inp num" style="width:72px" type="number" step="0.1" min="0" value="${d.t1}" aria-label="${short(s.id)} 第 ${i + 1} 句止点" data-dt1="${s.id}|${i}">${d.timing === '剪辑定' ? '' : '<span class="muted">（估）</span>'}${d.timingRisk ? (WB.heardOk(d) ? chip('已试听｜' + d.heard.who, 'ok') : chip('要试听', 'warn') + ` <button class="btn sm" data-act="heard" data-v="${s.id}|${i}" ${['导演', '剪辑'].includes(UI.who) ? '' : 'disabled title="只有导演或剪辑可以记录试听"'}>试听能念完</button>`) : ''}</td><td class="num">${s.duration}″</td><td>${over ? chip('念不完', 'bad') : ''}${ov ? chip('重叠', 'bad') : ''}<button class="btn sm" data-act="dlgTime" data-v="${s.id}|${i}">应用</button></td></tr>`; }).join('')).join('')}</tbody></table></div></details>`;
    const eds = g.shots.map(S).filter((s) => s.editorial);
    if (eds.length) h += `<table class="t"><thead><tr><th>镜</th><th>剪辑完成（不进提示词）</th></tr></thead><tbody>${eds.map((s) => `<tr><td class="num">${short(s.id)}</td><td>${esc(s.editorial)}</td></tr>`).join('')}</tbody></table>`;
  });
  return h + `<h3 class="h3">转场</h3><p>入：${esc(st.data.scene.transitions.in)}<br>出：${esc(st.data.scene.transitions.out)}</p>`;
}
function viewArt() {
  const ch = WB.continuityChecks(st);
  const ci = st.data.scene.continuityIssues || [];
  let h = `<h2 class="h2">美术 <span class="lat">Continuity</span></h2><h3 class="h3">新旧文学冲突 <span class="lat">Old vs New</span></h3>${ci.map((c) => `<div class="alert warn" style="font-size:13px"><b>${esc(c.id)}</b> ${esc(c.title)} ${lineChips(c.lines)}<div class="fix">${st.approvals[c.id] ? '导演定：' + esc(st.approvals[c.id]) : '总监代选｜待导演确认：' + esc(c.proxy)}${c.tmp ? '｜临时码 ' + esc(c.tmp) : ''}<span class="tag-src pro">｜${esc(c.src)}</span></div>${ciControls(c)}</div>`).join('')}<h3 class="h3">连贯检查</h3>${ch.length ? shotCheckAlerts(ch.map((x) => Object.assign({}, x, { type: short(x.id) + ' ' + x.type }))) : '<div class="empty">连贯检查全部通过</div>'}
    <h3 class="h3">逐镜资产与包内物件</h3><div style="overflow-x:auto"><table class="t"><thead><tr><th>镜</th><th>REF（ID@状态）</th><th>包内</th><th>地上</th></tr></thead><tbody>`;
  shots().forEach((s) => { h += `<tr class="${UI.shot === s.id ? 'sel' : ''}"><td class="num"><button class="chip" data-act="selShot" data-v="${s.id}">${short(s.id)}</button></td><td>${s.assets.map((a) => { const t = WB.assetStatus(st, a); return `<span class="chip ${t.state === '已批' ? 'ok' : t.state === '缺' ? 'bad' : 'warn'}" title="${esc((t.type || '') + '｜' + a.view)}">${esc(a.id ? a.id + '@' + a.state : '待补码·' + a.name)}${a.inFrame === false ? '（画外）' : ''}</span>`; }).join(' ')}</td><td>${esc(s.bag.join('、') || '—')}</td><td>${esc(s.ground.join('、') || '—')}</td></tr>`; });
  return h + '</tbody></table></div>';
}
function verbatim() {
  const lit = st.data.literary; const rows = [];
  shots().forEach((s) => s.dialogue.forEach((d) => { const src = lit.dialogue.find((x) => x.id === d.ref) || {}; const ln = lit.lines[src.line - 1]; rows.push({ s, d, src, same: !!ln && ln.text === d.en }); }));
  return rows;
}
function viewScript() {
  const lit = st.data.literary; const rows = verbatim(); const ok = rows.filter((r) => r.same).length;
  const lits = st.proposals.filter((p) => p.kind === 'literary');
  return `<h2 class="h2">剧作 <span class="lat">Verbatim</span></h2>
    <div class="row">${chip(`台词逐字比对 ${ok}/${rows.length}`, ok === rows.length ? 'ok' : 'bad')}${chip('文学本只读 ' + lit.sha8, '')}${st.literaryDiff ? chip('文学 diff：' + st.literaryDiff.status, 'warn') : chip('当前方向不改文学', 'ok')}</div>
    <h3 class="h3">需剧作/导演确认</h3>${lits.length ? lits.map((p) => `<div class="alert bad" style="font-size:13px"><b>${esc(p.who)}</b>：${esc(p.text)} → ${esc(p.target)}｜${esc(p.status)}${p.note ? `<div class="fix">${esc(p.note)}</div>` : ''}</div>`).join('') : '<div class="empty">没有待确认的文学改动</div>'}
    <h3 class="h3">台词（英文逐字取自文学本）</h3><div style="overflow-x:auto"><table class="t"><thead><tr><th>镜</th><th>说话人</th><th>英文</th><th>出处</th><th>比对</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="num">${short(r.s.id)}</td><td>${esc(r.d.speaker)}</td><td style="font-family:var(--latin)">${esc(r.d.en)}</td><td>${lineChips([[r.src.line, r.src.line]])}</td><td>${r.same ? chip('逐字一致', 'ok') : chip('与文学本不一致', 'bad')}</td></tr>`).join('')}</tbody></table></div>
    <h3 class="h3">事件表 <span class="lat">${esc(st.data.sources.events.sha8)}</span></h3><div style="overflow-x:auto"><table class="t"><thead><tr><th>事件</th><th>节拍</th><th>内容</th><th>行</th><th>镜</th></tr></thead><tbody>${lit.events.map((e) => `<tr><td class="num">${esc(e.id)}</td><td>${esc(e.beat)}</td><td>${esc(e.text)}</td><td>${lineChips([e.lines])}</td><td class="num">${esc((e.shots || []).map(short).join('、'))}</td></tr>`).join('')}</tbody></table></div>`;
}

/* 新旧文学冲突：导演选项 → 关闭（选改文学项时要等剧作补丁，不能直接关） */
function ciControls(c) {
  const state = WB.ciState(st, c); const closed = state === '已关闭'; const isDir = UI.who === '导演';
  const cur = st.approvals[c.id] || c.options[0];
  return `<div class="row" style="margin-top:6px;gap:8px">${chip(state, closed ? 'ok' : /可关闭/.test(state) ? 'ok' : 'warn')}${closed ? '' : `<label class="sr" for="ci-${esc(c.id)}">${esc(c.id)} 选项</label><select id="ci-${esc(c.id)}" data-q="${esc(c.id)}" ${isDir ? '' : 'disabled'}>${c.options.map((o) => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select><button class="btn sm" data-act="decide" data-kind="新旧冲突" data-v="${esc(c.id)}" ${isDir ? '' : 'disabled title="只有导演可以定"'}>定</button><button class="btn sm" data-act="closeCI" data-v="${esc(c.id)}" ${isDir && /可关闭/.test(state) ? '' : 'disabled'}>关闭这条</button>`}</div>`;
}
