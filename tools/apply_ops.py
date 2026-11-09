#!/usr/bin/env python3
"""执行工作台导出的文件操作队列（浏览器不能挪文件）。
用法：python3 tools/apply_ops.py S04_ops.json [--dry-run]
- 先整体预检（源存在、目标不存在、都在 workbench/ 内），任何一项不过 → 一个文件都不动，退出码 1
- move：候选 → 正式 REF 路径（去掉 _cX）；落选 → <ID>/_候选存档/
- 落地后同步写 assets/REF/ref_index.json 与页面实际加载的 data/ref_index.js（两份一致）
  新条目：status「待批」、fileState「已落地 <时间>」、sha8 取真实文件；源缺失的条目不写入索引
只在 workbench/ 内操作；目标已存在时不覆盖。"""
import json, sys, shutil, hashlib, pathlib, datetime
W = pathlib.Path(__file__).resolve().parent.parent
def inside(p):
    p = (W / p).resolve(); assert str(p).startswith(str(W) + '/'), f'越界路径：{p}'; return p
def sha8(f): return hashlib.sha256(f.read_bytes()).hexdigest()[:8]
def main():
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    dry = '--dry-run' in sys.argv; ops = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
    plan, errs = [], []
    for o in ops.get('ops', []):
        src, dst = inside(o['from']), inside(o['to'])
        if o['to'].endswith('/'): dst = dst / src.name
        if not src.exists(): errs.append(f'源不存在：{src.relative_to(W)}')
        elif dst.exists(): errs.append(f'目标已存在（不覆盖）：{dst.relative_to(W)}')
        else: plan.append((src, dst))
    if errs: print('预检失败，未做任何改动：\n  ' + '\n  '.join(errs)); sys.exit(1)
    for src, dst in plan:
        print(('[预演] ' if dry else '') + f'move {src.relative_to(W)} → {dst.relative_to(W)}')
        if not dry: dst.parent.mkdir(parents=True, exist_ok=True); shutil.move(str(src), str(dst))
    idx_p = W / 'assets/REF/ref_index.json'; idx = json.loads(idx_p.read_text(encoding='utf-8'))
    keys = {e['key'] for e in idx['entries']}; now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M (UTC+8)')
    for e in ops.get('refIndex', {}).get('entries', []):
        if e.get('kind') != 'REF' or e['key'] in keys: continue
        f = W / e['file']
        if not dry and not f.exists(): print('不写索引（文件不存在）', e['key']); continue
        e['sha8'] = sha8(f) if f.exists() else '（预演）'; e['status'] = '待批'; e['fileState'] = '已落地 ' + now
        idx['entries'].append(e); print(('[预演] ' if dry else '') + '索引新增', e['key'], e['sha8'])
    if dry: return
    txt = json.dumps(idx, ensure_ascii=False, indent=1)
    idx_p.write_text(txt, encoding='utf-8')
    (W / 'data/ref_index.js').write_text('window.REF_INDEX = ' + json.dumps(idx, ensure_ascii=False) + ';\n', encoding='utf-8')
    print('已同步 assets/REF/ref_index.json 与 data/ref_index.js；浏览器刷新后生效（若本地缓存旧索引，到后台点「重置」）')
if __name__ == '__main__': main()
