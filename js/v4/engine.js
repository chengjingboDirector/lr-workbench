/* 工作台 v4 引擎：一条改动通道（解析→定位→守卫→预览→只应用可应用项→硬校验）＋挂载项＋版本＋反馈记录＋交接包
   依赖 core.js（WB：组装提示词、台词逐字核对）、rules_v1.js、v4_extra.js。纯函数式状态，可在 node 下测。 */
(function (root) {
  const WB = root.WB || (typeof require !== 'undefined' ? require('../core.js') : null);
  const R = root.RULES_V1 || (typeof require !== 'undefined' ? require('./rules_v1.js') : null);
  const E4 = {};
  /* 规则包可序列化（正则存成 {__re}），完整包据此封装并在接收端还原 */
  const serR = (r) => JSON.parse(JSON.stringify(r, (k, v) => (v instanceof RegExp ? { __re: v.source, __f: v.flags } : v)));
  const revR = (o) => JSON.parse(JSON.stringify(o), (k, v) => (v && typeof v === 'object' && typeof v.__re === 'string' ? new RegExp(v.__re, v.__f || '') : v));
  const R0 = R ? serR(R) : null;
  E4.useRules = function (o) { const nr = revR(o || R0); Object.keys(R).forEach((k) => { delete R[k]; }); Object.assign(R, nr); };
  E4.rulesNow = () => serR(R);
  /* 文学本、型号按状态读取（不在初始化时改全局闭包；临时状态失败不会污染当前会话） */
  const OWNER = new WeakMap();
  if (WB) WB.litLines = (st) => { const S = st && OWNER.get(st); return S ? S.lit.lines.map((t, i) => ({ n: i + 1, text: t })) : st.data.literary.lines; };
  const PROXY = '总监代选｜待导演确认'; const FILL = '总监代填｜待视听确认';
  const r1 = (x) => Math.round(x * 10) / 10;
  const now = () => { const d = new Date(Date.now() + 8 * 3600e3); return d.toISOString().slice(0, 16).replace('T', ' ') + '（UTC+8）'; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  E4.PROXY = PROXY; E4.FILL = FILL;

  /* ---------- 初始化（不自动代选：recommended 与 chosen 分开） ---------- */
  const rsig = () => WB.sha8(JSON.stringify(R, (k, v) => (v instanceof RegExp ? v.source : v)));
  E4.init = function (data, refIndex, extra, saved, pdeps) {
    if (pdeps) { E4.useRules(pdeps.rules); E4._pkgRules = true; refIndex = pdeps.ref; if (pdeps.extra) extra = clone(pdeps.extra); } else if (E4._pkgRules) { E4.useRules(null); E4._pkgRules = false; }
    const extraJ = JSON.stringify(Object.assign({}, extra, { mount: undefined }));
    const orig = JSON.stringify(data); const origSha = WB.sha8(orig);
    const AVX = pdeps ? pdeps.av : root.AV_S04 || (typeof require !== 'undefined' ? (() => { try { return require('../../data/av_S04.js'); } catch (e) { return null; } })() : null);
    const avLog = AVX ? AVX.apply(data) : []; const merged = JSON.stringify(data); const avLog0 = clone(avLog); if (AVX) extra.mount = E4.buildMount(AVX);
    const MODEL = AVX ? { body: AVX.kit.body.model, lens: AVX.kit.lens.model } : null; E4.MODEL = MODEL;
    const noPick = WB.autoPick; WB.autoPick = function () {}; // 删除 autoPick：chosen 只在导演点了以后写
    const st = WB.init(data, refIndex, null); WB.autoPick = noPick;
    st.data.scene.diagnosis.chosen = null;
    { let nRep = 0; const walk = (o) => { if (!o || typeof o !== 'object') return; Object.keys(o).forEach((k) => { if (typeof o[k] === 'string' && o[k].includes('总监代拟')) { o[k] = o[k].replace(/总监代拟/g, '总监代选'); nRep++; } else walk(o[k]); }); }; walk(st.data); if (nRep) avLog.push(['全场', '标记统一', '「总监代拟」→「总监代选｜待导演确认」' + nRep + ' 处', PROXY]); }
    const S = {
      st, extra: extra, base: { lit: st.data.literary.lines.map((l) => l.text), dur: {} },
      journal: [], // 操作日志（可重放）
      layers: { scene: {}, seg: {}, shot: {} }, pending: [], fb: [], ver: {}, lit: { n: 1, lines: null, hist: [], sync: {}, req: [] },
      confirm: { dir: null, shots: {}, sign: {}, segOk: {} },
      decisions: {
        gel: { value: 'A：改第 5 场：改用裂壳空管', mark: PROXY, title: '凝胶冲突改法' }, llm: { value: '只用规则＋词库，不接大模型', mark: PROXY, title: '智能解析方式' },
        score: { value: '不出数值分', mark: PROXY, title: '决定卡打分' }, lens: { value: '镜头型号写进正文（品牌禁令只管画面内容）', mark: PROXY, title: '镜头型号与品牌禁令' },
        sound: { value: '声音挂在美术／场景下', mark: PROXY, title: '声音归属' }, glass: { value: null, mark: '待导演确认', title: '眼镜裂损从哪来' }, arm: { value: null, mark: '待导演确认', title: '儿童机械手后场链条' },
      },
      avLog, av: AVX, deps: { orig, merged, extraJ, refJ: JSON.stringify(refIndex || {}), avLog: avLog0, fromPkg: !!pdeps, shas: { data: origSha, ref: WB.sha8(JSON.stringify(refIndex || {})), rules: rsig(), av: AVX ? AVX.src.sha8 : null, avc: AVX ? WB.sha8(JSON.stringify(AVX)) : null, merged: WB.sha8(merged), extra: WB.sha8(extraJ) } }, role: '导演', copies: [], log: [], seq: 0, baseSha: WB.sha8(JSON.stringify([st.data.shots, st.data.groups, st.data.literary, R.version, refIndex ? Object.keys(refIndex).length : 0, AVX ? AVX.src.sha8 : null])),
    };
    st.data.shots.forEach((s) => { S.base.dur[s.id] = s.duration; });
    S.lit.lines = S.base.lit.slice();
    OWNER.set(st, S); S.model = MODEL;
    if (saved) E4.restore(S, saved);
    st.data.groups.forEach((g) => { if (!S.ver[g.id]) { const c = E4.compile(S, g.id); S.ver[g.id] = { n: 1, sha: WB.sha8(c.text), text: c.text, hist: [{ n: 1, sha: WB.sha8(c.text), reason: '初始', time: now(), parent: null }] }; } });
    return S;
  };

  /* ---------- 内容层取值：镜 > 段 > 场 ---------- */
  E4.val = function (S, field, sid) {
    const g = WB.groupOf(S.st, sid); const f = R.fields[field];
    const sh = (S.layers.shot[sid] || {})[field]; if (sh !== undefined) return { v: sh, from: '本镜另设' };
    const sg = g && (S.layers.seg[g.id] || {})[field]; if (sg !== undefined) return { v: sg, from: '本段另设' };
    const sc = S.layers.scene[field]; if (sc !== undefined) return { v: sc, from: '整场' };
    return { v: f ? f.cur : null, from: '默认' };
  };
  /* 表演当前档：只按 performance.raw 关键词判断（岗位判断，非原文事实）；判不出 → null（无依据） */
  /* 段级生效值（段 > 场 > 默认）：挂载只用段级，单镜不同的写进 DEPARTMENT ADJUSTMENTS */
  E4.valSeg = function (S, field, gid) { const vs = [...new Set(WB.group(S.st, gid).shots.map((id) => E4.val(S, field, id).v))]; if (vs.length === 1) return vs[0]; const sg = (S.layers.seg[gid] || {})[field]; if (sg !== undefined) return sg; const sc = S.layers.scene[field]; if (sc !== undefined) return sc; const f = R.fields[field]; return f ? f.cur : null; };
  E4.perfCur = function (S, sid) {
    const ov = E4.val(S, 'perf.intensity', sid); if (ov.from !== '默认') return ov.v;
    const raw = (WB.shot(S.st, sid).performance || {}).raw || '';
    if (/紧绷|快跑|猛回头|急着|喘|踉跄/.test(raw)) return '外放'; if (/克制|收住|不再使劲|没有再抓|低着头|停了下来/.test(raw)) return '克制'; return null;
  };
  E4.fieldShots = function (S, field, sids) {
    const f = R.fields[field]; if (!f || !f.match) return sids;
    return sids.filter((id) => { const s = WB.shot(S.st, id); return f.match.test(s.actionEn || '') || (s.bgActions || []).some((b) => f.match.test(b)); });
  };

  /* ---------- 编译提示词（WB 组装正文 ＋ 固定挂载 ＋ 内容层调整），去掉 // 行 ---------- */
  const LAB = (S, gid) => { const g = WB.group(S.st, gid); const ch = g.chain || []; const lab = []; let n = 0, ph = 0; g.shots.forEach((id, i) => { const cont = i > 0 && ch.includes(id) && ch.includes(g.shots[i - 1]); if (cont) ph++; else { n++; ph = (ch.includes(id) && i < g.shots.length - 1 && ch.includes(g.shots[i + 1])) ? 1 : 0; } lab.push(ph ? `Shot ${n}, phase ${ph}` : `Shot ${n}`); }); return lab; };
  E4.LAB = LAB;
  /* 由视听补数生成挂载项：段级基调（全场一致）＋段内触发（逐段） */
  E4.buildMount = function (A) {
    const K = A.kit, M = {};
    M.body = { en: K.body.en, src: K.body.src, mark: K.body.mark, model: K.body.model };
    M.lens = { en: K.lens.en, src: K.lens.src, mark: K.lens.mark, model: K.lens.model };
    M.filter = { en: K.filter.en, src: K.filter.src, mark: K.filter.mark };
    M.light = { en: K.light.en, src: K.light.src, mark: K.light.mark };
    const segKey = (k, mk) => { const o = { seg: {}, src: '视听补数 71fdc3ad 各组 ② 段级默认', mark: A.marks.AV, segMark: {} }; Object.entries(A.seg).forEach(([g, v]) => { o.seg[g] = v[k]; o.segMark[g] = v[k + 'Mark'] || A.marks.AV; }); return o; };
    ['bokeh', 'flare', 'vignette', 'fringing', 'breathing', 'focus'].forEach((k) => { M[k] = segKey(k); });
    M.fx = segKey('fx'); M.grain = { en: K.grain.en, src: K.grain.src, mark: K.grain.mark };
    return M;
  };
  E4.mval = function (S, k, gid) { const m = S.extra.mount[k]; if (!m) return ''; return m.seg ? (m.seg[gid] || '') : (m.en || ''); };
  E4.mmark = function (S, k, gid) { const m = S.extra.mount[k]; if (!m) return ''; return m.seg ? (m.segMark && m.segMark[gid]) || m.mark : m.mark; };
  E4.mountLines = function (S, gid) {
    const M = S.extra.mount; const g = WB.group(S.st, gid); const v = (k) => E4.mval(S, k, gid);
    const fmap = (S.av && S.av.focalMap) || {}; const fl = [...new Set(g.shots.map((id) => WB.shot(S.st, id).focal.eq).filter(Boolean))].sort((a, b) => a - b);
    const flTxt = fl.map((f) => (fmap[f] ? fmap[f] + 'mm' : '') + ' (' + f + 'mm spherical-equivalent)').join(', ');
    const rv = E4.valSeg(S, 'light.rainVolume', gid); const exp = E4.valSeg(S, 'light.exposure', gid); const ratio = E4.valSeg(S, 'light.ratio', gid); const filt = E4.valSeg(S, 'camera.filter', gid);
    let light = v('light'); if (light && ratio && ratio !== '1:8') light = light.replace('about 1:8 contrast', 'about ' + ratio + ' contrast'); if (light && exp && exp !== '中') light += '; ' + R.fields['light.exposure'].en[exp]; if (light && rv && rv !== '中' && R.fields['light.rainVolume'].en[rv]) light += '; ' + R.fields['light.rainVolume'].en[rv];
    let filter = v('filter'); if (filter && filt && filt !== '1/8') filter = R.fields['camera.filter'].en[filt];
    const pre = (k, t) => (t ? E4.MOUNT_PREFIX[k] + ' ' + t + (/[.]$/.test(t) ? '' : '.') : E4.MOUNT_PREFIX[k]);
    return [
      ['MOUNT', 'MOUNTED CAMERA AND LIGHT (fixed for this segment)'],
      ['body', pre('body', v('body'))],
      ['lens', pre('lens', v('lens') ? v('lens') + '; actual focal lengths ' + flTxt + ', per shot as listed under OPTICS' : '')],
      ['filter', pre('filter', filter)],
      ['fx', v('fx') ? 'Segment optical character: ' + v('fx') + '.' : ''],
      ['bokeh', pre('bokeh', v('bokeh'))], ['flare', pre('flare', v('flare'))], ['vignette', pre('vignette', v('vignette'))],
      ['fringing', pre('fringing', v('fringing'))], ['breathing', pre('breathing', v('breathing'))],
      ['focus', pre('focus', v('focus') ? v('focus') + '; ' + v('grain') : '')], ['light', pre('light', light)],
    ].filter((x) => x[1]);
  };
  E4.MOUNT_KEYS = ['body', 'lens', 'filter', 'bokeh', 'flare', 'vignette', 'fringing', 'breathing', 'focus', 'light'];
  E4.MOUNT_LABEL = { focal: '逐镜焦段', body: '机器、画幅、介质', lens: '镜头型号与焦段', filter: '滤镜', bokeh: '焦外', flare: '炫光', vignette: '暗角', fringing: '紫边', breathing: '呼吸', focus: '对焦与光学瑕疵', light: '灯光效果' };
  E4.MOUNT_PREFIX = { body: 'Camera and medium:', lens: 'Lens:', filter: 'Filter:', bokeh: 'Bokeh:', flare: 'Flare:', vignette: 'Vignette:', fringing: 'Chromatic fringing:', breathing: 'Focus breathing:', focus: 'Focus and optical imperfections:', light: 'Lighting effect:' };
  E4.adjustLines = function (S, gid) {
    const g = WB.group(S.st, gid); const out = []; const lab = LAB(S, gid);
    const segFields = ['env.rain', 'env.fog', 'sound.ambience', 'camera.move'];
    const perShot = ['perf.intensity', 'rhythm.pause', 'env.robots', 'env.amplitude', 'env.crowd', 'light.key'];
    g.shots.forEach((sid, i) => {
      const parts = [];
      segFields.concat(perShot).forEach((f) => {
        const F = R.fields[f]; const v = E4.val(S, f, sid); if (v.from === '默认') return;
        if (F.match && !E4.fieldShots(S, f, [sid]).length) return;
        const t = F.en[v.v]; if (t) parts.push(t);
      });
      ['light.exposure', 'light.ratio', 'camera.filter', 'light.rainVolume'].forEach((f) => { const v = E4.val(S, f, sid); const v0 = { v: E4.valSeg(S, f, gid) }; if (v.v === v0.v) return; const F = R.fields[f]; const t = F.en[v.v] || (f === 'light.ratio' ? 'contrast back to about 1:8' : f === 'light.exposure' ? 'overall exposure back to the segment default' : f === 'light.rainVolume' ? 'the rain catches the usual amount of light for this shot (not the segment change)' : 'diffusion back to Black Pro-Mist 1/8'); parts.push(t); });
      if (parts.length) out.push([sid, `${lab[i]}: ${parts.join('; ')}.`]);
    });
    if (!out.length) return [];
    return [['ADJ', 'DEPARTMENT ADJUSTMENTS (apply on top of the shot descriptions above)']].concat(out);
  };
  E4.compile = function (S, gid) {
    const c = WB.compose(S.st, gid);
    let body = c.text.split('\n').filter((l) => !/^\/\//.test(l));
    const mount = E4.mountLines(S, gid).map((x) => x[1]);
    const adj = E4.adjustLines(S, gid).map((x) => x[1]);
    const i = body.indexOf('OPTICS'); const ins = i >= 0 ? i : body.length;
    body = body.slice(0, ins).concat(mount, ['']).concat(body.slice(ins));
    const j = body.indexOf('AUDIO'); if (adj.length) body = body.slice(0, j >= 0 ? j : body.length).concat(adj, ['']).concat(body.slice(j >= 0 ? j : body.length));
    { const filt = E4.valSeg(S, 'camera.filter', gid); const ratio = E4.valSeg(S, 'light.ratio', gid); const isMount = (l) => /^(Camera and medium|Lens|Filter|Bokeh|Flare|Vignette|Chromatic fringing|Focus breathing|Focus and optical imperfections|Lighting effect|Segment optical character):/.test(l);
      body = body.map((l) => { if (isMount(l) || l.includes('"') || / says\b/.test(l)) return l; let x = l; if (filt && filt !== '1/8') x = x.replace(/subtle black-mist diffusion(: soft highlights, gentle halation)?/g, R.fields['camera.filter'].en[filt]); if (ratio && ratio !== '1:8') x = x.replace(/\b1:8\b/g, ratio); return x; }); }
    const text = body.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    const errors = c.errors.filter((e) => !/禁用名称/.test(e));
    let nonLens = text.split('\n').filter((l) => !/^(Lens|Camera and medium|Filter):/.test(l)).join('\n'); const dlgDesc = [...new Set(WB.group(S.st, gid).shots.flatMap((sid) => WB.shot(S.st, sid).dialogue.map((d) => d.en)))].sort((a, b) => b.length - a.length); dlgDesc.forEach((en) => { nonLens = nonLens.split('"' + en + '"').join('[approved line]'); }); /* 品牌禁令只管画面内容：批准台词（声音）与器材型号行不扫 */ const fb = nonLens.match(WB.FORBIDDEN); if (fb) errors.push('正文含禁用名称「' + fb[0] + '」');
    const mc = E4.mountCheck(S, text, gid); if (!mc.ok) errors.push('挂载项没写进正文：' + mc.missing.map((k) => E4.MOUNT_LABEL[k]).join('、'));
    const sec = WB.groupSec(S.st, WB.group(S.st, gid)); if (sec > 30 && !errors.some((e) => /组秒/.test(e))) errors.push('这段 ' + sec + '″ 超过 30″');
    if (WB.CJK.test(text)) errors.push('正文里有中文');
    if (WB.groupOf(S.st, E4.weatherShot(S)).id === gid && !E4.endWeatherOk(S)) errors.push('末场卡天气和场尾镜的雨势不一致');
    WB.group(S.st, gid).shots.forEach((sid) => { const d = WB.shot(S.st, sid).duration; if (!(d >= 1)) errors.push('第 ' + (+sid.slice(5)) + ' 镜时长 ' + d + '″ 无效（至少 1″）'); });
    // 台词锚点：本段每句批准台词恰好出现 1 次（WB.compose 已核）；文学当前版本里要有原句
    const lit = S.lit.lines.join('\n'); WB.group(S.st, gid).shots.forEach((sid) => WB.shot(S.st, sid).dialogue.forEach((d) => { if (!lit.includes(d.en)) errors.push(`台词和剧本当前版本不一致：「${d.en.slice(0, 28)}」`); }));
    { let rr = text; const cnt = {}; WB.group(S.st, gid).shots.forEach((sid) => WB.shot(S.st, sid).dialogue.forEach((d) => { cnt[d.en] = (cnt[d.en] || 0) + 1; })); Object.keys(cnt).sort((a, b) => b.length - a.length).forEach((en) => { const n = rr.split('"' + en + '"').length - 1; rr = rr.split('"' + en + '"').join('[approved line]'); if (n !== cnt[en]) errors.push(`最终复制文本里的台词不是逐字一次：「${en.slice(0, 28)}」`); }); } // 长句先计并剔除
    return { text, errors, sec, pending: c.p.pending, mount: mc };
  };
  /* 挂载校验：字段有效＋最终复制文本里确有该句＋来源可追溯 */
  E4.mountCheck = function (S, text, gid) {
    const M = S.extra.mount; const lines = text.split('\n'); const missing = []; const detail = {};
    E4.MOUNT_KEYS.forEach((k) => {
      const val = E4.mval(S, k, gid); const valid = M[k] && val && val.trim().length > 3 && M[k].src;
      const line = lines.find((l) => l.startsWith(E4.MOUNT_PREFIX[k]));
      const inText = !!line && line.slice(E4.MOUNT_PREFIX[k].length).trim().length > 3;
      detail[k] = { valid: !!valid, inText, src: M[k] && M[k].src, mark: E4.mmark(S, k, gid), val };
      let modelOk = true; const model = (S.model || E4.MODEL || {})[k]; if (model) modelOk = !!line && line.includes(model) && val.includes(model);
      detail[k].modelOk = modelOk; if (!valid || !inText || !modelOk) missing.push(k);
    });
    // 焦段：每镜都要有等效焦段和实际焦段，正文里逐镜写出
    const fmap = (S.av && S.av.focalMap) || {}; const g = WB.group(S.st, gid); const lensLine = lines.find((l) => l.startsWith(E4.MOUNT_PREFIX.lens)) || '';
    const badF = g.shots.filter((id) => { const eq = WB.shot(S.st, id).focal.eq; return !eq || !fmap[eq] || !lensLine.includes(fmap[eq] + 'mm (' + eq + 'mm'); });
    if (badF.length || /\b(null|undefined|NaN)mm\b|actual focal lengths\s*[,;]/.test(text)) { missing.push('focal'); detail.focal = { bad: badF }; }
    return { ok: !missing.length, missing, detail };
  };

  /* ---------- 门槛与就绪一句话 ---------- */
  E4.ready = function (S, gid) {
    const c = E4.compile(S, gid); const g = WB.group(S.st, gid); const why = [];
    if (!S.confirm.dir) why.push({ t: '方向还没定（这是按推荐方向的试生成版）', go: 'dir' });
    E4.validShotConfirms(S); const unc = g.shots.filter((id) => !S.confirm.shots[id] || S.confirm.shots[id].stale); if (unc.length) why.push({ t: unc.length + ' 镜没点「这镜可以」', go: 'shots' });
    const refs = c.pending.filter((p) => p.state && p.state !== '已批'); if (refs.length) why.push({ t: refs.length + ' 项参考图没验收', go: 'assets' });
    const pend = S.pending.filter((p) => p.status === '待导演确认' && p.items.some((it) => ((it.shots || []).length ? it.shots : (it.segShots || [])).some((x) => g.shots.includes(x)))); if (pend.length) why.push({ t: pend.length + ' 组改动等导演确认', go: 'pending' });
    const need = S.fb.filter((f) => !f.reverted && (f.gid === gid || f.scope === 'scene') && f.items.some((it) => it.res === '需人处理' || it.res === '导演已批准，待人落实')); if (need.length) why.push({ t: need.length + ' 条反馈没落实（需要人处理）', go: 'fb' });
    if (S.lit.sync[gid]) why.push({ t: '剧本已更新，拍法还没跟上', go: 'sync' });
    if (!S.confirm.mount || S.confirm.mount.hash !== E4.mountHash(S)) why.push({ t: S.confirm.mount ? '摄影确认过的挂载值后来变了，要重新确认' : '摄影挂载值是视听代填（含总监代选、总监代填），待摄影确认', go: 'mount' });
    const est = g.shots.filter((id) => WB.shot(S.st, id).dialogue.some((d) => d.t1 > WB.shot(S.st, id).duration + 0.05)); if (est.length) why.push({ t: est.length + ' 镜台词估算可能念不完（要试听）', go: 'shots' });
    if (gid === 'G5' || g.shots.some((id) => R.endStateShots.includes(id))) { /* 跨场冲突挡下一场正式出片，不挡本场 */ }
    const blocked = c.errors.length > 0;
    const line = blocked ? '先别生成：' + c.errors[0] : (why.length ? `可以拿去试生成；正式出片前还差 ${why.length} 项` : '可以正式出片');
    return { blocked, errors: c.errors, why, line, color: blocked ? '红' : why.length ? '黄' : '绿', c };
  };

  /* ---------- 改动通道：解析 ---------- */
  const segTimeline = (S, gid) => { let t = 0; return WB.group(S.st, gid).shots.map((id) => { const s = WB.shot(S.st, id); const o = { id, t0: r1(t), t1: r1(t + s.duration) }; t += s.duration; return o; }); };
  E4.segTimeline = segTimeline;
  /* 岗位边界：解析后、补选后都要过一次 */
  E4.guardCrew = function (it, crew, entry, needPickShot) {
    if (it.field) { const F = R.fields[it.field]; it.layer = F.layer; it.crew = R.layers[F.layer].crew; }
    if (it.kind === 'set' || it.kind === 'dur' || it.kind === 'step') it.res = it.res || '可应用';
    if (needPickShot && it.kind !== 'guard' && it.kind !== 'none' && it.kind !== 'satisfied') { it.needShot = needPickShot; it.shots = []; if (it.kind !== 'pick') it.res = '待补选'; }
    if (crew && it.crew && crew !== '导演' && it.crew !== crew && it.res === '可应用') { it.res = '转为建议'; it.why = (it.why || '') + `；这属于${R.crews[it.crew].label}，已转为给${R.crews[it.crew].label}的建议`; }
    if (crew === '导演' && it.crew && it.crew !== '导演' && it.res === '可应用' && entry === 'crew') it.review = it.crew; // 导演在岗位栏里改：导演代改，待该岗位复核
    if (crew && crew !== '导演' && it.crew && it.crew === crew) it.review = null;
  };
  E4.parse = function (S, text, opt) {
    opt = opt || {}; const scope = opt.scope || 'scene'; const gid = opt.gid || null; const sid = opt.sid || null; const crew = opt.crew || null; const pickedLayers = opt.layers || null;
    const items = []; const notes = [];
    const CN = (w) => { const d = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }; if (/^十/.test(w)) w = '一' + w; const m = w.match(/^([一二两三四五六七八九])?(十)?([一二三四五六七八九])?$/); if (!m) return null; return m[2] ? (d[m[1]] || 1) * 10 + (m[3] ? d[m[3]] : 0) : (m[1] ? d[m[1]] : null); };
    const norm = String(text).replace(/第\s*([一二两三四五六七八九十]+)(?=\s*(?:[、,，和及与到至~～–-]\s*(?:第\s*)?[一二两三四五六七八九十\d]+\s*)*[镜秒])/g, (m, w) => { const n = CN(w); return n == null ? m : '第' + n; }).replace(/([、,，和及与到至~～–-]\s*(?:第\s*)?)([一二两三四五六七八九十]+)(?=\s*[镜秒])/g, (m, p, w) => { const n = CN(w); return n == null ? m : p + n; });
    /* 数字之间的顿号／逗号是枚举（第1、3镜），不拆句 */
    let normR = norm.replace(/第\s*(\d+)\s*镜\s*(?:到|至|[–\-~～])\s*(?:第\s*)?(\d+)\s*镜/g, '第$1–$2镜'); // 「第1镜到第3镜」＝区间
    const splitS = (t) => t.replace(/(\d)\s*([、,，])\s*(?=(?:第\s*)?[CL]?\d)/g, '$1\uE000').split(/[，,。；;、\n]+/).map((x) => x.replace(/\uE000/g, '、').trim()).filter(Boolean);
    let sents = splitS(normR);
    // 定位逐句解析：本句有显式定位（第N镜／C0N／L行号／第N秒）就用本句的；没有才继承上一句的定位（初始＝入口范围）
    const scopeShots = sid ? [sid] : (scope === 'seg' && gid) ? WB.group(S.st, gid).shots.slice() : S.st.data.shots.map((x) => x.id);
    const DUR_RE = /太急|太慢|快一点|慢一点|镜长/;
    /* 定位统一入口：一句里的全部显式定位（第N镜／C0N／L行号／第N秒）逐个校验；任何一个无效 → 整句不改；
       多个有效定位取并集；含两镜交界的秒数且同句还有别的定位 → 请拆开写；整场入口不能按秒定位；镜卡里写了别的镜 → 不改 */
    const locate = (t) => {
      const NS = S.st.data.shots.length; const out = []; let amb = null; let rest = t;
      const RG = '[–\\-~～到至]'; const nums = (list) => { // 「1、3」「1-3」「1到3、5」→ 镜号数组；有非法项返回 {bad}
        const toks = list.split(new RegExp('\\s*(' + RG + '|[、,，和及与跟])\\s*(?:第\\s*)?')).filter((x) => x !== ''); const r = []; for (let i = 0; i < toks.length; i += 2) { const a = toks[i]; if (!/^\d+$/.test(a)) return { bad: a }; const op = toks[i + 1]; if (op && new RegExp('^' + RG + '$').test(op)) { const b = toks[i + 2]; if (!/^\d+$/.test(b || '') || +b < +a || +b - +a > 40) return { bad: a + op + (b || '') }; for (let k = +a; k <= +b; k++) r.push(k); i += 2; } else r.push(+a); } return { r }; };
      const shotsM = [...t.matchAll(new RegExp('第\\s*(-?[\\d.]+(?:\\s*(?:' + RG + '|[、,，和及与跟])\\s*(?:第\\s*)?[\\d.]+)*)\\s*镜', 'g'))];
      const cM = [...t.matchAll(new RegExp('(?:^|[^A-Za-z0-9])C(-?\\d+)(?:\\s*' + RG + '\\s*C?(\\d+))?', 'gi'))];
      const lineM = [...t.matchAll(/(?:^|[^A-Za-z0-9])L\s*(-?\d+)(?:\s*[–-]\s*L?(-?\d+))?/g)];
      const secM = [...t.matchAll(/第\s*(-?\d+(?:\.\d+)?)\s*秒/g)];
      [...shotsM, ...cM, ...lineM, ...secM].forEach((m) => { rest = rest.replace(m[0], ' '); });
      if (/(\d|[一二两三四五六七八九十])\s*[镜秒]|(?:^|[^A-Za-z])[CL]\s*-?\d/.test(rest)) return { none: '没认出「' + t + '」里写的是哪几镜（支持：第1镜、第1–3镜、第1、3镜、C001、L28、第3秒），没有改；请换种写法或分开写' };
      if (!shotsM.length && !cM.length && !lineM.length && !secM.length) return null;
      const addShot = (nn, raw) => { const id = Number.isInteger(nn) && nn >= 1 && nn <= 999 ? WB.normShot(String(nn)) : null; if (!id || !WB.shot(S.st, id)) return '没有第 ' + raw + ' 镜（本场共 ' + NS + ' 镜），没有改；请核对镜号'; out.push(id); return null; };
      for (const m of shotsM) { if (/^-/.test(m[1])) return { none: '没有第 ' + m[1] + ' 镜（本场共 ' + NS + ' 镜），没有改；请核对镜号' }; const ns = nums(m[1]); if (ns.bad) return { none: '镜号「' + ns.bad + '」无效（本场共 ' + NS + ' 镜），没有改；请核对镜号' }; for (const n of ns.r) { const e = addShot(n, String(n)); if (e) return { none: e }; } }
      for (const m of cM) { const a = +m[1], b = m[2] !== undefined ? +m[2] : a; if (b < a || b - a > 40) return { none: '镜号范围 C' + m[1] + '–C' + m[2] + ' 无效，没有改' }; for (let k = a; k <= b; k++) { const e = addShot(k, 'C' + String(k).padStart(3, '0')); if (e) return { none: e }; } }
      for (const m of lineM) { const a = +m[1], b = +(m[2] || m[1]); if (!(a >= 1 && b >= a)) return { none: '剧本行号 L' + m[1] + (m[2] ? '–' + m[2] : '') + ' 无效，没有改；请核对行号' }; const ls = S.st.data.shots.filter((x) => x.literary && x.literary.lines && x.literary.lines[0] <= b && x.literary.lines[1] >= a).map((x) => x.id); if (!ls.length) return { none: '剧本 L' + a + (b !== a ? '–' + b : '') + ' 没有对应的镜头（可能是不拍的行），没有改；请在镜卡或段里提' }; if (ls.length > 1 && DUR_RE.test(t)) { if (amb) return { none: '一句里有多个需要补选的定位，没有改；请分开写' }; amb = { cand: ls }; } else out.push(...ls); }
      if (secM.length && !gid && !sid) return { none: '整场入口不能按第几秒定位（每段各有自己的秒数），没有改；请在段里提，或直接写第几镜' };
      for (const m of secM) { if (sid) break; const tt = +m[1]; const tl = segTimeline(S, gid); const tot = tl.length ? tl[tl.length - 1].t1 : 0; if (!(tt >= 0 && tt <= tot)) return { none: '第 ' + m[1] + ' 秒不在第 ' + gid.slice(1) + ' 段里（本段共 ' + tot + '″），没有改；请写本段内的秒数或直接写第几镜' }; const near = tl.filter((x) => Math.abs(tt - x.t1) <= 0.5 || Math.abs(tt - x.t0) <= 0.5 || (tt > x.t0 && tt < x.t1)).map((x) => x.id); if (!near.length) return { none: '第 ' + m[1] + ' 秒找不到对应镜头，没有改' }; if (near.length === 1) out.push(near[0]); else { if (amb) return { none: '一句里有多个落在两镜交界的秒数，没有改；请分开写' }; amb = { cand: near, t: tt }; } }
      if (sid) { const bad = [...new Set(out)].filter((x) => x !== sid); if (bad.length) return { none: '这是第 ' + (+sid.slice(5)) + ' 镜的镜卡，但这句写的是 ' + bad.map((x) => '第 ' + (+x.slice(5)) + ' 镜').join('、') + '，没有改；请到对应镜卡或段里提' }; return null; }
      if (amb && out.length) return { none: '一句里既有明确的镜头又有落在两镜交界的位置，没有改；请分开写' };
      if (amb) return { shots: scopeShots, np: amb.cand, sec: amb.t !== undefined ? { t: amb.t, cand: amb.cand } : null };
      return { shots: [...new Set(out)], np: null, pure: !rest.replace(/[\s：:的和及与跟]/g, '') };
    };
    let ctx = { shots: scopeShots, np: null, narrow: !!sid }; let secShots = null; let firstNp = null;
    /* 排除写法：「除了第1镜（以外），其他／其余…」「第1镜不改／不动／保持，其余…」→ 入口范围减去被排除的镜；认不出的排除写法整句不改 */
    { const OTH = '(?:其余|其他|其它|别的|剩下(?:的)?|剩余)(?:的)?(?:镜头|镜|几镜|部分)?(?:都)?';
      /* 逐处处理：每一处排除写法换成标记，标记所在的那一句（以及沿用它的后句）用「入口范围减去被排除的镜」；别处照常逐句定位 */
      const exList = []; let exBad = null;
      for (let guard = 0; guard < 6 && !exBad; guard++) {
        const mA = normR.match(new RegExp('除(?:了|开)?\\s*([^，,。；;\\uE001\\uE002]+?)\\s*(?:以外|之外|外)?\\s*[，,、]?\\s*' + OTH));
        const mB = !mA && normR.match(new RegExp('([^，,。；;\\uE001\\uE002]+?)\\s*(?:都)?(?:不改|不动|别改|别动|保持不变|保持原样|保持|不用改|不变|先不动)\\s*[，,、]\\s*' + OTH));
        const m = mA || mB; if (!m) break;
        const lx = locate(m[1]); if (sid) exBad = '镜卡里不能用排除写法'; else if (!lx || lx.none || lx.np || !lx.pure) exBad = '没认出「' + m[0] + '」里排除的是哪几镜' + (lx && lx.none ? '（' + lx.none.split('，')[0] + '）' : '');
        else { const base = scopeShots.filter((x) => !lx.shots.includes(x)); if (!base.length) exBad = '排除后没有剩下的镜'; else { exList.push({ shots: base, np: null, narrow: true, excl: lx.shots.slice() }); normR = normR.replace(m[0], '\uE001' + (exList.length - 1) + '\uE002'); } }
      }
      if (!exBad && /除了|除开|(?:其余|其他|其它|剩下|剩余)(?:的)?(?:镜|几镜|部分)?/.test(normR)) exBad = '这句里有「除了／其余／其他」，但没认出排除的是哪几镜';
      if (!exBad && exList.length) { sents = splitS(normR); if (sents.some((x) => /^\uE001\d+\uE002$/.test(x))) exBad = '只写了排除哪几镜，没写其余的要怎么改'; if (sents.some((x) => /.\uE001/.test(x))) exBad = '排除写法前面还连着别的内容，请用逗号或分号分开'; }
      if (exBad) return { scope, gid, sid, crew, items: [{ src: String(text), kind: 'none', res: '需人处理', why: exBad + '，没有改；请写成「除了第1镜，其余暗一点」或直接列出要改的镜', shots: [] }], notes, secShots: null };
      var EXL = exList; }
    let baseShots = ctx.shots, needPickShot = null, narrow = ctx.narrow; let gazeCtx = false; let pendLoc = null;
    sents.forEach((s0) => {
      const mk = s0.match(/^\uE001(\d+)\uE002/); if (mk) { s0 = s0.slice(mk[0].length).trim(); if (pendLoc || locate(s0)) { pendLoc = null; ctx = { bad: '排除写法和镜号写在同一句' }; items.push({ src: s0, kind: 'none', res: '需人处理', why: '这句既用了排除写法又写了镜号，没有改；请分开写', shots: [] }); return; } ctx = Object.assign({}, EXL[+mk[1]]); }
      let loc = mk ? null : locate(s0); if (loc && loc.none) { pendLoc = null; ctx = { bad: loc.none }; items.push({ src: s0, kind: 'none', res: '需人处理', why: loc.none, shots: [] }); return; }
      /* 只写了镜号没写改什么（「第1镜、第3镜暗一点」被拆成两句）：镜号并入下一句 */
      if (loc && loc.pure && !loc.np) { pendLoc = (pendLoc || []).concat(loc.shots); return; }
      if (pendLoc) { if (!loc) loc = { shots: pendLoc.slice(), np: null }; else if (!loc.np) loc = Object.assign({}, loc, { shots: [...new Set(pendLoc.concat(loc.shots))] }); else { items.push({ src: s0, kind: 'none', res: '需人处理', why: '前面写了镜号、这句又落在两镜交界，没有改；请分开写', shots: [] }); pendLoc = null; ctx = { bad: '定位冲突' }; return; } pendLoc = null; }
      if (!loc && ctx.bad) { items.push({ src: s0, kind: 'none', res: '需人处理', why: '本句沿用上一句的定位，而上一句定位无效（' + ctx.bad.split('，')[0] + '），没有改；请在本句写明第几镜或第几秒', shots: [] }); return; }
      if (loc) { ctx = { shots: loc.shots, np: loc.np, narrow: true, sec: loc.sec || null, lvl: loc.np ? null : 'shot' }; if (loc.sec && !secShots) secShots = loc.sec; if (loc.np && !firstNp) firstNp = loc.np; }
      baseShots = ctx.shots.slice(); needPickShot = ctx.np; narrow = ctx.narrow; const n0 = items.length;
      const s = s0.replace(/第\s*-?\d+(\.\d+)?\s*秒/g, '').replace(/(?:^|[^A-Za-z0-9])L\s*-?\d+(?:\s*[–-]\s*L?-?\d+)?\s*[：:]?/g, '').trim() || s0;
      try { sentence(s0, s); } finally { items.slice(n0).forEach((it) => { it._np = needPickShot; if (needPickShot && ctx.sec) it.secT = ctx.sec.t; if (ctx.lvl && !needPickShot) it.lvl = ctx.lvl; if (ctx.excl) it.excl = ctx.excl; }); }
    });
    if (pendLoc) items.push({ src: sents[sents.length - 1], kind: 'none', res: '需人处理', why: '只写了第几镜，没写要改什么，没有改', shots: [] });
    function sentence(s0, s) {
      // 守卫优先识别
      if (R.guard.dialogue.test(s)) { items.push({ src: s0, kind: 'guard', guard: '台词', res: '待导演确认', why: '碰到台词（含语速）', shots: baseShots.length < 40 ? baseShots : [] }); return; }
      if (R.guard.state.test(s) && !/雨|光/.test(s)) { const m = s.match(R.guard.state)[0]; const ev = /瘸|跛/.test(s) ? '文 L187：站起时歪了一下，调整重心便站住；原文没写持续跛行' : '涉及跨场状态'; items.push({ src: s0, kind: 'guard', guard: '跨场状态', res: '待导演确认', why: `命中状态词「${m}」：${ev}`, ask: /瘸|跛/.test(s) ? '原文没写跛行，可能是视频多生成了。要在提示词里加「不跛行」吗？' : null, shots: baseShots.length < 40 ? baseShots : [] }); return; }
      if (R.guard.event.test(s) && !/雨|雾|机器人|光/.test(s)) { items.push({ src: s0, kind: 'guard', guard: '事件', res: '待导演确认', why: '碰到事件（增删、换序、换人）', shots: [], segShots: baseShots.length < 40 ? baseShots.slice() : [] }); return; }
      // 已满足：红光别上脸
      if (/红光/.test(s) && /(别|不要|不).{0,3}上脸|别照脸/.test(s)) {
        const ss = baseShots.filter((id) => (WB.shot(S.st, id).lighting.l3path || []).length);
        const on = ss.filter((id) => WB.shot(S.st, id).lighting.l3path.some((x) => x.onFace)); const off = ss.filter((id) => !on.includes(id));
        if (on.length) { items.push({ src: s0, kind: 'guard', guard: '事件', res: '待导演确认', why: '红光上脸是剧本写的：' + on.map((x) => x.slice(4) + '「' + WB.shot(S.st, x).lighting.summary + '」').join('；') + (off.length ? '。其余 ' + off.map((x) => x.slice(4)).join('、') + ' 已经不上脸' : ''), shots: on }); return; }
        if (off.length) { items.push({ src: s0, kind: 'satisfied', res: '已满足', why: '现在已经是这样：' + off.map((x) => x.slice(4) + '「' + WB.shot(S.st, x).lighting.summary + '」').join('；') + '（数 lighting.l3path，onFace=否）', shots: off }); return; }
        items.push({ src: s0, kind: 'satisfied', res: '已满足', why: '这个范围里没有红光扫过的镜头', shots: [] }); return;
      }
      // 歧义
      const amb = R.ambiguous.find((a) => a.re.test(s));
      if (amb) { items.push({ src: s0, kind: 'pick', res: '待补选', why: '这句话有几种改法，请选一种', options: amb.options.map((o) => ({ field: o[0], value: o[1], label: o[2] })), shots: baseShots }); return; }
      // 对视
      if (R.gaze.re.test(s) || (gazeCtx && /克制|压|收|停顿|停/.test(s))) {
        gazeCtx = true;
        const gs = R.gaze.shots.filter((x) => (narrow ? baseShots.includes(x) : (!gid || scope !== 'seg' || WB.group(S.st, gid).shots.includes(x))));
        if (!gs.length && narrow) { const mb = baseShots.filter((x) => R.gaze.maybe.includes(x)); const opts = []; if (/克制|压|收/.test(s)) opts.push({ field: 'perf.intensity', value: '克制', label: '按本镜处理：情绪收到克制' }); if (/停顿|停/.test(s)) { const pd = E4.pauseDir(s); if (pd === 1) opts.push({ field: 'rhythm.pause', value: '+1.0', label: '按本镜处理：停顿 +1.0″' }); else if (pd === 'stop') opts.push({ field: 'rhythm.pause', value: '0', label: '按本镜处理：不停顿' }); }
          items.push(opts.length ? { src: s0, kind: 'pick', res: '待补选', why: baseShots.map((x) => +x.slice(5)).join('、') + ' 镜不在规则包的对视镜（' + R.gaze.shots.map((x) => +x.slice(5)).join('、') + '）里' + (mb.length ? '，可能是对视镜（待确认）' : '') + '：要按本镜改就选一项，不选不改', options: opts, shots: baseShots.slice() } : { src: s0, kind: 'none', res: '需人处理', why: '本镜不在对视镜里，这句没有可改的项', shots: [] }); return; }
        if (/克制|压|收/.test(s)) items.push({ src: s0, kind: 'set', field: 'perf.intensity', value: '克制', shots: gs, why: '对视镜：' + gs.map((x) => x.slice(4) + '（' + R.gaze.evidence[x] + '）').join('、'), maybe: R.gaze.maybe });
        if (/停顿|停/.test(s)) { const pd = E4.pauseDir(s); if (pd === null) items.push({ src: s0, kind: 'none', res: '需人处理', why: '停顿要长还是要短没说清（或两个方向都写了），没有改', shots: [] });
          else { /* 按各镜当前档位和方向算目标：更长＝至少 +1.0″ 且至少升一档（到 +1.5″ 封顶，不会降）；短＝降一档；别停＝归 0 */ const PT = R.fields['rhythm.pause'].tiers; const byV = new Map(); gs.forEach((x) => { const cv = String(E4.val(S, 'rhythm.pause', x).v || '0'); const i0 = Math.max(0, PT.indexOf(cv)); const nv = pd === 'stop' ? '0' : pd === -1 ? PT[Math.max(0, i0 - 1)] : PT[Math.min(PT.length - 1, Math.max(PT.indexOf('+1.0'), i0 + 1))]; if (!byV.has(nv)) byV.set(nv, []); byV.get(nv).push(x); }); byV.forEach((xs, nv) => items.push({ src: s0, kind: 'set', field: 'rhythm.pause', value: nv, shots: xs, why: pd === 'stop' ? '对视镜不停顿（停顿归 0）' : pd === -1 ? '对视镜停顿短一档 → ' + nv + '″' : '对视镜停顿加长 → ' + nv + '″（档位值，到 +1.5″ 封顶）', maybe: R.gaze.maybe })); } }
        return;
      }
      let hit = false;
      Object.keys(R.fields).forEach((fk) => {
        const F = R.fields[fk]; if (F.derived || !F.synonyms) return;
        if (pickedLayers && !pickedLayers.includes(F.layer)) return;
        const up = (F.synonyms.up || []).find((w) => s.includes(w)); const dn = (F.synonyms.down || []).find((w) => s.includes(w));
        if (!up && !dn) return; hit = true;
        let dir = up ? 1 : -1; if (up && dn) dir = s.indexOf(up) > s.indexOf(dn) ? 1 : -1;
        if (fk === 'rhythm.dur') { items.push({ src: s0, kind: 'dur', field: fk, delta: dir === -1 ? +0.5 : -0.5, shots: needPickShot || (!narrow && baseShots.length > 1) ? [] : baseShots.slice(), needShot: needPickShot || (!narrow && baseShots.length > 1 ? baseShots.slice() : null), res: !needPickShot && !narrow && baseShots.length > 1 ? '待补选' : undefined, /* 没写哪一镜：不默认第一镜，请人补选 */ why: dir === -1 ? '放慢一档（+0.5″，档位值，不是反馈原话指定的数字）' : '加快一档（−0.5″）' }); return; }
        const shots = E4.fieldShots(S, fk, baseShots);
        if (F.match && !shots.length) { items.push({ src: s0, kind: 'none', res: '需人处理', why: `「${F.label}」在这个范围里没有对应的镜头`, shots: [] }); return; }
        const cur = F.cur === null || F.cur === undefined ? null : E4.val(S, fk, shots[0]).v;
        if (fk === 'perf.intensity') { items.push({ src: s0, kind: 'step', field: fk, dir, shots, why: `${F.label}：往${dir === -1 ? '克制' : '外放'}方向移一档（当前档按镜头表演描述判断，属岗位判断，可改选）` }); return; }
        if (cur === null) { items.push({ src: s0, kind: 'pick', res: '待补选', why: `「${F.label}」原文没写，当前值无依据，请选档`, options: F.tiers.filter((t) => t !== '0').map((t) => ({ field: fk, value: t, label: t + (F.unit || '') })), shots }); return; }
        /* 相对调整按「会被改到的镜」各自的当前值算目标（不拿第一镜或保留另设的镜当基准）；当前值不同的镜分组，各升／降一档 */
        const tiers = F.tiers; const chg = shots.filter((x) => !E4.keepsOwn(S, x, fk, ctx.lvl || scope)); const keep = shots.filter((x) => !chg.includes(x)); const basis = chg.length ? chg : shots;
        const byCur = new Map(); basis.forEach((x) => { const v = String(E4.val(S, fk, x).v); if (!byCur.has(v)) byCur.set(v, []); byCur.get(v).push(x); });
        let first = true; byCur.forEach((grp, cv) => { let idx = tiers.indexOf(cv); if (idx < 0) idx = Math.floor(tiers.length / 2); let ni = Math.max(0, Math.min(tiers.length - 1, idx + dir));
          const gs = first && chg.length ? grp.concat(keep) : grp; first = false;
          items.push({ src: s0, kind: 'set', field: fk, value: tiers[ni], from: tiers[idx], shots: gs, why: `${F.label}：${tiers[idx]} → ${tiers[ni]}` + (byCur.size > 1 ? `（${grp.map((x) => +x.slice(5) + ' 镜').join('、')}）` : '') }); });
      });
      if (!hit) items.push({ src: s0, kind: 'none', res: '需人处理', why: '规则包里没有这种说法（没听懂是哪一块，可以点选「改哪一块」，或交给团队）', shots: [] });
    }
    // 范围：岗位入口越界
    items.forEach((it) => {
      const np = it._np; delete it._np; E4.guardCrew(it, crew, opt.entry, np);
      // 跨场：落在决定场尾状态的镜、并且字段影响末场卡 → 与末场卡同组待确认
      if ((it.kind === 'set' || it.kind === 'step') && it.res === '可应用') {
        const tail = (it.shots || []).filter((x) => R.endStateShots.includes(x)); const rest = (it.shots || []).filter((x) => !R.endStateShots.includes(x));
        if (tail.length) { it.split = { tail, rest }; }
      }
      // 联动
      if (it.kind === 'set' && R.fields[it.field].link) it.links = R.fields[it.field].link.map((lf) => ({ field: lf, value: (it.value === '+1' || it.value === '+2') ? '多' : it.value === '-1' ? '少' : '中', crew: R.layers[R.fields[lf].layer].crew }));
    });
    // 机器人数量 + 幅度同句：「施工机器人多一些，动作幅度大一点」
    return { text, scope, gid, sid, crew, items, needPickShot: firstNp, secShots };
  };

  /* ---------- 应用（只应用可应用项；落在场尾镜的项＋末场卡对应项 → 同一个待确认组） ---------- */
  const T0 = () => (typeof performance !== 'undefined' ? performance : Date).now();
  const snap = (S) => { const o = {}; S.st.data.groups.forEach((g) => { o[g.id] = S.ver[g.id].text; }); return o; };
  E4.stepReady = function (S, it) { // step 项：每个镜都得有当前档
    if (it.kind !== 'step') return true; const F = R.fields[it.field];
    const bad = it.shots.filter((id) => E4.perfCur(S, id) === null); if (!bad.length) return true;
    it.kind = 'pick'; it.res = '待补选'; it.why = `「${F.label}」${bad.map((x) => x.slice(4)).join('、')} 的当前档无依据（表演描述里判断不出），请直接选档`; it.options = F.tiers.map((t) => ({ field: it.field, value: t, label: t })); return false;
  };
  /* 停顿方向：1＝更长，-1＝更短，'stop'＝别停，null＝说不清／两个方向都有 */
  E4.pauseDir = function (s) { if (/(?:不要|别|不用|不必)\s*停(?:顿)?\s*(?:太|那么|这么|过于|得)?\s*(?:久|长)/.test(s)) return -1; if (/(?:不要|别|不用|不必|不能|没必要)\s*(?:太|那么|这么|过于)?\s*(?:长|久)|停(?:顿)?\s*(?:不要|别|不用|不必)\s*(?:太|那么|这么|过于)?\s*(?:长|久)/.test(s)) return -1; if (/(?:不要|别|不用|不必)\s*(?:太|那么|这么|过于)?\s*(?:短|少)/.test(s)) return null; const neg = /(?:不|别|没|勿|无需)/.test(s.replace(/别停|不要停|不停|不用停|不要太|别太/g, '')); const stop = /别停|不要停|不停|不用停|去掉停顿|取消停顿/.test(s); const dn = /停顿?\s*(?:更|再)?\s*(?:短|少)|少停|减少停顿|缩短停顿|停短/.test(s); const up = /停顿?\s*(?:更|再)?\s*(?:长|久|多)|多停|停久|加长停顿|留白|停一下|停顿一下/.test(s) || (/停顿/.test(s) && !dn && !stop); const n = [stop, dn, up].filter(Boolean).length; if (n !== 1 || (neg && !stop)) return null; return stop ? 'stop' : dn ? -1 : 1; };
  E4.commit = function (S, rec, items, optIn) {
    const opt = optIn; // 每项按实际作用范围（句内点名单镜＝本镜）记来源层级，见下
    let pg = S.pending.find((p) => p.fid === rec.id && p.status === '待导演确认');
    const newPg = !pg; if (!pg) { const nOld = S.pending.filter((p) => p.fid === rec.id).length; pg = { id: 'PG' + rec.id + (nOld ? '-' + (nOld + 1) : ''), fid: rec.id, items: [], status: '待导演确认', label: '' }; }
    let n = 0;
    items.forEach((it) => {
      const opt = it.lvl ? Object.assign({}, optIn || {}, { scope: it.lvl }) : optIn;
      if (it.res !== '可应用') { if (it.res === '待导演确认' && !pg.items.includes(it)) pg.items.push(it); return; }
      if (!E4.stepReady(S, it)) return;
      if (it.kind === 'set' && it.field === 'rhythm.pause') { const add = parseFloat(it.value) || 0; const bad = it.shots.filter((sid) => !(!it.force && E4.keepsOwn(S, sid, it.field, (opt && opt.scope) || 'scene')) && WB.shot(S.st, sid).duration + add - (parseFloat((S.layers.shot[sid] || {})['rhythm.pause']) || 0) < 1); if (bad.length) { it.res = '需人处理'; it.why = '这样改会让 ' + bad.map((x) => +x.slice(5) + ' 镜').join('、') + '短于 1″，没有改'; return; } }
      if (it.kind === 'dur') { const bad = it.shots.filter((sid) => WB.shot(S.st, sid).duration + it.delta < 1); if (bad.length) { it.res = '需人处理'; it.why = '再快就短于 1″（' + bad.map((x) => +x.slice(5) + ' 镜现在 ' + WB.shot(S.st, x).duration + '″').join('、') + '），没有改；要改请拆镜或调其他镜'; return; } }
      if (it.kind === 'set' || it.kind === 'step') {
        const tail = it.shots.filter((x) => R.endStateShots.includes(x)); const rest = it.shots.filter((x) => !R.endStateShots.includes(x));
        if (tail.length) {
          const t = Object.assign({}, it, { shots: tail, res: '待导演确认', tailOf: it.src }); if (it.field === 'env.rain' && tail.includes(E4.weatherShot(S))) t.endCard = 'weather';
          if (it.field === 'env.rain' && tail.includes('S04-C030')) t.note = 'C030 是水坑倒影镜（文 L188），大雨下倒影可能看不清：要不要这一镜单独保持原雨势？';
          pg.items.push(t); it.shots = rest;
          it.resNote = rest.length ? `${rest.length} 镜已应用；场尾 ${tail.map((x) => x.slice(4)).join('、')} 的这项改动${t.endCard ? '和末场卡「天气」' : ''}同组待导演确认` : `落在场尾（${tail.map((x) => x.slice(4)).join('、')}），${t.endCard ? '和末场卡「天气」' : ''}同组待导演确认`;
          if (!rest.length) { it.res = '待导演确认'; it.inGroup = true; return; }
        }
      }
      // 本段/本镜另设保留：整场改动不覆盖
      if (opt && (opt.scope === 'scene' || opt.scope === 'seg') && !it.force && (it.kind === 'set' || it.kind === 'step')) { const own = it.shots.filter((x) => E4.keepsOwn(S, x, it.field, opt.scope)); if (own.length) { it.ownNote = '这些镜有自己的设定，没跟着改：' + own.map((x) => x.slice(4)).join('、'); it.ownShots = own.slice(); } }
      E4.applyItem(S, it, opt); it.res = '已应用'; n++;
      if (it.kind === 'set' && R.fields[it.field].link) R.fields[it.field].link.forEach((lf) => { const lv = (it.value === '+1' || it.value === '+2') ? '多' : it.value === '-1' ? '少' : '中'; const li = { src: '（联动）', kind: 'set', field: lf, value: lv, shots: it.shots.slice(), link: true, res: '已应用', review: R.layers[R.fields[lf].layer].crew, layer: R.fields[lf].layer, crew: R.layers[R.fields[lf].layer].crew, why: '联动：' + R.fields[lf].label + ' → ' + lv + '（规则包写明的一一对应；待' + R.crews[R.layers[R.fields[lf].layer].crew].label + '复核）' }; E4.applyItem(S, li, { scope: (opt && opt.scope) || 'shot' }); items.push(li); });
    });
    if (newPg && pg.items.length) { pg.label = [...new Set(pg.items.map((x) => x.guard ? x.guard + '：' + x.src : (R.fields[x.field] ? R.fields[x.field].label : '') + (x.endCard ? '＋末场卡天气' : '')))].join('、'); S.pending.push(pg); }
    if (pg.items.length) rec.pendGroup = pg.id;
    return n;
  };
  E4.recOf = (it) => ({ src: it.src, kind: it.kind, field: it.field, value: it.value, dir: it.dir, delta: it.delta, guard: it.guard, res: it.res, why: it.why, shots: it.shots, options: it.options, needShot: it.needShot, review: it.review, resNote: it.resNote, ownNote: it.ownNote, lvl: it.lvl, excl: it.excl, ask: it.ask, maybe: it.maybe, layer: it.layer, crew: it.crew, link: it.link, note: it.note, inGroup: it.inGroup, segShots: it.segShots, ownShots: it.ownShots, ownForced: it.ownForced });
  E4.submit = function (S, text, opt) {
    const t0 = T0(); opt = opt || {}; const p = E4.parse(S, text, opt); const fid = 'FB' + (++S.seq); const before = snap(S);
    const rec = { id: fid, text, scope: p.scope, gid: p.gid, sid: p.sid, crew: p.crew, entry: opt.entry, role: S.role, time: now(), items: p.items, pendGroup: null, parentVer: Object.fromEntries(Object.entries(S.ver).map(([k, v]) => [k, v.n])), secShots: p.secShots };
    E4.commit(S, rec, rec.items, opt);
    const vers = E4.bump(S, '反馈 ' + fid + '：' + text.slice(0, 30), fid); rec.versions = vers; E4.noChange(S, rec, vers);
    S.fb.push(rec); S.journal.push({ t: 'fb', fid, text, opt: { scope: opt.scope, gid: opt.gid, sid: opt.sid, crew: opt.crew, layers: opt.layers, entry: opt.entry } });
    const diff = E4.diff(before, S); return { rec, diff, ms: T0() - t0, vers, missing: E4.missing(S, rec) };
  };
  /* 补选并重新合成：一次补齐位置和改法，只出一个新版本 */
  E4.resolve = function (S, fid, choice) {
    const t0 = T0(); const rec = S.fb.find((f) => f.id === fid); const before = snap(S); choice = choice || {};
    rec.items.forEach((it, i) => {
      const pickShot = (choice.shots && choice.shots[i]) || choice.shot; // 每项独立选择；选的镜必须在这一项的候选里
      if (it.needShot && pickShot && it.needShot.includes(pickShot)) { it.shots = [pickShot]; it.needShot = null; it.at = pickShot; it.lvl = 'shot'; if (it.field && R.fields[it.field].match) it.shots = E4.fieldShots(S, it.field, it.shots); }
      const pk = choice.picks && choice.picks[i];
      if (pk && it.kind === 'pick') { it.kind = 'set'; it.field = pk.field; it.value = pk.value; it.layer = R.fields[pk.field].layer; it.crew = R.layers[it.layer].crew; it.why = R.fields[pk.field].label + ' → ' + pk.label; if (!it.shots || !it.shots.length) it.shots = rec.sid ? [rec.sid] : rec.gid ? WB.group(S.st, rec.gid).shots.slice() : S.st.data.shots.map((x) => x.id); if (R.fields[pk.field].match) it.shots = E4.fieldShots(S, pk.field, it.shots); }
      if (it.res === '待补选' && !it.needShot && it.kind !== 'pick') { it.res = '可应用'; E4.guardCrew(it, S.role === '导演' ? (rec.crew || '导演') : S.role, S.role === '导演' ? rec.entry : 'crew', null); }
    });
    const fresh = rec.items.filter((it) => it.res !== '已应用'); E4.commit(S, rec, rec.items, { scope: rec.scope });
    const vers = E4.bump(S, '补选 ' + fid, fid); Object.assign(rec.versions = rec.versions || {}, vers); E4.noChange(S, rec, vers, fresh);
    S.journal.push({ t: 'resolve', fid, choice });
    return { rec, diff: E4.diff(before, S), vers, ms: T0() - t0, missing: E4.missing(S, rec) };
  };
  /* 范围优先级（统一一处）：本镜另设 > 本段另设 > 整场。较大范围的改动不覆盖较小范围已有的设定（设置、步进、联动都走这里）；
     要统一覆盖须显式 force（「这些也一起改」）。来源未记录的镜级值按「本镜另设」算 */
  const RANK = { scene: 0, seg: 1, shot: 2 };
  E4.keepsOwn = function (S, sid, field, scope) {
    const r = RANK[scope] === undefined ? 2 : RANK[scope]; if (r >= 2) return false;
    const sh = (S.layers.shot[sid] || {})[field]; if (sh !== undefined) { const s0 = (S.layers.src || {})[sid + '|' + field]; const rr = RANK[s0] === undefined ? 2 : RANK[s0]; if (rr > r) return true; }
    if (r === 0) { const g = WB.groupOf(S.st, sid); if (g && (S.layers.seg[g.id] || {})[field] !== undefined) return true; }
    return false;
  };
  E4.applyItem = function (S, it, opt) {
    const scope = (opt && opt.scope) || 'scene'; if (!(opt && opt.replay)) { it.aseq = (S.aseq = (S.aseq || 0) + 1); it.ascope = scope; }
    if (opt && opt.replay && it.kind === 'step') { const srcS = S.layers.src = S.layers.src || {}; Object.entries(it.steps || {}).forEach(([sid, v]) => { (S.layers.shot[sid] = S.layers.shot[sid] || {})[it.field] = v[1]; srcS[sid + '|' + it.field] = it.ascope || 'shot'; }); return; }
    if (it.kind === 'dur') { it.shots.forEach((sid) => { const s = WB.shot(S.st, sid); s.duration = r1(s.duration + it.delta); }); return; }
    if (it.kind === 'step') { const F = R.fields[it.field]; it.steps = {}; const srcS = S.layers.src = S.layers.src || {}; it.shots.forEach((sid) => { const k = sid + '|' + it.field; if (!it.force && E4.keepsOwn(S, sid, it.field, scope)) return; srcS[k] = scope; const c = E4.perfCur(S, sid); const i = F.tiers.indexOf(c); const ni = Math.max(0, Math.min(F.tiers.length - 1, i + it.dir)); (S.layers.shot[sid] = S.layers.shot[sid] || {})[it.field] = F.tiers[ni]; it.steps[sid] = [c, F.tiers[ni]]; }); const v = Object.values(it.steps); if (v.length) it.why = `${F.label}：${v[0][0]} → ${v[0][1]}（当前档按镜头表演描述判断，属岗位判断，可改选）`; return; }
    if (it.kind !== 'set') return;
    const F = R.fields[it.field];
    if (it.field === 'rhythm.pause') { const add = parseFloat(it.value) || 0; const srcP = S.layers.src = S.layers.src || {}; it.shots.forEach((sid) => { if (!it.force && E4.keepsOwn(S, sid, it.field, scope)) return; srcP[sid + '|' + it.field] = scope; const prev = parseFloat((S.layers.shot[sid] || {})['rhythm.pause']) || 0; const s = WB.shot(S.st, sid); s.duration = r1(s.duration + add - prev); (S.layers.shot[sid] = S.layers.shot[sid] || {})['rhythm.pause'] = it.value; }); return; }
    const allShots = S.st.data.shots.map((x) => x.id);
    if (scope === 'scene' && !F.match && it.shots.length === allShots.length) { S.layers.scene[it.field] = it.value; return; }
    const src = S.layers.src = S.layers.src || {}; it.shots.forEach((sid) => { const k = sid + '|' + it.field; if (!it.force && E4.keepsOwn(S, sid, it.field, scope)) return; (S.layers.shot[sid] = S.layers.shot[sid] || {})[it.field] = it.value; src[k] = scope; });
  };
  E4.bump = function (S, reason, fid) {
    const out = {};
    S.st.data.groups.forEach((g) => { const c = E4.compile(S, g.id); const sha = WB.sha8(c.text); const V = S.ver[g.id]; if (sha !== V.sha) { V.n += 1; V.sha = sha; const prev = V.text; V.text = c.text; V.hist.push({ n: V.n, sha, reason, time: now(), parent: V.hist[V.hist.length - 1].sha, fid, prevText: prev, text: c.text }); out[g.id] = V.n; } });
    return out;
  };
  /* 正文没变时不能说「已应用」 */
  E4.noChange = function (S, rec, vers, only) {
    if (Object.keys(vers || {}).length) return;
    rec.items.filter((it) => !only || only.includes(it)).forEach((it) => { if (it.res === '已应用' && !it.link && it.kind !== 'dur') { it.res = '已满足'; it.why = (it.why || '') + '；提示词正文没有变化（现在已经是这个效果），没有出新版本'; } });
  };
  E4.diff = function (before, S) {
    const out = {};
    Object.keys(before).forEach((gid) => { const a = before[gid].split('\n'); const b = S.ver[gid].text.split('\n'); const A = new Set(a), B = new Set(b);
      const add = b.filter((l) => l && !A.has(l)); const del = a.filter((l) => l && !B.has(l)); if (add.length || del.length) out[gid] = { add, del }; });
    return out;
  };
  E4.missing = function (S, rec) {
    const m = [];
    rec.items.forEach((it) => {
      if (it.field === 'env.rain' && it.kind === 'set') m.push({ t: '黑雨新雨势的参考图：文件未提供，待核（FX-04）', go: 'assets' });
      if (it.field === 'env.robots' || (it.options || []).some((o) => o.field === 'env.robots')) m.push({ t: '施工机器人：没登记，缺资产码', go: 'assets' });
      if (it.res === '待导演确认') m.push({ t: '等导演确认：' + (it.guard ? it.guard + '「' + it.src + '」' : (R.fields[it.field] ? R.fields[it.field].label : '')) + (it.ask ? '——' + it.ask : ''), go: 'pending' });
      if (it.res === '需人处理') m.push({ t: '这句需要人处理：「' + it.src + '」', go: 'handoff' });
      if (it.res === '转为建议' && !it.sugg && it.crew && R.crews[it.crew]) m.push({ t: '已记录为给' + R.crews[it.crew].label + '的建议（正文没改），等' + R.crews[it.crew].label + '在待办里采纳或不采纳', go: 'handoff', sugg: true });
      if (it.sugg) m.push({ t: R.crews[it.crew].label + (it.sugg.ok ? '已采纳这条建议（' + it.sugg.fid + '）' : '没采纳这条建议'), go: 'fb', sugg: true });
      if (it.res === '导演已批准，待人落实') m.push({ t: '导演已批准、还没落实到剧本／数据：「' + it.src + '」（提示词正文没变）', go: 'handoff' });
      if (it.res === '待补选') m.push({ t: '请补选：' + (it.needShot ? '第几镜（' + it.needShot.map((x) => x.slice(4)).join(' 或 ') + '）' : it.why), go: 'pick' });
      if (it.review && !it.reviewed) m.push({ t: '待' + R.crews[it.review].label + '复核（' + R.fields[it.field].label + '）', go: 'review' });
      if (it.review && it.reviewed && !it.reviewed.ok) m.push({ t: R.crews[it.review].label + '不同意这项代改（' + R.fields[it.field].label + '），等导演决定', go: 'review' });
    });
    S.st.data.groups.forEach((g) => { const c = E4.compile(S, g.id); const e = c.errors.filter((x) => !/超过 30/.test(x)); if (e.length) m.push({ t: '第 ' + g.id.slice(1) + ' 段现在不能复制：' + e[0], go: 'seg', red: true }); });
    S.st.data.groups.forEach((g) => { const sec = WB.groupSec(S.st, g); if (sec > 30) m.push({ t: '第 ' + g.id.slice(1) + ' 段 ' + sec + '″，超过 30″（可拆段或换组边界，由导演视听确认）', go: 'seg', red: true }); });
    { const pg = S.pending.find((p) => p.fid === rec.id && p.status === '待导演确认'); if (pg && pg.items.some((x) => x.tailOf)) m.push({ t: '场尾 ' + [...new Set(pg.items.filter((x) => x.tailOf).flatMap((x) => x.shots))].map((x) => +x.slice(5)).join('、') + ' 镜的这项改动等导演确认', go: 'pending' }); }
    { const pg = S.pending.find((p) => p.id === rec.pendGroup); if (pg && pg.status === '已确认' && pg.items.some((x) => x.endCard)) m.push({ t: '第 5 场继承项「黑雨声很近」（后 L728）已按导演确认的雨势（' + S.endWeather + '）更新，请在下一场卡核对', go: 'next' }); }
    if ((S.pending.find((p) => p.id === rec.pendGroup && p.status === '待导演确认') || { items: [] }).items.some((x) => x.endCard)) m.push({ t: '第 5 场继承项「黑雨声很近」（后 L728）要等改动组确认后才更新', go: 'next' });
    const seen = new Set(); return m.filter((x) => (seen.has(x.t) ? false : seen.add(x.t)));
  };
  /* 状态检查点：提交前存、校验失败整体退回（不落地） */
  // 轻量检查点：只记撤回／确认会动到的字段，退回时保持对象引用不变
  const ckpt = (S) => ({ durs: S.st.data.shots.map((x) => x.duration), layers: JSON.stringify(S.layers), ew: S.endWeather, jn: S.journal.length,
    its: S.fb.flatMap((f) => f.items).concat(S.pending.flatMap((p) => p.items)).map((it) => [it, it.res, it.resBefore]), fbs: S.fb.map((f) => [f, f.reverted, f.versions]), pgs: S.pending.map((p) => [p, p.status, p.items.length, p.by, p.time]) });
  const rollback = (S, c) => { S.st.data.shots.forEach((x, i) => { x.duration = c.durs[i]; }); S.layers = JSON.parse(c.layers); S.endWeather = c.ew; S.journal.length = c.jn;
    c.its.forEach(([it, r, rb]) => { it.res = r; if (rb === undefined) delete it.resBefore; else it.resBefore = rb; }); c.fbs.forEach(([f, r, v]) => { if (r) f.reverted = r; else delete f.reverted; f.versions = v; }); c.pgs.forEach(([p, st, n, by, t]) => { p.status = st; p.items.length = n; p.by = by; p.time = t; }); };
  /* 末场天气＝场尾最后一个有雨的镜的生效雨势（C030 等单镜例外不影响） */
  E4.weatherShot = (S) => { const m = E4.fieldShots(S, 'env.rain', R.endStateShots); return (m.length ? m : R.endStateShots)[(m.length ? m : R.endStateShots).length - 1]; };
  E4.deriveWeather = (S) => { const v = E4.val(S, 'env.rain', E4.weatherShot(S)); S.endWeather = v.from === '默认' ? undefined : v.v; return S.endWeather; };
  E4.endWeatherOk = (S) => { const v = E4.val(S, 'env.rain', E4.weatherShot(S)); return (v.from === '默认' ? undefined : v.v) === S.endWeather; };
  E4.badDur = (S) => S.st.data.shots.filter((s) => !(s.duration >= 1)).map((s) => +s.id.slice(5) + ' 镜 ' + s.duration + '″');
  /* 待确认组预检：按现在的镜长算，确认后会不会有镜短于 1″ */
  E4.pendingCheck = function (S, pg) { const d = {}; S.st.data.shots.forEach((s) => { d[s.id] = s.duration; }); pg.items.forEach((it) => { if (it.kind === 'dur') it.shots.forEach((sid) => { d[sid] = r1(d[sid] + it.delta); }); if (it.kind === 'set' && it.field === 'rhythm.pause') { const add = parseFloat(it.value) || 0; it.shots.forEach((sid) => { d[sid] = r1(d[sid] + add - (parseFloat((S.layers.shot[sid] || {})['rhythm.pause']) || 0)); }); } }); return Object.keys(d).filter((k) => d[k] < 1).map((k) => +k.slice(5) + ' 镜会变成 ' + d[k] + '″'); };
  /* 待确认组：导演确认＝整组应用；撤销＝整组 */
  E4.confirmPending = function (S, pid, ok) {
    if (S.role !== '导演') return { ok: false, msg: '只有导演可以确认；你现在的视角是「' + S.role + '」' };
    const pg = S.pending.find((p) => p.id === pid); if (!pg || pg.status !== '待导演确认') return null;
    if (ok) { const bad = E4.pendingCheck(S, pg); if (bad.length) return { ok: false, msg: '现在确认这组会让' + bad.join('、') + '（短于 1″），没有确认；请先调整镜长或撤销这组' }; }
    const cp = ckpt(S); const before = snap(S);
    if (ok) { pg.items.forEach((it) => { if (it.kind === 'set' || it.kind === 'dur' || it.kind === 'step') { E4.applyItem(S, it, { scope: 'shot' }); it.res = '已应用'; (it.kind === 'set' && R.fields[it.field].link || []).forEach((lf) => { const li = { kind: 'set', field: lf, value: it.value === '+1' || it.value === '+2' ? '多' : it.value === '-1' ? '少' : '中', shots: it.shots, res: '已应用', link: true }; E4.applyItem(S, li, { scope: 'shot' }); pg.items.push(li); }); } else if (it.guard) it.res = '导演已批准，待人落实'; }); pg.status = '已确认'; E4.deriveWeather(S); }
    else { pg.status = '已撤回'; pg.items.forEach((it) => { it.res = '已撤回'; }); }
    pg.by = S.role; pg.time = now(); S.journal.push({ t: 'pending', pid, ok });
    { const bad = E4.badDur(S); if (bad.length) { rollback(S, cp); return { ok: false, msg: '确认后会有镜短于 1″（' + bad.join('、') + '），没有确认' }; } }
    const vers = E4.bump(S, (ok ? '导演确认 ' : '撤回 ') + pid, pg.fid); const rec = S.fb.find((f) => f.id === pg.fid); if (rec) { rec.versions = Object.assign(rec.versions || {}, vers); rec.items.forEach((it) => { const m = pg.items.find((x) => x === it || (x.tailOf === it.src && x.field === it.field) || (!x.tailOf && x.src === it.src && x.kind === it.kind && x.guard === it.guard)); if (m && it.res === '待导演确认') it.res = m.res; }); }
    return { ok: true, diff: E4.diff(before, S), vers };
  };
  /* 撤回一条反馈：从基线按应用顺序重放（跳过这条），新建恢复版，历史保留 */
  E4.revert = function (S, fid) {
    const rec = S.fb.find((f) => f.id === fid); if (!rec || rec.reverted) return null;
    if (S.role !== '导演' && S.pending.some((p) => p.fid === fid && p.status === '已确认')) return { ok: false, msg: '这条里有导演已确认的改动（场尾或台词），只有导演能撤回' };
    if (S.role !== '导演' && rec.role !== S.role) return { ok: false, msg: '只能撤回自己提交的改动' };
    const cp = ckpt(S); const before = snap(S); rec.reverted = true; rec.items.forEach((it) => { it.resBefore = it.res; it.res = '已撤回'; });
    S.pending.filter((p) => p.fid === fid && p.status === '待导演确认').forEach((p) => { p.status = '已撤回'; });
    S.journal.push({ t: 'revert', fid }); E4.rebuild(S);
    { const bad = E4.badDur(S); if (bad.length) { rollback(S, cp); return { ok: false, msg: '撤回这条会让' + bad.join('、') + '（短于 1″；后面的镜长改动是在它的基础上做的），没有撤回；请先撤回后面的镜长改动' }; } }
    return { diff: E4.diff(before, S), vers: E4.bump(S, '撤回 ' + fid + '（恢复版）', fid) };
  };
  E4.rebuild = function (S) {
    S.st.data.shots.forEach((x) => { x.duration = S.base.dur[x.id]; }); S.layers = { scene: {}, seg: {}, shot: {} }; S.endWeather = undefined;
    const all = [];
    S.fb.filter((f) => !f.reverted).forEach((f) => f.items.forEach((it) => { if (it.aseq && it.res !== '已撤回') all.push(it); })); // 「已满足」也写过覆盖层，要重放
    S.pending.filter((p) => p.status === '已确认' && !(S.fb.find((f) => f.id === p.fid) || {}).reverted).forEach((p) => p.items.forEach((it) => { if (it.aseq) all.push(it); }));
    const done = new Set(); all.sort((a, b) => a.aseq - b.aseq).forEach((it) => { if (done.has(it.aseq)) return; done.add(it.aseq); E4.applyItem(S, it, { scope: it.ascope, replay: true }); }); E4.deriveWeather(S); // 末场卡天气从场尾镜实际生效值推导
  };

  /* ---------- 剧本编辑 ---------- */
  E4.litImpact = function (S, newLines) {
    const changed = []; newLines.forEach((t, i) => { if (t !== S.lit.lines[i]) changed.push(i + 1); });
    const shots = S.st.data.shots.filter((s) => s.literary && s.literary.lines && changed.some((n) => n >= s.literary.lines[0] && n <= s.literary.lines[1])).map((s) => s.id);
    const dl = S.st.data.literary.dialogue; const dlgLines = changed.filter((n) => dl.some((d) => d.line === n || d.zhLine === n));
    const enLines = changed.filter((n) => dl.some((d) => d.line === n));
    const state = changed.filter((n) => R.guard.state.test(newLines[n - 1]) !== R.guard.state.test(S.lit.lines[n - 1]) || (R.guard.state.test(newLines[n - 1]) && newLines[n - 1] !== S.lit.lines[n - 1]));
    const segs = [...new Set(shots.map((id) => WB.groupOf(S.st, id).id))];
    const tailHit = shots.some((x) => R.endStateShots.includes(x));
    return { changed, shots, segs, dlgLines, enLines, state, tailHit };
  };
  E4.litSubmit = function (S, newLines, by) {
    const imp = E4.litImpact(S, newLines); if (!imp.changed.length) return { none: true };
    if (by !== '导演') { S.lit.req.push({ id: 'LP' + (++S.seq), by, lines: newLines, base: S.lit.lines.slice(), imp, time: now(), status: '待导演定' }); return { proposal: true, imp }; }
    S.lit.hist.push({ n: S.lit.n, lines: S.lit.lines.slice(), time: now(), by }); S.lit.n += 1; S.lit.lines = newLines.slice();
    imp.dsync = E4.syncDialogue(S);
    imp.segs.forEach((g) => { S.lit.sync[g] = { since: S.lit.n, lines: imp.changed }; });
    S.journal.push({ t: 'lit', n: S.lit.n });
    const vers = E4.bump(S, '剧本第 ' + S.lit.n + ' 版', null);
    return { n: S.lit.n, imp, vers };
  };
  /* 英文台词行 = 原文：按台词 ID 把剧本当前版本的英文同步到镜头（恢复交接包时同样执行） */
  E4.syncDialogue = function (S) { const out = []; S.st.data.literary.dialogue.forEach((d) => { const nt = (S.lit.lines[d.line - 1] || '').trim(); if (!nt || nt === d.en) return; d.en = nt; S.st.data.shots.forEach((s) => s.dialogue.forEach((x) => { if (x.ref === d.id) { x.en = nt; out.push(s.id); } })); }); return [...new Set(out)]; };
  E4.litSig = (r) => WB.sha8(JSON.stringify([r.id, r.by, r.time, r.lines])); E4.litDecide = function (S, id, ok, sig) { if (S.role !== '导演') return { ok: false, msg: '剧本提议由导演定' }; const rs = S.lit.req.filter((x) => x.id === id); if (rs.length !== 1) return { ok: false, msg: '提议编号 ' + id + (rs.length ? ' 重复' : ' 找不到') + '，没有处理' }; const r = rs[0]; if (sig && sig !== E4.litSig(r)) return { ok: false, msg: '你点的那条提议和现在这条对不上（编号相同但内容不同），没有处理；请刷新后再点' }; if (r.status !== '待导演定') return { ok: false, msg: '这条提议已处理' }; S.journal.push({ t: 'litDecide', id, ok }); if (!ok) { r.status = '已拒绝'; r.time2 = now(); return { ok: true }; } const base = r.base || r.lines; const clash = r.imp.changed.filter((n) => S.lit.lines[n - 1] !== base[n - 1]); if (clash.length) return { ok: false, msg: '提议之后这几行又被改过：' + clash.map((n) => 'L' + n).join('、') + '，请对照后手动改' }; const nl = S.lit.lines.slice(); r.imp.changed.forEach((n) => { nl[n - 1] = r.lines[n - 1]; }); r.status = '已采纳'; r.time2 = now(); const out = E4.litSubmit(S, nl, '导演'); return Object.assign({ ok: true }, out); };
  E4.syncDone = function (S, gid, how) { delete S.lit.sync[gid]; S.journal.push({ t: 'sync', gid, how }); return E4.bump(S, '拍法同步 ' + gid, null); };

  /* ---------- 待办（按身份） ---------- */
  E4.todos = function (S, role) {
    const T = [];
    const add = (t, go, kind) => T.push({ t, go, kind });
    if (role === '导演') {
      if (!S.confirm.dir) add('选这一场怎么处理（推荐 A，总监代选｜待导演确认）', 'dir', 'dir');
      S.pending.filter((p) => p.status === '待导演确认').forEach((p) => { const bad = E4.pendingCheck(S, p); add('确认一组改动：' + p.label + (bad.length ? '（注意：按现在的镜长，确认会让' + bad.join('、') + '，会被拦）' : ''), 'pending', 'pending'); });
      Object.entries(S.decisions).filter(([k, d]) => d.mark && d.mark !== '导演已定').forEach(([k, d]) => add(d.title + '：' + (d.value || '未选') + '（' + d.mark + '）', 'decide', 'decide'));
      S.lit.req.filter((r) => r.status === '待导演定').forEach((r) => add('剧本修改提议（' + r.by + '，改 ' + r.imp.changed.length + ' 行）：在剧本卡里接受或拒绝', 'script', 'req'));
      S.fb.filter((f) => !f.reverted).forEach((f) => f.items.forEach((it) => { if (it.review && it.reviewed && !it.reviewed.ok && !it.dirSeen) add(R.crews[it.review].label + '不同意你的代改：' + (R.fields[it.field] ? R.fields[it.field].label : '') + ' → ' + it.value + '（' + f.id + '，可撤回这条）', 'fb', 'objection'); }));
    }
    if (role === '摄影') {
      if (!S.confirm.mount || S.confirm.mount.hash !== E4.mountHash(S)) add('确认挂载值：10 项器材与光学质感（视听补数代填，含「总监代选｜待导演确认」）', 'mount', 'mount');
      const nFill = (S.av && S.av.pending || []).filter((p) => p.v && !(S.confirm.fill || {})[p.k]).length; if (nFill && !(S.confirm.fill && S.confirm.fill.all)) add('核对 ' + nFill + ' 项「总监代填｜待视听确认」的推导值', 'fill', 'fill');
      const nNo = (S.av && S.av.pending || []).filter((p) => !p.v).length; if (nNo) add(nNo + ' 项没依据、没写进提示词，要视听补数据', 'fill', 'fill');
    }
    S.fb.filter((f) => !f.reverted).forEach((f) => f.items.forEach((it, idx) => { if (it.review && R.crews[it.review] && it.review === role && !it.reviewed && ['已应用', '已满足'].includes(it.res)) T.push({ t: '复核导演代改：' + (R.fields[it.field] ? R.fields[it.field].label : '') + ' → ' + it.value + '（' + f.id + '）', go: 'fb', kind: 'review', fid: f.id, idx }); }));
    S.fb.filter((f) => !f.reverted).forEach((f) => f.items.forEach((it, idx) => { if (it.res === '转为建议' && !it.sugg && it.crew === role) T.push({ t: '处理建议（来自' + (R.crews[f.role] ? R.crews[f.role].label : f.role) + '，' + f.id + '）：' + (it.field && R.fields[it.field] ? R.fields[it.field].label + ' → ' + (it.value != null ? it.value : (it.dir === -1 ? '降一档' : '升一档')) : it.src) + (it.shots && it.shots.length ? '（' + (it.shots.length > 3 ? it.shots.length + ' 镜' : it.shots.map((x) => +x.slice(5) + ' 镜').join('、')) + '）' : ''), go: 'todo', kind: 'sugg', fid: f.id, idx }); }));
    if (role === '美术') { S.extra.endCard.filter((c) => c.sign === '美术' && !E4.signOk(S, c.who + c.state)).forEach((c) => add((S.confirm.sign[c.who + c.state] ? '末场卡重签（内容改过，旧签失效）：' : '末场卡签字：') + c.who + ' · ' + c.cat + '（' + c.state.slice(0, 14) + '…）', 'end', 'sign')); S.extra.assets.forEach((a) => add(`还欠第 ${a.o} 件：${a.need}（文件${a.file}，${a.res}）`, 'next', 'asset')); }
    if (role === '表演') S.extra.endCard.filter((c) => c.sign === '表演' && !E4.signOk(S, c.who + c.state)).forEach((c) => add((S.confirm.sign[c.who + c.state] ? '末场卡重签（内容改过，旧签失效）：' : '末场卡签字：') + c.who + '·' + c.cat, 'end', 'sign'));
    if (role === '灯光') S.extra.endCard.filter((c) => c.sign === '灯光' && !E4.signOk(S, c.who + c.state)).forEach((c) => add((S.confirm.sign[c.who + c.state] ? '末场卡重签（内容改过，旧签失效）：' : '末场卡签字：') + c.cat, 'end', 'sign'));
    if (role === '剧作') { const cf = (S.extra.conflicts || []).find((x) => x.id === 'GEL'); const o = cf ? (cf.options.find((x) => x.id === cf.pick) || cf.options[0]) : null; const g = o ? o.id + '（' + o.t + '）' : S.decisions.gel.value; add(S.decisions.gel.mark === '导演已定' ? '凝胶冲突：导演已定 ' + g + '，按此执笔' + (o && o.loss ? '；要处理：' + o.loss : '') : '凝胶冲突改法：总监代选 ' + g + '，待导演确认后执笔', 'next', 'conflict'); S.lit.req.filter((r) => r.status === '待导演定').forEach((r) => add('你的剧本提议等导演定（' + r.imp.changed.map((n) => 'L' + n).join('、') + '）', 'script', 'req')); }
    if (role === '统筹') S.st.data.groups.forEach((g) => { if (!S.copies.some((c) => c.gid === g.id)) add(g.name.replace('组', '第 ') + ' 段还没复制', 'prompt', 'copy'); });
    return T;
  };

  /* ---------- 交接包（完整包 / 增量包） ---------- */
  E4.exportPkg = function (S, kind, toRole) {
    const full = { kind: kind || 'full', schema: 'lr-workbench-v4-pkg/1', time: now(), from: S.role, to: toRole || null, baseSha: S.baseSha, journalSha: WB.sha8(JSON.stringify(S.journal)),
      journal: S.journal, fb: S.fb, pending: S.pending, ver: Object.fromEntries(Object.entries(S.ver).map(([k, v]) => [k, { n: v.n, sha: v.sha, hist: v.hist.map((h) => ({ n: h.n, sha: h.sha, reason: h.reason, time: h.time, parent: h.parent, fid: h.fid, prevText: h.prevText, text: h.text })) }])),
      rulesVersion: R.version, deps: Object.assign({ shas: S.deps.shas }, (kind || 'full') === 'full' ? Object.assign(E4.packDeps(S), { note: '完整包：附基础镜头数据（含文学本）、规则包全文、参考清单全文、视听补数全文与合并后数据、场景附加数据；接收端依赖不同时可直接用包内依赖恢复' }) : {}), endWeather: S.endWeather, conflictPicks: (S.extra.conflicts || []).map((c) => ({ id: c.id, pick: c.pick, mark: c.mark })), avSha: S.av ? S.av.src.sha8 : null, lit: S.lit, confirm: S.confirm, decisions: S.decisions, layers: S.layers, durs: Object.fromEntries(S.st.data.shots.map((s) => [s.id, s.duration])), copies: S.copies, extraMount: S.extra.mount,
      todosFor: toRole ? E4.todos(S, toRole) : null };
    return full;
  };
  E4.packDeps = function (S) { return { data: JSON.parse(S.deps.orig), ref: JSON.parse(S.deps.refJ), rules: serR(R), av: S.av ? JSON.parse(JSON.stringify(S.av)) : null, merged: JSON.parse(S.deps.merged), avLog: S.deps.avLog, extra: JSON.parse(S.deps.extraJ) }; };
  /* 从完整包取依赖：逐项核对内容签名，对不上就拒绝 */
  E4.depsFromPkg = function (pkg) {
    const d = pkg && pkg.deps; if (!d || !d.shas || !d.data || !d.rules || !d.ref || !d.merged || (d.shas.av && !d.av)) return { ok: false, msg: '交接包只带了依赖签名、没带依赖内容，不能在本机恢复' };
    const bad = [];
    if (WB.sha8(JSON.stringify(d.data)) !== d.shas.data) bad.push('基础数据');
    if (WB.sha8(JSON.stringify(d.ref)) !== d.shas.ref) bad.push('参考清单');
    if (WB.sha8(JSON.stringify(revR(d.rules), (k, v) => (v instanceof RegExp ? v.source : v))) !== d.shas.rules) bad.push('规则包');
    if (WB.sha8(JSON.stringify(d.merged)) !== d.shas.merged) bad.push('视听补数合并后数据');
    if (d.av && WB.sha8(JSON.stringify(d.av)) !== d.shas.avc) bad.push('视听补数');
    if (d.extra && d.shas.extra && WB.sha8(JSON.stringify(Object.assign({}, d.extra, { mount: undefined }))) !== d.shas.extra) bad.push('场景附加数据');
    if (bad.length) return { ok: false, msg: '交接包里附带的' + bad.join('、') + '和签名对不上（被改过），不能导入' };
    const av = d.av ? Object.assign(clone(d.av), { apply: (data) => { const m = clone(d.merged); Object.keys(data).forEach((k) => { delete data[k]; }); Object.assign(data, m); return clone(d.avLog || []); } }) : null;
    return { ok: true, data: clone(d.data), ref: clone(d.ref), rules: d.rules, av, extra: d.extra ? clone(d.extra) : null };
  };
  E4.dupIds = function (pkg) { const ids = [].concat((pkg.fb || []).map((f) => f.id), ((pkg.lit || {}).req || []).map((r) => r.id)); const seen = new Set(); return [...new Set(ids.filter((x) => (seen.has(x) ? true : (seen.add(x), false))))]; };
  E4.importPreview = function (S, pkg) {
    if (!pkg || typeof pkg !== 'object' || pkg.schema !== 'lr-workbench-v4-pkg/1') return { ok: false, msg: '不是工作台交接包' };
    { const RL = ['导演', '美术', '摄影', '灯光', '表演', '剧作', '统筹']; const hb = []; if (!RL.includes(pkg.from)) hb.push('来自'); if (pkg.to != null && !RL.includes(pkg.to)) hb.push('给谁'); if (typeof pkg.baseSha !== 'string') hb.push('父版本'); if (pkg.todosFor != null && (!Array.isArray(pkg.todosFor) || pkg.todosFor.some((t) => !t || typeof t !== 'object' || typeof t.t !== 'string'))) hb.push('对方待办'); if (pkg.copies != null && !Array.isArray(pkg.copies)) hb.push('复制记录'); if (hb.length) return { ok: false, msg: '交接包结构不完整（' + hb.join('、') + '），不能导入' }; }
    { const bad = []; const isO = (x) => x && typeof x === 'object' && !Array.isArray(x);
      if (!Array.isArray(pkg.journal)) bad.push('操作日志'); if (!Array.isArray(pkg.fb)) bad.push('反馈记录'); if (!Array.isArray(pkg.pending)) bad.push('待确认组'); if (!isO(pkg.ver) || S.st.data.groups.some((g) => !isO(pkg.ver[g.id]))) bad.push('版本'); else if (S.st.data.groups.some((g) => { const v = pkg.ver[g.id]; return typeof v.n !== 'number' || typeof v.sha !== 'string' || !Array.isArray(v.hist) || !v.hist.length || v.hist.some((h) => !isO(h) || typeof h.n !== 'number' || typeof h.sha !== 'string' || typeof h.reason !== 'string' || (h.text !== undefined && typeof h.text !== 'string') || (h.prevText !== undefined && h.prevText !== null && typeof h.prevText !== 'string')); })) bad.push('版本历史');
      if (!isO(pkg.layers) || !['scene', 'seg', 'shot'].every((k) => isO(pkg.layers[k]))) bad.push('调整层'); if (!isO(pkg.lit) || !Array.isArray(pkg.lit.lines) || pkg.lit.lines.length !== S.base.lit.length || !Array.isArray(pkg.lit.req || [])) bad.push('剧本');
      if (!isO(pkg.confirm) || !isO(pkg.decisions) || !isO(pkg.durs)) bad.push('确认／拍板／镜长');
      else { const C = pkg.confirm; if (!['shots', 'sign', 'segOk'].every((k) => isO(C[k])) || ['maps', 'sketch', 'fill', 'dir', 'mount'].some((k) => C[k] != null && !isO(C[k]))) bad.push('确认（内层）'); if (Object.keys(S.decisions).some((k) => pkg.decisions[k] != null && !isO(pkg.decisions[k]))) bad.push('拍板（内层）'); if (Object.values(pkg.durs).some((d) => typeof d !== 'number')) bad.push('镜长（内层）'); }
      if (isO(pkg.lit) && (!isO(pkg.lit.sync) || !Array.isArray(pkg.lit.hist) || pkg.lit.hist.some((h) => !isO(h) || !Array.isArray(h.lines) || h.lines.some((l) => typeof l !== 'string')) || !Array.isArray(pkg.lit.req) || typeof pkg.lit.n !== 'number')) bad.push('剧本（内层）');
      const shotSet = new Set(S.st.data.shots.map((x) => x.id)); const idsOk = (v, opt) => (opt && (v === undefined || v === null)) || (Array.isArray(v) && v.every((x) => shotSet.has(x)));
      const itemOk = (it) => isO(it) && typeof it.kind === 'string' && typeof it.res === 'string' && idsOk(it.shots, false) && idsOk(it.needShot, true) && idsOk(it.segShots, true) && idsOk(it.ownShots, true) && (it.field === undefined || it.field === null || !!R.fields[it.field]) && (it.steps === undefined || isO(it.steps));
      if (Array.isArray(pkg.fb) && pkg.fb.some((f) => !isO(f) || typeof f.id !== 'string' || !Array.isArray(f.items) || !f.items.every(itemOk))) bad.push('反馈记录（内层）'); if (Array.isArray(pkg.pending) && pkg.pending.some((p) => !isO(p) || typeof p.id !== 'string' || !Array.isArray(p.items) || !p.items.every(itemOk))) bad.push('待确认组（内层）');
      if (bad.length) return { ok: false, msg: '交接包结构不完整（' + bad.join('、') + '），不能导入' }; }
    const dup = E4.dupIds(pkg); if (dup.length) return { ok: false, msg: '交接包里有重复编号（' + dup.join('、') + '），按编号操作会点错，不能导入' };
    let needDeps = null;
    if (pkg.deps && pkg.deps.shas) { const a = pkg.deps.shas, b = S.deps.shas; const diff = ['data', 'ref', 'rules', 'av', 'avc', 'merged', 'extra'].filter((k) => a[k] !== undefined && a[k] !== b[k]); const LB = { data: '基础数据', ref: '参考清单', rules: '规则包', av: '视听补数（原材料）', avc: '视听补数（整理后内容）', merged: '视听补数合并后的镜头数据', extra: '场景附加数据' };
      if (pkg.deps.data && WB.sha8(JSON.stringify(pkg.deps.data)) !== a.data) return { ok: false, msg: '交接包里附带的基础数据被改过，不能导入' };
      if (pkg.deps.rules) { const pd0 = E4.depsFromPkg(pkg); if (!pd0.ok) return { ok: false, msg: pd0.msg }; }
      if (diff.length) { const pd = E4.depsFromPkg(pkg); if (!pd.ok) return { ok: false, msg: '交接包和本机的依赖不一致（' + diff.map((k) => LB[k]).join('、') + '）：' + pd.msg }; needDeps = diff.map((k) => LB[k]); } }
    if (!needDeps && pkg.rulesVersion && pkg.rulesVersion !== R.version) return { ok: false, msg: '交接包用的规则包是 ' + pkg.rulesVersion + '，本机是 ' + R.version + '，不能导入' };
    if (!needDeps && pkg.baseSha !== S.baseSha) return { ok: false, msg: '交接包基于不同的基础数据（' + pkg.baseSha + '），不能导入' };
    const mine = S.journal.length; const theirs = pkg.journal.length;
    const prefixSame = JSON.stringify(pkg.journal.slice(0, Math.min(mine, theirs))) === JSON.stringify(S.journal.slice(0, Math.min(mine, theirs)));
    const conflict = !prefixSame || mine > theirs;
    if (needDeps) return { ok: true, needDeps, conflict: mine > 0, add: theirs, from: pkg.from, to: pkg.to, todos: pkg.todosFor || [], msg: '本机的' + needDeps.join('、') + '和交接包不同；交接包里带了这些依赖的全文且签名核对一致，导入后本页改用包内依赖（本机已有改动会被交接包替换）' };
    return { ok: true, conflict, add: Math.max(0, theirs - mine), from: pkg.from, to: pkg.to, todos: pkg.todosFor || [], msg: conflict ? '你本机也有改动，和交接包分叉了：请并排核对后再决定' : `将导入 ${Math.max(0, theirs - mine)} 步改动` };
  };
  /* 候选状态冒烟：每段编译＋就绪、各岗位待办、每条反馈的「还差」都能算出来 */
  E4.smoke = function (S) { S.st.data.groups.forEach((g) => { E4.compile(S, g.id); E4.ready(S, g.id); E4.copy(S, g.id, { record: false }); }); ['导演', '美术', '摄影', '灯光', '表演', '剧作', '统筹'].forEach((r) => E4.todos(S, r)); S.fb.forEach((f) => E4.missing(S, f)); E4.validShotConfirms(S); JSON.stringify(E4.exportPkg(S, 'full')); E4.unresolved(S); S.st.data.groups.forEach((g) => { const V = S.ver[g.id]; if (!Array.isArray(V.hist) || !V.hist.length) throw new Error('版本历史缺失'); V.hist.forEach((h) => { [h.text, h.prevText].forEach((x) => { if (x != null) String.prototype.split.call(x, '\n'); }); if (typeof h.reason !== 'string') throw new Error('版本历史损坏'); }); }); return true; };
  E4.importApply = function (S, pkg) {
    const pv = E4.importPreview(S, pkg); if (!pv.ok) return pv;
    if (pv.needDeps) { const pd = E4.depsFromPkg(pkg); const prevR = serR(R); const prevPk = E4._pkgRules, prevM = E4.MODEL; const undo = () => { E4.useRules(prevR); E4._pkgRules = prevPk; E4.MODEL = prevM; }; let S2;
      try { S2 = E4.init(pd.data, pd.ref, pd.extra, null, pd); E4.restore(S2, pkg); E4.smoke(S2); } catch (e) { undo(); return { ok: false, msg: '用包内依赖恢复失败：' + e.message }; }
      const bad2 = S2.st.data.groups.filter((g) => pkg.ver && pkg.ver[g.id] && pkg.ver[g.id].sha !== S2.ver[g.id].sha).map((g) => g.id);
      if (bad2.length || S2.baseSha !== pkg.baseSha) { undo(); return { ok: false, msg: '用包内依赖恢复后的提示词和对方的不一致（' + (bad2.join('、') || '基础签名') + '），已取消导入' }; }
      S2.role = S.role; S2.imported = { from: pkg.from, to: pkg.to, time: now(), todos: pkg.todosFor || [], deps: pv.needDeps }; return { ok: true, S: S2, depsFromPkg: pv.needDeps }; }
    const back = JSON.parse(JSON.stringify(E4.exportPkg(S, 'local'))); const backVer = JSON.stringify(S.ver); const backSeq = S.seq; try { E4.restore(S, JSON.parse(JSON.stringify(pkg))); E4.smoke(S); } catch (e) { E4.restore(S, back); S.ver = JSON.parse(backVer); S.seq = backSeq; return { ok: false, msg: '交接包恢复出错（' + e.message + '），已取消导入，本机不变' }; }
    const bad = S.st.data.groups.filter((g) => pkg.ver && pkg.ver[g.id] && pkg.ver[g.id].sha !== S.ver[g.id].sha).map((g) => g.id);
    if (bad.length) { E4.restore(S, back); S.ver = JSON.parse(backVer); return { ok: false, msg: '恢复后的提示词和对方的不一致（' + bad.join('、') + '）：两边的基础数据或规则不同，已取消导入' }; }
    S.imported = { from: pkg.from, to: pkg.to, time: now(), todos: pkg.todosFor || [] }; return { ok: true, S };
  };
  E4.restore = function (S, pkg) {
    S.journal = pkg.journal || []; S.fb = pkg.fb || []; S.pending = pkg.pending || []; S.lit = pkg.lit || S.lit; S.confirm = pkg.confirm || S.confirm; S.decisions = pkg.decisions || S.decisions; S.layers = pkg.layers ? Object.assign({ scene: {}, seg: {}, shot: {} }, pkg.layers) : S.layers; S.copies = pkg.copies || [];
    if (pkg.extraMount) Object.keys(S.extra.mount).forEach((k) => { if (pkg.extraMount[k]) S.extra.mount[k] = Object.assign({}, pkg.extraMount[k], { model: S.extra.mount[k].model }); });
    if (S.lit && S.lit.lines) E4.syncDialogue(S);
    S.endWeather = pkg.endWeather; if (pkg.layers) E4.deriveWeather(S); (pkg.conflictPicks || []).forEach((cp) => { const c = (S.extra.conflicts || []).find((x) => x.id === cp.id); if (c) { c.pick = cp.pick; c.mark = cp.mark; } });
    if (pkg.durs) S.st.data.shots.forEach((s) => { if (pkg.durs[s.id] !== undefined) s.duration = pkg.durs[s.id]; });
    S.ver = {}; S.st.data.groups.forEach((g) => { const c = E4.compile(S, g.id); const pv = pkg.ver && pkg.ver[g.id]; S.ver[g.id] = { n: pv ? pv.n : 1, sha: WB.sha8(c.text), text: c.text, hist: pv ? pv.hist : [{ n: 1, sha: WB.sha8(c.text), reason: '恢复', time: now(), parent: null }] }; });
    S.seq = Math.max(S.seq, ...S.fb.map((f) => +String(f.id).replace(/\D/g, '') || 0), ...((S.lit && S.lit.req) || []).map((r) => +String(r.id).replace(/\D/g, '') || 0), 0);
    { const seen = new Set(); S.pending.forEach((p) => { if (seen.has(p.id)) { p.oldId = p.id; let k = 2; while (seen.has(p.id.replace(/-\d+$/, '') + '-' + k)) k++; p.id = p.id.replace(/-\d+$/, '') + '-' + k; (S.fb.find((f) => f.id === p.fid && f.pendGroup === p.oldId && p.status === '待导演确认') || {}).pendGroup = p.id; } seen.add(p.id); }); }
    { const seen = new Set(); ((S.lit && S.lit.req) || []).forEach((r) => { if (seen.has(r.id)) { r.oldId = r.id; r.id = 'LP' + (++S.seq); } seen.add(r.id); }); } // 旧版本存下的重复编号：后来的那条改号
    S.aseq = Math.max(0, ...S.fb.flatMap((f) => f.items.map((it) => it.aseq || 0)), ...S.pending.flatMap((p) => p.items.map((it) => it.aseq || 0)));
  };

  E4.copy = function (S, gid, opt) { const r = E4.ready(S, gid); if (r.blocked) return { ok: false, msg: r.line }; const V = S.ver[gid]; const out = { ok: true, text: V.text, chars: V.text.length, n: V.n }; if (!opt || opt.record !== false) E4.copyRecord(S, gid, out); return out; };
  E4.copyRecord = function (S, gid, r) { S.copies.push({ gid, n: r.n, time: now(), chars: r.chars, by: S.role }); S.journal.push({ t: 'copy', gid, n: r.n }); };
  E4.confirmFill = function (S) { if (S.role !== '摄影' && S.role !== '导演') return { ok: false, msg: '推导值由摄影（视听）确认' }; S.confirm.fill = S.confirm.fill || {}; S.confirm.fill.all = { by: S.role, time: now(), hash: WB.sha8(JSON.stringify(S.av.pending)) }; S.av.pending.forEach((p) => { if (p.v) S.confirm.fill[p.k] = true; }); S.journal.push({ t: 'fill' }); return { ok: true }; };
  E4.mapHash = function (S, gid) { const g = WB.group(S.st, gid); return WB.sha8(JSON.stringify([S.av && S.av.maps[gid], g.shots.map((id) => { const s = WB.shot(S.st, id); return [id, s.av, s.focal.eq, s.position, s.duration, s.move, Object.keys(R.fields).map((f) => E4.val(S, f, id).v)]; })])); };
  E4.sketchHash = function (S, gid) { const g = WB.group(S.st, gid); return WB.sha8(JSON.stringify(g.shots.map((id) => { const s = WB.shot(S.st, id); return [id, s.position, s.focal, s.duration, s.move, (s.assets || []).map((a) => [a.id, a.inFrame]), s.dialogue.map((d) => d.en), Object.keys(R.fields).map((f) => E4.val(S, f, id).v)]; }))); };
  E4.confirmSketch = function (S, gid) { if (S.role !== '导演' && S.role !== '摄影') return { ok: false, msg: '草图由视听（摄影）或导演确认' }; S.confirm.sketch = S.confirm.sketch || {}; S.confirm.sketch[gid] = { by: S.role, time: now(), hash: E4.sketchHash(S, gid) }; S.journal.push({ t: 'sketch', gid }); return { ok: true }; };
  E4.confirmMap = function (S, gid) { if (S.role !== '导演' && S.role !== '摄影') return { ok: false, msg: '图由视听（摄影）或导演确认' }; S.confirm.maps = S.confirm.maps || {}; S.confirm.maps[gid] = { by: S.role, time: now(), hash: E4.mapHash(S, gid) }; S.journal.push({ t: 'map', gid }); return { ok: true }; };
  E4.chooseDir = function (S, oid) { if (S.role !== '导演') return { ok: false, msg: '只有导演可以定方向；你现在的视角是「' + S.role + '」' }; const o = S.st.data.scene.diagnosis.options.find((x) => x.id === oid); S.confirm.dir = { option: oid, by: '导演', time: now(), hash: WB.sha8(JSON.stringify(o)) }; WB.chooseDirection(S.st, oid, '导演', false); S.journal.push({ t: 'dir', oid }); return { ok: true }; };
  /* 批准绑定：镜头数据＋该镜所有生效的调整值＋所在段的挂载值 */
  E4.shotHash = function (S, sid) { const g = WB.groupOf(S.st, sid); const eff = Object.keys(R.fields).map((f) => [f, E4.val(S, f, sid).v]); return WB.sha8(JSON.stringify([WB.shot(S.st, sid), eff, E4.mountLines(S, g.id), WB.sha8(S.lit.lines.join('\n'))])); };
  E4.mountHash = function (S) { return WB.sha8(JSON.stringify(S.st.data.groups.map((g) => E4.mountLines(S, g.id)))); };
  E4.confirmShot = function (S, sid, on) { if (S.role !== '导演') return { ok: false, msg: '「这镜可以」只由导演点；你现在的视角是「' + S.role + '」' }; if (on) S.confirm.shots[sid] = { by: S.role, time: now(), hash: E4.shotHash(S, sid) }; else delete S.confirm.shots[sid]; S.journal.push({ t: 'shot', sid, on }); return { ok: true }; };
  E4.validShotConfirms = function (S) { Object.keys(S.confirm.shots).forEach((sid) => { const c = S.confirm.shots[sid]; c.stale = c.hash !== E4.shotHash(S, sid); }); };

  /* 档位直接点选（岗位面板）：同样走改动通道，记一条反馈 */
  E4.setTier = function (S, field, value, opt) {
    const t0 = T0(); opt = opt || {}; const F = R.fields[field]; const fid = 'FB' + (++S.seq); const before = snap(S);
    let shots = opt.sid ? [opt.sid] : opt.gid ? WB.group(S.st, opt.gid).shots.slice() : S.st.data.shots.map((x) => x.id); if (F.match) shots = E4.fieldShots(S, field, shots);
    const crew = R.layers[F.layer].crew; const it = { src: '点选：' + F.label + ' → ' + value, kind: 'set', field, value, shots, layer: F.layer, crew, res: '可应用', why: F.label + ' → ' + value + '（手选）' };
    if (!shots.length) { it.res = '需人处理'; it.why = '这个范围里没有对应的镜头'; }
    if (S.role !== '导演' && S.role !== crew) { it.res = '转为建议'; it.why += '；这属于' + R.crews[crew].label + '，已转为给' + R.crews[crew].label + '的建议'; }
    if (S.role === '导演' && crew !== '导演' && it.res === '可应用') it.review = crew;
    const rec = { id: fid, text: it.src, scope: opt.scope || 'scene', gid: opt.gid, sid: opt.sid, crew: S.role, role: S.role, time: now(), items: [it], pendGroup: null, parentVer: Object.fromEntries(Object.entries(S.ver).map(([k, v]) => [k, v.n])) };
    E4.commit(S, rec, rec.items, { scope: rec.scope }); const vers = E4.bump(S, '点选 ' + fid + '：' + it.src, fid); rec.versions = vers; E4.noChange(S, rec, vers); S.fb.push(rec);
    S.journal.push({ t: 'tier', fid, field, value, opt: { scope: opt.scope, gid: opt.gid, sid: opt.sid } });
    return { rec, diff: E4.diff(before, S), vers, ms: T0() - t0, missing: E4.missing(S, rec) };
  };
  /* 建议的接收与处理：目标岗位（或导演）采纳＝按原范围改一次（新反馈），不采纳＝记录 */
  /* 按记录的镜头集合原样应用（不扩大范围） */
  E4.applyExact = function (S, src, proto, o) {
    o = o || {}; const sc = ['scene', 'seg', 'shot'].includes(o.scope) ? o.scope : 'shot'; const force = !!o.force;
    const t0 = T0(); const fid = 'FB' + (++S.seq); const before = snap(S);
    const it = { src, kind: proto.kind, field: proto.field, value: proto.value, dir: proto.dir, delta: proto.delta, shots: (proto.shots || []).slice(), layer: proto.layer, crew: proto.crew, force, res: '可应用', why: (proto.why || '').split('；')[0] + (force ? '（这些也一起改：覆盖本镜／本段另设，镜头：' : '（采纳建议，镜头范围不变：') + (proto.shots || []).map((x) => +x.slice(5) + ' 镜').join('、') + '）' };
    const rec = { id: fid, text: src, scope: sc, gid: o.gid, sid: o.sid, crew: S.role, role: S.role, time: now(), items: [it], pendGroup: null, parentVer: Object.fromEntries(Object.entries(S.ver).map(([k, v]) => [k, v.n])) };
    E4.commit(S, rec, rec.items, { scope: sc }); const vers = E4.bump(S, '采纳建议 ' + fid, fid); rec.versions = vers; E4.noChange(S, rec, vers); S.fb.push(rec); S.journal.push({ t: 'exact', fid, src });
    return { rec, diff: E4.diff(before, S), vers, ms: T0() - t0, missing: E4.missing(S, rec) };
  };
  /* 「这些也一起改」：把整场／段改动显式覆盖到保留了自己设定的镜（规格 5.1 范围与覆盖） */
  E4.forceOwn = function (S, fid, idx) {
    const rec = S.fb.find((f) => f.id === fid); const it = rec && rec.items[idx]; if (!it || !(it.ownShots || []).length || !['已应用', '已满足'].includes(it.res)) return { ok: false, msg: '这一项没有保留下来的另设' }; if (it.ownForced) return { ok: false, msg: '已经一起改过了' };
    if (S.role !== '导演' && S.role !== it.crew) return { ok: false, msg: '这一项归' + R.crews[it.crew].label + '，由' + R.crews[it.crew].label + '或导演决定要不要一起改' };
    const r = E4.applyExact(S, '这些也一起改（' + fid + '）：' + it.src, Object.assign({}, it, { shots: it.ownShots }), { scope: 'shot', force: true }); it.ownForced = r.rec.id; S.journal.push({ t: 'forceOwn', fid, idx }); return { ok: true, r };
  };
  E4.handleSugg = function (S, fid, idx, ok) {
    const rec = S.fb.find((f) => f.id === fid); const it = rec && rec.items[idx]; if (!it || it.res !== '转为建议') return { ok: false, msg: '找不到这条建议' }; if (it.sugg) return { ok: false, msg: '这条建议已处理' };
    if (S.role !== it.crew && S.role !== '导演') return { ok: false, msg: '这条建议给' + R.crews[it.crew].label + '处理' };
    if (!ok) { it.sugg = { ok: false, by: S.role, time: now() }; S.journal.push({ t: 'sugg', fid, idx, ok: false }); return { ok: true }; }
    if (!(it.shots || []).length || !['set', 'step', 'dur'].includes(it.kind)) return { ok: false, msg: '这条建议没有明确的镜头或改法，请在岗位栏手动改后点「不采纳」记录' };
    const r = E4.applyExact(S, '采纳建议（' + fid + '）：' + it.src, it, { scope: it.lvl || rec.scope, gid: rec.gid, sid: rec.sid });
    it.sugg = { ok: true, by: S.role, time: now(), fid: r.rec.id }; S.journal.push({ t: 'sugg', fid, idx, ok: true }); return { ok: true, r };
  };
  E4.review = function (S, fid, idx, ok) { const rec = S.fb.find((f) => f.id === fid); const it = rec.items[idx]; it.reviewed = { ok, by: S.role, time: now() }; S.journal.push({ t: 'review', fid, idx, ok }); };
  /* 签字绑定内容：行本身＋（天气行）末场雨势＋签字岗位在场尾镜上的生效值 */
  E4.signHash = function (S, key) { const c = S.extra.endCard.find((x) => x.who + x.state === key); if (!c) return null; const fs = Object.keys(R.fields).filter((f) => R.layers[R.fields[f].layer].crew === c.sign || (c.field === 'weather' && f === 'env.rain')); return WB.sha8(JSON.stringify([c, c.field === 'weather' ? S.endWeather || null : null, R.endStateShots.map((sid) => fs.map((f) => E4.val(S, f, sid).v))])); };
  E4.signOk = function (S, key) { const g = S.confirm.sign[key]; return !!g && g.hash === E4.signHash(S, key); };
  E4.sign = function (S, key, on) { if (on) S.confirm.sign[key] = { by: S.role, time: now(), hash: E4.signHash(S, key) }; else delete S.confirm.sign[key]; S.journal.push({ t: 'sign', key, on }); };
  E4.confirmMount = function (S) { if (S.role !== '摄影' && S.role !== '导演') return { ok: false, msg: '挂载值由摄影确认' }; S.confirm.mount = { by: S.role, time: now(), hash: E4.mountHash(S) }; S.journal.push({ t: 'mount' }); return { ok: true }; };
  E4.decide = function (S, key, value) { if (S.role !== '导演') return { ok: false, msg: '只有导演可以拍板' }; const d = S.decisions[key]; if (!value && !d.value) return { ok: false, msg: '先选一个选项' }; d.value = value || d.value; d.mark = '导演已定'; const cf = (S.extra.conflicts || []).find((c) => c.id === key.toUpperCase()); if (cf) { const o = cf.options.find((x) => x.id === value || x.t === d.value); if (o) { cf.pick = o.id; d.value = o.id + '：' + o.t; } cf.mark = '导演已定'; } d.time = now(); S.journal.push({ t: 'decide', key, value }); return { ok: true }; };
  E4.unresolved = function (S, gid) { return S.fb.filter((f) => !f.reverted && (!gid || f.gid === gid || f.scope === 'scene')).filter((f) => f.items.some((it) => ['待补选', '需人处理', '待导演确认', '导演已批准，待人落实'].includes(it.res))).length; };

  if (typeof module !== 'undefined') module.exports = E4; else root.E4 = E4;
})(typeof window !== 'undefined' ? window : globalThis);
