/* 俯视图与分镜草图：只按数据画；没有数据就写缺什么，不画假图 */
(function (root) {
  const V = {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rad = (d) => (d * Math.PI) / 180;
  // 水平视角（球面等效焦段，按全画幅 36mm 宽估算；仅示意）
  V.fov = (f) => (f ? (2 * Math.atan(36 / (2 * f)) * 180) / Math.PI : null);
  V.birdseye = function (S, gid) {
    const g = WB.group(S.st, gid); const m = g.map;
    const miss = ['场景轮廓和比例（像素→米，按文 L26「四米之外」标定）', '人物点位与朝向', '机位与焦段', '运镜三点（起幅、中段、落幅的位置）'];
    if (!m || !m.people) return { ok: false, html: `<div class="nodata"><b>这段的空间数据还没填（负责：导演视听）</b><br>缺：${miss.join('、')}。没有数据，不画假图。</div>` };
    const shots = new Set(g.shots.map((x) => x.slice(4)));
    let o = `<svg viewBox="0 0 1024 576" role="img" aria-label="第 ${gid.slice(1)} 段俯视图：人物、机位、视角、轴线" class="birdseye">`;
    o += '<rect x="1" y="1" width="1022" height="574" fill="#fbfaf7" stroke="#8a8780" stroke-width="2"/>';
    if (m.axis) o += `<line x1="${m.axis.a[0]}" y1="${m.axis.a[1]}" x2="${m.axis.b[0]}" y2="${m.axis.b[1]}" stroke="#7a3fb0" stroke-width="2" stroke-dasharray="10 8"/><text x="${m.axis.b[0] + 8}" y="${m.axis.b[1] - 8}" class="t s">轴线（机位留在伊侧）</text>`;
    (m.lights || []).forEach((L) => { if (L.point) o += `<circle cx="${L.from[0]}" cy="${L.from[1]}" r="9" fill="none" stroke="#9a6a00" stroke-width="3"/><text x="${L.from[0] + 14}" y="${L.from[1] + 6}" class="t s">作业灯</text>`; else o += `<line x1="${L.from[0]}" y1="${L.from[1]}" x2="${L.to[0]}" y2="${L.to[1]}" stroke="${L.id === 'L3' ? '#b3261e' : '#1d6f86'}" stroke-width="4" marker-end="url(#ar)"/><text x="${L.to[0] - 10}" y="${L.to[1] + 26}" class="t s">${L.id === 'L3' ? '红色扫描光' : L.id === 'L1' ? '冷青逆光' : esc(L.id)}</text>`; });
    (m.cameras || []).filter((c) => shots.has(c.shot)).forEach((c) => {
      const sh = WB.shot(S.st, 'S04-' + c.shot); const f = sh.focal.eq; const fov = V.fov(f) || 50; const len = 120;
      const a1 = rad(c.dir - fov / 2), a2 = rad(c.dir + fov / 2); const x = c.xy[0], y = c.xy[1];
      o += `<path d="M${x},${y} L${x + len * Math.cos(a1)},${y + len * Math.sin(a1)} L${x + len * Math.cos(a2)},${y + len * Math.sin(a2)} Z" fill="#1d6f86" fill-opacity=".08" stroke="#1d6f86" stroke-opacity=".5"/>`;
      o += `<polygon points="${x},${y - 11} ${x - 10},${y + 8} ${x + 10},${y + 8}" fill="#1d6f86"/><text x="${x + 12}" y="${y + 22}" class="t s">机位 ${c.shot.slice(1)}｜${f}mm</text>`;
    });
    (m.people || []).forEach((p) => { const col = p.who === '诺亚' ? '#0f6a74' : '#a4410e'; const pts = p.points.filter((q) => shots.has(q.shot));
      if (pts.length > 1) o += `<polyline points="${pts.map((q) => q.xy.join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="4 6"/>`;
      pts.forEach((q) => { const fx = q.xy[0] + 26 * Math.cos(rad(q.face)), fy = q.xy[1] + 26 * Math.sin(rad(q.face));
        o += `<line x1="${q.xy[0]}" y1="${q.xy[1]}" x2="${fx}" y2="${fy}" stroke="${col}" stroke-width="3"/><circle cx="${q.xy[0]}" cy="${q.xy[1]}" r="12" fill="${col}"/><text x="${q.xy[0]}" y="${q.xy[1] + 5}" text-anchor="middle" class="t w">${p.who === '诺亚' ? '诺' : '伊'}</text><text x="${q.xy[0] - 16}" y="${q.xy[1] - 18}" class="t s">${q.shot.slice(1)}${q.note ? ' ' + esc(q.note) : ''}</text>`; }); });
    (m.distances || []).forEach((d) => { o += `<line x1="${d.a[0]}" y1="${d.a[1]}" x2="${d.b[0]}" y2="${d.b[1]}" stroke="#333" stroke-width="1.5"/><text x="${(d.a[0] + d.b[0]) / 2 - 40}" y="${(d.a[1] + d.b[1]) / 2 + 4}" class="t s">两人相距 ${esc(d.label.replace('约', '约 '))}</text>`; });
    o += '<defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs></svg>';
    const ver = WB.sha8(JSON.stringify(g.shots.map((id) => { const s = WB.shot(S.st, id); return [s.position, s.focal, s.move, s.duration]; })));
    o += `<p class="fine">图上的点位来自第 1 段的布局数据（状态：候选，待导演视听确认）。视角按焦段估算，只作示意。运镜三点（起幅、中段、落幅的位置）还没有数据，所以只画了单个机位点（负责：导演视听）。<span class="bk">对应镜头数据 ${ver}</span></p>`;
    return { ok: true, html: o, ver };
  };
  /* 通用俯视图：视听补数（71fdc3ad）点位＋机位三点；G1 叠加原平面图的轴线与光 */
  V.avMap = function (S, gid, m, focus) {
    const g = WB.group(S.st, gid); const shots = g.shots; const base = g.map || null; const PROXY = '总监代选｜待导演确认';
    // 视窗：按人物、机位、轮廓自动取景（避免全挤在一角）
    const P = [];
    shots.forEach((sid) => { const av = WB.shot(S.st, sid).av; (av && av.cam || []).forEach((q) => P.push([q[0], q[1]])); });
    Object.values(m.people || {}).forEach((pp) => Object.entries(pp).forEach(([k, q]) => { if (shots.includes('S04-' + k)) P.push([q[0], q[1]]); }));
    (m.outline || []).forEach((x) => { if (x[0] === 'water' || x[0] === 'pt') P.push(x[1]); else { P.push(x[1]); P.push(x[2]); } });
    if (gid === 'G1' && m.puddle) P.push(m.puddle);
    let x0 = Math.min(...P.map((q) => q[0])) - 90, x1 = Math.max(...P.map((q) => q[0])) + 140, y0 = Math.min(...P.map((q) => q[1])) - 70, y1 = Math.max(...P.map((q) => q[1])) + 60;
    let w = x1 - x0, h = y1 - y0; const ar = 16 / 9; if (w / h < ar) { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; }
    const z = w / 1024; const fs = 13 * w / 880; const r = 9 * w / 880; const sw = (n) => (n * z * 1.25).toFixed(2);
    const inside = (q) => q[0] >= x0 && q[0] <= x0 + w && q[1] >= y0 && q[1] <= y0 + h;
    let o = `<svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" role="img" aria-label="第 ${gid.slice(1)} 段俯视图：人物、机位起中落三点、视角" class="birdseye bv${gid}"><style>.bv${gid} .t{font-size:${fs.toFixed(1)}px}.bv${gid} .t.s{font-size:${(fs * 0.92).toFixed(1)}px}.bv${gid} .t.w{font-size:${(fs * 0.85).toFixed(1)}px}</style><defs><marker id="ar${gid}" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4 z" fill="#555"/></marker></defs>`;
    o += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fbfaf7" stroke="#8a8780" stroke-width="${sw(2)}"/>`;
    (m.outline || []).forEach((x) => {
      if (x[0] === 'exit') o += `<line x1="${x[1][0]}" y1="${x[1][1]}" x2="${x[2][0]}" y2="${x[2][1]}" stroke="#333" stroke-width="${sw(6)}" stroke-dasharray="${sw(14)} ${sw(10)}"/><text x="${(x[1][0] + x[2][0]) / 2 - fs}" y="${x[1][1] - fs * 0.8}" class="t s">${esc(x[3])}</text>`;
      if (x[0] === 'line') o += `<line x1="${x[1][0]}" y1="${x[1][1]}" x2="${x[2][0]}" y2="${x[2][1]}" stroke="#666" stroke-width="${sw(5)}"/><text x="${x[2][0] + fs * 0.5}" y="${x[2][1] + fs * 0.3}" class="t s">${esc(x[3])}</text>`;
      if (x[0] === 'pt') o += `<rect x="${x[1][0] - r}" y="${x[1][1] - r * 0.7}" width="${r * 2}" height="${r * 1.4}" fill="none" stroke="#666" stroke-width="${sw(2)}"/><text x="${x[1][0] + r * 1.3}" y="${x[1][1] - r}" class="t s">${esc(x[2])}</text>`;
      if (x[0] === 'box') o += `<rect x="${x[1][0]}" y="${x[1][1]}" width="${x[2][0] - x[1][0]}" height="${x[2][1] - x[1][1]}" fill="none" stroke="#666" stroke-width="${sw(2)}"/><text x="${x[1][0]}" y="${x[2][1] + fs * 1.3}" class="t s">${esc(x[3])}</text>`;
      if (x[0] === 'water') o += `<circle cx="${x[1][0]}" cy="${x[1][1]}" r="${x[2]}" fill="#dfe7ea" stroke="#7d97a0" stroke-width="${sw(1.5)}"/><text x="${x[1][0] - x[2]}" y="${x[1][1] + x[2] + fs * 1.1}" class="t s">${esc(x[3])}</text>`;
    });
    if (gid === 'G1' && base) {
      if (base.axis) o += `<line x1="${base.axis.a[0]}" y1="${base.axis.a[1]}" x2="${base.axis.b[0]}" y2="${base.axis.b[1]}" stroke="#7a3fb0" stroke-width="${sw(2)}" stroke-dasharray="${sw(10)} ${sw(8)}"/><text x="${Math.min(base.axis.b[0], x0 + w - fs * 11)}" y="${Math.max(base.axis.b[1], y0 + fs * 1.4) + fs * 1.2}" class="t s" fill="#7a3fb0">轴线（机位留在伊侧）</text>`;
      { const ex = x0 + fs * 1.6, ey = y0 + fs * 2.2 + 2 * fs * 2.4, dx = 600 - 455, dy = 130 - 350, dl = Math.hypot(dx, dy), len = fs * 1.6; o += `<line x1="${ex}" y1="${ey + fs * 0.6}" x2="${ex + (dx / dl) * len}" y2="${ey + fs * 0.6 + (dy / dl) * len}" stroke="#333" stroke-width="${sw(3)}" marker-end="url(#ar${gid})"/><text x="${ex + fs * 2.6}" y="${ey + fs * 0.1}" class="t s">出口在这个方向（两座钢架之间）</text>`; }
      if (m.puddle) o += `<circle cx="${m.puddle[0]}" cy="${m.puddle[1]}" r="${r * 1.9}" fill="#dfe7ea" stroke="#7d97a0" stroke-width="${sw(1.5)}"/><text x="${m.puddle[0] - r * 9}" y="${m.puddle[1] + r * 3.4}" class="t s">积水（滑倒处）</text>`;
      let k = 0; (base.lights || []).forEach((L) => { if (L.point) { if (inside(L.from)) o += `<circle cx="${L.from[0]}" cy="${L.from[1]}" r="${r * 0.8}" fill="none" stroke="#9a6a00" stroke-width="${sw(3)}"/><text x="${L.from[0] + r}" y="${L.from[1] + fs * 0.35}" class="t s">作业灯</text>`; return; }
        const dx = L.to[0] - L.from[0], dy = L.to[1] - L.from[1], dl = Math.hypot(dx, dy); const len = fs * 2.4; const ex = x0 + fs * 1.2 + len * Math.max(0, -dx / dl), ey = y0 + fs * 2.2 + k * fs * 2.4; k++;
        o += `<line x1="${ex}" y1="${ey}" x2="${ex + (dx / dl) * len}" y2="${ey + (dy / dl) * len}" stroke="${L.id === 'L3' ? '#b3261e' : '#1d6f86'}" stroke-width="${sw(4)}" marker-end="url(#ar${gid})"/><text x="${x0 + fs * 1.2 + len * 2 + fs * 0.6}" y="${ey + fs * 0.1}" class="t s">${L.id === 'L3' ? '红色扫描光从这个方向来' : '冷青逆光从这个方向来'}</text>`; });
    }
    shots.forEach((sid) => { const sh = WB.shot(S.st, sid); const av = sh.av; if (!av || !av.cam) return; const pts = av.cam; const f = sh.focal.eq; const fov = V.fov(f) || 50; const len = 70 * z * 1.25; const c = pts[0]; const x = c[0], y = c[1];
      const a1 = rad(c[2] - fov / 2), a2 = rad(c[2] + fov / 2); const dim = focus && focus !== sid; o += `<g opacity="${dim ? 0.18 : 1}">`;
      if (focus === sid) o += `<path d="M${x},${y} L${x + len * Math.cos(a1)},${y + len * Math.sin(a1)} L${x + len * Math.cos(a2)},${y + len * Math.sin(a2)} Z" fill="#1d6f86" fill-opacity=".06" stroke="#1d6f86" stroke-opacity=".4" stroke-width="${sw(1)}"/>`;
      if (pts.length > 1) o += `<polyline points="${pts.map((q) => q[0] + ',' + q[1]).join(' ')}" fill="none" stroke="#1d6f86" stroke-width="${sw(2)}" stroke-dasharray="${sw(5)} ${sw(4)}"/>` + pts.slice(1).map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="${(i === pts.length - 2 ? 5 : 3.5) * z * 1.25}" fill="${i === pts.length - 2 ? '#1d6f86' : '#fff'}" stroke="#1d6f86" stroke-width="${sw(1.5)}"/>`).join('');
      o += `<polygon points="${x},${y - r * 0.8} ${x - r * 0.7},${y + r * 0.6} ${x + r * 0.7},${y + r * 0.6}" fill="#1d6f86"/><text x="${x + r * 0.9}" y="${y + r * 1.6}" class="t s" fill="#1d6f86">机${+sid.slice(5)}</text></g>`; });
    const col = { 伊莱亚斯: '#a4410e', 诺亚: '#0f6a74', 凯恩: '#333', 组长: '#6b4e00' }; const ab = { 伊莱亚斯: '伊', 诺亚: '诺', 凯恩: '凯', 组长: '组' };
    Object.entries(m.people || {}).forEach(([who, PP]) => { const pts = Object.entries(PP).filter(([k]) => shots.includes('S04-' + k) && (!focus || 'S04-' + k === focus || Object.keys(PP).filter((x) => x <= focus.slice(4)).pop() === k)); const c0 = col[who] || '#444';
      if (pts.length > 1) o += `<polyline points="${pts.map(([, q]) => q[0] + ',' + q[1]).join(' ')}" fill="none" stroke="${c0}" stroke-width="${sw(2)}" stroke-dasharray="${sw(3)} ${sw(5)}"/>`;
      const seen = {}; pts.forEach(([k, q]) => { const key = q[0] + ',' + q[1]; const dup = seen[key] = (seen[key] || 0) + 1;
        if (q[2] != null) { const fx = q[0] + r * 2 * Math.cos(rad(q[2])), fy = q[1] + r * 2 * Math.sin(rad(q[2])); o += `<line x1="${q[0]}" y1="${q[1]}" x2="${fx}" y2="${fy}" stroke="${c0}" stroke-width="${sw(3)}"/>`; }
        const first = pts[0][0] === k; if (first && dup === 1) o += `<circle cx="${q[0]}" cy="${q[1]}" r="${r}" fill="${c0}"/><text x="${q[0]}" y="${q[1] + r * 0.4}" text-anchor="middle" class="t w" fill="#fff">${ab[who] || who[0]}</text>`; else if (dup === 1) o += `<circle cx="${q[0]}" cy="${q[1]}" r="${r * 0.5}" fill="${c0}"/>`;
        o += `<text x="${q[0] - r * 1.1}" y="${q[1] - r * 0.6 - (dup - 1) * fs}" text-anchor="end" class="t s" fill="${c0}">${first ? (ab[who] || who[0]) : ''}${+k.slice(1)}${q[2] == null ? ' 朝向待定' : ''}</text>`; }); });
    (m.dist || []).forEach((d) => { o += `<line x1="${d[0][0]}" y1="${d[0][1]}" x2="${d[1][0]}" y2="${d[1][1]}" stroke="#222" stroke-width="${sw(1.5)}" stroke-dasharray="${sw(2)} ${sw(3)}"/><text x="${Math.max(d[0][0], d[1][0]) + r * 1.4}" y="${(d[0][1] + d[1][1]) / 2}" class="t s">${esc(d[2])}</text>`; });
    const pxm = /20 px/.test(m.scale) ? 20 : 14.5; o += `<line x1="${x0 + fs}" y1="${y0 + h - fs}" x2="${x0 + fs + 5 * pxm}" y2="${y0 + h - fs}" stroke="#222" stroke-width="${sw(3)}"/><text x="${x0 + fs}" y="${y0 + h - fs * 1.6}" class="t s">5 米（${esc(m.scale)}）</text></svg>`;
    const ver = WB.sha8(JSON.stringify(shots.map((id) => { const s = WB.shot(S.st, id); return [s.position, s.focal, s.move, s.duration, s.av]; })));
    return o + `<p class="fine">数字＝镜号。▲＝机位起幅，虚线和圆点＝运镜中段、落幅（实心是落幅）；淡色扇形（只看一镜时出现）是按焦段估算的视角，只作示意${focus ? '；现在只突出' + (+focus.slice(5)) + ' 号机位和这一镜时的人物位置' : '；点上面的镜号可只看一镜'}。点位来自视听补数 71fdc3ad（${gid === 'G1' ? '按文 L26「四米」修正，' + PROXY : '新写，底图待生成，建议值'}），待导演视听确认；镜头数据一改，这张图的确认就失效。<span class="bk">对应镜头数据 ${ver}</span></p>`;
  };
  const SIZE = { 大远景: 0.12, 大全: 0.16, 近中: 1.35, 远景: 0.2, 全景: 0.55, 中全: 0.75, 中全景: 0.75, 中景: 1.0, 中近: 1.35, 中近景: 1.35, 近景: 1.8, 特写: 2.6 };
  V.sizeOf = (s) => { const k = Object.keys(SIZE).find((x) => (s || '').startsWith(x)) || Object.keys(SIZE).find((x) => (s || '').includes(x.slice(0, 1) + (x[1] || ''))); return k ? SIZE[k] : null; };
  V.sketch = function (S, sid) {
    const s = WB.shot(S.st, sid); const P = s.position || {}; const k = V.sizeOf(P.size || ((P.raw || '').match(/大远景|大全|远景|全景|中全|中近|近中|中景|近景|特写/) || [])[0]);
    const raw = (s.performance && s.performance.raw) || ''; const sizeTxt = P.size || ((P.raw || '').match(/大远景|大全|远景|全景|中全|中近|近中|中景|近景|特写/) || [])[0] || null; const ids = new Set((s.assets || []).filter((a) => a.inFrame !== false).map((a) => a.id)); const who = [];
    if (ids.has('CH-01') || /伊/.test(raw)) who.push('伊'); if (ids.has('CH-02') || /诺亚/.test(raw)) who.push('诺'); if (ids.has('CH-03') || /凯恩/.test(raw)) who.push('凯'); if (/组长/.test(raw)) who.push('组');
    const seg = (s.move && s.move.segments) || []; const mv = (s.move && (s.move.raw || s.move.primary)) || '—';
    const frame = (label, shift) => {
      let o = `<svg viewBox="0 0 320 214" class="sk" role="img" aria-label="${sid.slice(4)} ${label}"><rect x="0" y="0" width="320" height="180" fill="#ecebe6"/><rect x="0" y="0" width="320" height="23" fill="#2b2b2b"/><rect x="0" y="157" width="320" height="23" fill="#2b2b2b"/>`;
      if (k == null || !who.length) o += `<text x="160" y="95" text-anchor="middle" class="t s">景别或人物没写：—</text>`;
      else { const h = Math.min(150, 70 * k); who.slice(0, 3).forEach((w, i) => { const x = 160 + (i - (who.length - 1) / 2) * 70 + shift; const top = 157 - h; const hr = Math.max(5, h * 0.13);
        o += `<circle cx="${x}" cy="${top + hr}" r="${hr}" fill="#5a5852"/><rect x="${x - hr * 1.2}" y="${top + hr * 2.1}" width="${hr * 2.4}" height="${Math.max(4, h - hr * 2.1)}" rx="${hr * 0.6}" fill="#5a5852"/><text x="${x}" y="${Math.max(36, top - 4)}" text-anchor="middle" class="t s">${w}</text>`; }); }
      const dl = (s.dialogue[0] || {}).en; const bar = [sid.slice(4), s.duration + '″', sizeTxt ? sizeTxt + (P.size ? '' : '*') : '—', (s.focal && s.focal.eq ? s.focal.eq + 'mm' : '—'), (P.height != null ? '机高 ' + P.height + 'm' : '—'), mv.slice(0, 8), dl ? '“' + dl.split(' ')[0] : ''].filter(Boolean).join(' · ');
      o += `<rect x="0" y="182" width="320" height="32" fill="#111"/><text x="8" y="203" class="t bar">${esc(label + '｜' + bar)}</text></svg>`; return o;
    };
    const shift = seg.length && /移|跟|推|拉|摇|升/.test(mv) ? 30 : 0;
    return `<div class="sks">${frame('起幅', 0)}${frame('落幅', shift)}</div>`;
  };
  if (typeof module !== 'undefined') module.exports = V; else root.SVG4 = V;
})(typeof window !== 'undefined' ? window : globalThis);
