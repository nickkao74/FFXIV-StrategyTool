# -*- coding: utf-8 -*-
"""由 data/uwu.js 產出校對版 data/uwu-lab.js。

資料優先序(依使用者指示):
  1. 攻略逐字稿 / 影片截圖  _OriginalReferences/UWU/
  2. 灰機 wiki               _OriginalReferences/UWU/huijiwiki.md
  3. 繁中隊伍簡報            _OriginalReferences/UWU/究極武器絕境戰 火神篇.pdf
  4. BossMod Reborn          _OriginalReferences/BossmodReborn/.../Ultimate/UWU/

BossMod 只用來「調整」既有圖解的尺寸,不用來推翻前三者的機制描述。
逐項比對與判斷理由見 ../07-UWU-P1對照.md 與 ../08-UWU-P2對照.md。

用法:py "_Planning/BossMod逆向解析/tools/rebuild-uwu.py"
⚠ 要改文字請改 data/uwu.js;要改幾何請改這支腳本。

備註:本機沒有安裝 Node,原本的 rebuild-uwu.js 已移植為這支 Python 版本。
"""
import io
import json
import math
import os
import sys

# Windows 主控台預設 cp950,直接印 ⚠ 之類的字元會炸;統一改成 UTF-8 輸出。
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

# ── 讀入 data/uwu.js(內容是一段 JSON 賦值)────────────────
src = io.open(os.path.join(ROOT, 'data', 'uwu.js'), encoding='utf-8').read()
start = src.index('{', src.index("window.RAID_DATA['uwu']"))
d = json.loads(src[start:src.rstrip().rfind('}') + 1])

# UWU 場地:ArenaCenter (100,100)、Polygon(center, 20, 64) → 半徑 20m
K = 5  # 1m = 5 單位


def y(v):
    """公尺 → 沙盤單位。整數就輸出整數,讓產生的檔案乾淨一點。"""
    r = round(v * K, 2)
    return int(r) if r == int(r) else r


d['id'] = 'uwu-lab'
d['name'] = '絕神兵零式(UWU) 究極神兵破壞作戰(校對版)'

log = []


def note(what):
    log.append(what)


def sec(sid):
    return next(s for s in d['sections'] if s['id'] == sid)


def steps(sid):
    return sec(sid)['steps']


def add_ann(step, ann):
    step.setdefault('annotations', []).append(ann)


def unit(deg):
    """沙盤角度(0=北,順時針)→ 單位向量。"""
    rad = math.radians(deg - 90)
    return (math.cos(rad), math.sin(rad))


def charge(pos, angle, front, back, half, color='fire'):
    """深紅旋風主衝:AOEShapeRect(49, 9, 5),原點在施法者身上。"""
    return {'type': 'rect', 'at': list(pos), 'angle': angle,
            'lengthFront': front, 'lengthBack': back, 'halfWidth': half, 'color': color}


def cross_pair(base_angle, color='thunder'):
    """本體追加的正交衝鋒 CrimsonCycloneCross:
    AOEShapeRect(44.5, 5, 0.5),位置 = 場地中心 - 19.5m * 方向,方向 = 主衝 ±45°。
    本體在正點 → 兩道落在斜線(X 字);在斜點 → 落在正線(十字)。"""
    out = []
    for a in (base_angle + 45, base_angle - 45):
        ux, uy = unit(a % 360)
        out.append(charge([round(-y(19.5) * ux, 1), round(-y(19.5) * uy, 1)],
                          round(a % 360, 1), y(44.5), y(0.5), y(5), color))
    return out


# ═══════════════════════════════════════════════════════════
# P1 迦樓羅
# ═══════════════════════════════════════════════════════════
# 對照表:
#   Slipstream      AOEShapeCone(11.7, 45°)   螺旋氣流
#   Downburst       AOEShapeCone(11.7, 45°)   下行突風
#   EyeOfTheStorm   AOEShapeDonut(12, 25)     台風眼
#   FeatherRain     AOEShapeCircle(3)         飛翎雨
#   GreatWhirlwind  AOEShapeCircle(8)         大龍捲風
#   WickedWheel     AOEShapeCircle(8.7)       邪輪旋風(本體)
#   WickedWheelSis  AOEShapeCircle(8.36)      邪輪旋風(分身)
#   WickedTornado   AOEShapeDonut(7, 20)      邪氣龍捲
#   Mesohigh        circle r=3                中高壓
#   SpinyShield     circle r=6                高氣壓穹頂
R = {
    'slipstream': y(11.7),   # 58.5
    'downburst': y(11.7),    # 58.5
    'eyeInner': y(12), 'eyeOuter': y(25),
    'feather': y(3),         # 15
    'whirlwind': y(8),       # 40
    'wheel': y(8.7),         # 43.5
    'wheelSister': y(8.36),  # 41.8
    'tornadoIn': y(7), 'tornadoOut': y(20),
    'meso': y(3),            # 15
    'dome': y(6),            # 30
    'friction': y(5),        # 25 ← ⚠ 僅 AID 註解,BossMod 無對應元件
}

# ── 開場:螺旋氣流 / 寒風之歌 / 大龍捲風 ─────────────────
s = steps('uwu-p1-open')
s[0]['aoes'][0] = {'type': 'cone', 'at': [0, 0], 'angle': 0, 'spread': 90,
                   'r': R['slipstream'], 'color': 'wind'}
s[0]['caption'] = ('螺旋氣流:**半徑只有 11.7m**(場地半徑 20m),張角 90°,依王的**當前面向**發動 + 暈眩。'
                   '離王夠遠的人本來就打不到 —— 真正要動的只有近身的 MT,往側邊閃開即可')
add_ann(s[0], {'type': 'text', 'at': [0, 104], 'text': '扇形只到 11.7m,外圈是安全的', 'color': 'blue'})
note('螺旋氣流 扇形 r100/100° → r58.5/90°(BossMod AOEShapeCone(11.7, 45°))')

add_ann(s[1], {'type': 'text', 'at': [0, 104],
               'text': '形狀依影片為扇形;BossMod 模型為直線衝鋒但自己標註未驗證', 'color': 'white'})

s[2]['aoes'][0]['r'] = R['whirlwind']
s[2]['caption'] = ('承受先頭判定的位置會留下**大龍捲風(半徑 8m)** —— 直徑 16m,在半徑 20m 的場地上是很大一塊。'
                   '**接完之後**全員(含補師)才開始移動,繞開龍捲風退回中央集合')
note('大龍捲風 r30 → 40(BossMod AOEShapeCircle(8))')

# ── 小怪:下行突風 ──────────────────────────────────
st = steps('uwu-p1-adds')[1]
st['aoes'][0] = {'type': 'cone', 'at': [0, 0], 'angle': 0, 'spread': 90,
                 'r': R['downburst'], 'color': 'thunder'}
st['caption'] = ('同時:螺旋氣流(朝南扇形)→ 無讀條下行突風(朝一仇 MT 方向扇形)。'
                 '**兩招的形狀完全相同:半徑 11.7m、張角 90°** —— 站位邏輯可以共用。'
                 'MT 閃完螺旋氣流立刻回位一人承受;ST 此時正在吃刺羽的氣旋')
note('下行突風 扇形 r100/60° → r58.5/90°(與螺旋氣流同形狀)')

# ── 穹頂:飛翎雨 / 高氣壓穹頂 / 烈風刃 ────────────────
s = steps('uwu-p1-dome')
for a in s[0]['aoes']:
    if a['type'] == 'circle':
        a['r'] = R['feather']
s[0]['caption'] = ('飛翎雨在中央集合一起丟(隨機 5 人**半徑 3m** 小圓 + 裂傷)→ 接寒風之嘯,'
                   '趁詠唱期間**在西側原地**把刺羽打死')
note('飛翎雨 r11 → 15(BossMod AOEShapeCircle(3));點名人數 5 依逐字稿與 wiki')

for stp in s:
    for a in stp.get('aoes', []):
        if a.get('color') == 'ice':
            a['r'] = R['dome']
s[1]['caption'] = ('刺羽在**原地(西側)**炸開 → 大暴風後留下**半徑 6m 的高氣壓穹頂**(20 秒)。'
                   '**ST 先進去解除 2 層**。穹頂不大,五個人要進去站得下但別擠出邊界')
note('高氣壓穹頂 r26 → 30(BossMod P1PlumeShield circle 6f)')

for stp in s:
    for a in stp.get('aoes', []):
        if a.get('color') == 'wind' and a.get('r') == 20:
            a['r'] = R['friction']
add_ann(s[2], {'type': 'text', 'at': [0, 104],
               'text': '⚠ 烈風刃 r5m 僅來自 AID 註解,BossMod 無對應元件', 'color': 'yellow'})
note('烈風刃 r20 → 25 ⚠ C 級:AID 註解寫 range 5 circle,BossMod 沒有做這個元件')

# ── 分身階段:邪輪旋風 / 台風眼 / 龍捲風 / 飛翎雨 ────────
s = steps('uwu-p1-clone')
for stp in s:
    for a in stp.get('aoes', []):
        if a['type'] == 'circle' and a.get('at') == 'boss':
            a['r'] = R['wheel']
        elif a['type'] == 'donut' and a.get('rInner') == 92:
            a['rInner'] = R['eyeInner']
            a['rOuter'] = R['eyeOuter']
        elif a['type'] == 'circle' and a.get('at') in ('MT', 'ST'):
            a['r'] = R['whirlwind']
        elif a['type'] == 'circle' and a.get('r') == 11:
            a['r'] = R['feather']
s[2]['caption'] = ('⚠ **台風眼的範圍比想像中大得多:12m 到 25m 的環形** —— 場地半徑才 20m,'
                   '所以**從 12m 往外一路到牆邊全都是判定**,安全區只有中央直徑 24m 的圓。'
                   'MT 先在 3 號位讓**邪輪旋風(半徑 8.7m)**讀完,再移動去接先頭')
add_ann(s[2], {'type': 'text', 'at': [0, 104],
               'text': '台風眼安全區 = 中央 12m 以內,不是只有貼牆危險', 'color': 'red'})
note('台風眼 donut 92-104 → 60-125(BossMod AOEShapeDonut(12, 25))—— 修正幅度最大的一項')
note('邪輪旋風(本體) r34 → 43.5;分身版另有 8.36 的版本')
note('坦克腳下大龍捲風 r26 → 40')

# ── 中高壓 ─────────────────────────────────────────
st = steps('uwu-p1-meso')[2]
for a in st.get('aoes', []):
    if a['type'] == 'circle' and a.get('color') == 'void':
        a['r'] = R['meso']
    if a['type'] == 'cone':
        a['spread'] = 90
        a['r'] = R['slipstream']
st['caption'] = ('**螺旋氣流出來之後** MT 才移動去接中高壓:兩位接線者從中央往東西兩側拉開,'
                 '中高壓落地(**半徑 3m 的小圓**)→ 清除低氣壓 + 超級氣旋。'
                 '圈很小,但兩人還是要拉開到互不重疊')
note('中高壓 r14 → 15(BossMod P1Mesohigh _radius = 3);螺旋氣流同步改成 r58.5/90°')

# ── 覺醒後:邪氣龍捲 / 下行突風 / 剛羽 ──────────────────
s = steps('uwu-p1-awake')
for a in s[0].get('aoes', []):
    if a['type'] == 'donut':
        a['rInner'] = R['tornadoIn']
        a['rOuter'] = R['tornadoOut']
s[0]['caption'] = ('覺醒後的邪輪旋風:圓形(半徑 8.7m)打完會**追加邪氣龍捲(內 7m / 外 20m 的環形)** —— '
                   '**安全區只有王身邊 7m 以內**,看到圓消失就立刻衝進去')
add_ann(s[0], {'type': 'text', 'at': [0, 104],
               'text': '⚠ 環形內圈 7m 是 BossMod 的值;AID 註解寫「?-20」,官方未定', 'color': 'yellow'})
note('邪氣龍捲 donut 26-100 → 35-100(BossMod ShapeTornado = Donut(7, 20));內圈 7 ⚠ AID 註解標「?」')

for a in s[1].get('aoes', []):
    if a['type'] == 'cone':
        a['spread'] = 90
        a['r'] = R['downburst']
note('覺醒後下行突風 扇形 r100/60° → r58.5/90°')

s[2]['aoes'] = [dict(a, r=y(8)) if a['type'] == 'feather' else a for a in s[2].get('aoes', [])]
add_ann(s[2], {'type': 'text', 'at': [0, 104],
               'text': '⚠ 羽槍 r8m 僅來自 AID 註解,BossMod 無對應元件', 'color': 'yellow'})
note('剛羽的羽槍圈 → 40 ⚠ C 級:AID 註解 Featherlance range 8 circle')


# ═══════════════════════════════════════════════════════════
# P2 伊弗利特
# ═══════════════════════════════════════════════════════════
# 對照表(全部為 A 級:BossMod 元件與 AID 註解互相吻合):
#   RadiantPlumeAOE  SimpleAOEs(8)               光輝炎柱   range 8 circle
#   CrimsonCyclone   AOEShapeRect(49, 9, 5)      深紅旋風   range 44+R width 18 rect
#   CrimsonCycloneX  AOEShapeRect(44.5, 5, 0.5)  追加正交衝 range 44+R width 10 rect
#   Hellfire         raidwide                     地獄之火炎
#   VulcanBurst      knockback 15                火神爆裂   range 16+R circle, knockback 15
#   Incinerate       AOEShapeCone(15, 60°)       烈焰焚燒   range 10+R 120-degree cone
#   SearingWind      UniformStackSpread(_, 14)   熱風       range 14 circle(不含自己)
#   EruptionAOE      SimpleAOEs(8)               地火噴發   range 8 circle puddle
#   FlamingCrush     UniformStackSpread(4,_,6,6) 烈焰碎擊   range 4 circle stack,6 人
#   Ifrit 本體半徑 R = 5.000
P = {
    'plume': y(8),            # 40
    'chargeFront': y(49), 'chargeBack': y(5), 'chargeHalf': y(9),      # 245 / 25 / 45
    'crossFront': y(44.5), 'crossBack': y(0.5), 'crossHalf': y(5),     # 222.5 / 2.5 / 25
    'burst': y(16 + 5), 'burstKnock': y(15),                           # 105 / 75
    'incinR': y(15), 'incinSpread': 120,                               # 75 / 120°
    'searing': y(14),         # 70
    'eruption': y(8),         # 40
    'crush': y(4),            # 20
}

# ── 轉場:光輝炎柱 → 正面突進 ────────────────────────
s = steps('uwu-p2-transition')

# ① 光輝炎柱:每個圓半徑 8m(r24 → 40),正點的安全圈同尺寸
for a in s[0]['aoes']:
    a['r'] = P['plume']
s[0]['caption'] = ('落地瞬間:**光輝炎柱**在全場生成**半徑 8m** 的圓形 AOE —— 一個圓就吃掉場地直徑的 40%,'
                   '所以場上幾乎沒有縫隙。**東西南北四個正點中必有兩處沒被蓋到**(示例:東與南安全)')
add_ann(s[0], {'type': 'text', 'at': [0, 104], 'text': '每個炎柱半徑 8m,安全區就是那兩個空格', 'color': 'blue'})
note('光輝炎柱 r24 → 40(BossMod P2RadiantPlume SimpleAOEs(8))')

# ② 深紅旋風:半寬 9m,從火神身上往前 49m
s[1]['aoes'] = [charge([0, -96], 180, P['chargeFront'], P['chargeBack'], P['chargeHalf']),
                {'type': 'tower', 'at': [62, 0], 'r': P['plume'], 'empty': True}]
s[1]['caption'] = ('緊接著**深紅旋風從正面直線貫穿中央**。⚠ **這道直線半寬 9m、總寬 18m** —— '
                   '場地直徑才 40m,**一道衝鋒就吃掉將近一半的場地**。南邊那處安全區被吃掉,'
                   '**最終安全區只剩東側**;開衝刺衝進去')
add_ann(s[1], {'type': 'text', 'at': [0, 104], 'text': '⚠ 衝鋒寬 18m ≒ 場地的 45%', 'color': 'red'})
note('深紅旋風 rect 半寬 20 → 45(BossMod AOEShapeRect(49, 9, 5)= range 44+R width 18)')

# ── 火神柱前:火神爆裂 / 三連死刑 ──────────────────────
s = steps('uwu-p2-open')

s[1]['aoes'][0]['r'] = P['burst']
for an in s[1]['annotations']:
    if an['type'] == 'knockback':
        an['rInner'] = y(5)          # Ifrit 本體半徑
        an['rOuter'] = y(5) + P['burstKnock']
s[1]['caption'] = ('**火神爆裂**:以王為中心**半徑 21m** 的 AOE —— 半徑 20m 的場地**完全沒有安全區**,'
                   '只能硬吃。傷害約 2000 但附**擊退 15m**。**H2 下盾把傷害吃成 0 就不會被擊退** —— '
                   '沒擋到會被推出場外直接死')
add_ann(s[1], {'type': 'text', 'at': [0, 104], 'text': '半徑 21m = 全場,擊退距離 15m', 'color': 'red'})
note('火神爆裂 r96 → 105(range 16+R,R=5);擊退距離 15m(BossMod Knockback(_, 15f))')

for a in s[2]['aoes']:
    if a['type'] == 'cone':
        a['spread'] = P['incinSpread']
        a['r'] = P['incinR']
s[2]['caption'] = ('**三連死刑(烈焰焚燒)**:無讀條扇形,**張角 120°、半徑 15m** —— 比想像中寬得多,'
                   '站在王的側面也會被掃到,**要繞到背面**。對一仇約 20000 + 火抗大降,間隔 3~4 秒共 3 次;'
                   'ST 一人接完,吃完第一次易傷後開無敵')
add_ann(s[2], {'type': 'text', 'at': [0, 104], 'text': '⚠ 120° 不是 60° —— 側面也在範圍內', 'color': 'red'})
note('三連死刑 扇形 60° → 120°、r100 → 75(BossMod P2Incinerate AOEShapeCone(15, 60°half))')

# ── 火神柱:地火 / 熱風 ─────────────────────────────
s = steps('uwu-p2-nail-run')
for a in s[0]['aoes']:
    if a['type'] == 'circle':
        a['r'] = P['eruption']
s[0]['caption'] = ('**地火噴發**:對距離王最遠的 D3 / D4 連續 4 發**半徑 8m** 的延遲圓形。'
                   '⚠ 圓比想像中大(直徑 16m),引導時彼此要拉開,不然會把柱子旁的人一起蓋到。'
                   '詠唱 3 秒、每 2 秒一發**互相重疊** —— 這就是「引導第 3 次時第 1 次才引爆」的來源')
add_ann(s[0], {'type': 'text', 'at': [0, 104], 'text': '地火半徑 8m · 3 秒詠唱 / 2 秒一發', 'color': 'blue'})
note('地火噴發 r30 → 40(BossMod P2Eruption SimpleAOEs(8));詠唱 3s、間隔 2s → 第 3 發起手時第 1 發落地')

for a in s[1]['aoes']:
    if a['type'] == 'circle' and a.get('r') == 75:
        a['r'] = P['searing']
s[1]['caption'] = ('同時進行:**灼熱咆哮**點名 H2 → 退到長邊方向場邊。'
                   '⚠ **熱風的判定是以該補師為中心半徑 14m(不含她自己)** —— 場地半徑才 20m,'
                   '**等於半個場地**,所以要退到底。**火獄之鎖**連線 ST 與一名 DPS → ST 貼上去壓低層數')
add_ann(s[1], {'type': 'text', 'at': [0, 104], 'text': '熱風 14m(BossMod);wiki 寫 15m', 'color': 'yellow'})
note('熱風 r75 → 70(BossMod P2SearingWind UniformStackSpread(_, 14f)+ AID 註解 range 14)⚠ 與 wiki 的 15m 有出入')

# ── 覺醒後:地火 / 十字衝鋒 / 分攤 ────────────────────
s = steps('uwu-p2-postnail')
for a in s[1]['aoes']:
    if a['type'] == 'circle':
        a['r'] = P['eruption']

# 分身的十字 = 兩道「主衝」沿正線,半寬 9m(不是追加的那種窄的)
s[2]['aoes'] = [charge([0, -105], 180, P['chargeFront'], P['chargeBack'], P['chargeHalf']),
                charge([-105, 0], 90, P['chargeFront'], P['chargeBack'], P['chargeHalf'])]
s[2]['caption'] = ('**分身出現,必定對東西南北做十字衝鋒** → **躲在斜點**。'
                   '⚠ 兩道各半寬 9m,合起來把場地切成四塊,**四個角落的安全區其實不大** —— '
                   '要退到離兩條軸線都超過 9m 的位置。大家已經在 4 號柱(斜點)方位集合,原地不動即可')
add_ann(s[2], {'type': 'text', 'at': [0, 104], 'text': '⚠ 兩軸各佔 18m 寬,角落安全區比看起來小', 'color': 'red'})
note('覺醒後十字衝鋒 rect 半寬 20 → 45(兩道主衝,非追加的窄十字)')

s[3]['aoes'] = [{'type': 'circle', 'at': [-63, -63], 'r': P['crush'], 'color': 'fire'}]
s[3]['caption'] = ('**第二次灼熱**點名 H1 → 兩名補師**互為對角**。'
                   '**烈焰碎擊是半徑 4m 的小圈分攤** —— 圈很小,六個人要確實疊進去。'
                   'BossMod 也明寫「**除了灼熱目標(通常是兩名補師)以外全員分攤**」,人數就是 6')
add_ann(s[3], {'type': 'text', 'at': [0, 104], 'text': '分攤圈只有 4m · 6 人(2 坦 + 4 DPS)', 'color': 'yellow'})
note('烈焰碎擊 分攤圈 r=20(BossMod FlamingCrush UniformStackSpread(4f, _, 6, 6));'
     'BossMod 註解確認「除灼熱目標外全員分攤」= 2 坦 + 4 DPS')

# ── 四連火神衝 ─────────────────────────────────────
s = steps('uwu-p2-charge')
for i in (1, 2):
    s[i]['aoes'] = [charge([0, 105], 0, P['chargeFront'], P['chargeBack'], P['chargeHalf'])] + \
                   [a for a in s[i]['aoes'] if a['type'] != 'rect']
add_ann(s[1], {'type': 'text', 'at': [0, 104], 'text': '⚠ 每道衝鋒寬 18m —— 跑到位就別再亂動', 'color': 'red'})

# 本體在斜點(本例 2 號)→ 追加十字,用窄版的 CrimsonCycloneCross
s[3]['aoes'] = cross_pair(225) + [a for a in s[3]['aoes'] if a['type'] == 'tentacle']
s[3]['caption'] = ('本體衝完 **2.2 秒後**追加一次正交衝鋒。⚠ **追加的這兩道比較窄:半寬 5m(總寬 10m)**,'
                   '與主衝的 18m 不同。**本體在斜點 → 追加十字(圖示);在正點 → X 字**。'
                   '跑到位之後不要亂動,**衝鋒結束後灼熱還有最後一次爆炸**')
add_ann(s[3], {'type': 'text', 'at': [0, 104], 'text': '追加衝鋒寬 10m,比主衝的 18m 窄', 'color': 'yellow'})
note('四連衝鋒主衝 rect 半寬 20 → 45;追加的正交衝鋒為另一個元件,半寬 25(AOEShapeRect(44.5, 5, 0.5))')
note('追加衝鋒延遲 2.2 秒、方向 = 主衝 ±45°(BossMod OnCastFinished)—— 印證「正點 X 字 / 斜點十字」')

# ── 收尾 ───────────────────────────────────────────
s = steps('uwu-p2-end')
for a in s[0]['aoes']:
    if a['type'] == 'cone':
        a['spread'] = P['incinSpread']
        a['r'] = P['incinR']
add_ann(s[0], {'type': 'text', 'at': [0, 104], 'text': '死刑扇形 120° / 15m', 'color': 'yellow'})

for a in s[1]['aoes']:
    if a['type'] == 'circle':
        a['r'] = P['eruption']
s[1]['aoes'].append({'type': 'circle', 'at': [-2, -40], 'r': P['crush'], 'color': 'fire'})

add_ann(s[2], {'type': 'text', 'at': [0, 104],
               'text': '⚠ 討伐後的距離衰減為示意,BossMod 無對應元件', 'color': 'yellow'})
note('收尾死刑同步改為 120°/15m;分攤圈 4m;⚠ 討伐後距離衰減無 BossMod 依據,維持示意')


# ═══════════════════════════════════════════════════════════
header = '''/* 絕神兵零式(UWU) —— 校對版
 *
 * ⚠ 自動產生,請勿手改 —— 下次重跑會被覆蓋。
 *   文字要改 → data/uwu.js
 *   幾何要改 → _Planning/BossMod逆向解析/tools/rebuild-uwu.py
 *   重新產生 → py "_Planning/BossMod逆向解析/tools/rebuild-uwu.py"
 *
 * 文字沿用 data/uwu.js(來源:攻略逐字稿 + 影片截圖 + 灰機 wiki + 繁中隊伍簡報),
 * 沙盤圖尺寸改採 BossMod Reborn 的實測數值。換算 1m = 5 單位。
 * 逐項比對見 _Planning/BossMod逆向解析/07-UWU-P1對照.md 與 08-UWU-P2對照.md。
 */
window.RAID_DATA = window.RAID_DATA || {};
window.RAID_DATA['uwu-lab'] = '''

out = os.path.join(ROOT, 'data', 'uwu-lab.js')
io.open(out, 'w', encoding='utf-8').write(
    header + json.dumps(d, ensure_ascii=False, indent=2) + ';\n')

print('written data/uwu-lab.js')
for line in log:
    print('  . ' + line)
