#!/usr/bin/env python3
"""一次性试验品：从文学本 + ② 整组 + 组一加厚清单 生成 data/S04.json（唯一数据源）。
只读权威源，不写 workbench/ 以外的任何文件。"""
import json, re, hashlib, pathlib, datetime
P = pathlib.Path(__file__).resolve().parents[2]  # LR-1101-01
W = P / 'workbench'
SD = P / 'work/scene04_2026-11-08'
LIT = SD / 'Scene04_被扫描_文学本_导演粘贴_2026-11-08.md'
L2 = SD / '总监_Scene04_第二步建议整组_导演粘贴_A_v0.1.md'
G1 = SD / '总监_Scene04_组一加厚清单_导演聊天粘贴_A_v0.2.txt'
SV = SD / '视听_Scene04_第二步建议整组_导演粘贴_A_v0.1.md'
REG = P / 'work/资产/LR_资产注册表_v0.5.md'
EVJ = SD / '剧作_Scene04_事件表_v0.1.json'
EVM = SD / '剧作_Scene04_事件表_v0.1.md'
AEM = SD / '观众体验_S04_冷读_v0.1.md'
DRM = SD / '剧本医生_S04_诊断_v0.1.md'
DGM = SD / '剧作_Scene04_第0关剧本诊断_v0.1.md'
def sha8(p): return hashlib.sha256(p.read_bytes()).hexdigest()[:8]
CJK = re.compile(r'[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]')

# ---------------- literary ----------------
lines = LIT.read_text(encoding='utf-8').split('\n')
lit_lines = [{'n': i+1, 'text': t} for i, t in enumerate(lines)]
dialogue = []
spk_re = re.compile(r'^(.+?) / ([A-Z][A-Z ]+?)(（画外）)?$')
SPK = {'ELIAS':'伊莱亚斯','NOAH':'诺亚','KANE':'凯恩','TEAM LEADER':'组长','DRONE':'无人机'}
i = 0
while i < len(lines):
    m = spk_re.match(lines[i].strip())
    if m and i >= 9:
        en_sp = m.group(2).strip()
        typ = '画外' if m.group(3) else ('机器播报' if en_sp == 'DRONE' else '对白')
        dialogue.append({'speaker': SPK.get(en_sp, m.group(1)), 'speakerEn': en_sp, 'zh': lines[i+1].strip(),
                         'en': lines[i+2].strip(), 'line': i+3, 'zhLine': i+2, 'type': typ})
        i += 3; continue
    i += 1
# screen text (屏幕字) — exact lines
screen = []
for n in (45, 46, 52, 59, 75, 136):
    t = lines[n-1].strip()
    if '／' in t: en, zh = t.split('／', 1)
    else: en, zh = t, lines[n].strip()
    screen.append({'speaker': '屏幕字', 'speakerEn': 'SCREEN', 'zh': zh, 'en': en, 'line': n, 'type': '屏幕字'})
allD = sorted(dialogue + screen, key=lambda d: d['line'])
for k, d in enumerate(allD): d['id'] = 'D%02d' % (k+1)
DBY = {d['en']: d for d in allD}

# ---------------- ② list parse ----------------
txt = L2.read_text(encoding='utf-8')
shot_re = re.compile(r'### (\d{3})｜运镜：(.+?)｜机位：(.+?)｜时长：([\d.]+)″｜焦距：(.+?)\n- 表演：(.+?)\n- 台词：(.+?)\n', re.S)
L2shots = {m.group(1): dict(move=m.group(2), pos=m.group(3), dur=float(m.group(4)), focal=m.group(5),
                            perf=m.group(6).strip(), line=m.group(7).strip()) for m in shot_re.finditer(txt)}
assert len(L2shots) == 33, len(L2shots)
g1txt = G1.read_text(encoding='utf-8')
g1_re = re.compile(r'(\d{3})｜运镜：(.+?)｜机位：(.+?)｜时长：([\d.]+)″｜焦距：(.+?)\n场内：(.+?)\n场外／压迫：(.+?)\n戏剧／规则：(.+?)\n台词：(.+?)\n参考意图：(.+?)\n', re.S)
G1shots = {m.group(1): dict(move=m.group(2), pos=m.group(3), dur=float(m.group(4)), focal=m.group(5), inside=m.group(6).strip(),
           outside=m.group(7).strip(), drama=m.group(8).strip(), line=m.group(9).strip(), intent=m.group(10).strip()) for m in g1_re.finditer(g1txt)}
assert len(G1shots) == 7, len(G1shots)

# shot → literary line range（行号锚；不是剧作事件号）
RANGES = {1:(13,14),2:(15,15),3:(16,20),4:(21,22),5:(23,26),6:(27,31),7:(32,36),8:(37,42),9:(43,49),10:(50,53),11:(54,56),
 12:(57,61),13:(62,64),14:(65,79),15:(80,88),16:(89,94),17:(95,100),18:(101,110),19:(111,117),20:(118,121),21:(122,133),
 22:(134,139),23:(140,145),24:(146,153),25:(154,159),26:(160,174),27:(175,181),28:(182,185),29:(186,187),30:(188,194),
 31:(195,197),32:(198,203),33:(204,209)}
cov = re.findall(r'^\| (.+?) \| (\d{3}(?:–\d{3})?) \|$', txt.split('## 文学节拍覆盖')[1].split('##')[0], re.M)
covmap = {}
for summ, sh in cov:
    a = sh.split('–'); r = range(int(a[0]), int(a[-1])+1)
    for k in r: covmap[k] = summ.replace('**', '')
ACTOR = {1:'伊莱亚斯',2:'伊莱亚斯',3:'伊莱亚斯／诺亚',4:'伊莱亚斯／环境',5:'诺亚／伊莱亚斯',6:'伊莱亚斯',7:'伊莱亚斯／诺亚',8:'环境／伊莱亚斯',
 9:'无人机',10:'伊莱亚斯／无人机',11:'组长＋三名回收者',12:'无人机／组长',13:'机械犬／诺亚',14:'组长／伊莱亚斯',15:'凯恩／伊莱亚斯',16:'凯恩／伊莱亚斯',
 17:'伊莱亚斯／凯恩',18:'凯恩／伊莱亚斯／组长',19:'凯恩／回收者／伊莱亚斯',20:'回收者／伊莱亚斯',21:'伊莱亚斯／组长',22:'诺亚',23:'诺亚／凯恩',
 24:'凯恩／伊莱亚斯',25:'诺亚／伊莱亚斯',26:'凯恩／组长／回收者',27:'组长／诺亚',28:'回收者',29:'诺亚／伊莱亚斯',30:'伊莱亚斯／诺亚',
 31:'系统（回收队／机械犬）',32:'系统（废料区）',33:'凯恩飞行器'}
beats = []
for k in range(1, 34):
    a, b = RANGES[k]
    acts = [lines[n-1].strip() for n in range(a, b+1) if lines[n-1].strip() and not spk_re.match(lines[n-1].strip())
            and not CJK.search(lines[n-1]) is None and lines[n-1].strip() not in [d['zh'] for d in allD]]
    beats.append({'id': 'B%02d' % k, 'eventId': None, 'lines': [a, b], 'actor': ACTOR[k],
                  'visibleAction': ' '.join(acts)[:160], 'change': covmap.get(k, ''), 'shots': ['S04-C%03d' % k]})

# ---------------- English action drafts (视听设计草案, per shot) ----------------
EN = {
1:"Already running. Elias pushes fast through the scrap path; a slanted water curtain from a broken gutter sweeps across his face and shoulder. Breathing heavy, camera breath in sync. Ahead, between two steel frames, the exit is visible but not yet close.",
2:"Elias lifts his wrist and checks the old wrist timer, hand still raised; rain on the dial. Camera orbits and pushes in to a near-frontal close-up as his eyes lift to the side high platform, then past the overhead transport rail. A distant drone silhouette is already present in the rain sky, not descending.",
3:"Elias turns his head back. Noah is about four meters behind, stepping carefully around metal debris in shallow black water, trying to speed up but unable to keep pace. The four-meter gap must read clearly.",
4:"Elias keeps moving forward, thumb quickly wiping rain off the timer, checking it a second time. A nearby work lamp flickers twice. A distant scan tower starts turning; scattered drones in the sky re-orient.",
5:"A water splash is heard first. Noah steps into a puddle and slips; knees then palms land in black water. Elias whips his head around and stops. Four meters away, Noah tries to push up, palm sliding on the slick puddle floor.",
6:"Locked frame, the exit and Noah split the depth. Elias looks toward the exit: a few more steps and he could turn into cover behind the steel frames. He takes half a step toward it, then stops. His body still faces the exit; his face turns back to Noah. A red light begins spreading along the far scrap-pile edge. He clenches his jaw and turns back.",
7:"Elias runs back almost to Noah and grabs its upper arm; Noah plants its feet and stands up quickly with his pull. Mid-line he is already looking back at the approaching scan light, pulling Noah toward the exit.",
8:"The timer gives its end tone. A red scan light slides over a working robotic arm high above and down the wet steel frame; the ground before the exit and the side metal barrier turn red in sequence. Elias instinctively swings the tool bag behind him. Too late. The scan light crosses the bag; two short electronic responses come from inside.",
9:"A nearby drone turns and drops altitude fast. The red beam narrows and settles on them. An identification display marks two assets (blank glowing panels; text added in post).",
10:"Elias looks up, then turns away from the harsh red light. He pulls Noah half a step behind a metal barrier; the drone tracks and re-lights his face. Rain on his glasses becomes a field of fine red specks. A blank glowing ID panel appears (text added in post).",
11:"Elias glances to the exit, then to the side scrap slope; footsteps approach from there. The team leader walks in with three reclaimers: one with an electro-baton, two with long rifles raised as they close in. The team leader has a holstered pistol at his hip and looks down at a handheld terminal.",
12:"The drone's scan beam moves from Elias's chest to his waist, hands and legs. The team leader keeps his eyes on his terminal as it updates (blank glowing screen; text added in post), never on Elias's face. He lifts a hand; the two riflemen lower their muzzles and slow down. Cold procedure, no standoff.",
13:"A robot dog comes down the tilted scrap slope, crossing an exposed steel beam; its sensor head sweeps deep into the piles, back weapon module folded. Noah glances at it. The dog does not stop for them and slips into another narrow lane following a new signal.",
14:"The team leader checks his terminal and tilts his head toward nearby piles; two riflemen turn away to search. He presses his earpiece and walks toward Elias. The drone beam moves onto Noah; an old model ID reads as unfinished (blank glowing panel; text in post). Elias shields Noah behind him, one hand pressing the bag shut, eyes darting: exit, team leader, baton, drone. An engine roar presses down from above the rain.",
15:"A manned aircraft descends to a slightly higher platform; its downwash blows the rain into slanted mist. The hatch opens. Elias looks up at it, fingers tightening on the bag strap. A voice comes first from behind the reclaimers, before the speaker is visible. Elias turns toward it; Kane Mercer walks into view from behind the team leader, raincoat hood up, glancing at the offered terminal, then at the still-running sorting area.",
16:"Kane speaks while folding the turned-up edge of his left glove back under his cuff, stepping onto a metal walkway plate raised above the water. Elias and Noah stand low. Rain drips steadily off Elias's jaw; he wipes his face once, not dry, and his hand returns to the bag.",
17:"Elias opens his mouth, takes a breath first, rushing to explain. While speaking his eyes slide past Kane's shoulder to the still-visible exit. Kane's gaze drifts after a passing transport machine. Elias finishes and waits for him to look back.",
18:"Kane still looks at the work area as he speaks. Elias pulls the bag to his side, lips move, voice drops. The team leader looks at Elias; their eyes meet briefly; he sees the hand pressing the bag and Noah shielded behind him.",
19:"The team leader looks away and signals the baton reclaimer. The reclaimer grabs the bag strap; Elias pulls back on instinct, other shoulder still shielding Noah. The first electro-baton strike hits the forearm guarding the bag. He lets go in pain; the bag is torn open; he clutches at the strap once more with the same hand.",
20:"The second strike lands on his shoulder and back. Elias stumbles sideways, sole slipping on a wet metal edge; his LEFT shoulder hits low scrap beside the puddle and he falls into the black water. The tool bag overturns beside him; spill chain readable one by one: a module, tape, a cloth bundle wrapping half a medical gel tube; a child-size mechanical hand slides partly out of the open bag, palm and wrist joint showing, the rest still inside.",
21:"Elias breathes in, draws one leg up, pushes on the ground with his RIGHT hand to rise; left-shoulder pain stops him for a beat. The team leader's eyes follow him down, brow tightening slightly. The baton reclaimer steps half forward; the team leader raises a hand to stop him, then checks the seizure list on his terminal. Elias looks up and finds Noah between the boots.",
22:"Noah immediately reaches out one hand and starts to step, then freezes; the step never lands; a short taut servo sound from the knee. A restriction panel lights on its chest (blank glowing panel; text added in post). Noah looks down at it, then at Elias. High above, Kane's eyes still follow a transport machine into the distance.",
23:"Only when Noah's request sounds does Kane turn his head. No answer. Noah's outstretched hand stays where it is; its eyes move between Elias, the team leader and the chest panel, finding no one to respond.",
24:"Kane's attention lands on Noah's frozen knee joint and chest panel. Only on the final form of address does he glance briefly down at Elias in the water. Elias's push on the ground stops; his eyes leave Noah, move to Kane, then to the team leader and the lowered baton. The searching-for-the-exit look stops.",
25:"Noah's voice a second time, slightly faster than the first. Elias does not look back. He watches Kane, lips slightly parted, saying nothing; his hand is still on the ground but no longer pushing.",
26:"Kane bends, picks up the module, glances at its marking and holds it out sideways; the team leader takes it at once and stows it, then checks the next item. Another reclaimer crouches, grips the exposed wrist joint and pulls the child-size mechanical forearm out of the bag, taking it. Elias watches and keeps his hands still. The wide-area scan light recedes; the drone above still hovers; Noah's chest panel stays lit. Kane looks over Noah's chest model number, turns and walks back to the aircraft, already with his back to Elias on his last line.",
27:"The team leader puts away the terminal, looks at Elias still in the water, then at Noah frozen in place. The reclaimers release the restriction; Noah's chest panel goes dark and it immediately walks to Elias. The team leader steps aside to let it pass, then leaves with the seized items.",
28:"A departing reclaimer passes the scattered items; one boot steps on the soaked cloth bundle. A very soft crack. The half medical gel tube's shell splits; remaining gel squeezes into the black water and is washed away by the rain. The boot does not stop.",
29:"Noah picks up the tool bag and bends to support Elias's RIGHT arm, eyes on Elias's face. Elias steadies his own feet and stands up with Noah's support; left-shoulder pain tilts him once; he shifts his weight and stays standing.",
30:"In the puddle, two rain-broken reflections lean together and slowly straighten; the smaller one looks up, supporting the taller one, like a child holding up its father. The camera rises slowly from the reflection to reveal both full bodies. Elias's hand rests on Noah's shoulder; he is standing but still head down; rain falls from his coat hem. Noah waits for him. Neither has taken the first step.",
31:"The camera pulls back, rises and slowly pans toward the wider scrapyard. High walkways open behind them: two reclaimers continue toward different piles; the team leader carries the seized items to a recovery vehicle; the baton reclaimer turns into another work lane; the robot dog crosses broken frames following a new signal. Low in frame, the two still stand in place.",
32:"The camera keeps rising, the view widening: a huge scrap chute hangs beneath the city underbelly; robotic arms grab, turn, release; construction robots cut and haul along pile edges; transport machines carry sorted scrap along rails. Far away another load of scrap pours down with a dull boom. Scan drones disperse, red dots receding along their routes. On the platform Kane's aircraft closes its hatch and lifts off. Elias and Noah shrink in the expanding scrapyard.",
33:"Kane's aircraft turns into its departure lane; engine noise rushes closer. A dark belly sweeps across very close to camera, gradually covering the scrapyard below until it fills the frame completely.",
}
# ---------------- camera move mapping ----------------
def map_move(s):
    segs = []
    pri, sec = '固定', None
    if '环绕' in s: pri, sec = '斯坦尼康', '靠近'
    elif '呼吸' in s: pri, sec = '呼吸', '跟拍' if '跟' in s else None
    elif '快跟' in s: pri, sec = '跟拍', '手持'
    elif '后拉' in s or '升高' in s: pri, sec = '摇臂', None
    elif '缓抬' in s: pri, sec = '摇臂', None
    elif '手持' in s: pri, sec = '手持', '跟拍' if '跟' in s else None
    elif '跟' in s: pri, sec = '跟拍', None
    elif '急切' in s: pri, sec = '手持', None
    elif '微降' in s: pri, sec = '固定', None
    return pri, sec
def focal_range(s):
    nums = [int(x) for x in re.findall(r'\d+', s)]
    return [min(nums), max(nums)]

# ---------------- group-1 thickened camera params (视听/摄影 草案) ----------------
G1CAM = {
 1: dict(size='中全', height=1.3, angle='平视略低', distance=4.5, eq=35, aperture='T2.8', yaw=45, keySide='后侧逆'),
 2: dict(size='中近→近', height=1.5, angle='平视', distance=1.8, eq=50, eqOut=85, aperture='T2.8', yaw=60),
 3: dict(size='中景', height=1.5, angle='平视', distance=3.0, eq=35, aperture='T2.8', yaw=225),
 4: dict(size='中近', height=1.4, angle='平视', distance=2.0, eq=40, aperture='T2.8', yaw=50),
 5: dict(size='中全', height=1.2, angle='平视', distance=5.0, eq=35, aperture='T4', yaw=225),
 6: dict(size='中近', height=1.5, angle='平视', distance=2.2, eq=40, aperture='T4', yaw=140),
 7: dict(size='中景', height=1.3, angle='平视', distance=3.0, eq=35, aperture='T2.8', yaw=225),
}
G1SEG = {
 1: [{'t0':0,'t1':3.5,'move':'呼吸','note':'急促呼吸手持跟，肩息同频'}],
 2: [{'t0':0,'t1':1.2,'move':'斯坦尼康','note':'起幅伊侧抬腕'},{'t0':1.2,'t1':3.0,'move':'靠近','note':'环绕小推至近景，中途植入无人机轮廓'}],
 3: [{'t0':0,'t1':1.5,'move':'手持','note':'跟回头'},{'t0':1.5,'t1':4.0,'move':'手持','note':'转向诺亚约4m，焦点由伊转诺亚'}],
 5: [{'t0':0,'t1':0.6,'move':'固定','note':'声先于画'},{'t0':0.6,'t1':3.5,'move':'手持','note':'急切停顿'}],
}
# ---------------- shot assets ----------------
def A(id, state, view='全身', inFrame=True, name=None, note=''):
    return {'id': id, 'state': state, 'view': view, 'inFrame': inFrame, 'name': name, 'note': note}
REGNAME = {}
for m in re.finditer(r'^\| ((?:CH|ST|CO|PR|SC|VE|FX)-[0-9A-Za-z]+) \| ([^|]+) \|', REG.read_text(encoding='utf-8'), re.M):
    REGNAME[m.group(1)] = m.group(2).strip()
def elias(k):
    return A('CH-01', 'E2' if k >= 20 else 'E1', '侧' if k not in (2,10,17,25) else '正面')
def shot_assets(k):
    a = [elias(k) if k not in (9, 12, 13, 32, 33) else A('CH-01', 'E2' if k >= 20 else 'E1', '远景', True)]
    if k in (1, 2, 4, 6, 33): pass
    if k not in (1, 2, 4, 9, 33): a.append(A('CH-02', 'N1', '全身' if k not in (22, 23) else '正面'))
    if k <= 19 or k in (20,): a.append(A('PR-07', '满包' if k < 20 else '翻倒', '背挎', True))
    if k in (20, 21, 26): a.append(A('PR-07', '翻倒', '地面', True))
    if k in (29, 30, 31): a.append(A('PR-07', '诺亚拿', '手提', True))
    if k in (2, 4, 6, 7, 8): a.append(A('PR-15', '倒计时', '腕部特写' if k in (2, 4) else '腕部'))
    if k in (8, 9, 10, 12, 14, 22): a.append(A('FX-01', '红扫描', '光效'))
    if k == 26: a.append(A('FX-01', '退去', '光效'))
    if k in (9, 10, 12, 14, 22, 23, 24, 25, 26, 27): a.append(A(None, '悬停', '远中', True, name='扫描无人机（S04 现役机型）', note='注册表 VE-02 为 S08 回忆中的上层无人机，非同一资产'))
    if 11 <= k <= 28: a.append(A('CH-04G', '4人编组', '全身'))
    if 11 <= k <= 28: a.append(A(None, '持终端', '中景', True, name='组长（个体：腰挂手枪＋终端＋耳机）', note='注册表只有回收者单体/编组，无组长个体'))
    if k in (11, 19, 21): a.append(A('PR-19', '持握', '道具'))
    if k in (13, 31): a.append(A('CH-05', '巡检', '全身', True, note='注册表首次出现记 S06-016，S04 出场未登记'))
    if k in (15, 16, 26, 32, 33): a.append(A(None, '降落/舱门' if k < 26 else '离场', '外观', True, name='凯恩载人飞行器'))
    if 15 <= k <= 26: a.append(A('CH-03', '雨帽', '全身' if k != 24 else '俯视近'))
    if k == 16: a.append(A('CO-05', '左手套', '手部特写'))
    if k in (20, 21): a += [A(None, '模块', '地面散落', name='VISTA 模块（旧表候选映射 PR-03 镜片）'), A('PR-05', 'G0', '布团包裹'), A('PR-09', '卷', '地面散落', note='散落「胶带」是否即 PR-09 余卷，待资产确认'), A('PR-01', 'H1', '半露包口')]
    if k == 26: a += [A(None, '模块', '手持', name='VISTA 模块（旧表候选映射 PR-03 镜片）'), A('PR-01', 'H1', '被抽出')]
    if k == 28: a.append(A('PR-05', 'G1', '被踩裂'))
    if k in (22, 23, 24, 25, 26): a.append(A('FX-09', 'CARE锁', '胸屏'))
    if k in (9, 10, 12, 14): a.append(A('FX-13', '识别卡', '屏显'))
    if k in (4, 31, 32): a.append(A('SC-11', '转动', '远景'))
    if k == 4: a.append(A(None, '闪烁', '近景', True, name='作业灯 L2（实用光源）'))
    a.append(A('SC-03', '黑雨夜', '环境'))
    a.append(A('FX-04', 'W2', '雨'))
    return a
BAG = {}  # per-shot bag contents for continuity
for k in range(1, 34):
    if k <= 19: BAG[k] = ['VISTA 模块', 'PR-01 儿童机械手', 'PR-05 凝胶(布团)', '胶带']
    elif k <= 25: BAG[k] = ['PR-01 儿童机械手（半露）']
    elif k == 26: BAG[k] = []
    else: BAG[k] = []
GROUND = {k: (['VISTA 模块', 'PR-05 凝胶(布团)', '胶带'] if 20 <= k <= 25 else (['PR-05 凝胶(布团)', '胶带'] if k in (26, 27) else (['胶带'] if k >= 28 else []))) for k in range(1, 34)}

# ---------------- dialogue placement ----------------
def place(k, rawline):
    out = []
    for en, d in DBY.items():
        if d['type'] == '屏幕字': continue
        if en in rawline or en.replace("'", "’") in rawline:
            out.append(d)
    # 去掉被更长台词包含的短句（如 "Mr. Elias." 在多句结尾出现）——bug#1 修复
    out = [d for d in out if not any(o is not d and d['en'] in o['en'] and rawline.count(d['en']) <= rawline.count(o['en']) for o in out)]
    out.sort(key=lambda d: rawline.find(d['en']))
    return out
SPEECH_WPS = 2.8
SCREENS = {9: ['VISTA MODULE', 'CHILD-SERVICE ARM'], 10: ['ELIAS VOSS — DELETED CITIZEN'], 12: ['NO WEAPONS DETECTED'],
           14: ['N-08A-H — REVIEW PENDING'], 22: ['CARE UNIT RESTRICTION: CORPORATE ENFORCEMENT INTERVENTION PROHIBITED.']}
SCREEN_HOST = {9:'无人机识别画面', 10:'识别画面', 12:'组长终端', 14:'识别画面', 22:'诺亚胸前屏（需跟踪）'}

# ---------------- lighting ----------------
LIGHT_SOURCES = [
 {'id':'L1','name':'远端高台/运输轨道冷青光','en':'distant cold cyan light from the high platform and transport rail','asset':'SC-03','az':40,'elev':'高','type':'冷青 ~6000K 顶逆','behavior':'固定','origin':'视听设计','map':[930,40]},
 {'id':'L2','name':'近处作业灯（实用光源）','en':'nearby work lamp (practical)','asset':None,'az':300,'elev':'中','type':'钠黄偏白 实用光','behavior':'闪烁','origin':'文学本原文','litLine':22,'map':[455,215]},
 {'id':'L3','name':'红色扫描光','en':'red scan light','asset':'FX-01','az':20,'elev':'高','type':'红 扫掠光','behavior':'扫掠','origin':'文学本原文','litLine':30,'map':[990,120]},
 {'id':'L4','name':'腕上计时器屏光','en':'wrist timer screen glow','asset':'PR-15','az':None,'elev':'低','type':'屏幕光','behavior':'固定','origin':'文学本原文','litLine':15,'map':None},
 {'id':'L5','name':'诺亚胸前屏/识别屏','en':'chest panel / ID panel glow','asset':'FX-09','az':None,'elev':'中','type':'屏幕光','behavior':'固定','origin':'文学本原文','litLine':135,'map':None},
 {'id':'L6','name':'凯恩飞行器灯/舱门光','en':'aircraft hatch and hull lights','asset':None,'az':80,'elev':'高','type':'冷白 硬光','behavior':'固定','origin':'视听设计','map':None},
]
SCENE_LIGHT = {'summary':'黑里只亮湿肩和雨','key':'low key','keyZh':'低调光','fill':None,'purpose':'让人只看得见被雨打湿的轮廓：逃的人还没被看见','eventLink':None,
 'sources':['L1'],'keySource':'L1','ratio':'1:8','ct':6000,'quality':'硬','behavior':'固定','practical':None,'medium':'体积雨幕（volumetric rain）',
 'origin':'视听设计','flag':'进提示词','status':'建议待导演定'}
G1LIGHT = {
 1: {'summary':'背后冷青光只勾出湿肩和水帘，脸大半在暗里','key':'rim','keyZh':'轮廓光','purpose':'逃跑者只剩轮廓：还没被系统看见','sources':['L1'],'keySource':'L1','quality':'硬','inFrame':['L1'],'litLine':13},
 2: {'summary':'表盘的屏光照亮手腕和下巴；转到正面时冷青光退成半边弱伦勃朗','key':'screen glow','keyZh':'屏幕光','purpose':'时限钉在脸上','sources':['L4','L1'],'keySource':'L4','keyOut':'Rembrandt','keyOutZh':'伦勃朗光','quality':'软','inFrame':['L1'],'jumpReason':'抬腕看表（文学 L15）：主光由 L1 交给计时器屏光','litLine':15},
 3: {'summary':'诺亚在雾里逆光，轮廓清楚、脸暗；作业灯只闪一下','key':'silhouette','keyZh':'剪影/逆光','purpose':'四米距离靠轮廓读出来','sources':['L1','L2'],'keySource':'L1','quality':'硬','inFrame':['L1','L2'],'practical':'L2（待补码）','flicker':[2.4],'litLine':17},
 4: {'summary':'作业灯闪两下，远处扫描塔开始转','key':'practical','keyZh':'实用光源','purpose':'系统醒了','sources':['L1','L2'],'keySource':'L1','quality':'硬','inFrame':['L2'],'flicker':[0.8,1.6],'litLine':22},
 5: {'summary':'仍是冷青逆光，水坑反光先亮','key':'low key','keyZh':'低调光','purpose':'惊吓先由声音和水面反光到','sources':['L1'],'keySource':'L1','quality':'硬','inFrame':[],'litLine':23},
 6: {'summary':'红光只沿废料堆边缘划过，不上脸','key':'passing light','keyZh':'过路光','purpose':'制度已到门口，但红色留给组二','sources':['L1','L3'],'keySource':'L1','quality':'硬','inFrame':['L3'],
     'path':[{'t':2.5,'pos':'远端废料堆边缘（画右深处）','posEn':'far scrap-pile edge, deep screen-right','onFace':False},{'t':4.5,'pos':'沿边缘向画左铺开','posEn':'spreading along the edge toward screen-left','onFace':False}],'litLine':30},
 7: {'summary':'扫描光在身后逼近，人仍在冷青轮廓里','key':'rim','keyZh':'轮廓光','purpose':'带着逃','sources':['L1','L3'],'keySource':'L1','quality':'硬','inFrame':['L1'],'litLine':36},
}
L3PATH = {
 8: [{'t':0.5,'pos':'高处机械臂','posEn':'high robotic arm','onFace':False},{'t':1.5,'pos':'沿湿钢架下落','posEn':'sliding down the wet steel frame','onFace':False},{'t':2.5,'pos':'出口前地面→侧面挡板','posEn':'ground before the exit, then the side metal barrier','onFace':False},{'t':3.0,'pos':'扫过包身','posEn':'across the tool bag','onFace':False}],
 10: [{'t':0.3,'pos':'正对镜头（直射入镜）','posEn':'straight into the lens','onFace':True},{'t':2.0,'pos':'追到伊脸上','posEn':'locked on his face','onFace':True}],
 26: [{'t':1.0,'pos':'远处大范围扫描光','posEn':'wide-area scan light in the distance','onFace':False},{'t':4.5,'pos':'逐渐退去','posEn':'receding','onFace':False}],
}
# ---------------- optics package (视听版，建议待导演定) ----------------
OPTICS = {
 'status':'建议待导演定','owner':'摄影',
 'package':{'machine':{'value':'大画幅数字','flag':'仅实拍参考'},'format':{'value':'2.39:1 变形宽银幕（2× 变形）','flag':'进提示词','promptText':'2.39:1 anamorphic widescreen'},
            'lens':{'value':'复古变形定焦','flag':'仅实拍参考','promptText':'vintage anamorphic primes character'},'filter':{'value':'1/8 黑柔','flag':'仅实拍参考','promptText':'subtle black-mist diffusion: soft highlights, gentle halation'}},
 'line':'雨夜里的灯点会被拉成横向的青色光丝，焦外是竖着的椭圆光斑，暗处柔、亮处不刺眼，像隔着雨看一场快要被抓住的逃跑。',
 'why':['宽画幅能把出口和诺亚分在画面两侧（006 半步停）','变形镜头自带的横向拉丝与 L1 冷青光一致，所以不用拉丝滤镜','黑柔把雨和作业灯高光压柔','不用偏振镜或 ND：夜景，且 030 需要湿地反光'],
 'anamorphicFactor':2.0,
 'grain':'中细颗粒（全组统一）',
 'groupNotes':{'G2':'010 L3 红光直射入镜→红色拉丝＋红色雾化眩光，是全场最强的一次光学事件，其他镜不与它抢。'},
}
G1OPT = {
 1: [{'k':'炫光','v':'青色横向拉丝炫光','trig':'L1 入画'},{'k':'光晕','v':'逆光湿肩高光外溢','trig':'L1 逆光打湿肩'},{'k':'焦外','v':'出口灯点呈竖向椭圆','trig':'变形镜头＋T2.8'},{'k':'色差','v':'只在画角出现细青紫边','trig':'高反差逆光边缘'},{'k':'暗角','v':'轻微','trig':'变形镜头开放光圈'}],
 2: [{'k':'炫光','v':'L1 穿过画面一次，炫光出现一次即退','trig':'L1 环绕中入画一次'},{'k':'呼吸','v':'对焦从表盘到眼睛时画面轻微伸缩','trig':'焦点转移 表盘→眼'},{'k':'光圈约束','v':'不大于 T2.8，保证无人机轮廓可读','trig':'需要远景可读'}],
 3: [{'k':'光晕','v':'诺亚雾中逆光光晕：身形略糊，轮廓清楚','trig':'L1 雾中逆光'},{'k':'炫光','v':'L2 闪一下时出现一条短拉丝','trig':'L2 入画且闪烁'},{'k':'色差','v':'无（雾中反差低）','trig':'不触发','off':True}],
}
SUPPRESS = {'炫光':'画内/画边无光源，自动不出','色差':'无高反差边缘，自动不出'}

RIGS = [('轨道/推轨','dolly/track','稳、可精确重复，适合推近和平移'),('斯坦尼康','Steadicam','人走到哪儿跟到哪儿，漂浮但稳定'),('手持','handheld','有呼吸和紧张感，像旁边有人看着'),('肩扛','shoulder','比手持稳一点，仍带人的重量'),('稳定器','gimbal','顺滑，像在空中滑'),
        ('摇臂/升降/伸缩臂','crane/jib/technocrane','升高拉开，交代大空间'),('航拍','drone','高空大全景'),('穿越机','FPV','极速穿梭，冲击力强'),('车载','car mount','跟车，速度感'),('滑轨','slider','小幅平移，给静物一点活气'),('索道','cable cam','长距离高空跟拍')]
FILTERS = [('ND','ND','只降亮度，让白天也能开大光圈'),('偏振','polarizer','压掉水面和玻璃反光，天更蓝'),('黑柔','Black Pro-Mist','高光变柔、暗部不发灰，夜景高级感'),('白柔','white mist','整体发雾、像回忆'),('柔光玻璃','Glimmerglass','高光闪一点点光，皮肤柔'),
           ('黑/白柔焦','black/white diffusion','降低锐度，黑柔保暗部、白柔提雾感'),('黑魔法/白魔法','Hollywood Black Magic','柔化皮肤和高光，偏电影感'),('拉丝','streak filter','灯点拉成横线'),('星光','star','灯点变成星芒'),('低反差','low contrast','暗部提亮、画面更平'),('珊瑚/渐变色','coral/colour grads','给天空或局部加色')]
SPECIAL_FX = [
 {'id':'SFX-1','name':'水面焦散反射','en':'water caustic reflections','plain':'水面晃动的光纹投到人和墙上','event':'030 倒影扶起（文学 L188）','line':188,'use':'C030','status':'建议待导演定'},
 {'id':'SFX-2','name':'雨落玻璃投影','en':'rain-on-glass shadow speckles','plain':'雨点在镜片上变成细碎光斑','event':'010 眼镜雨水映红（文学 L51）','line':51,'use':'C010','status':'建议待导演定'},
 {'id':'SFX-3','name':'雾中光柱','en':'haze light shafts','plain':'灯在雾里照出一束束光柱','event':'015 飞行器气流吹雨成雾（文学 L80）','line':80,'use':'C015','status':'建议待导演定'},
 {'id':'SFX-4','name':'移动实用光扫掠','en':'moving practical light sweep','plain':'光源自己在动，扫过场景','event':'008 红光沿钢架落下（文学 L38）','line':38,'use':'C008','status':'建议待导演定'},
 {'id':'SFX-5','name':'积水倒映霓虹/红光','en':'reflected colored light in puddles','plain':'地面积水把彩色光反射出来','event':'008 出口前地面泛红（文学 L38）','line':38,'use':'C008','status':'建议待导演定'},
]
LIGHT_ENUM = ['high key','low key','Rembrandt','butterfly','split','loop','broad','short','chiaroscuro','silhouette','rim','hard','soft','bounce','top','underlight','golden hour','blue hour','day-for-night','moonlight','window','practical','firelight','venetian blinds','dappled','volumetric','flat','neon','teal&orange','monochrome red','screen glow','passing light','strobe','theatrical']
LIGHT_ENUM_ZH = ['高调光','低调光','伦勃朗光','蝴蝶光','分割光','环形光','宽光','窄光','明暗对照','剪影','轮廓光','硬光','柔光','反射光','顶光','底光','黄金时刻','蓝调时刻','日拍夜','月光','窗光','实用光源','火光','百叶窗光','斑驳光','体积光','平光','霓虹','青橙','单色红','屏幕光','过路光','频闪','舞台光']

# ---------------- 鸟瞰走位图（组一）：底图由图像模型出灰白体块，标注全部由数据叠加 ----------------
MAPG1 = {'code':'SC-03-MAP-S04-G1','base':'assets/map/SC-03-MAP-S04-G1_base.png','annot':'assets/map/SC-03-MAP-S04-G1_annot.png','notext':'assets/map/SC-03-MAP-S04-G1_notext.png',
 'status':'候选','size':[1024,576],'owner':'视听（布局）/资产（码）',
 'people':[{'who':'伊莱亚斯','color':'#ff8a3d','points':[{'n':1,'xy':[430,372],'face':-40,'shot':'C001'},{'n':2,'xy':[515,305],'face':-40,'shot':'C005'},{'n':3,'xy':[548,280],'face':-40,'shot':'C006','note':'半步又停'},{'n':4,'xy':[372,438],'face':140,'shot':'C007','note':'折返'}]},
           {'who':'诺亚','color':'#35d0e0','points':[{'n':1,'xy':[395,418],'face':-40,'shot':'C003'},{'n':2,'xy':[338,458],'face':-40,'shot':'C005','note':'水坑滑倒'},{'n':3,'xy':[352,446],'face':-40,'shot':'C007','note':'被拉起'}]}],
 'distances':[{'a':[430,372],'b':[395,418],'label':'约4m'}],
 'cameras':[{'shot':'C001','xy':[420,470],'dir':-60,'move':'呼吸跟'},{'shot':'C002','xy':[565,335],'dir':-150,'move':'环绕推'},{'shot':'C003','xy':[575,300],'dir':150,'move':'手持转'},
            {'shot':'C004','xy':[525,352],'dir':-120,'move':'手持跟'},{'shot':'C005','xy':[612,330],'dir':170,'move':'急切停顿'},{'shot':'C006','xy':[600,372],'dir':-150,'move':'固定'},{'shot':'C007','xy':[430,505],'dir':-80,'move':'快跟'}],
 'axis':{'a':[330,465],'b':[560,268],'label':'180° 轴线（机位在伊侧）'},
 'lights':[{'id':'L1','from':[960,30],'to':[700,190],'color':'#5fe0ff','label':'L1 冷青 6000K 硬 逆光'},{'id':'L2','from':[455,215],'to':[455,215],'color':'#ffd36b','label':'L2 作业灯 闪烁（待补码）','point':True},
           {'id':'L3','from':[1000,150],'to':[760,250],'color':'#ff3b3b','label':'L3 红扫描（006 只扫边缘）','dashed':True}],
 'props':[{'xy':[338,470],'code':'水坑（SC-03 陈设·待补码）'},{'xy':[397,262],'code':'水帘（FX-04@W2）'},{'xy':[700,135],'code':'出口：两钢架（SC-03）'},{'xy':[790,330],'code':'高台（SC-03）'},{'xy':[505,232],'code':'运输轨道（SC-03）'}]}

def lines_in(t):
    out = []
    for m in re.finditer(r'L(\d+)(?:[–-](\d+))?', t):
        a1 = int(m.group(1)); b1 = int(m.group(2)) if m.group(2) else a1
        if m.group(2) and b1 < a1: b1 = int(str(a1)[:len(str(a1))-len(m.group(2))] + m.group(2))
        out.append([a1, b1])
    return out
dg = DGM.read_text(encoding='utf-8')
DIMKEY = {'2.1':'结构／转折','2.2':'人物动机','2.3':'观众理解与投入','2.4':'可拍性','2.5':'时长与 Seedance 可行性'}
dims = []
for sec in re.split(r'\n### ', dg.split('## ② ')[1].split('## ③')[0])[1:]:
    key = DIMKEY[sec[:3]]
    items = []
    for m in re.finditer(r'^\| (S04-D\d+) \| (.+?) \| (.+?) \| (.+?) \|$', sec, re.M):
        items.append({'id': m.group(1), 'where': m.group(2), 'text': m.group(3).replace('**',''), 'level': m.group(4).replace('**',''), 'lines': lines_in(m.group(2)), 'src': '剧作 652df4cb'})
    dims.append({'k': key, 'items': items})
AV = {'可拍性':[
    {'risk':'高','text':'屏幕字多且长；136 行在诺亚胸前且很长 → 一律后期叠加','lines':[[44,46],[52,52],[59,59],[75,75],[136,136]]},
    {'risk':'高','text':'父子倒影 → 单独一镜或合成','lines':[[188,191]]},
    {'risk':'高','text':'升高拉开 → 同组内拆两镜，保留 4 个背景动作','lines':[[195,203]]},
    {'risk':'高','text':'机腹遮黑 → 剪辑完成（切黑在剪辑里做）','lines':[[206,207]]},
    {'risk':'中','text':'诺亚定住跨 022–027、跨组四/五 → 状态锁','lines':[[134,180]]},
    {'risk':'中','text':'80–88 行约 4″ 内塞太满','lines':[[80,88]]},
    {'risk':'中','text':'散落链需要一个俯拍插入','lines':[[119,121]]}],
  '时长与 Seedance 可行性':[
    {'risk':'节奏','text':'逃段约 25″，成立；27–31 行是戏核','lines':[[13,36],[27,31]]},
    {'risk':'节奏','text':'扫描段最密，约 8″ 阅读量','lines':[[37,79]]},
    {'risk':'节奏','text':'凯恩对话段：凯恩从不看人','lines':[[89,113],[88,88],[100,100],[104,104],[139,139]]},
    {'risk':'节奏','text':'两次请求：保留沉默；154 行更快','lines':[[143,159],[154,154]]},
    {'risk':'Seedance','text':'组三 6 句台词、2 个说话人 → 规则：一镜一个说话人，台词时点写进黑条','lines':[[89,113]]}]}
_av = [0]
for d in dims:
    for it in AV.get(d['k'], []):
        _av[0] += 1; it['id'] = 'S04-AV%02d' % _av[0]; it['idNote'] = '工作台补编号（视听原表无编号）'; it['level'] = '视听·' + it['risk'] + '风险'; it['src'] = '视听组'; it['where'] = ''
        d['items'].append(it)
risks = [{'id': m.group(1), 'where': m.group(2), 'link': m.group(3), 'text': m.group(4).replace('**',''), 'lines': lines_in(m.group(2))}
         for m in re.finditer(r'^\| (R\d+) \| (.+?) \| (.+?) \| (.+?) \|$', dg, re.M)]
opt_rows = {}
for m in re.finditer(r'^\| (权限|改什么|保留什么|代价|预计秒数|推荐) \| (.+?) \| (.+?) \| (.+?) \|$', dg, re.M):
    opt_rows[m.group(1)] = [m.group(2).replace('**',''), m.group(3).replace('**',''), m.group(4).replace('**','')]
heads = re.search(r'^\| \| (A｜.+?) \| (B｜.+?) \| (C｜.+?) \|$', dg, re.M)
SECS = [[125,130],[110,115],[130,135]]
options = []
for i, oid in enumerate('ABC'):
    options.append({'id': oid, 'title': heads.group(i+1).replace('（推荐）',''), 'literaryChange': oid != 'A', 'permission': opt_rows['权限'][i], 'changes': opt_rows['改什么'][i],
                    'keeps': opt_rows['保留什么'][i], 'risk': opt_rows['代价'][i], 'secText': opt_rows['预计秒数'][i], 'sec': SECS[i], 'recommendText': opt_rows['推荐'][i],
                    'recommended': oid == 'A', 'patch': None, 'src': '剧作 652df4cb' + ('＋视听组拍法要点' if oid == 'A' else '')})
options[2]['evidence'] = {'src':'剧本医生 A｜最小文学补丁（b11e4ed0）','note':'作为「文学补丁」候选证据，不覆盖本页三案','items':['L136–137 限制窗口加签名行（建议新增）→ P1-1／P1-5','L118 后诺亚半步被卡（建议新增）→ P1-2','L160 后伊视线跟镜片一拍（建议新增）→ P1-4','L177 前终端「收缴完成」（建议新增）→ P1-3','L184 凝胶按 P0-1 由导演二选一']}
options[0]['shootingNotes'] = {'src':'剧本医生 B｜只靠拍法与表演（b11e4ed0）作拍摄附注','items':['两棍期间观看顺序切到诺亚膝部与停住的脚；伺服绷紧声提前一次','揭示观看顺序：提示 → 伊的脸 → 提示（嘴唇无声动半句须导演判是否算新增）','凯恩前三次不看人，L102 第一次正眼看伊','组长说 L177 时眼在终端、语气平；终端先响确认音','VISTA 模块即 S03 那块镜片；凯恩拾起时红光在镜片里折一下','B3 段扫描低频不降，红光一直压在画面上']}
options[0]['avPoints'] = '屏幕字后期叠加；倒影单独一镜；升高拉开同组拆两镜；切黑在剪辑完成；诺亚定住做状态锁（视听组）'
MUSTKEEP = ['折返救诺亚（L27–32）','协议反噬后的沉默（L134–159）','凝胶被踩（L182–185）','水坑倒影关系（L188–189）']
for o in options: o['mustKeep'] = MUSTKEEP
MERGED = [
 {'dim':'观众理解与投入','title':'扫描段信息连抛 → 理解与记忆过载','level':'应修复（合并卡）','lines':[[44,76],[44,53],[74,76]],
  'parts':['观众体验 AE-LR-S04-01：资产标签／删除公民／诺亚待复核连抛，读者事后分不清三条信息轨','视听：扫描段最密，约 8″ 阅读量','剧作 S04-D17：014 组长两句溢出'],'src':'观众体验 0fa1ca81＋视听＋剧作'},
 {'dim':'观众理解与投入','title':'机械犬路过＋二人调走 → 压力空窗','level':'应修复（合并卡）','lines':[[62,78]],
  'parts':['观众体验 AE-LR-S04-02：倒计时结束后威胁被稀释','视听：机械犬约 3.5″ 需整套新资产','剧作 S04-D04：中段程序性偏长'],'src':'观众体验 0fa1ca81＋视听＋剧作'}]
DOCTOR = [
 {'dim':'人物动机','id':'P1-1','title':'L148「你写下的协议」指向不明，罪责容易被读窄','lines':[[148,148],[102,102]],'level':'P1'},
 {'dim':'结构／转折','id':'P1-2','title':'两棍之间诺亚没有任何动作（L115–133），「锁住」的解释来得太晚','lines':[[115,118],[134,134]],'level':'P1'},
 {'dim':'观众理解与投入','id':'P1-3','title':'放人落在组长的好心，而不是「流程结束／你不值得」','lines':[[175,177],[124,126]],'level':'P1'},
 {'dim':'结构／转折','id':'P1-4','title':'「VISTA 模块」未接上 S03 那块镜片，收走时无人看、无反应','lines':[[45,45],[160,160]],'level':'P1'},
 {'dim':'可拍性','id':'P1-5','title':'认出规矩只靠眼神停下（L151–153），AIGC 易失手 → 拍法附注须写明可见动作','lines':[[151,153],[159,159]],'level':'P1'}]
for it in DOCTOR:
    for d in dims:
        if d['k'] == it['dim']:
            d['items'].append({'id':'医生 '+it['id'],'where':'','text':it['title'],'level':it['level'],'lines':it['lines'],'src':'剧本医生 b11e4ed0'})
MERGED_P = {'dim':'人物动机','title':'「protocol you wrote」指向不明','level':'P1（合并卡）','lines':[[148,148]],
  'parts':['剧本医生 P1-1：观众只知道是他修了诺亚，罪责被读窄','剧作 S04-D11／R03：两种读法，后场需兑现；C 案即为此','观众体验：协议反噬是峰值，必须保留其沉默'],'src':'剧本医生 b11e4ed0＋剧作 652df4cb＋观众体验 0fa1ca81'}
sec1 = dg.split('## ① ')[1].split('## ②')[0]
DIAG = {'status':'剧作诊断 v0.1（652df4cb，诊断稿）＋视听组可拍性/节奏＋观众体验冷读 v0.1（0fa1ca81）',
 'summary':'主角以为在逃抓捕，结果被告知锁住孩子的是他自己写的规则。',
 'viewerEffect':'观众的落点不是「被抓了」，而是「他认出了自己」——落点在第 153 行「刚才急着找出口的眼神，停了下来」；带着「关系成立了，罪感也压下来了」进黑场。',
 'summaryLines':[[153,153],[148,148],[27,31],[188,190],[194,194]],
 'summaryFull': sec1.strip(),
 'dims': dims, 'merged': MERGED + [MERGED_P], 'options': options, 'risks': risks, 'mustKeep': MUSTKEEP,
 'costNotes':[{'text':'机械犬只出现约 3.5″，却需要一整套新资产','lines':[[62,64]],'src':'视听组'},{'text':'47–49 行无人机播报与 44–46 行屏幕字内容重复','lines':[[44,49]],'src':'视听组'}],
 'directorItems':[
   {'id':'Q-D12','title':'「Mr. Elias」称呼是有意为之还是直译','default':'保留（剧作建议；观众体验注：与 DEC-LR-01「有意母题，保留」一致）','ref':'S04-D12／R08','lines':[[86,86],[103,103],[149,149],[173,173]]},
   {'id':'Q-D16','title':'回收者人数：三名回收者＋组长，与资产规则 D5②（默认 4–6）冲突','default':'待导演定（剧作不改）','ref':'S04-D16','lines':[[56,56]]},
   {'id':'Q-R06','title':'儿童臂在 S04 被收走，旧稿后场仍在使用','default':'待导演定（剧作不自行补救）','ref':'R06','lines':[[166,166]]},
   {'id':'Q-D08','title':'「别全拿走」想保的是哪一件（模块还是儿童臂）','default':'待剧作对照 S03 后再报','ref':'S04-D08','lines':[[107,107]]},
   {'id':'Q-AE03','title':'收束取舍：倒影峰值后保留比喻＋长拉升（世界尺度）还是短收束','default':None,'defaultNote':'默认推荐留空，待总监定','ref':'AE-LR-S04-03','lines':[[188,207]]},
   {'id':'Q-P0-1','title':'凝胶被踩碎（L184）而 S05 提交本仍用残管扶正凝胶：二选一','options':['保留 L184，S05 改用裂壳空管或其他物件（不改本场文学）','L184 改为「外壳裂开、还剩一点」（改文学）'],'default':'保留 L184，S05 改用裂壳空管或其他物件（不改本场文学）','ref':'剧本医生 P0-1（条件性跨场）','lines':[[184,185]]},
   {'id':'Q-DIR','title':'第0关方向 A／B／C 选哪一个','default':'A｜不改文学，只优化拍法（推荐）','ref':'③ 三个方向','lines':[]}],
 'backend':['跨场证据缺口：S03「Home. Now!」与提交本 L540 不一致，待核','跨场风险（合并 R06）：儿童臂 S04 被收走，提交本 S09 L985、S11 L1163 仍用儿童机械手','观众体验读者 P/Q/R 冷读卡仅留后台指针'],
 'notes':['剧作诊断写「0fae2b50 35 镜」，实际 ② 文件为 33 镜／125.0″——已在自测中标出，待剧作更正'],
 'chosen':None,
 'shootingOption':{'id':'A','title':'先信差点逃掉／他回头 → 再吃身份与协议锁','src':'总监_Scene04_三案简要 d2e192cf（拍法三案，导演已圈 A）','note':'这是此前的拍法定案，与本页「文学方向」不是一回事'}}
FF = {'G1': 'Elias is already running along the scrap path, screen-left, facing the exit between two steel frames; Noah about four meters behind him, screen-right rear, stepping around debris; a water curtain falls at frame left.', 'G2': 'Elias at the area before the exit, pulling Noah by the upper arm, looking back at the approaching scan light; red light starts falling from above.', 'G3': "Elias shields Noah behind him, one hand pressing the bag shut, under the drone's red beam; an aircraft begins descending toward a higher platform.", 'G4': "Elias down in the black water, left shoulder hurt, pushing on the ground with his right hand; the team leader stands over him; Noah among the reclaimers' boots.", 'G5': 'Elias still down in the water, hand on the ground but no longer pushing; Noah frozen in place with its chest panel lit; the team leader putting away his terminal.'}
# ---------------- groups ----------------
GROUPS = [
 dict(id='G1', name='组一', rng=(1,7), beat='快跑 · 四米落后 · 滑倒 · 半步停 · 折返', rhythm='快—急停—快（呼吸手持、短切）', bridge='计时器滴答与急促呼吸贯穿；末尾扫描光逼近声接组二结束提示',
      version={'current':'a1fe22f2','base':'0fae2b50','note':'组一现行 a1fe22f2（加厚版覆盖 0fae2b50 的 001–007；如 002 为环绕小推至近景）'},
      firstFrame={'desc':'伊莱亚斯已在废料堆通路快跑（画面偏左、朝出口），诺亚在其后约4m（画面右后），水帘在左','start':{'伊莱亚斯':'①通路中段·快跑·朝出口','诺亚':'①身后约4m·绕残片'},'walk':{'伊莱亚斯':['②停步看出口','③半步向出口又停','④折返到诺亚身边'],'诺亚':['②水坑滑倒','③被拉起']}},
      endState={'伊莱亚斯':'拉着诺亚往出口赶·回头看扫描光','诺亚':'被拉着站起·跟随','包':'背挎·满包','伤':'E1 无新伤','光':'红光边缘逼近'}),
 dict(id='G2', name='组二', rng=(8,14), beat='红光落地 · 双资产 · DELETED · 无武器 · 机械犬路过', rhythm='冷—停—稳（固定为主，制度冷忙）', bridge='引擎声从雨幕上方压近，接组三飞行器降落',
      version={'current':'0fae2b50','base':'0fae2b50','note':'②整组 0fae2b50'},
      firstFrame={'desc':'计时器结束提示；伊莱亚斯拉着诺亚在出口前，红光从高处落下','start':{'伊莱亚斯':'出口前·拉诺亚·回头看扫描光','诺亚':'被拉着站起·跟随'}},
      startState={'伊莱亚斯':'拉着诺亚往出口赶·回头看扫描光','诺亚':'被拉着站起·跟随','包':'背挎·满包','伤':'E1 无新伤','光':'红光边缘逼近'},
      endState={'伊莱亚斯':'护诺亚在身后·手压包口','诺亚':'被挡在身后','包':'背挎·满包','伤':'E1 无新伤','光':'红束停在两人身上'}),
 dict(id='G3', name='组三', rng=(15,20), beat='凯恩降临 · 七年权限 · 求留下 · 两棍落水 · 散落链', rhythm='压—慢—爆（先声后影，两记棍）', bridge='落水声与物件落地声接组四',
      version={'current':'0fae2b50','base':'0fae2b50','note':'②整组 0fae2b50'},
      firstFrame={'desc':'飞行器降向高台，气流吹雨成雾；伊莱亚斯护诺亚在身后','start':{'伊莱亚斯':'护诺亚在身后·手压包口','诺亚':'被挡在身后'}},
      startState={'伊莱亚斯':'护诺亚在身后·手压包口','诺亚':'被挡在身后','包':'背挎·满包','伤':'E1 无新伤','光':'红束停在两人身上'},
      endState={'伊莱亚斯':'跌坐黑水·左肩伤','诺亚':'在回收者靴间','包':'翻倒·物件散落','伤':'E2 左肩','光':'无人机红束悬停'}),
 dict(id='G4', name='组四', rng=(21,26), beat='Enough · CARE 锁 · 两次请求 · protocol · never yours', rhythm='静—停—冷（固定为主，停拍）', bridge='凯恩背对的最后一句接组五组长收终端',
      version={'current':'0fae2b50','base':'0fae2b50','note':'②整组 0fae2b50'},
      firstFrame={'desc':'伊莱亚斯跌在黑水里，右手撑地欲起；组长在旁','start':{'伊莱亚斯':'跌坐黑水·左肩伤','诺亚':'在回收者靴间'}},
      startState={'伊莱亚斯':'跌坐黑水·左肩伤','诺亚':'在回收者靴间','包':'翻倒·物件散落','伤':'E2 左肩','光':'无人机红束悬停'},
      endState={'伊莱亚斯':'撑在水里·不再使劲','诺亚':'CARE 锁·停在原地','包':'翻倒·模块与机械手已收走','伤':'E2 左肩','光':'大范围扫描光退去'}),
 dict(id='G5', name='组五', rng=(27,33), beat='放行 · 凝胶被踩 · 倒影扶起 · 升高拉开 · 机腹切黑', rhythm='松—停—远（倒影停拍后连续拉开）', bridge='引擎远去；雨声与底盘低鸣延续进下场',
      version={'current':'0fae2b50','base':'0fae2b50','note':'②整组 0fae2b50'},
      firstFrame={'desc':'组长收起终端；伊莱亚斯仍撑在水里，诺亚胸前限制提示亮着','start':{'伊莱亚斯':'撑在水里·不再使劲','诺亚':'CARE 锁·停在原地'}},
      startState={'伊莱亚斯':'撑在水里·不再使劲','诺亚':'CARE 锁·停在原地','包':'翻倒·模块与机械手已收走','伤':'E2 左肩','光':'大范围扫描光退去'},
      endState={'伊莱亚斯':'站在原地（缩小）','诺亚':'站在原地（缩小）','包':'诺亚手提','伤':'E2 左肩','光':'黑场'},
      chain=[30,31,32,33]),
]
GROUPS[0]['startState'] = {'伊莱亚斯':'废料堆快跑','诺亚':'身后约4m','包':'背挎·满包','伤':'E1 无新伤','光':'冷青逆光'}

EDITORIAL = {5:'声先于画（J-cut：水响先进）', 15:'先声后影（凯恩画外声先进）', 32:'032→033 连续，不切', 33:'切黑场；引擎声远去，雨声与底盘低鸣延续进 S05（声音桥）', 14:'引擎声 L-cut 进组三', 20:'落水声带入组四首镜'}
BGACT = {31: ['两名回收者走远','组长走向回收车','持棍者转入通道','机械犬穿构架'], 32: ['废料滑槽','机械臂抓放','施工机器人切割','运输机械过轨','废料倾落','无人机散开','装载飞行器驶过','凯恩飞行器升离'], 14: ['两名持枪者转向搜查','组长走近','无人机光束移动','引擎声压近'], 26:['凯恩拾模块','组长接','回收者抽机械臂','扫描光退去','凯恩走回']}

def eq_from_range(r): return r[0] if r[1]-r[0] <= 20 else (r[0]+r[1])//2
shots = []
for k in range(1, 34):
    src = G1shots.get('%03d' % k) if k <= 7 else None
    base = L2shots['%03d' % k]
    s_src = src or base
    pri, sec = map_move(s_src['move'])
    fr = focal_range(s_src['focal'])
    rawline = s_src['line'] if k > 7 else base['line']
    ds = place(k, s_src['line'] + ' ' + base['line'])
    # dedupe keeping order
    seen = set(); ds = [d for d in ds if not (d['id'] in seen or seen.add(d['id']))]
    t = 0.4 if k != 15 else 2.2  # C015：飞行器降、舱门开之后才出画外声
    dl = []
    for d in ds:
        dur = round(len(d['en'].split()) / SPEECH_WPS + 0.3, 1)
        dl.append({'ref': d['id'], 'en': d['en'], 'zh': d['zh'], 'speaker': d['speaker'], 'type': d['type'], 't0': round(t, 1), 't1': round(t+dur, 1), 'timing':'估算'})
        t += dur + 0.3
    cam = G1CAM.get(k, {})
    eq = cam.get('eq', eq_from_range(fr))
    shot = {
     'id': 'S04-C%03d' % k, 'n': k, 'lock': '草案', 'rev': 1,
     'src': 'a1fe22f2' if k <= 7 else '0fae2b50',
     'duration': s_src['dur'],
     'move': {'raw': s_src['move'], 'primary': pri, 'secondary': sec, 'segments': G1SEG.get(k, [{'t0':0,'t1':s_src['dur'],'move':pri,'note':s_src['move']}]),
              'owner':'视听'},
     'position': {'raw': s_src['pos'], 'size': cam.get('size'), 'height': cam.get('height'), 'angle': cam.get('angle'), 'distance': cam.get('distance'), 'yaw': cam.get('yaw'),
                  'inherit': not bool(cam), 'owner':'视听'},
     'focal': {'range': fr, 'eq': eq, 'eqOut': cam.get('eqOut'), 'inherit': False, 'owner':'视听（区间）/摄影（实际）'},
     'aperture': {'value': cam.get('aperture'), 'inherit': not bool(cam.get('aperture')), 'owner':'摄影'},
     'performance': {'raw': base['perf'] if k > 7 else src['inside'], 'goal': None, 'action': None, 'eyeline': None},
     'actionEn': EN[k],
     'dialogue': dl,
     'screenText': [{'en': e, 'host': SCREEN_HOST[k], 'line': DBY[e]['line'], 'post': True, 'track': k == 22} for e in SCREENS.get(k, [])],
     'sound': None,
     'assets': shot_assets(k),
     'bag': BAG[k], 'ground': GROUND[k],
     'literary': {'beat': 'B%02d' % k, 'lines': list(RANGES[k]), 'eventId': None},
     'editorial': EDITORIAL.get(k), 'bgActions': BGACT.get(k, []),
     'lighting': None, 'optics': None, 'rules': [], 'sketch': None,
    }
    if src:
        shot['g1'] = {'inside': src['inside'], 'outside': src['outside'], 'drama': src['drama'], 'intent': src['intent']}
    m = re.search(r'声：(.+?)）', base['line'])
    shot['sound'] = m.group(1) if m else ('台词' if dl else '雨声／底盘低鸣')
    # performance goal/action/eyeline (group 1 hand, others derived)
    PG = {1:('能不能带着诺亚和包一起跑掉','快跑穿过废料堆，肩息起伏','前方出口'),2:('确认还剩多少时间','抬腕看表→抬眼扫高台、轨道','表盘→高台→无人机'),3:('把人喊紧','回头喊','身后约4m的诺亚'),
          4:('再快一点','抹表盘雨水再看','表盘'),5:('—','猛回头、停步','诺亚'),6:('逃还是回','迈半步又停，身朝出口脸回诺亚，咬牙折返','出口→诺亚'),7:('带着它逃','拉起诺亚、回头看扫描光','扫描光')}
    if k in PG: shot['performance'].update(dict(zip(('goal','action','eyeline'), PG[k])))
    if k <= 7:
        L = dict(G1LIGHT[k]); L['inherit'] = '镜细化' if k in (2, 3, 6) else '组覆盖'
        if 'path' in L: L['l3path'] = L.pop('path')
        shot['lighting'] = L
    else:
        shot['lighting'] = {'inherit': '继承自场'}
        if k in L3PATH: shot['lighting'] = {'inherit':'镜细化','summary':{8:'红光从高处机械臂沿钢架落到地面和包身',10:'红光直射入镜，照住他的脸，眼镜雨水一片碎红',26:'远处大范围扫描光慢慢退去，头顶无人机还亮着'}[k],
                                            'key':'passing light' if k != 10 else 'monochrome red','keyZh':'过路光' if k != 10 else '单色红','sources':['L1','L3'],'keySource':'L3' if k == 10 else 'L1',
                                            'inFrame':['L3'],'l3path':L3PATH[k],'purpose':{8:'证据链变成罪证',10:'身份被钉死',26:'系统收工离开'}[k],'litLine':{8:38,10:51,26:169}[k],'jumpReason':'红光锁定（文学 L43/L50）' if k == 10 else None}
    if k <= 3: shot['optics'] = {'triggered': G1OPT[k], 'inherit': '镜细化'}
    shots.append(shot)
# sketches for C001–C003
for k in (1, 2, 3):
    shots[k-1]['sketch'] = {'in': 'assets/sketch/S04-C%03d_in.png' % k, 'out': 'assets/sketch/S04-C%03d_out.png' % k, 'status': '候选'}
# fixed shots only _in
for s in shots:
    s['fixed'] = s['move']['primary'] == '固定' and not s['move']['secondary']

groups = []
for g in GROUPS:
    a, b = g['rng']
    gg = {k: v for k, v in g.items() if k != 'rng'}
    gg['shots'] = ['S04-C%03d' % k for k in range(a, b+1)]
    gg['range'] = 'S04-C%03d–C%03d' % (a, b)
    gg['firstFrameEn'] = FF[g['id']]
    gg['lock'] = '草案'; gg['rev'] = 1
    gg['chain'] = ['S04-C%03d' % k for k in g.get('chain', [])]
    gg['lighting'] = {'inherit':'继承自场'} if g['id'] != 'G1' else {'inherit':'组覆盖','summary':'冷青逆光为主，红光只在 006 边缘预告','note':'组二才把红光打到人身上'}
    gg['acceptance'] = {'剧作':[{'k':'台词逐字与文学本一致','ok':False},{'k':'事件顺序未变','ok':False},{'k':'屏幕字（后期叠加）内容一致','ok':False}],
                        '资产':[{'k':'伤位与状态码一致（左肩 E2 自 C020 起）','ok':False},{'k':'道具在场/包内物件一致','ok':False},{'k':'人物外观与 REF 一致','ok':False}],
                        '视听':[{'k':'光向与鸟瞰图一致','ok':False},{'k':'动作节拍与秒数一致','ok':False},{'k':'轴线未翻转（伊侧）','ok':False}]}
    gg['clips'] = []
    gg['map'] = MAPG1 if g['id'] == 'G1' else None
    groups.append(gg)

scene = {
 'id':'S04','titleZh':'被扫描','titleEn':'SCANNED','header':'外景／锈线区，废料区出口附近／黑雨夜／连续',
 'characters':['伊莱亚斯','诺亚','凯恩','组长','回收者','无人机','机械犬'],
 'coreLine':'规矩反咬：他回头救诺亚，却把自己和它一起锁进系统；他写下的照护协议，反过来禁止诺亚救他。',
 'option':'A｜先信差点逃掉／他回头 → 再吃身份与协议锁','lock':'草案','rev':1,
 'window':{'min':110,'max':140,'center':125,'src':'总监_Scene04_三案简要 d2e192cf'},
 'transitions':{'in':'S03 Cam_24_85／A：第一次外面越线后，开画已在连续黑雨夜废料堆快跑；禁重拍出门/立线/越线','out':'暗色机腹横掠占满→切黑；引擎远去；雨声与城市底盘低鸣持续（交 S05）'},
 'inside':{'space':'锈线区废料区出口附近；两钢架间出口；水帘／狭窄通路；高台与运输轨道；扫描塔／无人机；废料坡；金属踏板（凯恩高）／水面低处；载人飞行器平台','light':'黑雨夜低调，冷青远光＋红色扫描光','weather':'黑雨比方才更密，持续敲铁皮','background':'系统持续作业：机械臂、运输机械、扫描塔、无人机；回收队分流搜查'},
 'outside':{'offscreen':'城市底盘低频；扫描塔转动；引擎声压近；凯恩画外声先于入画（C015）','audienceKnows':'他越了线、包里有不该拿的两件资产（VISTA 模块、儿童服务臂）'},
 'rules':['机位倾向伊侧，不越轴','场次三步：第二步建议整组（未定稿）','戏核硬锁：折返半步停；双资产扫描；DELETED CITIZEN；无武器放低；机械犬路过；七年权限；求留下→全收；两棍落水＋散落链；CARE 锁＋两次请求；protocol you wrote；never yours；放行；凝胶被踩；倒影扶起；升高拉开；机腹切黑','屏幕字一律后期叠加，提示词只要求空白发光屏','台词逐字来自文学本，不缩写不改写不拆句'],
 'pressure':[{'g':'G1','v':6},{'g':'G2','v':8},{'g':'G3','v':9},{'g':'G4','v':10},{'g':'G5','v':3}],
 'styleTags':[
   {'group':'导演语法','id':'T-D1','label':'冷制度压迫','status':'建议待导演定','expand':{'rhythm':'快→停→冷','cutDensity':'中（3–4.5″/镜）','movePref':'固定为主，逃段手持','focalRange':'35–70mm（球面等效）','lightRatio':'1:8','ct':'6000K 冷青＋红扫描'},
    'prompt':'cold procedural pressure: mostly locked frames once caught, handheld only while fleeing, restrained cutting'},
   {'group':'摄影风格','id':'T-C1','label':'雨夜逆光轮廓','status':'建议待导演定','expand':{'rhythm':'—','cutDensity':'—','movePref':'—','focalRange':'35–50mm','lightRatio':'1:8','ct':'6000K'},
    'prompt':'night rain, backlit wet silhouettes, faces mostly in shadow, volumetric rain'}],
 'lighting':SCENE_LIGHT,'lightSources':LIGHT_SOURCES,'lightEnum':[{'en':e,'zh':z} for e,z in zip(LIGHT_ENUM, LIGHT_ENUM_ZH)],
 'camera':{'format':{'value':'2.39:1 变形宽银幕','flag':'进提示词'},'medium':{'value':'大画幅数字','flag':'仅实拍参考'},'lensSeries':{'value':'复古变形定焦','flag':'仅实拍参考'},
   'focal':{'value':'35mm（球面等效）','flag':'进提示词'},'aperture':{'value':'T2.8','flag':'仅实拍参考'},'dof':{'value':'浅—中景深','flag':'进提示词'},
   'distance':{'value':'3m','flag':'进提示词'},'height':{'value':'1.5m','flag':'进提示词'},'perspective':{'value':'自然人眼透视，宽画幅分景深','flag':'进提示词'},'rig':{'value':'手持（逃段）/固定（被捕后）','flag':'进提示词'}},
 'optics':OPTICS,'rigEnum':[{'zh':a,'en':b,'plain':c} for a,b,c in RIGS],'filterEnum':[{'zh':a,'en':b,'plain':c} for a,b,c in FILTERS],'specialFx':SPECIAL_FX,'suppress':SUPPRESS,
 'toneRefs':[],
 'diagnosis':DIAG,
 'modelSpec':{'model':'Seedance 2.5','checked':'2026-09-27','src':'cinedance-higgsfield/references/seedance-2.5-compatibility.md','maxSegment':30,'textOnImageReadable':'未核实（研究助理首查项）'},
}
sources = {'literary':{'file':str(LIT.relative_to(P)),'sha8':sha8(LIT)},'list2':{'file':str(L2.relative_to(P)),'sha8':sha8(L2)},'g1':{'file':str(G1.relative_to(P)),'sha8':sha8(G1)},
           'shiting':{'file':str(SV.relative_to(P)),'sha8':sha8(SV),'note':'视听旁证版组一为 001–008／29.0″，与总监②（001–007／25.0″）不同；不自动合并，以总监② 0fae2b50＋组一 a1fe22f2 为现行'},
           'events':{'file':str(EVJ.relative_to(P)),'sha8':sha8(EVJ),'md':sha8(EVM)},'diagnosis':{'file':str(DGM.relative_to(P)),'sha8':sha8(DGM)},'doctor':{'file':str(DRM.relative_to(P)),'sha8':sha8(DRM)},'audience':{'file':str(AEM.relative_to(P)),'sha8':sha8(AEM),'note':'读者 P/Q/R 冷读卡只在后台留指针，不上前台'},
           'registry':{'file':str(REG.relative_to(P)),'sha8':sha8(REG),'note':'全部条目候选/待批'}}
shots[13]['warnings'] = [{'level':'红','type':'台词溢出','text':'本镜 3.5″；组长两句约 18 词，念完需 6–7″，同镜还有转身、走近、按耳机','fix':'拆成两镜（一镜一个说话人）或组内调秒；台词不动','src':'剧作 S04-D17'}]
shots[25]['warnings'] = [{'level':'红','type':'动作/台词过载','text':'本镜 5.0″ 装了 L160–174 共 15 行：拾模块、递交、Yes, Commander Mercer.、抽走儿童臂、It was never yours, Mr. Elias.、背身走开；L174 背对说称呼需单独留时间','fix':'拆成 2–3 镜（同组内吸收秒数）','src':'剧作 S04-D18'}]
for s_ in shots: s_.setdefault('warnings', [])
for _o in DIAG['options']:
    if '35' in _o.get('risk',''): _o['riskNote'] = '剧作原文写 35 镜；② 实际 33 镜，按同样拆法约为 35–36 镜（待剧作更正）'
for k in (6, 10, 19, 20, 22, 23, 24, 25, 30, 33): shots[k-1]['protect'] = True  # ②「勿砍」戏核镜
EV = json.loads(EVJ.read_text(encoding='utf-8'))
def evrange(t):
    m = re.match(r'L(\d+)(?:[–-](\d+))?', t); a1 = int(m.group(1)); return [a1, int(m.group(2)) if m.group(2) else a1]
events = []
for e in EV['events']:
    r = evrange(e['lines'])
    sh = ['S04-C%03d' % k for k, (a1, b1) in RANGES.items() if not (r[1] < a1 or r[0] > b1)]
    events.append({'id': e['id'], 'beat': e['beat'], 'beatName': EV['beats'][e['beat']], 'lines': r, 'type': e['type'], 'text': ' '.join(e['text']), 'shots': sh})
def ev_for_line(n):
    for e in events:
        if e['lines'][0] <= n <= e['lines'][1]: return e['id']
    return None
for s_ in shots:
    a1, b1 = s_['literary']['lines']
    s_['literary']['events'] = [e['id'] for e in events if not (e['lines'][1] < a1 or e['lines'][0] > b1)]
    L = s_.get('lighting') or {}
    if L.get('litLine'): L['eventId'] = ev_for_line(L['litLine'])
for L in LIGHT_SOURCES:
    if L.get('litLine'): L['eventId'] = ev_for_line(L['litLine'])
for fx in SPECIAL_FX: fx['eventId'] = ev_for_line(fx['line'])
for d in allD: d['eventId'] = ev_for_line(d['line'])
_ae = AEM.read_text(encoding='utf-8')
import hashlib as _hl
def _mk_sha(m):
    r = re.search(r'L(\d+)(?:[–-](\d+))?', m); a, b = int(r.group(1)), int(r.group(2) or r.group(1))
    return _hl.sha256('\n'.join(l['text'] for l in lit_lines[a-1:b]).encode('utf-8')).hexdigest()[:8]
scene['diagnosis']['mustKeepBase'] = {m: _mk_sha(m) for m in MUSTKEEP}
# 冷读条目的原文引文（CR：位置＋原文引文，缺一项删除）：逐字取文学本该范围第一行非空文本，不改写
def _quote(rngs):
    for r in rngs or []:
        a, b = (r if isinstance(r, (list, tuple)) else (r, r))
        for l in lit_lines[a-1:b]:
            t = (l.get('text') or '').strip()
            if t: return {'line': l.get('n', a), 'text': t[:60]}
    return None
for _it in [i for d in scene['diagnosis']['dims'] for i in d['items']] + scene['diagnosis'].get('merged', []):
    if '观众' in (_it.get('src') or '') or '冷读' in (_it.get('src') or ''): _it['quote'] = _quote(_it.get('lines'))
scene['diagnosis']['audienceMeta'] = {'simLabel': _ae.splitlines()[0].strip(), 'readers': sorted(set(re.findall(r'读者 ([A-Z])', _ae))), 'dropPoints': '放下点汇总' in _ae, 'src': '观众体验 ' + sha8(AEM)}
# 场次卡（story-to-screen 02_story ST02）：总监按剧作/医生/观众体验条目整理，逐项带行号；待剧作确认
scene['diagnosis']['sceneCard'] = {'label': '总监整理｜待剧作确认', 'items': [
  {'k': '进场状态', 'v': '已经在逃：越线之后、出口之前，诺亚落后四米', 'lines': [[13, 17]]},
  {'k': '即时目标', 'v': '伊莱亚斯要把诺亚和包里的两件零件带出出口', 'lines': [[13, 36]]},
  {'k': '策略', 'v': '跑 → 躲（挡板后）→ 解释与求情 → 沉默', 'lines': [[27, 31], [89, 113], [143, 159]]},
  {'k': '阻力', 'v': '倒计时、红色扫描、回收队围堵、凯恩的规程与权限', 'lines': [[37, 79], [86, 113]]},
  {'k': '触发改变的事件', 'v': '诺亚滑倒（折返）；凯恩点出「你写的协议」（沉默）', 'lines': [[24, 31], [148, 148]]},
  {'k': '出场状态', 'v': '模块与儿童机械手被收走、凝胶被踩裂、左肩伤；不再看出口，由诺亚扶着离开', 'lines': [[160, 187], [153, 153]]},
 ], 'cutTest': {'v': '删去本场：后场「协议」揭示、模块被收走、左肩伤与「孩子扶父亲」母题都失去起点', 'lines': [[148, 148], [160, 166], [119, 122], [184, 190]], 'refs': ['R02', 'R04', 'R07']}}
scene['continuityIssues'] = [
 {'id':'CI-01','title':'VISTA 模块：注册表 PR-03「锈线完整镜片」已被 S03 改为「模块」，PR-02 是伊莱亚斯的眼镜','lines':[[45,45],[160,165]],'groups':['G2','G3','G4','G5'],'tmp':'S04-TMP-PR-MODULE','options':['用临时码 S04-TMP-PR-MODULE，旧表 PR-03 只作候选映射，待资产改表','直接沿用 PR-03（会把旧「镜片」外形带进来）'],'proxy':'用临时码 S04-TMP-PR-MODULE，旧表 PR-03 只作候选映射，待资产改表','src':'剧作 R05＋注册表 d80e4674','status':'待导演确认'},
 {'id':'CI-02','title':'儿童机械手 PR-01：本场被凯恩抽走（L166），旧路线是漂走/捡回；提交本 S09 L985、S11 L1163 仍在用','lines':[[121,121],[166,166]],'groups':['G4','G5'],'options':['本场按新文学（被收走），后场由剧作同步','保留旧路线（需改本场文学）'],'proxy':'本场按新文学（被收走），后场由剧作同步','promptEn':"after the child's mechanical forearm is pulled from the bag it is gone; it never reappears in the bag.",'src':'剧作 R06＋剧本医生跨场','status':'待导演确认'},
 {'id':'CI-03','title':'凝胶 PR-05：旧表要求「可用、黑水不进」，本场 C028 被踩裂冲散（L182–185）','lines':[[182,185]],'groups':['G5'],'options':['按本场：C028 起 G1 踩裂，不带回旧状态','回到旧表状态（需改文学）'],'proxy':'按本场：C028 起 G1 踩裂，不带回旧状态','src':'剧本医生 P0-1','status':'待导演确认'},
 {'id':'CI-04','title':'机械犬 CH-05：注册表首现 S06-016，但新 S04 已出现（L62–64）','lines':[[62,64]],'groups':['G2'],'options':['按本场首现，资产表补 S04 出场','删本场机械犬（见方向 B 的成本项）'],'proxy':'按本场首现，资产表补 S04 出场','src':'注册表 d80e4674＋视听成本','status':'待导演确认'},
 {'id':'CI-05','title':'凯恩载人飞行器、扫描无人机（VE-02 是 S08 回忆机型）、组长个体、作业灯、水坑都无资产码','lines':[[22,22],[49,49],[78,80]],'groups':['G1','G2','G3','G4','G5'],'options':['用临时码 S04-TMP-*，资产补码后迁移','先不建码'],'proxy':'用临时码 S04-TMP-*，资产补码后迁移','src':'注册表 d80e4674','status':'待导演确认'},
 {'id':'CI-06','title':'S03「Home. Now!」与提交本 L540 不一致（跨场证据缺口）','lines':[[13,17]],'groups':[],'options':['待剧作核对，本场不改','—'],'proxy':'待剧作核对，本场不改','src':'剧本医生跨场','status':'待导演确认'},
]
# ACTING（表演五要素）：按组给每个出镜人物写目标/阻碍/代价/策略/节拍/潜台词/倾听/眼睛。全部是「设计建议」，不是原稿事实；节拍挂镜号，原文依据见对应镜的文学行号
_A = lambda **k: k
ACTING = {
 'G1': {'伊莱亚斯': _A(objective='把诺亚带出出口（让他跟上）', obstacle='倒计时快到、诺亚跟不上并滑倒；自己独逃的诱惑', stakes='被扫描就会被登记、带走', tactics=['催：回头喊', '算：看表、看出口', '弃：向出口迈半步', '回：折返拽起'], beats=[{'shot': 'S04-C003', 'v': '回头喊：语速变快，视线从表转到诺亚'}, {'shot': 'S04-C006', 'v': '半步停住：身体朝出口、脸转回诺亚'}, {'shot': 'S04-C007', 'v': '折返拽臂：话没说完已回看扫描光'}], subtext='「跟上」底下是「我差点丢下你」', listening='C005 水声先到：先定住，再回头（评估时刻）', eyes='在表、出口、诺亚之间短促跳动；C006 定住时停一拍不眨'),
        '诺亚': _A(objective='跟上伊莱亚斯，不让他回头等', obstacle='步子小、废料与黑水、滑倒', stakes='掉队被扫描', tactics=['绕：小心避开碎铁', '赶：加快步频', '撑：掌撑水底起身'], beats=[{'shot': 'S04-C003', 'v': '被喊后加快：步频变碎'}, {'shot': 'S04-C005', 'v': '滑倒：掌心在水底打滑'}, {'shot': 'S04-C007', 'v': '被拽：先站稳脚，再借力起'}], subtext='', listening='伊莱亚斯喊话时抬眼，句子没完已加快', eyes='多看脚下，被喊时抬眼找他')},
 'G2': {'伊莱亚斯': _A(objective='把诺亚藏住，找一条路离开', obstacle='红光锁定、无人机下降、组长带人围上', stakes='包里两件零件和诺亚被认定违规', tactics=['躲：拉到金属挡板后', '找：看出口、看侧坡', '护：挡在诺亚前、压紧包口'], beats=[{'shot': 'S04-C010', 'v': '躲光：转开脸，把诺亚拉半步到挡板后'}, {'shot': 'S04-C011', 'v': '听见脚步：视线从出口转到侧坡'}, {'shot': 'S04-C014', 'v': '被认定：一只手压紧包口，诺亚挡到身后'}], subtext='不说话：他在算还有没有路', listening='组长对讲时身体先绷住，没等说完已把诺亚往后挡', eyes='出口、组长、电磁棍、头顶无人机之间停不下来'),
        '诺亚': _A(objective='照伊莱亚斯说的贴紧他', obstacle='红光照到自己、被识别', stakes='被标成待复核', tactics=['贴：躲在他身后', '静：一动不动'], beats=[{'shot': 'S04-C010', 'v': '被拉到挡板后：身体缩小'}, {'shot': 'S04-C012', 'v': '光束扫过：停住呼吸般的静止'}], subtext='', listening='无人机播报时看伊莱亚斯而不是看光', eyes='看伊莱亚斯的手和脸'),
        '组长': _A(objective='把这两件资产登记、交上去', obstacle='雨大、目标躲在挡板后', stakes='（设计建议）延误上报会被追责', tactics=['派：指两人去搜', '报：按耳机上报'], beats=[{'shot': 'S04-C014', 'v': '看完终端再偏头派人'}], subtext='公事公办，没把他们当人', listening='无人机播报时已经低头看终端，不抬头', eyes='看终端多于看人'),
        '回收者': _A(objective='围住挡板后的目标，等组长下令', obstacle='雨大、挡板挡住视线', stakes='（设计建议）放跑目标要被追责', tactics=['围：随组长从侧坡扇形压上', '收：组长抬手后放低枪口、转身去搜'], beats=[{'shot': 'S04-C011', 'v': '从侧坡走进，长枪抬起压近'}, {'shot': 'S04-C014', 'v': '组长偏头后，两名持枪者转身搜附近废料堆'}], subtext='', listening='听组长手势行事，不看伊莱亚斯的脸', eyes='看枪口方向和组长的手', group=True)},
 'G3': {'伊莱亚斯': _A(objective='说服凯恩放他们走（至少别全拿走）', obstacle='许可过期七年、违规是事实、凯恩不看他', stakes='失去零件和诺亚', tactics=['解释：抢着说', '求：压低声音', '护：本能把包往回拽'], beats=[{'shot': 'S04-C017', 'v': '抢着解释：眼睛溜向出口'}, {'shot': 'S04-C018', 'v': '降声求情：把包拉到身侧'}, {'shot': 'S04-C019', 'v': '包带被抓：本能后拽'}, {'shot': 'S04-C020', 'v': '被击倒：左肩撞上废料'}], subtext='嘴上在解释，眼睛一直在找出口：他还想逃', listening='凯恩说话时就张嘴吸气，没等说完', eyes='在凯恩肩后和出口之间滑动'),
        '凯恩': _A(objective='按规程收走资产，不让伊莱亚斯讨价', obstacle='伊莱亚斯的求情', stakes='（无）', exceptions={'stakes': '例外（总监代拟｜待导演确认）：文学本没给他失败代价，不编身世；他把这件事当例行公事处理'}, tactics=['忙：边说边整理手套', '读：宣读条款', '不答：看作业区'], beats=[{'shot': 'S04-C016', 'v': '整理手套时开口'}, {'shot': 'S04-C018', 'v': '仍看作业区宣读'}], subtext='叫得出「伊莱亚斯先生」，却不承认旧关系', listening='求情时视线留在作业机械上：不回应是他刻意的选择', eyes='看作业区，不看伊莱亚斯'),
        '诺亚': _A(objective='留在伊莱亚斯身后，不被注意', obstacle='凯恩和组长都在近处，红光刚扫过', stakes='被识别、带走', tactics=['贴：留在他身后', '看：在他和凯恩之间来回看'], beats=[{'shot': 'S04-C017', 'v': '贴在他身后，只露出半边身体'}, {'shot': 'S04-C019', 'v': '电磁棍落下时肩膀一缩，没有迈步'}], subtext='', listening='凯恩说话时看伊莱亚斯的侧脸，不看凯恩', eyes='看伊莱亚斯的手和包'),
        '组长': _A(objective='执行收缴', obstacle='伊莱亚斯护包', stakes='（设计建议）任务拖延', tactics=['看：与伊莱亚斯目光相遇', '示意：让电磁棍动手'], beats=[{'shot': 'S04-C018', 'v': '与伊莱亚斯对视一下'}, {'shot': 'S04-C019', 'v': '移开视线，示意动手'}], subtext='有一瞬不忍，但还是下令', listening='凯恩宣读时等他说完才动', eyes='先对视，再移开'),
        '回收者': _A(objective='按组长示意收走包', obstacle='伊莱亚斯本能后拽', stakes='（设计建议）任务拖延', tactics=['抓：抓住包带', '打：电磁棍打护包的前臂'], beats=[{'shot': 'S04-C019', 'v': '持棍者抓包带，第一棍打在护包的前臂上'}], subtext='', listening='等组长示意才动手', eyes='看包和伊莱亚斯的手', group=True)},
 'G4': {'伊莱亚斯': _A(objective='爬起来，护住诺亚和包', obstacle='左肩伤、被围、诺亚被限制', stakes='失去模块和诺亚', tactics=['撑：右手撑地起身', '沉默：只看凯恩、不出声'], beats=[{'shot': 'S04-C021', 'v': '右手撑起，肩痛停一拍'}, {'shot': 'S04-C025', 'v': '不回头，嘴微张不出声'}], subtext='他听懂了「你写的协议」：沉默就是认', listening='凯恩那句话说到一半，他的手就停了', eyes='盯着凯恩，不看诺亚'),
        '诺亚': _A(objective='让凯恩解除限制，去扶伊莱亚斯', obstacle='限制锁住膝关节、凯恩不回答', stakes='看着伊莱亚斯倒在水里', tactics=['伸手迈步：被锁住，伸出的手不收', '按协议请求：第二次是同一说法，只加快语速'], beats=[{'shot': 'S04-C022', 'v': '迈步被锁：伸出的手停在半空'}, {'shot': 'S04-C023', 'v': '第一次请求'}, {'shot': 'S04-C025', 'v': '第二次请求：语速更快'}], subtext='用协议的话说「我想去扶他」', listening='凯恩说「你写的协议」时，眼睛在三人之间移动', eyes='在伊莱亚斯、组长、凯恩之间移动；伸出的手不收'),
        '凯恩': _A(objective='拿走模块，用一句话让伊莱亚斯认清', obstacle='诺亚的请求', stakes='（设计建议）规程不能破例', tactics=['不答', '看诺亚的关节与胸屏', '拿起模块递出', '收口：用原有的最后一句结束对话'], beats=[{'shot': 'S04-C024', 'v': '只在最后的称呼时向下扫一眼'}, {'shot': 'S04-C026', 'v': '弯腰拿模块，看标记，侧递'}], subtext='「它在按你写的协议」= 你自己造的规矩', listening='诺亚请求时才转头，不回答', eyes='看诺亚的关节，最后才看伊莱亚斯一眼'),
        '组长': _A(objective='接住模块、清点', obstacle='（无）', stakes='（设计建议）交差', exceptions={'obstacle': '例外（总监代拟｜待导演确认）：本组组长只是接物清点，低压力配角，无阻碍是设计'}, tactics=['接：立刻接过收好', '点：查下一件'], beats=[{'shot': 'S04-C026', 'v': '接模块、收好、查下一件'}], subtext='「是，指挥官」答得太快：不想再看地上的人', listening='凯恩递来就接，不等说话', eyes='看物件不看人'),
        '回收者': _A(objective='清点、收走包里的零件', obstacle='（无）', stakes='（设计建议）交差', exceptions={'obstacle': '例外（总监代拟｜待导演确认）：伊莱亚斯已倒地，执行者只是清点，无阻碍是设计'}, tactics=['进：持棍者上前半步，被组长抬手止住', '取：另一名蹲下抽出机械前臂'], beats=[{'shot': 'S04-C021', 'v': '持棍者上前半步，组长抬手后停住'}, {'shot': 'S04-C026', 'v': '另一名蹲下，握住露出的腕关节把机械前臂抽出'}], subtext='', listening='组长抬手就停，不看凯恩', eyes='看地上的物件', group=True)},
 'G5': {'伊莱亚斯': _A(objective='站起来，跟诺亚离开', obstacle='左肩伤；模块已被收走（凝胶要到第二镜才被踩碎，开场时他还不知道）', stakes='（设计建议）连回去的理由都少了一件', tactics=['借力：扶着诺亚站起', '不再看出口'], beats=[{'shot': 'S04-C029', 'v': '借诺亚的力站起，肩痛停一下'}, {'shot': 'S04-C030', 'v': '倒影里两个人慢慢直起来'}], subtext='从想逃到不再逃（剧作 S04-D03）', listening='组长下放行令时视线一直停在地上的东西上，评估一拍后才动', eyes='看地上的东西，不看出口'),
        '诺亚': _A(objective='把伊莱亚斯扶起来带走', obstacle='他站不稳', stakes='（设计建议）他再倒下', tactics=['拾：捡起工具包', '扶：托住他的右臂'], beats=[{'shot': 'S04-C029', 'v': '捡包，弯腰托右臂'}, {'shot': 'S04-C030', 'v': '倒影里小的那个抬头'}], subtext='', listening='限制一解除就动，不等吩咐', eyes='抬头看他的脸'),
        '组长': _A(objective='收队', obstacle='（无）', stakes='（设计建议）无', exceptions={'obstacle': '例外（总监代拟｜待导演确认）：放行是本组的结果，组长无阻碍', 'stakes': '例外（总监代拟｜待导演确认）：对组长没有失败代价，放行只是收尾'}, tactics=['收：收起终端', '放：看一眼两人后放行'], beats=[{'shot': 'S04-C027', 'v': '收终端，看一眼两人，放行'}], subtext='放行是他唯一能给的东西', listening='', eyes='先看伊莱亚斯，再看诺亚'),
        '回收者': _A(objective='收队离开', obstacle='（无）', stakes='（无）', exceptions={'obstacle': '例外（总监代拟｜待导演确认）：收队是本组结果，执行者无阻碍', 'stakes': '例外（总监代拟｜待导演确认）：对执行者没有失败代价'}, tactics=['解：解除诺亚的限制', '走：离场时踩过布包不停步'], beats=[{'shot': 'S04-C027', 'v': '解除限制'}, {'shot': 'S04-C028', 'v': '离场时一只靴子踩上湿布包，不停步'}], subtext='', listening='组长说放行时已经转身收队，不等他说完', eyes='看前方的路，不看地上', group=True)},
}
for g in groups:
    if g['id'] in ACTING: g['acting'] = {'label': '设计建议（ACTING）｜总监代拟｜待导演确认', 'chars': ACTING[g['id']], 'src': 'acting/references/original.md §2–§3、§14'}
data = {'schema':'workbench-S04/0.1（一次性试验品）','built':datetime.datetime.now().strftime('%Y-%m-%d %H:%M (UTC+8)'),'sources':sources,'scene':scene,
        'literary':{'sha8':sha8(LIT),'readOnly':True,'lines':lit_lines,'beats':[{'id':k,'name':v} for k,v in EV['beats'].items()],'events':events,'eventSrc':{'json':sha8(EVJ),'md':sha8(EVM)},'shotAnchors':beats,'dialogue':allD,'motifs':['计时器/时限','红色扫描光','包（证据链）','四米距离','倒影：孩子扶父亲','「伊莱亚斯先生」称呼','左肩伤']},
        'groups':groups,'shots':shots,'registryNames':REGNAME}
(W/'data').mkdir(exist_ok=True)
js = json.dumps(data, ensure_ascii=False, indent=1)
(W/'data/S04.json').write_text(js, encoding='utf-8')
(W/'data/S04.js').write_text('// 自动生成，勿手改；源 = data/S04.json\nwindow.S04_DATA = ' + js + ';\n', encoding='utf-8')
print('shots', len(shots), 'total', sum(s['duration'] for s in shots), 'dialogue', len(allD))
for g in groups: print(g['id'], sum(s['duration'] for s in shots if s['id'] in g['shots']))
