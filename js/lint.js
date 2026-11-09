/* 规范检查：规则库（rules/rules.js，由 tools/extract_rules.py 从各 skill 抽取）→ 机器校验
   每条规则的 check 字段对应这里的同名检查函数；manual 类不自动判过，前台标「待人工」。
   与 core.js 一样可在浏览器（全局 WB）与 node（require）里运行。 */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f; else f(root.WB); })(typeof self !== 'undefined' ? self : this, function (WB) {
  const words = (t) => (t.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  const body = (text) => text.split('\n').filter((l) => !/^\/\//.test(l)).join('\n');
  const section = (text, name) => { const m = text.split(/\n(?=[A-Z][A-Z ]+\n)/).find((b) => b.startsWith(name)); return m || ''; };
  const shotBlocks = (text) => { const a = section(text, 'ACTION TIMING').split('\n').slice(1).join('\n'); return a.split(/\n(?=\d+\.\d–\d+\.\ds \| Shot \d+)/).filter((b) => /^\d/.test(b)); };
  const SPEAK = { 伊莱亚斯: 'father', 诺亚: 'android child', 凯恩: 'commander', 组长: 'team leader' };
  const WHO = /\b(father|android child|commander|team leader|recyclers?|reclaimers?|riflem[ae]n)\b/gi;
  const C = {};
  /* ---- CINEDANCE：提示词 ---- */
  C.noSceneHeader = (x) => { const h = body(x.text).match(/\bSCENE\s+\d+\b|\bS04-C\d{3}\b|\bSEGMENT\s+G\d\b|\bINT\.|\bEXT\./g); return { ok: !h, hits: h || [] }; };
  C.contextWords = (x) => { const h = body(x.text).match(/\b(previously|again|same as before|continues|continuous from|from last shot|as above|previous moment)\b/gi); return { ok: !h, hits: h || [] }; };
  C.firstFrameLock = (x) => { const bl = shotBlocks(x.text); const bad = []; x.g.shots.forEach((id, i) => { const s = WB.shot(x.st, id); const needs = s.assets.some((a) => a.inFrame !== false && /^CH-|CH-LEADER/.test(a.id || WB.tmpCode(a.name))); const m = (bl[i] || '').match(/^Opens on: ([^\n;]*?) already in frame/m); if (needs && !m) { bad.push('Shot ' + (i + 1)); return; } if (!m) return; if (/\b(not|no|never|without|empty)\b/i.test(m[1])) bad.push('Shot ' + (i + 1) + ' 开画句含否定'); const rest = (bl[i] || '').split('\n').slice(2).join(' '); (m[1].match(/\b(father|android child|commander|team leader)\b/gi) || []).forEach((w) => { if (new RegExp('\\b' + w + '\\b[^.;,]{0,25}\\b(enters|walks in|walks into|steps in|steps into|comes in|comes into|arrives|appears)\\b', 'i').test(rest)) bad.push('Shot ' + (i + 1) + ' ' + w + ' 已在画内又写入画'); }); }); const lock = /first visible frame already contains/i.test(x.text) && !/\b(opens empty|empty (establishing )?frame\b(?!, no)|no character)/i.test(body(x.text).replace(/no empty establishing frame/gi, '')); return { ok: lock && !bad.length, hits: lock ? bad : ['首帧锁句缺失或自相矛盾'].concat(bad) }; };
  C.weakSpatial = (x) => { const t = section(x.text, 'FIRST FRAME') + '\n' + section(x.text, 'ACTION TIMING'); const h = t.replace(/\b(step(s|ping)?|walk(s|ing)?|mov(es|ing)|turn(s|ing)?|whips? (his|her|its) head|look(s|ing)?|glanc(es|ing))( \w+ly)? around\b/gi, '').replace(/\bnear-(frontal|side|profile)\b/gi, '').match(/\b(near|nearby|around|beside|somewhere|in the area)\b/gi); return { ok: !h, hits: h ? Array.from(new Set(h.map((w) => w.toLowerCase()))).map((w) => w + ' ×' + h.filter((v) => v.toLowerCase() === w).length) : [] }; };
  C.gazePerShot = (x) => { const bad = shotBlocks(x.text).filter((b) => { const n = new Set((b.replace(/^Opens on:.*$/m, '').match(WHO) || []).map((w) => w.toLowerCase())).size; return n >= 2 && !/\b(faces?|facing|looks?|looking|eyes|gaze|turns? (his|her|its) head|turns? toward|glances?|watch(es)?|stares?)\b/i.test(b); }); return { ok: !bad.length, hits: bad.map((b) => b.match(/Shot \d+/)[0]) }; };
  C.cutTypes = (x) => { const B = body(x.text); const neg = B.replace(/\b(no|not|without|never)\s+(a\s+)?(fade|crossfade|dissolve)(-to-black)?/gi, ''); const h = neg.match(/\b(fade|crossfade|dissolve|transition effect)\b/gi) || []; const hdr = (section(x.text, 'ACTION TIMING').match(/^\d+\.\d–\d+\.\ds \| Shot \d+.*$/gm) || []); const miss = hdr.slice(0, -1).filter((l) => !/HARD CUT after|NO CUT/.test(l)).map((l) => l.match(/Shot \d+/)[0] + ' 未写切法'); return { ok: !h.length && !miss.length, hits: h.concat(miss) }; };
  C.fovPrimary = (x) => { const L = section(x.text, 'OPTICS').split('\n').filter((l) => /^Shot \d+/.test(l)); const bad = L.filter((l) => !(/°/.test(l) || /\b(wide|normal|telephoto|long lens|close-up lens)\b/i.test(l) || /\d+\s?mm/.test(l))); return { ok: L.length === x.g.shots.length && !bad.length, hits: bad.map((l) => l.slice(0, 8)).concat(L.length === x.g.shots.length ? [] : [`光学行 ${L.length}／镜 ${x.g.shots.length}`]) }; };
  C.lensBrands = (x) => { const h = body(x.text).match(/\b(Cooke|Master Prime|Helios|K35|Laowa|Sigma|ARRI|Alexa|Panavision|Zeiss|Leica|Canon|Sony|Tiffen|Hawk|Atlas|Kodak|Fujifilm|RED Komodo)\b/gi); return { ok: !h, hits: h || [] }; };
  C.timeBlocks = (x) => { const hdr = (section(x.text, 'ACTION TIMING').match(/^(\d+\.\d)–(\d+\.\d)s \| Shot \d+/gm) || []).map((l) => l.match(/(\d+\.\d)–(\d+\.\d)/).slice(1).map(Number)); const bad = []; if (hdr.length !== x.g.shots.length) bad.push(`时间块 ${hdr.length}／镜 ${x.g.shots.length}`); if (hdr.length && Math.abs(hdr[0][0]) > 0.05) bad.push('首块不从 0.0s 开始'); hdr.forEach(([a, b], i) => { if (!(b > a)) bad.push(`块 ${i + 1} 终点不晚于起点`); if (i && Math.abs(a - hdr[i - 1][1]) > 0.05) bad.push(`块 ${i + 1} 与上一块${a < hdr[i - 1][1] ? '重叠' : '有空隙'}`); }); if (hdr.length && Math.abs(hdr[hdr.length - 1][1] - WB.groupSec(x.st, x.g)) > 0.05) bad.push('末块终点 ≠ 组秒'); return { ok: !bad.length, hits: bad }; };
  C.dialogueVerbatim = (x) => { const want = [], who = []; x.g.shots.forEach((id) => WB.shot(x.st, id).dialogue.forEach((d) => { want.push(d.en); who.push('the ' + (WB.SPK_EN[d.speaker] || d.speaker)); })); const B = body(x.text); const got = (B.match(/"([^"]+)"/g) || []).map((m) => m.slice(1, -1)).filter((q) => !/^(Opens on|not yet visible)$/.test(q)); const bad = [];
    want.forEach((w, i) => { const m = B.match(new RegExp('\\+[\\d.]+s(?: to \\+[\\d.]+s)? ([a-z][a-z ]*?) says[^:\\n]*: "' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"')); if (m && m[1] !== who[i]) bad.push(`说话人不对：${w.slice(0, 20)}（应为 ${who[i]}，写成 ${m[1]}）`); if (!m && B.includes('"' + w + '"')) bad.push('台词不在对白行格式里：' + w.slice(0, 20)); }); want.forEach((w) => { const n = got.filter((g) => g === w).length; if (n !== 1) bad.push((n ? '重复 ' : '缺失 ') + w.slice(0, 30)); }); got.filter((g) => !want.includes(g)).forEach((g) => bad.push('非批准原句 ' + g.slice(0, 30))); const order = got.filter((g) => want.includes(g)); if (!bad.length && order.join('\u0001') !== want.join('\u0001')) bad.push('台词顺序与批准稿不一致'); return { ok: !bad.length, hits: bad }; };
  C.offscreenMarked = (x) => { const bad = []; x.g.shots.forEach((id, i) => WB.shot(x.st, id).dialogue.forEach((d) => { if (d.type === '画外') { const b = shotBlocks(x.text)[i] || ''; if (!/off-screen/i.test(b)) bad.push(id.slice(4)); } })); return { ok: !bad.length, hits: bad }; };
  C.noNegBlock = (x) => ({ ok: !/^NEGATIVE/m.test(x.text), hits: /^NEGATIVE/m.test(x.text) ? ['NEGATIVES 段'] : [] });
  C.englishOnly = (x) => { const t = x.text.replace(/"[^"]*"/g, ''); return { ok: !WB.CJK.test(t), hits: (t.match(new RegExp(WB.CJK.source, 'g')) || []).slice(0, 5) }; };
  C.noFakeTags = (x) => { const h = body(x.text).replace(/\[REF:[^\]]*\]/g, '').match(/@[A-Za-z][\w-]*/g); return { ok: !h, hits: h || [] }; };
  C.charAnchors = (x) => { const a = section(x.text, 'ACTIVE REFERENCES'); const need = []; x.g.shots.forEach((id) => WB.shot(x.st, id).assets.forEach((s) => { if (s.inFrame !== false && /^CH-0[1-3]$/.test(s.id || '') && !need.includes(s.id)) need.push(s.id); })); const miss = need.filter((id) => !new RegExp('\\[REF:' + id + '@[^\\]]*\\]; matches the reference').test(a)); return { ok: !miss.length, hits: miss }; };
  C.segmentMax = (x) => { const s = WB.groupSec(x.st, x.g); const m = (x.st.data.scene.modelSpec || {}).maxSegment || 30; return { ok: s <= m, hits: s <= m ? [] : [s + '″ > ' + m + '″'] }; };
  C.noUiSettings = (x) => { const t = body(x.text).replace(/\b(contrast|lighting ratio|key-to-fill)( about| of)? \d+(\.\d+)?:\d+\b/gi, '').replace(/\b\d+(\.\d+)?:\d+ (lighting )?ratio\b/gi, ''); const h = t.match(/\b\d+(\.\d+)?:1\b|\baspect ratio\b|\b\d{2,3}\s?fps\b|\b(720|1080|2160)p\b|\b[248]K\b|\bseed\s*\d+|\bresolution\b/gi); return { ok: !h, hits: h || [] }; };
  C.timingFits = (x) => { const bad = []; x.g.shots.forEach((id) => { const s = WB.shot(x.st, id); s.dialogue.forEach((d) => { if (d.t1 > s.duration + 0.05) bad.push(`${id.slice(4)} 台词到 ${d.t1}″ > ${s.duration}″`); else if (d.timingRisk && !WB.heardOk(d)) bad.push(`${id.slice(4)} 手填止点 ${d.t1}″ 短于估算，未试听`); if (!(d.t1 > d.t0)) bad.push(`${id.slice(4)} 台词时长 ≤0`); }); const ds = s.dialogue; ds.forEach((d, i) => ds.forEach((e, j) => { if (j > i && d.t0 < e.t1 && e.t0 < d.t1) bad.push(`${id.slice(4)} 台词重叠`); })); }); return { ok: !bad.length, hits: bad }; };
  C.lightDirection = (x) => { const L = section(x.text, 'LIGHTING'); const miss = []; if (!/\b(from|behind|side|back|above|below)\b/i.test(L)) miss.push('光向'); if (!/\b(expose for|exposure priority|exposed for)\b/i.test(L)) miss.push('曝光优先'); if (!/\bcamera (sits|stays|is) (on|against) the (shadow|lit|key) side\b|\bcamera on the (shadow|lit) side\b|\b(shooting|camera) into the (light|backlight)\b/i.test(L)) miss.push('机位相对光源'); return { ok: !miss.length, hits: miss }; };
  C.noNames = (x) => { const t = WB.stripApproved(body(x.text || x.prompt || ''), x.g && x.st ? WB.groupLines(x.st, x.g) : []); const h = t.match(new RegExp(WB.NAMES_RE.source, 'gi')); return { ok: !h, hits: h ? Array.from(new Set(h)) : [] }; };
  C.noModelNotes = (x) => { const h = (x.text || '').split('\n').filter((l) => /^(DRAFT|TIMING RISK|NOTE|TODO)\b/i.test(l)); return { ok: !h.length, hits: h.map((l) => l.slice(0, 24)) }; };
  /* ---- ACTING：每组表演设计 ---- */
  const chars = (x) => { const a = x.g.acting; return a ? Object.entries(a.chars) : []; };
  const speakers = (x) => { const s = new Set(); x.g.shots.forEach((id) => WB.shot(x.st, id).dialogue.forEach((d) => s.add(d.speaker))); return s; };
  const PH = /^[（(]?(无|没有|暂无|待定|—|-|设计建议）?无)[）)]?$/;
  const why = (f, k) => { const e = f.exceptions && f.exceptions[k]; return typeof e === 'string' && /例外/.test(e) && e.replace(/^例外[^：:]*[：:]/, '').trim().length >= 6; };
  const real = (v, k, f) => (!!v && !PH.test(String(v).replace(/^（设计建议）/, '').trim()) && !/^（设计建议）\s*(无|没有)$/.test(String(v).trim())) || why(f, k);
  const inFrameChars = (x) => { const m = { 'CH-01': '伊莱亚斯', 'CH-02': '诺亚', 'CH-03': '凯恩', 'S04-TMP-CH-LEADER': '组长', 'CH-04G': '回收者' }; const s = new Set(); x.g.shots.forEach((id) => WB.shot(x.st, id).assets.forEach((a) => { const n = m[a.id || WB.tmpCode(a.name)]; if (n && a.inFrame !== false) s.add(n); })); return s; };
  const ROSTER = { 'CH-01': '伊莱亚斯', 'CH-02': '诺亚', 'CH-03': '凯恩', 'S04-TMP-CH-LEADER': '组长', 'CH-04G': '回收者' };
  const need = (fn) => (x) => { if (!x.g.acting) return { ok: false, hits: ['本组没有表演设计'] }; const C2 = chars(x); if (!C2.length) return { ok: false, hits: ['人物表为空'] }; const bad = C2.filter(([k, v]) => !fn(k, v, x)).map(([k]) => k); return { ok: !bad.length, hits: bad }; };
  C.actCoverage = (x) => { if (!x.g.acting) return { ok: false, hits: ['本组没有表演设计'] }; const have = inFrameChars(x); const sp = speakers(x); const miss = Array.from(have).filter((k) => !x.g.acting.chars[k]); const extra = Object.keys(x.g.acting.chars).filter((k) => !have.has(k) && !sp.has(k)); return { ok: !miss.length && !extra.length, hits: miss.map((k) => '缺 ' + k).concat(extra.map((k) => '多 ' + k + '（本组不出镜也不说话）')) }; };
  C.actObjective = (x) => { const c = C.actCoverage(x); if (!c.ok) return c; return need((k, v) => real(v.objective, 'objective', v) && !/^(愤怒|害怕|难过|紧张|生气|伤心|绝望|恐惧)/.test(v.objective))(x); };
  C.actObstacle = need((k, v) => real(v.obstacle, 'obstacle', v) && real(v.stakes, 'stakes', v));
  const tacticKey = (t) => String(t).split(/[：:]/)[0].replace(/[（(][^）)]*[）)]/g, '').replace(/^(再次|再|又|继续|还是|更)/, '').replace(/(一次|更快|更慢|加快|放慢)$/, '').trim();
  C.actTactics = need((k, v) => new Set((v.tactics || []).map(tacticKey)).size >= 2 || why(v, 'tactics'));
  C.actBeats = need((k, v) => { const n = (v.beats || []).length; return ['伊莱亚斯', '诺亚'].includes(k) ? n >= 2 && n <= 4 : n >= 1 && n <= 4; });
  C.actSubtext = need((k, v, x) => !speakers(x).has(k) || !!v.subtext);
  C.actListening = need((k, v, x) => { const sp = speakers(x); const other = Array.from(sp).some((s) => s !== k); return !other || (!!v.listening && !/^(wait until|等(对方)?说完)/i.test(v.listening)); });
  C.actEyes = need((k, v) => !!v.eyes && !/never blink|不眨眼|一动不动/i.test(v.eyes));
  C.actNoCamera = need((k, v) => !/镜头|机位|焦距|景别|服装|色温|推近|拉远|特写|颜色/.test([v.objective, v.obstacle, v.subtext, v.listening, v.eyes].concat(v.tactics || [], (v.beats || []).map((b) => b.v)).join(' ')));
  C.actLabelled = (x) => ({ ok: !!(x.g.acting && /设计建议/.test(x.g.acting.label)), hits: [] });
  /* ---- LIRA：缺口候选出图提示词 ---- */
  C.liProse = (x) => { const h = x.prompt.replace(/"[^"]*"/g, '').replace(/\breads [A-Z]+\b/g, '').match(/\b[A-Z]{4,}\b/g); return { ok: !h && !/,\s*\w+,\s*\w+,\s*\w+,/.test(x.prompt), hits: h || [] }; };
  C.liLength = (x) => { const n = words(x.prompt); return { ok: n >= 80 && n <= 150, hits: [n + ' 词'] }; };
  C.liPositive = (x) => { const h = x.prompt.replace(/"[^"]*"/g, '').match(/\b(no(?!\.)|not|without|never|don't)\b/gi); return { ok: !h, hits: h || [] }; };
  C.liNoAR = (x) => { const h = x.prompt.replace(/\b\d+(\.\d+)?:\d+ (lighting |key-to-fill |contrast )?ratio\b/gi, '').replace(/\b(contrast|lighting ratio|key-to-fill|light ratio)( about| of| at)? \d+(\.\d+)?:\d+\b/gi, '').replace(/\bat an? \d+:\d+ ratio\b/gi, '').match(/--ar|\b\d+(\.\d+)?:\d+\b|\baspect ratio\b|\bresolution\b|\b(720|1080|2160)p\b|\b[248]K\b/gi); return { ok: !h, hits: h || [] }; };
  C.liLightMat = (x) => ({ ok: /\b(key|rim|back)\s?light\b/i.test(x.prompt) && /\b(steel|metal|rubber|plastic|glass|fabric|concrete|aluminium|composite|ceramic|cloth|water)\b/i.test(x.prompt), hits: [] });
  C.liPalette = (x) => ({ ok: /\b60%.*30%.*10%/.test(x.prompt), hits: [] });
  C.liNoBrand = (x) => { const h = x.prompt.match(WB.FORBIDDEN) || x.prompt.match(new RegExp(WB.NAMES_RE.source, 'i')); return { ok: !h, hits: h ? [h[0]] : [] }; };
  C.liNoOpticsOnLocation = (x) => { if (x.kind !== 'location') return { ok: true, hits: [] }; const h = x.prompt.match(/\b\d+mm\b|bokeh|depth of field|f\/\d/gi); return { ok: !h, hits: h || [] }; };
  C.liNotAsset = (x) => { if (!x.st || !x.gap) return { ok: null, hits: ['出图后要看图验收'] }; const e = (x.st.refIndex.entries || []).filter((v) => v.key === x.gap.key); const good = e.some((v) => v.status === '已批' && WB.landed(v)); return good ? { ok: true, hits: [] } : { ok: null, hits: [e.length ? '已入库，待看图验收／落地' : '还没出图：提示词不等于资产'] }; };
  C.liOneState = (x) => { const multi = /\b(side by side|before and after|both (states|versions)|clean,? (and|or) (damaged|bloodied|broken)|(clean|intact)[^.]{0,30}\b(and|,)\s+(damaged|bloodied|broken|split))\b/i.test(x.prompt); const n = x.states == null ? 1 : x.states; return { ok: !multi && n === 1, hits: multi ? ['同图多状态'] : n !== 1 ? [n + ' 个状态'] : [] }; };
  /* ---- 第 0 关诊断 ---- */
  const items = (x) => x.st.data.scene.diagnosis.dims.flatMap((d) => d.items.map((i) => Object.assign({ dim: d.k }, i)));
  const lineOk = (x, ls) => { const n = x.st.data.literary.lines.length; return (ls || []).every((r) => { const [a, b] = Array.isArray(r) ? r : [r, r]; return a >= 1 && b <= n && a <= b && x.st.data.literary.lines.slice(a - 1, b).some((l) => (l.text || '').trim()); }); };
  const rangeText = (x, a, b) => x.st.data.literary.lines.slice(a - 1, b).map((l) => l.text).join('\n');
  C.s0Sourced = (x) => { const b = items(x).filter((i) => !i.src); return { ok: !b.length, hits: b.map((i) => i.id || i.text.slice(0, 12)) }; };
  C.s0AssetTruth = (x) => { const gs = WB.gaps(x.st); const bad = gs.filter((g) => g.state === '已批'); return { ok: !bad.length, hits: bad.map((g) => g.key) }; };
  C.s0SceneCard = (x) => { const c = x.st.data.scene.diagnosis.sceneCard; const need = ['进场状态', '即时目标', '策略', '阻力', '触发改变的事件', '出场状态']; const miss = need.filter((k) => !(c && c.items.some((i) => i.k === k && i.v && i.lines && i.lines.length))); return { ok: !miss.length, hits: miss }; };
  C.s0CutTest = (x) => { const c = x.st.data.scene.diagnosis.sceneCard; return { ok: !!(c && c.cutTest && c.cutTest.v), hits: [] }; };
  C.s0Triage = (x) => { const b = items(x).filter((i) => !(i.id && i.src && i.level && i.lines && i.lines.length && lineOk(x, i.lines))); return { ok: !b.length, hits: b.map((i) => (i.id || '无编号') + '（' + i.dim + (i.lines && i.lines.length && !lineOk(x, i.lines) ? '，行号越界' : '') + '）') }; };
  C.s0Layers = (x) => { const L = ['结构', '人物', '观众', '可拍', '时长', '对白', '场景']; const have = L.filter((k) => x.st.data.scene.diagnosis.dims.some((d) => d.k.includes(k))); return { ok: have.length >= 3, hits: have }; };
  C.s0MustKeep = (x) => { const d = x.st.data.scene.diagnosis; const mk = d.mustKeep || []; if (!mk.length) return { ok: false, hits: ['没有保护行'] }; const base = d.mustKeepBase || {}; const bad = []; mk.forEach((m) => { const r = String(m).match(/L(\d+)(?:[–-](\d+))?/); if (!r) { bad.push(m + '：无行号'); return; } const a = +r[1], b = +(r[2] || r[1]); if (!lineOk(x, [[a, b]])) { bad.push(m + '：行号越界'); return; } if (base[m] && WB.sha256(rangeText(x, a, b)).slice(0, 8) !== base[m]) bad.push(m + '：与基线不一致（保护行被改）'); if (!base[m]) bad.push(m + '：没有基线 sha'); }); return { ok: !bad.length, hits: bad }; };
  C.s0SimLabel = (x) => { const m = x.st.data.scene.diagnosis.audienceMeta; return { ok: !!(m && /模拟/.test(m.simLabel) && /非真实/.test(m.simLabel)), hits: [] }; };
  C.s0HasLines = (x) => { const d = x.st.data.scene.diagnosis; const cr = items(x).concat(d.merged || []).filter((i) => /观众|冷读/.test(i.src || '')); if (!cr.length) return { ok: null, hits: ['本场没有单列的冷读问题条目，需人工核冷读原文'] }; const b = cr.filter((i) => !(i.lines && i.lines.length && lineOk(x, i.lines))).map((i) => (i.id || i.title || '').slice(0, 16) + '：行号'); const q = cr.filter((i) => { const t = i.quote && i.quote.text; return !t || !i.lines.some((r) => { const [a, z] = Array.isArray(r) ? r : [r, r]; return rangeText(x, a, z).includes(t); }); }).map((i) => (i.id || i.title || '').slice(0, 16) + '：缺原文引文或对不上'); return { ok: !b.length && !q.length, hits: b.concat(q) }; };
  WB.LINT_CHECKS = C;
  /* 跑某一类规则；返回 { results:[{rule, ok, hits, status}], bad, warn, manual } */
  WB.lint = function (rules, target, ctx, uiAudit) {
    const list = (rules || []).filter((r) => r.target === target);
    /* 人工签核／导演接受：绑定对象内容 hash，内容一变签核即失效；error 级不能被「接受」 */
    const sign = (r, res) => { const sg = ctx && ctx.signs && ctx.signs[r.id]; if (!sg || sg.hash !== ctx.hash || res.ok === true) return res; if (res.ok === null) return Object.assign(res, { ok: true, status: '人工已核', by: sg.who, note: sg.note }); if (res.status === '提醒' || res.status === '提示') return Object.assign(res, { ok: true, status: '导演接受', by: sg.who, note: sg.note }); return res; };
    const results = list.map((r) => {
      const [kind, name] = r.check.split(':');
      if (kind === 'manual') return sign(r, { rule: r, ok: null, hits: [], status: '待人工' });
      if (kind === 'e2e') { const a = uiAudit && uiAudit.results && uiAudit.results[name]; return a ? { rule: r, ok: a.ok, hits: a.hits || [], status: a.ok ? '通过' : (r.severity === 'error' ? '违反' : '提醒') } : { rule: r, ok: null, hits: ['尚未跑本机 UI 审查'], status: '待跑' }; }
      const fn = C[name]; if (!fn) return { rule: r, ok: false, hits: ['检查函数缺失：' + name], status: '违反' };
      let o; try { o = fn(ctx); } catch (e) { o = { ok: false, hits: ['检查出错：' + e.message] }; }
      if (o.ok === null) return sign(r, { rule: r, ok: null, hits: o.hits || [], status: '待人工' });
      return sign(r, { rule: r, ok: o.ok, hits: o.hits || [], status: o.ok ? '通过' : (r.severity === 'error' ? '违反' : r.severity === 'warn' ? '提醒' : '提示') });
    });
    return { results, bad: results.filter((x) => x.status === '违反').length, warn: results.filter((x) => x.status === '提醒' || x.status === '提示').length, manual: results.filter((x) => x.ok === null).length };
  };
  WB.allRules = (R) => (R ? Object.values(R.skills).flat() : []);
});
/* ---- LIRA：缺资产 A/B/C 候选出图提示词（模板；描述只取场内文学/注册表已有特征） ---- */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports.gap = f; else f(root.WB); })(typeof self !== 'undefined' ? self : this, function (WB) {
  const D = {
    'CH-01': ['character', 'a tired adult man in glasses and an old work jacket'],
    'CH-02': ['android', 'a child-sized, partly repaired care android of slight build with a child-like face, an optical eye and visible repair seams'],
    'CH-03': ['character', 'an upright, composed adult man in a rain hood and dark gloves'],
    'CH-04G': ['group', 'four distinct recyclers in rain-soaked work gear'],
    'CH-05': ['vehicle', 'a four-legged robot dog with a sweeping sensor head and a folded module on its back'],
    'S04-TMP-CH-LEADER': ['character', 'a recycler team leader with a hip holster and an earpiece'],
    'PR-07': ['prop', 'a worn fabric tool bag with a metal buckle'],
    'PR-15': ['prop', 'an old wrist timer whose blank illuminated display is reserved for a countdown overlay added in post'],
    'PR-19': ['prop', 'an insulated rod tool with metal contact tips'],
    'PR-05': ['prop', 'a half-used tube of medical gel wrapped in a soaked cloth bundle'],
    'PR-09': ['prop', 'a short roll of rust-colored tape'],
    'PR-01': ['prop', 'a child-sized service robot forearm and hand with exposed wrist joints'],
    'CO-05': ['prop', 'a dark left glove with a turned-up cuff edge'],
    'S04-TMP-PR-MODULE': ['prop', 'a small rectangular electronic module with a blank identification area reserved for post-production'],
    'S04-TMP-PR-LAMP': ['prop', 'a battered industrial work lamp on a steel pole'],
    'S04-TMP-VE-DRONE': ['vehicle', 'a scan drone with a downward sensor light'],
    'S04-TMP-VE-CMDCRAFT': ['vehicle', 'a manned aircraft with a side hatch'],
    'SC-03': ['location', 'a scrapyard dumping zone of stacked steel scrap and steel frames at night under black rain'],
    'SC-11': ['location', 'a distant rotating scan tower above a scrapyard at night'],
    'FX-04': ['location', 'black rain falling onto standing water with an oily film'],
    'FX-01': ['location', 'a red scanning light beam sweeping across wet scrap metal'],
    'S04-TMP-SC-PUDDLE': ['location', 'a shallow black-water puddle on a scrap path'],
    'FX-13': ['post'], 'FX-09': ['post'],
  };
  /* 新设计（待补码与无造型的机械犬）才给三个造型方向；有注册表设计的，A/B/C 为同一提示词三次出图 */
  const AXIS = ['a compact, rounded silhouette', 'an angular, industrial silhouette', 'a long, slim silhouette'];
  const PAL = 'Palette of 60% charcoal black, 30% cool cyan, 10% signal red, taken from the scene lighting.';
  /* 状态：一张图一个状态（LI-09）；视角：按缺口的 view 出（Codex 第 3 轮：视角与 E1/E2、G0/G1 曾被压成同一描述） */
  const ST = { E1: 'uninjured, both shoulders level', E2: 'with a fresh injury on the left shoulder, the left arm held close to the body', N1: '', 满包: 'packed full', 翻倒: 'tipped over on the wet ground and spilled open', 诺亚拿: 'held by the handle in the small hand of a child-sized android', 倒计时: '', 持握: 'held firmly in one gloved hand, the grip and contact tips clearly visible', 模块: '', 卷: '', H1: '', G0: 'intact', G1: 'its split shell leaking gel into the standing water', 雨帽: 'hood raised against the rain', '4人编组': '', 持终端: 'holding a handheld terminal with a blank glowing screen', 巡检: 'mid-stride on a raised steel walkway, feet planted on the wet steel', 悬停: 'hovering low over the scrap', '降落/舱门': 'resting on a raised platform, landing supports on the deck, side hatch open', 离场: 'lifting off from a raised platform into the rain', 闪烁: 'captured during its illuminated phase', 转动: 'its beam mid-rotation', 黑雨夜: '', W2: '', 红扫描: '', 退去: 'fading as it recedes into the distance', 左手套: '' };
  /* 视角＝[机位描述, 承载关系]；有承载关系（手持/背挎/地面/包口/腕上）时不再拼台面，一张图只有一个空间状态（Codex 第 4 轮） */
  const CARRY = { 背挎: ['three-quarter view', "hanging from a shoulder strap across a wearer's back"], 地面: ['overhead view', 'lying on wet scrap ground'], 地面散落: ['overhead view', 'lying scattered on wet scrap ground'], 手持: ['close view', 'held in one hand'], 半露包口: ['close view', 'held halfway out of an open tool bag'], 被抽出: ['close view', 'being pulled out of a tool bag by a gloved hand'], 被踩裂: ['close view', 'crushed on wet scrap ground'], 手提: ['close three-quarter view', 'carried by its handle'], 腕部特写: ['close-up', 'strapped to a wrist'], 腕部: ['close view', 'strapped to a wrist'], 手部特写: ['close-up', 'held in one hand'] };
  const VIEW = { 正面: 'front view', 侧: 'side profile view', 远景: 'distant full-body view', 全身: 'full-body three-quarter view', 中景: 'waist-up three-quarter view', 俯视近: 'high-angle close view', 腕部特写: 'close-up on the wrist', 腕部: 'view of the wrist', 手部特写: 'close-up on the hand', 背挎: 'three-quarter view', 地面: 'overhead view on the ground', 地面散落: 'overhead view lying on wet ground', 手持: 'close view held in a hand', 布团包裹: 'close three-quarter view', 半露包口: 'close view half out of an open bag', 被抽出: 'close view being pulled out of a bag', 被踩裂: 'close view crushed on wet ground', 手提: 'close three-quarter view', 外观: 'low three-quarter exterior view', 远中: 'medium-distance view', 近景: 'close view', 道具: 'three-quarter view' };
  WB.gapPrompt = function (st, gap, cand) {
    const code = gap.id || gap.tmp; const d = D[code];
    if (!d) return { ok: false, why: '还没有这项的英文描述（需资产/视听补）' };
    if (d[0] === 'post') return { ok: false, post: true, why: '屏幕字卡在后期叠加，不出图' };
    const kind = d[0] === 'android' || d[0] === 'group' ? 'character' : d[0]; const isNew = !gap.id || code === 'CH-05';
    const stt = ST[gap.state] != null ? ST[gap.state] : ''; const cr = kind === 'prop' ? CARRY[gap.view] : null; const vw = cr ? cr[0] : (VIEW[gap.view] || 'three-quarter view');
    const ax = isNew ? AXIS['ABC'.indexOf(cand || 'A')] : null; const held = kind === 'prop' && (!!cr || /\b(hand|held|ground|water|strap|wrist)\b/.test(stt));
    const sub = [d[1], ax ? 'with ' + ax : '', cr && /\b(hand|held|ground|strap|wrist)\b/.test(stt) ? '' : (cr ? cr[1] : ''), stt].filter(Boolean).join(', ');
    const ref = d[0] === 'group' ? 'Each of the four matches the corresponding figure in the group reference image; plain unbranded work gear.' : d[0] === 'android' ? 'Identity and repair marks match the attached reference image; plain unbranded clothing.' : 'Identity and costume match the attached reference image; plain unbranded clothing.';
    const mat = d[0] === 'android' ? 'Rain-beaded synthetic skin, fine panel seams and dull steel joints.' : 'Rain-soaked fabric, worn leather and dull steel details, real skin texture.';
    let p;
    if (kind === 'location') p = `Wide eye-level view of ${d[1]}${stt ? ', ' + stt : ''}. Single cold cyan back light from a distant high platform at a 1:8 lighting ratio with hard falloff, volumetric rain catching the beam. Real materials: corroded steel plate, wet rubber, oil-stained concrete and standing water. Empty deserted ground, still air between the rain, deep layered background, the main subject on the right third. ${PAL} Cinematic film still with natural film grain, grounded and physical.`;
    else if (kind === 'character') p = `Cinematic film still, ${vw} of ${d[1]}${ax ? ', with ' + ax : ''}${stt ? ', ' + stt : ''}, on wet scrap ground at night. Single cold cyan rim light from behind at a 1:8 lighting ratio with hard falloff, faint fill from the front. ${mat} ${ref} ${PAL} Natural film grain, grounded realism, subject placed on the left third.`;
    else if (kind === 'vehicle') p = `Photorealistic ${vw} of ${d[1]}${ax ? ', with ' + ax : ''}${stt ? ', ' + stt : ''}, in a scrapyard at night. Single cold cyan back light from a distant high platform at a 1:8 lighting ratio with hard falloff, rain streaking through the beam. Real materials: weathered painted metal panels, exposed bolts, wet composite and rubber seals. Plain unbranded hull surfaces. ${PAL} Cinematic film still with natural film grain, subject on the right third.`;
    else p = `Photorealistic ${vw} of ${sub}${held ? '' : ', on a wet dark steel surface'}. Single cold cyan key light from the upper left at a 1:4 lighting ratio with soft falloff. Real materials: brushed steel, matte composite and scuffed rubber with rain droplets. Plain unbranded matte surfaces. Shallow depth of field keeps the far edges soft, subject on the left third. ${PAL} Cinematic film still with natural film grain.`;
    p = WB.deName ? WB.deName(p) : p;
    const platform = { aspect: kind === 'location' || kind === 'vehicle' ? '21:9' : kind === 'character' ? '16:9' : '1:1', note: '在生成界面设置，不进正文' };
    return { ok: true, prompt: p, kind, platform, isNew, cand: cand || 'A', variant: ax ? '造型方向：' + ['紧凑圆润', '硬朗工业', '修长'][('ABC').indexOf(cand || 'A')] : '同一提示词，三次出图取最贴参考' };
  };
});
