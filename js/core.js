/* 场次工作台 · 核心逻辑（无 DOM，可在 node 中测试）｜一次性试验品 */
(function (root) {
  'use strict';
  const WB = {};
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const r1 = (x) => Math.round(x * 10) / 10;
  const nowStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
  WB.ROLES = ['导演', '总监', '视听', '摄影', '剪辑', '美术', '剧作', '资产', '交付设计'];
  WB.MOVES = ['固定', '手持', '呼吸', '靠近', '跟拍', '跟拍超越', '跟拍放慢', '轨道', '摇臂', '斯坦尼康'];
  WB.MOVE_EN = { 固定: 'locked-off', 手持: 'handheld', 呼吸: 'handheld breathing', 靠近: 'slow push-in', 跟拍: 'follow', 跟拍超越: 'follow then overtake', 跟拍放慢: 'follow, then let the subject pull away', 轨道: 'dolly', 摇臂: 'crane', 斯坦尼康: 'stabilized orbit' };
  WB.SPK_EN = { 伊莱亚斯: 'father', 诺亚: 'android child', 凯恩: 'commander', 组长: 'team leader', 无人机: 'drone' };
  WB.MIN_SHOT = 1.0; WB.MAX_GROUP = 30;
  WB.SOUND_EN = { '雨声／底盘低鸣': 'dense rain on metal, low city-underbelly hum', '低频／灯闪': 'low-frequency hum swells as the lamp flickers', '水响／滑倒': 'splash of the slip lands first, then the fall', '计时器急促': 'the wrist timer ticks faster', '结束提示／两声电子响应': 'the wrist timer sounds its end tone, then two short electronic responses', '脚步': 'boots on wet metal', '棍击／落水／物件落地': 'baton impacts, splashes, objects hitting the ground', '膝伺服绷紧': 'a knee servo whines as it locks tight', '极轻脆响': 'one very faint brittle crack', '倾落闷响／作业': 'muffled dump of scrap, machines at work', '引擎逼近→远去／雨／底盘低鸣不断': 'engine passes overhead and fades away; rain and the low hum never stop' };
  WB.TERM_EN = { Rembrandt: 'weak half-face key with a small lit triangle on the shadow cheek', steadicam: 'stabilized camera rig' };
  WB.NAME_EN = { 诺亚: 'the android child', 伊莱亚斯: 'the father', 凯恩: 'the commander', 组长: 'the squad leader', 机械犬: 'the robot dog', 无人机: 'the drone', 回收者: 'the recyclers', 它: 'the android child' };
  /* 硬规则：提示词非对白正文不出现人名／地名（台词引号内逐字保留）。Codex 第 3 轮 P0 */
  WB.DENAME = [[/\bElias's\b/g, "the father's"], [/\bElias\b/g, 'the father'], [/\bNoah's\b/g, "the android child's"], [/\bNoah\b/gi, 'the android child'], [/\b(the commander |Kane )Mercer's\b/g, "the commander's"], [/\b(the commander |Kane )Mercer\b/g, 'the commander'], [/\bMercer's\b/g, "the commander's"], [/\bMercer\b/g, 'the commander'], [/\bKane's\b/g, "the commander's"], [/\bKane\b/g, 'the commander'], [/\bthe Rustline scrapyard\b/g, 'the scrapyard'], [/\bRustline\b/g, 'scrapyard']];
  WB.deName = function (t) {
    return String(t).split(/("[^"]*"|\[REF:[^\]]*\])/).map((seg, i) => i % 2 ? seg : WB.DENAME.reduce((a, [re, to]) => a.replace(re, to), seg)).join('').replace(/(^|[.!?:]\s+|\|\s+)the (father|android child|commander|scrapyard)/g, (m, p, w) => p + 'The ' + w);
  };
  WB.NAMES_RE = /\b(Elias|Noah|Kane|Mercer|Rustline)\b/i;
  /* 只豁免本组批准台词的原句（不是所有引号）：别处的引号、REF 码、道具铭牌都要查名 */
  WB.stripApproved = (text, lines) => (lines || []).slice().sort((a, b) => b.length - a.length).reduce((t, l) => t.split('"' + l + '"').join('""'), String(text || ''));
  WB.groupLines = (st, g) => g.shots.flatMap((id) => WB.shot(st, id).dialogue.map((d) => d.en));
  WB.TMP_CODE = [[/模块/, 'S04-TMP-PR-MODULE'], [/无人机/, 'S04-TMP-VE-DRONE'], [/组长/, 'S04-TMP-CH-LEADER'], [/飞行器/, 'S04-TMP-VE-CMDCRAFT'], [/作业灯/, 'S04-TMP-PR-LAMP'], [/水坑/, 'S04-TMP-SC-PUDDLE']];
  WB.tmpCode = (name) => { const t = WB.TMP_CODE.find(([re]) => re.test(name || '')); return t ? t[1] : 'S04-TMP-' + WB.sha8(name || '').slice(0, 4).toUpperCase(); };

  /* ---------- sha256 (pure JS) ---------- */
  WB.sha256 = function (str) {
    const bytes = []; const u = unescape(encodeURIComponent(str)); for (let i = 0; i < u.length; i++) bytes.push(u.charCodeAt(i));
    const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    const l = bytes.length; bytes.push(0x80); while ((bytes.length % 64) !== 56) bytes.push(0);
    const bl = l * 8; for (let i = 7; i >= 0; i--) bytes.push(Math.floor(bl / Math.pow(2, i * 8)) & 0xff);
    const w = new Uint32Array(64); const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) { const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3); const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25); const ch = (e & f) ^ (~e & g); const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22); const mj = (a & b) ^ (a & c) ^ (b & c); const t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return Array.from(H).map((x) => ('00000000' + x.toString(16)).slice(-8)).join('');
  };
  WB.sha8 = (s) => WB.sha256(s).slice(0, 8);

  /* ---------- state ---------- */
  WB.init = function (data, refIndex, saved) {
    const st = saved ? clone(saved) : {
      data: clone(data), refIndex: clone(refIndex || { entries: [] }), log: [], proposals: [], ack: {}, ops: [], picks: {},
      decisions: {}, approvals: {}, copies: [], rev: 0, finalMode: false,
    };
    st._idx = {}; st.data.shots.forEach((s, i) => { st._idx[s.id] = i; });
    st.data.shots.forEach((s) => { s.fieldLocks = s.fieldLocks || {}; });
    st.data.groups.forEach((g) => { g.fieldLocks = g.fieldLocks || {}; g.firstFrameRef = g.firstFrameRef || null; });
    /* 文件索引是文件态的事实源：apply_ops 落地后，本地缓存里的同 key 条目以文件为准（审批态保留本地），新条目补入 */
    if (saved && refIndex && refIndex.entries) { const byKey = new Map(st.refIndex.entries.map((e) => [e.key, e])); refIndex.entries.forEach((e) => { const o = byKey.get(e.key); if (!o) st.refIndex.entries.push(clone(e)); else { o.fileState = e.fileState; o.sha8 = e.sha8 || o.sha8; o.file = e.file || o.file; } }); }
    if (!saved) WB.autoPick(st);
    WB.refreshFirstFrameRefs(st);
    return st;
  };
  WB.serialize = (st) => { const o = Object.assign({}, st); delete o._idx; return clone(o); };
  WB.shot = (st, id) => st.data.shots[st._idx[id]];
  WB.group = (st, gid) => st.data.groups.find((g) => g.id === gid);
  WB.groupOf = (st, sid) => st.data.groups.find((g) => g.shots.includes(sid));
  WB.groupSec = (st, g) => r1(g.shots.reduce((a, id) => a + WB.shot(st, id).duration, 0));
  WB.sceneSec = (st) => r1(st.data.shots.reduce((a, s) => a + s.duration, 0));
  WB.dataSha = (st) => WB.sha8(JSON.stringify({ s: st.data.shots, g: st.data.groups }));
  WB.normShot = function (t) {
    const m = String(t).match(/^(?:S04-)?C?0*(\d{1,3})$/i); return m ? 'S04-C' + String(+m[1]).padStart(3, '0') : null;
  };

  /* ---------- 代选（总监代选｜待导演确认） ---------- */
  WB.autoPick = function (st) {
    const dg = st.data.scene.diagnosis;
    const rec = dg.options.find((o) => o.recommended) || dg.options[0];
    WB.chooseDirection(st, rec.id, '总监（代选）', true);
    dg.directorItems.forEach((q) => {
      if (q.id === 'Q-DIR') return;
      const v = q.default || null;
      st.decisions[q.id] = { value: v, by: '总监（代选）', proxy: true, time: nowStr(), note: v ? '按最保守、不改文学的选项代选' : '无默认推荐，留空待总监/导演定' };
    });
    st.decisions['OPTICS'] = { value: '视听提案光学包', by: '总监（代选）', proxy: true, time: nowStr() };
  };
  WB.chooseDirection = function (st, oid, who, proxy) {
    const dg = st.data.scene.diagnosis; const o = dg.options.find((x) => x.id === oid);
    if (!o) return { ok: false, msg: '无此方向' };
    const payload = JSON.stringify(o);
    const dec = { id: 'DEC-S04-0-' + oid + '-' + WB.sha8(payload + (st.log.length)), option: oid, title: o.title, sha8: WB.sha8(payload), by: who, proxy: !!proxy, time: nowStr(), literarySha: st.data.literary.sha8 };
    const before = dg.chosen ? dg.chosen.option : null;
    dg.chosen = dec; st.decisions['Q-DIR'] = { value: o.title, by: who, proxy: !!proxy, time: dec.time };
    // 文学改动只在选定后生效，并以 diff 记录（权威源文件不动）
    st.literaryDiff = o.literaryChange ? { option: oid, patch: o.patch, status: o.patch ? '待生效（diff 记录）' : '方案未给出具体补丁（待剧作）' } : null;
    WB.logEntry(st, { who, text: '第0关选方向 ' + o.title, scope: '场', target: 'S04', variable: '文学方向', before, after: oid, status: '已应用', decision: dec.id });
    return { ok: true, dec };
  };
  WB.unlocked = (st) => !!st.data.scene.diagnosis.chosen;

  /* ---------- log ---------- */
  WB.logEntry = function (st, e) {
    st.rev++; e.id = 'CH-' + String(st.rev).padStart(4, '0'); e.time = e.time || nowStr(); e.rev = st.rev;
    if (e.status === '已应用') e.sha8After = WB.dataSha(st);
    st.log.push(e); return e;
  };

  /* ---------- locks ---------- */
  WB.isLocked = function (st, sid, variable) {
    const s = WB.shot(st, sid); const g = WB.groupOf(st, sid);
    return s.lock === '锁定' || g.lock === '锁定' || st.data.scene.lock === '锁定' || !!(variable && (s.fieldLocks[variable] || (g.fieldLocks || {})[variable]));
  };
  WB.FIELD_ZH = { duration: '时长', focal: '焦距', aperture: '光圈', move: '运镜', lighting: '灯光', dialogueTime: '台词时序' };
  WB.lockReason = function (st, sid, variable) { const s = WB.shot(st, sid); const g = WB.groupOf(st, sid); if (st.data.scene.lock === '锁定') return '场已锁定'; if (g.lock === '锁定') return g.name + '已锁定'; if (s.lock === '锁定') return sid.slice(4) + ' 已锁定'; if (variable && s.fieldLocks[variable]) return sid.slice(4) + ' 的「' + (WB.FIELD_ZH[variable] || variable) + '」已锁'; return ''; };
  /* 统一失效：任何实质改动 → 本组片段需复核、签字清空；下一组若用本组片段尾帧则过期 */
  WB.touchGroup = function (st, gid, why) {
    const g = WB.group(st, gid); const gi = st.data.groups.indexOf(g); const next = st.data.groups[gi + 1]; const out = [];
    let hadApproved = false;
    g.clips.forEach((c) => { if (c.status !== '已作废') { if (c.status === '已批') hadApproved = true; if (c.status !== '需复核') out.push(c.id + ' → 需复核'); c.status = '需复核'; Object.keys(c.checks).forEach((k) => { c.checks[k] = false; }); } });
    if (g.acceptance) Object.values(g.acceptance).forEach((arr) => arr.forEach((x) => { x.ok = false; }));
    if (g.combined) g.combined.status = '失效';
    if (next && next.firstFrameRef && next.firstFrameRef.from === '上一组实际尾帧' && next.firstFrameRef.status !== '过期') { next.firstFrameRef.status = '过期'; next.refExpired = true; out.push(next.name + ' 首帧 REF → 过期'); if (!(why && why.depth > 8)) WB.touchGroup(st, next.id, { depth: ((why && why.depth) || 0) + 1 }).forEach((x) => out.push(x)); }
    if (g.lock === '锁定') { g.lock = '草案'; out.push(g.name + ' 解除组锁（内容已变）'); }
    return out;
  };
  WB.invalidations = function (st, sid) {
    const s = WB.shot(st, sid); const g = WB.groupOf(st, sid); const out = [];
    if (s.sketch) out.push(`${sid} 分镜草图（_in/_out）→ 需复核`);
    out.push(`${g.name} 合成参考图 → 失效需重出`);
    out.push(`${g.name} 提示词卡 → 需重新复制`);
    if (g.clips.length) out.push(`${g.name} 已登记片段 ${g.clips.length} 条 → 需复核`);
    const gi = st.data.groups.indexOf(g);
    if (g.shots[g.shots.length - 1] === sid && st.data.groups[gi + 1]) out.push(`${st.data.groups[gi + 1].name} 首帧 REF → 过期`);
    return out;
  };
  WB.setLock = function (st, sid, on, who, variable) {
    if (who !== '导演') return { ok: false, status: '拒绝', msg: '只有导演可以' + (on ? '锁定' : '解锁') };
    const s = WB.shot(st, sid);
    const inval = on ? [] : WB.invalidations(st, sid);
    if (variable) { const b = !!s.fieldLocks[variable]; s.fieldLocks[variable] = on; WB.logEntry(st, { who, text: (on ? '锁定 ' : '解锁 ') + sid + '·' + variable, scope: '镜', target: sid, variable: '字段锁·' + variable, before: b, after: on, status: '已应用', invalidates: inval }); }
    else { const b = s.lock; s.lock = on ? '锁定' : '草案'; s.rev++; WB.logEntry(st, { who, text: (on ? '锁定 ' : '解锁 ') + sid, scope: '镜', target: sid, variable: '锁定', before: b, after: s.lock, status: '已应用', invalidates: inval }); }
    if (!on) { WB.applyInvalidations(st, sid); WB.touchGroup(st, WB.groupOf(st, sid).id); }
    return { ok: true, status: '已应用', invalidates: inval };
  };
  WB.applyInvalidations = function (st, sid) {
    const s = WB.shot(st, sid); const g = WB.groupOf(st, sid);
    if (s.sketch) s.sketch.status = '需复核';
    g.combined = { status: '失效' }; g.clips.forEach((c) => { if (c.status !== '已作废') c.status = '需复核'; });
  };

  /* ---------- rebalance (组内吸收) ---------- */
  // 返回 {ok, plan:[{id,before,after}], groupBefore, groupAfter, reason}
  /* 供体有效下限：不能压到已有台词念完、灯光闪点/L3 点之前（Codex v0.2 独立方案：C003 被压到 3.3″ 仍要说到 3.6″） */
  WB.donorFloor = function (st, id, T) {
    const s = WB.shot(st, id); const cur = T(s.duration); let m = T(WB.MIN_SHOT);
    (s.dialogue || []).forEach((d) => { const e = T(d.t1); m = Math.max(m, e <= cur ? e : cur); });
    const L = s.lighting || {}; (L.flicker || []).forEach((t) => { m = Math.max(m, T(t) + 1); }); (L.l3path || []).forEach((x) => { m = Math.max(m, Math.min(cur, T(x.t) + 1)); });
    return m;
  };
  WB.planDurations = function (st, gid, changes, mode) {
    const g = WB.group(st, gid); const T = (x) => Math.round(x * 10);
    const cur = {}; g.shots.forEach((id) => { cur[id] = T(WB.shot(st, id).duration); });
    const next = Object.assign({}, cur); Object.keys(changes).forEach((id) => { next[id] = T(changes[id]); });
    for (const id of Object.keys(changes)) if (next[id] < T(WB.MIN_SHOT)) return { ok: false, reason: `${id} 不能短于 ${WB.MIN_SHOT}″` };
    let delta = Object.keys(changes).reduce((a, id) => a + next[id] - cur[id], 0); // tenths
    if (mode === 'absorb' && delta !== 0) {
      const all = g.shots.filter((id) => !(id in changes) && !WB.isLocked(st, id, 'duration'));
      const prot = (id) => (WB.shot(st, id).protect === true);
      // 戏核镜（勿砍）只在缩短需求下最后才动：先用非戏核镜吸收
      let pool = (delta > 0) ? all.filter((id) => !prot(id)) : all;
      if (delta > 0 && !pool.length) pool = all;
      // 按时长比例分摊，逐 0.1″ 精确
      let need = -delta; let guard = 0;
      while (need !== 0 && guard++ < 10000) {
        const step = need > 0 ? 1 : -1;
        const cand = pool.filter((id) => step > 0 || next[id] - 1 >= WB.donorFloor(st, id, T));
        if (!cand.length) { if (pool.length < all.length) { pool = all; continue; } break; }
        cand.sort((a, b) => (step > 0 ? (next[a] / cur[a]) - (next[b] / cur[b]) : (next[b] / cur[b]) - (next[a] / cur[a])));
        next[cand[0]] += step; need -= step;
      }
      if (need !== 0) return { ok: false, alarm: true, reason: `组内可吸收的镜不够：还差 ${Math.abs(need) / 10}″ 无法吸收（其他镜已锁，或已到下限：${WB.MIN_SHOT}″ 或本镜台词／灯光点需要的时长）。请改用「改组总秒」或先解锁`, groupBefore: Object.values(cur).reduce((a, b) => a + b, 0) / 10, residual: need / 10 };
      delta = -need;
    }
    const plan = g.shots.filter((id) => next[id] !== cur[id]).map((id) => ({ id, before: cur[id] / 10, after: next[id] / 10 }));
    const gb = Object.values(cur).reduce((a, b) => a + b, 0) / 10, ga = Object.values(next).reduce((a, b) => a + b, 0) / 10;
    const sceneAfter = r1(WB.sceneSec(st) - gb + ga); const win = st.data.scene.window;
    const res = { ok: true, plan, groupBefore: gb, groupAfter: ga, sceneAfter, absorbed: mode === 'absorb' };
    if (ga > WB.MAX_GROUP) { res.ok = false; res.alarm = true; res.reason = `${g.name} 将变为 ${ga}″，超过 ${WB.MAX_GROUP}″` + (g.chain && g.chain.length ? `（含不可切链 ${g.chain[0].slice(4)}–${g.chain[g.chain.length - 1].slice(4)}）` : '') + '：需重切组（系统不会把镜头自动挪到别的组）'; res.needRegroup = true; }
    else if (sceneAfter < win.min || sceneAfter > win.max) { res.ok = false; res.alarm = true; res.reason = `全场将变为 ${sceneAfter}″，超出允许窗口 ${win.min}–${win.max}″`; }
    return res;
  };
  /* 改镜长会连带写哪些字段：运镜分段、灯光秒点、台词时点（extendBeat） */
  WB.writeSetLocks = function (st, plan, beat) {
    const out = [];
    plan.forEach((p) => { if (p.after === p.before) return; const s = WB.shot(st, p.id);
      if (s.move.segments && s.move.segments.length && WB.isLocked(st, p.id, 'move')) out.push(`${p.id.slice(4)} 的「运镜」已锁（改镜长会重排运镜分段）`);
      if (s.lighting && (s.lighting.flicker || s.lighting.l3path) && WB.isLocked(st, p.id, 'lighting')) out.push(`${p.id.slice(4)} 的「灯光」已锁（改镜长会移动闪烁/L3 秒点）`);
      if (beat && beat.id === p.id && s.dialogue.length && WB.isLocked(st, p.id, 'dialogueTime')) out.push(`${p.id.slice(4)} 的「台词时序」已锁（多停会后移台词）`);
    });
    return out;
  };
  WB.commitPlan = function (st, gid, plan, who, text, beat) {
    plan.forEach((p) => { const s = WB.shot(st, p.id); const old = s.duration; s.duration = p.after; s.rev++; if (beat && beat.id === p.id) WB.extendBeat(s, old, beat); else WB.retimeBeats(s, old); });
    const inv = [];
    Array.from(new Set(plan.map((p) => WB.groupOf(st, p.id).id).concat([gid]))).forEach((x) => WB.touchGroup(st, x).forEach((y) => inv.push(y)));
    return WB.logEntry(st, { invalidates: inv, who, text, scope: '组', target: gid, variable: '时长', before: plan.map((p) => `${p.id.slice(4)} ${p.before}″`).join('，'), after: plan.map((p) => `${p.id.slice(4)} ${p.after}″`).join('，'), status: '已应用' });
  };
  /* 技术节拍（运镜分段、闪烁秒点、L3 关键帧）按比例重定时；台词时点不动（超出由检查报红，不删改台词） */
  WB.retimeBeats = function (s, old) {
    // 从稳定基准（相对镜长的比例，首次缩放时记下）计算，最后才取 0.1″：4→2→4 秒能回到原点
    const D = s.duration; const F = (t) => t / old; const R = (f) => r1(f * D);
    if (s.move.segments) s.move.segments.forEach((x) => { if (x.f0 == null) { x.f0 = F(x.t0); x.f1 = F(x.t1); } x.t0 = R(x.f0); x.t1 = R(x.f1); });
    if (s.lighting && s.lighting.flicker) { if (!s.lighting.flickerF) s.lighting.flickerF = s.lighting.flicker.map(F); s.lighting.flicker = s.lighting.flickerF.map(R); }
    if (s.lighting && s.lighting.l3path) s.lighting.l3path.forEach((x) => { if (x.f == null) x.f = F(x.t); x.t = R(x.f); });
  };
  /* 戏核节拍特判：「006 多停两秒」= 把含「停」的那段节拍拉长，之后的节拍整体后移，其余不缩放 */
  WB.extendBeat = function (s, old, beat) {
    const add = r1(s.duration - old); const segs = s.move.segments || [];
    segs.forEach((x) => { delete x.f0; delete x.f1; }); if (s.lighting) { delete s.lighting.flickerF; (s.lighting.l3path || []).forEach((x) => { delete x.f; }); }
    let at = segs.find((x) => /停|半步|定住|停住/.test(x.note || ''));
    const pivot = at ? at.t1 : (s.lighting && s.lighting.l3path && s.lighting.l3path.length ? s.lighting.l3path[0].t : r1(old / 2));
    if (!at && segs.length) at = segs.find((x) => x.t0 < pivot - 0.01 && x.t1 >= pivot - 0.01) || segs[segs.length - 1];
    segs.forEach((x) => { if (x === at) x.t1 = r1(x.t1 + add); else if (x.t0 >= pivot - 0.01) { x.t0 = r1(x.t0 + add); x.t1 = r1(x.t1 + add); } });
    if (segs.length) segs[segs.length - 1].t1 = s.duration;
    if (!segs.length) s.move.segments = [{ t0: 0, t1: s.duration, move: s.move.primary, note: '多停 ' + add + '″' }];
    if (s.lighting && s.lighting.l3path) s.lighting.l3path.forEach((x) => { if (x.t >= pivot - 0.01) x.t = r1(x.t + add); });
    if (s.lighting && s.lighting.flicker) s.lighting.flicker = s.lighting.flicker.map((x) => x >= pivot - 0.01 ? r1(x + add) : x);
    s.dialogue.forEach((d) => { if (d.t0 >= pivot - 0.01) { d.t0 = r1(d.t0 + add); d.t1 = r1(d.t1 + add); } });
    s.beatNote = `「${beat.text}」：停顿节拍 +${add}″，之后的节拍整体后移`;
  };
  /* 台词时序（剪辑）：只改起点秒，不改台词内容 */
  WB.setDialogueTime = function (st, sid, idx, t0, who, t1) {
    const s = WB.shot(st, sid); const d = s && s.dialogue[idx]; if (!d) return { ok: false, msg: '没有这句台词' };
    if (WB.isLocked(st, sid, 'dialogueTime')) return { ok: false, msg: WB.lockReason(st, sid, 'dialogueTime') + '：不能改' };
    if (!Number.isFinite(+t0) || +t0 < 0) return { ok: false, msg: '起点要是 ≥0 的数字' };
    if (t1 != null && t1 !== '' && (!Number.isFinite(+t1) || +t1 <= +t0)) return { ok: false, msg: '终点要是数字，且晚于起点' };
    t0 = r1(+t0); if (d.est == null) d.est = r1(d.t1 - d.t0);
    const len = (t1 != null && t1 !== '') ? r1(r1(+t1) - t0) : r1(d.t1 - d.t0);
    if (!(len > 0)) return { ok: false, msg: '取整到 0.1″ 后终点不晚于起点' };
    d.heard = null; const b = d.t0 + '–' + d.t1; d.t0 = t0; d.t1 = r1(t0 + len); d.timing = '剪辑定'; s.rev++;
    d.timingRisk = len < d.est - 0.05 ? `手填 ${len}″ 短于估算 ${d.est}″（按 2.8 词/秒），要试听确认能说完` : null; /* 风险在试听前一直挡正式就绪（timingFits） */
    const ov = s.dialogue.some((x, i) => i !== idx && x.t0 < d.t1 && d.t0 < x.t1);
    const inv = WB.touchGroup(st, WB.groupOf(st, sid).id);
    WB.logEntry(st, { who, text: `${sid.slice(4)} 台词「${d.en.slice(0, 24)}」时间 ${b}″→${d.t0}–${d.t1}″`, scope: '镜', target: sid, variable: '台词时序', before: b + '″', after: d.t0 + '–' + d.t1 + '″', status: '已应用', invalidates: inv, touched: [sid] });
    return { ok: true, overlap: ov, over: d.t1 > s.duration + 0.05, risk: d.timingRisk };
  };

  /* 试听证据：只有导演/剪辑可记；止点再改就作废 */
  WB.markHeard = function (st, sid, idx, who, ok) {
    const s = WB.shot(st, sid); const d = s && s.dialogue[idx]; if (!d) return { ok: false, msg: '没有这句台词' };
    if (!['导演', '剪辑'].includes(who)) return { ok: false, msg: '只有导演或剪辑可以记录试听' };
    d.heard = ok === false ? null : { who, time: nowStr(), t0: d.t0, t1: d.t1 };
    WB.logEntry(st, { who, text: `${sid.slice(4)} 台词「${d.en.slice(0, 24)}」试听${ok === false ? '撤销' : '能在 ' + d.t0 + '–' + d.t1 + '″ 念完'}`, scope: '镜', target: sid, variable: '台词试听', before: '—', after: ok === false ? '—' : '已试听', status: '已应用' });
    return { ok: true };
  };
  WB.heardOk = (d) => !!(d.heard && d.heard.t0 === d.t0 && d.heard.t1 === d.t1);
  /* ---------- 白话解析 ---------- */
  const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const num = (s) => (s in CN ? CN[s] : +s);
  const NAMES = { 诺亚: 'CH-02', 伊莱亚斯: 'CH-01', 凯恩: 'CH-03', 组长: null, 机械犬: 'CH-05', 无人机: null, 回收者: 'CH-04G' };
  WB.LITERARY_RE = /(台词|对白|这句话|那句|改词|改成[「“"]|事件顺序|顺序(调换|互换|对调)|调换|对调|先.{1,12}再.{1,12}|加一场|加一段戏|加个?追逐|删掉.{0,8}(动作|事件|台词|这句|戏)|删(去|除)?(这|那)?句|让(伊莱亚斯|诺亚|凯恩|组长|回收者|机械犬|无人机|他|它)(?!.{0,2}(不入画|出画))|换成.{0,6}说|不让.{0,6}(说|摔|跌|打))/;
  WB.parse = function (text, ctx) {
    const t = String(text || '').trim(); ctx = ctx || {};
    if (!t) return { ok: false, msg: '请输入一句白话，例如「C005 改 2.5 秒」' };
    const res = { text: t, intents: [] };
    // targets
    let shots = [];
    const rng = t.match(/C?0*(\d{1,3})\s*[-–~到至]\s*C?0*(\d{1,3})/i);
    if (rng && /C/i.test(t)) { for (let k = +rng[1]; k <= +rng[2]; k++) shots.push(WB.normShot(k)); }
    else (t.match(/C0*\d{1,3}/gi) || []).forEach((x) => shots.push(WB.normShot(x.slice(1))));
    /* 纯三位镜号（如「006 多停两秒」）：只认 0 开头的三位数，避免把「2 秒」当镜号 */
    if (!shots.length) (t.match(/(?:^|[^\d.C])(0\d{2})(?![\d.])/gi) || []).forEach((x) => shots.push(WB.normShot(x.replace(/\D/g, ''))));
    let gid = null; const gm = t.match(/组\s*([一二三四五1-5])/); if (gm) gid = 'G' + num(gm[1]);
    const ctxGroup = gid || ctx.group || (ctx.shot ? null : null);
    const fm = t.match(/(前|后)\s*([一二两三四五六七八九十\d]+)\s*(个)?镜/);
    if (fm) {
      const g = WB.group(ctx.st, ctxGroup || (ctx.shot ? WB.groupOf(ctx.st, ctx.shot).id : 'G1'));
      const n = num(fm[2]); shots = fm[1] === '前' ? g.shots.slice(0, n) : g.shots.slice(-n); gid = g.id;
    }
    if (!shots.length && /(这里|这镜|本镜|这个镜头|这一镜)/.test(t) && ctx.shot) shots = [ctx.shot];
    const unknown = shots.filter(Boolean).filter((id) => ctx.st._idx[id] === undefined);
    if (unknown.length) return { ok: false, text: t, msg: `没有 ${unknown.map((x) => x.slice(4)).join('、')} 这一镜（本场 C001–C${String(ctx.st.data.shots.length).padStart(3, '0')}）` };
    shots = shots.filter(Boolean);
    // literary first
    if (WB.LITERARY_RE.test(t)) return Object.assign(res, { ok: true, literary: true, scope: shots.length ? '镜' : (gid ? '组' : '场'), target: shots.join('、') || gid || 'S04', variable: '文学层（台词/事件顺序/动作者）', constraint: '文学本只读：需剧作/导演确认' });
    // lock/unlock
    const lk = t.match(/^(解锁|锁定|锁住|锁上)/);
    if (lk && !shots.length && !gid && ctx.shot) shots = [ctx.shot];
    if (lk && !shots.length && !gid) return { ok: false, text: t, msg: '要锁哪一镜或哪一组？例如「锁定 C005」「锁定组一」，或先在左侧选中一镜' };
    if (lk) return Object.assign(res, { ok: true, kind: 'lock', on: lk[1] !== '解锁', shots, gid, scope: shots.length ? '镜' : '组', target: shots.join('、') || gid, variable: '锁定', constraint: '仅导演' });
    // not in frame
    if (shots.length === 0 && /^C?0*\d{1,3}\b/.test(t)) { /* 纯镜号开头已处理 */ }
    const nf = t.match(/(别|不要|不能)(让)?(看见|看到|出现|露出|拍到|入画)(.{1,6})|(.{1,6})(不入画|出画)/);
    if (nf) {
      const who = (nf[4] || nf[5] || '').replace(/[了吧的。！!，,]/g, '');
      if (!shots.length && ctx.shot) shots = [ctx.shot];
      return Object.assign(res, { ok: !!shots.length, kind: 'notInFrame', who, shots, scope: '镜', target: shots.join('、'), variable: '规则·不入画', value: who, constraint: '若文学本写明此人在场可见 → 需剧作/导演确认', msg: shots.length ? '' : '请先在左侧选中一镜，或写镜号' });
    }
    // 戏核节拍：「006 多停两秒」「这里多停 1.5 秒」
    const hold = t.match(/多(停|留|定|看)\s*([一二两三四五\d.]+)\s*(秒|s|″)/);
    if (hold) { if (!shots.length && ctx.shot) shots = [ctx.shot]; if (!shots.length && /倒影/.test(t)) shots = ['S04-C030']; const add = num(hold[2]) || parseFloat(hold[2]); if (!Number.isFinite(add) || add <= 0) return { ok: false, text: t, msg: '多停的秒数要是正数，例如「C006 多停 1.5 秒」' };
      if (!shots.length) return { ok: false, text: t, msg: '多停哪一镜？请写镜号（如「006 多停两秒」）或先在左侧选中一镜' };
      return Object.assign(res, { ok: true, kind: 'duration', beat: true, shots, value: r1(WB.shot(ctx.st, shots[0]).duration + add), add, scope: '镜', target: shots.join('、'), variable: '时长（停顿节拍）', constraint: '只拉长停顿那段节拍，之后的节拍后移；组内其他未锁镜吸收；不拉长台词', msg: shots.length ? '' : '请写镜号' }); }
    // duration absolute
    if (/[-−－]\s*\d+(?:\.\d+)?\s*(秒|s|″|")/i.test(t)) return { ok: false, text: t, msg: '镜长不能是负数' };
    const dm = t.match(/(\d+(?:\.\d+)?)\s*(秒|s|″|")/i);
    if (dm && shots.length) return Object.assign(res, { ok: true, kind: 'duration', shots, value: +dm[1], scope: '镜', target: shots.join('、'), variable: '时长', constraint: '组内其他未锁镜吸收差值；组≤30″；场在窗口内' });
    // rhythm
    const fast = /(快一点|快点|紧一点|压短|缩短|更快|快些)/.test(t), slow = /(慢一点|放慢|慢点|拉长|更慢|慢些|舒缓)/.test(t);
    if (fast || slow) {
      const pm = t.match(/(\d+)\s*%/); const f = pm ? (fast ? 1 - pm[1] / 100 : 1 + pm[1] / 100) : (fast ? 0.85 : 1.15);
      if (shots.length) return Object.assign(res, { ok: true, kind: 'scale', shots, factor: f, gid: WB.groupOf(ctx.st, shots[0]).id, scope: '镜', target: shots.join('、'), variable: '时长（节奏）', constraint: '同组其他未锁镜吸收，保持组总秒' });
      if (gid) return Object.assign(res, { ok: true, kind: 'scaleGroup', gid, factor: f, scope: '组', target: gid, variable: '组节奏（全组时长）', constraint: '组≤30″；场在窗口内' });
    }
    const fo = t.match(/(焦距|焦段)\s*(改|调|设)?\s*(为|成|到)?\s*(\d{2,3})/);
    if (fo) { if (!shots.length && ctx.shot) shots = [ctx.shot]; return Object.assign(res, { ok: !!shots.length, kind: 'field', field: 'focal', value: +fo[4], shots, scope: '镜', target: shots.join('、'), variable: '焦距（球面等效 mm）', constraint: '已锁项只出黄色提议' }); }
    const ap = t.match(/光圈\s*(改|调|设)?\s*(为|成|到)?\s*T?(\d+(?:\.\d+)?)/i);
    if (ap) { if (!shots.length && ctx.shot) shots = [ctx.shot]; return Object.assign(res, { ok: !!shots.length, kind: 'field', field: 'aperture', value: 'T' + ap[3], shots, scope: '镜', target: shots.join('、'), variable: '光圈', constraint: '已锁项只出黄色提议' }); }
    const mv = t.match(new RegExp('(改|换|用)(成|为)?(' + WB.MOVES.slice().sort((a, b) => b.length - a.length).join('|') + ')'));
    if (mv) { if (!shots.length && ctx.shot) shots = [ctx.shot]; return Object.assign(res, { ok: !!shots.length, kind: 'field', field: 'move', value: mv[3], shots, scope: '镜', target: shots.join('、'), variable: '运镜（主）', constraint: '已锁项只出黄色提议' }); }
    const ct = t.match(/色温\s*(改|调|设)?\s*(为|成|到)?\s*(\d{4,5})/);
    if (ct) { if (!shots.length && ctx.shot) shots = [ctx.shot]; return Object.assign(res, { ok: !!shots.length, kind: 'field', field: 'ct', value: +ct[3], shots, scope: '镜', target: shots.join('、'), variable: '色温（K）', constraint: '文学本写明的光不改；已锁项只出提议' }); }
    const hq = t.match(/光(再)?(硬|柔|软)(一点|些)?/);
    if (hq) { if (!shots.length && ctx.shot) shots = [ctx.shot]; return Object.assign(res, { ok: !!shots.length, kind: 'field', field: 'quality', value: hq[2] === '硬' ? '硬' : '柔', shots, scope: '镜', target: shots.join('、'), variable: '光质', constraint: '已锁项只出提议' }); }
    return { ok: false, text: t, msg: '没读懂这句。可试：「前三镜快一点」「C005 改 2.5 秒」「C010 焦距 85」「组二节奏放慢」「这里别看见诺亚」「C003 光再硬一点」' };
  };

  /* ---------- 冲突（多人同改） ---------- */
  WB.conflictFor = function (st, who, sid, variable) {
    const seen = st.ack[who] || 0;
    for (let i = st.log.length - 1; i >= 0; i--) {
      const e = st.log[i]; if (e.rev <= seen) break;
      if (e.status !== '已应用' || e.who === who) continue;
      const tg = String(e.target || ''); const hit = (tg.includes(sid) || (e.touched || []).includes(sid)) && (e.variable || '').includes(variable);
      if (hit) return e;
    }
    return null;
  };
  WB.ackAll = (st, who) => { st.ack[who] = st.rev; };
  WB.unseenFor = (st, who) => st.log.filter((e) => e.rev > (st.ack[who] || 0) && e.who !== who && e.status === '已应用' && !/代选/.test(e.who) && !['复制', '模式'].includes(e.variable));

  /* ---------- apply ---------- */
  // opts: {who, ctx, confirm:true 执行（否则只预览）, force:true 覆盖冲突, mode:'absorb'|'total'}
  WB.apply = function (st, text, opts) {
    const who = opts.who; const p = WB.parse(text, Object.assign({ st }, opts.ctx || {}));
    if (!p.ok) return { status: '未识别', msg: p.msg, parsed: p };
    const base = { parsed: p, intent: { scope: p.scope, target: p.target, variable: p.variable, constraint: p.constraint } };
    if (!WB.unlocked(st)) return Object.assign(base, { status: '拒绝', msg: '第0关还未选方向，拆解未解锁' });
    if (p.literary) {
      const e = WB.logEntry(st, { who, text, scope: p.scope, target: p.target, variable: p.variable, before: '—', after: '—', status: '需剧作/导演确认' });
      st.proposals.push({ id: e.id, kind: 'literary', who, text, target: p.target, status: '需剧作/导演确认', time: e.time });
      return Object.assign(base, { status: '需剧作/导演确认', msg: '涉及台词、事件顺序或动作者：工作台不直接生效，已转剧作/导演确认', entry: e });
    }
    if (p.kind === 'lock') {
      if (!p.shots.length && p.gid && p.on) { if (!opts.confirm) return Object.assign(base, { status: '预览', msg: '将锁定' + WB.group(st, p.gid).name + '（先检查首尾衔接与 30″）' }); const r = WB.lockGroup(st, p.gid, who); return Object.assign(base, { status: r.ok ? '已应用' : '拒绝', msg: r.ok ? '已锁定' + WB.group(st, p.gid).name : r.msg }); }
      if (!p.shots.length && p.gid && !p.on) { const g = WB.group(st, p.gid); if (!opts.confirm) return Object.assign(base, { status: '预览', msg: '解锁将使以下内容失效', invalidates: g.shots.flatMap((id) => WB.invalidations(st, id)) }); if (who !== '导演') return Object.assign(base, { status: '拒绝', msg: '只有导演可以解锁' }); g.lock = '草案'; g.shots.forEach((id) => { const sh = WB.shot(st, id); if (sh.lock === '锁定') sh.lock = '草案'; }); const inv = WB.touchGroup(st, g.id); WB.logEntry(st, { who, text, scope: '组', target: g.id, variable: '锁定', before: '锁定', after: '草案', status: '已应用', invalidates: inv }); return Object.assign(base, { status: '已应用', msg: '已解锁' + g.name, invalidates: inv }); }
      const ids = p.shots.length ? p.shots : WB.group(st, p.gid).shots; const out = [];
      if (!p.on && !opts.confirm) return Object.assign(base, { status: '预览', msg: '解锁将使以下内容失效', invalidates: ids.flatMap((id) => WB.invalidations(st, id)) });
      if (p.on && !opts.confirm) return Object.assign(base, { status: '预览', msg: '将锁定 ' + ids.map((x) => x.slice(4)).join('、') + '（锁定后非导演的改动只出黄色提议）' });
      for (const id of ids) out.push(WB.setLock(st, id, p.on, who));
      const bad = out.find((r) => !r.ok); if (bad) return Object.assign(base, { status: '拒绝', msg: bad.msg });
      return Object.assign(base, { status: '已应用', msg: (p.on ? '已锁定 ' : '已解锁 ') + ids.map((x) => x.slice(4)).join('、'), invalidates: out.flatMap((r) => r.invalidates || []) });
    }
    if (p.kind === 'notInFrame') {
      const sid = p.shots[0]; const s = WB.shot(st, sid); const lines = st.data.literary.lines.slice(s.literary.lines[0] - 1, s.literary.lines[1]).map((l) => l.text).join('');
      const nm = p.who.replace(/^(看见|看到)/, '');
      const inLit = nm && lines.includes(nm) || (nm === '它' && lines.includes('诺亚'));
      if (inLit) {
        const e = WB.logEntry(st, { who, text, scope: '镜', target: sid, variable: '规则·不入画', before: '入画', after: nm + ' 不入画', status: '需剧作/导演确认' });
        st.proposals.push({ id: e.id, kind: 'literary', who, text, target: sid, status: '需剧作/导演确认', time: e.time, note: `文学本 L${s.literary.lines[0]}–${s.literary.lines[1]} 写明「${nm}」在此可见` });
        return Object.assign(base, { status: '需剧作/导演确认', msg: `文学本 L${s.literary.lines[0]}–${s.literary.lines[1]} 写明「${nm}」在这一镜可见：不入画会改戏，已转剧作/导演确认` });
      }
      if (WB.isLocked(st, sid, 'rules') && !(who === '导演' && opts.overrideLock)) { const e = WB.logEntry(st, { who, text, scope: '镜', target: sid, variable: '规则·不入画', before: '（已锁定）', after: '提议：' + text, status: '提议（黄）' }); st.proposals.push({ id: e.id, kind: 'locked', who, text, ctx: opts.ctx || {}, target: sid, status: '待导演点头', time: e.time }); return Object.assign(base, { status: '提议（黄）', msg: WB.lockReason(st, sid, 'rules') + '：不自动改，已标黄提议等导演点头', entry: e }); }
      if (!opts.confirm) return Object.assign(base, { status: '预览', msg: `将在 ${sid.slice(4)} 加规则：${nm} 不入画` });
      s.rules.push({ notInFrame: nm, by: who }); s.rev++; WB.touchGroup(st, WB.groupOf(st, sid).id);
      const e = WB.logEntry(st, { who, text, scope: '镜', target: sid, variable: '规则·不入画', before: '—', after: nm + ' 不入画', status: '已应用' });
      return Object.assign(base, { status: '已应用', msg: `已加规则：${sid.slice(4)} ${nm} 不入画` + (WB.NAME_EN[nm] ? '' : `｜「${nm}」还没有英文写法：正文暂不能表达，草稿会计入未就绪，正式生成被阻断（请资产/视听补英文名）`), entry: e });
    }
    // conflicts & locks for field/duration edits
    const variable = (p.kind === 'duration' || p.kind === 'scale' || p.kind === 'scaleGroup') ? '时长' : p.variable;
    const targets = p.kind === 'scaleGroup' ? WB.group(st, p.gid).shots : p.shots;
    if (!opts.force) {
      for (const id of targets) {
        const c = WB.conflictFor(st, who, id, variable);
        if (c) return Object.assign(base, { status: '冲突', msg: `${id.slice(4)} 的「${variable}」已被 ${c.who} 于 ${c.time.slice(11, 16)} 改过（${c.before} → ${c.after}），你还没看到这次改动`, conflict: { theirs: c, mine: text, sid: id, field: variable } });
      }
    }
    const fieldKey = { focal: 'focal', aperture: 'aperture', move: 'move', ct: 'lighting', quality: 'lighting' }[p.field] || 'duration';
    const locked = targets.filter((id) => WB.isLocked(st, id, fieldKey));
    if (locked.length && !(who === '导演' && opts.overrideLock)) {
      const e = WB.logEntry(st, { who, text, scope: p.scope, target: locked.join('、'), variable, before: '（已锁定）', after: '提议：' + text, status: '提议（黄）' });
      st.proposals.push({ id: e.id, kind: 'locked', who, text, ctx: Object.assign({}, opts.ctx || {}, { shot: locked[0] }), mode: opts.mode, target: locked.join('、'), status: '待导演点头', time: e.time });
      return Object.assign(base, { status: '提议（黄）', msg: `${WB.lockReason(st, locked[0], fieldKey)}：不自动改，已标黄提议等导演点头`, entry: e });
    }
    if (p.kind === 'duration' || p.kind === 'scale') {
      const gid = WB.groupOf(st, targets[0]).id;
      if (targets.some((id) => WB.groupOf(st, id).id !== gid)) return Object.assign(base, { status: '拒绝', msg: '一次只改同一组内的镜头（不跨组挪秒）' });
      const changes = {}; targets.forEach((id) => { changes[id] = p.kind === 'duration' ? p.value : r1(WB.shot(st, id).duration * p.factor); });
      const plan = WB.planDurations(st, gid, changes, opts.mode || 'absorb');
      if (plan.ok && !opts.force) { for (const x of plan.plan) { const c = WB.conflictFor(st, who, x.id, '时长'); if (c) return Object.assign(base, { status: '冲突', msg: `这次会连带改 ${x.id.slice(4)}，而它的时长刚被 ${c.who} 于 ${c.time.slice(11, 16)} 改过、你还没看到`, conflict: { theirs: c, mine: text, sid: x.id, field: '时长' }, plan }); } }
      if (!plan.ok) { const e = WB.logEntry(st, { who, text, scope: '组', target: gid, variable: '时长', before: plan.groupBefore + '″', after: (plan.groupAfter || '—') + '″', status: '拒绝（超限）', alarm: plan.reason }); return Object.assign(base, { status: plan.needRegroup ? '需重切组' : '超限', msg: plan.reason, plan, entry: e }); }
      const wl = WB.writeSetLocks(st, plan.plan, p.beat ? { id: targets[0] } : null);
      if (wl.length && !(who === '导演' && opts.overrideLock)) { const e = WB.logEntry(st, { who, text, scope: '组', target: gid, variable: '时长（连带锁定字段）', before: '（已锁定）', after: '提议：' + text, status: '提议（黄）' }); st.proposals.push({ id: e.id, kind: 'locked', who, text, ctx: Object.assign({}, opts.ctx || {}, { shot: targets[0] }), mode: opts.mode, target: targets.join('、'), status: '待导演点头', time: e.time }); return Object.assign(base, { status: '提议（黄）', msg: wl.join('；') + '：不自动改，已标黄提议等导演点头', entry: e }); }
      if (!opts.confirm) return Object.assign(base, { status: '预览', msg: '秒数扣减预览（确认后才生效）', plan });
      const e = WB.commitPlan(st, gid, plan.plan, who, text, p.beat ? { id: targets[0], text } : null); e.touched = plan.plan.map((x) => x.id);
      return Object.assign(base, { status: '已应用', msg: (p.beat ? WB.shot(st, targets[0]).beatNote + '；' : '') + `已改：${plan.plan.map((x) => `${x.id.slice(4)} ${x.before}→${x.after}″`).join('，')}；${WB.group(st, gid).name} ${plan.groupBefore}→${plan.groupAfter}″`, plan, entry: e });
    }
    if (p.kind === 'scaleGroup') {
      const g = WB.group(st, p.gid); const changes = {}; g.shots.forEach((id) => { if (!WB.isLocked(st, id, 'duration')) changes[id] = r1(WB.shot(st, id).duration * p.factor); });
      const plan = WB.planDurations(st, g.id, changes, 'total');
      if (!plan.ok) { const e = WB.logEntry(st, { who, text, scope: '组', target: g.id, variable: '时长', before: plan.groupBefore + '″', after: plan.groupAfter + '″', status: '拒绝（超限）', alarm: plan.reason }); return Object.assign(base, { status: plan.needRegroup ? '需重切组' : '超限', msg: plan.reason, plan, entry: e }); }
      const wl = WB.writeSetLocks(st, plan.plan, null);
      if (wl.length && !(who === '导演' && opts.overrideLock)) return Object.assign(base, { status: '拒绝', msg: wl.join('；') + '：请先解锁，或让导演改' });
      if (!opts.confirm) return Object.assign(base, { status: '预览', msg: '秒数预览（确认后才生效）', plan });
      const e = WB.commitPlan(st, g.id, plan.plan, who, text); e.touched = plan.plan.map((x) => x.id);
      return Object.assign(base, { status: '已应用', msg: `${g.name} ${plan.groupBefore}→${plan.groupAfter}″`, plan, entry: e });
    }
    if (p.kind === 'field') {
      const before = [], after = [];
      if (!opts.confirm) return Object.assign(base, { status: '预览', msg: `将把 ${targets.map((x) => x.slice(4)).join('、')} 的${p.variable}改为 ${p.value}` });
      const cur0 = targets.map((id) => { const s = WB.shot(st, id); return p.field === 'focal' ? s.focal.eq : p.field === 'aperture' ? s.aperture.value : p.field === 'move' ? s.move.primary : WB.effLight(st, s)[p.field]; });
      if (cur0.every((v) => String(v) === String(p.value))) return Object.assign(base, { status: '无变化', msg: `${targets.map((x) => x.slice(4)).join('、')} 的${p.variable}已经是 ${p.value}，未改动` });
      targets.forEach((id) => {
        const s = WB.shot(st, id);
        if (p.field === 'focal') { before.push(s.focal.eq); s.focal.eq = p.value; s.focal.eqOut = null; s.focal.inherit = false; }
        if (p.field === 'aperture') { before.push(s.aperture.value || '继承'); s.aperture.value = p.value; s.aperture.inherit = false; }
        if (p.field === 'move') { before.push(s.move.primary); s.move.primary = p.value; s.move.secondary = null; s.move.segments = [{ t0: 0, t1: s.duration, move: p.value, note: '白话改' }]; s.fixed = p.value === '固定'; }
        if (p.field === 'ct' || p.field === 'quality') {
          const L = WB.effLight(st, s); before.push(L[p.field]);
          s.lighting = Object.assign({}, s.lighting || {}, { [p.field]: p.value, inherit: s.lighting && s.lighting.inherit !== '继承自场' ? s.lighting.inherit : '镜细化' });
        }
        s.rev++;
      });
      const inv = []; Array.from(new Set(targets.map((id) => WB.groupOf(st, id).id))).forEach((x) => WB.touchGroup(st, x).forEach((y) => inv.push(y)));
      const e = WB.logEntry(st, { who, text, scope: '镜', target: targets.join('、'), variable: p.variable, before: before.join('，'), after: String(p.value), status: '已应用', invalidates: inv, touched: targets });
      return Object.assign(base, { status: '已应用', msg: `已改 ${targets.map((x) => x.slice(4)).join('、')} ${p.variable}：${before.join('，')} → ${p.value}`, entry: e });
    }
    return Object.assign(base, { status: '未识别', msg: '未处理' });
  };
  WB.acceptProposal = function (st, pid, who, accept) {
    const pr = st.proposals.find((x) => x.id === pid); if (!pr) return { ok: false };
    if (who !== '导演') return { ok: false, msg: '只有导演可以裁定' };
    let res = null;
    if (accept && pr.kind === 'locked') { res = WB.apply(st, pr.text, { who: '导演', ctx: pr.ctx || {}, mode: pr.mode, confirm: true, force: true, overrideLock: true }); if (res.status !== '已应用' && res.status !== '无变化') return { ok: false, msg: '重放失败，提议保持待处理：' + (res.msg || res.status), res }; }
    if (accept && pr.kind === 'literary') pr.note = (pr.note ? pr.note + '；' : '') + '导演同意 → 需剧作出文学补丁（工作台不改文学本）';
    pr.status = accept ? (pr.kind === 'literary' ? '导演已同意｜待剧作补丁' : '导演已同意') : '导演已驳回'; pr.decidedBy = who;
    WB.logEntry(st, { who, text: (accept ? '同意 ' : '驳回 ') + pr.text, scope: '提议', target: pr.target, variable: '裁定', before: '待定', after: pr.status, status: '已应用' });
    return { ok: true, res };
  };

  /* ---------- lighting ---------- */
  WB.effLight = function (st, s) {
    const sc = st.data.scene.lighting; const g = WB.groupOf(st, s.id); const gl = g.lighting || {};
    const L = Object.assign({}, sc, gl.inherit && gl.inherit !== '继承自场' ? gl : {}, s.lighting && s.lighting.inherit !== '继承自场' ? s.lighting : {});
    L.badge = s.lighting && s.lighting.inherit && s.lighting.inherit !== '继承自场' ? s.lighting.inherit : (gl.inherit && gl.inherit !== '继承自场' ? '组覆盖' : '继承自场');
    return L;
  };
  const angd = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return d; };
  WB.lightRel = function (st, s) {
    const L = WB.effLight(st, s); const src = st.data.scene.lightSources.find((x) => x.id === L.keySource);
    const yaw = s.position.yaw; if (!src || src.az == null || yaw == null) return null;
    const d = angd(src.az, yaw); const ad = Math.abs(d);
    const kind = ad < 60 ? '逆光' : ad > 120 ? '顺光' : (d > 0 ? '右侧光' : '左侧光');
    return { rel: d, kind, src: src.id };
  };
  WB.lightChecks = function (st) {
    const out = [];
    st.data.groups.forEach((g) => {
      let prev = null;
      g.shots.forEach((id) => {
        const s = WB.shot(st, id); const L = WB.effLight(st, s); const r = WB.lightRel(st, s);
        if (r && /rim|silhouette/.test(L.key) && r.kind === '顺光') out.push({ id, type: '逆光声明与机位矛盾', text: `${id.slice(4)} 写「${L.keyZh}」，但 ${r.src} 在机位身后（实为顺光）`, fix: '在被摄者身后加一个逆光源（如身后轨道灯）或改主光类型', level: '红' });
        if (prev && r && prev.r) {
          const sideFlip = (prev.r.kind === '左侧光' && r.kind === '右侧光') || (prev.r.kind === '右侧光' && r.kind === '左侧光');
          const yawDiff = Math.abs(angd(prev.s.position.yaw, s.position.yaw));
          if (sideFlip && yawDiff < 90 && !L.jumpReason) out.push({ id, type: '光向跳', text: `${prev.s.id.slice(4)}→${id.slice(4)} 主光左右翻转而机位未反打`, level: '橙' });
        }
        if (prev && L.keySource !== prev.L.keySource && !L.jumpReason && !(prev.L.keyOut) && !(prev.L.jumpReason && L.keySource === st.data.scene.lighting.keySource)) out.push({ id, type: '光向跳', text: `${prev.s.id.slice(4)}→${id.slice(4)} 主光源由 ${prev.L.keySource} 变 ${L.keySource}，未写原因`, level: '橙' });
        prev = { s, L, r };
      });
    });
    return out;
  };

  /* ---------- optics ---------- */
  WB.anamorphic = (st) => !(st.decisions.OPTICS && /球面/.test(st.decisions.OPTICS.value || ''));
  WB.actualFocal = (st, eq) => eq ? Math.round(eq * (WB.anamorphic(st) ? st.data.scene.optics.anamorphicFactor : 1)) : null;
  WB.deriveOptics = function (st, s) {
    const apv = parseFloat(String(s.aperture.value || 'T2.8').slice(1));
    if (s.optics && s.optics.triggered) return s.optics.triggered.filter((x) => !x.off).filter((x) => !(x.k === '焦外' && apv > 4)).map((x) => x.k === '焦外' ? Object.assign({}, x, { trig: '变形镜头＋' + (s.aperture.value || 'T2.8') }) : x);
    const L = WB.effLight(st, s); const inF = (s.lighting && s.lighting.inFrame) || [];
    const out = [];
    if (s.id === 'S04-C010') out.push({ k: '炫光', v: '红色横向拉丝＋红色雾化眩光（全场最强光学事件）', trig: 'L3 红光直射入镜' });
    else if (inF.length) out.push({ k: '炫光', v: inF.includes('L3') ? '红色短拉丝' : '青色横向拉丝', trig: inF.join('、') + ' 入画' });
    const ap = s.aperture.value || 'T2.8'; if (parseFloat(ap.slice(1)) <= 2.8) out.push({ k: '焦外', v: '竖向椭圆光斑', trig: '变形镜头＋' + ap });
    if (/rim|silhouette/.test(L.key || '')) out.push({ k: '光晕', v: '逆光边缘高光外溢', trig: '逆光' });
    return out;
  };
  WB.opticsPromptText = function (st, s) {
    const map = { 炫光: (x) => /红/.test(x.v) ? (s.id === 'S04-C010' ? 'red horizontal streak flare with red veiling glare as the red light hits the lens' : 'short red streak flare') : 'thin cyan horizontal streak flare only while the backlight is in frame', 焦外: () => 'vertical oval bokeh on out-of-focus lights', 光晕: () => 'soft halation around backlit wet highlights', 色差: () => 'faint cyan-purple fringing only at frame corners', 暗角: () => 'light vignette', 呼吸: () => 'slight focus breathing during the focus pull', 光圈约束: () => 'keep the distant drone silhouette readable' };
    const ana = WB.anamorphic(st);
    return WB.deriveOptics(st, s).map((x) => map[x.k] ? map[x.k](x) : null).filter(Boolean).filter((t) => ana || !/streak|oval|anamorphic|halation|fringing/i.test(t)).join('; ');
  };

  /* ---------- REF / gaps ---------- */
  WB.refEntriesFor = (st, id) => st.refIndex.entries.filter((e) => e.id === id && e.kind !== '缺资产候选');
  WB.gapKey = (a) => (a.id || 'TMP:' + a.name) + '@' + a.state + '@' + a.view;
  /* 文件态：只有真正落地（apply_ops 已移动、sha 已记）的条目才算「有」 */
  WB.landed = (e) => !e.fileState || /^已落地/.test(e.fileState);
  /* 场级决定（光学包、风格、灯光）：所有组的片段与签字失效 */
  WB.decide = function (st, key, kind, val, who) {
    if (who !== '导演') return { ok: false, msg: '只有导演可以定' };
    const before = (st.decisions[key] || {}).value || st.approvals[key] || '—';
    if (kind === '第0关决定' || kind === '光学包') st.decisions[key] = { value: val, by: '导演', proxy: false, time: nowStr() };
    else if (kind === 'REF 待批' && val === '批准') st.refIndex.entries.filter((e) => e.key === key && e.status === '待批').forEach((e) => { e.status = '已批'; e.approvedBy = '导演'; });
    else st.approvals[key] = val;
    const inv = [];
    if (String(before) !== String(val) && /光学|风格|灯光|LIGHT|OPTICS|STYLE/.test(kind + key)) st.data.groups.forEach((g) => WB.touchGroup(st, g.id).forEach((x) => inv.push(x)));
    const ci = /^CI-/.test(key) && (st.data.scene.continuityIssues || []).find((c) => c.id === key);
    if (ci && String(before) !== String(val)) { if (st.ciClosed) delete st.ciClosed[key]; (ci.groups || []).forEach((gid) => WB.touchGroup(st, gid).forEach((x) => inv.push(x))); }
    WB.logEntry(st, { who, text: `定：${key} → ${val}`, scope: '待导演定', target: key, variable: kind, before, after: val, status: '已应用', invalidates: inv });
    return { ok: true, invalidates: inv };
  };
  WB.assetStatus = function (st, a) {
    if (!a.id) {
      const pick = st.picks[WB.gapKey(a)]; const tc = WB.tmpCode(a.name);
      const ok = st.refIndex.entries.filter((e) => e.tmpId === tc && e.state === a.state && e.view === a.view && e.status === '已批');
      if (ok.some(WB.landed)) return { type: null, state: '已批', tmp: tc };
      if (ok.length) return { type: '待补码', state: '已批｜待落地', pick, tmp: tc };
      return pick ? { type: '待补码', state: '待批', pick, tmp: tc } : { type: '待补码', state: '缺', tmp: tc };
    }
    const es = WB.refEntriesFor(st, a.id);
    const pick = st.picks[WB.gapKey(a)];
    const appr = es.filter((e) => e.status === '已批' && WB.landed(e));
    if (appr.some((e) => e.state === a.state && e.view === a.view)) return { type: null, state: '已批' };
    if (es.some((e) => e.status === '已批' && !WB.landed(e) && e.state === a.state && e.view === a.view)) return { type: '有图未批', state: '已批｜待落地', pick };
    if (es.some((e) => e.state === a.state && e.view === a.view)) return { type: '有图未批', state: '待批', pick };
    let type;
    if (!es.length) type = '有码无图'; else if (!appr.length) type = '有图未批'; else if (!appr.some((e) => e.state === a.state)) type = '状态不符'; else type = '缺视角';
    return pick ? { type, state: '待批', pick } : { type, state: es.some((e) => e.state === a.state && e.view === a.view && e.status === '待批') ? '待批' : '缺' };
  };
  WB.gaps = function (st) {
    const map = new Map();
    st.data.shots.forEach((s) => s.assets.forEach((a) => {
      if (a.inFrame === false) return;
      const stt = WB.assetStatus(st, a); if (!stt.type) return;
      const k = WB.gapKey(a);
      if (!map.has(k)) map.set(k, { key: k, id: a.id, tmp: a.id ? null : WB.tmpCode(a.name), name: a.name || (st.data.registryNames[a.id] || a.id), state: a.state, view: a.view, type: stt.type, status: stt.state, shots: [], note: a.note || '' });
      map.get(k).shots.push(s.id);
    }));
    return Array.from(map.values()); // 已按首次出现镜号排序（遍历顺序）
  };
  WB.candidatesFor = function (st, gap) {
    return st.refIndex.entries.filter((e) => e.kind === '缺资产候选' && ((gap.id && e.id === gap.id) || (!gap.id && e.gapName && gap.name.includes(e.gapName))) && e.state === gap.state && e.view === gap.view);
  };
  WB.refPath = (id, state, view, cand) => { const f = (x) => String(x).replace(/[\/\\:*?"<>|\s]+/g, '-'); return `assets/REF/${f(id)}/${f(id)}_${f(state)}_${f(view)}_v01${cand ? '_' + cand : ''}.png`; };
  WB.pickCandidate = function (st, gapKey, cand, note, who) {
    const gap = WB.gaps(st).find((g) => g.key === gapKey); if (!gap) return { ok: false, msg: '该缺口已不存在' };
    const cands = WB.candidatesFor(st, gap); const c = cands.find((x) => x.key.endsWith('#' + cand));
    if (!c) return { ok: false, msg: '候选 ' + cand + ' 还没有图（待生成），不能选' };
    const id = gap.id || gap.tmp || (c.key.split('@')[0]);
    const finalPath = WB.refPath(id, gap.state, gap.view);
    st.picks[gapKey] = { cand, note, who, time: nowStr(), sha8: c.sha8, file: finalPath, src: c.file };
    st.refIndex.entries.push({ key: `${id}@${gap.state}@${gap.view}`, id: gap.id || null, tmpId: gap.id ? null : id, kind: 'REF', state: gap.state, view: gap.view, file: finalPath, status: '待批', fileState: '待落地（apply_ops）', sha8: c.sha8, source: c.source, picker: who, time: nowStr(), note });
    st.ops.push({ op: 'move', from: c.file, to: finalPath });
    cands.filter((x) => x !== c).forEach((x) => st.ops.push({ op: 'move', from: x.file, to: `assets/REF/${id}/_候选存档/` + x.file.split('/').pop() }));
    WB.logEntry(st, { who, text: `缺资产选定 ${cand}：${gap.name}`, scope: '资产', target: gapKey, variable: 'REF 入库', before: '缺', after: '已入库｜待批', status: '已应用' });
    return { ok: true, path: finalPath };
  };

  /* ---------- boundary / continuity checks ---------- */
  WB.boundaryCheck = function (st, gid) {
    const gi = st.data.groups.findIndex((g) => g.id === gid); const g = st.data.groups[gi]; const prev = st.data.groups[gi - 1];
    if (!prev) return { ok: true, diffs: [] };
    const a = prev.endState || {}, b = g.startState || {}; const diffs = [];
    new Set(Object.keys(a).concat(Object.keys(b))).forEach((k) => { if (a[k] !== b[k]) diffs.push({ k, prevEnd: a[k], start: b[k] }); });
    return { ok: !diffs.length, diffs, prev: prev.id };
  };
  WB.refreshFirstFrameRefs = function (st) {
    st.data.groups.forEach((g, i) => {
      const prev = st.data.groups[i - 1]; if (!prev) return;
      const actual = prev.clips.find((c) => c.lastFrame && c.lastFrameData !== undefined && c.status === '已批');
      const last = WB.shot(st, prev.shots[prev.shots.length - 1]);
      const cur = g.firstFrameRef;
      if (actual) { if (!cur || cur.file !== actual.lastFrame) g.firstFrameRef = { file: actual.lastFrame, from: '上一组实际尾帧', sha8: actual.sha8, status: '候选', clip: actual.id }; }
      else if (!cur || cur.from !== '上一组实际尾帧') g.firstFrameRef = { file: last.sketch ? last.sketch.out : `assets/sketch/${last.id}_${last.fixed ? 'in' : 'out'}.png`, from: '上一组末镜草图', exists: !!last.sketch, status: last.sketch ? last.sketch.status : '待生成' };
    });
  };
  /* 下游复核：任何片段（候选或已批）只要生成依据（groupHash，含首帧完整 hash）变了，就退回需复核、撤签、解组锁 */
  WB.revalidate = function (st, gid, who) {
    const g = WB.group(st, gid); const clip = g && g.clips.filter((c) => c.status !== '已作废').slice(-1)[0]; if (!clip || !clip.basedOn) return false;
    if (clip.basedOn === WB.groupHash(st, gid)) return false;
    const was = clip.status; clip.status = '需复核'; Object.keys(clip.checks).forEach((k) => { clip.checks[k] = false; }); if (g.lock === '锁定') g.lock = '草案';
    WB.logEntry(st, { who: who || '系统', text: `${clip.id} 生成依据变了（首帧/内容）→ ${was} 改为需复核，三方签字与组锁撤销`, scope: '组', target: gid, variable: '验收', before: was, after: '需复核', status: '已应用' });
    return true;
  };
  WB.LASTFRAME_ROLES = ['视听', '剪辑', '导演'];
  WB.setLastFrame = function (st, gid, dataUrl, sha, who) {
    if (!WB.LASTFRAME_ROLES.includes(who)) return { ok: false, msg: '只有视听、剪辑或导演可以回填尾帧' };
    const g = WB.group(st, gid); const clip = g.clips.filter((c) => c.status !== '已作废').slice(-1)[0]; if (!clip) return { ok: false, msg: '先登记片段' };
    // 不信任自报：只收图片 dataURL，sha 由本函数对存储内容重算；传 null = 撤下尾帧（下组首帧随之过期）
    if (dataUrl != null && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]{64,}$/.test(dataUrl)) return { ok: false, msg: '不是可用的图片（只收 PNG/JPEG/WebP）' };
    if (dataUrl == null) { if (!clip.lastFrameData) return { ok: false, msg: '本片段还没有尾帧' }; sha = null; } else sha = WB.sha256(dataUrl);
    if (clip.lastFrameData && clip.lastFrameSha === sha) return { ok: true, applied: clip.status === '已批', sha8: sha.slice(0, 8), unchanged: true };
    const replacing = !!clip.lastFrameData && clip.lastFrameSha !== sha;
    if (dataUrl == null) { const gi = st.data.groups.indexOf(g); const next = st.data.groups[gi + 1]; if (next && next.firstFrameRef && next.firstFrameRef.from === '上一组实际尾帧') { next.firstFrameRef.status = '过期'; next.refExpired = true; WB.touchGroup(st, next.id, { depth: 1 }); } clip.lastFrameData = null; clip.lastFrameSha8 = null; clip.lastFrameSha = null; WB.logEntry(st, { who, text: `${clip.id} 撤下实际尾帧`, scope: '组', target: gid, variable: '实际尾帧', before: '有', after: '—', status: '已应用' }); return { ok: true, applied: false, cleared: true }; }
    if (replacing) { const gi = st.data.groups.indexOf(g); const next = st.data.groups[gi + 1]; if (next) WB.touchGroup(st, next.id, { depth: 1 }); if (next && next.firstFrameRef && next.firstFrameRef.from === '上一组实际尾帧') { next.firstFrameRef.status = '过期'; next.refExpired = true; } if (clip.status === '已批') { clip.status = '需复核'; Object.keys(clip.checks).forEach((k) => { clip.checks[k] = false; }); } }
    const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
    clip.lastFrameData = dataUrl; clip.lastFrameSha = sha; clip.lastFrameSha8 = sha.slice(0, 8); clip.lastFrameFile = clip.lastFrame.replace(/\.png$/, mime === 'image/jpeg' ? '.jpg' : mime === 'image/webp' ? '.webp' : '.png');
    clip.lastFrameMeta = { mime, bytes: Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4), who, time: nowStr(), fromClip: clip.id, clipBasedOn: clip.basedOn, source: '人工上传（视频自动抽帧未接入）' };
    WB.logEntry(st, { who, text: `${clip.id} 回填实际尾帧 ${clip.lastFrameFile}（sha ${sha.slice(0, 8)}）`, scope: '组', target: gid, variable: '实际尾帧', before: '—', after: sha.slice(0, 8), status: '已应用' });
    if (clip.status === '已批') WB.checkClip(st, gid, null, who, true);
    return { ok: true, applied: clip.status === '已批', sha8: sha.slice(0, 8) };
  };
  /* 组内容指纹：片段审批绑定到生成时的内容版本 */
  WB.groupHash = function (st, gid) { const g = WB.group(st, gid); return WB.sha8(JSON.stringify(g.shots.map((id) => { const s = WB.shot(st, id); return [s.duration, s.focal, s.aperture, s.move, s.lighting, s.dialogue.map((d) => [d.t0, d.t1, d.en]), s.rules, s.actionEn]; })) + JSON.stringify(st.decisions.OPTICS || '') + JSON.stringify(g.firstFrameRef ? [g.firstFrameRef.sha || g.firstFrameRef.sha8 || '', g.firstFrameRef.from] : '')); };
  WB.registerClip = function (st, gid, who, opt) {
    const g = WB.group(st, gid); const n = g.clips.length + 1; const v = String(n).padStart(2, '0');
    const sha = opt && opt.sha8 || WB.sha8(gid + n + nowStr());
    const regen = g.clips.some((c) => c.status !== '已作废');
    g.clips.forEach((c) => { if (c.status !== '已作废') c.status = '已作废'; });
    const clip = { basedOn: WB.groupHash(st, gid), id: `S04-${gid}_clip_v${v}`, sha8: sha, status: '候选', checks: { 剧作: false, 资产: false, 视听: false }, lastFrame: `assets/clips/S04-${gid}_out_actual_v${v}.png`, who, time: nowStr() };
    g.clips.push(clip);
    g.acceptance && Object.values(g.acceptance).forEach((arr) => arr.forEach((x) => { x.ok = false; }));
    const gi = st.data.groups.indexOf(g); const next = st.data.groups[gi + 1];
    if (regen && next) { if (next.firstFrameRef && next.firstFrameRef.from === '上一组实际尾帧') { next.firstFrameRef.status = '过期'; next.refExpired = true; } WB.touchGroup(st, next.id, { depth: 1 }); if (next.firstFrameRef) { next.firstFrameRef.status = '过期'; next.refExpired = true; } }
    WB.logEntry(st, { who, text: `登记生成片段 ${clip.id}（候选）` + (regen ? '；上一版作废，下一组首帧 REF 标过期' : ''), scope: '组', target: gid, variable: '片段', before: '—', after: clip.id, status: '已应用' });
    return clip;
  };
  WB.checkClip = function (st, gid, role, who, refreshOnly) {
    const g = WB.group(st, gid); const clip = g.clips.filter((c) => c.status !== '已作废').slice(-1)[0]; if (!clip) return { ok: false, msg: '本组还没有登记片段' };
    if (!refreshOnly && g.refExpired) return { ok: false, msg: '本组首帧 REF 已过期：先更新首帧并重新生成，再验收' };
    if (!refreshOnly && clip.basedOn && clip.basedOn !== WB.groupHash(st, gid)) return { ok: false, msg: '片段是按旧内容生成的：请重新登记片段后再验收' };
    if (refreshOnly) { const gi = st.data.groups.indexOf(g); const next = st.data.groups[gi + 1]; if (next && clip.status === '已批' && clip.lastFrameData) { next.firstFrameRef = { file: clip.lastFrameFile || clip.lastFrame, data: clip.lastFrameData, from: '上一组实际尾帧', sha: clip.lastFrameSha, sha8: clip.lastFrameSha8 || clip.sha8, status: '已批', clip: clip.id }; next.refExpired = false; WB.revalidate(st, next.id, who); } return { ok: true, clip }; }
    if (role !== who && who !== '导演') return { ok: false, msg: `只能由「${role}」本人勾选` };
    const allOk = (g.acceptance[role] || []).every((x) => x.ok);
    if (!allOk) return { ok: false, msg: `「${role}」验收清单还有未勾项` };
    clip.checks[role] = true;
    if (Object.values(clip.checks).every(Boolean)) { clip.status = '已批'; }
    WB.logEntry(st, { who, text: `${clip.id} ${role} 验收通过` + (clip.status === '已批' ? '；三方通过 → 已批' : ''), scope: '组', target: gid, variable: '验收', before: '—', after: role, status: '已应用' });
    if (clip.status === '已批') { const gi = st.data.groups.indexOf(g); const next = st.data.groups[gi + 1]; if (next) { if (clip.lastFrameData) { next.firstFrameRef = { file: clip.lastFrameFile || clip.lastFrame, data: clip.lastFrameData, from: '上一组实际尾帧', sha: clip.lastFrameSha, sha8: clip.lastFrameSha8 || clip.sha8, status: '已批', clip: clip.id }; next.refExpired = false; WB.revalidate(st, next.id, who); } else clip.note = '已批，但还没回填实际尾帧：下一组仍用草图首帧'; } }
    return { ok: true, clip };
  };
  WB.setAcceptance = function (st, gid, role, k, on, who) {
    const g = WB.group(st, gid); if (role !== who && who !== '导演') return { ok: false, msg: `只能由「${role}」本人勾选` };
    g.acceptance[role][k].ok = on; const clip = g.clips.filter((c) => c.status !== '已作废').slice(-1)[0];
    const revoked = !!(!on && clip && clip.checks[role]);
    if (revoked) { clip.checks[role] = false; if (clip.status === '已批') { clip.status = '候选'; WB.touchGroup(st, gid); } WB.logEntry(st, { who, text: `${role} 取消验收项「${g.acceptance[role][k].k}」→ 撤销该角色通过`, scope: '组', target: gid, variable: '验收', before: '通过', after: '未通过', status: '已应用' }); }
    return { ok: true, revoked };
  };
  WB.canLockGroup = function (st, gid) {
    const b = WB.boundaryCheck(st, gid); const g = WB.group(st, gid); const sec = WB.groupSec(st, g); const why = [];
    if (!b.ok) why.push('首尾状态不衔接：' + b.diffs.map((d) => d.k).join('、'));
    if (sec > WB.MAX_GROUP) why.push(`组秒 ${sec}″ 超过 30″`);
    return { ok: !why.length, why };
  };
  WB.lockGroup = function (st, gid, who) {
    if (who !== '导演') return { ok: false, msg: '只有导演可以锁组' };
    const c = WB.canLockGroup(st, gid); if (!c.ok) return { ok: false, msg: '不能锁组：' + c.why.join('；') };
    const g = WB.group(st, gid); g.lock = '锁定'; WB.logEntry(st, { who, text: '锁定 ' + g.name, scope: '组', target: gid, variable: '锁定', before: '草案', after: '锁定', status: '已应用' });
    return { ok: true };
  };
  WB.continuityChecks = function (st) {
    const out = [];
    const shots = st.data.shots;
    shots.forEach((s) => {
      const e = s.assets.find((a) => a.id === 'CH-01');
      if (e && s.n >= 20 && e.state !== 'E2') out.push({ id: s.id, type: '伤位/状态', text: `${s.id.slice(4)} 应为 E2（左肩伤自 C020 起），现为 ${e.state}`, level: '红' });
      if (e && s.n < 20 && e.state === 'E2') out.push({ id: s.id, type: '伤位/状态', text: `${s.id.slice(4)} 在受伤前却标 E2`, level: '红' });
      if (/LEFT arm|left hand on the ground|supports? (his|Elias's) left/i.test(s.actionEn)) out.push({ id: s.id, type: '左右手', text: `${s.id.slice(4)} 英文动作写了左臂/左手支撑，文学本为右臂/右手`, level: '红' });
      const hasW = (s.warnings || []).some((w) => /台词/.test(w.type));
      if (!hasW) s.dialogue.forEach((d) => { if (d.t1 > s.duration + 0.05) out.push({ id: s.id, type: '台词溢出', text: `${s.id.slice(4)} 时长 ${s.duration}″，台词「${d.en}」估算到 ${d.t1}″ 才念完`, level: '红', fix: '拆镜或组内调秒；台词不动' }); });
      const over = s.dialogue.some((d) => d.t1 > s.duration + 0.05);
      (s.warnings || []).forEach((w) => { if (/台词/.test(w.type) && !over) return; out.push({ id: s.id, type: w.type, text: w.text, fix: w.fix, level: '红', src: w.src }); }); // 剧作原风险：当前数值已容纳则不再重放
      const nm = (x) => String(x).replace(/[（(].*?[)）]/g, '').trim(); const gs = new Set((s.ground || []).map(nm)); (s.bag || []).map(nm).filter((x) => gs.has(x) && !/半露/.test(x)).forEach((x) => out.push({ id: s.id, type: '物件唯一', text: `${s.id.slice(4)}「${x}」同时记在包内和地上`, level: '红' }));
      if ((s.bgActions || []).length > 3) out.push({ id: s.id, type: '背景动作过多', text: `${s.id.slice(4)} 背景并行动作 ${s.bgActions.length} 个（>3），生成易乱`, level: '橙', fix: '同组内拆镜，每镜≤3–4 个背景动作' });
    });
    // bag continuity: items removed must not reappear
    const gone = new Set(); let prevBag = null;
    shots.forEach((s) => {
      if (prevBag) prevBag.forEach((x) => { if (!s.bag.includes(x) && !s.ground.includes(x)) gone.add(x); });
      s.bag.concat(s.ground).forEach((x) => { if (gone.has(x)) out.push({ id: s.id, type: '包内物件', text: `${x} 已被收走/毁掉，却在 ${s.id.slice(4)} 重新出现`, level: '红' }); });
      prevBag = s.bag.concat(s.ground);
    });
    const gel = shots.filter((s) => s.assets.some((a) => a.id === 'PR-05'));
    gel.forEach((s) => { const a = s.assets.find((x) => x.id === 'PR-05'); if (s.n < 28 && a.state !== 'G0') out.push({ id: s.id, type: '道具状态', text: `凝胶在 C028 被踩前应为 G0`, level: '红' }); if (s.n >= 28 && a.state !== 'G1') out.push({ id: s.id, type: '道具状态', text: `凝胶 C028 起应为 G1（被踩裂）`, level: '红' }); });
    // chain integrity
    st.data.groups.forEach((g) => (g.chain || []).forEach((id) => { if (!g.shots.includes(id)) out.push({ id, type: '不可切链', text: `${id} 属于 ${g.name} 的不可切链，但不在该组`, level: '红' }); }));
    return out;
  };

  /* ---------- prompt ---------- */
  WB.STATE_EN = { 雨帽: 'RAIN-HOOD', '4人编组': 'SQUAD-OF-4', 巡检: 'PATROL', 左手套: 'LEFT-GLOVE', 红扫描: 'RED-SCAN', 退去: 'RECEDING', CARE锁: 'CARE-LOCK', 识别卡: 'ID-CARD', 悬停: 'HOVER', 持终端: 'WITH-TERMINAL', 离场: 'DEPARTING', 闪烁: 'FLICKER', '降落/舱门': 'LANDED-HATCH', 降落: 'LANDING', 模块: 'MODULE', 满包: 'FULL', 翻倒: 'SPILLED', 诺亚拿: 'HELD-BY-CHILD', 卷: 'ROLL', 倒计时: 'COUNTDOWN', 持握: 'IN-HAND', 黑雨夜: 'BLACK-RAIN-NIGHT', 转动: 'ROTATING' };
  WB.TMP_EN = [[/模块/, 'VISTA-MODULE'], [/无人机/, 'SCAN-DRONE'], [/组长/, 'SQUAD-LEADER'], [/飞行器/, 'CMD-AIRCRAFT'], [/作业灯/, 'WORK-LAMP'], [/水坑/, 'PUDDLE']];
  WB.refTag = function (a) {
    const stt = WB.STATE_EN[a.state] || (WB.CJK.test(a.state) ? 'STATE-' + WB.sha8(a.state).slice(0, 4).toUpperCase() : a.state);
    const vw = WB.VIEW_EN[a.view]; const tail = vw ? '/' + vw : '';
    if (a.id) return a.id + '@' + stt + tail;
    return WB.tmpCode(a.name) + '@' + stt + tail;
  };
  WB.CJK = /[\u2e80-\u2fdf\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef「」『』【】]|[\ud840-\ud87f][\udc00-\udfff]/;
  WB.VIEW_EN = { 正面: 'FRONT', 侧面: 'SIDE', 背面: 'BACK', 外观: 'EXTERIOR', 全身: 'FULL-BODY', 特写: 'CLOSE', 俯视: 'TOP' };
  /* 对角视场角（全画幅 43.27mm 对角线，按球面等效焦距） */
  WB.fov = (f) => Math.round(2 * Math.atan(43.27 / (2 * f)) * 180 / Math.PI);
  WB.dofEn = (t) => { const v = parseFloat(String(t || 'T2.8').replace(/[^\d.]/g, '')) || 2.8; return v <= 2.8 ? 'shallow depth of field' : v <= 4.5 ? 'moderate depth of field' : 'deep focus'; };
  /* 人物最小锚点（只取场内数据与注册表已写的可见特征；其余由参考图决定） */
  WB.CHAR_EN = { 'CH-01': 'The father: adult man, glasses, old work jacket', 'CH-02': 'The android child: child-sized, partly repaired care android with a child-like face and slight build', 'CH-03': 'The commander: adult man in command of the recycler team', 'S04-TMP-CH-LEADER': 'The team leader: adult recycler in field gear with an earpiece' };
  WB.imageStatus = function (st, g, k) {
    if (k === 'FIRST-FRAME') return g.firstFrameRef ? g.firstFrameRef.status : '缺';
    if (g.map && k === g.map.code) return g.map.status;
    const m = k.match(/^(S04-C\d{3})_(in|out)$/); if (m) { const s = WB.shot(st, m[1]); return s.sketch ? s.sketch.status : '缺'; }
    return '未知';
  };
  /* 冲突处理状态：待导演确认 → 导演已定（选首项＝本场按新文学，无需外部补丁即可关闭；选其他项＝待剧作补丁） → 已关闭 */
  WB.ciState = function (st, c) { if (c.closed || (st.ciClosed || {})[c.id]) return '已关闭'; const v = (st.approvals || {})[c.id]; if (!v) return c.status || '待导演确认'; return WB.ciChoice(st, c) === 0 ? '导演已定｜可关闭' : '导演已定｜待剧作补丁'; };
  WB.closeCI = function (st, id, who) { const c = (st.data.scene.continuityIssues || []).find((x) => x.id === id); if (!c) return { ok: false, msg: '没有这条冲突' }; if (who !== '导演') return { ok: false, msg: '只有导演可以关闭冲突' }; const s0 = WB.ciState(st, c); if (s0 === '待导演确认') return { ok: false, msg: '先在「待导演定」选择处理方案' }; if (s0 === '导演已定｜待剧作补丁') return { ok: false, msg: '这项要改文学本：剧作补丁落地前不能关闭' }; st.ciClosed = st.ciClosed || {}; st.ciClosed[id] = { who, time: nowStr() }; st.data.groups.filter((g) => !c.groups || c.groups.includes(g.id)).forEach((g) => WB.touchGroup(st, g.id)); WB.logEntry(st, { who, text: '关闭冲突 ' + id, scope: '场', target: id, variable: '新旧文学冲突', before: s0, after: '已关闭', status: '已应用' }); return { ok: true }; };
  WB.ciChoice = function (st, c) { const v = (st.approvals || {})[c.id]; if (!v) return 0; const i = (c.options || []).indexOf(v); return i < 0 ? 0 : i; };
  WB.buildPrompt = function (st, gid) {
    const g = WB.group(st, gid); const sc = st.data.scene; const shots = g.shots.map((id) => WB.shot(st, id));
    const L = []; const en = (t) => L.push({ t: WB.deName(t), en: true }); const note = (t) => L.push({ t: '// ' + t, en: false }); const cmt = (t) => L.push({ t: '// ' + t, en: true, cmt: true });
    const pending = [];
    note(`管理头（不进正文）：S04｜${gid}｜${shots[0].id}–${shots[shots.length - 1].id.slice(4)}｜${WB.groupSec(st, g)}″`);
    note('草案｜由工作台按 CINEDANCE 规则库从数据组装；提示词正文以 CINEDANCE 模块最终稿为准');
    en(''); en('SCENE CONTEXT');
    en('Black-rain night at the edge of the Rustline scrapyard exit. The action is already under way in the first frame; nothing is re-staged.' + (gid === 'G1' ? ' Already running: no first exit, no line crossing.' : ''));
    en(''); en('OUTPUT SETTINGS');
    const chainN = shots.filter((s, i) => i < shots.length - 1 && (g.chain || []).includes(s.id) && (g.chain || []).includes(shots[i + 1].id)).length;
    en(`Controlled multi-shot sequence, ${shots.length - chainN} shots${chainN ? ` (the last one is a single continuous take in ${chainN + 1} timed phases)` : ''}, hard cuts only at the listed times. Real-time motion, no slow motion. No subtitles. No music. Only the quoted scripted lines are spoken, word for word; no ad-libs; lips stay still when not speaking; other characters listen silently. Active panels glow with blank surfaces; any readable text is added in post.`);
    /* 连续链（NO CUT）编号：链内各段是同一镜的阶段，不再算新镜 */
    const lab = []; { let n = 0, ph = 0; shots.forEach((s, i) => { const cont = i > 0 && (g.chain || []).includes(s.id) && (g.chain || []).includes(shots[i - 1].id); if (cont) ph++; else { n++; ph = ((g.chain || []).includes(s.id) && i < shots.length - 1 && (g.chain || []).includes(shots[i + 1].id)) ? 1 : 0; } lab.push(ph ? `Shot ${n}, phase ${ph}` : `Shot ${n}`); }); }
    en(''); en('ACTIVE REFERENCES');
    const seen = new Set(); const seenTag = new Set();
    shots.forEach((s) => s.assets.forEach((a) => {
      if (a.inFrame === false) return; const k = WB.gapKey(a); if (seen.has(k)) return; seen.add(k);
      const stt = WB.assetStatus(st, a);
      if (stt.state !== '已批') pending.push({ k, state: stt.state, type: stt.type });
      const tag = WB.refTag(a); if (seenTag.has(tag)) return; seenTag.add(tag);
      en(`[REF:${tag}] ${stt.state === '已批' ? 'bound' : 'binding pending'}`);
      if (!a.id) note('待补码（临时码 ' + WB.tmpCode(a.name) + '）：' + a.name);
    }));
    const chars = []; shots.forEach((s) => s.assets.forEach((a) => { if (a.inFrame === false) return; const id = a.id || WB.tmpCode(a.name); if (WB.CHAR_EN[id] && !chars.some((c) => c[0] === id)) chars.push([id, WB.refTag(a)]); }));
    chars.forEach(([id, tag]) => en(`${WB.CHAR_EN[id]} [REF:${tag}]; matches the reference.`));
    const sel = (st.thumbSel || {})[gid];
    if (sel) Object.keys(sel).filter((k) => sel[k]).forEach((k) => { const ist = WB.imageStatus(st, g, k); en(`[REF:IMAGE ${k}] ${ist === '已批' ? 'attached image reference' : 'attached draft image reference'}`); if (ist !== '已批') pending.push({ k: 'IMAGE ' + k, state: ist }); });
    en(''); en('FIRST FRAME AND SPATIAL BLOCKING');
    en(g.firstFrameEn);
    en('The first visible frame already contains, in position, every character listed under "Opens on" for the first shot; no empty establishing frame. Characters marked "not yet visible" stay out of frame until their specified entrance.');
    if (g.firstFrameRef) { en('First-frame reference: previous segment end frame [REF:FIRST-FRAME].'); note('首帧 REF：' + g.firstFrameRef.from + '｜' + g.firstFrameRef.status); if (g.firstFrameRef.status !== '已批') pending.push({ k: 'FIRST-FRAME', state: g.firstFrameRef.status }); }
    if (g.map) { en('Spatial map reference (no-text version) [REF:' + g.map.code + ']: camera stays on the father\'s side of the axis; do not flip left and right.'); if (g.map.status !== '已批') pending.push({ k: g.map.code, state: g.map.status }); }
    en(''); en('OPTICS');
    note('平台设置（不进正文）：画幅 2.39:1、时长、分辨率在生成界面选');
    if (WB.anamorphic(st)) en('Anamorphic widescreen look: ' + sc.optics.package.filter.promptText + '; ' + sc.optics.package.lens.promptText + '; medium-fine grain.');
    else en('Widescreen look with clean spherical lenses and no diffusion filter: round bokeh, crisp highlights, fine grain.');
    let t = 0;
    shots.forEach((s, i) => { const eq = s.focal.eq; const out = s.focal.eqOut; const ot = WB.opticsPromptText(st, s); en(`${lab[i]}: about ${WB.fov(eq)}°${out ? '→' + WB.fov(out) + '°' : ''} diagonal field of view (${eq}${out ? '→' + out : ''}mm spherical-equivalent), ${WB.dofEn(s.aperture.value)}${ot ? '; ' + ot : ''}.`); });
    en(''); en('CAMERA');
    shots.forEach((s, i) => {
      const p = s.position; const mv = s.move.segments && s.move.segments.length > 1 ? s.move.segments.map((x) => `${x.t0}–${x.t1}s ${WB.MOVE_EN[x.move] || x.move}`).join(', then ') : (WB.MOVE_EN[s.move.primary] || s.move.primary) + (s.move.secondary ? ' + ' + (WB.MOVE_EN[s.move.secondary] || s.move.secondary) : '');
      en(`${lab[i]}: ${mv}${p.height ? `; camera height ${p.height} m` : ''}${p.distance ? `; about ${p.distance} m from subject` : ''}.`);
    });
    en(''); en('LIGHTING');
    const GL = Object.assign({}, sc.lighting, (g.lighting && g.lighting.inherit === '组覆盖') ? g.lighting : {});
    en(`Low-key night, contrast about ${GL.ratio}, ${GL.ct >= 5500 ? 'cool cyan' : GL.ct <= 4000 ? 'warm' : 'neutral'} light around ${GL.ct}K from a distant high platform and rail behind the action, ${GL.quality === '柔' ? 'soft' : 'hard'}; volumetric rain catches the light. Expose for the backlight: the camera stays on the shadow side of the faces, and wet edges and rim highlights carry the detail.`);
    shots.forEach((s, i) => {
      const Ls = s.lighting || {}; const parts = [];
      const T = (x) => WB.TERM_EN[x] || x;
      if (Ls.key && Ls.inherit !== '继承自场') parts.push(`key: ${T(Ls.key)}${Ls.keyOut ? ' turning to ' + T(Ls.keyOut) : ''}`);
      if (Ls.flicker) parts.push(`work lamp flickers at ${Ls.flicker.map((x) => x + 's').join(' and ')}`);
      if (Ls.l3path) parts.push('red scan light path: ' + Ls.l3path.map((x) => `${x.t}s ${x.posEn}${x.onFace ? '' : ' (not on faces)'}`).join(' → '));
      const E = WB.effLight(st, s);
      if (E.ct && String(E.ct) !== String(GL.ct)) parts.push(`${E.ct}K`); if (E.ratio && E.ratio !== GL.ratio) parts.push(`contrast about ${E.ratio}`); if (E.quality && E.quality !== GL.quality) parts.push(E.quality === '硬' ? 'hard light' : 'soft light');
      if (parts.length) en(`${lab[i]}: ${parts.join('; ')}.`);
      if (Ls.summary) note(`第${i + 1}镜光：${Ls.summary}`);
    });
    en(''); en('ACTION TIMING');
    shots.forEach((s, i) => {
      const t0 = r1(t), t1 = r1(t + s.duration); t = t1;
      const ch = g.chain || []; const inChain = ch.includes(s.id) && i < shots.length - 1 && ch.includes(shots[i + 1].id);
      en(`${t0.toFixed(1)}–${t1.toFixed(1)}s | ${lab[i]}${i < shots.length - 1 ? (inChain ? ' | NO CUT: the same camera move flows straight on into ' + lab[i + 1].replace(/^Shot \d+, /, '') : ' | HARD CUT after') : ''}`);
      let act = s.actionEn; (s.rules || []).forEach((r) => { if (r.notInFrame) { const nm = WB.NAME_EN[r.notInFrame]; if (nm) act += ` ${nm[0].toUpperCase() + nm.slice(1)} is not visible in this shot.`; else { note('规则（无英文映射，未写入正文）：' + r.notInFrame + ' 不入画'); pending.push({ k: s.id + ' rule:' + r.notInFrame, state: '规则待补英文' }); } } });
      const who = []; s.assets.forEach((a) => { if (a.inFrame === false) return; const id = a.id || WB.tmpCode(a.name); const d = WB.CHAR_EN[id]; if (d) { const nm = d.split(':')[0].replace(/^The /, 'the '); if (!who.includes(nm)) who.push(nm); } });
      const actD = WB.deName(s.actionEn); const offS = s.dialogue.filter((d) => d.type === '画外').map((d) => WB.deName(WB.NAME_EN[d.speaker] || d.speaker).toLowerCase());
      const late = who.filter((nm) => offS.includes(nm.toLowerCase()) || new RegExp(nm.replace(/^the /i, '') + "[^.;,]{0,25}\\b(enters|entering|steps into|steps in|walks into|walks in|comes into|comes in|arrives|appears)", 'i').test(actD));
      const first = who.filter((nm) => !late.includes(nm));
      if (first.length) en(`Opens on: ${first.join(', ')} already in frame${late.length ? `; ${late.join(', ')} not yet visible` : ''}.`);
      en(act.replace(/\b(steadicam|Steadicam)\b/g, 'stabilized rig'));
      if (s.sound && WB.SOUND_EN[s.sound]) en('Sound: ' + WB.SOUND_EN[s.sound] + '.');
      s.dialogue.forEach((d) => {
        const spk = 'the ' + (WB.SPK_EN[d.speaker] || d.speaker);
        const off = d.type === '画外' ? ' (off-screen voice, heard before he is visible; no lips on screen)' : d.type === '机器播报' ? ' (synthetic broadcast voice)' : '';
        en(`At +${d.t0.toFixed(1)}s to +${d.t1.toFixed(1)}s ${spk} says${off}: "${d.en}"`); note(`${d.zh}（${d.type}｜文学 L${(st.data.literary.dialogue.find((x) => x.id === d.ref) || {}).line}）`);
        if (d.t1 > s.duration + 0.05) { note(`注意：估算念完需到 +${d.t1}″，超过本镜 ${s.duration}″`); cmt(`TIMING RISK: this line is estimated to end at +${d.t1}s, after the ${s.duration}s shot ends; draft only.`); pending.push({ k: s.id + ' dialogue timing', state: '台词溢出' }); }
        else if (d.timingRisk && !WB.heardOk(d)) { cmt(`TIMING RISK: hand-set end +${d.t1}s is shorter than the ${d.est}s estimate; needs a read-through.`); pending.push({ k: s.id + ' dialogue timing', state: '待试听' }); }
      });
      s.screenText.forEach((x) => note(`屏幕字后期叠加：${x.en}（${x.host}${x.track ? '，需跟踪' : ''}）`));
    });
    en(''); en('AUDIO');
    en('Continuous dense black rain on metal and low hum from the city underbelly under every shot; per-shot sounds are listed in ACTION TIMING.' + (shots.some((s) => s.dialogue.length) ? ' Rain and machinery recede beneath each scripted line, then return between lines.' : ''));
    shots.forEach((s, i) => { if (s.sound && s.sound !== '台词' && s.sound !== '雨声／底盘低鸣') note(`第${i + 1}镜声：${s.sound}`); });
    en(''); en('POSITIVE CONSTRAINTS');
    const hit = shots.findIndex((s) => s.n === 20); const inj = shots.some((s) => s.n >= 20);
    en('The father wears glasses and an old work jacket; the tool bag follows the state given in each shot. ' + (hit > 0 ? `The father's left shoulder is uninjured until it hits the low scrap in ${lab[hit]}; from that impact on, keep the LEFT-shoulder injury, and he pushes and is supported on the RIGHT side. ` : inj ? 'The father is injured on the LEFT shoulder; he pushes and is supported on the RIGHT side. ' : 'No new injuries yet. ') + 'Keep the camera on the father\'s side of the axis. Exactly the characters listed; no duplicates. Dialogue is spoken word for word. Panels and screens show no readable text.');
    en('Plain unbranded surfaces; no logos. Cold cyan and red light only; no warm romantic light.');
    (st.data.scene.continuityIssues || []).filter((c) => c.groups && c.groups.includes(gid) && c.promptEn && WB.ciChoice(st, c) === 0).forEach((c) => en('Continuity: ' + c.promptEn));
    shots.forEach((s) => { if (s.editorial) note(`剪辑完成（不进提示词）：${s.id.slice(4)} ${s.editorial}`); });
    return { lines: L, pending };
  };
  WB.FORBIDDEN = /\b(The Last Rain|ARRI|Alexa|Cooke|Panavision|Hawk|Atlas|Tiffen|Glimmerglass|Kodak|Leica|Zeiss|Sony|Canon|Rembrandt|Steadicam|Higgsfield|Seedance)\b/i;
  /* 「草稿可复制」与「正式生成就绪」硬分层 */
  WB.readiness = function (st, gid) {
    const g = WB.group(st, gid); const c = WB.compose(st, gid); const p = c.p; const why = c.errors.slice();
    const draftOk = !why.length; const formal = why.slice();
    if (c.lint) { const all = c.lint.prompt.results.concat(c.lint.acting.results); const v = all.filter((x) => x.status === '违反' || x.status === '提醒'); if (v.length) formal.push(`规范检查未过 ${v.length} 条（${v.map((x) => x.rule.id).join('、')}）`); const m = all.filter((x) => x.ok === null); if (m.length) formal.push(`规范检查待人工 ${m.length} 条（${m.map((x) => x.rule.id).join('、')}）`); }
    const lc = WB.lightChecks(st).filter((x) => g.shots.includes(x.id) && x.level === '红'); if (lc.length) formal.push(`光向检查红项 ${lc.length} 条`);
    if (g.lock !== '锁定') formal.push('组未锁定');
    if (p.pending.length) formal.push(`未批 REF/风险 ${p.pending.length} 项`);
    const b = WB.boundaryCheck(st, gid); if (!b.ok) formal.push('首尾状态不衔接');
    const ms = st.data.scene.modelSpec; const days = Math.floor((Date.now() - new Date(ms.checked + 'T00:00:00+08:00').getTime()) / 864e5); if (days > 7) formal.push(`模型规格核对已 ${days} 天（>7 天需复核）`);
    const red = WB.continuityChecks(st).filter((x) => x.level === '红' && g.shots.includes(x.id)); if (red.length) formal.push(`连贯红项 ${red.length} 条`);
    const ci = (st.data.scene.continuityIssues || []).filter((x) => WB.ciState(st, x) !== '已关闭' && (!x.groups || x.groups.includes(gid))); if (ci.length) formal.push(`新旧文学冲突未关闭 ${ci.length} 条`);
    if (!(st.data.scene.modelSpec || {}).verifiedResult) formal.push('模型规格只核了日期，未记录端点核验结果');
    return { draft: draftOk, formal: !formal.length, draftWhy: why, formalWhy: formal };
  };
  WB.seedanceTask = function (st) {
    const ms = st.data.scene.modelSpec;
    return { task: 'seedance-spec-check', model: ms.model, status: 'unverified', last_checked: ms.checked, last_source: ms.src, cadence_days: 7, also_before_formal_export: true,
      official_urls: [], official_urls_note: '只用经人确认的官方页面白名单；空表 = 待研究助理填写',
      check_items: ['max_duration_s', 'supported_ref_types', 'max_ref_count', 'ref_binding_syntax', 'image_formats_and_size', 'audio_and_dialogue_timing_support', 'prompt_length_limit', 'web_vs_api_parity', 'on_image_text_readability'],
      on_change: { lower_max_duration: 'use min(30, official_max) and re-split groups for director', syntax_change: 'freeze formal export; do not rewrite historical prompts' },
      output_fields: ['checked_at', 'official_url', 'content_sha256', 'max_duration_s', 'supported_ref_types', 'max_ref_count', 'binding_syntax', 'audio_timing_support', 'diff', 'reviewer', 'status'],
      project_constraint_s: WB.MAX_GROUP };
  };
  WB.stripForCopy = function (lines, header) {
    const out = lines.filter((l) => l.en).map((l) => l.t.replace(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef\u2e80-\u2fdf「」『』【】]+/g, '').replace(/[ \t]+$/g, ''));
    if (header) out.unshift(header, '');
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  /* 无副作用的组装＋硬校验：复制、就绪徽标、DRAFT 头共用这一份结果 */
  /* 规范检查的上下文：对象内容 hash＋该对象的人工签核（签核绑定 hash，内容一变就失效） */
  WB.lintCtx = function (st, target, scope, ctx) {
    const obj = (WB.RULESET_VER || '') + '|' + (target === 'prompt' ? ctx.text : target === 'acting' ? JSON.stringify(ctx.g.acting || null) + WB.groupHash(st, ctx.g.id) : target === 'gapPrompt' ? ctx.prompt : target === 'stage0' ? JSON.stringify(st.data.scene.diagnosis) : '');
    return Object.assign(ctx, { hash: WB.sha256(String(obj)).slice(0, 16), signs: (st.signs || {})[target + ':' + scope] || {} });
  };
  WB.signRule = function (st, key, ruleId, who, on, hash) {
    st.signs = st.signs || {}; st.signs[key] = st.signs[key] || {};
    if (on) st.signs[key][ruleId] = { who, hash, time: nowStr() }; else delete st.signs[key][ruleId];
    WB.logEntry(st, { who, text: `${on ? '签核' : '撤销签核'} ${ruleId}（${key}）`, scope: '规范检查', target: key, variable: ruleId, before: '—', after: on ? '已核' : '—', status: '已应用' });
    return { ok: true };
  };
  /* 台词容纳预案（Codex 第 3 轮 P0）：只加秒、不动台词；各组 ≤30″；导演确认后才执行 */
  WB.FIT_PLAN = [{ id: 'S04-C014', to: 8.0 }, { id: 'S04-C017', to: 5.2 }, { id: 'S04-C018', to: 7.3 }];
  /* 只加不减：导演已加到更长的镜保持不动 */
  WB.fitSteps = (st) => WB.FIT_PLAN.map((p) => ({ id: p.id, from: WB.shot(st, p.id).duration, to: Math.max(p.to, WB.shot(st, p.id).duration) })).filter((p) => p.to - p.from > 0.05);
  WB.fitPlanPreview = function (st) {
    const steps = WB.fitSteps(st); const groups = {}; WB.FIT_PLAN.forEach((p) => { const g = WB.groupOf(st, p.id); groups[g.id] = WB.groupSec(st, g); });
    steps.forEach((p) => { const g = WB.groupOf(st, p.id); groups[g.id] = r1(groups[g.id] + p.to - p.from); });
    const scene = r1(WB.sceneSec(st) + steps.reduce((a, p) => a + p.to - p.from, 0));
    const risky = WB.FIT_PLAN.some((p) => { const s = WB.shot(st, p.id); return s.dialogue.some((d) => d.t1 > s.duration + 0.05); });
    const w = st.data.scene.window || { min: 110, max: 140 };
    return { steps, groups, scene, done: !steps.length, risky, max: (st.data.scene.modelSpec || {}).maxSegment || WB.MAX_GROUP, window: w };
  };
  WB.applyFitPlan = function (st, who) {
    if (who !== '导演') return { ok: false, msg: '只有导演可以定秒数' };
    const pv = WB.fitPlanPreview(st); if (pv.done) return { ok: true, pv, unchanged: true };
    if (Object.values(pv.groups).some((x) => x > pv.max)) return { ok: false, msg: '预案会让某组超过 ' + pv.max + '″' };
    if (pv.scene > pv.window.max + 0.05) return { ok: false, msg: `预案会让全场 ${pv.scene}″ 超过窗口上限 ${pv.window.max}″` };
    /* 事务：整套全部成功才提交，任何一步失败就整体回滚、零落地 */
    const bak = clone(Object.assign({}, st, { _idx: undefined })); const out = [];
    for (const p of pv.steps) { const r = WB.apply(st, `${p.id.slice(4)} 改 ${p.to} 秒`, { who, ctx: {}, confirm: true, mode: 'total' }); out.push(r); if (r.status !== '已应用') break; }
    const bad = out.filter((r) => r.status !== '已应用');
    if (bad.length) { const idx = st._idx; Object.keys(st).forEach((k) => { delete st[k]; }); Object.assign(st, bak); st._idx = idx; return { ok: false, rolledBack: true, msg: '整套回滚，未落地：' + bad.map((r) => r.status + '：' + (r.msg || '')).join('；') }; }
    return { ok: true, pv };
  };
  WB.compose = function (st, gid) {
    const g = WB.group(st, gid); const errors = [];
    const sec = WB.groupSec(st, g); const max = (st.data.scene.modelSpec || {}).maxSegment || WB.MAX_GROUP;
    if (sec > max) errors.push(`组秒 ${sec}″ > ${max}″，不能复制`);
    if (g.refExpired) errors.push('首帧 REF 已过期（上一组重新生成/改动），请先更新首帧参考再复制');
    const p = WB.buildPrompt(st, gid);
    const hdr = p.pending.length ? `// DRAFT - contains ${p.pending.length} unapproved references or risks; not for final generation` : null;
    const leak = p.lines.filter((l) => l.en && WB.CJK.test(l.t));
    if (leak.length) errors.push('英文正文里混有中文（会被删成残句）：' + leak.map((l) => l.t.slice(0, 40)).join('｜'));
    const text = WB.stripForCopy(p.lines, hdr);
    if (!leak.length && WB.CJK.test(text)) errors.push('内部错误：复制文本仍含中文');
    const fb = text.match(WB.FORBIDDEN); if (fb) errors.push('正文含禁用名称「' + fb[0] + '」（人名/品牌/片名）');
    const approved = WB.groupLines(st, g); const nb = WB.stripApproved(text.split('\n').filter((l) => !/^\/\//.test(l)).join('\n'), approved).match(WB.NAMES_RE); if (nb) errors.push('非对白正文含人名／地名「' + nb[0] + '」');
    const bodyT = text.split('\n').filter((l) => !/^\/\//.test(l)).join('\n'); approved.forEach((l) => { const n = bodyT.split('"' + l + '"').length - 1; if (n !== 1) errors.push(`批准台词在正文出现 ${n} 次（应恰好 1 次）：${l.slice(0, 30)}`); });
    (bodyT.match(/"([^"]+)"/g) || []).map((m) => m.slice(1, -1)).filter((q) => q !== 'Opens on' && q !== 'not yet visible' && !approved.includes(q)).forEach((q) => errors.push('正文有非本组批准台词的引号文字：' + q.slice(0, 30)));
    const lit = st.data.literary.lines.map((l) => l.text).join('\n');
    const q = (text.match(/says[^:\n]*: "([^"]+)"/g) || []).map((m) => m.replace(/^[^"]*"/, '').replace(/"$/, '')).filter((l) => !lit.includes(l)); if (q.length) errors.push('台词不是文学本原句：' + q.join('｜'));
    let lint = null; if (WB.lint && WB.RULESET) lint = { prompt: WB.lint(WB.RULESET, 'prompt', WB.lintCtx(st, 'prompt', gid, { st, g, text })), acting: WB.lint(WB.RULESET, 'acting', WB.lintCtx(st, 'acting', gid, { st, g })) };
    return { g, p, hdr, text, errors, lint, sec };
  };
  WB.copyGroup = function (st, gid, who) {
    const g = WB.group(st, gid); const c = WB.compose(st, gid); const p = c.p; const hdr = c.hdr; const text = c.text;
    if (c.errors.length) return { ok: false, msg: '拒绝复制：' + c.errors.join('；') };
    const e = WB.logEntry(st, { who, text: `复制 ${g.name} 提示词` + (hdr ? `（含 ${p.pending.length} 个未批 REF，已加 DRAFT 头）` : ''), scope: '组', target: gid, variable: '复制', before: '—', after: text.length + ' 字', status: '已应用' });
    st.copies.push({ gid, who, time: e.time, chars: text.length, draft: !!hdr, logId: e.id });
    return { ok: true, text, chars: text.length, pending: p.pending, draft: !!hdr, logId: e.id };
  };

  /* ---------- 待导演定队列 ---------- */
  WB.approvalQueue = function (st) {
    const q = []; const dg = st.data.scene.diagnosis;
    dg.directorItems.forEach((it) => { const d = st.decisions[it.id]; q.push({ kind: '第0关决定', id: it.id, title: it.title, value: d ? d.value : null, proxy: d && d.proxy, options: it.options, default: it.default, lines: it.lines }); });
    st.data.scene.styleTags.forEach((tg) => q.push({ kind: '风格标签', id: tg.id, title: `${tg.group}：${tg.label}`, value: st.approvals[tg.id] || '采用（参数展开见摄影视角）', proxy: !st.approvals[tg.id], default: '采用（参数展开见摄影视角）' }));
    q.push({ kind: '光学包', id: 'OPTICS', title: '机器｜底片｜镜头｜滤镜：' + Object.values(st.data.scene.optics.package).map((x) => x.value).join('｜'), value: st.decisions.OPTICS ? st.decisions.OPTICS.value : null, proxy: st.decisions.OPTICS && st.decisions.OPTICS.proxy, options: ['视听提案光学包', '球面无滤镜（备选：弱光可读、圆形焦外）'], default: '视听提案光学包' });
    q.push({ kind: '灯光', id: 'LIGHT-G1', title: '组一灯光样板：' + st.data.scene.lighting.summary, value: st.approvals['LIGHT-G1'] || '采用（建议）', proxy: !st.approvals['LIGHT-G1'], default: '采用（建议）' });
    st.data.scene.specialFx.forEach((fx) => q.push({ kind: '特殊光效', id: fx.id, title: `${fx.name}｜${fx.event}`, value: st.approvals[fx.id] || '采用', proxy: !st.approvals[fx.id], default: '采用' }));
    st.proposals.filter((p) => /待|需/.test(p.status)).forEach((p) => q.push({ kind: p.kind === 'literary' ? '需剧作/导演确认' : '锁定项提议', id: p.id, title: `${p.who}：${p.text}` + (p.note ? `（${p.note}）` : ''), value: null, default: p.kind === 'literary' ? '驳回（文学本不改）' : '驳回（保持锁定值）', proposal: true }));
    st.refIndex.entries.filter((e) => e.status === '待批').forEach((e) => q.push({ kind: 'REF 待批', id: e.key, title: `${e.key}（${e.file}）`, value: null, default: '批准' }));
    (st.data.scene.toneRefs || []).forEach((t, i) => (t.samples || []).forEach((sm, j) => { if (sm.sent) { const id = `TONE-${t.id || i}-${j + 1}`; q.push({ kind: '影调样图', id, title: `影调参考 ${i + 1} → 样图槽 ${j + 1}`, value: st.approvals[id] || null, default: '采用' }); } }));
    (st.data.scene.continuityIssues || []).forEach((c) => q.push({ kind: '新旧文学冲突', id: c.id, title: c.title, value: st.approvals[c.id] || (c.proxy ? c.proxy : null), proxy: !st.approvals[c.id] && !!c.proxy, options: c.options, lines: c.lines }));
    return q;
  };

  if (typeof module !== 'undefined') module.exports = WB; else root.WB = WB;
})(typeof window !== 'undefined' ? window : globalThis);
