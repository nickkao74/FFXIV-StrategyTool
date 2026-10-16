# -*- coding: utf-8 -*-
"""UWU P3 泰坦:章節 / 速查卡的產生器,附站位碰撞檢查與岩牢連鎖距離檢查。

P3 的文字與站位都由這支產生,寫回 data/uwu.js 的 P3 區塊(P1/P2 不受影響)。
⚠ 要改 P3 的內容請改這支再重跑,直接手改 data/uwu.js 的 P3 會在下次重跑時被覆蓋。

用法:
  py "_Planning/BossMod逆向解析/tools/layout-uwu-p3.py" --check   只做檢查
  py "_Planning/BossMod逆向解析/tools/layout-uwu-p3.py"           檢查通過後寫回 data/uwu.js
之後再跑 rebuild-uwu.py 產生 uwu-lab.js。

尺寸來源見 ../09-UWU-P3對照.md;截圖量測見 ../../UWU-P3-整理.md §4-0。
"""
import json, math, sys

K = 5
def m(v):
    r = round(v * K, 2)
    return int(r) if r == int(r) else r

def bearing_unit(deg):
    rad = math.radians(deg - 90)
    return (math.cos(rad), math.sin(rad))

def bearing(frm, to):
    dx, dy = to[0] - frm[0], to[1] - frm[1]
    return round((math.degrees(math.atan2(dx, -dy)) + 360) % 360, 1)

def at(origin, deg, dist):
    ux, uy = bearing_unit(deg)
    return [round(origin[0] + ux * dist, 1), round(origin[1] + uy * dist, 1)]

# ── BossMod 尺寸 ─────────────────────────────
TITAN_R = 4.55
SZ = {
    'geocrush1': m(18),            # 90  SimpleAOEs(Geocrush1, 18)
    'geocrush2': m(24),            # 120 AOEShapeCircle(24)
    'arena1': m(16), 'arena2': m(12),  # 80 / 60  ArenaBoundsCircle(16 / 12)
    'rockR': m(10.55), 'rockSpread': 120,     # 52.75 / 120°  ⚠ TODO verify angle
    'mtnR': m(15.55), 'mtnSpread': 90,        # 77.75 / 90°   ⚠ TODO verify angle
    'weight': m(6),                # 30
    'burst': m(6.3),               # 31.5 AOEShapeCircle(6.3)
    'freefire': m(6),              # 30
    'lsFront': m(44.55), 'lsBack': m(4.55), 'lsHalf': m(3),   # 222.75 / 22.75 / 15
    'lhFront': m(40.5), 'lhBack': m(0.5),                       # helper
    'knock': m(24),
    'titanHit': m(TITAN_R),        # 22.75
    'gaol': m(1.8),                # 9
}
TITAN_JUMP = m(20)                 # 100 依影片示意圖量測:落在原本的場邊(BossMod 被註解掉的預測碼寫 14,不採用)
SZ['sludge'] = m(7)               # 35  依影片示意圖量測(BossMod 未建模)

def cluster(c, mt, spread=5):
    offs = {'ST': (-6, 2), 'D1': (6, 2), 'D2': (0, -5), 'D3': (-4, 8), 'H1': (5, 8), 'H2': (-8, -5), 'D4': (8, -5)}
    out = {'MT': {'x': mt[0], 'y': mt[1]}}
    for r, (dx, dy) in offs.items():
        out[r] = {'x': round(c[0] + dx * spread / 5, 1), 'y': round(c[1] + dy * spread / 5, 1)}
    return out


def landslide(pos, phi, second=False, color='ice'):
    rels = (22.5, -22.5, 90, -90, 180) if second else (0, 45, -45, 135, -135)
    out = []
    for i, r in enumerate(rels):
        a = round((phi + r) % 360, 1)
        main = (not second and i == 0)
        out.append({'type': 'rect', 'at': list(pos), 'angle': a,
                    'lengthFront': SZ['lsFront'] if main else SZ['lhFront'],
                    'lengthBack': SZ['lsBack'] if main else SZ['lhBack'],
                    'halfWidth': SZ['lsHalf'], 'color': color})
    return out

def shrink(r_in):
    return {'type': 'donut', 'at': [0, 0], 'rInner': r_in, 'rOuter': 100, 'color': 'death'}

# ── 碰撞檢查 ───────────────────────────────
ACTOR_R = 3
problems = []

def inside(aoe, p, step):
    t = aoe['type']
    o = aoe['at'] if isinstance(aoe['at'], list) else step['actors'][aoe['at']].values()
    o = list(o) if not isinstance(o, list) else o
    if isinstance(aoe['at'], str):
        o = [step['actors'][aoe['at']]['x'], step['actors'][aoe['at']]['y']]
    dx, dy = p[0] - o[0], p[1] - o[1]
    if t == 'circle':
        return math.hypot(dx, dy) < aoe['r'] + ACTOR_R
    if t == 'rect':
        ux, uy = bearing_unit(aoe['angle'])
        along = dx * ux + dy * uy
        perp = abs(-dx * uy + dy * ux)
        return -aoe['lengthBack'] - ACTOR_R < along < aoe['lengthFront'] + ACTOR_R and perp < aoe['halfWidth'] + ACTOR_R
    if t == 'cone':
        d = math.hypot(dx, dy)
        if d > aoe['r'] + ACTOR_R:
            return False
        b = (math.degrees(math.atan2(dx, -dy)) + 360) % 360
        diff = abs((b - aoe['angle'] + 180) % 360 - 180)
        return diff < aoe['spread'] / 2 + math.degrees(math.asin(min(1, ACTOR_R / max(d, 1e-6))))
    return False

def check(sid, idx, step, arena_r=100, hit_ok=(), skip_types=()):
    for role, pos in step.get('actors', {}).items():
        p = (pos['x'], pos['y'])
        if math.hypot(*p) + ACTOR_R > arena_r + 0.01:
            problems.append(f'{sid}[{idx}] {role} 出界 r={math.hypot(*p):.1f} > {arena_r}')
        for k, a in enumerate(step.get('aoes', [])):
            if a['type'] in ('donut', 'xmark') or a['type'] in skip_types or a.get('_nocheck'):
                continue
            if (role, k) in hit_ok or role in hit_ok:
                continue
            if inside(a, p, step):
                problems.append(f'{sid}[{idx}] {role} 在 aoe#{k}({a["type"]} {a.get("angle", "")}) 內')


def cluster_safe(c, mt, aoes_list, arena_r, spread):
    st = {'actors': cluster(c, mt, spread)}
    for aoes in aoes_list:
        for role, pos in st['actors'].items():
            if role == 'MT':
                continue
            p = (pos['x'], pos['y'])
            if math.hypot(*p) + ACTOR_R > arena_r:
                return False
            for a in aoes:
                if a['type'] in ('rect', 'circle', 'cone') and inside(a, p, st):
                    return False
    return True

def point_safe(p, aoes_list, arena_r):
    if math.hypot(*p) + ACTOR_R > arena_r:
        return False
    return not any(a['type'] in ('rect', 'circle', 'cone') and inside(a, p, {'actors': {}}) for aoes in aoes_list for a in aoes)

def ls_spots(titan, phi, arena_r, near=None, mt_near=None, spread=3, extra=()):
    """網格搜尋:g1 = 離 near 最近、躲得過第 1 發的集合點;g2 = 離 g1 最近、躲得過第 2 發的點;
    MT = 離 mt_near 最近、兩發都躲得過的點。"""
    first, second = landslide(titan, phi) + list(extra), landslide(titan, phi, second=True) + list(extra)
    near = near or at(titan, phi, 50)
    grid = [(x, y) for x in range(-int(arena_r), int(arena_r) + 1, 2) for y in range(-int(arena_r), int(arena_r) + 1, 2)]
    def best(target, ok):
        cands = [g for g in grid if ok(g)]
        return list(min(cands, key=lambda g: math.hypot(g[0] - target[0], g[1] - target[1]))) if cands else None
    g1 = best(near, lambda g: cluster_safe(g, [999, 999], [first], arena_r, spread))
    g2 = best(g1, lambda g: cluster_safe(g, [999, 999], [second], arena_r, spread)) if g1 else None
    mt = best(mt_near or at(titan, phi + 112.5, 40), lambda g: point_safe(g, [first, second], arena_r))
    if not (g1 and g2 and mt):
        problems.append(f'ls_spots 找不到安全點 titan={titan} phi={phi} g1={g1} g2={g2} mt={mt}')
    return g1, g2, mt

# ═══════════════════════════════════════════
CENTER = [0, 0]
SECTIONS = []
CARDS = []

def S(**kw):
    SECTIONS.append(kw)
    return kw

# ─── A. 落地 ───────────────────────────────
edge8 = {
    'MT': {'x': -34, 'y': -86}, 'ST': {'x': 34, 'y': -86},
    'H1': {'x': 86, 'y': -34}, 'H2': {'x': 86, 'y': 34},
    'D1': {'x': 34, 'y': 86}, 'D2': {'x': -34, 'y': 86},
    'D3': {'x': -86, 'y': 34}, 'D4': {'x': -86, 'y': -34},
}
north_tank = {
    'MT': {'x': 0, 'y': -30},
    'ST': {'x': -26, 'y': 22},
    'H1': {'x': -22, 'y': 56}, 'H2': {'x': 22, 'y': 56},
    'D1': {'x': -10, 'y': 32}, 'D2': {'x': 12, 'y': 32},
    'D3': {'x': -4, 'y': 62}, 'D4': {'x': 14, 'y': 66},
}
A = S(
    id='uwu-p3-open', phase='P3 泰坦',
    title='落地:大地粉碎 → 大地之怒 → 二連死刑',
    body=(
        "伊弗利特倒下後,泰坦會**落在場地中央**。\n"
        "### 大地粉碎(落地)\n"
        "- **形狀**:以泰坦為中心、**隨距離衰減**的全體傷害(衰減半徑 18m)\n"
        "- **處理**:**全員退到外周最邊緣**。伊弗利特的突破極限**等衰減結束後再撿**({{dps:D4}})\n"
        "### 大地之怒(讀條)\n"
        "- **形狀**:全體傷害,**非常痛**\n"
        "- ⚠ **仇恨會重置** —— 坦克注意姿態,{{tank:MT}} 第一時間**挑釁**把泰坦接住\n"
        "- ⚠ **這招穿無敵**(火神篇簡報的轉場注意事項) —— 有人陣亡的話,**等這一發過去再起來**\n"
        "### 碎岩 → 山崩 · 二連死刑(無讀條)\n"
        "- **碎岩**:對**當前一仇**的扇形\n"
        "- **山崩**:約 3 秒後,朝**一仇方向**的**更大**扇形,傷害極高\n"
        "- **處理**:{{tank:MT}} **開滿減傷**承受;王依慣例**面向北(A)**,其他人待在**南側背面** —— **站在泰坦正面會被扁**\n"
        "- 這組死刑在 P3 共出現 **3 組**,**第 1 組與第 3 組剛好相隔約 2 分鐘** → 減傷與無敵可以照 2 分鐘循環排\n"
        "> 扇形尺寸來自 BossMod,但它自己在兩招的角度上都標了「待驗證」,圖上的張角僅供參考。"
    ),
    roleNotes={
        'MT': '大地之怒**會重置仇恨** → 讀條結束立刻**挑釁**接回,把泰坦**面向拉成朝北(A)**。二連死刑**開滿減傷**。',
        'ST': '大地之怒後別搶到一仇;站在泰坦**背面**輸出,必要時給 MT 減傷。',
        'H1 H2': '落地的距離衰減 → 大地之怒 → 二連死刑連續三發,**先把血線拉滿**,死刑時集中照顧 MT。',
        'D1 D2': '站泰坦**背面(南側)**輸出,不要繞到側面。',
        'D3 D4': '**D4 等距離衰減結束後**再去撿伊弗利特的突破極限;有人陣亡要**等大地之怒過去再起來**。',
    },
    steps=[
        {
            'caption': '伊弗利特倒下後泰坦**落在場地中央**:**大地粉碎**是隨距離衰減的傷害(衰減半徑 18m)→ **全員退到外周最邊緣**。D4 等衰減結束後再上去撿伊弗利特的突破極限',
            'boss': {'x': 0, 'y': 0, 'facing': None},
            'actors': edge8,
            'aoes': [{'type': 'circle', 'at': [0, 0], 'r': SZ['geocrush1'], 'color': 'ice', '_nocheck': True}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '距離衰減 · 退到最邊緣', 'color': 'yellow'}],
        },
        {
            'caption': '**大地之怒**:全體傷害,**仇恨重置**、**穿無敵**。MT 讀條一結束就**挑釁**,把泰坦**面向拉成朝北(A)**;其他人到**南側背面**集合',
            'boss': {'x': 0, 'y': 0, 'facing': 0},
            'actors': north_tank,
            'markers': [{'type': 'target', 'at': 'MT'}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '仇恨重置 → MT 挑釁', 'color': 'red'}],
        },
        {
            'caption': '**碎岩 → 山崩**:無讀條的二連死刑,先是**碎岩**(半徑約 10.5m),約 3 秒後**山崩**(半徑約 15.5m、傷害極高),都朝一仇方向。**MT 開滿減傷**;其他人待在背面',
            'boss': {'x': 0, 'y': 0, 'facing': 0},
            'actors': north_tank,
            'aoes': [
                {'type': 'cone', 'at': [0, 0], 'angle': 0, 'spread': SZ['mtnSpread'], 'r': SZ['mtnR'], 'color': 'thunder'},
                {'type': 'cone', 'at': [0, 0], 'angle': 0, 'spread': SZ['rockSpread'], 'r': SZ['rockR'], 'color': 'thunder'},
            ],
            'markers': [{'type': 'target', 'at': 'MT'}],
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '二連死刑 · MT 開滿減傷', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '⚠ 兩招張角 BossMod 標待驗證', 'color': 'yellow'},
            ],
        },
    ],
)
check(A['id'], 0, A['steps'][0])
check(A['id'], 2, A['steps'][2], hit_ok=('MT',))

# ─── B. 大地之重 → 自滅 → 大地粉碎(跳躍) ──────────
alive4 = ('MT', 'H1', 'H2', 'D4')
dead4 = ('ST', 'D1', 'D2', 'D3')
G1 = [0, 46]                       # 第一輪丟重力的位置
G2 = at(CENTER, 225, 50)           # 第二輪:順時針移到西南
G3 = at(CENTER, 270, 52)           # 存活組繼續順時針到西
w1 = {
    'MT': {'x': 0, 'y': -30},
    'ST': {'x': -7, 'y': 41}, 'D1': {'x': 7, 'y': 41},
    'D2': {'x': 0, 'y': 50}, 'D3': {'x': -8, 'y': 52},
    'H1': {'x': 8, 'y': 52}, 'H2': {'x': -3, 'y': 58}, 'D4': {'x': 6, 'y': 60},
}
w2 = {
    'MT': {'x': -24, 'y': -20},
    'H1': {'x': G3[0] - 2, 'y': G3[1] - 7}, 'H2': {'x': G3[0] + 5, 'y': G3[1] + 2},
    'D4': {'x': G3[0] - 6, 'y': G3[1] + 6},
}
corpses = [{'type': 'xmark', 'at': [round(G2[0] + dx, 1), round(G2[1] + dy, 1)]} for dx, dy in ((-6, -4), (6, -4), (-5, 6), (6, 6))]
run_w = {
    'MT': {'x': -40, 'y': -8},
    'H1': {'x': -70, 'y': -10}, 'H2': {'x': -66, 'y': 6}, 'D4': {'x': -74, 'y': 4},
}
land_w = {
    'MT': {'x': -62, 'y': -14},
    'H1': {'x': -70, 'y': -6}, 'H2': {'x': -64, 'y': 8}, 'D4': {'x': -72, 'y': 8},
}
TITAN_B = [TITAN_JUMP, 0]
B = S(
    id='uwu-p3-jump', phase='P3 泰坦',
    title='大地之重 → 大地粉碎(跳躍)· 自滅法',
    body=(
        "### 大地之重(讀條)\n"
        "- **形狀**:在玩家腳下生成**半徑 6m** 的圓形 AOE,**連續 2 輪**(最後兩次會變 3 輪)\n"
        "- **處理**:全隊**集合**丟下第一輪,接著**沿著泰坦順時針(或逆時針)**移動,讓下一輪落在旁邊\n"
        "### 大地粉碎(跳躍)\n"
        "- 泰坦會**瞬間轉向**,接著**往牠面向的方向跳**、落在場邊的**正點**,從落點發出**隨距離衰減**的傷害\n"
        "- 每跳一次,**場地外圈就變成即死區**:場地半徑 20m → **16m**;第二次跳 → **12m**\n"
        "- **處理**:看清楚**轉向的那一瞬間**,往**反方向**退。範例:面向 **B** → 退到 **D** 側的邊緣\n"
        "- 為了讓轉向好判斷,**{{tank:MT}} 要把泰坦盡量固定在正中央**\n"
        "- 不知道躲哪的話,現在場地還寬,**躲在兩個點中間**也撐得過去\n"
        "### ⚠ 自滅法(影片介紹的主流打法)\n"
        "本攻略以影片的「**自滅法**」為前提:**第二輪大地之重時,刻意讓 4 個人站著吃重力死掉**。\n"
        "| 第二輪大地之重 | 成員 |\n|---|---|\n"
        "| **躲開**(存活) | {{tank:MT}}、{{healer:H1}}、{{healer:H2}}、{{dps:D4}}(法系) |\n"
        "| **站著吃**(陣亡) | {{tank:ST}}、{{dps:D1}}、{{dps:D2}}、{{dps:D3}} |\n\n"
        "**為什麼要死**:接下來的三連岩牢會點名**一仇以外的 3 人**。場上只剩 4 人時,岩牢**必定落在 H1、H2、D4 身上**,"
        "站位可以完全固定,不用在 4 秒內判斷優先度。\n"
        "陣亡的人等岩牢處理完再被拉起來(見下一節)。現在的版本幾乎沒有 DPS 檢查,少 4 個人也打得過。\n"
        "> **本隊尚未約定是否採用自滅法。** 全員存活的打法要 7 人依**優先度**排固定位置,影片只提了一句、沒有細節,需要另外討論。"
    ),
    roleNotes={
        'MT': '大地之重時**自己也會被丟**,側移一步就好,泰坦**維持在正中央**。轉向後跟著存活組退到**反方向**。',
        'ST': '自滅法:**第二輪大地之重站著吃**,等岩牢結束後被拉。',
        'H1 H2': '**兩輪都要躲**,轉向後退到反方向邊緣。接下來岩牢**必定點到你們**,先記好站位(下一節)。',
        'D1 D2': '自滅法:**第二輪大地之重站著吃**。D1 之後還要撿泰坦的突破極限,被拉起來後別忘了。',
        'D3': '自滅法:**第二輪大地之重站著吃**。',
        'D4': '**兩輪都要躲**,存活下來處理岩牢;如果是召喚士,之後要負責讀條拉人。',
    },
    steps=[
        {
            'caption': '**大地之重第一輪**:每個人腳下一個**半徑 6m** 的圓。全隊在泰坦**背面集合一起丟**,之後**沿著泰坦順時針**移動。MT 自己的那一發往側邊閃',
            'boss': {'x': 0, 'y': 0, 'facing': 0},
            'actors': w1,
            'aoes': [
                {'type': 'circle', 'at': [0, 50], 'r': SZ['weight'], 'color': 'fire'},
                {'type': 'circle', 'at': [0, -30], 'r': SZ['weight'], 'color': 'fire'},
            ],
            'annotations': [
                {'type': 'arcArrow', 'radius': 72, 'startAngle': 175, 'endAngle': 222, 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '集合丟 → 順時針繞', 'color': 'yellow'},
            ],
        },
        {
            'caption': '**第二輪(自滅法)**:**MT、H1、H2、D4 繼續順時針躲開**;**ST、D1、D2、D3 站著吃第二輪**陣亡。場上只剩 4 人 → 等等的三連岩牢必定點到 H1、H2、D4',
            'boss': {'x': 0, 'y': 0, 'facing': 0},
            'actors': w2,
            'aoes': [
                {'type': 'circle', 'at': G2, 'r': SZ['weight'], 'color': 'fire', '_nocheck': True},
                {'type': 'circle', 'at': [-20, -26], 'r': SZ['weight'], 'color': 'fire', '_nocheck': True},
            ] + corpses,
            'annotations': [
                {'type': 'text', 'at': [G2[0], G2[1] + 28], 'text': 'ST·D1·D2·D3 站著吃', 'color': 'red'},
                {'type': 'text', 'at': [0, -104], 'text': '自滅法:4 人在這裡陣亡', 'color': 'yellow'},
            ],
        },
        {
            'caption': '泰坦**瞬間轉向**(範例:面向 **B**),接著**往面向的方向跳**。看準轉向的瞬間,存活組**往反方向(D 側)**退到邊緣。為了好判斷,**MT 要把泰坦固定在正中央**',
            'boss': {'x': 0, 'y': 0, 'facing': 90},
            'actors': run_w,
            'aoes': corpses,
            'annotations': [
                {'type': 'arrow', 'from': [26, 0], 'to': [TITAN_B[0] - 4, 0], 'color': 'red', 'dash': True},
                {'type': 'arrow', 'from': [-40, 14], 'to': [-62, 14], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '面向 B → 跳向 B → 退到 D', 'color': 'yellow'},
            ],
        },
        {
            'caption': '泰坦落在 B 方向原本的場邊(離中心約 20m),發出隨距離衰減的大地粉碎(衰減半徑 24m)。同時**場地外圈變成即死區**,半徑 20m → **16m**。不確定方向時,躲在兩個點中間也撐得過去',
            'boss': {'x': TITAN_B[0], 'y': 0, 'facing': 270},
            'actors': land_w,
            'aoes': [
                {'type': 'circle', 'at': TITAN_B, 'r': SZ['geocrush2'], 'color': 'ice'},
                shrink(SZ['arena1']),
            ] + corpses,
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '場地縮成半徑 16m', 'color': 'red'},
                {'type': 'text', 'at': [0, 104], 'text': '落點在原本的場邊(依影片示意圖量測)', 'color': 'yellow'},
            ],
        },
    ],
)
check(B['id'], 0, B['steps'][0], hit_ok=tuple(w1.keys()))
check(B['id'], 1, B['steps'][1])
check(B['id'], 3, B['steps'][3], arena_r=SZ['arena1'])

# ─── C. 大激震 → 三連岩牢 ─────────────────────
# 影片示意圖(泰坦在北)量測後旋轉 90° 到本圖的方向(泰坦在 B):(x, y) → (-y, x)
ROCK_GAP = [m(-6.6), m(-4.4)]      # 中間兩顆之一:本例缺北邊這顆
ROCK_HAS = [m(-6.6), m(4.4)]       # 中間兩顆之二
ROCKS_FAR = [[m(-12), m(-11.5)], [m(-13), m(4.4)], [m(-12), m(11.5)]]   # 外側三顆
LAND = [m(-8.2), m(-4.4)]          # 擊退落點 = 缺角的位置;多出來的那顆岩石落在這裡
kb_dir = bearing(TITAN_B, LAND)
kb_land_d = math.hypot(LAND[0] - TITAN_B[0], LAND[1] - TITAN_B[1])
stand_d = kb_land_d - SZ['knock']
STAND = at(TITAN_B, kb_dir, stand_d)
kb_pre = {
    'MT': {'x': STAND[0] - 2, 'y': STAND[1] - 4}, 'H1': {'x': STAND[0] + 3, 'y': STAND[1] - 2},
    'H2': {'x': STAND[0] - 1, 'y': STAND[1] + 3}, 'D4': {'x': STAND[0] + 4, 'y': STAND[1] + 3},
}
kb_post = {r: {'x': round(p['x'] + (LAND[0] - STAND[0]), 1), 'y': round(p['y'] + (LAND[1] - STAND[1]), 1)} for r, p in kb_pre.items()}
BAIT = [m(-8.7), m(-10.5)]
bait = {
    'MT': {'x': BAIT[0] + 6, 'y': BAIT[1] + 2}, 'H1': {'x': BAIT[0] - 4, 'y': BAIT[1] + 4},
    'H2': {'x': BAIT[0] - 2, 'y': BAIT[1] - 6}, 'D4': {'x': BAIT[0] + 3, 'y': BAIT[1] - 6},
}
phi1 = bearing(TITAN_B, BAIT)
GAOL_D4 = [m(9), 0]
GAOL_H1 = [m(1.5), 0]
GAOL_H2 = [m(-5.8), m(-2.5)]
gaol_pos = {
    'MT': {'x': BAIT[0], 'y': BAIT[1]},
    'H1': {'x': GAOL_H1[0], 'y': GAOL_H1[1]}, 'H2': {'x': GAOL_H2[0], 'y': GAOL_H2[1]},
    'D4': {'x': GAOL_D4[0], 'y': GAOL_D4[1]},
}
phi2 = bearing(TITAN_B, GAOL_H1)
# 連鎖距離檢查:岩石大爆炸 6.3 / 石牢爆炸 6 + 石牢 R1.8;最後一個的汙泥要碰到泰坦
def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1]) / K
for a, b, lim, what in ((LAND, GAOL_H2, 6.3 + 1.8, '岩石→H2'), (GAOL_H2, GAOL_H1, 6 + 1.8, 'H2→H1'),
                        (GAOL_H1, GAOL_D4, 6 + 1.8, 'H1→D4'), (GAOL_D4, TITAN_B, 7 + TITAN_R, 'D4 汙泥→泰坦')):
    if dist(a, b) > lim:
        problems.append(f'連鎖斷掉 {what}: {dist(a, b):.1f}m > {lim}m')
# 岩牢那一列必須躲得過第 1 發地裂斬
_t = {'actors': {k: v for k, v in gaol_pos.items() if k != 'MT'}, 'aoes': landslide(TITAN_B, phi1)}
check('uwu-p3-gaols', 'gaol-vs-ls1', _t, arena_r=m(16))
def rocks_first():
    out = []
    for p in [ROCK_HAS] + ROCKS_FAR:
        out += [{'type': 'circle', 'at': p, 'r': SZ['burst'], 'color': 'death'}, {'type': 'xmark', 'at': p}]
    return out
def gaol_marks(points):
    return [{'type': 'circle', 'at': p, 'r': SZ['gaol'] + 2, 'color': 'generic', '_nocheck': True} for p in points]
C = S(
    id='uwu-p3-gaols', phase='P3 泰坦',
    title='大激震 → 三連岩牢 → 地裂斬(自滅法)',
    body=(
        "### 大激震(讀條)\n"
        "- **形狀**:以泰坦為中心的**全場擊退 24m**,擊退前先附加 **2 秒暈眩**\n"
        "- ⚠ **防擊退技能(沉穩詠唱 / 親疏自行)無效** → 只能靠**站位**決定飛去哪裡\n"
        "- 同時,**剛才躲大地粉碎的那一側**會落下 5 顆**爆破岩石**(落地瞬間就有判定,約 2.5 秒後大爆炸,半徑 6.3m)\n"
        "  - 靠中央的**兩顆會隨機缺一顆** → 缺角的位置就是擊退後的落點\n\n"
        "**站位**:\n"
        "1. 衰減一結束就**馬上往泰坦靠近**。泰坦這時站在**原本的場邊**(離中心約 20m)。\n"
        "2. 確認中間兩顆岩石**缺的是哪一顆**。\n"
        "3. 利用泰坦的**目標圈**:圈的尖端此時剛好**指向場地正中央**。缺左邊就站尖端的**左側**、缺右邊就站**右側**,**貼著紅圈內側**(離尖端約 9° 的位置),就會被擊退到缺角的空位。\n"
        "4. 落地後,**剛才的落點馬上又會落下一顆岩石** → 立刻往**外周的前方**移動。這顆岩石之後就是岩牢的引爆源。\n"
        "> ⚠ 絕神兵的落石**落地瞬間也有類似炸彈的即死判定**,不要站在落點上。\n"
        "### 三連岩牢(花崗岩牢獄)\n"
        "- 擊退後,**一仇以外的隨機 3 人**頭上出現點名標記,**約 4 秒後**被**拘束**,原地生成**花崗石牢**\n"
        "- 石牢被**岩石的爆炸**破壞時,會再發生**半徑 6m 的爆炸**,並在原地留下**汙泥**\n"
        "  - 汙泥:**泰坦踩到會獲得以太供應** → 這就是本階段的**覺醒條件**(玩家踩到會掛「汙泥」)\n"
        "  - **用技能打壞的石牢不會爆炸、也不會留汙泥** → 三連岩牢一定要靠岩石連鎖\n"
        "- 沒有及時破壞的話,石牢會讀**花崗岩衝擊** → 全屏高傷害\n"
        "### 自滅法的固定站位\n"
        "存活的 4 人中,岩牢**必定點 {{healer:H1}}、{{healer:H2}}、{{dps:D4}}**。三人沿著「**泰坦 → 中央**」排成**一列**,讓岩石的爆炸一路連鎖到泰坦腳下:\n"
        "| 位置 | 成員 |\n|---|---|\n"
        "| 離泰坦**最近**(泰坦與中央之間) | {{dps:D4}}(法系) |\n"
        "| **1 號標記**(中央) | {{healer:H1}} |\n"
        "| 離泰坦**最遠**:擊退落點旁(剛落下的岩石) | {{healer:H2}} |\n\n"
        "爆炸依 **岩石 → H2 → H1 → D4** 連鎖,汙泥一路延伸到泰坦腳下,**泰坦踩上去就會覺醒**。"
        "缺角在哪一側,H2 就站哪一側。\n"
        "> 連鎖的條件:相鄰兩人的距離要在**約 7.5m 以內**(石牢爆炸 6m + 石牢本體 1.8m),D4 要離泰坦**約 11m 以內**,汙泥才碰得到泰坦。\n"
        "### 地裂斬 ×2\n"
        "- **形狀**:泰坦朝**一仇以外隨機一人**的方向放直線,再加 **±45°、±135°**,共 **5 道寬 6m 的直線**,附加**大幅擊退**\n"
        "- **第 1 發**:擊退落地後全隊往**外周的前方**走,把直線**引導到外周、稍微偏一點**:主線與「泰坦 → 中央」的連線**錯開約 20°**,岩牢那一列就會落在**主線與 45° 線之間的縫隙**,不會被打到\n"
        "  - 蓋到了的話,岩牢組**看著詠唱約 8 成時衝進去**:第 1 發是有判定的,要抓**不被打中的極限時機**;拘束大約在第 1 發判定時上身,實際上很趕\n"
        "- **第 2 發**:中央一帶是岩牢爆炸的即死範圍,{{tank:MT}} 迴避時**絕對不能靠近中央**。關在岩牢裡的人是**無敵**的,不用幫他們閃\n"
        "### 激震 ×8(連續全體)\n"
        "- 岩牢期間泰坦會放**連續 8 段**的全體攻擊 → 補師脫困後立刻治療\n"
        "- 復活在**中央偏泰坦**的位置進行,群補也放在中央或靠近泰坦。召喚士的即刻詠唱不夠用時要**在旁邊讀條拉人** —— 這也是把法系排在最前面的原因\n"
        "- 陣亡者**等第 1 發地裂斬判定結束後再接受復活**(影片裡起得稍早了一點)"
    ),
    roleNotes={
        'MT': '擊退前站在目標圈尖端的**缺角那一側、貼著紅圈內側**。落地後往外周前方走,把第 1 發地裂斬的主線引導成與岩牢那一列**錯開約 20°**;第 2 發**絕對不要往中央閃**(岩牢爆炸即死)。',
        'H1': '岩牢必點你:站**1 號標記(中央)**。脫困後立刻群補撐激震。',
        'H2': '岩牢必點你:站**離泰坦最遠**、在**擊退落點旁**(剛落下的那顆岩石)—— 連鎖從你開始。',
        'D4': '岩牢必點你:站**離泰坦最近**的位置,汙泥要延伸到泰坦腳下。脫困後**讀條拉人**(召喚士即刻詠唱不夠用)。',
        'ST': '陣亡中。**等第 1 發地裂斬判定結束後**再接受復活。',
        'D1-D3': '陣亡中。**等第 1 發地裂斬判定結束後**再接受復活。',
    },
    steps=[
        {
            'caption': '衰減結束 → 馬上靠近泰坦(站在原本的場邊,離中心約 20m)。剛才躲避的那一側落下 5 顆岩石,中間兩顆隨機缺一顆(示例:缺北邊那顆)。泰坦目標圈的尖端指向場地中央,缺哪邊就站尖端的那一側、貼著紅圈內側',
            'boss': {'x': TITAN_B[0], 'y': 0, 'facing': 270},
            'actors': kb_pre,
            'aoes': [shrink(SZ['arena1'])] + rocks_first() + [
                {'type': 'circle', 'at': TITAN_B, 'r': SZ['titanHit'], 'color': 'generic', '_nocheck': True},
            ] + corpses,
            'annotations': [
                {'type': 'text', 'at': [ROCK_GAP[0], ROCK_GAP[1] - 2], 'text': '缺角', 'color': 'blue'},
                {'type': 'text', 'at': [0, -104], 'text': '缺哪邊站哪邊 · 貼紅圈內側', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '岩石配置依影片示意圖量測', 'color': 'yellow'},
            ],
        },
        {
            'caption': '大激震:先暈眩 2 秒,再從泰坦中心擊退 24m —— 防擊退無效。站對位置就會剛好落在缺角的空位。外側的岩石約 2.5 秒後爆炸',
            'boss': {'x': TITAN_B[0], 'y': 0, 'facing': 270},
            'actors': kb_post,
            'aoes': [shrink(SZ['arena1'])] + rocks_first() + corpses,
            'annotations': [
                {'type': 'arrow', 'from': STAND, 'to': [LAND[0] + 9, LAND[1] + 2], 'color': 'white'},
                {'type': 'knockback', 'at': TITAN_B, 'count': 8, 'rInner': 24, 'rOuter': 40, 'color': 'red'},
                {'type': 'text', 'at': [0, -104], 'text': '擊退 24m · 防擊退無效', 'color': 'red'},
            ],
        },
        {
            'caption': '落地點馬上又落下一顆岩石(之後的引爆源)→ 立刻往外周的前方走,把第 1 發地裂斬(5 道直線)引導到外周:主線與「泰坦 → 中央」錯開約 20°。同時岩牢點名 H1、H2、D4(約 4 秒後拘束)',
            'boss': {'x': TITAN_B[0], 'y': 0, 'facing': phi1},
            'actors': bait,
            'aoes': [
                shrink(SZ['arena1']),
                {'type': 'circle', 'at': LAND, 'r': SZ['burst'], 'color': 'death', '_nocheck': True},
                {'type': 'xmark', 'at': LAND},
            ] + landslide(TITAN_B, phi1) + corpses,
            'markers': [{'type': 'target', 'at': 'H1'}, {'type': 'target', 'at': 'H2'}, {'type': 'target', 'at': 'D4'}],
            'annotations': [
                {'type': 'arrow', 'from': [LAND[0] - 2, LAND[1] - 8], 'to': [BAIT[0] + 2, BAIT[1] + 12], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '沿外周往前 · 引導第 1 發', 'color': 'yellow'},
            ],
        },
        {
            'caption': '岩牢組在第 1 發判定結束時站進固定位置:D4 在泰坦與中央之間、H1 在 1 號(中央)、H2 在擊退落點旁(剛落下的岩石)。這一列剛好在第 1 發主線與 45° 線之間的縫隙。拘束上身後,MT 在外側躲第 2 發地裂斬,絕對不要往中央閃',
            'boss': {'x': TITAN_B[0], 'y': 0, 'facing': phi2},
            'actors': gaol_pos,
            'aoes': [
                shrink(SZ['arena1']),
                {'type': 'circle', 'at': LAND, 'r': SZ['burst'], 'color': 'death', '_nocheck': True},
                {'type': 'xmark', 'at': LAND},
            ] + landslide(TITAN_B, phi2, color='ice') + gaol_marks([GAOL_H2, GAOL_H1, GAOL_D4]) + corpses,
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '岩牢內無敵 · MT 遠離中央', 'color': 'yellow'},
            ],
        },
        {
            'caption': '岩石爆炸 → H2 → H1 → D4 的石牢依序被炸開(各自再爆半徑 6m),留下的汙泥一路延伸到泰坦腳下 → 泰坦踩上去就會累積以太供應。接著是連續 8 段的激震:脫困的補師立刻治療,在中央偏泰坦的位置拉人',
            'boss': {'x': TITAN_B[0], 'y': 0, 'facing': 270},
            'actors': gaol_pos,
            'aoes': [
                shrink(SZ['arena1']),
                {'type': 'circle', 'at': LAND, 'r': SZ['burst'], 'color': 'death', '_nocheck': True},
                {'type': 'circle', 'at': GAOL_H2, 'r': SZ['freefire'], 'color': 'void', '_nocheck': True},
                {'type': 'circle', 'at': GAOL_H1, 'r': SZ['freefire'], 'color': 'void', '_nocheck': True},
                {'type': 'circle', 'at': GAOL_D4, 'r': SZ['freefire'], 'color': 'void', '_nocheck': True},
            ] + corpses,
            'annotations': [
                
                {'type': 'arrow', 'from': [GAOL_H2[0] + 8, GAOL_H2[1] + 3], 'to': [GAOL_H1[0] - 8, GAOL_H1[1] - 1], 'color': 'white', 'dash': True},
                {'type': 'arrow', 'from': [GAOL_H1[0] + 9, 0], 'to': [GAOL_D4[0] - 9, 0], 'color': 'white', 'dash': True},
                {'type': 'arrow', 'from': [LAND[0] + 6, LAND[1] + 4], 'to': [GAOL_H2[0] - 6, GAOL_H2[1] - 2], 'color': 'white', 'dash': True},
                {'type': 'text', 'at': [0, -104], 'text': '岩石 → H2 → H1 → D4 → 泰坦腳下', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '激震 ×8 · 在中央偏泰坦處拉人', 'color': 'red'},
            ],
        },
    ],
)
check(C['id'], 1, C['steps'][1], arena_r=SZ['arena1'])
check(C['id'], 2, C['steps'][2], arena_r=SZ['arena1'], hit_ok=('MT', 'H1', 'H2', 'D4'))
check(C['id'], 3, C['steps'][3], arena_r=SZ['arena1'], hit_ok=('H1', 'H2', 'D4'))

# ─── D. 復活 → 大地之重 → 覺醒地裂斬 ───────────
TITAN_D = list(TITAN_B)
sludge = [{'type': 'circle', 'at': p, 'r': SZ['sludge'], 'color': 'void'} for p in (GAOL_H2, GAOL_H1, GAOL_D4)]
revive = {
    'MT': {'x': 60, 'y': -40},
    'H1': {'x': 22, 'y': -46}, 'H2': {'x': 4, 'y': -50}, 'D4': {'x': 34, 'y': -50},
    'ST': {'x': 14, 'y': -58}, 'D1': {'x': 28, 'y': -62},
    'D2': {'x': 0, 'y': -64}, 'D3': {'x': 16, 'y': -70},
}
GW = [-10, -52]
grp_w = {
    'MT': {'x': 28, 'y': -10},
    'ST': {'x': GW[0] - 6, 'y': GW[1] + 2}, 'D1': {'x': GW[0] + 6, 'y': GW[1] + 2},
    'D2': {'x': GW[0], 'y': GW[1] - 5}, 'D3': {'x': GW[0] - 4, 'y': GW[1] + 8},
    'H1': {'x': GW[0] + 5, 'y': GW[1] + 9}, 'H2': {'x': GW[0] - 8, 'y': GW[1] - 6}, 'D4': {'x': GW[0] + 9, 'y': GW[1] - 4},
}
phiD = bearing(TITAN_D, GW)
GD1, GD2, MTD = ls_spots(TITAN_D, phiD, SZ['arena1'], near=at(TITAN_D, phiD + 22.5, 90), mt_near=[60, 40], extra=sludge)

D = S(
    id='uwu-p3-awake', phase='P3 泰坦',
    title='復活 → 大地之重 → 覺醒 · 覺醒地裂斬',
    body=(
        "### 剛復活的人\n"
        "- 起來之後**馬上有汙泥的即死範圍與連續全體攻擊** → 在補到足夠的血之前,**維持復活無敵、往遠離汙泥的方向走,先不要攻擊**\n"
        "- 法系若是召喚士,即刻詠唱不夠用,激震期間要**在旁邊讀條拉人**\n"
        "### 大地之重 ×2\n"
        "- 全員集合,像**畫圓**一樣繞著泰坦把兩輪重力排好\n"
        "### 覺醒\n"
        "- 汙泥有讓泰坦踩到的話,**以太供應會累積,在這裡覺醒**\n"
        "### 覺醒地裂斬(二連)\n"
        "- 第 1 發照常 5 道;約 **2 秒後**追加第 2 發 5 道,方向是第 1 發主線的 **±22.5°、±90°、正後方**,**沒有預兆**\n"
        "- **兩發的範圍不重疊** → **第 1 發的範圍就是第 2 發的安全區**:第 1 發一結束就**衝進剛才的直線裡**\n"
        "> 如果泰坦這時**沒有覺醒**,就只有第 1 發,但後面的流程照舊,等於少了一次以太供應 —— 拿不到突破極限。"
    ),
    roleNotes={
        'MT': '激震期間把泰坦帶到汙泥上(汙泥延伸到牠腳下即可)。覺醒地裂斬時站在**第 1、2 發都打不到的縫隙**,或照口訣跟著衝回第 1 發的位置。',
        'ST': '剛復活:**先不要攻擊**,維持無敵遠離汙泥,等血補滿再接手。',
        'H1 H2': '脫困後馬上群補撐激震 ×8,再補剛復活的人。',
        'D1-D3': '剛復活:**先不要攻擊**,維持無敵遠離汙泥。覺醒地裂斬記得**衝回第 1 發的位置**。',
        'D4': '激震期間**讀條拉人**;召喚士的即刻詠唱不夠用。',
    },
    steps=[
        {
            'caption': '石牢炸開後留下汙泥(依影片示意圖約半徑 7m;玩家踩到很危險)。復活在**中央偏泰坦**的位置進行;剛起來的人**維持無敵、遠離汙泥、先不要攻擊**,等血補上來。**激震 ×8** 期間補師全力治療',
            'boss': {'x': TITAN_D[0], 'y': 0, 'facing': 300},
            'actors': revive,
            'aoes': [shrink(SZ['arena1'])] + sludge,
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '剛復活:先別打,遠離汙泥', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '汙泥大小依影片示意圖(BossMod 未建模)', 'color': 'yellow'},
            ],
        },
        {
            'caption': '**大地之重 ×2**:全員集合,像**畫圓**一樣繞著泰坦把兩輪重力排好。泰坦若有踩到汙泥,**在這裡覺醒**',
            'boss': {'x': TITAN_D[0], 'y': 0, 'facing': 300},
            'actors': grp_w,
            'aoes': [shrink(SZ['arena1']),
                     {'type': 'circle', 'at': [GW[0] + 22, GW[1] + 30], 'r': SZ['weight'], 'color': 'fire', '_nocheck': True},
                     {'type': 'circle', 'at': GW, 'r': SZ['weight'], 'color': 'fire', '_nocheck': True}],
            'annotations': [
                {'type': 'arcArrow', 'radius': 64, 'startAngle': 330, 'endAngle': 300, 'dir': 'ccw', 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '畫圓排重力 → 覺醒', 'color': 'yellow'},
            ],
        },
        {
            'caption': '**覺醒地裂斬第 1 發**:朝一仇以外隨機一人放主線,加 ±45°、±135° 共 5 道。全隊先閃到**直線之間的縫隙**',
            'boss': {'x': TITAN_D[0], 'y': 0, 'facing': phiD},
            'actors': cluster(GD1, MTD, spread=3),
            'aoes': [shrink(SZ['arena1'])] + landslide(TITAN_D, phiD),
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '第 1 發:5 道直線', 'color': 'yellow'}],
        },
        {
            'caption': '約 2 秒後**無預兆的第 2 發**:主線的 ±22.5°、±90°、正後方 → **剛才的縫隙會被打**。第 1 發一結束就**衝進第 1 發的直線裡** —— 兩發的範圍不重疊',
            'boss': {'x': TITAN_D[0], 'y': 0, 'facing': phiD},
            'actors': cluster(GD2, MTD, spread=3),
            'aoes': [shrink(SZ['arena1'])] + landslide(TITAN_D, phiD, second=True, color='death'),
            'annotations': [
                {'type': 'arrow', 'from': [GD1[0] - 6, GD1[1] + 8], 'to': [GD2[0] + 6, GD2[1] - 6], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '第 2 發 → 衝回第 1 發的位置', 'color': 'red'},
            ],
        },
    ],
)
check(D['id'], 2, D['steps'][2], arena_r=SZ['arena1'])
check(D['id'], 3, D['steps'][3], arena_r=SZ['arena1'])
# 第 1 發的位置也要閃得過第 2 發、MT 兩發都安全
tmp = dict(D['steps'][2]); tmp['aoes'] = landslide(TITAN_D, phiD, second=True)
check(D['id'], '2/second', tmp, arena_r=SZ['arena1'], hit_ok=tuple(r for r in grp_w if r != 'MT'))
tmp = dict(D['steps'][3]); tmp['aoes'] = landslide(TITAN_D, phiD)
check(D['id'], '3/first', tmp, arena_r=SZ['arena1'], hit_ok=tuple(r for r in grp_w if r != 'MT'))

# ─── E. 第二次大地粉碎 → 單岩牢 → 覺醒地裂斬 → 激震 ×6 ──
TITAN_A = [0, -TITAN_JUMP]
TITAN_E = [0, -76]
run_s = cluster([0, 44], [0, 30], spread=3)
gath = cluster([2, 10], [0, -50])
gath['H1'] = {'x': -24, 'y': 14}
phiE = bearing(TITAN_E, [2, 10])
GE1, GE2, MTE = ls_spots(TITAN_E, phiE, SZ['arena2'], near=at(TITAN_E, phiE - 22.5, 80), mt_near=[-30, -46])
e_first = cluster(GE1, MTE, spread=3)
e_second = cluster(GE2, MTE, spread=3)
E = S(
    id='uwu-p3-gaol2', phase='P3 泰坦',
    title='第二次大地粉碎 → 單岩牢 → 覺醒地裂斬 → 激震',
    body=(
        "### 大地粉碎(第二次跳躍)\n"
        "- **{{tank:MT}} 盡量把泰坦拉到正中央** —— 這次場地會**縮到半徑 12m**,轉向判斷**不能有任何妥協**\n"
        "- 判斷方式同第一次:看轉向 → 往反方向退\n"
        "- 落地後 {{tank:MT}} 把泰坦**稍微往外拉一點**,其他人到**中央**集合\n"
        "### 單岩牢\n"
        "- **點名 1 人**(影片中是 {{healer:H1}}),約 5 秒後拘束\n"
        "- 這次**直接用技能把岩牢打爆**就好 —— 用技能打壞不會爆炸、也不會留汙泥\n"
        "- 約 7 秒內沒打壞就會讀**花崗岩衝擊**(全屏高傷害)\n"
        "- ⚠ {{tank:MT}} 若把泰坦拉得**離岩牢太近**,被關的人脫困後很難躲接下來的地裂斬\n"
        "### 覺醒地裂斬(二連)\n"
        "- 同上一節:**第 2 發要衝回第 1 發的位置**,別忘了\n"
        "### 激震 ×6\n"
        "- 連續全體攻擊,**確實做好減傷**\n"
        "- 這段期間 **{{tank:MT}} 移動到外周**,準備接第 2 組死刑"
    ),
    roleNotes={
        'MT': '跳之前**把泰坦拉到正中央**(場地會縮到 12m)。落地後稍微往外拉,**別拉得離岩牢太近**。激震期間移到外周準備第 2 組死刑。',
        'ST': '中央集合打岩牢;激震時給 MT 減傷,準備好接第 2/3 組死刑的分工。',
        'H1': '影片中這次岩牢點到你;被關時是無敵的,脫困後馬上躲地裂斬。',
        'H2': '激震 ×6 的主要治療,配合減傷。',
        'D1-D4': '中央集合,**用技能把岩牢打爆**;接著覺醒地裂斬衝回第 1 發的位置。',
    },
    steps=[
        {
            'caption': 'MT **把泰坦拉到正中央**。泰坦瞬間轉向(範例:面向 **A**)→ 往 A 跳。全員**往反方向(C 側)**退。這次跳完場地會**縮到半徑 12m**,判斷不能妥協',
            'boss': {'x': 0, 'y': 0, 'facing': 0},
            'actors': run_s,
            'aoes': [shrink(SZ['arena1'])],
            'annotations': [
                {'type': 'arrow', 'from': [0, -26], 'to': [0, TITAN_A[1] + 4], 'color': 'red', 'dash': True},
                {'type': 'text', 'at': [0, -104], 'text': '面向 A → 跳向 A → 退到 C', 'color': 'yellow'},
            ],
        },
        {
            'caption': '泰坦落在 **A 點外側**,發出距離衰減的大地粉碎;**場地縮成半徑 12m**',
            'boss': {'x': 0, 'y': TITAN_A[1], 'facing': 180},
            'actors': cluster([0, 44], [-10, 38], spread=3),
            'aoes': [{'type': 'circle', 'at': TITAN_A, 'r': SZ['geocrush2'], 'color': 'ice'},
                     shrink(SZ['arena2'])],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '場地縮成半徑 12m', 'color': 'red'}],
        },
        {
            'caption': 'MT 把泰坦**稍微往外拉**,其他人到**中央集合**。**單岩牢**點名 1 人(影片中是 H1)→ **直接用技能打爆**。MT 別把泰坦拉得離岩牢太近',
            'boss': {'x': TITAN_E[0], 'y': TITAN_E[1], 'facing': 0},
            'actors': gath,
            'aoes': [shrink(SZ['arena2'])] + gaol_marks([[-24, 14]]),
            'markers': [{'type': 'target', 'at': 'H1'}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '單岩牢:直接打爆', 'color': 'yellow'}],
        },
        {
            'caption': '**覺醒地裂斬第 1 發** → 閃到直線之間的縫隙',
            'boss': {'x': TITAN_E[0], 'y': TITAN_E[1], 'facing': phiE},
            'actors': e_first,
            'aoes': [shrink(SZ['arena2'])] + landslide(TITAN_E, phiE),
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '第 1 發', 'color': 'yellow'}],
        },
        {
            'caption': '**第 2 發**(±22.5°、±90°、正後方)→ **衝回第 1 發的位置**。接著**激震 ×6**,做好減傷;**MT 這段期間移動到外周**準備第 2 組死刑',
            'boss': {'x': TITAN_E[0], 'y': TITAN_E[1], 'facing': phiE},
            'actors': e_second,
            'aoes': [shrink(SZ['arena2'])] + landslide(TITAN_E, phiE, second=True, color='death'),
            'annotations': [
                {'type': 'arrow', 'from': [GE1[0] + 6, GE1[1] - 4], 'to': [GE2[0] - 7, GE2[1] - 2], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '衝回第 1 發 → 激震 ×6', 'color': 'red'},
            ],
        },
    ],
)
check(E['id'], 1, E['steps'][1], arena_r=SZ['arena2'])
check(E['id'], 2, E['steps'][2], arena_r=SZ['arena2'])
check(E['id'], 3, E['steps'][3], arena_r=SZ['arena2'])
check(E['id'], 4, E['steps'][4], arena_r=SZ['arena2'])
tmp = dict(E['steps'][4]); tmp['aoes'] = landslide(TITAN_E, phiE)
check(E['id'], '4/first', tmp, arena_r=SZ['arena2'], hit_ok=tuple(r for r in gath if r != 'MT'))
tmp = dict(E['steps'][3]); tmp['aoes'] = landslide(TITAN_E, phiE, second=True)
check(E['id'], '3/second', tmp, arena_r=SZ['arena2'], hit_ok=tuple(r for r in gath if r != 'MT'))

# ─── F. 第 2 組死刑 → 三連重力 + 覺醒地裂斬 → 第 3 組死刑 → 狂暴 ──
TITAN_W = [-26, 0]
MT_W = [-44, 0]
behind = cluster([8, 0], MT_W)
BOMBS = [[8, 8], [-8, 8], [8, -8], [-8, -8]]
bombs = [{'type': 'circle', 'at': p, 'r': SZ['burst'], 'color': 'death'} for p in BOMBS]
GF0 = [-48, -6]
f_gather = cluster(GF0, [-50, 6], spread=3)
GF = at(CENTER, 330, 51)     # 順時針到西北偏北
MTF = at(CENTER, 205, 54)    # 逆時針到西南
TITAN_F = at(CENTER, 222, 30)
f_split = cluster(GF, MTF, spread=3)
phiF = bearing(TITAN_F, GF)
GF1, GF2, MTL = ls_spots(TITAN_F, phiF, SZ['arena2'], near=GF, mt_near=MTF, extra=bombs)
f_ls1 = cluster(GF1, MTL, spread=3)
f_ls2 = cluster(GF2, MTL, spread=3)
TITAN_G = at(CENTER, 205, 32)
f_cleave3 = cluster(GF2, MTF, spread=3)
phiG = bearing(TITAN_G, MTF)
F = S(
    id='uwu-p3-end', phase='P3 泰坦',
    title='收尾:第 2 組死刑 → 三連大地之重 → 第 3 組死刑 → 討伐',
    body=(
        "### 第 2 組死刑(碎岩 → 山崩)\n"
        "- {{tank:MT}} 在**外周**承受;接完後**全員往 MT 的方向集合**\n"
        "- ⚠ **第 2 組死刑後一定要往外周走** —— 中央附近會**落下 4 顆岩石爆炸**,能用的空間只剩**外周邊緣**。這點**一定會忘**,請記住\n"
        "- 近戰這段基本上打不到王,但輸出仍然足夠\n"
        "### 三連大地之重 + 覺醒地裂斬\n"
        "- 全員集合把第一輪重力排好後:\n"
        "  - **{{tank:MT}} 以外的人**:**順時針**沿著重力往外周移動\n"
        "  - **{{tank:MT}}**:一邊排重力,一邊往**遠離大部隊的方向逆時針**移動 → 兩邊分開,安全區變大\n"
        "- 不要忘記躲**覺醒地裂斬的第二下**(衝回第 1 發的位置)\n"
        "- **負責逆時針引導的人 = 吃第 3 組死刑的人**\n"
        "### 第 3 組死刑\n"
        "- 與第 1 組**剛好相隔約 2 分鐘**:影片是戰士用**無敵**吃完全部;**MT / ST 交替吃**也是好選擇\n"
        "- 為了下一階段,**2 分鐘爆發 Buff 稍微提早開**\n"
        "### 三連大地之重 → 激震 ×8 → 狂暴\n"
        "- 這次重力**隨便往中央排**就好,之後普攻打到狂暴\n"
        "- **狂暴**:泰坦**變成不可選中**後讀**大地之怒** → 滅團。即使前面自滅少了 4 人,DPS 也完全足夠\n"
        "### 討伐與拾取\n"
        "- 打倒泰坦後,**近戰({{dps:D1}})馬上趕去撿突破極限** —— 三隻蠻神的最後一個(迦樓羅 → H2、伊弗利特 → D4、泰坦 → D1)\n"
        "- 接著有**從中央來的距離衰減**:影片的做法是**全員先在中央集合、把 HP 補滿**就沒問題\n"
        "- 之後進入 **LB 階段**"
    ),
    roleNotes={
        'MT': '激震 ×6 期間先移到外周吃第 2 組死刑。三連重力時**逆時針**往遠離大部隊的方向帶 → 你就是吃第 3 組死刑的人(或與 ST 交替)。',
        'ST': '第 3 組死刑若採交替,由**負責逆時針引導的人**接;沒交替就給 MT 減傷。',
        'H1 H2': '第 2 組死刑後跟大部隊**往外周走**,中央會落石爆炸。',
        'D1': '第 2 組死刑後這段打不到王沒關係。**打倒泰坦後馬上去撿突破極限**。',
        'D2-D4': '三連重力時**順時針**沿外周移動。第 3 組死刑前把 **2 分鐘爆發提早開**,為下一階段準備。',
    },
    steps=[
        {
            'caption': '激震 ×6 期間 MT 已經把泰坦帶到**外周**(範例:西側,面向場外)。**第 2 組死刑**由 MT 承受,其他人待在泰坦背面',
            'boss': {'x': TITAN_W[0], 'y': 0, 'facing': 270},
            'actors': behind,
            'aoes': [
                shrink(SZ['arena2']),
                {'type': 'cone', 'at': TITAN_W, 'angle': 270, 'spread': SZ['mtnSpread'], 'r': SZ['mtnR'], 'color': 'thunder'},
                {'type': 'cone', 'at': TITAN_W, 'angle': 270, 'spread': SZ['rockSpread'], 'r': SZ['rockR'], 'color': 'thunder'},
            ],
            'markers': [{'type': 'target', 'at': 'MT'}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '第 2 組死刑:外周承受', 'color': 'yellow'}],
        },
        {
            'caption': '⚠ **接完死刑全員往 MT 的方向、往外周走** —— **中央會落下 4 顆岩石**,稍後爆炸,只剩外周邊緣能用。在這裡集合丟下**三連大地之重**的第一輪',
            'boss': {'x': TITAN_W[0], 'y': 0, 'facing': 270},
            'actors': f_gather,
            'aoes': [shrink(SZ['arena2'])] + bombs + [{'type': 'circle', 'at': GF0, 'r': SZ['weight'], 'color': 'fire', '_nocheck': True}],
            'annotations': [
                {'type': 'arrow', 'from': [6, -8], 'to': [-38, -16], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '⚠ 死刑後往外周走', 'color': 'red'},
                {'type': 'text', 'at': [0, 104], 'text': '中央 4 顆岩石的位置為示意', 'color': 'yellow'},
            ],
        },
        {
            'caption': '三連大地之重:**MT 以外的人順時針**沿外周排重力,**MT 逆時針**往遠離大部隊的方向帶 —— 兩邊分開,安全區變大。**逆時針的人就是吃第 3 組死刑的人**',
            'boss': {'x': TITAN_F[0], 'y': TITAN_F[1], 'facing': bearing(TITAN_F, MTF)},
            'actors': f_split,
            'aoes': [shrink(SZ['arena2'])] + bombs,
            'annotations': [
                {'type': 'arcArrow', 'radius': 54, 'startAngle': 290, 'endAngle': 335, 'color': 'white'},
                {'type': 'arcArrow', 'radius': 54, 'startAngle': 255, 'endAngle': 212, 'dir': 'ccw', 'color': 'blue'},
                {'type': 'text', 'at': [0, -104], 'text': '大部隊順時針 · MT 逆時針', 'color': 'yellow'},
            ],
        },
        {
            'caption': '**覺醒地裂斬第 1 發**(朝大部隊方向)→ 閃到直線之間',
            'boss': {'x': TITAN_F[0], 'y': TITAN_F[1], 'facing': phiF},
            'actors': f_ls1,
            'aoes': [shrink(SZ['arena2'])] + bombs + landslide(TITAN_F, phiF),
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '第 1 發', 'color': 'yellow'}],
        },
        {
            'caption': '**第 2 發** → 衝回第 1 發的位置。之後中央的 4 顆岩石爆炸',
            'boss': {'x': TITAN_F[0], 'y': TITAN_F[1], 'facing': phiF},
            'actors': f_ls2,
            'aoes': [shrink(SZ['arena2'])] + bombs + landslide(TITAN_F, phiF, second=True, color='death'),
            'annotations': [
                {'type': 'arrow', 'from': [GF1[0], GF1[1] - 6], 'to': [GF2[0] + 4, GF2[1] + 6], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '別忘了第二下', 'color': 'red'},
            ],
        },
        {
            'caption': '**第 3 組死刑**:由剛才**逆時針引導的人**承受(影片是戰士開無敵吃完全部;MT/ST 交替也可以)。**2 分鐘爆發提早開**,之後三連大地之重隨便往中央排,打到狂暴前擊殺',
            'boss': {'x': TITAN_G[0], 'y': TITAN_G[1], 'facing': phiG},
            'actors': f_cleave3,
            'aoes': [
                shrink(SZ['arena2']),
                {'type': 'cone', 'at': TITAN_G, 'angle': phiG, 'spread': SZ['mtnSpread'], 'r': SZ['mtnR'], 'color': 'thunder'},
                {'type': 'cone', 'at': TITAN_G, 'angle': phiG, 'spread': SZ['rockSpread'], 'r': SZ['rockR'], 'color': 'thunder'},
            ],
            'markers': [{'type': 'target', 'at': 'MT'}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '第 3 組死刑 · 爆發提早開', 'color': 'yellow'}],
        },
        {
            'caption': '打倒泰坦 → **D1 馬上去撿突破極限**(第三個,集滿)。接著有**從中央來的距離衰減**,影片的做法是**全員先到中央集合、把 HP 補滿**,然後進入 LB 階段',
            'boss': None,
            'actors': cluster([0, 4], [-8, -8], spread=4) | {'D1': {'x': TITAN_G[0], 'y': TITAN_G[1]}},
            'aoes': [shrink(SZ['arena2'])],
            'markers': [{'type': 'target', 'at': 'D1'}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': 'D1 撿泰坦的突破極限', 'color': 'yellow'}],
        },
    ],
)
check(F['id'], 0, F['steps'][0], arena_r=SZ['arena2'], hit_ok=('MT',))
check(F['id'], 1, F['steps'][1], arena_r=SZ['arena2'])
check(F['id'], 2, F['steps'][2], arena_r=SZ['arena2'])
check(F['id'], 3, F['steps'][3], arena_r=SZ['arena2'], skip_types=())
check(F['id'], 4, F['steps'][4], arena_r=SZ['arena2'])
tmp = dict(F['steps'][4]); tmp['aoes'] = landslide(TITAN_F, phiF)
check(F['id'], '4/first', tmp, arena_r=SZ['arena2'], hit_ok=tuple(r for r in f_ls2 if r != 'MT'))
tmp = dict(F['steps'][3]); tmp['aoes'] = landslide(TITAN_F, phiF, second=True)
check(F['id'], '3/second', tmp, arena_r=SZ['arena2'], hit_ok=tuple(r for r in f_ls1 if r != 'MT'))
check(F['id'], 5, F['steps'][5], arena_r=SZ['arena2'], hit_ok=('MT',))

# ─── 速查卡 ───────────────────────────────
CARDS = [
    {'id': 'p3-geocrush', 'phase': 'P3 泰坦', 'title': '大地粉碎(跳躍)', 'tag': '核心', 'color': 'ice', 'points': [
        '泰坦**瞬間轉向** → 往**面向的方向**跳到場邊正點 → 距離衰減',
        '口訣:**看轉向,往反方向退**',
        '{{tank:MT}} 要把泰坦**固定在正中央**,轉向才好判斷',
        '每跳一次場地外圈變即死區:**20m → 16m → 12m**',
    ]},
    {'id': 'p3-upheaval', 'phase': 'P3 泰坦', 'title': '大激震', 'tag': '擊退', 'color': 'ice', 'points': [
        '全場**擊退 24m**,先附加 2 秒暈眩 —— **防擊退無效**',
        '中間兩顆岩石**隨機缺一顆** → 被擊退到缺角的位置',
        '站在泰坦**目標圈尖端的左/右、貼著紅圈內側**',
        '落地點**馬上會再落石** → 沿外周往前方走',
    ]},
    {'id': 'p3-gaols', 'phase': 'P3 泰坦', 'title': '三連岩牢(自滅法)', 'tag': 'P3 核心', 'color': 'void', 'points': [
        '第二輪大地之重:**ST、D1、D2、D3 站著吃**陣亡 → 岩牢必點 {{healer:H1}}、{{healer:H2}}、{{dps:D4}}',
        '排一列:**D4 最靠泰坦、H1 在 1 號(中央)、H2 在擊退落點旁**',
        '靠**岩石的爆炸**連鎖炸開 → 汙泥延伸到泰坦腳下 → **覺醒**',
        '用技能打壞**不會留汙泥**;陣亡者等第 1 發地裂斬後再起來',
    ]},
    {'id': 'p3-landslide', 'phase': 'P3 泰坦', 'title': '地裂斬', 'tag': '直線', 'color': 'ice', 'points': [
        '朝**一仇以外隨機一人** + ±45°、±135°,共 **5 道寬 6m** 直線 + 擊退',
        '**覺醒後**約 2 秒追加 5 道(±22.5°、±90°、正後方),**無預兆**',
        '口訣:**第 1 發的範圍 = 第 2 發的安全區** → 衝回第 1 發的位置',
        '岩牢時的第 1 發:主線與「泰坦 → 中央」**錯開約 20°**,岩牢那列落在縫隙裡',
    ]},
    {'id': 'p3-weight', 'phase': 'P3 泰坦', 'title': '大地之重', 'tag': '走位', 'color': 'fire', 'points': [
        '每人腳下**半徑 6m** 圓,連續 2 輪(最後兩次 3 輪)',
        '集合丟,**沿著泰坦順時針/逆時針**繞開',
        '最後一次三連:大部隊**順時針**、{{tank:MT}} **逆時針**分開',
    ]},
    {'id': 'p3-buster', 'phase': 'P3 泰坦', 'title': '碎岩 → 山崩(二連死刑)', 'tag': '坦克', 'color': 'thunder', 'points': [
        '無讀條,朝一仇的扇形二連,**山崩**傷害極高 → 開滿減傷',
        'P3 共 **3 組**:第 1 組與第 3 組**相隔約 2 分鐘**',
        '⚠ **第 2 組後一定要往外周走**(中央落石)',
        '第 3 組由**逆時針引導的人**吃;MT/ST 交替或無敵',
    ]},
]

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
print('\n'.join(problems) or 'OK: 無碰撞/出界/連鎖斷點')
if '--check' in sys.argv:
    sys.exit(0)
if problems:
    sys.exit('檢查未通過,不寫入')

# ═══════════════ 輸出成 uwu.js 的格式 ═══════════════
def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items() if not k.startswith('_')}
    if isinstance(o, list):
        return [clean(v) for v in o]
    return o

def j(v):
    return json.dumps(v, ensure_ascii=False)

def inline(d):
    return '{ ' + ', '.join(f'{j(k)}: {j(v)}' for k, v in d.items()) + ' }'

ORDER = ['MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4']
def actors_block(actors, ind):
    roles = [r for r in ORDER if r in actors]
    lines = []
    i = 0
    while i < len(roles):
        r = roles[i]
        if r in ('MT', 'ST'):
            lines.append(f'{j(r)}: {inline(actors[r])}')
            i += 1
        else:
            pair = [r]
            if i + 1 < len(roles) and roles[i + 1][0] == r[0] and int(roles[i + 1][1]) == int(r[1]) + 1 and int(r[1]) % 2 == 1:
                pair.append(roles[i + 1])
            lines.append(', '.join(f'{j(p)}: {inline(actors[p])}' for p in pair))
            i += len(pair)
    return '{\n' + ',\n'.join(ind + '  ' + l for l in lines) + '\n' + ind + '}'

def step_text(st, ind):
    st = clean(st)
    parts = [f'{ind}  "caption": {j(st["caption"].replace("**", ""))}']
    b = st['boss']
    if b is None:
        parts.append(f'{ind}  "boss": null')
    else:
        b = {k: v for k, v in b.items() if v is not None}
        parts.append(f'{ind}  "boss": {inline(b)}')
    parts.append(f'{ind}  "actors": ' + actors_block(st['actors'], ind + '  '))
    for key in ('aoes', 'markers', 'annotations'):
        if st.get(key):
            items = ',\n'.join(f'{ind}    {inline(a)}' for a in st[key])
            parts.append(f'{ind}  {j(key)}: [\n{items}\n{ind}  ]')
    return ind + '{\n' + ',\n'.join(parts) + '\n' + ind + '}'

def section_text(s):
    ind = '    '
    rn = ',\n'.join(f'{ind}    {j(k)}: {j(v)}' for k, v in s['roleNotes'].items())
    steps = ',\n'.join(step_text(st, ind + '    ') for st in s['steps'])
    return (f'{ind}{{\n'
            f'{ind}  "id": {j(s["id"])},\n'
            f'{ind}  "phase": {j(s["phase"])},\n'
            f'{ind}  "title": {j(s["title"])},\n'
            f'{ind}  "body": {j(s["body"])},\n'
            f'{ind}  "roleNotes": {{\n{rn}\n{ind}  }},\n'
            f'{ind}  "steps": [\n{steps}\n{ind}  ]\n'
            f'{ind}}}')

def card_text(c):
    ind = '    '
    pts = ',\n'.join(f'{ind}    {j(p)}' for p in c['points'])
    head = ', '.join(f'{j(k)}: {j(c[k])}' for k in ('id', 'phase', 'title', 'tag', 'color'))
    return f'{ind}{{\n{ind}  {head},\n{ind}  "points": [\n{pts}\n{ind}  ]\n{ind}}}'

out = {
    'sections': ',\n'.join(section_text(s) for s in SECTIONS),
    'cards': ',\n'.join(card_text(c) for c in CARDS),
}
import io, os
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'data', 'uwu.js')
src = io.open(path, encoding='utf-8').read()
c0 = src.index('    {\n      "id": "p3-geocrush"'); c1 = src.index('\n  ],\n  "sections"')
src = src[:c0] + out['cards'] + src[c1:]
s0 = src.index('    {\n      "id": "uwu-p3-open"'); s1 = src.rstrip().rfind('\n  ]\n};')
src = src[:s0] + out['sections'] + src[s1:]
io.open(path, 'w', encoding='utf-8', newline='\n').write(src)
print('written data/uwu.js · P3 sections', len(SECTIONS), 'steps', sum(len(s['steps']) for s in SECTIONS), 'cards', len(CARDS))
print('phi1', phi1, 'phi2', phi2, 'phiD', phiD, 'phiE', phiE, 'phiF', phiF, 'phiG', phiG, 'STAND', STAND, 'stand_d', round(stand_d, 2))
