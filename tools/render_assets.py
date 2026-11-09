#!/usr/bin/env python3
"""切分分镜草图、叠加鸟瞰标注（带字版/去字版）、烧黑条下载版。图像模型只出底图，所有文字与标记由数据画。"""
import json, math, hashlib, pathlib, datetime
from PIL import Image, ImageDraw, ImageFont
W = pathlib.Path(__file__).resolve().parents[1]
D = json.loads((W/'data/S04.json').read_text(encoding='utf-8'))
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
try: ImageFont.truetype(FONT, 14)
except Exception: FONT = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
f = lambda n: ImageFont.truetype(FONT, n)
raw = W/'assets/raw'
def crop4(src, names):
    im = Image.open(src).convert('RGB'); w, h = im.size; m = 6
    boxes = [(m, m, w//2-m, h//2-m), (w//2+m, m, w-m, h//2-m), (m, h//2+m, w//2-m, h-m), (w//2+m, h//2+m, w-m, h-m)]
    for b, n in zip(boxes, names):
        if n: im.crop(b).resize((768, 432)).save(n)
(W/'assets/sketch').mkdir(parents=True, exist_ok=True)
crop4(raw/'S04_G1_sketch_sheetA.jpg', [W/'assets/sketch/S04-C001_in.png', W/'assets/sketch/S04-C001_out.png', W/'assets/sketch/S04-C002_in.png', W/'assets/sketch/S04-C002_out.png'])
cand = W/'assets/REF/_待补码_凯恩载人飞行器'; cand.mkdir(parents=True, exist_ok=True)
crop4(raw/'S04_G1_sketch_sheetB.jpg', [W/'assets/sketch/S04-C003_in.png', W/'assets/sketch/S04-C003_out.png', cand/'TMP-VE-CMDCRAFT_降落-舱门_外观_v01_cA.png', cand/'TMP-VE-CMDCRAFT_降落-舱门_外观_v01_cB.png'])
# ---- map ----
g1 = D['groups'][0]; M = g1['map']
base = Image.open(raw/'SC-03-MAP-S04-G1_base.jpg').convert('RGB').resize(tuple(M['size']))
(W/'assets/map').mkdir(parents=True, exist_ok=True)
base.save(W/M['base'])
def arrow(d, a, b, col, wdt=3, dashed=False):
    if dashed:
        n = 12
        for i in range(0, n, 2):
            p = [a[0]+(b[0]-a[0])*i/n, a[1]+(b[1]-a[1])*i/n]; q = [a[0]+(b[0]-a[0])*(i+1)/n, a[1]+(b[1]-a[1])*(i+1)/n]
            d.line([tuple(p), tuple(q)], fill=col, width=wdt)
    else: d.line([tuple(a), tuple(b)], fill=col, width=wdt)
    ang = math.atan2(b[1]-a[1], b[0]-a[0])
    for s in (2.6, -2.6):
        d.line([tuple(b), (b[0]+14*math.cos(ang+s), b[1]+14*math.sin(ang+s))], fill=col, width=wdt)
def draw_map(text):
    im = base.copy(); d = ImageDraw.Draw(im, 'RGBA')
    ax = M['axis']; arrow(d, ax['a'], ax['b'], (255,255,255,140), 1, True)
    for L in M['lights']:
        col = L['color']
        if L.get('point'):
            x, y = L['from']
            for r in (26, 18, 10): d.ellipse([x-r, y-r, x+r, y+r], outline=col, width=2)
        else: arrow(d, L['from'], L['to'], col, 4, L.get('dashed', False))
        if text: d.text((L['from'][0]-150 if L['from'][0] > 800 else L['from'][0]-60, L['from'][1]+6 if L['from'][0] > 800 else L['from'][1]-48), L['label'], font=f(15), fill=col)
    for P in M['people']:
        pts = P['points']
        for a, b in zip(pts, pts[1:]): arrow(d, a['xy'], b['xy'], P['color'], 2, True)
        for p in pts:
            x, y = p['xy']; d.ellipse([x-9, y-9, x+9, y+9], fill=P['color'], outline='black')
            a = math.radians(p['face']); arrow(d, (x, y), (x+26*math.cos(a), y+26*math.sin(a)), P['color'], 3)
            if text: d.text(((x+11) if P['who']=='伊莱亚斯' else (x-150), y-22 if P['who']=='伊莱亚斯' else y-8+ (p['n']-2)*14), ('伊' if P['who']=='伊莱亚斯' else '诺') + '①②③④'[p['n']-1] + (' '+p['note'] if p.get('note') else ''), font=f(14), fill='white', stroke_width=2, stroke_fill='black')
    for c in M['cameras']:
        x, y = c['xy']; a = math.radians(c['dir'])
        tri = [(x+16*math.cos(a), y+16*math.sin(a)), (x+12*math.cos(a+2.4), y+12*math.sin(a+2.4)), (x+12*math.cos(a-2.4), y+12*math.sin(a-2.4))]
        d.polygon(tri, fill=(255,255,255,230), outline='black')
        if text: d.text((x+10, y+6), c['shot'], font=f(13), fill='#ffe066', stroke_width=2, stroke_fill='black')
    for dd in M['distances']:
        if text:
            mx = (dd['a'][0]+dd['b'][0])/2; my = (dd['a'][1]+dd['b'][1])/2; d.text((mx-40, my-6), dd['label'], font=f(14), fill='white', stroke_width=2, stroke_fill='black')
    if text:
        for p in M['props']: d.text(tuple(p['xy']), '— '+p['code'], font=f(12), fill='#cfd8dc', stroke_width=2, stroke_fill='black')
        d.rectangle([0, 0, 1024, 26], fill=(0,0,0,170)); d.text((8, 4), M['code']+'｜组一 C001–C007｜候选｜标注由数据叠加，底图为模型灰白体块', font=f(14), fill='white')
    return im
draw_map(True).save(W/M['annot']); draw_map(False).save(W/M['notext'])
# ---- burned black bar (download version) ----
S = {s['id']: s for s in D['shots']}
def bar_text(s, frame):
    p = s['position']; dl = ' / '.join(f"{x['t0']:.1f}″ \"{x['en']}\"" for x in s['dialogue']) or '无台词'
    eq = s['focal']['eq'] if frame == 'in' or not s['focal'].get('eqOut') else s['focal']['eqOut']
    return [f"{s['id']}_{frame}｜{s['duration']}″｜{s['move']['primary']}{('+'+s['move']['secondary']) if s['move']['secondary'] else ''}｜2.39:1",
            f"台词：{dl}",
            f"机高 {p.get('height') or '继承'}m｜机距 {p.get('distance') or '继承'}m｜焦段 {eq}mm(球面等效)｜光圈 {s['aperture']['value'] or '继承'}"]
for k in ('S04-C001', 'S04-C002', 'S04-C003'):
    for fr in ('in', 'out'):
        src = W/f'assets/sketch/{k}_{fr}.png'; im = Image.open(src)
        out = Image.new('RGB', (im.width, im.height+86), 'black'); out.paste(im, (0, 0)); d = ImageDraw.Draw(out)
        for i, t in enumerate(bar_text(S[k], fr)): d.text((10, im.height+6+i*26), t, font=f(16), fill='white')
        out.save(W/f'assets/sketch/{k}_{fr}_黑条下载版.png')
# ---- ref index ----
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()[:8]
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
idx = {'note':'项目内未找到既有 ref_index.json；本文件为工作台首建。资产注册表 v0.5 全部条目为候选/待批、项目内无任何已批 REF 图，因此 已批=0。',
       'built': now, 'entries': []}
for k in ('S04-C001', 'S04-C002', 'S04-C003'):
    for fr in ('in', 'out'):
        p = W/f'assets/sketch/{k}_{fr}.png'
        idx['entries'].append({'key': f'{k}_{fr}', 'kind': '分镜草图', 'file': str(p.relative_to(W)), 'status': '候选', 'sha8': sha(p), 'source': '图像模型（草图）', 'picker': None, 'time': now})
for v in ('annot', 'notext'):
    p = W/M[v]; idx['entries'].append({'key': M['code']+('' if v == 'annot' else '_notext'), 'kind': '鸟瞰走位图', 'file': str(p.relative_to(W)), 'status': '候选', 'sha8': sha(p), 'source': '图像模型底图＋数据叠加', 'picker': None, 'time': now})
for c in ('cA', 'cB'):
    p = cand/f'TMP-VE-CMDCRAFT_降落-舱门_外观_v01_{c}.png'
    idx['entries'].append({'key': f'TMP-VE-CMDCRAFT@降落/舱门@外观#{c}', 'id': None, 'gapName': '凯恩载人飞行器', 'state': '降落/舱门', 'view': '外观', 'kind': '缺资产候选', 'file': str(p.relative_to(W)), 'status': '候选', 'sha8': sha(p), 'source': '图像模型（概念草图）', 'picker': None, 'time': now})
js = json.dumps(idx, ensure_ascii=False, indent=1)
(W/'assets/REF/ref_index.json').write_text(js, encoding='utf-8')
(W/'data/ref_index.js').write_text('// 自动生成；源 = assets/REF/ref_index.json\nwindow.REF_INDEX = ' + js + ';\n', encoding='utf-8')
print('ok', len(idx['entries']))
