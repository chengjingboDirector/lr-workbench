/* 视听补数 S04 合并（源：work/codex_review/round2/视听补数_S04.md sha8 71fdc3ad；数据底：workbench/data/S04.json 97678f09）
   标记：AV＝视听补数原值（视听代填摄影字段，待摄影确认）；PROXY＝总监代选｜待导演确认（6 条冲突裁决）；FILL＝总监代填｜待视听确认（23 项待定的推导值）。
   本文件不改 S04.json；页面加载时把补数叠加到内存数据上，叠加记录进后台。 */
(function (root) {
  const AV = '视听补数 71fdc3ad｜待摄影确认', PROXY = '总监代选｜待导演确认', FILL = '总监代填｜待视听确认';
  const A = {
    src: { file: 'work/codex_review/round2/视听补数_S04.md', sha8: '71fdc3ad', base: 'workbench/data/S04.json', baseSha8: '97678f09', notUsed: 'workbench_codex/data/S04.json（6a093973）' },
    marks: { AV, PROXY, FILL },
    /* 全场器材（型号与效果短语合并成正文属性：冲突 5） */
    kit: {
      body: { model: 'ARRI ALEXA Mini LF', en: 'ARRI ALEXA Mini LF recording a Super 35 4:3 crop for 2x anamorphic lenses (the lenses cover Super 35 only, so no large-format look): clean digital image, deep clean blacks; 2x anamorphic squeeze, 2.39:1 extraction, anamorphic widescreen', zh: 'ALEXA Mini LF 裁 S35 4:3 区域配 2× 变形（C 系列只覆盖 S35，不要大画幅质感）；2.39:1', mark: AV + '；画幅 2× 按冲突 4 ' + PROXY + '；S35 裁切按视听补数「镜头系列的取舍」' + FILL, src: '视听补数 §0 器材配套「机器／介质」「画幅」；格式引用 S04.json optics.package.format.promptText' },
      lens: { model: 'Panavision C-Series', en: 'Panavision C-Series vintage 2x anamorphic primes: vintage anamorphic character', zh: '复古 2× 变形定焦（型号建议 C 系列）', mark: AV + '；型号写进正文按冲突 5 ' + PROXY, src: '视听补数 §0「镜头系列」首选；焦段换算：实际≈球面等效×2，就近取 C 系列档位（近似，不是精确 ×2）' },
      filter: { en: 'Tiffen Black Pro-Mist 1/8: subtle black-mist diffusion, soft highlights, gentle halation; no ND, polarizer, streak or star filters', zh: '1/8 黑柔，不用 ND、偏振、拉丝、星光', mark: AV, src: '视听补数 §0「滤镜」；效果短语引用 S04.json package.filter' },
      grain: { en: 'fine, even film-like grain (medium-fine)', zh: '中细颗粒', mark: AV, src: '视听补数 §0「颗粒」；S04.json optics.grain' },
      light: { en: 'low-key night, about 1:8 contrast, cool cyan backlight around 6000K, hard; volumetric rain catches the light', zh: '低调光 1:8，冷青逆光约 6000K，硬光，体积雨', mark: '数据已有', src: 'S04.json scene.lighting' },
    },
    focalMap: { 24: 50, 28: 50, 35: 75, 39: 75, 40: 75, 50: 100, 70: 150, 85: 180 },
    /* 段级默认（视听补数各组 ② 表）；fringing 视听没写的组按场级规则推导 */
    seg: {
      G1: { fx: 'handheld breathing camera, horizontal cyan streak flare only when the distant high light enters frame, vertically oval bokeh, faint cyan-purple fringing at corners only',
        vignette: 'light vignette', breathing: 'focus breathing only in shot 2 when focus moves from the wrist timer to his eyes; none elsewhere', focus: 'manual focus following the characters; a rack focus in shot 2', bokeh: 'vertically oval bokeh on the exit lights',
        flare: 'cyan horizontal streak only when the cold backlight enters frame (shot 1, once during the orbit in shot 2); the work lamp gives a short streak only on the frames it flashes in frame (shot 3 at 2.4s, shot 4 at 0.8s and 1.6s); the red scan in shot 6 only sweeps the scrap edge, no red streak',
        fringing: 'faint cyan-purple fringing only at frame corners on high-contrast backlit edges', fringingMark: '数据已有（C001）' },
      G2: { fx: 'red scanning light sliding down wet steel; when the red source points straight into the lens: horizontal red streak flare with broad red veiling glare (strongest optical event of the scene); otherwise no flare, red-tinted oval bokeh',
        vignette: 'medium vignette', breathing: 'focus breathing only in shot 5 when focus moves from the body to the terminal', focus: 'preset focus on locked shots; a rack focus in shot 5', bokeh: 'vertically oval bokeh with a red tint',
        flare: 'shot 1: short weak red streak when the high source is in frame, red reflections on the ground; shot 2: drone lights as red points only, no streak; shot 3: red light straight into the lens at 0.3s, red horizontal streak and broad red veiling glare, locked on his face at 2.0s; shots 4–7: no flare; faint cyan streak whenever the cold backlight is in frame',
        fringing: 'faint cyan-purple fringing only at frame corners on high-contrast backlit edges; none elsewhere', fringingMark: FILL },
      G3: { fx: 'aircraft hatch lights cutting through rain haze as light shafts; brief cold-white horizontal streak only while the hatch light is in frame; dialogue frames clean, no flare',
        vignette: 'light-to-medium vignette', breathing: 'focus breathing only in shot 1 when focus moves from the platform to the commander', focus: 'one speaker per shot, focus stays on the speaker; no rack focus in shot 4', focusMark: FILL, bokeh: 'vertically oval bokeh',
        flare: 'shot 1: cold-white horizontal streak and light shafts in the haze while the hatch light is in frame; shots 2–6: no flare (light sources out of frame)', flareMark: FILL,
        fringing: 'faint cyan-purple fringing only at frame corners on high-contrast backlit edges; none elsewhere', fringingMark: FILL },
      G4: { fx: 'tight locked frames, moderate vignette, rack focus between faces, chest panel only a soft screen glow (no flare), distant red scan glow fading away',
        vignette: 'medium vignette', breathing: 'focus breathing only during the rack focus in shot 3 (from the care unit to the commander) and shot 4 (from the commander to the hand on the ground)', focus: 'rack focus on locked shots; handheld follow focus in shot 6', bokeh: 'vertically oval bokeh',
        flare: 'chest panel is only a soft screen glow, no flare; in shot 6 the distant red scan is a weak red glow fading from 1.0s to 4.5s; the hovering drone light is a point, no streak',
        fringing: 'faint cyan-purple fringing only at frame corners on high-contrast backlit edges; none elsewhere', fringingMark: FILL },
      G5: { fx: 'wet ground reflections kept (no polarizing), shimmering water caustics, wide crane rise with deep focus, distant red drone lights as tiny oval points, a dark aircraft hull sweeping past the lens with one brief cold-white streak',
        vignette: 'medium vignette in shot 4 phase 1; light vignette in phases 2–4', breathing: 'focus breathing allowed in shot 4 phase 1 when focus moves from the reflection to the people', focus: 'rack focus in shot 4 phase 1; deep focus at T4 in phases 2–4', bokeh: 'vertically oval bokeh; distant red drone lights as tiny ovals',
        flare: 'shot 4 phases 2–3: only fine small streaks from the cold backlight and distant drone lights; phase 4: one short cold-white streak as the hull light passes close; otherwise no flare',
        fringing: 'faint cyan-purple fringing only at frame corners on high-contrast backlit edges; none elsewhere', fringingMark: FILL },
    },
    /* 镜级（视听补数各组 ④ 表）；G1 机高、机距以 S04.json 为准（冲突 1） */
    shots: {
      C001: { ap: 'T2.8', cam: [[340, 476, -60], [368, 452, -59], [398, 428, -60]], dist: 4.4 },
      C002: { ap: 'T2.8', eq: 50, eqOut: null, cam: [[441, 385, -130], [450, 374, -174], [447, 358, 141]], c2: true },
      C003: { ap: 'T2.8', cam: [[464, 344, 141], [461, 349, 137], [458, 353, 134]] },
      C004: { ap: 'T2.8', cam: [[452, 353, 139], [474, 335, 139], [496, 316, 139]] },
      C005: { ap: 'T4', cam: [[485, 326, 140], [487, 330, 144], [490, 334, 176]] },
      C006: { ap: 'T4', cam: [[459, 355, -50]], note: '按 json 机距 2.2m，诺亚只以前景虚边入画（' + FILL + '）' },
      C007: { ap: 'T2.8', cam: [[508, 363, -130], [466, 401, -130], [498, 378, -130]] },
      C008: { ap: 'T2.8', h: 2.4, d: 2.9, cam: [[560, 230, -108], [558, 230, -151], [545, 235, -121]] },
      C009: { ap: 'T4', h: 1.0, cam: [[540, 250, -104]], move: '固定', moveMark: FILL },
      C010: { ap: 'T2.8', h: 1.7, d: 1.8, cam: [[525, 165, 135]] },
      C011: { ap: 'T2.8', h: 1.5, cam: [[440, 230, -34], [445, 232, -66], [450, 234, -1]] },
      C012: { ap: 'T2.8', h: 1.6, d: 8.3, cam: [[665, 215, -171]] },
      C013: { ap: 'T2.8', h: 1.1, cam: [[455, 225, 3]], move: '固定', moveMark: FILL },
      C014: { ap: 'T2.8', h: 1.5, cam: [[450, 270, -27], [455, 268, -61], [460, 266, -72]] },
      C015: { ap: 'T2.8', h: 0.8, d: 6.1, cam: [[480, 240, -26], [480, 240, -19], [480, 240, -12]] },
      C016: { ap: 'T2.8', h: 1.0, cam: [[420, 190, -12]] },
      C017: { ap: 'T2.8', h: 1.5, d: 2.2, cam: [[470, 160, 54]] },
      C018: { ap: 'T2.8', h: 1.4, cam: [[430, 175, 9]] },
      C019: { ap: 'T2.8', h: 1.4, cam: [[445, 230, -35], [448, 232, -25], [452, 236, -22]] },
      C020: { ap: 'T4', h: 2.4, d: 3.1, cam: [[420, 260, 0]] },
      C021: { ap: 'T2.8', h: 2.0, cam: [[415, 280, -28]] },
      C022: { ap: 'T2.8', h: 1.1, d: 2.4, cam: [[450, 240, -48]] },
      C023: { ap: 'T2.8', h: 1.1, d: 6.6, cam: [[450, 245, -51]] },
      C024: { ap: 'T2.8', h: 1.0, cam: [[455, 215, -41], [455, 215, 12], [455, 215, 64]] },
      C025: { ap: 'T2.8', h: 1.0, d: 2.0, cam: [[455, 225, 50]] },
      C026: { ap: 'T2.8', h: 1.5, cam: [[430, 250, 11], [432, 250, -6], [435, 250, -26]] },
      C027: { ap: 'T2.8', h: 1.4, cam: [[420, 240, -4]], move: '固定', moveMark: FILL },
      C028: { ap: 'T4', h: 1.2, d: 2.3, cam: [[440, 300, -33]] },
      C029: { ap: 'T2.8', h: 1.4, cam: [[440, 220, 35], [442, 222, 35], [445, 224, 32]] },
      C030: { ap: 'T2.8', eqOne: 24, h: 0.3, hTo: 1.2, cam: [[480, 300, -80], [480, 300, -79], [480, 302, -78]] },
      C031: { ap: 'T4', h: 0.6, hTo: 9, cam: [[480, 300, -77], [480, 380, -76], [470, 460, -71]], pan: '摇向东侧作业区', panMark: FILL },
      C032: { ap: 'T4', h: 9, hTo: 18, cam: [[470, 460, -71], [465, 500, -67], [460, 540, -65]] },
      C033: { ap: 'T4', h: 18, cam: [[460, 540, -50]] },
    },
    /* 平面图：G1 按冲突 2 修正点位；G2–G5 新写（20px/m，出口前区，底图待生成） */
    maps: {
      G1: { scale: '约 14.5 px/m（透视底图反推，近似）', people: { 伊莱亚斯: { C001: [430, 372, -40], C005: [474, 335, -40], C006: [480, 330, -40], C007: [438, 368, 140] }, 诺亚: { C003: [395, 418, -40], C005: [430, 372, -40], C007: [430, 372, -40] } }, puddle: [425, 378], dist: [[[474, 335], [430, 372], '约 4.0m（文 L26）']], mark: '修正点位 ' + PROXY },
      G2: { scale: '20 px/m', outline: [['exit', [470, 60], [570, 60], '出口'], ['line', [430, 120], [430, 200], '金属挡板'], ['line', [880, 250], [700, 230], '废料坡'], ['pt', [535, 145], '金属踏板'], ['water', [480, 260], 40, '积水']],
        people: { 伊莱亚斯: { C008: [520, 190, -90], C010: [500, 190, -150], C014: [495, 195, 17] }, 诺亚: { C008: [500, 210, -90], C010: [480, 205, -90], C014: [470, 200, 10] }, 组长: { C011: [720, 230, 180], C012: [640, 225, 180], C014: [560, 215, -170] } }, dist: [[[495, 195], [470, 200], '约 1m'], [[495, 195], [560, 215], '约 3.4m']] },
      G3: { scale: '20 px/m', outline: [['exit', [470, 60], [570, 60], '出口'], ['line', [430, 120], [430, 200], '金属挡板'], ['pt', [535, 145], '金属踏板'], ['box', [760, 60], [820, 120], '平台'], ['water', [480, 260], 40, '积水']],
        people: { 凯恩: { C015: [600, 215, 0], C016: [535, 145, 0] }, 伊莱亚斯: { C015: [495, 195, -51], C020: [480, 255, null] }, 诺亚: { C015: [470, 200, null], C020: [480, 205, null] }, 组长: { C018: [560, 215, -175] } }, dist: [[[495, 195], [535, 145], '水平约 3.2m']] },
      G4: { scale: '20 px/m', outline: [['pt', [535, 145], '金属踏板'], ['box', [760, 60], [820, 120], '平台'], ['water', [480, 260], 40, '积水']],
        people: { 伊莱亚斯: { C021: [480, 255, -90], C024: [480, 255, -63] }, 诺亚: { C022: [482, 205, 90] }, 凯恩: { C021: [535, 145, 90], C026: [600, 170, -30] }, 组长: { C021: [540, 235, 180], C026: [530, 240, 180] } }, dist: [[[480, 255], [482, 205], '约 2.5m']] },
      G5: { scale: '20 px/m', outline: [['box', [760, 60], [820, 120], '平台'], ['water', [480, 260], 40, '积水']],
        people: { 伊莱亚斯: { C029: [480, 255, null] }, 诺亚: { C027: [482, 205, 90], C029: [500, 255, 180] }, 组长: { C027: [560, 230, 0] } }, dist: [[[480, 255], [500, 255], '约 0.5m']] },
    },
    /* 6 条冲突的裁决（父代理转述的总监决定） */
    conflicts: [
      { n: 1, t: 'C001–C003 机高、机距以 S04.json 为准（不用群里口径）', mark: PROXY },
      { n: 2, t: '站位距离以文 L26「四米」为准，采用视听修正坐标；朝向统一按 G1 平面图的现有约定（0°＝画右，顺时针为正）', mark: PROXY },
      { n: 3, t: 'C002 固定等效 50mm 定焦（实际 100mm），靠推轨推进，不做镜内变焦', mark: PROXY },
      { n: 4, t: '画幅暂按视听的 2× 变形', mark: PROXY },
      { n: 5, t: '镜头型号按 v4 写进提示词正文，品牌禁令只管画面内容；器材型号与效果短语合并成正文属性', mark: PROXY },
      { n: 6, t: '滑倒水坑与黑水是否同一处（P9）：先挂「待资产确认」，不阻塞；提示词里只写「积水」（standing water）', mark: PROXY + '；P9 待资产确认' },
    ],
    /* 23 项待定：能推导的给值（FILL）；没依据的不写进提示词，进「还差什么」 */
    pending: [
      { k: '镜头系列取舍（C 系列 2× 只覆盖 S35，装大画幅机身要裁切；或 1.65×）', v: '按冲突 4 用 C 系列 2×，系数按 ×2 写', use: true },
      { k: 'C006 诺亚是否真入画（机距 2.2m 时诺亚在机位后）', v: '按 json 2.2m，诺亚只作前景虚边', use: true },
      { k: 'C009 运镜（固定或微降）', v: '固定（S04.json move.primary＝固定）', use: true },
      { k: 'C013 运镜（固定或轻跟）', v: '固定（同组「固定为主」口径）', use: true },
      { k: 'C027 运镜（固定或轻跟）', v: '固定（同组「停」节拍）', use: true },
      { k: 'C018 三人同框是否拉焦', v: '不拉焦，焦点给说话人（一镜一说话人规则）', use: true },
      { k: 'C016 冷青逆光是否在背景高处入画出弱拉丝', v: '不出（光源不入画不出炫光的规则）', use: true },
      { k: 'C031 往哪边摇', v: '摇向东侧作业区（视听建议）', use: true },
      { k: '回收车位置', v: '[150,80]（视听建议；只用于平面图，不进提示词）', use: true },
      { k: 'G2 无人机悬停高度', v: '约 4m（视听建议；只用于平面图）', use: true },
      { k: 'G4 无人机悬停高度', v: '约 4m（沿用 G2）', use: true },
      { k: '凯恩飞行器离场高度', v: '约 20m（视听建议；只用于平面图）', use: true },
      { k: '机械犬在 C031 的去向', v: '[920,330]→[980,450]（视听建议）', use: true },
      { k: 'C030–C033 是一个连续镜，实际焦段从 75mm 变到 50mm（定焦不能镜内换）', v: '全程一支 50mm（等效 24mm），C030 靠机位贴近水面取倒影；C030 原区间 35–50mm 不再满足（总监代选｜待导演确认）', use: true, note: 'Codex r3-1 发现' },
      { k: '高处机械臂高度', v: null },
      { k: '稍高平台 P7 的高度', v: null },
      { k: '金属踏板 P8 高出水面多少（凯恩与伊的高差）', v: null },
      { k: 'C020 伊落水后的朝向', v: null },
      { k: '左肩撞的低矮废料的具体朝向', v: null },
      { k: 'C022 诺亚伸的是哪只手', v: null },
      { k: 'C022 迈步没落下的是哪条腿', v: null },
      { k: 'C026「另一名回收者」是哪一名', v: null },
      { k: 'C029 后伊站起的朝向', v: null },
      { k: 'C031 持棍者转进哪条作业通道', v: null },
    ],
  };
  /* 叠加到内存数据（不改源）；返回叠加记录 */
  A.apply = function (data) {
    const log = []; const sh = (id) => data.shots.find((s) => s.id === 'S04-' + id);
    Object.entries(A.shots).forEach(([id, v]) => { const s = sh(id); if (!s) return;
      if (v.ap && !s.aperture.value) { s.aperture.value = v.ap; s.aperture.src = AV; log.push([id, '光圈', v.ap, AV]); }
      if (v.h != null && s.position.height == null) { s.position.height = v.h; s.position.src = AV; log.push([id, '机高', v.h + (v.hTo ? '→' + v.hTo : '') + 'm', AV]); }
      if (v.d != null && s.position.distance == null) { s.position.distance = v.d; log.push([id, '机距', v.d + 'm', AV]); }
      if (v.hTo != null) s.position.heightTo = v.hTo;
      if (v.eq) { s.focal.eq = v.eq; s.focal.eqOut = v.eqOut; s.focal.src = PROXY; log.push([id, '焦段', '等效 50mm 定焦，推轨推进，不变焦', PROXY]); }
      if (v.eqOne) { const was = s.focal.eq; s.focal.eq = v.eqOne; s.focal.eqOut = null; s.focal.src = PROXY; log.push([id, '焦段', '连续镜 C030–C033 全程一支定焦：等效 ' + was + '→' + v.eqOne + 'mm（实际 50mm）；C030 的倒影近景靠机位贴近水面（机高 0.3m），不靠换镜头。原区间 35–50mm 不再满足', PROXY]); }
      if (v.c2) { s.move.segments = [{ t0: 0, t1: 1.2, move: '斯坦尼康', note: '起幅伊侧抬腕' }, { t0: 1.2, t1: s.duration, move: '轨道', note: '推轨推进至近景（定焦，不做镜内变焦）' }]; s.move.src = PROXY; }
      if (v.move) { s.move.primary = v.move; s.move.segments = [{ t0: 0, t1: s.duration, move: v.move, note: (s.move.raw || '') + '→' + v.move + '（' + FILL + '）' }]; log.push([id, '运镜', v.move, FILL]); }
      s.av = { cam: v.cam, actual: A.focalMap[s.focal.eq] || null, pan: v.pan, note: v.note };
      s.av.actual && log.push([id, '实际焦段', A.focalMap[s.focal.eq] + 'mm（等效 ' + s.focal.eq + 'mm ×2 后就近取档，近似）', AV]);
    });
    // 冲突 6：滑倒水坑／黑水 → 提示词只写 standing water
    data.shots.map((x) => x.id.slice(4)).forEach((id) => { const s = sh(id); if (!s || !s.actionEn) return; const b = s.actionEn; s.actionEn = s.actionEn.replace(/the black water/g, 'the standing water').replace(/shallow black water/g, 'shallow standing water').replace(/black water/g, 'standing water').replace(/slick puddle floor/g, 'slick bottom of the standing water').replace(/the puddle/g, 'the standing water').replace(/a puddle/g, 'standing water').replace(/In the puddle/g, 'In the standing water'); if (b !== s.actionEn) log.push([id, '动作英文', 'puddle／black water → standing water', PROXY]); });
    const W = (t) => (typeof t === 'string' ? t.replace(/shallow black water/g, 'shallow standing water').replace(/the black water/g, 'the standing water').replace(/black water/g, 'standing water').replace(/the puddle/g, 'the standing water').replace(/a puddle/g, 'standing water').replace(/puddle/g, 'standing water') : t);
    data.groups.forEach((g) => { ['firstFrameEn'].forEach((k) => { if (g[k]) { const b = JSON.stringify(g[k]); g[k] = JSON.parse(W(b)); if (b !== JSON.stringify(g[k])) log.push([g.id, '首帧英文', 'black water／puddle → standing water', PROXY]); } }); });
    data.shots.forEach((x) => { if (x.bgActions) x.bgActions = x.bgActions.map(W); });
    const c26 = sh('C026'); if (c26 && c26.lighting && (c26.lighting.inFrame || []).includes('L3')) { c26.lighting.inFrame = c26.lighting.inFrame.filter((x) => x !== 'L3'); log.push(['C026', '画内光源', '远处红扫描只是弱红晕，渐退，不拉丝', AV]); }
    { const c = sh('C006'); const old = 'Locked frame, the exit and Noah split the depth.'; if (c && c.actionEn && c.actionEn.startsWith(old)) { c.actionEn = c.actionEn.replace(old, 'Locked frame on the exit; Noah stays behind the camera and shows only as a soft, out-of-focus edge in the near foreground.'); log.push(['C006', '构图句', '诺亚只作前景虚边（按 json 机距 2.2m）', FILL]); } }
    const c6 = sh('C006'); if (c6 && c6.lighting && (c6.lighting.inFrame || []).includes('L3')) { c6.lighting.inFrame = c6.lighting.inFrame.filter((x) => x !== 'L3'); log.push(['C006', '画内光源', '红扫描只扫废料堆边缘，不入镜，不出红拉丝', AV]); }
    return log;
  };
  if (typeof module !== 'undefined') module.exports = A; else root.AV_S04 = A;
})(typeof window !== 'undefined' ? window : globalThis);
