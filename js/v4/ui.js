/* 工作台 V0.7 前台：一屏一个决定；全页只有当前操作卡有实色主按钮；前台零术语，后台收在「项目资料与历史」 */
(function () {
  const R = window.RULES_V1; const KEY = 'lr-wb-v4-r3';
  const $ = (q, el) => (el || document).querySelector(q); const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const segN = (gid) => '第 ' + gid.slice(1) + ' 段'; const shotN = (sid) => '第 ' + (+sid.slice(5)) + ' 镜';
  const ROLES = ['导演', '美术', '摄影', '灯光', '表演', '剧作', '统筹'];
  const ROLE_LABEL = { 导演: '导演', 美术: '美术／场景', 摄影: '摄影', 灯光: '灯光', 表演: '表演', 剧作: '剧作', 统筹: '统筹' };
  const CLONE = (o) => JSON.parse(JSON.stringify(o));
  let S, U;
  const fresh = () => E4.init(CLONE(window.S04_DATA), window.REF_INDEX, CLONE(window.V4_EXTRA));
  const defaultsU = () => ({ cur: null, done: {}, openSeg: 'G1', lit: {}, results: {}, copied: {}, drafts: {}, hl: null, shotMsg: {}, imp: null });
  function load() {
    S = fresh(); U = defaultsU();
    try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o.pkg && o.pkg.baseSha === S.baseSha && !(o.pkg.deps && o.pkg.deps.rules)) { E4.restore(S, o.pkg); S.role = o.role || '导演'; } else if (o.pkg && o.pkg.deps && o.pkg.deps.rules) { const pd = E4.depsFromPkg(o.pkg); if (pd.ok) { S = E4.init(pd.data, pd.ref, pd.extra, o.pkg, pd); S.role = o.role || '导演'; } } U = Object.assign(defaultsU(), o.U || {}); U.results = (o.U && o.U.results) || {}; Object.keys(U.results).forEach((k) => { if (k === 'lit' || !S.fb.some((f) => f.id === U.results[k].fid)) delete U.results[k]; }); } } catch (e) { /* 本机缓存坏了就从头来 */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ pkg: E4.exportPkg(S, S.deps.fromPkg ? 'full' : 'local'), role: S.role, U: { done: U.done, openSeg: U.openSeg, drafts: U.drafts, copied: U.copied, results: Object.fromEntries(Object.entries(U.results).filter(([k, v]) => k !== 'lit' && v && v.fid).map(([k, v]) => [k, { fid: v.fid }])) } })); } catch (e) {} }
  const toast = (t) => { let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); } el.textContent = t; clearTimeout(el._t); el._t = setTimeout(() => el.remove(), 3200); };

  /* ---------- 步骤与当前操作卡 ---------- */
  const STEPS = [['script', '①剧本'], ['dir', '②定方向'], ['scene', '③整场'], ['shots', '④逐段逐镜'], ['prompt', '⑤出提示词／看片'], ['next', '下一场']];
  const stepDone = (k) => (k === 'dir' ? !!S.confirm.dir : !!U.done[k]);
  const curCard = () => U.cur || (STEPS.find(([k]) => !stepDone(k)) || ['prompt'])[0];
  const TASK = {
    script: () => (Object.keys(U.lit).length ? '你改了剧本，还没提交：点「确认提交」才生效。' : '先读一遍剧本；想直接试生成，点「直接去复制提示词」。'),
    dir: () => (S.role === '导演' ? '选这一场怎么处理。推荐在第一个。' : '方向由导演定；你可以先看推荐和理由。'),
    scene: () => '看看各部门现在的理解，哪里不对就在那一栏写。',
    shots: () => '一镜一镜看，没问题就点「这镜可以」。',
    prompt: () => '点「复制」，到生成视频的网站粘贴；看完视频回来写哪里不对。',
    next: () => '看第 5 场接上了什么、哪里冲突、还欠什么。',
    end: () => '核对本场结束时留下了什么，签你那一项。',
  };
  const taskOf = (k) => (k.startsWith('seg-') ? TASK.prompt() : (TASK[k] || TASK.prompt)());

  /* ---------- 通用：改动通道 ---------- */
  function channel(key, o) {
    const d = U.drafts[key] || ''; const lay = (U.drafts[key + ':layers'] || []);
    const layers = Object.entries(R.layers).filter(([k]) => !o.crew || o.crew === '导演' || R.layers[k].crew === o.crew);
    return `<div class="chan" data-chan="${key}">
      <label class="sr" for="ta-${key}">${esc(o.label || '我想调整')}</label>
      <textarea id="ta-${key}" data-draft="${key}" placeholder="${esc(o.ph || '我想调整：比如雨再大一点')}">${esc(d)}</textarea>
      <div class="meta">${o.layers === false ? '' : `<details><summary>改哪一块：不选也能提交 ▸</summary>${layers.map(([k, v]) => `<button type="button" class="chip" data-lay="${key}" data-l="${k}" aria-pressed="${lay.includes(k)}">${esc(v.name)}</button>`).join('')}</details>`}
        ${o.scopeSel ? `<label>范围 <select data-scope="${key}">${(() => { const sc = U.drafts[key + ':scope'] || o.scope; return `<option value="seg" ${sc === 'seg' ? 'selected' : ''}>这一段</option><option value="scene" ${sc === 'scene' ? 'selected' : ''}>整场</option>`; })()}</select></label>` : ''}
        ${o.sec ? `<label>第几秒 <input type="number" min="0" max="30" step="0.5" data-sec="${key}" value="${esc(U.drafts[key + ':sec'] || '')}"></label>` : ''}
        <button type="button" class="btn" data-act="submit" data-key="${key}" data-o='${esc(JSON.stringify({ scope: o.scope, gid: o.gid, sid: o.sid, crew: o.crew, entry: o.entry }))}' ${d.trim() ? 'data-primary' : 'disabled'}>${esc(o.btn || '提交')}</button></div>
      ${d.trim() ? '<p class="hint">草稿已自动保存，点「' + esc(o.btn || '提交') + '」才生效。</p>' : ''}
      <div data-res="${key}" tabindex="-1" aria-live="polite">${U.results[key] ? resultCard(key) : ''}</div></div>`;
  }
  /* 结果卡：固定四行 */
  function resultCard(key) {
    const r = U.results[key]; const rec = S.fb.find((f) => f.id === r.fid); if (!rec) return '';
    const items = rec.items; const applied = items.filter((x) => x.res === '已应用'); const need = items.filter((x) => x.res === '需人处理'); const pick = items.filter((x) => x.res === '待补选'); const pend = items.filter((x) => x.res === '待导演确认'); const sat = items.filter((x) => x.res === '已满足'); const sug = items.filter((x) => x.res === '转为建议');
    const miss = E4.missing(S, rec); const vers = Object.entries(rec.versions || {});
    const verTxt = vers.length ? vers.map(([g, n]) => 'S04-' + segN(g) + ' 第 ' + n + ' 版').join('、') : '没出新版本';
    const syncPending = Object.keys(S.lit.sync).length;
    let t1;
    const sugOnly = sug.length && !applied.length && !pick.length && !need.length && !pend.length;
    if (rec.reverted) t1 = '这次改动已撤回（建了恢复版，历史保留）';
    else if (sugOnly) t1 = '已记录建议，正文没改：' + [...new Set(sug.map((x) => x.crew && R.crews[x.crew] ? R.crews[x.crew].label : ''))].join('、') + '会在待办里看到并决定采不采纳';
    else if (!applied.length && sat.length && sat.length === items.length) t1 = '现在已经是这样，没有改动';
    else if (!applied.length && pick.length) t1 = '还没更新：先补选下面 ' + pick.length + ' 项';
    else if (!miss.length && !need.length && !syncPending) t1 = '✓ 更新好了：' + verTxt + '。可以复制了。';
    else t1 = '已更新一部分，还有 ' + (miss.length + need.length) + ' 项没做完';
    const shots = [...new Set(items.flatMap((x) => x.shots || []))]; const segs = [...new Set(shots.map((x) => WB.groupOf(S.st, x).id))];
    const line = (it, i) => {
      const lab = it.field && R.fields[it.field] ? `<span class="tag n">${esc(R.layers[R.fields[it.field].layer].name)}</span>` : '';
      let extra = '';
      if (it.review) extra += it.reviewed ? ` <span class="tag ${it.reviewed.ok ? 'g' : 'r'}">${esc(R.crews[it.review].label)}${it.reviewed.ok ? '已同意' : '不同意'}</span>` : ` <span class="tag y">待${esc(R.crews[it.review].label)}复核</span>`;
      if (it.link) extra += ' <span class="tag n">联动</span>';
      if (it.resNote) extra += `<div class="fine">${esc(it.resNote)}</div>`;
      if (it.ownNote) extra += `<div class="fine">${esc(it.ownNote)}${(it.ownShots || []).length && ['已应用', '已满足'].includes(it.res) ? (it.ownForced ? ` <span class="tag g">已一起改（${esc(it.ownForced)}）</span>` : ` <button type="button" class="btn sm" data-act="forceOwn" data-fid="${esc(rec.id)}" data-i="${rec.items.indexOf(it)}">这些也一起改</button>`) : ''}</div>`;
      if (it.maybe) extra += `<div class="fine">可能也有对视（请人勾选，没自动改）：${it.maybe.map((x) => shotN(x)).join('、')}</div>`;
      if (it.ask) extra += `<div class="fine">${esc(it.ask)}</div>`;
      return `<li class="it">「${esc(it.src)}」→ ${esc(it.why || '')} ${lab}${extra}</li>`;
    };
    const grp = (title, arr, cls) => (arr.length ? `<div class="grp"><b class="${cls}">${title}（${arr.length}）</b><ul>${arr.map(line).join('')}</ul></div>` : '');
    // 补选
    let pickUI = '';
    if (pick.length && !rec.reverted) {
      const sets = {}; items.forEach((it, i) => { if (it.res === '待补选' && it.needShot) { const k = it.needShot.join(',') + '@' + (it.secT != null ? it.secT : ''); (sets[k] = sets[k] || { c: it.needShot, t: it.secT, idx: [], src: [] }).idx.push(i); sets[k].src.push(it.src); } }); // 每组候选独立一组选择
      pickUI = `<div class="grp" data-pick="${rec.id}">${Object.values(sets).map((g, k) => `<p data-ps-items="${g.idx.join(',')}"><b>${g.t != null ? '第 ' + g.t + ' 秒' : '「' + esc(g.src[0]) + '」'}是哪一镜？</b>（${esc(g.src.join('、'))}）<br>${g.c.map((sid) => `<label class="chip"><input type="radio" name="ps-${rec.id}-${k}" value="${sid}"> ${shotN(sid)}（${esc(firstSentence(WB.shot(S.st, sid).performance.raw, 16))}）</label>`).join('')}</p>`).join('')}
        ${items.map((it, i) => (it.kind === 'pick' && it.options ? `<p><b>「${esc(it.src)}」有几种改法，选一种：</b><br>${it.options.map((op, j) => `<label class="chip"><input type="radio" name="po-${rec.id}-${i}" value="${j}"> ${esc(op.label)}</label>`).join('')}</p>` : '')).join('')}</div>`;
    }
    let todo;
    if (rec.reverted) todo = '不用做';
    else if (sugOnly) todo = '不用做（等对应岗位处理建议；你也可以撤回）' + ` <button class="lnk" data-act="revert" data-fid="${rec.id}" data-key="${key}">撤回这条</button>`;
    else if (pick.length) todo = `<button class="btn" data-primary data-act="resolve" data-fid="${rec.id}" data-key="${key}">选好并重新合成</button> <button class="lnk" data-act="revert" data-fid="${rec.id}" data-key="${key}">撤回这条反馈</button>`;
    else if (need.length) todo = `这 ${need.length} 句需要人处理：请保存交接包发给总监。 <button class="lnk" data-act="goto" data-go="foot">去保存交接包</button>`;
    else if (pend.length || rec.pendGroup && (S.pending.find((p) => p.id === rec.pendGroup) || {}).status === '待导演确认') todo = `<button class="btn" data-primary data-act="goto" data-go="pending">去确认（${(S.pending.find((p) => p.id === rec.pendGroup) || { items: pend }).items.length} 处）</button>`;
    else if (applied.length) todo = `<button class="btn" data-primary data-act="copy" data-gid="${segs[0] || rec.gid || 'G1'}">复制最新版</button> <button class="lnk" data-act="revert" data-fid="${rec.id}" data-key="${key}">撤回这次改动</button>`;
    else todo = '不用做';
    const diff = Object.entries(r.diff || {}).map(([g, d]) => `<b>${segN(g)}</b>\n` + d.del.map((x) => `<span class="d">− ${esc(x)}</span>`).join('\n') + (d.del.length ? '\n' : '') + d.add.map((x) => `<span class="a">＋ ${esc(x)}</span>`).join('\n')).join('\n\n');
    return `<section class="res" aria-label="结果卡">
      <div class="l"><b>你改了</b><div><span class="t1">${esc(t1)}</span><div class="fine">${esc(rec.text.slice(0, 60))}｜${esc(verTxt)}｜本地用时 ${r.ms != null ? r.ms.toFixed(0) + ' 毫秒' : '—'}</div></div></div>
      <div class="l"><b>影响</b><div>${shots.length ? shots.slice(0, 12).map((x) => `<button class="lnk" data-act="shot" data-sid="${x}">${shotN(x)}</button>`).join('') + (shots.length > 12 ? ` 等 ${shots.length} 镜` : '') : '没有镜头受影响'}${segs.length ? '｜' + segs.map((g) => `<button class="lnk" data-act="seg" data-gid="${g}">${segN(g)}</button>`).join('') : ''}</div></div>
      <div class="l"><b>还差</b><div>${miss.length ? '<ul>' + miss.map((m) => `<li class="${m.red ? 'bad' : ''}">${esc(m.t)} <button class="lnk" data-act="goto" data-go="${m.go}">去看</button></li>`).join('') + '</ul>' : '不差了'}</div></div>
      <div class="l"><b>你要做</b><div>${todo}</div></div>
      ${pickUI}
      ${grp('已应用', applied, 'ok')}${grp('等导演确认（没进正文）', pend, 'warn')}${grp('请补选', pick, 'warn')}${grp('需要人处理', need, 'bad')}${grp('已满足，不重算', sat, 'ok')}${grp('转为给岗位的建议', sug, 'warn')}
      ${diff ? `<details><summary>展开：逐句差异</summary><div class="diff">${diff}</div></details>` : ''}
    </section>`;
  }
  const firstSentence = (t, n) => { t = String(t || '').replace(/\*\*/g, '').replace(/【[^】]*】/g, ''); const m = t.split(/[。；]/)[0]; return m.length > (n || 40) ? m.slice(0, n || 40) + '…' : m; };

  /* ---------- 顶栏与进度 ---------- */
  function top() {
    const todos = E4.todos(S, S.role); const sec = S.st.data.groups.reduce((a, g) => a + WB.groupSec(S.st, g), 0); const cur = curCard();
    return `<header class="top"><div class="in"><div class="r1"><h1>第四场｜被扫描</h1><span class="stat">${sec} 秒 · ${S.st.data.shots.length} 镜 · ${S.st.data.groups.length} 段</span>
      <button class="wait" data-act="goto" data-go="todo">等你处理 <b>${todos.length}</b> 件</button>
      <span class="who"><label for="who">我是：</label><select id="who" data-act="role">${ROLES.map((r) => `<option ${r === S.role ? 'selected' : ''} value="${r}">${ROLE_LABEL[r]}</option>`).join('')}</select><small>只切换视角，不验证身份</small></span></div>
      <div class="next"><b>下一步：</b>${esc(taskOf(cur))}<a href="#card-${cur.startsWith('seg-') ? 'prompt' : cur}" data-act="goto" data-go="${cur}">↓</a></div></div></header>`;
  }
  function prog() {
    const cur = curCard(); const ck = cur.startsWith('seg-') ? 'prompt' : cur;
    return `<nav aria-label="工作顺序"><ol class="prog">${STEPS.map(([k, t], i) => `<li>${i ? '<span class="sep" aria-hidden="true">──</span>' : ''}<a href="#card-${k}" data-act="goto" data-go="${k}" class="${k === ck ? 'cur' : stepDone(k) ? 'done' : ''}" ${k === ck ? 'aria-current="step"' : ''}>${t}${stepDone(k) ? ' ✓' : ''}</a></li>`).join('')}</ol></nav>
      <p class="jump"><button class="lnk" data-act="direct">直接去复制提示词 →</button> <span class="fine">（任何时候都能点；试生成不替导演选方向）</span></p>`;
  }
  function todoBtn(t) { if (t.kind === 'sugg') return `<button class="lnk" data-act="sugg" data-fid="${t.fid}" data-i="${t.idx}" data-ok="1">采纳（按原范围改）</button> <button class="lnk" data-act="sugg" data-fid="${t.fid}" data-i="${t.idx}" data-ok="0">不采纳</button>`; if (t.kind === 'objection') return `<button class="lnk" data-act="hist">去反馈记录看（可撤回那一条）</button>`; return t.kind === 'review' ? `<button class="lnk" data-act="review" data-fid="${t.fid}" data-i="${t.idx}" data-ok="1">同意</button> <button class="lnk" data-act="review" data-fid="${t.fid}" data-i="${t.idx}" data-ok="0">不同意</button>` : `<button class="lnk" data-act="goto" data-go="${t.go}">去处理</button>`; }
  function todoCard() {
    const T = E4.todos(S, S.role); const imp = S.imported;
    return `<section class="card" id="card-todo" data-card="todo"><h2>等你处理<span class="ver">我是：${ROLE_LABEL[S.role]}</span></h2>
      ${S.deps.fromPkg ? `<p class="warn">本页现在用的是交接包带来的依赖（规则包、参考清单、视听补数等全文，签名已核对），不是本机文件；<button class="lnk" data-act="useLocal">改回本机依赖（会清掉本页改动）</button></p>` : ''}
      ${imp ? `<p class="fine">已导入交接包（来自：${esc(ROLE_LABEL[imp.from] || imp.from)}，给：${esc(ROLE_LABEL[imp.to] || imp.to || '—')}，${esc(imp.time)}）</p>` : ''}
      ${T.length ? `<p class="todo1"><b>先做这件：</b>${esc(T[0].t)} ${todoBtn(T[0])}</p>${T.length > 1 ? `<details><summary>其余 ${T.length - 1} 件（不急，做到那一步再处理）▸</summary><ol start="2" class="todo">${T.slice(1).map((t) => `<li>${esc(t.t)} ${todoBtn(t)}</li>`).join('')}</ol></details>` : ''}` : '<p>现在没有等你处理的事。</p>'}
      ${S.role !== '导演' ? '<p class="fine">「待某岗位复核」只是本机待办：要生成交接包、对方导入后，对方才收到。</p>' : ''}</section>`;
  }

  /* ---------- ① 剧本 ---------- */
  function scriptCard() {
    const L = S.lit.lines; const dl = new Map(S.st.data.literary.dialogue.map((d) => [d.line, d])); const changed = Object.keys(U.lit).length; const isCur = curCard() === 'script';
    const rows = L.map((t, i) => { const n = i + 1; const v = U.lit[n] != null ? U.lit[n] : t; const d = dl.get(n);
      return `<div class="ln ${d ? 'dl' : ''} ${U.lit[n] != null ? 'ch' : ''}"><span class="no">L${n}</span><div><div class="tx" contenteditable="${S.role === '导演' || S.role === '剧作' ? 'true' : 'false'}" data-ln="${n}" role="textbox" aria-label="第 ${n} 行">${esc(v)}</div>${U.lit[n] != null ? `<div class="fine"><del>${esc(t)}</del> → <ins>${esc(v)}</ins></div>` : ''}</div><span>${d ? '<span class="tag n">台词</span>' : ''}<button class="lnk add" data-act="req" data-ln="${n}">＋要求</button></span></div>`; }).join('');
    return `<section class="card ${isCur ? 'cur' : ''}" id="card-script" data-card="script"><h2>① 剧本<span class="ver">剧本第 ${S.lit.n} 版</span></h2>
      <p class="task">读一遍剧本。想改哪里，直接在字上改；没有要改的，点「剧本可以」。</p>
      ${S.role === '导演' || S.role === '剧作' ? '' : '<p class="fine">你的视角不能改剧本字；可以在下面「对剧本提要求」。</p>'}
      ${!changed ? `<div class="row" style="margin:0 0 12px"><button class="btn" data-primary data-act="done" data-k="script">剧本可以，下一步</button><span class="fine">要改哪一行，直接在下面字上改。</span></div>` : ''}
      ${props()}
      <div class="script" id="script">${rows}</div>
      ${channel('script', { ph: '对剧本提要求（不改字）：比如 L28 半步停再久一点', scope: 'scene', btn: '提交要求', label: '对剧本提要求', layers: true })}
      <div data-res="lit" tabindex="-1" aria-live="polite">${U.results.lit ? litResult() : ''}</div>
      <div class="row end" style="margin-top:14px">${changed ? `<button class="lnk" data-act="litDrop">放弃改动</button><button class="btn" data-primary data-act="litSubmit">确认提交（改了 ${changed} 行）</button>` : `<button class="lnk" data-act="direct">直接去复制提示词</button><button class="btn" data-primary data-act="done" data-k="script">剧本可以，下一步</button>`}</div>
      <p class="fine">英文台词：导演改英文即为新原文；只改中文时英文不自动翻译。台词行不能清空。团队提交的剧本修改只算提议，等导演定。</p></section>`;
  }
  function props() {
    const P = S.lit.req.filter((r) => r.status === '待导演定'); if (!P.length) return '';
    return `<div class="seg"><div class="h"><span class="tag y">剧本修改提议 ${P.length} 条，等导演定</span></div>${P.map((r) => `<div><b>${esc(ROLE_LABEL[r.by] || r.by)}</b>（${esc(r.time)}）改 ${r.imp.changed.length} 行：${r.imp.changed.map((n) => `<div class="fine">L${n}：<del>${esc(S.lit.lines[n - 1])}</del> → <ins>${esc(r.lines[n - 1])}</ins></div>`).join('')}${S.role === '导演' ? `<div class="row"><button class="btn" data-act="lp" data-id="${r.id}" data-sig="${E4.litSig(r)}" data-ok="1">接受</button><button class="lnk" data-act="lp" data-id="${r.id}" data-sig="${E4.litSig(r)}" data-ok="0">拒绝</button></div>` : ''}</div>`).join('')}</div>`;
  }
  function litResult() {
    const r = U.results.lit; if (r.none) return '<section class="res"><div class="l"><b>你改了</b><div class="t1">没有改动</div></div></section>';
    const imp = r.imp; const segs = imp.segs;
    return `<section class="res" aria-label="结果卡"><div class="l"><b>你改了</b><div><span class="t1">${r.proposal ? '已存为提议，等导演定（没生效）' : '剧本第 ' + r.n + ' 版已生效' + (segs.some((g) => S.lit.sync[g]) ? '；拍法还没跟上' : '；拍法已同步')}</span><div class="fine">改了 ${imp.changed.map((n) => 'L' + n).join('、')}</div></div></div>
      <div class="l"><b>影响</b><div>${imp.shots.map((x) => `<button class="lnk" data-act="shot" data-sid="${x}">${shotN(x)}</button>`).join('') || '没有对应镜头'}｜${segs.map((g) => segN(g)).join('、') || '—'}${imp.tailHit ? '｜<span class="warn">碰到场尾，会影响末场卡</span>' : ''}</div></div>
      <div class="l"><b>还差</b><div><ul>${segs.map((g) => S.lit.sync[g] ? `<li>${segN(g)}：剧本已更新，拍法还没跟上 <button class="lnk" data-act="sync" data-gid="${g}">拍法不用改</button></li>` : `<li>${segN(g)}：拍法已同步</li>`).join('')}${imp.enLines.length ? '<li class="warn">改到了英文台词行：新英文即原文，复制前会逐字核对</li>' : ''}${imp.dlgLines.length && !imp.enLines.length ? '<li class="warn">只改了中文台词：英文要不要跟着改？</li>' : ''}${imp.state.length ? '<li class="warn">碰到伤、物件或状态词：需要人看一眼</li>' : ''}</ul></div></div>
      <div class="l"><b>你要做</b><div>${r.proposal ? '不用做（等导演定）' : (segs.some((g) => S.lit.sync[g]) ? '去各段确认拍法；确认前结果卡不会写「更新好了」' : '不用做')}</div></div></section>`;
  }

  /* ---------- ② 定方向＋待拍板 ---------- */
  function dirCard() {
    const D = S.st.data.scene.diagnosis; const ops = D.options; const ch = S.confirm.dir; const isCur = curCard() === 'dir'; const A = ops.find((o) => o.recommended) || ops[0];
    const dims = [['要不要改文学', { A: '不改（诊 L75、77）', B: '要改，需导演批（诊 L75–78）', C: '要加新事实，需导演批（诊 L75–76）' }, '原文事实'],
      ['全场时长', { A: '约 125–130 秒（诊 L79）', B: '约 110–115 秒', C: '约 130–135 秒' }, '岗位估算'],
      ['改完能不能念完、每段是否 ≤30″', { A: '无依据，不打分（还没有重排后的逐镜表）', B: '无依据，不打分', C: '无依据，不打分' }, '—'],
      ['观众更懂多少', { A: '无依据，不打分（医生 L97、103 认为拍法解决不了协议指向，待核原件）', B: '无依据，不打分（观众冷读 L47–57：这段投入下降）', C: '无依据，不打分（诊 L47 与医 L35–39 意见相反，并列）' }, '岗位判断'],
      ['代价', { A: '把太挤的两镜各拆成两镜，新镜数待重排', B: '世界质感变薄；机械犬伏笔变弱', C: '新事实，容易变直白，提前透出后场揭示' }, '岗位判断']];
    return `<section class="card ${isCur ? 'cur' : ''}" id="card-dir" data-card="dir"><h2>② 定方向</h2>
      <p class="task">${esc(TASK.dir())}</p>
      <h3>决定什么：这场戏太挤的地方怎么处理</h3>
      <p><b>推荐：A　不改文学，把太挤的两镜各拆成两镜，重排时长</b> <span class="tag p">总监代选｜待导演确认</span></p>
      <p><b>为什么：</b>A 是唯一不改文学的方向，并且针对第 14、26 镜已报告的拥挤问题（诊 L75–79）。</p>
      <p><b>代价：</b>新镜数待重排（旧镜数「35→37–38」的基数有误，诊 L78）。</p>
      <p><b>必须保留：</b>${A.mustKeep.map(esc).join('；')}</p>
      <details><summary>展开：三个方向逐项比较（不出分数，只写结论、依据性质和出处）▸</summary>
      <table><thead><tr><th>维度</th><th>A 只改拍法</th><th>B 中段压缩</th><th>C 补「协议作者」证据</th><th>依据性质</th></tr></thead><tbody>${dims.map(([k, v, e]) => `<tr><td>${k}</td><td>${v.A}</td><td>${v.B}</td><td>${v.C}</td><td>${e}</td></tr>`).join('')}</tbody></table>
      <p class="fine">出处：剧作诊断 652df4cb（待核原件）。</p></details>
      ${ch ? `<p class="ok">✓ 导演已选 ${esc(ch.option)}（${esc(ch.time)}）</p>` : ''}
      <div class="row" style="margin-top:12px">${!ch ? `<button class="btn" data-primary data-act="dir" data-o="A">选 A（推荐）</button><button class="lnk" data-act="dir" data-o="B">选 B</button><button class="lnk" data-act="dir" data-o="C">选 C</button>` : `<button class="lnk" data-act="done" data-k="dir">下一步</button>`}</div>
      ${channel('dir', { ph: '我想调整：比如 A 但第 26 镜不拆', scope: 'scene', layers: false })}
      <h3 id="card-decide">待导演拍板（其余 ${Object.keys(S.decisions).length} 项）</h3>
      <table><tbody>${Object.entries(S.decisions).map(([k, d]) => `<tr><td>${esc(d.title)}</td><td>${esc(d.value || '还没选')}</td><td><span class="tag ${d.mark === '导演已定' ? 'g' : 'p'}">${esc(d.mark)}</span></td><td>${S.role === '导演' && d.mark !== '导演已定' && d.value ? `<button class="lnk" data-act="decide" data-k="${k}">确认这条</button>` : ''}${(k === 'glass' || k === 'arm') && d.mark !== '导演已定' ? (S.role === '导演' ? ((S.extra.conflicts.find((c) => c.id === k.toUpperCase()) || { options: [] }).options.map((o) => `<button class="lnk" data-act="decide" data-k="${k}" data-v="${o.id}">选 ${o.id}</button>`).join(' ') + ' <button class="lnk" data-act="goto" data-go="next">看各选项得失</button>') : '<button class="lnk" data-act="goto" data-go="next">看选项</button>') : ''}</td></tr>`).join('')}</tbody></table></section>`;
  }

  /* ---------- 岗位面板（整场 / 段） ---------- */
  const CREWS = ['导演', '美术', '摄影', '灯光', '表演'];
  const FZ = { 无: '不加柔光', '1/8': '1/8 黑柔', '1/4': '1/4 黑柔' };
  /* 八层表取值：给 gid 时按该段生效值；不给时读整场设置，并列出与整场不同的段 */
  const lv = (f, gid, fmt) => { if (gid) return fmt(E4.valSeg(S, f, gid)); const sc = S.layers.scene[f] !== undefined ? S.layers.scene[f] : R.fields[f].cur; const diff = S.st.data.groups.filter((g) => E4.valSeg(S, f, g.id) !== sc).map((g) => segN(g.id) + ' ' + fmt(E4.valSeg(S, f, g.id))); return fmt(sc) + (diff.length ? '（分段不同：' + diff.join('，') + '）' : ''); };
  const LAYERS8f = (gid) => { const groups = S.st.data.groups; const fz = lv('camera.filter', gid, (v) => FZ[v] || v || '1/8 黑柔'); const rt = lv('light.ratio', gid, (v) => v || '1:8'); return [['摄影', '宽银幕、复古变形镜头、' + fz + '；焦段 24–50mm（等效）', '数 scene.optics；视听补数', '代填值待摄影确认'], ['灯光', '低调光约 ' + rt + '，冷青逆光约 6000K，体积雨，红扫描按镜', '数 scene.lighting', '—'], ['表演与情绪', '逃时喘急，被捕后收住，L153 不再找出口', '文 L153', '每镜情绪档是岗位判断'], ['场内', '工具包、VISTA 模块、儿童机械手、凝胶、胶带的散落与收缴', '文 L120–121、L160–166、L182–184', '胶带形态没写'], ['场外环境', '黑雨持续；机械臂、施工机器人、运输机械作业；回收队搜查', '文 L13、L196、L199', '施工机器人数量没写；资产没登记'], ['声音氛围', '雨声、城市底盘低鸣贯穿；计时器、电磁棍、引擎按镜', '数 shots[].sound', '归属暂挂美术（待导演确认）'], ['规则与压迫', '机位留在伊侧不越轴；屏幕字一律后期叠加', '数 rules', '—'], ['节奏与分镜逻辑', groups.map((g) => g.rhythm.split('（')[0]).join('｜'), '数 groups[].rhythm', '各段时长：' + groups.map((g) => segN(g.id) + ' ' + WB.groupSec(S.st, g) + '″').join('、')]]; };
  function tierRow(field, scope, gid, label) {
    const F = R.fields[field]; let ids = gid ? WB.group(S.st, gid).shots.slice() : S.st.data.shots.map((x) => x.id); if (F.match) { const m = E4.fieldShots(S, field, ids); if (m.length) ids = m; }
    const vs = [...new Set(ids.map((id) => E4.val(S, field, id).v))]; const mixed = vs.length > 1; // 按范围内的生效值；不一致时选中该范围自身的设置，并标出有局部另设
    let cur = field === 'perf.intensity' ? null : !mixed ? vs[0] : gid ? E4.valSeg(S, field, gid) : (S.layers.scene[field] !== undefined ? S.layers.scene[field] : F.cur); const nameOf = (t) => (field === 'env.rain' ? ({ '-1': '小一档', '0': '现在（W2，档名待核）', '+1': '大一档', '+2': '大两档' })[t] : t + (F.unit && !/^\+|^0$/.test(t) ? '' : ''));
    return `<div class="opts"><span class="lab">${esc(label || F.label)}：</span>${F.tiers.map((t) => `<button type="button" class="chip" data-act="tier" data-f="${field}" data-v="${esc(t)}" data-scope="${scope}" data-gid="${gid || ''}" aria-pressed="${String(cur) === t}">${esc(nameOf(t))}</button>`).join('')}${cur == null ? '<span class="fine">当前没写，无依据</span>' : ''}${mixed && field !== 'perf.intensity' ? '<span class="fine">（' + (gid ? '本段有镜另设' : '有段或镜另设') + '：' + esc(vs.join('／')) + '）</span>' : ''}</div>`;
  }
  function crewBlock(c, scope, gid) {
    const mine = S.role === '导演' || S.role === '统筹' || S.role === c; const g = gid ? WB.group(S.st, gid) : null; const L = ROLE_LABEL[c];
    const sc = S.st.data.scene;
    const SAY = {
      导演: ['逃的时候镜头跟着跑，被抓以后镜头不动，冷冷地看。', '数 scene.camera.rig「手持（逃段）／固定（被捕后）」；风格标签 T-D1「冷制度压迫」'],
      美术: ['黑雨一直在敲铁皮；背景里机械臂、施工机器人还在干活；回收队分头搜查。声音（暂挂这里）：雨声和城市底盘低鸣贯穿。', '文 L13、L196、L199；声音归属：总监代选｜待导演确认'],
      摄影: ['宽银幕，画面像隔着雨看；远处灯点被拉成竖着的椭圆，逆光入画时才有青色横向细线。', '数 scene.optics.line；视听补数 71fdc3ad'],
      灯光: ['整体很暗，只有被雨打湿的肩膀和雨丝发亮；红色扫描光要到第 2 段才照到人。', '数 scene.lighting（低调光、约 1:8、冷青约 6000K）；G1.lighting'],
      表演: ['逃的时候喘、急；被抓以后收住。他不再找出口，是全场的转折。', '文 L153；表演设计建议（总监代选｜待导演确认）'],
    };
    if (g) {
      const ac = (g.acting && g.acting.chars && g.acting.chars['伊莱亚斯']) || {};
      SAY.导演 = [`这段的节奏：${g.rhythm}。`, '数 groups.' + gid + '.rhythm'];
      SAY.表演 = [`伊莱亚斯想${ac.objective || '—'}；${ac.subtext ? '底下是：' + ac.subtext : ''}`, '表演设计建议（总监代选｜待导演确认）'];
      SAY.灯光 = [g.lighting && g.lighting.summary ? g.lighting.summary + '。' : '沿用整场：很暗，冷青逆光，红色扫描光按镜出现。', g.lighting && g.lighting.summary ? '数 groups.' + gid + '.lighting' : '继承自整场'];
      SAY.摄影 = [`这段光学：${E4.mval(S, 'vignette', gid) ? ({ 'light vignette': '轻暗角', 'medium vignette': '中等暗角', 'light-to-medium vignette': '轻到中暗角' })[E4.mval(S, 'vignette', gid)] || '暗角按镜' : ''}；焦段 ${[...new Set(g.shots.map((x) => WB.shot(S.st, x).focal.eq))].join('／')}mm（等效）。`, '视听补数 71fdc3ad ' + gid];
      SAY.美术 = ['这段在：' + (gid === 'G1' ? '废料堆通路，出口在前方两座钢架之间' : '出口前区（新平面图待生成）') + '；节拍：' + g.beat + '。', '数 groups.' + gid + '.beat；视听补数 ③'];
    }
    if (!mine) return `<div class="crew mini"><span class="nm">${L}</span> ${esc(SAY[c][0].slice(0, 30))}…（只有${L}和导演能改这一栏）</div>`;
    const key = 'crew-' + c + '-' + (gid || 'scene');
    let opts = '';
    if (c === '导演') opts = tierRow('rhythm.pause', scope, gid, '停顿') + `<div class="fine">每镜平均时长：现在 ${Math.min(...S.st.data.shots.map((s) => s.duration))}–${Math.max(...S.st.data.shots.map((s) => s.duration))}″（放慢或加快在下面写，每档 0.5″）</div>`;
    if (c === '美术') opts = tierRow('env.rain', scope, gid, '雨势') + tierRow('env.fog', scope, gid, '雾') + tierRow('env.robots', scope, gid, '背景施工机器人') + tierRow('env.amplitude', scope, gid, '背景机械动作幅度') + tierRow('sound.ambience', scope, gid, '环境声');
    if (c === '摄影') opts = tierRow('camera.filter', scope, gid, '柔光滤镜') + tierRow('camera.move', scope, gid, '运镜速度') + mountTable(gid || 'G1', !gid);
    if (c === '灯光') opts = tierRow('light.exposure', scope, gid, '整个画面的亮度') + tierRow('light.ratio', scope, gid, '亮处和暗处的差别') + `<div class="fine">雨里的光（体积雨）跟着雨势走，现在：${esc((() => { const ids = g ? g.shots : S.st.data.shots.map((x) => x.id); const vs = [...new Set(ids.map((id) => E4.val(S, 'light.rainVolume', id).v))]; if (vs.length === 1) return vs[0]; const by = {}; ids.forEach((id) => { const v = E4.val(S, 'light.rainVolume', id).v; (by[v] = by[v] || []).push(+id.slice(5)); }); return Object.entries(by).map(([v, n]) => v + '（第 ' + n.join('、') + ' 镜）').join('；'); })())}。红光上脸的镜：${S.st.data.shots.filter((s) => (s.lighting.l3path || []).some((x) => x.onFace)).map((s) => shotN(s.id)).join('、')}（剧本写的）</div>`;
    if (c === '表演') opts = `<div class="opts"><span class="lab">情绪表达：</span>克制 · 中 · 外放（每镜当前档在镜卡里；在下面写「更克制」或在镜卡上改）</div><div class="fine">两人距离：${gid ? (S.av && S.av.maps[gid] && S.av.maps[gid].dist ? S.av.maps[gid].dist.map((d) => d[2]).join('；') : '无依据') : '第 1 段约 4m（文 L26）'}</div>`;
    return `<div class="crew"><div class="hd"><span class="nm">${L}</span><span class="say">${esc(SAY[c][0])}</span></div>
      <details><summary>依据 ▸</summary><p class="fine">${esc(SAY[c][1])}</p></details>${opts}
      ${channel(key, { ph: '我想调整：' + ({ 导演: '比如第 6 镜停顿再长一点', 美术: '比如雨再大一点，施工机器人多一些', 摄影: '比如滤镜柔一点', 灯光: '比如光太亮', 表演: '比如对视时更克制' })[c], scope, gid, crew: S.role === '导演' ? c : S.role, entry: 'crew' })}</div>`;
  }
  function mountTable(gid, all) {
    const M = S.extra.mount; const gids = all ? S.st.data.groups.map((g) => g.id) : [gid];
    const rows = E4.MOUNT_KEYS.map((k) => { const v = E4.mval(S, k, gid); const mk = E4.mmark(S, k, gid); return `<tr><td>${esc(E4.MOUNT_LABEL[k])}</td><td>${v ? '<span class="tag g">已写进正文</span>' : '<span class="tag r">缺，复制被拦</span>'} <span class="tag ${/代选|代填|待/.test(mk) ? 'y' : 'n'}">${esc(mk)}</span><details><summary>原文 ▸</summary><div class="en">${esc(v)}</div><p class="fine">来源：${esc(M[k].src)}</p></details></td></tr>`; }).join('');
    const okAll = gids.every((g) => E4.compile(S, g).mount.ok);
    return `<h3>固定挂载项（每段提示词正文都写进去）</h3><p>${okAll ? '<span class="ok">✓ ' + (all ? '5 段' : segN(gid)) + '的挂载项都已写进正文</span>' : '<span class="bad">有挂载项没写进正文，复制被拦</span>'}　${S.confirm.mount && S.confirm.mount.hash === E4.mountHash(S) ? '<span class="tag g">' + esc(ROLE_LABEL[S.confirm.mount.by]) + '已确认（' + esc(S.confirm.mount.time) + '）</span>' : S.confirm.mount ? '<span class="tag y">确认已失效：挂载值后来改过，要重新确认</span>' : '<span class="tag y">视听补数代填，待摄影确认</span>'}</p>
      ${all ? '<p class="fine">下表是第 1 段；每段的触发项不同，在逐段里看。</p>' : ''}<details><summary>专业参数 ▸</summary><table class="mt"><tbody>${rows}</tbody></table></details>
      ${(S.role === '摄影' || S.role === '导演') && (!S.confirm.mount || S.confirm.mount.hash !== E4.mountHash(S)) ? '<button class="lnk" data-act="mount">' + (S.confirm.mount ? '重新确认这些值' : '摄影确认这些值') + '</button>' : ''}`;
  }
  function sceneCard() {
    const isCur = curCard() === 'scene'; const groups = S.st.data.groups;
    const layers8 = LAYERS8f();
    return `<section class="card ${isCur ? 'cur' : ''}" id="card-scene" data-card="scene"><h2>③ 整场</h2><p class="task">${esc(TASK.scene())}</p>
      ${CREWS.map((c) => crewBlock(c, 'scene', null)).join('')}
      <h3>节奏条</h3><div class="rbar">${groups.map((g) => `<div><b>${segN(g.id)}　${WB.groupSec(S.st, g)}″</b>${esc(g.rhythm.split('（')[0])}</div>`).join('')}</div>
      <h3>按内容层看（8 块：理解、依据、缺项）</h3><table><thead><tr><th>改哪一块</th><th>现在的理解</th><th>依据</th><th>缺什么</th></tr></thead><tbody>${layers8.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      ${fillBlock()}
      <h3>俯视图（第 1 段）</h3>${birdseyeAny('G1')}
      <div class="row end" style="margin-top:14px"><button class="btn" data-primary data-act="done" data-k="scene">整场可以，下一步</button></div></section>`;
  }

  /* ---------- ④ 逐段逐镜 ---------- */
  function searchBox(where) { return `<div class="search" role="search"><label for="q-${where}">找镜头</label><input type="text" id="q-${where}" data-search="${where}" placeholder="动作或镜号，比如「半步停」或 6"><div class="hits" data-hits="${where}"></div></div>`; }
  function shotsCard() {
    const isCur = curCard() === 'shots'; const g = WB.group(S.st, U.openSeg); E4.validShotConfirms(S);
    return `<section class="card ${isCur ? 'cur' : ''}" id="card-shots" data-card="shots"><h2>④ 逐段·逐镜</h2><p class="task">${esc(TASK.shots())}</p>${searchBox('shots')}
      <div class="segnav" role="group" aria-label="选段">${S.st.data.groups.map((x) => `<button class="chip" data-act="openSeg" data-gid="${x.id}" aria-pressed="${x.id === g.id}">${segN(x.id)}｜${WB.groupSec(S.st, x)}″｜${x.shots.filter((id) => S.confirm.shots[id] && !S.confirm.shots[id].stale).length}/${x.shots.length} 镜可以</button>`).join('')}</div>
      <h3>${segN(g.id)}｜${shotN(g.shots[0])}–${shotN(g.shots[g.shots.length - 1]).slice(1)}｜${WB.groupSec(S.st, g)} 秒｜${esc(g.beat)}</h3>
      ${CREWS.map((c) => crewBlock(c, 'seg', g.id)).join('')}
      ${segLayers(g)}
      <h3>俯视图</h3>${birdseyeAny(g.id)}
      <div class="shots">${g.shots.map((sid, i) => shotCard(sid, i, g)).join('')}</div>
      ${(() => { const c = S.confirm.sketch && S.confirm.sketch[g.id]; const ok = c && c.hash === E4.sketchHash(S, g.id); return `<p>${ok ? '<span class="tag g">' + esc(ROLE_LABEL[c.by]) + '确认过本段分镜草图</span>' : c ? '<span class="tag y">草图确认已失效：镜头数据改过</span>' : '<span class="tag y">本段分镜草图还没确认</span>'} ${(S.role === '导演' || S.role === '摄影') && !ok ? `<button class="lnk" data-act="skOk" data-gid="${g.id}">本段草图可以</button>` : ''}</p>`; })()}
      <div class="row end" style="margin-top:14px"><button class="btn" data-primary data-act="done" data-k="shots">逐镜看完，去出提示词</button></div></section>`;
  }
  function segLayers(g) {
    const rows = Object.entries(R.layers).map(([lk, L]) => { const fs = Object.keys(R.fields).filter((f) => R.fields[f].layer === lk);
      const ch = []; fs.forEach((f) => { const vals = [...new Set(g.shots.map((id) => { const v = E4.val(S, f, id); return v.from === '默认' ? null : v.v + '（' + v.from + '）'; }).filter(Boolean))]; if (vals.length) ch.push(R.fields[f].label + '：' + vals.join('／')); });
      const base = (LAYERS8f(g.id).find((r) => r[0] === L.name || L.name.startsWith(r[0])) || ['', '—', '—', '—']); const ids = g.shots.map((x) => x.slice(4)); const miss = (S.av.pending || []).filter((p) => !p.v && ids.some((c) => p.k.includes(c))).map((p) => p.k.split('（')[0]);
      return `<tr><td>${esc(L.name)}</td><td>${ch.length ? '<b>本段另设：</b>' + esc(ch.join('；')) : '沿用整场：' + esc(base[1])}</td><td>${esc(base[2])}</td><td>${esc([base[3]].concat(miss).filter((x) => x && x !== '—').join('；') || '—')}</td><td>${esc(ROLE_LABEL[L.crew])}</td></tr>`; }).join('');
    return `<h3>本段的内容层（理解、依据、缺项）</h3><table><thead><tr><th>哪一块</th><th>现在的理解</th><th>依据</th><th>缺什么</th><th>谁管</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function fillBlock() {
    const P = S.av.pending; const yes = P.filter((p) => p.v); const no = P.filter((p) => !p.v); const ok = S.confirm.fill && S.confirm.fill.all;
    return `<h3 id="card-fill">视听待定 ${P.length} 项：${yes.length} 项推导出了值，${no.length} 项没依据</h3>
      <p>${ok ? '<span class="tag g">已确认（' + esc(ROLE_LABEL[S.confirm.fill.all.by]) + '，' + esc(S.confirm.fill.all.time) + '）</span>' : '<span class="tag p">总监代填｜待视听确认</span>'}　没依据的不写进提示词，列在「还差什么」。</p>
      <details><summary>逐项看 ▸</summary><ol>${P.map((p) => `<li>${esc(p.k)}：${p.v ? esc(p.v) + ' <span class="tag p">总监代填｜待视听确认</span>' : '<span class="tag y">没依据，不写进提示词</span>'}${p.note ? ' <span class="fine">' + esc(p.note) + '</span>' : ''}</li>`).join('')}</ol></details>
      ${(S.role === '摄影' || S.role === '导演') && !ok ? '<button class="lnk" data-act="fill">这些推导值可以</button>' : ''}`;
  }
  function birdseyeAny(gid) {
    const m = S.av && S.av.maps[gid]; if (!m) return SVG4.birdseye(S, gid).html;
    const mc = S.confirm.maps && S.confirm.maps[gid]; const stale = mc && mc.hash !== E4.mapHash(S, gid); U.mapFocus = U.mapFocus || {}; const fc = U.mapFocus[gid] || null; const g = WB.group(S.st, gid);
    return `<div class="segnav" role="group" aria-label="只看一镜"><button class="chip" data-act="mapF" data-gid="${gid}" data-sid="" aria-pressed="${!fc}">全部</button>${g.shots.map((id) => `<button class="chip" data-act="mapF" data-gid="${gid}" data-sid="${id}" aria-pressed="${fc === id}">${+id.slice(5)}</button>`).join('')}</div>` + SVG4.avMap(S, gid, m, fc) + `<details><summary>放大看 ▸</summary><div style="overflow:auto"><div style="width:1600px">${SVG4.avMap(S, gid, m, fc)}</div></div></details>` + `<p>${mc && !stale ? '<span class="tag g">' + esc(ROLE_LABEL[mc.by]) + '确认过这张图</span>' : mc ? '<span class="tag y">确认已失效：镜头数据改过</span>' : '<span class="tag y">这张图还没确认</span>'} ${(S.role === '导演' || S.role === '摄影') && (!mc || stale) ? `<button class="lnk" data-act="mapOk" data-gid="${gid}">这张图可以</button>` : ''}</p>`;
  }
  function shotCard(sid, i, g) {
    const s = WB.shot(S.st, sid); const prev = g.shots[i - 1] || null; const next = g.shots[i + 1] || null; const c = S.confirm.shots[sid];
    const st = c && !c.stale ? ['g', '这镜可以'] : c && c.stale ? ['y', '确认已失效：镜头数据改过'] : ['y', '等导演点头'];
    const perf = E4.perfCur(S, sid); const ac = g.acting && g.acting.chars && g.acting.chars['伊莱亚斯'] && (g.acting.chars['伊莱亚斯'].beats || []).find((b) => b.shot === sid);
    const lit = s.literary && s.literary.lines; const av = s.av || {};
    const crew = [['导演', `${s.duration}″；${s.move.raw || s.move.primary}`], ['摄影', `${s.position.size || (((s.position.raw || '').match(/大远景|大全|远景|全景|中全|中近|近中|中景|近景|特写/) || [])[0] ? ((s.position.raw || '').match(/大远景|大全|远景|全景|中全|中近|近中|中景|近景|特写/))[0] + '*' : '景别没写')}，等效 ${s.focal.eq}mm${av.actual ? '（实际 ' + av.actual + 'mm）' : ''}，${s.aperture.value || '—'}，机高 ${s.position.height != null ? s.position.height + (s.position.heightTo ? '→' + s.position.heightTo : '') + 'm' : '—'}`], ['灯光', s.lighting.summary || '沿用本段'], ['表演', (ac ? ac.v : firstSentence(s.performance.raw, 28)) + '（情绪：' + (perf || '无依据') + '）'], ['美术', s.assets.map((a) => a.id).filter((x, j, A) => A.indexOf(x) === j).join('、')]];
    const msg = U.shotMsg[sid];
    return `<article class="shot ${U.hl === sid ? 'hl' : ''}" id="shot-${sid}"><div class="h"><b>${shotN(sid)}</b><span class="fine">${esc(sid)}</span><span class="tag ${st[0]}">${st[1]}</span></div>
      ${SVG4.sketch(S, sid)}${s.position.size ? '' : '<p class="fine">信息条里带 * 的景别是从镜头描述里摘出来的（数据里没写景别）。</p>'}
      <dl><dt>看到什么</dt><dd>${esc(firstSentence(s.performance.raw, 60))}</dd>${(() => { const adj = Object.keys(R.fields).map((f) => [f, E4.val(S, f, sid)]).filter(([, v]) => v.from !== '默认').map(([f, v]) => R.fields[f].label + ' ' + v.v + '（' + v.from + '）'); return adj.length ? `<dt>现在的调整</dt><dd>${esc(adj.join('；'))}（已写进本段提示词）</dd>` : ''; })()}
      <dt>为什么</dt><dd>${lit ? `文 L${lit[0]}${lit[1] !== lit[0] ? '–' + lit[1] : ''}：${esc(firstSentence(S.lit.lines[lit[0] - 1], 40))}` : '—'}</dd>
      ${crew.filter(([k]) => S.role === '导演' || S.role === '统筹' || S.role === '剧作' || S.role === k).map(([k, v]) => `<dt>${ROLE_LABEL[k]}</dt><dd>${esc(v)}</dd>`).join('')}
      ${s.dialogue.length ? `<dt>台词</dt><dd>${s.dialogue.map((d) => `<div class="en">${esc(d.en)}</div><div class="fine">${esc(d.zh)}（${esc(d.speaker)}）${d.t1 > s.duration + 0.05 ? ' <span class="tag y">估算可能念不完，要试听</span>' : ''}</div>`).join('')}</dd>` : ''}
      <dt>声音</dt><dd>${esc(s.sound || '—')}</dd>
      <dt>接上镜</dt><dd>${prev ? shotN(prev) + '：' + esc(firstSentence(WB.shot(S.st, prev).performance.raw, 24)) : (g.bridge ? '段首：' + esc(firstSentence(g.firstFrame && g.firstFrame.desc, 30)) : '—')}</dd>
      <dt>交下镜</dt><dd>${next ? shotN(next) + '：' + esc(firstSentence(WB.shot(S.st, next).performance.raw, 24)) : '段尾：' + esc(firstSentence(g.bridge, 30))}</dd></dl>
      <div class="row">${S.role !== '导演' ? '<span class="fine">「这镜可以」由导演点；你可以在下面写调整，会转成建议。</span>' : c && !c.stale ? `<button class="lnk" data-act="shotOk" data-sid="${sid}" data-on="0">撤回确认</button>` : `<button class="btn" ${U.hl === sid ? 'data-primary' : ''} data-act="shotOk" data-sid="${sid}" data-on="1">这镜可以</button>`}<details><summary>我想调整</summary>${channel('shot-' + sid, { ph: '比如这一镜停顿再长一点', scope: 'shot', gid: g.id, sid, layers: true })}</details></div>
      ${msg ? `<p class="ok" role="status">${esc(msg)}</p>` : ''}</article>`;
  }

  /* ---------- ⑤ 出提示词／看片 ---------- */
  function pendingZone() {
    const P = S.pending.filter((p) => p.status === '待导演确认'); if (!P.length) return '';
    return `<div class="pend" id="card-pending"><h3 style="margin-top:0">等导演确认的改动（${P.length} 组；没进可复制的正文）</h3>${P.map((p) => `<div style="margin:10px 0"><b>${esc(p.label)}</b><ul>${p.items.map((it) => `<li>${esc(it.guard ? it.guard + '：「' + it.src + '」' : (R.fields[it.field] ? R.fields[it.field].label + ' → ' + it.value : it.src))}${it.shots && it.shots.length ? '｜' + it.shots.map(shotN).join('、') : ''}${it.endCard ? '｜和末场卡「天气」一起' : ''}<div class="fine">${esc(it.why || '')}${it.note ? '　' + esc(it.note) : ''}</div></li>`).join('')}</ul>
      ${S.role === '导演' ? `<button class="btn" data-act="pend" data-pid="${p.id}" data-ok="1">确认这组（一起应用）</button> <button class="lnk" data-act="pend" data-pid="${p.id}" data-ok="0">整组撤回</button>` : '<span class="fine">等导演确认</span>'}</div>`).join('')}</div>`;
  }
  function promptCard() {
    return `<section class="card" id="card-prompt" data-card="prompt"><h2>⑤ 出提示词／看片</h2><p class="task">${esc(TASK.prompt())}</p>${searchBox('prompt')}${pendingZone()}
      ${S.st.data.groups.map((g) => segCard(g)).join('')}</section>`;
  }
  function segCard(g) {
    const gid = g.id; const rd = E4.ready(S, gid); const V = S.ver[gid]; const key = 'fb-' + gid; const isCur = curCard() === 'seg-' + gid; const cp = U.copied[gid] && U.copied[gid].sha === V.sha ? U.copied[gid] : null; /* 复制回执绑定正文哈希：正文换了（导入、恢复、重放）回执自动失效 */ const un = E4.unresolved(S, gid);
    const shotsTxt = shotN(g.shots[0]) + '–' + (+g.shots[g.shots.length - 1].slice(5)) + ' 镜';
    const hasDraft = (U.drafts[key] || '').trim();
    const copyBtn = rd.blocked ? `<button class="btn" ${isCur && !hasDraft ? 'data-primary' : ''} data-act="goto" data-go="mount">去补齐</button>` : `<button class="btn" ${hasDraft ? '' : 'data-primary'} data-act="copy" data-gid="${gid}" id="copy-${gid}">复制这段提示词</button>`;
    return `<div class="seg ${isCur ? 'cur' : ''}" id="card-seg-${gid}" data-card="seg-${gid}"><div class="h">${segN(gid)}｜${shotsTxt}｜${WB.groupSec(S.st, g)} 秒｜第 ${V.n} 版</div>
      <div class="ready"><span class="tag ${rd.color === '红' ? 'r' : rd.color === '黄' ? 'y' : 'g'}">${rd.color === '红' ? '不能复制' : rd.color === '黄' ? '能试生成' : '能正式出片'}</span> ${esc(rd.line)}${rd.why.length && !rd.blocked ? ` <details style="display:inline"><summary>▸</summary><ul>${rd.why.map((w) => `<li>${esc(w.t)} <button class="lnk" data-act="goto" data-go="${w.go}">去看</button></li>`).join('')}</ul></details>` : ''}</div>
      <div class="row">${copyBtn}${cp ? `<span class="copied" role="status">✓ 已复制第 ${cp.n} 版，共 ${cp.chars.toLocaleString()} 字。去模型网站粘贴即可。</span>` : ''}</div>
      <p class="fine">复制这段文字，去生成视频的网站粘贴${hasDraft ? `｜复制的是第 ${V.n} 版，不含反馈框里的草稿` : ''}</p>
      <div data-fallback="${gid}"></div>
      <p class="keep">当前可复制：第 ${V.n} 版｜${un ? `还有 ${un} 条反馈没落实 <button class="lnk" data-act="goto" data-go="hist">▸</button>` : '反馈都落实了'}</p>
      ${channel(key, { label: '看完视频，哪里不对？', ph: '看完视频，哪里不对？比如：第 3 秒太急，光太亮', scope: 'seg', gid, sec: true, scopeSel: true, btn: '提交并重新合成', entry: 'fb' })}
      <details><summary>看全文 ▸</summary><div class="diff">${esc(V.text)}</div></details>
      <details><summary>和上一版比 ▸</summary><div class="diff">${V.hist.length > 1 ? lineDiff(V.hist[V.hist.length - 2].text || V.hist[V.hist.length - 1].prevText || '', V.text) : '这是第 1 版'}</div></details>
      <details><summary>参考附件清单、后期屏幕字清单 ▸</summary>${refList(gid)}</details></div>`;
  }
  function lineDiff(a, b) { const A = new Set(a.split('\n')), B = new Set(b.split('\n')); const d = a.split('\n').filter((l) => l && !B.has(l)).map((l) => `<span class="d">− ${esc(l)}</span>`); const ad = b.split('\n').filter((l) => l && !A.has(l)).map((l) => `<span class="a">＋ ${esc(l)}</span>`); return d.concat(ad).join('\n') || '没有差别'; }
  function refList(gid) {
    const g = WB.group(S.st, gid); const ids = [...new Set(g.shots.flatMap((sid) => WB.shot(S.st, sid).assets.map((a) => a.id + '@' + a.state)))];
    const st = g.shots.flatMap((sid) => (WB.shot(S.st, sid).screenText || []).map((x) => [sid, x]));
    return `<p><b>参考附件：</b>没有任何已验收的参考图。本段要用：${ids.map((x) => esc(x) + '（缺）').join('、')}</p><p><b>后期屏幕字：</b>${st.length ? st.map(([sid, x]) => `${shotN(sid)}「${esc(x.en)}」`).join('；') : '本段没有'}（正文里只写空白发光屏）</p>`;
  }

  /* ---------- 本场结束时、下一场 ---------- */
  function compareTable() {
    const C = window.COMPARE_S04_S05 || []; if (!C.length) return ''; const col = { 接上了: 'g', 要确认: 'y', 冲突: 'r', 不用接: 'n' };
    const live = () => { const ids = new Set(); const st = { 已批: 0, 其他: 0 }; ['S04-C027', 'S04-C028', 'S04-C029', 'S04-C030', 'S04-C031', 'S04-C032', 'S04-C033'].forEach((sid) => (WB.shot(S.st, sid).assets || []).forEach((a) => { if (a.inFrame === false) return; const k = WB.gapKey(a); if (ids.has(k)) return; ids.add(k); if (WB.assetStatus(S.st, a).state === '已批') st.已批++; else st.其他++; })); return `场尾用到 ${ids.size} 件参考图：已批 ${st.已批} 件，未批 ${st.其他} 件（数参考清单，实时）`; };
    return `<h3>首尾状态比较（第 4 场场尾 ↔ 第 5 场开场，11 项）</h3><table><thead><tr><th>项</th><th>第 4 场场尾</th><th>证据</th><th>第 5 场开场</th><th>证据</th><th>状态</th></tr></thead><tbody>${C.map((r) => `<tr><td>${esc(r.f)}</td><td>${esc(r.live ? live() : r.s04)}</td><td>${esc(r.ev4)}</td><td>${esc(r.s05)}</td><td>${esc(r.ev5)}</td><td><span class="tag ${col[r.st] || 'n'}">${esc(r.st)}</span></td></tr>`).join('')}</tbody></table><p class="fine">只据原文整理；第 5 场是草稿。没写的写「原文没写（无依据）」，不补编。</p>`;
  }
  function endCard() {
    const E = S.extra.endCard;
    return `<section class="card" id="card-end" data-card="end"><h2>本场结束时</h2><p class="task">核对本场结束时留下了什么，签你那一项。</p>
      <table><thead><tr><th>类别</th><th>谁或什么</th><th>状态</th><th>证据</th><th>签字</th></tr></thead><tbody>${E.map((c) => { const k = c.who + c.state; const sg = S.confirm.sign[k]; const can = S.role === c.sign || S.role === '导演'; const w = c.field === 'weather' && S.endWeather ? '（雨势已按改动组改为当前档 ' + S.endWeather + '）' : '';
        return `<tr><td>${esc(c.cat)}</td><td>${esc(c.who)}</td><td>${esc(c.state + w)} ${c.st === '待补' ? '<span class="tag y">待补</span>' : ''}</td><td>${c.ev.map((n) => `<button class="lnk" data-act="line" data-ln="${n}">文 L${n}</button>`).join('')}</td><td>${sg && E4.signOk(S, k) ? `<span class="tag g">${esc(ROLE_LABEL[sg.by])}已签</span>` : sg ? `<span class="tag y">旧签失效：内容改过，待${esc(ROLE_LABEL[c.sign])}重签</span>` : `<span class="tag n">待${esc(ROLE_LABEL[c.sign])}签</span>`}${can && !E4.signOk(S, k) ? ` <button class="lnk" data-act="sign" data-k="${esc(k)}">签字</button>` : ''}</td></tr>`; }).join('')}</tbody></table>
      ${compareTable()}
      <p class="fine">数 sceneCard 写「由诺亚扶着离开」，与文 L194、L197（两人还没迈步）不符，以原文为准。</p><div data-lineview></div></section>`;
  }
  function nextCard() {
    const X = S.extra; const col = { 红: 'r', 黄: 'y', 绿: 'g', 灰: 'n' };
    return `<section class="card" id="card-next" data-card="next"><h2>下一场：第 5 场｜你只是一个型号</h2><p class="task">${esc(TASK.next())}</p>
      <p class="fine">来源：${esc(X.s05.src)}（草稿，不是定稿）。「后 L」是全片剧本提交本的行号。</p>
      <h3>接上了什么</h3><table><thead><tr><th>项</th><th>处理</th><th>状态</th><th>证据</th></tr></thead><tbody>${X.inherit.map((r) => `<tr><td>${esc(r.item)}</td><td>${esc(r.how)}${r.field === 'weather' && S.endWeather ? '（第 4 场场尾雨势已改，这里跟着更新）' : ''}</td><td><span class="tag ${col[r.color]}">${{ 红: '冲突', 黄: '要确认', 绿: '接上了', 灰: '不用接' }[r.color]}</span></td><td>${esc(r.ev)}</td></tr>`).join('')}</tbody></table>
      <h3>冲突（系统只报警、只列选项，不改剧本）</h3>${X.conflicts.map((c) => `<div class="seg"><div class="h"><span class="tag ${col[c.color]}">${c.color === '红' ? '冲突' : '待核'}</span> ${esc(c.title)}</div>${c.left ? `<div class="col2"><div><b>第 4 场 ${esc(c.left.ref)}</b><p>${esc(c.left.text)}</p></div><div><b>第 5 场 ${esc(c.right.ref)}</b><p>${esc(c.right.text)}</p></div></div>` : ''}<ol type="A">${c.options.map((o) => `<li>${esc(o.t)}${o.gain ? `<div class="fine">得：${esc(o.gain)}；失：${esc(o.loss)}</div>` : ''}${c.pick === o.id ? ' <span class="tag ' + (c.mark === '导演已定' ? 'g' : 'p') + '">' + esc(c.mark) + '</span>' : ''}${S.role === '导演' && c.mark !== '导演已定' && S.decisions[c.id.toLowerCase()] ? ` <button class="lnk" data-act="decide" data-k="${c.id.toLowerCase()}" data-v="${o.id}">${c.pick === o.id ? '确认这个' : '选这个'}</button>` : ''}</li>`).join('')}</ol>${c.note ? `<p class="fine">${esc(c.note)}</p>` : ''}${!c.pick ? `<p><span class="tag y">${esc(c.mark)}</span></p>` : ''}</div>`).join('')}
      <p class="fine">不报警：场间省略；幻象里的细雨（后 L718）；模块被收 ≠ 眼镜不在。模块与旧镜片 PR-03：暂用临时码，只作候选映射（CI-01 待核）。</p>
      <h3>第 5 场新写的状态（不冲突，但要记下）</h3><ul>${X.newStates.map(([t, e]) => `<li>${esc(t)}　<span class="fine">${esc(e)}</span></li>`).join('')}</ul>
      <h3 id="card-assets">还欠的参考图（逐件，共 ${X.assets.length} 件）</h3><table><thead><tr><th>#</th><th>要什么</th><th>身份码</th><th>首次用到（出处）</th><th>文件</th><th>能不能用</th><th>先要定的</th></tr></thead><tbody>${X.assets.map((a) => `<tr><td>${a.o}</td><td>${esc(a.need)}</td><td>${esc(a.ids)}</td><td>${esc(a.first || '—')}</td><td>${esc(a.file)}</td><td>${esc(a.res)}</td><td>${esc(a.pre)}</td></tr>`).join('')}</tbody></table><p class="fine">${esc(X.assetNote)}</p>
      <h3>原文（第 5 场草稿）</h3><details><summary>展开 81 行 ▸</summary><div class="script">${X.s05.lines.map((l) => `<div class="ln"><span class="no">后 L${l.n}</span><div class="tx">${esc(l.text)}</div><span></span></div>`).join('')}</div></details>
      <div class="row end" style="margin-top:14px"><button class="btn" data-primary data-act="done" data-k="next">看完了</button></div></section>`;
  }
  /* ---------- 页尾与后台 ---------- */
  function notIn() {
    return `<section class="card" id="card-notin"><h2>本版未含（如实说明）</h2><ul>
      <li>真生成回路（U5）：本版未含。复制提示词后去生成网站出视频、看片、回填反馈这一圈，没有在本机实测过。</li>
      <li>真人新人走查：本版未含。四步走查只用浏览器自动化代跑，不代表真人上手时间。</li>
      <li>风格标签联动：本版未含。改风格标签不会自动带动挂载、节奏、运镜。</li>
      <li>增量交接包：本版未含。现在只有完整交接包。</li>
      <li>新场次的人物、物件、状态自动识别后的人工整理：本版未含。第 4、5 场用的是预置映射。</li></ul>
      <p class="fine">按方案 §17，本版是内部检查点，不是可交付版。</p></section>`;
  }
  function foot() {
    return `<div class="foot" id="card-foot" data-card="foot"><label>交给 <select id="pkgTo">${ROLES.map((r) => `<option value="${r}" ${r === '导演' ? 'selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}</select></label>
      <button class="btn" data-act="export">保存交接包</button><label class="btn" for="pkgIn" tabindex="0">导入交接包</label><input type="file" id="pkgIn" accept=".json,application/json" class="sr" data-act="import">
      <button class="lnk" data-act="hist">项目资料与历史</button><a class="lnk" href="legacy.html">旧版界面（只读存档）</a></div>
      <div id="impView" aria-live="polite">${U.imp ? impView() : ''}</div><div id="hist"></div>`;
  }
  function impView() { try { return impView0(); } catch (e) { return '<div class="res"><div class="l"><b>导入预览</b><div class="bad">这个交接包读不出来（' + esc(String(e && e.message || e)) + '），不能导入</div></div></div>'; } }
  function impView0() { const p = U.imp; return `<div class="res"><div class="l"><b>导入预览</b><div>${esc(p.pv.msg)}；来自 ${esc(ROLE_LABEL[p.pkg.from] || String(p.pkg.from))}，给 ${esc(ROLE_LABEL[p.pkg.to] || '—')}；父版本 ${esc(p.pkg.baseSha)}</div></div>${(p.pv.ok && Array.isArray(p.pkg.todosFor) ? p.pkg.todosFor : []).length ? `<div class="l"><b>对方待办</b><div><ul>${p.pkg.todosFor.map((t) => `<li>${esc(t.t)}</li>`).join('')}</ul></div></div>` : ''}<div class="l"><b>你要做</b><div>${p.pv.ok ? `<button class="btn" data-primary data-act="impOk">${p.pv.conflict ? '仍然导入（覆盖本机工作版本）' : '确认导入'}</button> <button class="lnk" data-act="impNo">取消</button>` : '不能导入'}</div></div></div>`; }
  function histView() {
    const rows = S.fb.map((f) => `<tr><td>${f.id}</td><td>${esc(f.time)}</td><td>${esc(ROLE_LABEL[f.role] || f.role)}</td><td>${esc(f.text)}</td><td>${f.items.map((i) => esc(i.res) + (i.reviewed && !i.reviewed.ok ? '（' + esc(R.crews[i.review].label) + '不同意）' : '')).join('、')}${f.reverted ? '（已撤回）' : (S.role === '导演' || S.role === f.role ? ` <button class="lnk" data-act="revertH" data-fid="${f.id}">撤回这条</button>` : '')}</td></tr>`).join('');
    return `<section class="card" id="card-hist"><h2>项目资料与历史</h2>
      <h3>反馈记录</h3>${rows ? `<table><thead><tr><th>编号</th><th>时间</th><th>视角</th><th>原话</th><th>各项结论</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>还没有反馈。</p>'}
      <h3>各段版本</h3><table><tbody>${Object.entries(S.ver).map(([g, v]) => `<tr><td>${segN(g)}</td><td>${v.hist.map((h) => `第 ${h.n} 版 <span class="bk">${h.sha}</span> ${esc(h.reason)}`).join('<br>')}</td></tr>`).join('')}</tbody></table>
      <h3>视听补数合并记录（${S.avLog.length} 条）</h3><p class="fine">源：${esc(S.av.src.file)}（${S.av.src.sha8}）；数据底 ${esc(S.av.src.base)}（${S.av.src.baseSha8}）；未采用 ${esc(S.av.src.notUsed)}</p>
      <details><summary>6 条冲突裁决 ▸</summary><ol>${S.av.conflicts.map((c) => `<li>${esc(c.t)} <span class="tag p">${esc(c.mark)}</span></li>`).join('')}</ol></details>
      <details><summary>${S.av.pending.length} 项待定 ▸</summary><ol>${S.av.pending.map((p) => `<li>${esc(p.k)}：${p.v ? esc(p.v) + ' <span class="tag p">总监代填｜待视听确认</span>' : '<span class="tag y">没依据，不写进提示词</span>'}</li>`).join('')}</ol></details>
      <details><summary>逐项合并 ▸</summary><table><tbody>${S.avLog.map((l) => `<tr>${l.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>
      <h3>规则包</h3><p class="fine">rules/edit_rules_v1.json（${Object.keys(R.fields).length} 个字段；全部条目：总监代选｜待导演确认）。只用规则＋词库，不接大模型（总监代选｜待导演确认）。</p>
      <h3>操作日志</h3><div class="diff">${esc(S.journal.map((j) => JSON.stringify(j)).join('\n'))}</div></section>`;
  }

  /* ---------- 渲染 ---------- */
  function render(focusSel) {
    const y = window.scrollY; const ae = document.activeElement; const aeId = ae && ae.id;
    $('#app').innerHTML = top() + `<main>${prog()}${todoCard()}${scriptCard()}${dirCard()}${sceneCard()}${shotsCard()}${promptCard()}${endCard()}${nextCard()}${notIn()}${foot()}</main>`;
    applyPrimary();
    window.scrollTo(0, y);
    if (focusSel) { const el = $(focusSel); if (el) { el.focus({ preventScroll: false }); } } else if (aeId) { const el = document.getElementById(aeId); if (el) el.focus({ preventScroll: true }); }
    save();
  }
  function applyPrimary() {
    $$('.btn.primary').forEach((b) => b.classList.remove('primary'));
    const cur = curCard(); const host = $('[data-card="' + cur + '"]') || $('#card-' + cur);
    const cands = host ? $$('[data-primary]', host).filter((b) => !b.disabled) : [];
    const pick = cands.find((b) => b.closest('.res')) || cands.find((b) => b.dataset.act === 'submit') || cands[0];
    if (pick) pick.classList.add('primary');
  }
  const setCur = (k) => { U.cur = k; };
  const topH = () => { const t = document.querySelector('.top'); if (!t || getComputedStyle(t).position !== 'sticky') return 12; return t.getBoundingClientRect().height + 12; };
  const goto = (go) => {
    const map = { fill: 'card-fill', todo: 'card-todo', dir: 'card-dir', decide: 'card-decide', scene: 'card-scene', shots: 'card-shots', prompt: 'card-prompt', pending: 'card-pending', end: 'card-end', next: 'card-next', assets: 'card-assets', foot: 'card-foot', handoff: 'card-foot', hist: 'card-hist', script: 'card-script', sync: 'card-prompt', fb: 'card-prompt', review: 'card-todo', mount: 'card-scene', seg: 'card-shots', pick: 'card-prompt' };
    if (go === 'hist') { $('#hist').innerHTML = histView(); }
    if (['script', 'dir', 'scene', 'shots', 'prompt', 'next', 'end'].includes(go)) { setCur(go === 'prompt' ? 'seg-G1' : go); render(); }
    if (go.startsWith('seg-')) { setCur(go); render(); }
    const el = document.getElementById(map[go] || 'card-' + go); if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -topH()); el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  };
  async function doCopy(gid, btn) {
    const r = E4.copy(S, gid, { record: false }); if (!r.ok) { toast(r.msg); return; } window.__lastCopy = r.text;
    let ok = false; try { await navigator.clipboard.writeText(r.text); ok = true; } catch (e) { try { const ta = document.createElement('textarea'); ta.value = r.text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { ok = false; } }
    if (ok) { E4.copyRecord(S, gid, r); U.copied[gid] = { n: r.n, chars: r.chars, sha: S.ver[gid].sha }; } setCur('seg-' + gid); render('#copy-' + gid);
    if (!ok) { const fb = $('[data-fallback="' + gid + '"]'); const url = URL.createObjectURL(new Blob([r.text], { type: 'text/plain' })); fb.innerHTML = `<p class="bad">没复制成功（浏览器不让写剪贴板），不算已复制。请点下面全选后手动复制，或<a href="${url}" download="S04_${gid}_v${r.n}.txt">下载 .txt</a></p><textarea readonly style="min-height:160px">${esc(r.text)}</textarea>`; $('textarea', fb).select(); }
    else toast('✓ 已复制，共 ' + r.chars.toLocaleString() + ' 字。去模型网站粘贴即可。');
    window.__lastCopy = r.text;
  }
  function submitChan(key, o) {
    const ta = $('[data-draft="' + key + '"]'); const text = (ta ? ta.value : '').trim(); if (!text) return;
    const btn = $('[data-act="submit"][data-key="' + key + '"]'); const btnTxt = btn ? btn.textContent : '提交'; if (btn) { btn.disabled = true; btn.textContent = '正在更新……'; }
    const scopeSel = $('[data-scope="' + key + '"]'); const secIn = $('[data-sec="' + key + '"]');
    let t = text; if (secIn && secIn.value && !/第\s*\d/.test(t)) t = '第' + secIn.value + '秒' + t;
    const opt = Object.assign({}, o, { scope: scopeSel ? scopeSel.value : o.scope, layers: (U.drafts[key + ':layers'] || []).length ? U.drafts[key + ':layers'] : null });
    opt.crew = S.role; // 写入人＝当前视角；导演在岗位栏里写＝导演代改
    const t0 = performance.now(); let r; try { r = E4.submit(S, t, opt); } catch (e) { if (btn) { btn.disabled = false; btn.textContent = btnTxt; } toast('这句没能处理（' + (e && e.message || e) + '），没有改；反馈原话还在框里，请改写后再提交'); return; }
    U.results[key] = { fid: r.rec.id, diff: r.diff }; delete U.drafts[key]; delete U.drafts[key + ':sec']; delete U.drafts[key + ':layers']; delete U.drafts[key + ':scope'];
    setCur(o.gid && key.startsWith('fb-') ? 'seg-' + o.gid : U.cur); render('[data-res="' + key + '"]');
    U.results[key].ms = performance.now() - t0; const el = $('[data-res="' + key + '"]'); if (el) { el.innerHTML = resultCard(key); applyPrimary(); el.focus(); }
    window.__lastMs = U.results[key].ms;
  }
  function resolvePick(fid, key) {
    const box = $('[data-pick="' + fid + '"]'); const rec = S.fb.find((f) => f.id === fid); const choice = { picks: {} };
    choice.shots = {}; let missShot = false; (box ? [...box.querySelectorAll('[data-ps-items]')] : []).forEach((p) => { const c = p.querySelector('input:checked'); if (!c) { missShot = true; return; } p.dataset.psItems.split(',').forEach((i) => { choice.shots[+i] = c.value; }); });
    rec.items.forEach((it, i) => { const c = box && $('input[name="po-' + fid + '-' + i + '"]:checked', box); if (c) choice.picks[i] = it.options[+c.value]; });
    if (!Object.keys(choice.shots).length && !Object.keys(choice.picks).length) { toast('先选是哪一镜（至少选一组；没选的组继续待补选）'); return; }
    const t0 = performance.now(); const r = E4.resolve(S, fid, choice); U.results[key].diff = r.diff; render('[data-res="' + key + '"]'); U.results[key].ms = performance.now() - t0; const el = $('[data-res="' + key + '"]'); if (el) { el.innerHTML = resultCard(key); applyPrimary(); el.focus(); }
    window.__lastMs = U.results[key].ms;
  }
  function search(where, q) {
    const hits = $('[data-hits="' + where + '"]'); q = q.trim(); if (!q) { hits.innerHTML = ''; return; }
    const n = q.match(/^\D*(\d{1,2})\D*$/); const res = S.st.data.shots.filter((s) => (n && +s.id.slice(5) === +n[1]) || (s.performance.raw || '').includes(q) || (S.st.data.groups.find((g) => g.shots.includes(s.id)).acting || { chars: {} }) && JSON.stringify((S.st.data.groups.find((g) => g.shots.includes(s.id)).acting.chars['伊莱亚斯'] || {}).beats || []).includes(q) && JSON.stringify(((S.st.data.groups.find((g) => g.shots.includes(s.id)).acting.chars['伊莱亚斯'] || {}).beats || []).filter((b) => b.shot === s.id)).includes(q)).slice(0, 6);
    hits.innerHTML = res.length ? res.map((s) => `<button class="chip" data-act="shot" data-sid="${s.id}">${shotN(s.id)}（${segN(WB.groupOf(S.st, s.id).id)}）</button>`).join('') : '<span class="fine">没找到</span>';
  }
  function openShot(sid) { U.openSeg = WB.groupOf(S.st, sid).id; U.hl = sid; setCur('shots'); render(); const el = document.getElementById('shot-' + sid); if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -topH()); const b = $('[data-act="shotOk"]', el); if (b) b.focus({ preventScroll: true }); } }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', (e) => {
    const lb = e.target.closest('[data-lay]'); if (lb) { const k = lb.dataset.lay; const arr = U.drafts[k + ':layers'] = U.drafts[k + ':layers'] || []; const l = lb.dataset.l; const i = arr.indexOf(l); if (i >= 0) arr.splice(i, 1); else arr.push(l); lb.setAttribute('aria-pressed', String(i < 0)); save(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
    if (a === 'role' || a === 'import') return;
    if (b.tagName === 'A' && a === 'goto') e.preventDefault();
    const card = b.closest('[data-card]'); if (card && !['goto', 'direct', 'shot'].includes(a)) U.cur = card.dataset.card === 'todo' || card.dataset.card === 'foot' ? U.cur : card.dataset.card;
    if (a === 'goto') goto(b.dataset.go);
    if (a === 'direct') { U.cur = 'seg-G1'; render(); const el = $('#copy-G1') || $('#card-seg-G1'); el.scrollIntoView({ block: 'center' }); el.focus(); }
    if (a === 'done') { U.done[b.dataset.k] = true; const i = STEPS.findIndex(([k]) => k === b.dataset.k); const nx = STEPS.slice(i + 1).find(([k]) => !stepDone(k)); U.cur = nx ? (nx[0] === 'prompt' ? 'seg-G1' : nx[0]) : null; render(); goto(nx ? nx[0] : 'prompt'); }
    if (a === 'submit') submitChan(b.dataset.key, JSON.parse(b.dataset.o));
    if (a === 'resolve') resolvePick(b.dataset.fid, b.dataset.key);
    if (a === 'revertH') { const r = E4.revert(S, b.dataset.fid); if (r && r.ok === false) toast(r.msg); else { S.fb.forEach((f) => f.id === b.dataset.fid && f.items.forEach((it) => { it.dirSeen = true; })); toast('已撤回 ' + b.dataset.fid); } render(); $('#hist').innerHTML = histView(); return; }
    if (a === 'revert') { const r = E4.revert(S, b.dataset.fid); if (r && r.ok === false) { toast(r.msg); return; } if (U.results[b.dataset.key]) U.results[b.dataset.key].diff = r && r.diff; render('[data-res="' + b.dataset.key + '"]'); }
    if (a === 'copy') doCopy(b.dataset.gid, b);
    if (a === 'shot') openShot(b.dataset.sid);
    if (a === 'seg') { U.openSeg = b.dataset.gid; setCur('shots'); render(); goto('shots'); }
    if (a === 'openSeg') { U.openSeg = b.dataset.gid; U.hl = null; render(); }
    if (a === 'shotOk') { const on = b.dataset.on === '1'; const cr = E4.confirmShot(S, b.dataset.sid, on); if (!cr.ok) { toast(cr.msg); return; } U.shotMsg = {}; U.shotMsg[b.dataset.sid] = on ? `只确认了${shotN(b.dataset.sid)}，本段还没正式放行` : '已撤回确认'; render(); const el = document.getElementById('shot-' + b.dataset.sid); if (el) { const x = $('[role="status"]', el); el.scrollIntoView({ block: 'center' }); } }
    if (a === 'dir') { const r = E4.chooseDir(S, b.dataset.o); if (!r.ok) toast(r.msg); else { U.cur = 'scene'; render(); toast('✓ 已选 ' + b.dataset.o + '。下一步：整场'); } }
    if (a === 'decide') { const r = E4.decide(S, b.dataset.k, b.dataset.v); if (!r.ok) toast(r.msg); else toast('✓ 已定：' + S.decisions[b.dataset.k].value); render(); }
    if (a === 'review') { E4.review(S, b.dataset.fid, +b.dataset.i, b.dataset.ok === '1'); toast(b.dataset.ok === '1' ? '✓ 已同意' : '已记下不同意，导演会看到'); render(); }
    if (a === 'fill') { const r = E4.confirmFill(S); if (!r.ok) toast(r.msg); else toast('✓ 推导值已确认'); render(); }
    if (a === 'mapF') { U.mapFocus = U.mapFocus || {}; U.mapFocus[b.dataset.gid] = b.dataset.sid || null; render(); return; }
    if (a === 'skOk') { const r = E4.confirmSketch(S, b.dataset.gid); if (!r.ok) toast(r.msg); render(); return; }
    if (a === 'mapOk') { const r = E4.confirmMap(S, b.dataset.gid); if (!r.ok) toast(r.msg); render(); }
    if (a === 'tier') { const t0 = performance.now(); const o = { scope: b.dataset.scope, gid: b.dataset.gid || undefined }; const r = E4.setTier(S, b.dataset.f, b.dataset.v, o); const key = 'crew-' + R.layers[R.fields[b.dataset.f].layer].crew + '-' + (b.dataset.gid || 'scene'); U.results[key] = { fid: r.rec.id, diff: r.diff }; render(); U.results[key].ms = performance.now() - t0; const el = $('[data-res="' + key + '"]'); if (el) { el.innerHTML = resultCard(key); applyPrimary(); el.focus(); } }
    if (a === 'pend') { const r = E4.confirmPending(S, b.dataset.pid, b.dataset.ok === '1'); if (!r || r.ok === false) toast(r ? r.msg : '这组已处理过或找不到，没有改动'); else toast(b.dataset.ok === '1' ? '✓ 这组已一起应用' : '这组已整组撤回'); render(); }
    if (a === 'mount') { const r = E4.confirmMount(S); if (!r.ok) toast(r.msg); render(); }
    if (a === 'sign') { E4.sign(S, b.dataset.k, true); toast('✓ 已签字'); render(); }
    if (a === 'sync') { E4.syncDone(S, b.dataset.gid, '拍法不用改'); render(); }
    if (a === 'line') { const n = +b.dataset.ln; const v = $('[data-lineview]'); v.innerHTML = `<p class="res">文 L${n}：${esc(S.lit.lines[n - 1])}</p>`; }
    if (a === 'req') { const n = b.dataset.ln; U.drafts.script = 'L' + n + '：'; render('#ta-script'); const ta = $('#ta-script'); ta.setSelectionRange(ta.value.length, ta.value.length); }
    if (a === 'lay') {}
    if (a === 'forceOwn') { const r = E4.forceOwn(S, b.dataset.fid, +b.dataset.i); toast(r.ok ? '✓ 已一起改（' + r.r.rec.id + '）' : r.msg); render(); return; }
    if (a === 'sugg') { const r = E4.handleSugg(S, b.dataset.fid, +b.dataset.i, b.dataset.ok === '1'); toast(r.ok ? (b.dataset.ok === '1' ? '✓ 已采纳并改好（' + (r.r && r.r.rec.id) + '）' : '已记录：不采纳') : r.msg); render(); return; }
    if (a === 'useLocal') { if (!window.confirm('改回本机依赖会清掉本页现在的改动（交接包文件不受影响），继续？')) return; try { localStorage.removeItem(KEY); } catch (e) {} load(); render(); toast('已改回本机依赖'); return; }
    if (a === 'lp') { const r = E4.litDecide(S, b.dataset.id, b.dataset.ok === '1', b.dataset.sig); if (!r.ok) toast(r.msg); else { if (r.imp) U.results.lit = r; toast(b.dataset.ok === '1' ? '✓ 已接受，剧本升到第 ' + S.lit.n + ' 版' : '已拒绝这条提议'); } render(); return; }
    if (a === 'litDrop') { U.lit = {}; render(); }
    if (a === 'litSubmit') { const nl = S.lit.lines.slice(); Object.entries(U.lit).forEach(([n, t]) => { nl[n - 1] = t; }); const empty = Object.entries(U.lit).find(([n, t]) => !t.trim() && S.st.data.literary.dialogue.some((d) => d.line === +n || d.zhLine === +n)); if (empty) { toast('台词行不能清空'); return; } const r = E4.litSubmit(S, nl, S.role); U.results.lit = r; U.lit = {}; render('[data-res="lit"]'); }
    if (a === 'export') { const to = $('#pkgTo').value; const pkg = E4.exportPkg(S, 'full', to); const blob = new Blob([JSON.stringify(pkg, null, 1)], { type: 'application/json' }); const aEl = document.createElement('a'); aEl.href = URL.createObjectURL(blob); aEl.download = `S04_交接包_${ROLE_LABEL[S.role]}给${ROLE_LABEL[to]}_${pkg.journalSha}.json`.replace(/／/g, '-'); document.body.appendChild(aEl); aEl.click(); aEl.remove(); window.__lastPkg = pkg; toast('已生成交接包，请发给下一位（页面不会自动发送）'); }
    if (a === 'impOk') { const ir = E4.importApply(S, U.imp.pkg); if (!ir.ok) { toast(ir.msg); U.imp = null; render(); return; } if (ir.S) S = ir.S; if (U.imp.pkg.to) S.role = U.imp.pkg.to; U = Object.assign(defaultsU(), { done: U.done, openSeg: U.openSeg, drafts: U.drafts }); window.__lastCopy = null; /* 导入替换了整套状态：旧结果卡、差异和复制回执都属于旧状态，清掉 */ render(); goto('todo'); toast('✓ 已导入，待办已出现'); }
    if (a === 'impNo') { U.imp = null; render(); }
    if (a === 'hist') { $('#hist').innerHTML = histView(); goto('hist'); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.act === 'role') { S.role = t.value; U.cur = null; render('#who'); }
    if (t.dataset.act === 'import' && t.files[0]) { const fr = new FileReader(); fr.onload = () => { try { const pkg = JSON.parse(fr.result); U.imp = { pkg, pv: E4.importPreview(S, pkg) }; } catch (err) { U.imp = { pkg: {}, pv: { ok: false, msg: '文件读不了：不是工作台交接包' } }; } $('#impView').innerHTML = impView(); $('#impView').scrollIntoView({ block: 'center' }); }; fr.readAsText(t.files[0]); }
    if (t.dataset.sec) { U.drafts[t.dataset.sec + ':sec'] = t.value; save(); }
    if (t.dataset.scope && t.tagName === 'SELECT') { U.drafts[t.dataset.scope + ':scope'] = t.value; save(); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.draft) { const k = t.dataset.draft; const had = !!(U.drafts[k] || '').trim(); U.drafts[k] = t.value; const btn = $('[data-act="submit"][data-key="' + k + '"]'); if (btn) { btn.disabled = !t.value.trim(); if (t.value.trim()) btn.setAttribute('data-primary', ''); } const host = t.closest('[data-card]'); if (host) U.cur = host.dataset.card; if (had !== !!t.value.trim()) { const pos = t.selectionStart; render('#' + t.id); const n = document.getElementById(t.id); if (n) n.setSelectionRange(pos, pos); } else save(); }
    if (t.dataset.ln && t.isContentEditable) { const n = +t.dataset.ln; const v = t.textContent; if (v === S.lit.lines[n - 1]) delete U.lit[n]; else U.lit[n] = v; U.cur = 'script'; clearTimeout(t._r); t._r = setTimeout(() => { const sel = window.getSelection(); const off = sel.focusOffset; const s = $('#script').scrollTop; render(); $('#script').scrollTop = s; const n2 = $('[data-ln="' + n + '"]'); if (n2) { n2.focus(); try { const rg = document.createRange(); rg.setStart(n2.firstChild || n2, Math.min(off, (n2.firstChild || n2).length || 0)); rg.collapse(true); sel.removeAllRanges(); sel.addRange(rg); } catch (er) {} } }, 600); }
    if (t.dataset.search) search(t.dataset.search, t.value);
  });
  document.addEventListener('focusin', (e) => { const c = e.target.closest && e.target.closest('[data-card]'); if (c && e.target.matches('textarea,[contenteditable="true"]') && U.cur !== c.dataset.card) { U.cur = c.dataset.card; } });
  window.__WB4 = { get S() { return S; }, get U() { return U; }, render, reset: () => { localStorage.removeItem(KEY); load(); render(); } };
  load();
  if (/[?&]u0=1/.test(location.search)) { S.extra.mount.lens.en = ''; } // 反向用例 U0：去掉镜头型号，复制必须被拦
  render();
})();
