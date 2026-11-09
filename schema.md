# S04 工作台数据结构（schema v1）｜一次性试验品

唯一事实源：`data/S04.json`（由 `tools/build_data.py` 从权威文件生成，勿手改）。`data/S04.js` 是同内容的 `window.S04_DATA` 包装，只为 file:// 能直接加载（file:// 下 fetch 不可用）。REF 索引：`assets/REF/ref_index.json` ↔ `data/ref_index.js`（`window.REF_INDEX`）。

浏览器里的改动只存在 localStorage（键 `lr-s04-workbench`，以 `built` 校验，数据重建后旧缓存自动作废）与「导出 JSON」中；不回写任何权威文件。

## 顶层
| 字段 | 说明 |
|---|---|
| schema / built | 版本号、生成时间 |
| sources.{literary,list2,g1,shiting,events,diagnosis,doctor,audience,registry} | 来源文件路径 + sha8（文学 9fbf6cfa、② 0fae2b50、组一现行 a1fe22f2、视听 cc1c1b2c（冲突，不合并）、事件表 bf624aee/e3f9b4bf、诊断 652df4cb、医生 b11e4ed0、冷读 0fa1ca81、注册表 d80e4674） |
| scene | 场级：窗口 {min 110,max 140,center 125}、转场、内/外信息、规则、风格标签、灯光、光源、光型枚举(34)、机位默认值、光学包、器材/滤镜/特效枚举、诊断（第0关）、模型规格 |
| literary | 只读文学层：lines[{n,text}]、beats、events（E001–E152，来自剧作事件表，不自造）、dialogue[{id D01…,speaker,en,zh,line,type 对白/画外/机器播报/屏幕字,eventId}]、motifs |
| groups[] | 组（≤30″ 的生成段） |
| shots[] | 镜 |
| registryNames | 资产码 → 中文名 |

## 组 group
`id G1–G5, name, beat, rhythm, bridge, shots[], chain[]`（不可切链，如 G5=[030–033]）、`version{current,base,note}`、`firstFrame / firstFrameEn`（英文首帧）、`startState / endState`（边界检查：上组 endState 必须 = 本组 startState，否则不能锁组）、`firstFrameRef`（运行时：上组末镜 _out 草图；上组片段三方验收后换成实际尾帧）、`lighting{inherit 组覆盖, summary}`、`acceptance{剧作[],资产[],视听[]}`、`clips[]`（登记即「候选」；三方通过才「已批」；重生成 → 下一组首帧 REF「过期」不可复制、片段「需复核」）、`map`（SC-03-MAP-S04-G1：base/annot/notext + 叠加坐标）、`lock`、`fieldLocks`。

## 镜 shot
| 字段 | 说明 | 负责 |
|---|---|---|
| id S04-C001…, n, src | 来源 sha8 | |
| duration | 秒，0.1 精度；组内吸收时最小 1.0 | 视听/剪辑 |
| protect | ②「勿砍」戏核镜：组内吸收优先压别的镜 | |
| move{raw,primary,secondary,segments[{t0,t1,move,note}]} | 运镜枚举 WB.MOVES；复合运镜分段 | 视听 |
| position{raw,size,height,angle,distance,yaw} | yaw=机位朝向（鸟瞰坐标角度），用于光向计算 | 视听 |
| focal{range,eq,eqOut} | **存球面等效 mm**；界面显示实际焦距 = eq × 2（变形） | 视听（区间）/摄影（实际） |
| aperture{value} | T 档 | 摄影 |
| performance{raw,goal,action,eyeline} | 表演 | |
| actionEn | 英文动作草稿（视听草稿，非台词） | |
| dialogue[{ref,en,zh,speaker,type,t0,t1,timing 估算}] | en 必须逐字等于文学本 `lines[line-1]`；时点按 2.8 词/秒估算，超出镜长报红，不自动删改 | 剧作 |
| screenText[{en,host,line,post:true,track}] | 屏幕字一律后期叠加；提示词只写「空白发光屏」 | |
| sound, editorial | editorial = 剪辑完成项，不进提示词 | 剪辑 |
| assets[{id|null,name,state,view,inFrame,note}] | REF；id=null 为「待补码」 | 资产 |
| bag[], ground[] | 包内/地上物件（连贯检查） | 美术 |
| literary{beat,lines[a,b],events[]} | 对应文学行与事件 ID | |
| bgActions[] | >3 标风险 | |
| lighting | 见下；未写 = 继承自场 | 摄影 |
| optics{triggered[{k,v,trig}]} | 派生光学特性，只列已触发项 | 摄影 |
| rules[{notInFrame}] | 白话改加的规则 | |
| sketch{in,out,status} | 固定镜只有 _in | |
| warnings[] | 剧作给的红色警告（014、026 台词溢出等），只提示不自动改 | |
| lock 草案/锁定, fieldLocks{duration,focal,…}, rev | 整镜锁/字段锁 | 导演 |

### 灯光 lighting（场 → 组 → 镜继承）
`summary`（一句话）、`key/keyZh`、`keyOut`（镜内变化）、`fill`、`purpose` + `eventId`（挂剧作事件）、`sources[L1…]`、`keySource`、`ratio`、`ct`、`quality 硬/柔`、`behavior 固定/闪烁/扫动`、`flicker[秒]`、`l3path[{t,pos,posEn,onFace}]`、`practical`（实用光源资产码）、`medium`、`origin 文学本原文/视听设计`、`litLine`、`flag 进提示词/仅实拍参考`、`jumpReason`、`inherit 继承自场/组覆盖/镜细化`。光源 `scene.lightSources[{id,name,en,asset,az,elev,type,behavior,origin,map}]`，az 与鸟瞰图一致。

检查（`WB.lightChecks`）：rel = az − yaw；|rel|<60 逆光、>120 顺光、其余侧光。声明逆光/轮廓但实为顺光 → 红；主光源变化且无 jumpReason、或侧光左右翻转而机位未反打 → 光向跳（树节点黄点）。

## 第0关 scene.diagnosis
`summary, viewerEffect, dims[{k,items[{id,where,text,level,lines,src}]}], merged[]`（AE-01+视听 8″+剧作 014；AE-02+机械犬成本；协议卡）、`options[A,B,C]{title,literaryChange,permission,changes,keeps,mustKeep,risk,secText,recommended,patch,evidence,shootingNotes,avPoints,src}`、`risks R01–R09, costNotes, directorItems[{id,title,options,default,lines}], backend[], notes[], chosen{id DEC-…,option,sha8,by,proxy,time}`。未选方向时其他页面不可用；文学改动只在选定后以 `literaryDiff` 记录，权威文件不动。

## 运行态（localStorage / 导出 JSON）
`log[{id CH-0001,time,who,text,scope,target,variable,before,after,status,sha8After,invalidates,touched}]`、`proposals[]`（锁定项黄色提议 / 需剧作导演确认）、`ack{角色:rev}`（冲突检测：对方改了同一镜同一变量而你没看过 → 冲突对照，不静默覆盖）、`decisions{}`（含总监代选 proxy:true）、`approvals{}`、`picks{}` 与 `ops[]`（文件操作队列，`tools/apply_ops.py` 执行）、`copies[]`。

## 状态色（只有三种）
绿 = 已批/锁定/已应用；黄 = 草案/候选/待批/提议/总监代选；红 = 缺/冲突/需确认/超限/过期。另有「导演定稿模式」隐藏过程信息。

## 命名
草图 `assets/sketch/S04-C00N_in.png / _out.png`（固定镜只有 _in）；黑条下载版 `…_黑条下载版.png`（PIL 烧录，页面上的黑条是 HTML 叠加）；鸟瞰 `assets/map/SC-03-MAP-S04-G1_{base,annot,notext}.png`；REF `assets/REF/<ID>/<ID>_<状态>_<视角>_v01_cA.png` → 选定后去 `_cX`，落选进 `<ID>/_候选存档/`；实际尾帧 `assets/clips/S04-G1_out_actual_v01.png`。
