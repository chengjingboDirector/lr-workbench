/* 场次工作台 · 界面层（三）渲染、交互、启动 */
'use strict';
const MUTATING = new Set(['ack', 'ackConflict', 'lockShot', 'lockGroup', 'choose', 'confirmDir', 'clearDir', 'regClip', 'acc', 'accPass', 'prop', 'decide', 'toneSend', 'toneDel', 'dlgTime', 'fieldLock', 'thumb', 'closeCI', 'clearLastFrame', 'lintSign', 'lintUnsign', 'fitPlan', 'heard']);
function focusKey() { const a = document.activeElement; if (!a || a === document.body) return null; if (a.id) return '#' + a.id; if (a.dataset && a.dataset.act) return `[data-act="${a.dataset.act}"]` + (a.dataset.v != null ? `[data-v="${CSS.escape(a.dataset.v)}"]` : '') + (a.dataset.id != null ? `[data-id="${CSS.escape(a.dataset.id)}"]` : '') + (a.dataset.role != null ? `[data-role="${CSS.escape(a.dataset.role)}"]` : '') + (a.dataset.k != null ? `[data-k="${a.dataset.k}"]` : '') + (a.dataset.a != null ? `[data-a="${a.dataset.a}"]` : '') + (a.dataset.g != null ? `[data-g="${a.dataset.g}"]` : '') + (a.dataset.name != null ? `[data-name="${CSS.escape(a.dataset.name)}"]` : ''); if (a.dataset && a.dataset.dt) return `[data-dt="${a.dataset.dt}"]`; return null; }
function applyInert() {
  /* 窄屏抽屉式侧栏：收起时 inert，键盘 Tab 不会进入看不见的区域 */
  const w = window.innerWidth; const t = $('#tree'), sd = $('#side');
  const tOff = t.classList.contains('hide') || (w <= 820 && !t.classList.contains('open')); const sOff = sd.classList.contains('hide') || (w <= 1100 && !sd.classList.contains('open'));
  t.inert = tOff; sd.inert = sOff; t.setAttribute('aria-hidden', tOff); sd.setAttribute('aria-hidden', sOff);
  const dr = $('#drawer'); if (dr) { dr.inert = !UI.drawer; dr.setAttribute('aria-hidden', !UI.drawer); }
  /* 抽屉是模态对话框：打开时背景整体 inert（读屏与 Tab 都进不去），关闭后恢复 */
  const app = document.querySelector('.app'); if (app) app.inert = !!UI.drawer;
}
window.addEventListener('resize', () => applyInert());
function render() {
  const fk = focusKey(); const hadDrawer = !!document.querySelector('#drawer.open');
  if (!WB.unlocked(st) && UI.tab !== 'stage0') UI.tab = 'stage0';
  if (UI.finalMode && !FINAL_TABS.includes(UI.tab)) UI.tab = '导演';
  renderTop();
  const body = $('#body'); const noSide = ['stage0', 'queue', 'backend'].includes(UI.tab);
  body.className = 'body ' + (UI.tab === 'stage0' ? 'wide' : noSide ? 'no-side' : '');
  $('#tree').classList.toggle('hide', UI.tab === 'stage0'); $('#side').classList.toggle('hide', noSide);
  if (UI.tab !== 'stage0') renderTree(); if (!noSide) renderSide();
  const V = { stage0: viewStage0, 导演: viewDirector, 摄影: viewCamera, 剪辑: viewEdit, 美术: viewArt, 剧作: viewScript, prompt: viewPrompt, queue: viewQueue, backend: viewBackend }[UI.tab] || viewStage0;
  const withEdit = ['导演', '摄影', '剪辑', '美术', '剧作'].includes(UI.tab) && !UI.finalMode;
  $('#main').innerHTML = (withEdit ? editBar() : '') + V(); $('#main').setAttribute('aria-labelledby', 'tab-' + UI.tab);
  renderDrawer(); save(); applyInert();
  if (!UI.drawer && hadDrawer && UI.opener) { const o = UI.opener; UI.opener = null; try { const n = document.querySelector(o); if (n) { n.focus(); return; } } catch (e) { /* 忽略 */ } }
  if (UI.drawer && !hadDrawer) { UI.opener = fk; const c = document.querySelector('#drawer [data-act="closeDrawer"]'); if (c) c.focus(); }
  else if (fk) { try { const n = document.querySelector(fk); if (n && !n.disabled) n.focus({ preventScroll: true }); } catch (e) { /* 选择器失效就放弃恢复 */ } }
}
const ctx = () => ({ shot: UI.shot, group: UI.group });
function runEdit(text, confirm, force) {
  if (confirm && UI.result && UI.result.rev != null && UI.result.rev !== st.rev) { UI.result = null; const r0 = WB.apply(st, text, { who: UI.who, ctx: ctx(), confirm: false, force, mode: UI.durMode }); r0.rev = st.rev; r0.msg = '数据在你预览之后变了（可能是别的标签页或别人），请看新的预览再确认｜' + (r0.msg || ''); UI.result = r0; render(); return; }
  if (confirm) snap();
  UI.pendingText = text;
  const r = WB.apply(st, text, { who: UI.who, ctx: ctx(), confirm, force, mode: UI.durMode });
  if (force) r.forced = true; r.rev = st.rev;
  UI.result = r; if (r.status !== '预览' && r.status !== '冲突') UI.pendingText = '';
  if (r.status === '已应用') toast('已应用');
  render(); const i = $('#editInput'); if (i && r.status !== '已应用') i.focus();
}
function copyText(text) {
  /* 返回真实结果：true=已进剪贴板；false=失败（调用方下载 .txt 兜底） */
  const legacy = () => { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove(); return ok; };
  if (window.__forceClipFail) return Promise.resolve(false);
  try { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => legacy()); } catch (e) { /* 落到旧接口 */ }
  return Promise.resolve(legacy());
}
function downloadText(name, text) { const b = new Blob([text], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
/* 交付：先试剪贴板；失败就下载 .txt。卡片只显示真实结果（已复制 / 已下载），不提前写「已复制」 */
function deliver(text, name, label, logIds, key) {
  return copyText(text).then((ok) => {
    const ids = [].concat(logIds || []); const how = ok ? '剪贴板' : '剪贴板失败→已下载 ' + name;
    ids.forEach((id) => { const e = st.log.find((x) => x.id === id); if (e) e.delivery = how; });
    if (ok) { window.__lastCopy = text; toast(label); } else { downloadText(name, text); window.__lastDownload = name; toast('剪贴板不可用：已改为下载 ' + name + '（' + text.length + ' 字）'); }
    if (key) UI.copied[key] = { chars: text.length, how: ok ? '已复制' : '已下载' };
    save(); render(); return ok;
  });
}
function download(name, obj) { const b = new Blob([typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function analyzeTone(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader(); fr.onerror = () => rej(new Error('读取失败')); fr.onload = () => {
      const img = new Image(); img.onerror = () => rej(new Error('不是可读的图片')); img.onload = () => {
        const w = 160, h = Math.max(1, Math.round(img.height / img.width * 160)); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
        const px = x.getImageData(0, 0, w, h).data; const lum = []; let R = 0, B = 0; const q = [0, 0, 0, 0];
        for (let i = 0; i < px.length; i += 4) { const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; lum.push(l); R += px[i]; B += px[i + 2]; const p = i / 4; q[((p % w) < w / 2 ? 0 : 1) + (Math.floor(p / w) < h / 2 ? 0 : 2)] += l; }
        lum.sort((a, b) => a - b); const lo = lum[Math.floor(lum.length * 0.05)] + 1, hi = lum[Math.floor(lum.length * 0.95)] + 1; const ratio = hi / lo;
        const names = ['左上', '右上', '左下', '右下']; const qi = q.indexOf(Math.max(...q)); const rb = R / Math.max(1, B);
        res({ thumb: c.toDataURL('image/jpeg', 0.7), dir: `主光偏${names[qi]}（按最亮区域估算）`, ratio: `约 1:${Math.max(1, Math.round(ratio))}`, ct: rb < 0.85 ? '偏冷（约 6000K 以上）' : rb > 1.15 ? '偏暖（约 3500K 以下）' : '中性（约 4500–5500K）', contrast: ratio > 12 ? '高反差' : ratio > 5 ? '中反差' : '低反差', samples: [{ status: '候选', sent: false }, { status: '候选', sent: false }] });
      }; img.src = fr.result;
    }; fr.readAsDataURL(file);
  });
}
async function addTone(files) {
  const all = Array.from(files || []); const list = all.filter((f) => /^image\/(png|jpeg|webp|gif)$/.test(f.type) && f.size <= 15 * 1024 * 1024);
  if (list.length < all.length) toast('已忽略 ' + (all.length - list.length) + ' 个文件：只收 PNG/JPEG/WebP，且 ≤15MB');
  if (!list.length) return;
  st.data.scene.toneRefs = st.data.scene.toneRefs || [];
  for (const f of list) { if (st.data.scene.toneRefs.length >= 2) { toast('最多 2 张参考图'); break; } try { const t = await analyzeTone(f); t.id = 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); t.sha8 = WB.sha8(t.thumb); st.data.scene.toneRefs.push(t); } catch (e) { toast(e.message); } }
  WB.logEntry(st, { who: UI.who, text: '加入影调参考', scope: '场', target: 'S04', variable: '影调参考', before: '—', after: st.data.scene.toneRefs.length + ' 张', status: '已应用' }); render();
}
function act(a, v, el) {
  if (MUTATING.has(a)) snap();
  switch (a) {
    case 'undo': { if (!HIST.length) { toast('没有可撤销的改动'); return; } const prev = JSON.parse(HIST.pop()); const last = st.log[st.log.length - 1]; const rev0 = st.rev || 0; st = WB.init(window.S04_DATA, window.REF_INDEX, prev); st.rev = rev0 + 1; WB.logEntry(st, { who: UI.who, text: '撤销上一笔' + (last ? '：' + last.text : ''), scope: '—', target: '—', variable: '撤销', before: '—', after: '—', status: '已应用' }); UI.result = null; toast('已撤销'); break; }
    case 'tab': UI.tab = v; UI.result = null; break;
    case 'mode': UI.mode = v; break;
    case 'final': UI.finalMode = !UI.finalMode; break;
    case 'selShot': UI.shot = v; UI.group = WB.groupOf(st, v).id; UI.drawer = UI.drawer && UI.drawer.kind === 'gap' ? null : UI.drawer; $('#tree').classList.remove('open'); break;
    case 'selGroup': UI.group = v; UI.shot = null; break;
    case 'selScene': UI.group = null; UI.shot = null; break;
    case 'hint': UI.pendingText = v; UI.result = null; render(); $('#editInput').focus(); return;
    case 'confirmEdit': runEdit(UI.pendingText, true, UI.result && UI.result.forced); return;
    case 'cancelEdit': UI.result = null; UI.pendingText = ''; break;
    case 'durMode': UI.durMode = v; runEdit(UI.pendingText, false, UI.result && UI.result.forced); return;
    case 'ack': WB.ackAll(st, UI.who); break;
    case 'ackConflict': WB.ackAll(st, UI.who); UI.result = { status: '已读', msg: '已采纳对方的改动，你这次的修改没有应用。' }; UI.pendingText = ''; break;
    case 'forceConflict': WB.ackAll(st, UI.who); runEdit(UI.pendingText, false, true); return;
    case 'lines': UI.drawer = { kind: 'lines', a: +el.dataset.a, b: +el.dataset.b }; break;
    case 'gap': UI.drawer = { kind: 'gap', key: v }; break;
    case 'closeDrawer': UI.drawer = null; break;
    case 'overlay': UI.overlay = v; break;
    case 'ptab': UI.ptab[el.dataset.id] = v; break;
    case 'toggleSide': case 'toggleTree': { const p = $(a === 'toggleSide' ? '#side' : '#tree'); const on = p.classList.toggle('open'); applyInert(); document.querySelectorAll(`[data-act="${a}"]`).forEach((b) => b.setAttribute('aria-expanded', on)); if (on) { const f = p.querySelector('button,[tabindex="0"],a,input'); if (f) f.focus(); } else if (el) el.focus(); return; }
    case 'lockShot': { const s = S(v); const on = s.lock !== '锁定'; if (UI.who !== '导演') { toast('只有导演可以' + (on ? '锁定' : '解锁')); return; } if (!on && !window.confirm('解锁 ' + short(v) + ' 会让这些内容失效：\n· ' + WB.invalidations(st, v).join('\n· ') + '\n\n确定解锁？')) return; const r = WB.setLock(st, v, on, UI.who); toast(r.ok ? (on ? '已锁定 ' : '已解锁 ') + short(v) : r.msg); break; }
    case 'lockGroup': { const r = WB.lockGroup(st, v, UI.who); toast(r.ok ? '已锁组' : r.msg); break; }
    case 'choose': { if (!/导演|总监/.test(UI.who)) { toast('只有导演或总监可以选方向'); return; } const r = WB.chooseDirection(st, v, UI.who, UI.who !== '导演'); toast(r.ok ? '已选方向 ' + v : r.msg); break; }
    case 'confirmDir': { if (UI.who !== '导演') { toast('请把「我是」切到导演再确认'); return; } WB.chooseDirection(st, st.data.scene.diagnosis.chosen.option, '导演', false); toast('导演已确认方向'); break; }
    case 'clearDir': st.data.scene.diagnosis.chosen = null; WB.logEntry(st, { who: UI.who, text: '清空方向（测试门禁）', scope: '场', target: 'S04', variable: '文学方向', before: '—', after: '未选', status: '已应用' }); UI.tab = 'stage0'; break;
    case 'copy': { const r = WB.copyGroup(st, v, UI.who); if (!r.ok) { toast(r.msg); break; } save(); deliver(r.text, `S04_${v}_prompt${r.draft ? '_DRAFT' : ''}.txt`, `已复制 ${r.chars} 字` + (r.draft ? '（含 DRAFT 头）' : ''), r.logId, v); return; }
    case 'copyAll': { const parts = [], skip = [], ids = []; for (const g of groups()) { const r = WB.copyGroup(st, g.id, UI.who); if (r.ok) { parts.push(r.text); ids.push(r.logId); } else skip.push(g.name + '：' + r.msg); } const text = parts.join('\n\n=====\n\n'); save(); if (skip.length) toast('以下组没有复制：' + skip.join('；')); if (parts.length) deliver(text, 'S04_all_prompts_DRAFT.txt', `已复制 ${parts.length} 组，共 ${text.length} 字`, ids, 'all'); else render(); return; }
    case 'clearLastFrame': { const r = WB.setLastFrame(st, v, null, null, UI.who); toast(r.ok ? '已撤下尾帧：下一组首帧过期，需重新生成' : r.msg); break; }
    case 'lintSign': case 'lintUnsign': {
      const [target, scope] = [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)]; const on = a === 'lintSign';
      const g = WB.group(st, scope); const ctx = target === 'prompt' ? WB.lintCtx(st, 'prompt', scope, { text: WB.compose(st, scope).text }) : target === 'acting' ? WB.lintCtx(st, 'acting', scope, { g }) : target === 'stage0' ? WB.lintCtx(st, 'stage0', scope, {}) : null;
      if (!ctx) { toast('这一类规则在这里不能签核'); return; }
      const R0 = WB.RULESET.find((r) => r.id === el.dataset.r); if (on && R0 && R0.check !== 'manual' && UI.who !== '导演') { toast('只有导演可以接受提醒项'); return; }
      WB.signRule(st, v, el.dataset.r, UI.who, on, ctx.hash); toast(on ? '已签核 ' + el.dataset.r + '（绑定当前内容）' : '已撤销 ' + el.dataset.r); break;
    }
    case 'fitPlan': { const r = WB.applyFitPlan(st, UI.who); toast(r.ok ? (r.unchanged ? '预案已执行过，没有变化' : `已加秒：全场 ${WB.sceneSec(st)}″，相关片段需复核`) : r.msg); break; }
    case 'closeCI': { const r = WB.closeCI(st, v, UI.who); toast(r.ok ? '已关闭 ' + v : r.msg); break; }
    case 'lintToggle': UI.lintOpen = UI.lintOpen || {}; UI.lintOpen[v] = !UI.lintOpen[v]; break;
    case 'copyGap': { const gap = WB.gaps(st).find((g) => g.key === v); const p = gap && WB.gapPrompt(st, gap, 'ABC'[+el.dataset.k]); if (!p || !p.ok) { toast('这一项没有出图提示词'); return; } deliver(p.prompt, `${(gap.id || gap.tmp)}_${'ABC'[+el.dataset.k]}_image_prompt.txt`, `已复制 ${'ABC'[+el.dataset.k]} 出图提示词`); return; }
    case 'seedTask': download('S04_seedance_spec_task.json', WB.seedanceTask(st)); return;
    case 'thumb': { st.thumbSel[el.dataset.g][el.dataset.name] = el.checked; break; }
    case 'heard': { const [sid, i] = v.split('|'); const r = WB.markHeard(st, sid, +i, UI.who); toast(r.ok ? '已记录试听：这句在当前起止点内能念完' : r.msg); break; }
    case 'dlgTime': { const [sid, i] = v.split('|'); const inp = document.querySelector(`[data-dt="${v}"]`); const inp1 = document.querySelector(`[data-dt1="${v}"]`); const r = WB.setDialogueTime(st, sid, +i, inp.value === '' ? NaN : +inp.value, UI.who, inp1 ? inp1.value : null); toast(r.ok ? `台词 ${inp.value}–${inp1 ? inp1.value : ''}″` + (r.over ? '：仍念不完' : '') + (r.overlap ? '：与另一句重叠' : '') + (r.risk ? '：要试听' : '') : r.msg); break; }
    case 'fieldLock': { const [sid, k] = v.split('|'); const s = S(sid); const on = !s.fieldLocks[k]; if (UI.who !== '导演') { toast('只有导演可以锁字段'); return; } const r = WB.setLock(st, sid, on, UI.who, k); toast(r.ok ? (on ? '已锁 ' : '已解锁 ') + short(sid) + '·' + k : r.msg); break; }
    case 'regClip': WB.registerClip(st, v, UI.who); break;
    case 'acc': { const r = WB.setAcceptance(st, el.dataset.g, el.dataset.role, +el.dataset.k, el.checked, UI.who); if (!r.ok) toast(r.msg); else if (r.revoked) toast(el.dataset.role + ' 的验收通过已撤销'); break; }
    case 'accPass': { const r = WB.checkClip(st, el.dataset.g, el.dataset.role, UI.who); toast(r.ok ? '验收已记录' + (r.clip.status === '已批' ? '：片段已批' : '') : r.msg); break; }
    case 'prop': { const r = WB.acceptProposal(st, v, UI.who, el.dataset.ok === '1'); if (!r.ok) toast(r.msg || '失败'); break; }
    case 'decide': {
      if (UI.who !== '导演') { toast('只有导演可以定（请切换「我是」）'); return; }
      const sel = document.querySelector(`select[data-q="${CSS.escape(v)}"]`); const val = sel ? sel.value : null;
      const r = WB.decide(st, v, el.dataset.kind, val, UI.who); toast(r.ok ? '已定' + (r.invalidates.length ? `：${r.invalidates.length} 项片段/签字失效，需复核` : '') : r.msg); break;
    }
    case 'toneSend': { const t = st.data.scene.toneRefs[+el.dataset.i]; t.samples[+el.dataset.j].sent = true; WB.logEntry(st, { who: UI.who, text: '影调样图交导演定', scope: '场', target: 'S04', variable: '影调样图', before: '候选', after: '待导演定', status: '已应用' }); break; }
    case 'toneDel': st.data.scene.toneRefs.splice(+el.dataset.i, 1); break;
    case 'export': download('S04_workbench_export.json', WB.serialize(st)); return;
    case 'exportOps': download('S04_ops.json', { ops: st.ops, picks: st.picks, refIndex: st.refIndex }); return;
    case 'reset': if (!window.confirm('清空本机保存的所有改动，回到初始数据？')) return; try { localStorage.removeItem(KEY); } catch (e) { toast('本机缓存不可用，只重置本页'); } st = WB.init(window.S04_DATA, window.REF_INDEX); UI.result = null; UI.tab = 'stage0'; break;
    default: return;
  }
  render();
  if (a === 'selShot' && ['导演', '摄影'].includes(UI.tab)) { const c = document.getElementById('card-' + v); if (c) c.scrollIntoView({ block: 'start' }); }
}
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (el.tagName === 'SELECT' || a === 'thumb' || a === 'toneFile') return;
  if (el.tagName === 'INPUT' && a !== 'acc') return;
  if (el.tagName === 'LABEL') return;
  act(a, el.dataset.v, el);
});
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.id === 'who') { UI.who = el.value; UI.result = null; render(); return; }
  if (el.dataset.act === 'toneFile') addTone(el.files);
  if (el.dataset.act === 'skillFile') checkSkillFiles(el.files);
  if (el.dataset.act === 'thumb') { snap(); act('thumb', null, el); render(); return; }
  if (el.dataset.act === 'lastFrame' && el.files[0]) {
    const f = el.files[0]; if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 15e6) { toast('尾帧只收 PNG/JPEG/WebP，≤15MB'); return; }
    const fr = new FileReader(); fr.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const k = Math.min(1, 960 / img.width); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const d = c.toDataURL('image/jpeg', 0.85); snap(); const r = WB.setLastFrame(st, el.dataset.g, d, null, UI.who); toast(r.ok ? '已回填实际尾帧' + (r.applied ? '：下一组首帧已接管' : '（片段已批后自动接管下一组首帧）') : r.msg); save(); render(); }; img.onerror = () => toast('图片读不出来'); img.src = fr.result; }; fr.readAsDataURL(f);
  }
});
document.addEventListener('submit', (ev) => {
  ev.preventDefault(); const f = ev.target;
  if (f.dataset.form === 'edit') runEdit($('#editInput').value, false);
  if (f.dataset.form === 'pick') { const c = f.querySelector('input[name=cand]:checked'); if (!c) { toast('先选一个候选'); return; } snap(); const r = WB.pickCandidate(st, UI.drawer.key, c.value, f.note.value, UI.who); toast(r.ok ? '已入库｜待批' : r.msg); render(); }
});
function drawerFocusables() { return Array.from($('#drawer').querySelectorAll('button:not([disabled]),a[href],input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.hide') && !inClosedDetails(e); }); }
/* 收起的 <details> 里的控件不可聚焦（新版 Chromium 仍给它们布局盒，不能只看尺寸） */
function inClosedDetails(e) { for (let d = e.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) { if (!d.open) { const sm = d.querySelector(':scope > summary'); if (!(sm && sm.contains(e))) return true; } } return false; }
/* 兜底：焦点因任何原因落到抽屉外（含页面外再切回），拉回抽屉第一个控件 */
document.addEventListener('focusin', (ev) => { if (!UI.drawer) return; const dr = $('#drawer'); if (dr && !dr.contains(ev.target)) { const f = drawerFocusables(); if (f.length) f[0].focus(); } });
document.addEventListener('keydown', (ev) => {
  const ae = document.activeElement;
  if (ev.key === 'Escape' && UI.drawer) { UI.drawer = null; render(); return; }
  /* 焦点陷阱：抽屉打开时 Tab／Shift+Tab 在抽屉内循环 */
  if (ev.key === 'Tab' && UI.drawer) { const f = drawerFocusables(); if (f.length) { const a = f[0], z = f[f.length - 1]; if (!$('#drawer').contains(ae)) { ev.preventDefault(); a.focus(); } else if (ev.shiftKey && ae === a) { ev.preventDefault(); z.focus(); } else if (!ev.shiftKey && ae === z) { ev.preventDefault(); a.focus(); } } }
  if (ev.key === 'Escape' && ($('#side').classList.contains('open') || $('#tree').classList.contains('open'))) { const which = $('#side').classList.contains('open') ? 'Side' : 'Tree'; $('#side').classList.remove('open'); $('#tree').classList.remove('open'); applyInert(); const b = document.querySelector(`[data-act="toggle${which}"]`); if (b) b.focus(); return; }
  if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(ae.tagName)) { const i = $('#editInput'); if (i) { ev.preventDefault(); i.focus(); } }
  if ((ev.key === 'Enter' || ev.key === ' ') && ae && (ae.id === 'dropzone' || ae.id === 'skilldrop')) { ev.preventDefault(); ae.querySelector('input').click(); }
  if ((ev.key === 'Enter' || ev.key === ' ') && ae && ae.classList.contains('blk')) { ev.preventDefault(); act('selShot', ae.dataset.v, ae); }
  if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && ae && ae.getAttribute('role') === 'tab') {
    /* 只在同一个 tablist 内移动：顶层页面导航 vs 镜卡内「参数/灯光/光学」 */
    ev.preventDefault(); const list = ae.closest('[role=tablist]') || document; const all = Array.from(list.querySelectorAll('[role=tab]:not([disabled])')); const i = all.indexOf(ae); const n = all[(i + (ev.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
    if (n) { const sel = `[role=tab][data-act="${n.dataset.act}"][data-v="${n.dataset.v}"]` + (n.dataset.id ? `[data-id="${n.dataset.id}"]` : ''); act(n.dataset.act, n.dataset.v, n); const m = document.querySelector(sel); if (m) m.focus(); }
  }
  if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && ae && ae.classList.contains('tnode')) {
    ev.preventDefault(); const all = Array.from(document.querySelectorAll('.tnode')); const i = all.indexOf(ae); const n = all[i + (ev.key === 'ArrowDown' ? 1 : -1)]; if (n) n.focus();
  }
});
document.addEventListener('dragover', (ev) => { if (ev.target.closest && ev.target.closest('#dropzone,#skilldrop')) ev.preventDefault(); });
document.addEventListener('drop', (ev) => { const z = ev.target.closest && ev.target.closest('#dropzone'); if (z) { ev.preventDefault(); addTone(ev.dataTransfer.files); } const k = ev.target.closest && ev.target.closest('#skilldrop'); if (k) { ev.preventDefault(); checkSkillFiles(ev.dataTransfer.files); } });
document.addEventListener('click', (ev) => { const k = ev.target.closest && ev.target.closest('#skilldrop'); if (k && ev.target.tagName !== 'INPUT') k.querySelector('input').click(); });
window.addEventListener('storage', (ev) => {
  if (ev.key !== KEY || !ev.newValue) return;
  try { const o = JSON.parse(ev.newValue); if (o.built === window.S04_DATA.built && (o.st.rev || 0) >= (st.rev || 0)) { st = WB.init(window.S04_DATA, window.REF_INDEX, o.st); HIST.length = 0; toast('另一个标签页更新了数据，已同步（本页撤销记录已清空，避免覆盖对方的改动）'); render(); } } catch (e) { /* 忽略坏数据 */ }
});
document.addEventListener('keydown', (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { ev.preventDefault(); act('undo'); } });
(function boot() {
  if (!window.S04_DATA || !window.WB) { document.getElementById('main').innerHTML = '<div class="alert bad">数据没有加载：请确认 data/S04.js、js/core.js 与本页的相对位置没变。</div>'; return; }
  if (window.RULES && WB.allRules) WB.RULESET = WB.allRules(window.RULES);
  load(); render();
  window.__WB = { st: () => st, UI, render, act, runEdit };
})();
