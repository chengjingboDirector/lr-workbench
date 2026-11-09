"""规则抽取：从各 SKILL.md 与 references 抽出「可检查」的规则 → rules/<skill>.json、rules/rules.js、rules/manifest.json
不把 skill 全文塞进页面：每条只存 id、短引文（≤160 字）、来源文件＋行号、文件 sha8、检查方式、严重度、作用对象。
行号由「锚点原文」在源文件中查找得到；锚点找不到 → 抽取失败（不猜行号）。
python3 tools/extract_rules.py            # 生成
python3 tools/extract_rules.py --check    # 只核对源文件 sha 是否变化（规则库是否过期），写 rules/freshness.js"""
import hashlib, json, pathlib, sys, datetime
W = pathlib.Path(__file__).resolve().parent.parent
WF = pathlib.Path('/home/box/agent-data/workflows'); SH = pathlib.Path('/home/box/shared-skills'); IMP = pathlib.Path('/home/box/.cursor/skills/impeccable')
SRC = {
 'CD': WF/'cinedance-higgsfield/references/original.md', 'CDS': WF/'cinedance-higgsfield/SKILL.md', 'CD25': WF/'cinedance-higgsfield/references/seedance-2.5-compatibility.md',
 'AC': WF/'acting/references/original.md', 'ACS': WF/'acting/SKILL.md',
 'LI': WF/'lira-image-prompts/references/original.md', 'LIS': WF/'lira-image-prompts/SKILL.md',
 'SS': WF/'story-to-screen/SKILL.md', 'SS02': WF/'story-to-screen/references/02_story.md',
 'RDS': WF/'screenwriting-rewrite-diagnosis/SKILL.md', 'RD': SH/'screenwriting-rewrite-diagnosis/SKILL.md',
 'CRS': WF/'audience-cold-read-panel/SKILL.md', 'CR': SH/'audience-cold-read-panel/SKILL.md',
 'IMS': WF/'impeccable/SKILL.md', 'IMF': IMP/'reference/craft-floor.md',
 'TAS': WF/'design-taste-frontend/SKILL.md', 'TAC': WF/'design-taste-frontend/scripts/consistency.mjs',
 'PJ': W/'rules/project_contract.md',
}
def sha8(p): return hashlib.sha256(p.read_bytes()).hexdigest()[:8]
# (id, 源, 锚点原文, 中文规则, 检查方式, 严重度, 作用对象)
# 检查方式：auto=工作台机器校验（WB.lint 的同名检查）；e2e=本机 Playwright/扫描器校验；manual=人工核（前台列为「待人工」，不算通过）
RULES = {
 'cinedance-higgsfield': [
  ('CD-01','CD','Do not include scene numbers.','正文不写场号/镜号/剧本页眉（管理信息留在工作台）','auto:noSceneHeader','error','prompt'),
  ('CD-02','CD','- previously','正文不写 previously / again / continues / from last shot / as above 这类上下文泄漏词','auto:contextWords','warn','prompt'),
  ('CD-03','CD','The first visible frame already contains all required characters in their correct positions.','首帧占位锁：第一帧就有全部必需人物，不留空镜、不延迟露出','auto:firstFrameLock','error','prompt'),
  ('CD-04','CD','Never rely on weak words when spatial accuracy matters:','空间准确处不用 near / around / beside / nearby 等弱词，改为可测量位置','auto:weakSpatial','warn','prompt'),
  ('CD-05','CD','Body direction and eye direction are separate.','有两人以上的镜，写出身体朝向与视线（faces / looks / eyes / turns）','auto:gazePerShot','warn','prompt'),
  ('CD-06','CD','Use only explicit cut types.','只用明确切法（HARD CUT 等），不写 fade / dissolve / crossfade','auto:cutTypes','error','prompt'),
  ('CD-07','CD','Do not rely on millimeters, f-stops, ISO, lens brand names, or vintage lens model names as primary control.','光学以对角视场角（°）和可见结果为主控；毫米只作辅助（2.5 兼容说明允许焦距语言）','auto:fovPrimary','warn','prompt'),
  ('CD-08','CD','- Cooke S4','不写镜头/机身/滤镜品牌型号','auto:lensBrands','error','prompt'),
  ('CD-09','CD','For timed shots, write events in time blocks.','动作按时间块写（起止秒）','auto:timeBlocks','error','prompt'),
  ('CD-10','CD','Only the quoted scripted line is spoken.','只念剧本原句：引号内台词必须逐字出自文学本','auto:dialogueVerbatim','error','prompt'),
  ('CD-11','CD','No offscreen voices unless explicitly specified.','画外音必须明示 off-screen，否则不出画外声','auto:offscreenMarked','error','prompt'),
  ('CD-12','CD','Do not output a standalone NEGATIVE CONSTRAINTS block by default.','不默认输出独立负向块；负向就近写在对应正向规则后','auto:noNegBlock','warn','prompt'),
  ('CD-13','CD','- Is the final prompt in English?','最终提示词为英文（正文无汉字）','auto:englishOnly','error','prompt'),
  ('CD-14','CDS','引用标签必须来自真实上传映射。','不伪造已上传的 @ 标签：未绑定的参考只写待绑定，不标生成就绪','auto:noFakeTags','error','prompt'),
  ('CD-15','CD','@TAG: age + role/body type + current state + critical visible anchors + action-critical prop/body state. 100% matches the reference.','每个人物参考写最小锚点并声明与参考一致','auto:charAnchors','warn','prompt'),
  ('CD-16','CD25','单次生成最长30秒','单段 ≤30 秒（按 2.5 模型级上限；端点另核）','auto:segmentMax','error','prompt'),
  ('CD-17','CD','If the user chooses these settings in Higgsfield/Seedance UI, omit them from the final prompt unless they are story-critical:','画幅、时长、帧率、分辨率等平台设置不进正文','auto:noUiSettings','warn','prompt'),
  ('CD-18','CD','For single continuous takes, ensure the action can physically happen in the available time.','每个时间块内的动作在时长内物理可完成（台词也要念得完）','auto:timingFits','error','prompt'),
  ('CD-21','CD','Do not include prompt-writing notes inside the final Seedance prompt.','写作／管理注释不进模型正文（DRAFT、TIMING RISK 只能作 // 注释行）','auto:noModelNotes','warn','prompt'),
  ('CD-22','CD','- camera side relative to light','光线写明机位相对光源和曝光优先（不只写来向）','auto:lightDirection','warn','prompt'),
  ('CD-19','CD','## Lighting direction','灯光写明方向（from / behind / side），防止变成平光','auto:lightDirection','warn','prompt'),
  ('CD-20','CD','Do not make prompts longer by adding decorative adjectives.','密度只给控制点，不堆装饰形容词','manual','info','prompt'),
 ],
 'acting': [
  ('AC-11','AC','1. **Present characters only.** Write an acting paragraph only for','表演设计覆盖本组所有出镜人物（不多不少）','auto:actCoverage','warn','acting'),
  ('AC-12','AC','2. **Keep the constant core.** Identity, vocal profile, signature tics, eye','讲话人绑定已批声线主档（本项目尚无声线主档 → 待人工）','manual','warn','acting'),
  ('AC-01','AC','**2.1 Objective.** What the character wants IN THIS SCENE, RIGHT NOW, FROM A','目标：对具体对象的动作动词（不是状态）','auto:actObjective','warn','acting'),
  ('AC-02','AC','**2.2 Obstacle & stakes.** What prevents them from getting it — external','阻碍与代价：写清「得不到会怎样」','auto:actObstacle','warn','acting'),
  ('AC-03','AC','**2.3 Tactics.** The concrete method of pursuing the objective right now.','策略：动作动词；失败要换策略（≥2 种，避免单一策略）','auto:actTactics','warn','acting'),
  ('AC-04','AC','**2.4 Beats.** The beat is the smallest unit of action: the stretch during','节拍：2–4 次可见变化（停顿／姿态／语速／视线）','auto:actBeats','warn','acting'),
  ('AC-05','AC','**2.5 Subtext.** What the character actually thinks and wants, as opposed to','潜台词：说话的人物写出没说出口的意图','auto:actSubtext','warn','acting'),
  ('AC-06','AC','1. **Reaction starts before the partner\'s line ends.** A person grasps the','倾听：对方说话时的反应在句中就开始','auto:actListening','warn','acting'),
  ('AC-07','AC','## 7. Eye life — mandatory in every profile and every scene','眼部生命：每个出镜人物写视线／眨眼／扫视','auto:actEyes','warn','acting'),
  ('AC-08','AC','- [ ] States not transitions; no wardrobe, camera or color inside the acting','表演段不写服装、机位、颜色','auto:actNoCamera','warn','acting'),
  ('AC-09','ACS','新增身世、伤病、动作习惯或声线标为设计建议，不作为原稿事实。','表演新增内容标「设计建议」，不当原稿事实','auto:actLabelled','error','acting'),
  ('AC-10','AC','| 14 | Close-up overload | Active mimicry on a close-up | The tighter the shot, the less movement: only the eyes and the thought |','越近的镜动作越少：特写只留眼睛与念头','manual','info','acting'),
 ],
 'lira-image-prompts': [
  ('LI-01','LI','## 1. Natural prose, not keyword stacking','自然句子，不堆关键词；生成提示词不用全大写分节','auto:liProse','warn','gapPrompt'),
  ('LI-02','LI','A tight 80–150-word prompt beats a scattered','80–150 词，不臃肿','auto:liLength','warn','gapPrompt'),
  ('LI-03','LI','- In GENERATION prompts, never describe what you DON\'T want — describe what','只写想要的（正向），不写 no / not / without','auto:liPositive','warn','gapPrompt'),
  ('LI-04','LI','## 4. Aspect ratio & resolution = platform parameters','画幅与分辨率是平台参数，不进正文','auto:liNoAR','error','gapPrompt'),
  ('LI-05','LI','## 5. Technical lighting & materials, not vague mood','写技术光（主光方向、光比）与具体材质','auto:liLightMat','warn','gapPrompt'),
  ('LI-06','LI','Percentages read well on all models: "palette of 60% warm ochre, 30% deep','60/30/10 色板，取自场景语境','auto:liPalette','warn','gapPrompt'),
  ('LI-07','LI','- No IP/brand names anywhere in the prompt.','不写品牌、IP、真人姓名','auto:liNoBrand','error','gapPrompt'),
  ('LI-08','LI','- Optics/DOF language stays OFF locations — it belongs to characters.','场景图不写光学/景深','auto:liNoOpticsOnLocation','warn','gapPrompt'),
  ('LI-09','LI','- Multiple states (clean / damaged / bloodied) = separate assets.','不同状态分开出图（一张图一个状态）','auto:liOneState','warn','gapPrompt'),
  ('LI-10','LIS','提示词不是已生成资产','提示词 ≠ 已生成资产：候选图须看图验收、落地后才算','auto:liNotAsset','info','gapPrompt'),
 ],
 'story-to-screen': [
  ('SS-01','SS','区分事实、推断、候选和已批准','诊断条目区分事实/推断/候选/已批准（带来源）','auto:s0Sourced','error','stage0'),
  ('SS-02','SS','资产清单不等于素材存在。','资产清单 ≠ 素材存在：只有已批的真实文件算「有」','auto:s0AssetTruth','error','stage0'),
  ('SS-03','SS','**总控不撰写、改写或粘贴图像/视频模型提示词正文**','提示词正文归 CINEDANCE/LIRA 模块；工作台只按规则组装草稿并标注','manual','info','stage0'),
  ('SS-04','SS02','记录进场状态、人物即时目标、采取的策略、阻力、触发改变的事件、出场状态。','场次卡：进场状态、即时目标、策略、阻力、触发事件、出场状态','auto:s0SceneCard','warn','stage0'),
  ('SS-05','SS02','问“删去本场，后面哪些理解或行动失去依据？”','删场测试：删去本场后哪些后场失去依据','auto:s0CutTest','warn','stage0'),
 ],
 'screenwriting-rewrite-diagnosis': [
  ('RD-01','RD','| 问题 ID | 来源视角 | 位置 | 引文是否核实 | 级别 | 诊断层级 | 处理 | 权限 |','分诊表字段：问题ID、来源、位置、级别（每条都要有）','auto:s0Triage','error','stage0'),
  ('RD-02','RD','按下面顺序往上追，找到最高的那一层再改：','病根分层：前提／结构／人物／场景／对白／格式','auto:s0Layers','warn','stage0'),
  ('RD-03','RD','模拟读者（AI 冷读）提出的意见，即使多个读者「一致」，也只算一个信号','AI 冷读的「一致」只算一个信号，须回原文核实','manual','info','stage0'),
  ('RD-04','RD','2. **不要误伤保护行**','保护行（必须保留）字面不动，并列出','auto:s0MustKeep','error','stage0'),
  ('RD-05','RD','1. **不要发明新事实**','不发明新事实；新事实单独标出等批准','manual','info','stage0'),
 ],
 'audience-cold-read-panel': [
  ('CR-01','CR','『模拟冷读·〔接触程度〕：本报告由 AI 按设定画像模拟阅读生成，非真实外部观众、平台数据或投资方反馈。』','观众维度标明「模拟，非真实观众」','auto:s0SimLabel','error','stage0'),
  ('CR-02','CR','3. 至少两位画像，一同情一挑剔吗？','至少两位画像（一同情一挑剔）','manual','info','stage0'),
  ('CR-03','CR','每条问题必须有位置和原文引文；缺任一项的意见删除。','每条问题都有位置（行号）','auto:s0HasLines','error','stage0'),
  ('CR-04','CR','- **放下点** 是整份报告最有信息量的数据：写清在哪一句、为什么。','写出放下点（或如实写无）','manual','info','stage0'),
 ],
 'impeccable': [
  ('IM-01','IMF','- **Contrast:** body and placeholder text ≥4.5:1, large text ≥3:1.','正文对比度 ≥4.5:1，大字 ≥3:1','e2e:contrast','error','ui'),
  ('IM-02','IMF','- **Depth:** shadows carry an offset and a soft blur. A zero-offset colored halo is decoration.','不用零偏移彩色光晕阴影','e2e:glow','warn','ui'),
  ('IM-03','IMF','- A kicker or eyebrow above a heading. This one is a ban, not a default: no brief earns it back.','（来源冲突裁决：IMS 允许 brief 例外，IMF 明确不可豁免 → 从 IMF）标题上方不放 eyebrow／kicker 小标签','e2e:eyebrow','error','ui'),
  ('IM-04','IMF','- Unicode glyphs or emoji standing in for an icon system.','不用 emoji／Unicode 字符当图标','e2e:emoji','warn','ui'),
  ('IM-05','IMF','- A colored `border-left` or `border-right` above 1px on cards, list items, callouts, or alerts.','卡片/提示不用 >1px 彩色左/右边条','e2e:sideStripe','warn','ui'),
  ('IM-06','IMF','- **Browser surfaces:** the parts you did not draw still carry the design.','选区、焦点环、滚动条按主题色定制','e2e:surfaces','warn','ui'),
  ('IM-07','IMF','- **States:** hover, disabled, loading, error, empty.','状态齐全：悬停、禁用、错误、空状态、键盘焦点（本页无异步加载，loading 记为不适用）','e2e:states','warn','ui'),
  ('IM-08','IMS','中文断行：禁孤字；标题在短语处断；检查中英混排与数字对齐。','中文不留孤字；数字等宽对齐','manual','info','ui'),
  ('IM-09','IMS','4. **可选机械扫描**（仅 HTML/CSS/JSX 等源码）','可选机械扫描（impeccable detect）：跑了就记结果，有告警要处理','e2e:detect','info','ui'),
 ],
 'design-taste-frontend': [
  ('TA-01','TAS','every link and control outside running text 44px tall [tap-size]','交互控件最小高度 44px（正文行内链接除外）；邻钮间距≥8px','e2e:tapSize','error','ui'),
  ('TA-02','TAC','text-contrast (text on a plain ground: body text 7:1, captions, labels and muted lines 4.5:1, large','正文对比度目标 7:1；说明／标签／弱化字 ≥4.5:1（大字 4.5／3）。与 IM-01 的 4.5:1 地板并存：未达 7:1 记 warn','e2e:textContrast','warn','ui'),
  ('TA-03','TAC','heading-scale (h1 > h2 > h3, one size each,','标题层级 h1>h2>h3，同级字号一致；标题不小于其下正文','e2e:headingScale','warn','ui'),
  ('TA-04','TAC','phone      collide (FAIL: two lines of words laid over each other, the words of one section on a picture, button or','窄屏下区块／按钮／固定栏不得互相叠字或叠控件','e2e:collide','error','ui'),
  ('TA-05','TAS','4. **Equal left and right content edges.**','内容区左右边距对等（工具台可豁免三栏壳，但主栏内部仍应对齐）','e2e:edges','warn','ui'),
  ('TA-06','TAS','img-alt, field-label, heading-order, tabindex, skip-link, focus-ring, focus-visible,','可访问性基础：图片 alt、字段标签、标题顺序、焦点环／可见焦点；建议提供跳到主内容的 skip-link','e2e:a11yBasics','warn','ui'),
  ('TA-07','TAS','forms send, a confirmation only after a real send','表单可提交；成功确认只在真实发送之后出现；错误贴近字段','e2e:forms','warn','ui'),
  ('TA-08','TAC','hover-move (a hovered card or link card that tilts FAIL; one that lifts more than 6px or grows past 1.03,','悬停：禁止倾斜；抬升≤6px、缩放≤1.03；链接卡须有可见悬停反馈','e2e:hoverMove','warn','ui'),
  ('TA-09','TAS','Violet or lavender in the page\'s own design: accent, ground, gradient, effect colour or tint (a','页面自有配色不用紫罗兰／淡紫装饰（第三方真 logo 除外）','e2e:noViolet','warn','ui'),
  ('TA-10','TAS','copy-lint\'s ids: copy-residue, copy-slop-word, copy-stock-phrase,','界面可见文案避免 AI 套话／库存短语／残留占位（.example、to be added 等）','manual','info','ui'),
 ],
 'project': [
  ('PJ-01','PJ','1. 绝不发明台词','组内每句批准台词恰好出现一次、逐字、顺序不变（不是「包含即可」）','auto:dialogueVerbatim','error','prompt'),
  ('PJ-02','PJ','2. 提示词不出现人名、品牌名、片名','视频提示词非对白正文不出现人名／地名（台词引号内逐字保留）','auto:noNames','error','prompt'),
  ('PJ-03','PJ','3. 缺资产出图提示词同样不出现人名','出图提示词不出现人名／品牌名／片名','auto:noNames','error','gapPrompt'),
  ('PJ-04','PJ','5. 每组 ≤30 秒','台词念不完的组不能标正式就绪','auto:timingFits','error','prompt'),
 ],
}
def find_line(path, anchor):
    hits = [(i, l.strip()) for i, l in enumerate(path.read_text(encoding='utf-8').splitlines(), 1) if anchor in l]
    if len(hits) > 1: return -len(hits), None   # 多处命中 → 不猜，抽取失败（Codex 第 3 轮）
    return hits[0] if hits else (None, None)

def build():
    out = {'built': datetime.datetime.now().strftime('%Y-%m-%d %H:%M (UTC+8)'), 'skills': {}, 'sources': {}}
    errs = []
    for k, p in SRC.items(): out['sources'][k] = {'path': str(p), 'sha8': sha8(p)}
    for skill, rules in RULES.items():
        arr = []
        for rid, sk, anchor, zh, check, sev, target in rules:
            ln, raw = find_line(SRC[sk], anchor)
            if not ln: errs.append(f'{rid}: 锚点没找到 → {SRC[sk]}：{anchor[:40]}'); continue
            if ln < 0: errs.append(f'{rid}: 锚点命中 {-ln} 处，不唯一 → {SRC[sk]}：{anchor[:40]}'); continue
            arr.append({'id': rid, 'skill': skill, 'rule': zh, 'quote': raw[:160], 'src': {'file': str(SRC[sk]), 'line': ln, 'key': sk}, 'sha8': out['sources'][sk]['sha8'], 'check': check, 'severity': sev, 'target': target})
        out['skills'][skill] = arr
        (W / 'rules' / f'{skill}.json').write_text(json.dumps(arr, ensure_ascii=False, indent=1), encoding='utf-8')
    if errs: print('\n'.join(errs)); sys.exit(1)
    (W / 'rules' / 'manifest.json').write_text(json.dumps({'built': out['built'], 'sources': out['sources'], 'counts': {k: len(v) for k, v in out['skills'].items()}}, ensure_ascii=False, indent=1), encoding='utf-8')
    (W / 'rules' / 'rules.js').write_text('/* 由 tools/extract_rules.py 生成，勿手改 */\nwindow.RULES = ' + json.dumps(out, ensure_ascii=False) + ';\n', encoding='utf-8')
    check_fresh()
    print('规则', sum(len(v) for v in out['skills'].values()), '条：', {k: len(v) for k, v in out['skills'].items()})

def check_fresh():
    man = json.loads((W / 'rules' / 'manifest.json').read_text(encoding='utf-8'))
    now = {k: {'path': v['path'], 'sha8Built': v['sha8'], 'sha8Now': sha8(pathlib.Path(v['path'])) if pathlib.Path(v['path']).exists() else '缺失'} for k, v in man['sources'].items()}
    stale = [k for k, v in now.items() if v['sha8Now'] != v['sha8Built']]
    code = hashlib.sha256(b''.join((W / f).read_bytes() for f in ['index.html', 'css/app.css'] + sorted(str(x.relative_to(W)) for x in (W / 'js').glob('*.js')))).hexdigest()[:8]
    ua = (W / 'rules' / 'ui_audit.js').read_text(encoding='utf-8') if (W / 'rules' / 'ui_audit.js').exists() else ''
    import re as _re; m = _re.search(r'"codeSha8": "([0-9a-f]{8})"', ua)
    fr = {'checked': datetime.datetime.now().strftime('%Y-%m-%d %H:%M (UTC+8)'), 'stale': stale, 'files': now, 'uiAudit': {'codeNow': code, 'audited': m.group(1) if m else None}}
    (W / 'rules' / 'freshness.js').write_text('/* 由 tools/extract_rules.py --check 生成 */\nwindow.RULES_FRESH = ' + json.dumps(fr, ensure_ascii=False) + ';\n', encoding='utf-8')
    print('规则库', '过期：' + '、'.join(stale) if stale else '与源文件一致')

if __name__ == '__main__':
    check_fresh() if '--check' in sys.argv else build()
