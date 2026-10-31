# -*- coding: utf-8 -*-
"""UWU P4 究極神兵(LB 階段 → 一運):章節 / 速查卡的產生器,附站位碰撞檢查。

P4 的文字與站位都由這支產生,寫回 data/uwu.js 的 P4 區塊(P1~P3 不受影響)。
⚠ 要改 P4 的內容請改這支再重跑,直接手改 data/uwu.js 的 P4 會在下次重跑時被覆蓋。

用法:
  py "_Planning/BossMod逆向解析/tools/layout-uwu-p4.py" --check   只做檢查
  py "_Planning/BossMod逆向解析/tools/layout-uwu-p4.py"           檢查通過後寫回 data/uwu.js
之後再跑 rebuild-uwu.py 產生 uwu-lab.js。

尺寸來源見 ../10-UWU-P4對照.md;打法整理見 ../../UWU-P4-一運-整理.md。
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

def pt(p):
    return {'x': round(p[0], 1), 'y': round(p[1], 1)}

# ── BossMod 尺寸 ─────────────────────────────
SZ = {
    'freefire': m(15),             # 75  P4Freefire AOEShapeCircle(15)  ⚠ TODO: verify falloff
    'plasmApply': m(2),            # 10  P4ViscousAetheroplasmApply Cleave Circle(2)
    'plasmStack': m(4),            # 20  P4ViscousAetheroplasmResolve stack 4
    'laser': m(4),                 # 20  P4HomingLasers SpreadFromCastTargets 4
    'wheel': m(8.7),               # 43.5 WickedWheelBase.ShapeWheel
    'tornadoIn': m(7), 'tornadoOut': m(20),   # 35 / 100 ShapeTornado donut(7, 20)
    'sister': m(8.36),             # 41.8 ShapeSister
    'cycFront': m(49), 'cycBack': m(5), 'cycHalf': m(9),          # CrimsonCyclone _shapeMain Rect(49, 9, 5)
    'crossFront': m(44.5), 'crossBack': m(0.5), 'crossHalf': m(5),  # _shapeCross Rect(44.5, 5, 0.5)
    'crossOff': m(19.5),           # 97.5 Center - 19.5 * dir
    'lsFront': m(44.55), 'lsBack': m(4.55), 'lhFront': m(40.5), 'lhBack': m(0.5), 'lsHalf': m(3),
    'ulFront': m(46),              # 230 LandslideUltima: Rect(40 + R6, 3)
    'vent': m(14),                 # 70  P4CeruleumVent AOEShapeCircle(14)
    'eruption': m(8),              # 40  P2Eruption SimpleAOEs(8)
    'plume': m(8),                 # 40  P2RadiantPlume SimpleAOEs(8)
    'burst': m(6.3),               # 31.5 P3Burst
    'feather': m(3),               # 15  P1FeatherRain Circle(3)
    'ultimaHit': m(6),             # 30  OID.UltimaWeapon R6.000(僅 OID 註解,只用來擺站位)
}

def enemy(p, label, tone, facing=None):
    e = {'type': 'enemy', 'at': list(p), 'label': label, 'tone': tone}
    if facing is not None:
        e['facing'] = round(facing % 360, 1)
    return e

def landslide(pos, phi, second=False, color='ice', boss_shape=True):
    """泰坦的地裂斬:第 1 組 0 / ±45 / ±135,覺醒第 2 組 ±22.5 / ±90 / 180。"""
    rels = (22.5, -22.5, 90, -90, 180) if second else (0, 45, -45, 135, -135)
    out = []
    for i, r in enumerate(rels):
        main = (not second and i == 0 and boss_shape)
        out.append({'type': 'rect', 'at': list(pos), 'angle': round((phi + r) % 360, 1),
                    'lengthFront': SZ['lsFront'] if main else SZ['lhFront'],
                    'lengthBack': SZ['lsBack'] if main else SZ['lhBack'],
                    'halfWidth': SZ['lsHalf'], 'color': color})
    return out

def ultima_landslide(pos, phi, color='void'):
    """究極神兵的地裂斬:本體 Rect(46, 3);其餘 4 道假設與泰坦相同(±45 / ±135)。"""
    out = [{'type': 'rect', 'at': list(pos), 'angle': round(phi % 360, 1),
            'lengthFront': SZ['ulFront'], 'lengthBack': 0, 'halfWidth': SZ['lsHalf'], 'color': color}]
    for r in (45, -45, 135, -135):
        out.append({'type': 'rect', 'at': list(pos), 'angle': round((phi + r) % 360, 1),
                    'lengthFront': SZ['lhFront'], 'lengthBack': SZ['lhBack'], 'halfWidth': SZ['lsHalf'], 'color': color})
    return out

def cyclone(pos, phi):
    return {'type': 'rect', 'at': list(pos), 'angle': round(phi % 360, 1), 'lengthFront': SZ['cycFront'],
            'lengthBack': SZ['cycBack'], 'halfWidth': SZ['cycHalf'], 'color': 'fire'}

def cyclone_cross(phi):
    out = []
    for r in (45, -45):
        a = (phi + r) % 360
        out.append({'type': 'rect', 'at': at([0, 0], a + 180, SZ['crossOff']), 'angle': round(a, 1),
                    'lengthFront': SZ['crossFront'], 'lengthBack': SZ['crossBack'], 'halfWidth': SZ['crossHalf'],
                    'color': 'fire'})
    return out

# ── 碰撞檢查 ───────────────────────────────
ACTOR_R = 3
ARENA = 100
problems = []

def inside(aoe, p, step=None):
    t = aoe['type']
    o = aoe['at']
    if isinstance(o, str):
        o = [step['actors'][o]['x'], step['actors'][o]['y']]
    dx, dy = p[0] - o[0], p[1] - o[1]
    d = math.hypot(dx, dy)
    if t == 'circle':
        return d < aoe['r'] + ACTOR_R
    if t == 'donut':
        return aoe['rInner'] - ACTOR_R < d < aoe['rOuter'] + ACTOR_R
    if t == 'rect':
        ux, uy = bearing_unit(aoe['angle'])
        along = dx * ux + dy * uy
        perp = abs(-dx * uy + dy * ux)
        return -aoe['lengthBack'] - ACTOR_R < along < aoe['lengthFront'] + ACTOR_R and perp < aoe['halfWidth'] + ACTOR_R
    return False

CHECKED = ('circle', 'donut', 'rect')

def check(sid, idx, step, hit_ok=(), only=None, arena_r=ARENA):
    """only:只檢查這些 aoe(預設檢查 step 裡全部的 aoe)。hit_ok:(角色, aoe 序號) 或角色名稱。"""
    aoes = only if only is not None else step.get('aoes', [])
    for role, pos in step.get('actors', {}).items():
        p = (pos['x'], pos['y'])
        if math.hypot(*p) + ACTOR_R > arena_r + 0.01:
            problems.append(f'{sid}[{idx}] {role} 出界 r={math.hypot(*p):.1f}')
        for k, a in enumerate(aoes):
            if a['type'] not in CHECKED or a.get('_nocheck'):
                continue
            if (role, k) in hit_ok or role in hit_ok:
                continue
            if inside(a, p, step):
                problems.append(f'{sid}[{idx}] {role} 在 aoe#{k}({a["type"]} {a.get("angle", "")}) 內')

def must_hit(sid, idx, step, roles, aoes, what):
    """反向檢查:這些人「應該」被打到(例如硬吃十字),沒打到代表圖跟文字對不上。"""
    for r in roles:
        p = (step['actors'][r]['x'], step['actors'][r]['y'])
        if not any(inside(a, p, step) for a in aoes):
            problems.append(f'{sid}[{idx}] {r} 應該在「{what}」範圍內,但沒有')

OFFS8 = {'MT': (0, 0), 'ST': (-5, 2), 'H1': (5, 2), 'H2': (0, 5), 'D1': (-4, -4), 'D2': (4, -4), 'D3': (-5, 6), 'D4': (5, 6)}

def stack(c, spread=1.0, roles=None, rot=0):
    """全員疊在一起。rot:把隊形轉向(度),讓它沿著場邊排。"""
    roles = roles or list(OFFS8)
    ca, sa = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    out = {}
    for r in roles:
        dx, dy = OFFS8[r]
        dx, dy = dx * spread, dy * spread
        out[r] = pt((c[0] + dx * ca - dy * sa, c[1] + dx * sa + dy * ca))
    return out

def stack_safe(c, aoes, spread, roles=None, rot=0):
    st = {'actors': stack(c, spread, roles, rot)}
    for r, pos in st['actors'].items():
        p = (pos['x'], pos['y'])
        if math.hypot(*p) + ACTOR_R > ARENA:
            return False
        if any(a['type'] in CHECKED and not a.get('_nocheck') and inside(a, p, st) for a in aoes):
            return False
    return True

GRID = [(x, y) for x in range(-ARENA, ARENA + 1, 2) for y in range(-ARENA, ARENA + 1, 2)]

def best(target, ok, what):
    cands = [g for g in GRID if ok(g)]
    if not cands:
        problems.append(f'找不到安全點:{what}')
        return list(target)
    return list(min(cands, key=lambda g: math.hypot(g[0] - target[0], g[1] - target[1])))

# ═══════════════════════════════════════════
CENTER = [0, 0]
SECTIONS = []

def S(**kw):
    SECTIONS.append(kw)
    return kw

PHASE = 'P4 究極神兵'

# ─── A. LB 階段 ───────────────────────────────
FREEFIRE = [at(CENTER, a, 92) for a in (45, 135, 225, 315)]   # 四斜角場邊(使用者口頭說明);半徑 BossMod 15m
BITS = [at(CENTER, a, 55) for a in range(0, 360, 60)]           # 六個魔導浮游炮:位置為示意
center8 = stack([0, 0], spread=1.2)
lb_spread = {
    'MT': {'x': 0, 'y': -26}, 'ST': {'x': 20, 'y': -18},
    'H1': {'x': -20, 'y': 18}, 'H2': {'x': 20, 'y': 18},
    'D1': {'x': -20, 'y': -18}, 'D2': {'x': 0, 'y': 26},
    'D3': {'x': -27, 'y': 0}, 'D4': {'x': 27, 'y': 0},
}
lahabrea_melee = {
    'MT': {'x': 0, 'y': -22}, 'ST': {'x': 16, 'y': -16},
    'H1': {'x': -30, 'y': 30}, 'H2': {'x': 30, 'y': 30},
    'D1': {'x': -8, 'y': 14}, 'D2': {'x': 8, 'y': 14},
    'D3': {'x': -26, 'y': 18}, 'D4': {'x': 26, 'y': 18},
}
A = S(
    id='uwu-p4-lb', phase=PHASE,
    title='突破極限階段:魔導浮游炮 → 毒霧 → 拉哈布雷亞 → 究極',
    body=(
        "泰坦倒下後進入**突破極限(LB)階段**:四種 LB 依序各用一次,**哪一個晚了都會滅團**。三隻蠻神的突破極限都撿齊的話,LB 量表此時已經集滿。\n"
        "### 追蹤爆炸 → 魔導浮游炮(法系 LB)\n"
        "- **追蹤爆炸**:場地邊緣的 **4 個斜角**各落下一發**距離衰減** → 全員到**正中央**集合\n"
        "- 接著周圍出現 **6 個魔導浮游炮**,讀條**霧散爆發**,讀完就是**遠超血量上限的傷害、強制滅團**\n"
        "- **{{dps:D4}}(法系)在中央放 LB**,把浮游炮一網打盡。時機大約在距離衰減砸下來的時候,可以用**對自己施放的巨集**\n"
        "- LB 有可能沒殺乾淨 → **大家各自補打**殘血的浮游炮\n"
        "### 毒霧(治療 LB)\n"
        "- **拉哈布雷亞**在中央出現,放**毒霧**:全員血量**降為 1**、**擊倒 3 秒**,再附加**不可驅散的 7 秒死亡宣告**\n"
        "- **{{healer:H1}} 在擊倒結束後馬上放治療 LB**(LB3 才解得掉死亡宣告)\n"
        "- 沒有人放治療 LB 而還有人活著 → 拉哈布雷亞會**再放一次毒霧**\n"
        "### 冥暗(近戰 LB)\n"
        "- 拉哈布雷亞**變成可選中**、帶著**覺醒**開始讀**冥暗**(強制滅團)\n"
        "- **覺醒**:**進攻職業以外的 LB 傷害 -90%** → 由 **{{dps:D1}}(近戰)放 LB**,大家一起補刀。把牠的血量打到 **1** 就會中斷詠唱\n"
        "- 沒有近戰的陣容:**法系放 LB + 全員爆發藥**也打得死\n"
        "### 究極(坦克 LB)\n"
        "- **究極神兵**出現並讀**究極**(讀條 5 秒):全體超血量上限傷害 → **{{tank:MT}} 量表一滿馬上放坦克 LB**\n"
        "- ⚠ 前面**三隻蠻神沒有全部覺醒**的話,這裡的究極會**無視坦克 LB**,固定滅團\n"
        "- 之後究極神兵會**吞噬已覺醒的三隻蠻神**、自己獲得覺醒。從這裡開始 **LB 量表停止自然增長**,直到究極神兵變成可選中為止\n"
        "> 魔導浮游炮的位置是示意;各 LB 的間隔取自 BossMod 時間軸,治療 LB 的時機前後可能差到 5 秒,以畫面上擊倒結束為準。"
    ),
    roleNotes={
        'MT': '**究極**讀條時**量表一滿馬上放坦克 LB**。其餘時間在中央集合。',
        'ST': '中央集合,一起補打浮游炮與拉哈布雷亞。',
        'H1': '**擊倒一結束馬上放治療 LB3**,解掉全員的死亡宣告。',
        'H2': '治療 LB 之後立刻把全員血量拉回來;H1 失手時要喊出來。',
        'D1': '**拉哈布雷亞變成可選中就放近戰 LB**,打到 1 血中斷冥暗。',
        'D2 D3': '補打 LB 沒清掉的浮游炮;拉哈布雷亞出現後**全力爆發**補刀。',
        'D4': '**在中央放法系 LB** 清掉 6 個魔導浮游炮,時機約在距離衰減砸下來時(可用對自己施放的巨集)。',
    },
    steps=[
        {
            'caption': '追蹤爆炸:場地邊緣 4 個斜角各落下一發距離衰減(BossMod 半徑 15m,衰減方式待驗證)→ 全員到正中央集合',
            'boss': None,
            'actors': center8,
            'aoes': [{'type': 'circle', 'at': p, 'r': SZ['freefire'], 'color': 'ice'} for p in FREEFIRE],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '四角距離衰減 → 正中央集合', 'color': 'yellow'}],
        },
        {
            'caption': '周圍出現 6 個魔導浮游炮,讀條霧散爆發(讀完強制滅團)→ D4 在中央放法系 LB 一網打盡;沒清乾淨就大家各自補打',
            'boss': None,
            'actors': center8,
            'aoes': [enemy(p, '炮', 'ultima') for p in BITS],
            'markers': [{'type': 'target', 'at': 'D4'}],
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '法系 LB:D4', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '浮游炮位置為示意', 'color': 'yellow'},
            ],
        },
        {
            'caption': '拉哈布雷亞在中央出現,放毒霧:全員血量降為 1、擊倒 3 秒,再附加 7 秒死亡宣告 → H1 在擊倒結束後馬上放治療 LB3',
            'boss': {'x': 0, 'y': 0, 'facing': None},
            'actors': lb_spread,
            'markers': [{'type': 'target', 'at': 'H1'}],
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '治療 LB:H1(擊倒結束後)', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '沒放 → 再一次毒霧', 'color': 'red'},
            ],
        },
        {
            'caption': '拉哈布雷亞變成可選中,帶著覺醒讀冥暗(強制滅團)。覺醒讓非進攻職業的 LB 傷害 -90% → D1 放近戰 LB,大家一起補刀到 1 血中斷詠唱',
            'boss': {'x': 0, 'y': 0, 'facing': 180},
            'actors': lahabrea_melee,
            'markers': [{'type': 'target', 'at': 'D1'}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '近戰 LB:D1 · 全員爆發', 'color': 'yellow'}],
        },
        {
            'caption': '究極神兵出現並讀究極(5 秒)→ MT 量表一滿馬上放坦克 LB。之後究極神兵吞噬三隻已覺醒的蠻神,LB 量表暫停自然增長',
            'boss': {'x': 0, 'y': -40, 'facing': 180},
            'actors': stack([0, 30], spread=1.6),
            'markers': [{'type': 'target', 'at': 'MT'}],
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '坦克 LB:MT', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '蠻神沒全部覺醒 → 坦克 LB 也擋不住', 'color': 'red'},
            ],
        },
    ],
)
check(A['id'], 0, A['steps'][0])

# ─── B. 究極神兵登場:魔導核爆 → 吸附式炸彈 → 追蹤射線 ─────────
U0 = [0, 0]
MT_O = [0, -40]
ST_O = [48, 6]
PARTY_O = [-6, 50]
open_pos = stack(PARTY_O, spread=1.6, roles=['H1', 'H2', 'D1', 'D2', 'D3', 'D4'])
open_pos['MT'] = pt(MT_O)
open_pos['ST'] = pt(ST_O)
B = S(
    id='uwu-p4-open', phase=PHASE,
    title='究極神兵登場:魔導核爆 → 吸附式炸彈 → 追蹤射線',
    body=(
        "### 開場的仇恨\n"
        "- 究極神兵變成可選中後,**{{tank:MT}} 立刻拉穩一仇**,**{{tank:ST}} 維持二仇**\n"
        "- 兩人都開**坦克姿態**,只有 **MT 需要挑釁**\n"
        "- 從這裡開始**普通攻擊也是魔法傷害、會暴擊**,坦克的減傷不要省\n"
        "### 魔導核爆(讀條)\n"
        "- 普通的全體攻擊,但**非常痛** → 補師先把血線拉滿\n"
        "### 吸附式以太炸彈 → 追蹤射線 → 引爆\n"
        "- **吸附式以太炸彈**:對**一仇**(含身邊 2m)附加**吸附式炸彈**,約 **10 秒後**爆炸,是可分攤的高額傷害\n"
        "  - 因為**站在 MT 身邊的人也會被附加**,{{tank:MT}} 要**遠離大部隊、一個人**吃下\n"
        "- **追蹤射線**:附加炸彈後立刻讀條,對**二仇**的半徑 4m 強攻擊 → {{tank:ST}} 到**側邊單獨**承受,不要捲入其他人\n"
        "- **引爆**:這次**不分攤**,由 {{tank:MT}} **開滿減傷單獨吃下**比較穩\n"
        "### 究極神兵的以太\n"
        "- 戰鬥中會慢慢累積;**有人死亡 +4**,之後的**爆擊之究極幻想**裡每有一人吃到以太炸彈 **+1**\n"
        "- 到 **20 / 40 / 60** 時場外特效變多;**滿 100** → 究極神兵**傷害提高 200%**\n"
        "- 簡單說:**這一段不要死人**,失誤會直接拖累後面"
    ),
    roleNotes={
        'MT': '立刻**挑釁拉穩一仇**,把究極神兵**面向拉離大部隊**。被附加**吸附式炸彈**後**一個人**吃引爆,開滿減傷。',
        'ST': '維持**二仇**(坦克姿態開著)。**追蹤射線**到**側邊單獨**吃,不要靠近大部隊和 MT。',
        'H1 H2': '魔導核爆很痛,先把血線拉滿;炸彈引爆時集中照顧 MT。',
        'D1-D4': '站在究極神兵**背後的大部隊**,不要靠近兩個坦克。',
    },
    steps=[
        {
            'caption': '究極神兵在中央變成可選中。MT 挑釁拉穩一仇、ST 維持二仇(兩人都開坦克姿態)。魔導核爆是普通的全體攻擊,但非常痛',
            'boss': {'x': U0[0], 'y': U0[1], 'facing': 0},
            'actors': open_pos,
            'markers': [{'type': 'target', 'at': 'MT'}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '魔導核爆 · MT 一仇 / ST 二仇', 'color': 'yellow'}],
        },
        {
            'caption': '吸附式以太炸彈:一仇(含身邊 2m)被附加吸附式炸彈 → MT 遠離大部隊單獨吃。緊接著追蹤射線點二仇(半徑 4m)→ ST 到側邊單獨承受',
            'boss': {'x': U0[0], 'y': U0[1], 'facing': 0},
            'actors': open_pos,
            'aoes': [
                {'type': 'circle', 'at': 'MT', 'r': SZ['plasmApply'], 'color': 'void'},
                {'type': 'circle', 'at': 'ST', 'r': SZ['laser'], 'color': 'thunder'},
            ],
            'markers': [{'type': 'target', 'at': 'ST'}],
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': 'MT 炸彈 · ST 射線 · 各自單獨', 'color': 'yellow'},
            ],
        },
        {
            'caption': '約 10 秒後炸彈引爆(可分攤,但這次不分攤)→ MT 開滿減傷單獨吃下',
            'boss': {'x': U0[0], 'y': U0[1], 'facing': 0},
            'actors': open_pos,
            'aoes': [{'type': 'circle', 'at': 'MT', 'r': SZ['plasmStack'], 'color': 'void'}],
            'markers': [{'type': 'share', 'at': 'MT'}],
            'annotations': [{'type': 'text', 'at': [0, -104], 'text': '不分攤 · MT 減傷單吃', 'color': 'yellow'}],
        },
    ],
)
check(B['id'], 1, B['steps'][1], hit_ok=(('MT', 0), ('ST', 1)))
check(B['id'], 2, B['steps'][2], hit_ok=('MT',))

# ─── C. 追擊之究極幻想 ───────────────────────────
# 範例配置:迦樓羅在中央偏東北(標記與標記之間)、伊弗利特在西北、究極神兵在東南、泰坦在西(偏北一點)
GARUDA = at(CENTER, 45, m(4.7))        # 影片「中央附近、剛好在標記與標記之間」;影片的標記離中心約 6.7m
IFRIT = at(CENTER, 315, m(19))         # 斜點場邊(位置示意)
ULTIMA = at(CENTER, 135, m(18))        # 斜點場邊(位置示意)
TITAN = at(CENTER, 282, m(19))         # 西正點偏北一點(位置示意)
phiI = bearing(IFRIT, CENTER)
phiT = bearing(TITAN, CENTER)
pred1 = [{'type': 'circle', 'at': GARUDA, 'r': SZ['wheel'], 'color': 'wind'}, cyclone(IFRIT, phiI)] + landslide(TITAN, phiT)
pred2_dodge = [{'type': 'donut', 'at': GARUDA, 'rInner': SZ['tornadoIn'], 'rOuter': SZ['tornadoOut'], 'color': 'wind'},
               {'type': 'circle', 'at': ULTIMA, 'r': SZ['vent'], 'color': 'void'}] + landslide(TITAN, phiT, second=True)
pred2_cross = cyclone_cross(phiI)
SAFE_DIR = 180                          # 背對迦樓羅(東北)→ 西南;兩側的正點是南與西,西有泰坦 → 南
P1 = best(at(CENTER, SAFE_DIR, 94), lambda g: stack_safe(g, pred1, 0.9), '追擊 第 1 發')
P2 = best(P1, lambda g: stack_safe(g, pred2_dodge, 0.9) and math.hypot(g[0] - P1[0], g[1] - P1[1]) < 30, '追擊 第 2 發')
pred_c = stack([0, 0], spread=1.2)
pred_p1 = stack(P1, spread=0.9)
pred_p2 = stack(P2, spread=0.9)
feather_land = stack([P2[0] + 2, P2[1] - 22], spread=0.9)
def enemies_pred(show_ultima=True):
    out = [enemy(GARUDA, '風', 'wind'), enemy(IFRIT, '火', 'fire', phiI), enemy(TITAN, '土', 'earth', phiT)]
    if show_ultima:
        out.append(enemy(ULTIMA, '神', 'ultima'))
    return out
C = S(
    id='uwu-p4-predation', phase=PHASE,
    title='追擊之究極幻想:背對迦樓羅 → 沒有泰坦的正點 → 硬吃十字',
    body=(
        "究極神兵讀**追擊之究極幻想**後消失,**三隻蠻神與究極神兵同時出現**,接連放出覺醒後的招式。這是一運的**第一個難關**。\n"
        "### 出現位置的規則\n"
        "| 誰 | 出現在哪 | 模式 |\n|---|---|---|\n"
        "| **迦樓羅** | **中央附近**、剛好在**兩個標記之間** | 4 種 |\n"
        "| **伊弗利特** | **斜點**的場邊 | 4 種 |\n"
        "| **究極神兵** | **斜點**的場邊(不會和伊弗利特重疊) | 4 種 |\n"
        "| **泰坦** | **正點兩側、偏一點點**的位置 | 8 種 |\n\n"
        "### 兩波攻擊\n"
        "| | 第 1 波 | 第 2 波(約 2 秒後) |\n|---|---|---|\n"
        "| 迦樓羅 | **邪輪旋風**(自身周圍 8.7m) | **邪氣龍捲**(7~20m 的環) |\n"
        "| 伊弗利特 | **深紅旋風**:穿過場中央的寬直線衝鋒(寬 18m) | **十字**深紅旋風(沿正點方向,寬 10m) |\n"
        "| 泰坦 | **地裂斬**:朝面向 + ±45°、±135° 共 5 道 | **覺醒地裂斬**:±22.5°、±90°、180° 再 5 道 |\n"
        "| 究極神兵 | — | **青磷放射**:以自己為中心半徑 14m |\n\n"
        "泰坦的地裂斬範圍是固定的,剛好會打在**東南西北偏一點點**的位置。\n"
        "### 本隊打法:無視十字\n"
        "要把兩波全部閃掉需要很極限的走位,這裡還在究極神兵階段的開頭,**不強求**。\n"
        "伊弗利特的**十字只要做好團隊減傷,補師和 DPS 都吃得下來** → 把十字當作不存在,安全區就變得很大,機制非常簡單。\n"
        "1. **先開好團隊減傷**,在**中央集合**。\n"
        "2. 找到**迦樓羅** → **背對牠、看向反方向**。\n"
        "3. 往反方向兩側的**正點**中、**沒有泰坦的那一個**走過去(穿過內側的標記**直直往外走**)。\n"
        "4. 閃第 1 波的**地裂斬**:往**容易閃的那一側**,**貼著預兆線**極限迴避。\n"
        "5. 第 2 波:**究極神兵在附近的話,稍微往反方向偏一點**(圓其實不大,一點點就夠),然後**硬吃十字**。\n"
        "### 三個注意事項\n"
        "- 往外周走時**穿過標記直直前進**,這樣自然就知道地裂斬該往哪邊躲\n"
        "- 地裂斬**貼著預兆線**閃,不要為了躲究極神兵的圓而閃太大步(會撞進別的直線)\n"
        "- 吃十字時**盡量靠外周邊緣**\n"
        "### 最後:飛羽雨\n"
        "- 結束後迦樓羅會放**飛羽雨** → 全員**集中排好**,**一定要聽到迦樓羅的叫聲再移動**\n"
        "> 十字也可以完全閃掉,但這段也有**累積 LB 量表**的目的,硬吃比較好。\n"
        "> 圖上是一個範例配置:迦樓羅在東北、伊弗利特在西北、究極神兵在東南、泰坦在西偏北。各隻的確切位置是示意,尺寸是 BossMod 的實測值。"
    ),
    roleNotes={
        'MT': '讀條時**先把團隊減傷排好**(第 2 波要硬吃十字)。跟大部隊一起走,不用另外處理仇恨。',
        'ST': '跟大部隊一起走;第 2 波前補一個團隊減傷。',
        'H1 H2': '**事前把血線拉滿、團隊減傷排好**,十字吃完立刻群補。',
        'D1-D4': '背對迦樓羅 → 沒有泰坦的正點 → **貼著地裂斬的預兆線**閃 → 究極神兵在附近就往反方向偏一點 → 硬吃十字。',
    },
    steps=[
        {
            'caption': '究極神兵讀追擊之究極幻想後消失,三隻蠻神與究極神兵出現。全員先在中央集合、開好團隊減傷,然後找到迦樓羅(中央附近、兩個標記之間)',
            'boss': None,
            'actors': pred_c,
            'aoes': enemies_pred(),
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '中央集合 · 先開減傷 · 找迦樓羅', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '範例配置;位置為示意', 'color': 'yellow'},
            ],
        },
        {
            'caption': '背對迦樓羅、看向反方向:兩側的正點是南與西,西邊有泰坦 → 往南走。穿過內側的標記直直往外走',
            'boss': None,
            'actors': pred_c,
            'aoes': enemies_pred(),
            'annotations': [
                {'type': 'arrow', 'from': [0, 10], 'to': [0, 78], 'color': 'white'},
                {'type': 'arrow', 'from': [-8, 8], 'to': [-62, 62], 'color': 'white', 'dash': True},
                {'type': 'text', 'at': [-56, 18], 'text': '泰坦 → 不去', 'color': 'red'},
                {'type': 'text', 'at': [0, -104], 'text': '背對迦樓羅 → 沒有泰坦的正點', 'color': 'yellow'},
            ],
        },
        {
            'caption': '第 1 波:迦樓羅的邪輪旋風、伊弗利特穿過中央的深紅旋風、泰坦的地裂斬(5 道)。地裂斬剛好打在南邊偏一點的位置 → 往容易閃的一側、貼著預兆線閃',
            'boss': None,
            'actors': pred_p1,
            'aoes': pred1 + enemies_pred(),
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': '第 1 波 · 貼著地裂斬的預兆線', 'color': 'yellow'},
            ],
        },
        {
            'caption': '第 2 波:邪氣龍捲(環)、泰坦的覺醒地裂斬、究極神兵的青磷放射(半徑 14m)、伊弗利特的十字。究極神兵在附近 → 稍微往反方向偏一點,十字靠著外周硬吃',
            'boss': None,
            'actors': pred_p2,
            'aoes': pred2_dodge + pred2_cross + enemies_pred(),
            'annotations': [
                {'type': 'arrow', 'from': [P1[0], P1[1] - 12], 'to': [P2[0] - 2, P2[1] - 12], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '第 2 波 · 遠離神兵 · 硬吃十字', 'color': 'yellow'},
            ],
        },
        {
            'caption': '最後迦樓羅放飛羽雨:全員維持集中,聽到迦樓羅的叫聲之後再一起移出圈外。接著究極神兵回到中央',
            'boss': None,
            'actors': feather_land,
            'aoes': [{'type': 'circle', 'at': [v['x'], v['y']], 'r': SZ['feather'], 'color': 'wind', '_nocheck': True} for v in pred_p2.values()],
            'annotations': [
                {'type': 'arrow', 'from': [P2[0], P2[1] - 8], 'to': [P2[0] + 2, P2[1] - 18], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '聽到叫聲再移動', 'color': 'yellow'},
            ],
        },
    ],
)
check(C['id'], 2, C['steps'][2], only=pred1)
check(C['id'], 3, C['steps'][3], only=pred2_dodge)
must_hit(C['id'], 3, C['steps'][3], list(pred_p2), pred2_cross, '十字')
check(C['id'], 4, C['steps'][4])

# ─── D. 一運後半:地火 → 光輝炎柱 → 雙重地裂斬 → 換坦 → 飛羽雨 ─────────
U1 = at(CENTER, 45, m(2.5))            # MT 把究極神兵往 A、B 之間拉一步
IFRIT_N = at(CENTER, 0, m(13.6))       # 伊弗利特必定出現在北邊(距離為示意;放在 2 號標記內側以免被蓋住)
TITAN_SW = at(CENTER, 225, m(18))      # 泰坦出現在究極神兵背後的反方向(位置:場邊,示意)
PARTY_N = [0, -44]
ERU = [at(CENTER, a, 88) for a in (178, 150, 122, 96)]   # 地火 4 連:從南沿著東側外周往北
ERU_BAIT = [[p[0] + 4, p[1]] for p in ERU]
# 光輝炎柱與落石:依影片 07:06~07:33 的示意圖量測(整理檔 §4-4)。
# 示意圖是上南下北(C 在上、A 在下),量測後轉 180° 到本圖的方向。
# 正點 4 根離中心約 19m、斜點 4 根約 15.5m → 四個正點方向各留一條凹處,最裡面離中心約 11m
PLUMES = [at(CENTER, a, m(19)) for a in (0, 90, 180, 270)] + [at(CENTER, a, m(15.5)) for a in (45, 135, 225, 315)]
# 落石:中央附近、半徑約 3m 的一圈,依順時針一顆一顆落下(示意圖的黃色箭頭)
ROCKS = [at(CENTER, 30 + 60 * k, m(3)) for k in range(6)]
NOTCH = at(CENTER, 3, m(9.8))          # A 標記外側的凹處、貼到最裡面(示意圖:A 標記再往外約 1~2m)
phiU = bearing(U1, NOTCH)              # 究極神兵面朝大部隊
phiTsw = bearing(TITAN_SW, NOTCH)

pre = stack(PARTY_N, spread=1.6, roles=['ST', 'H1', 'H2', 'D1', 'D2'])
pre['MT'] = pt(at(U1, 20, 40))
pre['D3'] = pt([-6, 92])
pre['D4'] = pt([6, 92])
eru_step = dict(pre)
eru_step['D3'] = pt([ERU_BAIT[2][0] - 3, ERU_BAIT[2][1] - 18])
eru_step['D4'] = pt([ERU_BAIT[2][0] + 1, ERU_BAIT[2][1] - 20])
eru_step['ST'] = pt([16, -48])
eru_aoes = [{'type': 'circle', 'at': p, 'r': SZ['eruption'], 'color': 'fire'} for p in ERU[:2]] + \
           [{'type': 'circle', 'at': p, 'r': SZ['eruption'], 'color': 'fire', '_nocheck': True} for p in ERU[2:]]
notch_stack = stack(NOTCH, spread=0.35, rot=180)
plume_aoes = [{'type': 'circle', 'at': p, 'r': SZ['plume'], 'color': 'fire'} for p in PLUMES]
rock_aoes = []
for p in ROCKS:
    rock_aoes += [{'type': 'circle', 'at': p, 'r': SZ['burst'], 'color': 'fire'}, {'type': 'rock', 'at': p}]
ls_double = ultima_landslide(U1, phiU) + landslide(TITAN_SW, phiTsw) + landslide(TITAN_SW, phiTsw, second=True)
RIGHT = at(NOTCH, (phiU + 270) % 360, 25)   # 從凹處面向究極神兵時的右手邊(西),直角移動
SAFE_R = best(RIGHT, lambda g: stack_safe(g, ls_double + rock_aoes, 0.6, rot=0) and g[1] <= NOTCH[1] + 4, '雙重地裂斬')
right_stack = stack(SAFE_R, spread=0.6, rot=0)
# 落石在凹處最裡面打不到;站在 A 標記上就會被打到(示意圖「不貼過去就會被打」)
if not any(inside(a, (0, -34)) for a in rock_aoes if a['type'] == 'circle'):
    problems.append('A 標記上應該會被落石打到,但沒有 —— 落石或凹處的量測對不上')
M2 = [0, -88]
M3 = [62, -62]
SIS_W, SIS_E, GARUDA_S = at(CENTER, 270, 92), at(CENTER, 90, 92), at(CENTER, 180, 92)
tank_pos = stack([M2[0] - 2, M2[1] + 10], spread=1.2, roles=['H1', 'H2', 'D1', 'D2', 'D3', 'D4'])
tank_pos['MT'] = pt(M3)
tank_pos['ST'] = pt(at(CENTER, 330, 34))
feather2 = stack([M2[0] - 22, M2[1] + 18], spread=1.2, roles=['H1', 'H2', 'D1', 'D2', 'D3', 'D4'])
feather2['MT'] = pt([M3[0] - 4, M3[1] + 6])
feather2['ST'] = tank_pos['ST']
wheel_aoes = [{'type': 'circle', 'at': p, 'r': SZ['sister'], 'color': 'wind'} for p in (SIS_W, SIS_E)]
roulette_enemies = [enemy(IFRIT_N, '火', 'fire', 180)]
D = S(
    id='uwu-p4-roulette', phase=PHASE,
    title='一運後半:地火 → 光輝炎柱 → 雙重地裂斬 → 換坦 → 飛羽雨',
    body=(
        "追擊之究極幻想結束後,究極神兵回到中央、再次召喚三隻蠻神。**從這裡到下一個機制之前沒有任何隨機要素**,站位可以完全固定。\n"
        "### ① 地火噴發 + 火獄之鎖\n"
        "- 飛羽雨排完後確認方位:**地火小組({{dps:D3}}、{{dps:D4}})往南**,**其他人在北邊**集合\n"
        "- 究極神兵出現在中央後,**{{tank:MT}} 把牠往 A 與 B 之間(東北)拉一步左右** —— 這是為了決定之後泰坦出現的位置\n"
        "- **伊弗利特必定出現在北邊**,對**離牠最遠的 2 人**連放 **4 次地火噴發**(半徑 8m)→ 地火小組**從南邊沿著外周往北走**引導\n"
        "- 同時**火獄之鎖**:**二仇**與一名 DPS 連線 → **{{tank:ST}} 先確認自己是二仇**;被連到的 DPS **排完地火就趕快回大部隊**\n"
        "### ② 光輝炎柱 → 落石\n"
        "- 外側出現 **8 根光輝炎柱**(半徑 8m):正點 4 根離得比較遠、斜點 4 根比較近 → 中間的安全區在**四個正點方向各留一條凹處**\n"
        "- 全員進到 **A 標記外側的凹處**,**貼到最裡面**(炎柱的邊緣),等炎柱爆炸\n"
        "- 緊接著**中央附近一圈(離中心約 3m)依順時針一顆一顆落下岩石**(爆炸半徑 6.3m)\n"
        "- **站在 A 標記上會被打到**,一定要再往外貼進凹處最裡面\n"
        "- ⚠ 依落石的順序,有時不貼也不會被打(落石在對面)→ 「剛剛這樣站都沒事」一放鬆就被砸,**每次都要刻意貼進去**\n"
        "### ③ 雙重地裂斬(究極神兵 + 泰坦)\n"
        "- **泰坦必定出現在究極神兵背後的反方向** → 剛才把究極神兵拉到東北,泰坦就會在**西南**\n"
        "- 兩邊的地裂斬都是**隨機點名**,在炎柱爆炸後馬上出現預兆\n"
        "- **讓究極神兵面朝大部隊**(全員都在 A 外側的凹處,誰被點到都一樣),範圍就會固定成同一個形狀,**右手邊必定有安全區**\n"
        "- 炎柱爆炸後,全員**直角往右**移動;泰坦的地裂斬有時會掃到附近,**再往外側靠一點**比較保險\n"
        "### ④ 換坦:吸附式炸彈 + 追蹤射線\n"
        "- 接下來**激震(7 段)**、**寒風之嘯**等全體攻擊連續襲來,中間夾著**吸附式炸彈**與**追蹤射線**\n"
        "- 推薦用**無敵**把坦克的攻擊一次吃完:\n"
        "  1. 雙重地裂斬後 **{{tank:MT}} 到 3 號標記**,其他人到 **2 號標記**集合\n"
        "  2. MT 單獨被附加吸附式炸彈 → **{{tank:ST}} 立刻挑釁換坦**,MT 變成二仇\n"
        "  3. **追蹤射線與炸彈引爆都由 MT 開無敵單獨承受**。炸彈引爆比射線早,**在炸彈倒數快結束時開無敵**就好\n"
        "- 跟開場不同,這次附加炸彈後還會**穿插約 2 次普攻**,換坦的時間很充裕。普攻幾乎沒有動作提示,坦克要**看著 Debuff 的秒數**\n"
        "- 妙翅、美翼會在自己出現的位置放**邪輪旋風** → 2 號標記離她們夠遠\n"
        "### ⑤ 飛羽雨 ×2\n"
        "- 聽到叫聲後,**MT 隨便找地方排**,其他人**集中在 2 號標記旁**排好。全體攻擊都在飛羽雨落下前結算,補師在 2 號標記專心補血\n"
        "- **兩次**飛羽雨都要集中排;騎士開**神聖領域**的話 MT 連排都不用排\n"
        "- 結束後**坦克把仇恨拉回來**,接著就是**爆擊之究極幻想**\n"
        "> 光輝炎柱與落石的位置依影片 07:06~07:33 的示意圖量測;妙翅、美翼、迦樓羅的位置是示意。地火、炎柱、落石、地裂斬的尺寸是 BossMod 的實測值。"
    ),
    roleNotes={
        'MT': '究極神兵回到中央後**往東北拉一步**。雙重地裂斬後到 **3 號標記**,被附加炸彈後讓 ST 挑釁;**炸彈倒數快結束時開無敵**,射線和引爆一起吃。結束後挑釁拉回仇恨。',
        'ST': '先**確認自己是二仇**(火獄之鎖要連到你)。MT 被附加炸彈後**立刻挑釁換坦**,在 2 號標記附近坦著究極神兵。',
        'H1 H2': '北邊集合 → A 外側的凹處貼到最裡面 → 直角往右 → 2 號標記**專心補血**(激震 7 段 + 寒風之嘯)。',
        'D1 D2': '跟大部隊。被火獄之鎖連到就**貼著 ST**。',
        'D3 D4': '**地火小組**:先到南邊,**從南沿著東側外周往北**引導 4 次地火,**排完馬上回大部隊**(可能被火獄之鎖連到)。',
    },
    steps=[
        {
            'caption': '飛羽雨排完後確認方位:地火小組(D3、D4)往南,其他人在北邊集合。究極神兵出現在中央後,MT 把牠往 A 與 B 之間(東北)拉一步。ST 確認自己是二仇(等等的火獄之鎖)',
            'boss': {'x': U1[0], 'y': U1[1], 'facing': 20},
            'actors': pre,
            'annotations': [
                {'type': 'arrow', 'from': [0, 0], 'to': [U1[0] + 2, U1[1] - 2], 'color': 'blue'},
                {'type': 'text', 'at': [0, -104], 'text': '地火組往南 · 其他人往北', 'color': 'yellow'},
            ],
        },
        {
            'caption': '伊弗利特必定出現在北邊,對離牠最遠的 2 人(D3、D4)連放 4 次地火噴發 → 兩人從南邊沿著外周往北走引導。火獄之鎖:二仇(ST)與一名 DPS 連線 → 排完地火趕快回大部隊',
            'boss': {'x': U1[0], 'y': U1[1], 'facing': 20},
            'actors': eru_step,
            'aoes': eru_aoes + roulette_enemies,
            'tethers': [{'from': 'ST', 'to': 'D4', 'color': 'purple'}],
            'annotations': [
                {'type': 'arcArrow', 'radius': 78, 'startAngle': 175, 'endAngle': 105, 'dir': 'ccw', 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '地火 4 連 · 沿外周往北', 'color': 'yellow'},
            ],
        },
        {
            'caption': '外側出現 8 根光輝炎柱,四個正點方向各留一條凹處 → 全員進到 A 標記外側的凹處、貼到最裡面,等炎柱爆炸。緊接著中央附近一圈依順時針落下岩石:站在 A 標記上會被打到,貼到最裡面才打不到',
            'boss': {'x': U1[0], 'y': U1[1], 'facing': phiU},
            'actors': notch_stack,
            'aoes': plume_aoes + rock_aoes,
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': 'A 外側凹處 · 每次都要貼到最裡面', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '炎柱與落石依影片示意圖量測', 'color': 'yellow'},
            ],
        },
        {
            'caption': '究極神兵與泰坦的雙重地裂斬:泰坦出現在究極神兵背後的反方向(西南)。究極神兵面朝大部隊,右手邊必定有安全區 → 炎柱爆炸後全員直角往右,再往外側靠一點躲泰坦的直線',
            'boss': {'x': U1[0], 'y': U1[1], 'facing': phiU},
            'actors': right_stack,
            'aoes': ls_double + rock_aoes + [enemy(TITAN_SW, '土', 'earth', phiTsw)],
            'annotations': [
                {'type': 'arrow', 'from': [NOTCH[0] - 6, NOTCH[1] - 6], 'to': [SAFE_R[0] + 8, SAFE_R[1] + 4], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': '直角往右 · 再靠外一點', 'color': 'yellow'},
            ],
        },
        {
            'caption': 'MT 到 3 號標記、其他人到 2 號標記。MT 單獨被附加吸附式炸彈 → ST 立刻挑釁換坦。激震(7 段)、寒風之嘯等全體攻擊連續襲來;妙翅、美翼在自己的位置放邪輪旋風',
            'boss': {'x': U1[0], 'y': U1[1], 'facing': bearing(U1, [tank_pos['ST']['x'], tank_pos['ST']['y']])},
            'actors': tank_pos,
            'aoes': [{'type': 'circle', 'at': 'MT', 'r': SZ['plasmApply'], 'color': 'void'}] + wheel_aoes + [
                enemy(SIS_W, '妙', 'wind'), enemy(SIS_E, '美', 'wind'), enemy(GARUDA_S, '風', 'wind')],
            'markers': [{'type': 'target', 'at': 'ST'}],
            'annotations': [
                {'type': 'text', 'at': [0, -104], 'text': 'MT → 3 · 其他人 → 2 · ST 挑釁', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '妙翅、美翼、迦樓羅位置為示意', 'color': 'yellow'},
            ],
        },
        {
            'caption': '換下來的 MT(二仇)被追蹤射線點名,炸彈也在 MT 身上引爆 → 炸彈倒數快結束時開無敵,兩發一起吃。聽到叫聲後兩次飛羽雨:MT 隨便排,其他人集中在 2 號旁排好。結束後坦克把仇恨拉回來',
            'boss': {'x': U1[0], 'y': U1[1], 'facing': bearing(U1, [tank_pos['ST']['x'], tank_pos['ST']['y']])},
            'actors': feather2,
            'aoes': [
                {'type': 'circle', 'at': 'MT', 'r': SZ['laser'], 'color': 'thunder'},
            ] + [{'type': 'circle', 'at': [v['x'], v['y']], 'r': SZ['feather'], 'color': 'wind', '_nocheck': True}
                 for r, v in tank_pos.items() if r not in ('MT', 'ST')],
            'markers': [{'type': 'target', 'at': 'MT'}],
            'annotations': [
                {'type': 'arrow', 'from': [M2[0] - 6, M2[1] + 12], 'to': [M2[0] - 18, M2[1] + 18], 'color': 'white'},
                {'type': 'text', 'at': [0, -104], 'text': 'MT 無敵吃射線 + 炸彈 · 飛羽雨 ×2', 'color': 'yellow'},
                {'type': 'text', 'at': [0, 104], 'text': '下一段:爆擊之究極幻想', 'color': 'white'},
            ],
        },
    ],
)
check(D['id'], 1, D['steps'][1], only=eru_aoes[:2])
check(D['id'], 2, D['steps'][2], only=plume_aoes + rock_aoes)
check(D['id'], 3, D['steps'][3], only=ls_double + rock_aoes)
check(D['id'], 4, D['steps'][4], hit_ok=('MT',))
check(D['id'], 5, D['steps'][5], hit_ok=('MT',))
# 地火之後:最後一發不能炸到北邊的大部隊
for k, p in enumerate(ERU):
    for r, v in pre.items():
        if r in ('D3', 'D4', 'MT'):
            continue
        if inside({'type': 'circle', 'at': p, 'r': SZ['eruption']}, (v['x'], v['y'])):
            problems.append(f'地火 #{k + 1} 炸到北邊集合的 {r}')
    if inside({'type': 'circle', 'at': p, 'r': SZ['eruption']}, NOTCH):
        problems.append(f'地火 #{k + 1} 炸到 A 外側的凹處')

# ─── 速查卡 ───────────────────────────────
CARDS = [
    {'id': 'p4-lb', 'phase': PHASE, 'title': '突破極限階段', 'tag': 'LB', 'color': 'accent', 'points': [
        '追蹤爆炸 → 浮游炮:{{dps:D4}} 在**中央放法系 LB**(距離衰減時)',
        '毒霧(血量 1 + 擊倒 + 死亡宣告):{{healer:H1}} **擊倒結束後放治療 LB3**',
        '拉哈布雷亞讀冥暗:{{dps:D1}} **近戰 LB** + 全員補刀(非進攻 LB -90%)',
        '究極:{{tank:MT}} **量表一滿馬上放坦克 LB**',
    ]},
    {'id': 'p4-plasm', 'phase': PHASE, 'title': '吸附式炸彈 + 追蹤射線', 'tag': '坦克', 'color': 'void', 'points': [
        '炸彈附加在**一仇(含身邊 2m)** → MT **遠離大部隊**單獨吃',
        '追蹤射線打**二仇**(半徑 4m)→ ST 到側邊單獨吃',
        '開場:**不分攤**,MT 減傷單吃引爆',
        '一運後半:MT 被附加後 **ST 挑釁** → MT 開**無敵**吃射線 + 引爆',
    ]},
    {'id': 'p4-predation', 'phase': PHASE, 'title': '追擊之究極幻想', 'tag': '一運', 'color': 'wind', 'points': [
        '中央集合、**先開團隊減傷**',
        '**背對迦樓羅** → 兩側正點中**沒有泰坦**的那一個',
        '地裂斬**貼著預兆線**閃;究極神兵在附近就**往反方向偏一點**',
        '伊弗利特的十字**靠外周硬吃**;最後的飛羽雨**聽到叫聲再動**',
    ]},
    {'id': 'p4-roulette', 'phase': PHASE, 'title': '一運後半', 'tag': '固定', 'color': 'fire', 'points': [
        'MT 把究極神兵**往東北拉一步**;地火組南、其他人北',
        '地火從南**沿外周往北**;ST 確認二仇接**火獄之鎖**',
        '**A 外側凹處貼到最裡面**等炎柱 → **直角往右、再靠外**躲雙重地裂斬',
        'MT **3 號**、其他人 **2 號**;飛羽雨 **×2** 都集中排',
    ]},
]

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
print('\n'.join(problems) or 'OK: 無碰撞/出界')
print('P1', P1, 'P2', P2, 'SAFE_R', SAFE_R, 'phiT', phiT, 'phiTsw', phiTsw)
if '--check' in sys.argv:
    sys.exit(0)
if problems:
    sys.exit('檢查未通過,不寫入')

# ═══════════════ 輸出成 uwu.js 的格式(與 layout-uwu-p3.py 相同的排版)═══════════════
def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items() if not k.startswith('_')}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, float):
        r = round(o, 2)
        return int(r) if r == int(r) else r
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
    for key in ('aoes', 'tethers', 'markers', 'annotations'):
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

cards_txt = ',\n'.join(card_text(c) for c in CARDS)
sections_txt = ',\n'.join(section_text(s) for s in SECTIONS)
import io, os
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'data', 'uwu.js')
src = io.open(path, encoding='utf-8').read()

# 速查卡:P4 區塊在 cheatsheet 的最後(P3 之後)
CARD_MARK = '    {\n      "id": "p4-lb"'
c1 = src.index('\n  ],\n  "sections"')
if CARD_MARK in src:
    c0 = src.index(CARD_MARK)
    src = src[:c0] + cards_txt + src[c1:]
else:
    src = src[:c1] + ',\n' + cards_txt + src[c1:]
# 章節:P4 區塊在 sections 的最後(P3 之後)
SEC_MARK = '    {\n      "id": "uwu-p4-lb"'
s1 = src.rstrip().rfind('\n  ]\n};')
if SEC_MARK in src:
    s0 = src.index(SEC_MARK)
    src = src[:s0] + sections_txt + src[s1:]
else:
    src = src[:s1] + ',\n' + sections_txt + src[s1:]
io.open(path, 'w', encoding='utf-8', newline='\n').write(src)
print('written data/uwu.js · P4 sections', len(SECTIONS), 'steps', sum(len(s['steps']) for s in SECTIONS), 'cards', len(CARDS))
