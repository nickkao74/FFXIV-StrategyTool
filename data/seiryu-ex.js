/* 極青龍徵魂戰(The Wreath of Snakes Extreme)
 *
 * 資料來源:
 *   - 機制文字:_OriginalReferences/Seiryu/huijiwiki.md(灰機 wiki 技能說明)
 *   - 處理法:_OriginalReferences/Seiryu/【菓子】FF14极青龙征魂战 超详解攻略.srt(影片逐字稿)
 *   - 尺寸與時間軸:BossMod Reborn Stormblood/Extreme/Ex8Seiryu、Trial/T09Seiryu
 *
 * 座標換算(與極朱雀相同):場地中心 = 世界座標 (100,100),名目半徑 20m = 圖上 100 → 1m = 5 單位。
 *   - P1/P2 場地:Polygon(center, 19.5) → 97.5
 *   - P3 陸地:Phase2Bounds = Polygon(center, 20) → 100;外側海水延伸到 44.5m(超出圖面,只畫到邊框)
 *
 * 實測尺寸(BossMod,A 級):
 *   降蛇 點名圓 r5 → 25          陰陽之印 圓 r12 → 60         蛇眼之印 環 7–30 → 35/150
 *   九字切 直線 寬 4 → 半寬 10    虛證彈 圓 r4 → 20             青突進 / 赤突進 直線 寬 5 → 半寬 12.5,赤突進擊退 18m
 *   青突進 拉線需拉開 25m          百噸迴轉 圓 r16 → 80          山神樂 直線 寬 6 → 半寬 15
 *   如虎添翼 扇形 45m / 60°        刀禁咒 直線 寬 8 → 半寬 20    升龍 塔 r3 → 15
 *   壓殺掌 半場 180°              大壓殺 中央圓 r5 → 25 + 擊退 10m   蛇崩 擊退 25m(防擊退無效)
 *
 * ⚠ 示意(位置無實測依據,只表達概念):
 *   九字切九條線的確切座標、升龍四座塔的確切位置、岩之式鬼 / 天之式鬼 / 式鬼車輪的落點。
 */
window.RAID_DATA = window.RAID_DATA || {};
window.RAID_DATA['seiryu-ex'] = {
  id: 'seiryu-ex',
  name: '極青龍徵魂戰',
  arena: {
    shape: 'circle',
    waymarks: [
      { id: 'A', x: 0, y: -88 },
      { id: 'B', x: 88, y: 0 },
      { id: 'C', x: 0, y: 88 },
      { id: 'D', x: -88, y: 0 },
    ],
  },
  roles: ['MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4'],

  cheatsheet: [
    {
      id: 'sigil', phase: '全程', title: '陰陽之印 / 蛇眼之印(鋼鐵 / 月環)', tag: '核心', color: 'void',
      points: [
        '**機制**:青龍先**瞬移到離它最遠的玩家身邊**,身上浮現圖案,約 3 秒後以自身為中心發動。',
        '**判讀**:**八卦圖** = 陰陽之印(半徑 12m 鋼鐵)→ 遠離;**環狀龍紋** = 蛇眼之印(7m 外的月環)→ 貼近。',
        '**P3 強化**:兩個**連續**發動,看**圖案出現的順序**決定先進後出或先出後進。',
        '判定看**動作**不看特效消失 —— 特效消失才動會被打到。大家別站太遠,讓青龍閃到近處。',
      ],
    },
    {
      id: 'kuji', phase: '全程', title: '九字切(格子 AOE)', tag: '走位', color: 'ice',
      points: [
        '**機制**:身邊浮現 9 顆珠子 → 場地上出現縱橫交錯的 9 條直線(寬 4m),約 2.5 秒後發動。',
        '每被打中一次 +1 層**受傷加重**(60 秒),不能吃。',
        '**P3 強化**:連發兩次,第二次剛好打第一次的空隙 → 先站空格,**第一次炸完立刻踩進剛炸過的線上**。',
      ],
    },
    {
      id: 'curse', phase: '全程', title: '咒怨的替身(換坦死刑)', tag: '坦克', color: 'thunder',
      points: [
        '**機制**:對 MT 掛 6 秒「咒怨的替身」,接著對**當前一仇**放魔法圓形死刑(r4m)。',
        '替身期間**受到的傷害會被放大**,時間到轉成全屏 AOE —— 替身持有者吃到死刑 = 團滅。',
        '**處理**:**讀條中**另一坦挑釁接死刑;兩坦相距 4m 以上;**替身爆炸後**才挑回來。',
        '**P3 必定連兩次**:換過去 → 換回來。',
      ],
    },
    {
      id: 'wheels', phase: 'P2 / P3', title: '青突進 / 赤突進(式鬼車輪)', tag: '連線', color: 'fire',
      points: [
        '**機制**:前方 1 隻**蒼之式鬼**連線補師 → 直線分攤(距離衰減);左右 2 隻**紅之式鬼**連線 DPS → 直線 + 擊退 18m。',
        '**處理**:分攤組全員在 **C** 集合(離藍輪越遠傷害越低);被紅輪連的 DPS **不能進分攤**,錯開角度別讓直線掃到別人。',
        '赤突進可用**防擊退**;P3 外面是海,沒開防擊退就要留好距離。',
      ],
    },
    {
      id: 'iwa', phase: 'P2 / P3', title: '岩之式鬼 + 天之式鬼', tag: '坦克', color: 'void',
      points: [
        '**百噸迴轉**:兩隻石頭鬼跳到場邊對稱位置,放半徑 16m 大圓 → **中央安全**。',
        '**山神樂**:場外一側 4 隻天狗直線衝鋒(寬 6m),**中央必定安全**。',
        '**如虎添翼**:石頭鬼連線坦克,往連線方向打 60° 扇形 —— **MT 接左、ST 接右**,扇形往場外引導(遊戲裡沒有範圍提示)。',
      ],
    },
    {
      id: 'yama', phase: 'P3', title: '山之式鬼(大太法師)', tag: 'P3 核心', color: 'ice',
      points: [
        '**壓殺掌**:舉起一隻手拍下所在半場 → 只有「左右左」「右左右」兩種,一定交替。',
        '被拍到不會死,但會拿 60 秒**打擊耐性降低** —— **第二次被拍必死**。',
        '**第 4 下大壓殺**:砸中央(r5m 即死)+ 擊退 10m,同時**蛇崩**從 B 或 D 衝來 —— 站在**蛇巢那一側**靠近中央,讓兩段擊退把你送回陸地。',
      ],
    },
    {
      id: 'forbidden', phase: 'P3', title: '刀禁咒(二連直線分攤)', tag: '分攤', color: 'thunder',
      points: [
        '**機制**:點兩位補師,依序從青龍身上往補師方向放直線分攤(寬 8m)。',
        '**一般版**:全員集合吃兩次即可,補師注意團血。',
        '**荒魂燃燒後**:附加魔法受傷加重 → **不能吃兩次**。H1 + 雙坦去 **A**、H2 + 4 DPS 去 **C**(3:5)。',
      ],
    },
    {
      id: 'towers', phase: 'P3', title: '升龍(踩塔)', tag: 'P3 核心', color: 'accent',
      points: [
        '**機制**:四角出現塔 + 每個人腳下放降蛇黃圈;同時點 4 人**升蛇**紅圈 —— 要嘛 **4 DPS**,要嘛 **雙坦 + 雙補**。',
        '塔沒人踩 → 自爆**大蛇牙**(全屏高傷 + 傷害降低)。',
        '**處理**:全員中央集合放黃圈 → **沒有紅圈的 4 人**去踩自己組的塔,有紅圈的往正點散開。',
      ],
    },
  ],

  sections: [
    // ───────────────────────── 戰前 ─────────────────────────
    {
      id: 'intro',
      phase: '戰前',
      title: '基本資訊、標記與常用技能',
      body:
        'BOSS:**青龍**(四聖獸系列最後一隻)。4.5 版本,掉落 395 裝等武器。難度大約與**極白虎**相當,全程沒有特別難背的機制,重點是**看懂青龍的圖案與式鬼的動作**。\n' +
        '雖然名字叫龍,青龍走的是**蛇**的設定,會像陰陽師一樣用符咒召喚**式鬼**作戰。\n\n' +
        '**標記**:東南西北依序放 **A / B / C / D**(A 北、B 東、C 南、D 西),沙盤圖以 A 在上。\n\n' +
        '### 三階段概覽\n' +
        '1. **P1** 青龍本體:陰陽五行全屏、升蛇 + 九字切、鋼鐵、換坦死刑。\n' +
        '2. **P2** 式鬼運動會 + 小怪:青龍不可選中,依序召喚車輪、石頭鬼、天狗,最後是泥巴小怪。打完小怪後青龍發動大招**雲蒸龍變**,把場地淹沒。\n' +
        '3. **P3** 場地縮小、外圍變成海:大太法師半場拍擊、蛇崩擊退、刀禁咒分攤,**荒魂燃燒**後所有技能強化,並加入**升龍踩塔**。約 11 分鐘狂暴。\n\n' +
        '### 青龍的兩個招牌技能:鋼鐵與月環\n' +
        '青龍發動這兩招前,會先**瞬移到離它最遠的玩家身邊**,身上浮現圖案,約 3 秒後以自身為中心發動,被打中 +1 層受傷加重(60 秒):\n\n' +
        '| 圖案 | 技能 | 形狀 | 應對 |\n' +
        '|---|---|---|---|\n' +
        '| **八卦圖** | 陰陽之印 | 以青龍為中心半徑 **12m 圓**(鋼鐵) | 遠離 |\n' +
        '| **環狀龍紋** | 蛇眼之印 | **7m 以外**的大環(月環) | 貼近青龍 |\n\n' +
        '> 判定是看青龍的**動作**,不是看圖案消失 —— 等特效消失才動會被打到。\n' +
        '> P3 荒魂燃燒後兩招會**連續**施放,依圖案出現的順序決定「先進後出」或「先出後進」。\n\n' +
        '### 本攻略的雙人組(升龍踩塔用)\n' +
        '從 A 開始順時針,每組負責**一個正點 + 它順時針方向的下一個斜角塔**:\n\n' +
        '| 組別 | 被點紅圈時散開到 | 塔 |\n' +
        '|---|---|---|\n' +
        '| {{tank:MT}} + {{dps:D1}} | **A** 北 | A–B 之間(東北) |\n' +
        '| {{tank:ST}} + {{dps:D2}} | **B** 東 | B–C 之間(東南) |\n' +
        '| {{healer:H2}} + {{dps:D4}} | **C** 南 | C–D 之間(西南) |\n' +
        '| {{healer:H1}} + {{dps:D3}} | **D** 西 | D–A 之間(西北) |',
      roleNotes: {
        'MT ST': '全程輪流吃**咒怨的替身**,P3 會連兩次;P2 / P3 的**如虎添翼**由 MT 接左、ST 接右。',
        'H1 H2': '青突進、刀禁咒都**固定點補師**。P3 強化刀禁咒 H1 去 A、H2 去 C。',
        'D1-D4': '注意赤突進連線(紅色車輪)只會連 DPS,被連到的人**不能進分攤**。',
      },
      steps: [
        {
          caption: '標記配置:A 北、B 東、C 南、D 西。開場 MT 把青龍拉在中央、面向北;其餘人在青龍背面(南側)集合',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: 0, y: -28 }, ST: { x: -12, y: 30 },
            H1: { x: 10, y: 48 }, H2: { x: -10, y: 48 },
            D1: { x: -20, y: 22 }, D2: { x: 20, y: 22 },
            D3: { x: 0, y: 56 }, D4: { x: 12, y: 32 },
          },
          annotations: [
            { type: 'text', at: [0, -106], text: '標記:A 北 / B 東 / C 南 / D 西', color: 'yellow' },
          ],
        },
        {
          caption: '陰陽之印(八卦圖):青龍瞬移到最遠的人身邊,以自身為中心放半徑 12m 的鋼鐵 → 全員遠離',
          boss: { x: 0, y: -40 },
          actors: {
            MT: { x: -40, y: 40 }, ST: { x: -20, y: 50 },
            H1: { x: 20, y: 70 }, H2: { x: -10, y: 72 },
            D1: { x: -50, y: 25 }, D2: { x: 50, y: 25 },
            D3: { x: 0, y: 60 }, D4: { x: 35, y: 45 },
          },
          aoes: [{ type: 'circle', at: 'boss', r: 60, color: 'void' }],
          annotations: [{ type: 'text', at: [0, -106], text: '八卦 = 鋼鐵 → 遠離', color: 'yellow' }],
        },
        {
          caption: '蛇眼之印(環狀龍紋):以青龍為中心,7m 以外全部是月環 → 全員貼近青龍',
          boss: { x: 0, y: -40 },
          actors: {
            MT: { x: 0, y: -56 }, ST: { x: -14, y: -26 },
            H1: { x: 14, y: -26 }, H2: { x: -22, y: -40 },
            D1: { x: -16, y: -54 }, D2: { x: 16, y: -54 },
            D3: { x: 22, y: -40 }, D4: { x: 0, y: -22 },
          },
          aoes: [{ type: 'donut', at: 'boss', rInner: 35, rOuter: 150, color: 'void' }],
          annotations: [{ type: 'text', at: [0, -106], text: '龍紋 = 月環 → 貼近', color: 'yellow' }],
        },
      ],
    },

    // ───────────────────────── P1 ─────────────────────────
    {
      id: 'p1-open',
      phase: 'P1',
      title: '開場:陰陽五行 → 升蛇 + 九字切 → 陰陽之印',
      body:
        '### 陰陽五行\n青龍詠唱 4 秒,全場無屬性魔法 AOE。P1 開場第一招,單純補血。\n\n' +
        '### 升蛇 → 降蛇\n青龍隨機點名 **4 名玩家**,頭上出現黃色標記與以本人為中心的**半徑 5m 圓形預兆**,約 6 秒後發動**降蛇**:範圍內玩家受到水屬性傷害並附加 5 秒「水屬性耐性大幅降低」。\n' +
        '→ 被點名的人要彼此拉開 **5m 以上**,也不能把圈疊到沒點名的人身上。\n\n' +
        '### 九字切\n升蛇的同時,青龍詠唱**九字切**(4 秒),身邊浮現 9 顆珠子。詠唱結束後場上出現 **9 條縱橫交錯的直線預兆**(每條寬 4m、橫貫全場),約 2.5 秒後發動**陽之刀印**,被打中 +1 層 60 秒受傷加重。\n' +
        '線與線之間會留下格子狀的空隙 → **降蛇散開時就直接站進空格**,一次處理完兩個機制。\n' +
        '> 沙盤圖上九條線的位置是**示意**:實際線的排列以遊戲內預兆為準,重點是「站在格子裡」。\n\n' +
        '### 陰陽之印(固定鋼鐵)\n九字切結束後,青龍**瞬移到離它最遠的玩家身邊**並浮現八卦圖,約 3 秒後發動半徑 12m 的鋼鐵。P1 這一次**固定是鋼鐵**,遠離即可。\n' +
        '> 判定看青龍的**動作** —— 影片中的武士就是等特效消失才跑而中招。',
      roleNotes: {
        MT: '九字切時也要站在格子裡,不要為了維持面向站在線上。陰陽之印前青龍會瞬移走,保持仇恨即可。',
        'ST H1 H2 D1-D4': '散開站格子;被點名的人互相拉開 5m 以上。',
      },
      steps: [
        {
          caption: '陰陽五行:4 秒詠唱的全場 AOE。全員在青龍背面集合',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: 0, y: -28 }, ST: { x: -12, y: 30 },
            H1: { x: 10, y: 48 }, H2: { x: -10, y: 48 },
            D1: { x: -20, y: 22 }, D2: { x: 20, y: 22 },
            D3: { x: 0, y: 56 }, D4: { x: 12, y: 32 },
          },
          annotations: [{ type: 'text', at: [0, -106], text: '陰陽五行(全屏)', color: 'yellow' }],
        },
        {
          caption: '升蛇點名 4 人(示例:D1、D2、H1、D4)+ 九字切詠唱 → 全員散開,站進直線之間的格子。被點名者的 5m 圈不能碰到任何人',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: -20, y: -40 }, ST: { x: 20, y: -40 },
            H1: { x: -20, y: 40 }, H2: { x: 20, y: 40 },
            D1: { x: -20, y: 0 }, D2: { x: 20, y: 0 },
            D3: { x: -60, y: 40 }, D4: { x: 60, y: 40 },
          },
          aoes: [
            { type: 'rect', at: [-80, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [-40, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [40, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [80, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, -60], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, -20], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, 20], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, 60], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'circle', at: 'D1', r: 25, color: 'thunder' },
            { type: 'circle', at: 'D2', r: 25, color: 'thunder' },
            { type: 'circle', at: 'H1', r: 25, color: 'thunder' },
            { type: 'circle', at: 'D4', r: 25, color: 'thunder' },
          ],
          markers: [
            { type: 'triangle', at: 'D1' }, { type: 'triangle', at: 'D2' },
            { type: 'triangle', at: 'H1' }, { type: 'triangle', at: 'D4' },
          ],
          annotations: [
            { type: 'text', at: [0, -106], text: '散開 + 站格子(線位置為示意)', color: 'yellow' },
          ],
        },
        {
          caption: '陰陽之印:青龍瞬移到最遠的人身邊(示例:D4)浮現八卦圖 → P1 固定是鋼鐵,全員往反方向跑出 12m',
          boss: { x: 56, y: 40 },
          actors: {
            MT: { x: -30, y: -40 }, ST: { x: -10, y: -55 },
            H1: { x: -50, y: 20 }, H2: { x: -20, y: -15 },
            D1: { x: -40, y: -10 }, D2: { x: 10, y: -45 },
            D3: { x: -60, y: 45 }, D4: { x: -5, y: 5 },
          },
          aoes: [{ type: 'circle', at: 'boss', r: 60, color: 'void' }],
          annotations: [
            { type: 'arrow', from: [40, 30], to: [-5, 5], color: 'white' },
            { type: 'text', at: [0, -106], text: 'P1 固定鋼鐵 → 遠離', color: 'yellow' },
          ],
        },
      ],
    },
    {
      id: 'p1-curse',
      phase: 'P1',
      title: '咒怨的替身(換坦死刑)',
      body:
        '### 機制\n' +
        '青龍詠唱**咒怨的替身**(5 秒),對當前一仇(MT)附加 6 秒的「**咒怨的替身**」,接著無詠唱對**當前一仇**發動**虛證彈**:以目標為中心半徑 4m 的高傷害魔法死刑。\n' +
        '替身狀態結束(或持有者倒地)時發動**詛咒返還** —— 把持有者在替身期間受到的傷害**放大數倍後轉成全屏 AOE**。\n' +
        '→ 換句話說:**替身持有者在 6 秒內吃到的傷害越多,全隊就吃越痛**;如果死刑打在替身身上,幾乎必定團滅。\n\n' +
        '### 處理\n' +
        '1. **詠唱期間** ST 挑釁接下仇恨,讓虛證彈打在 ST 身上。\n' +
        '2. 死刑是**以目標為中心的魔法圓形**,兩坦之間要保持 4m 以上距離,MT 也不要站在 ST 旁邊。\n' +
        '3. **替身爆炸之前不要換回來** —— 換回來 MT 就會被普攻打到,一樣會放大傷害。\n' +
        '4. 看到替身爆炸(全屏)之後,MT 再挑釁拉回。\n\n' +
        '這招結束後不久,青龍詠唱**式鬼召喚**,宣告進入 P2。',
      roleNotes: {
        MT: '被掛替身後**完全不能吃傷害**:往 ST 反方向退開,不要被普攻打到;替身爆炸後才挑回。',
        ST: '**讀條中**挑釁,開減傷吃虛證彈(單體魔法高傷)。',
        'H1 H2': '虛證彈打 ST 前先預盾;替身爆炸是全屏,爆炸後補血。',
      },
      steps: [
        {
          caption: '咒怨的替身詠唱中:MT 被掛替身。ST 在讀條期間挑釁接下仇恨,MT 往反方向退開',
          boss: { x: 0, y: 0, facing: 270 },
          actors: {
            MT: { x: 34, y: -24 }, ST: { x: -28, y: 0 },
            H1: { x: 10, y: 48 }, H2: { x: -10, y: 48 },
            D1: { x: -20, y: 26 }, D2: { x: 20, y: 26 },
            D3: { x: 0, y: 56 }, D4: { x: 10, y: 34 },
          },
          markers: [{ type: 'target', at: 'MT' }],
          tethers: [{ from: 'boss', to: 'ST', color: 'white' }],
          annotations: [
            { type: 'arrow', from: [0, -28], to: [30, -24], color: 'white' },
            { type: 'text', at: [34, -40], text: '替身', color: 'red' },
            { type: 'text', at: [0, -106], text: '讀條中 ST 挑釁', color: 'yellow' },
          ],
        },
        {
          caption: '虛證彈:以 ST 為中心半徑 4m 的魔法死刑。MT(替身)不能在範圍裡,也不要碰到普攻',
          boss: { x: 0, y: 0, facing: 270 },
          actors: {
            MT: { x: 34, y: -24 }, ST: { x: -28, y: 0 },
            H1: { x: 10, y: 48 }, H2: { x: -10, y: 48 },
            D1: { x: -20, y: 26 }, D2: { x: 20, y: 26 },
            D3: { x: 0, y: 56 }, D4: { x: 10, y: 34 },
          },
          aoes: [{ type: 'circle', at: 'ST', r: 20, color: 'thunder' }],
          markers: [{ type: 'target', at: 'MT' }],
          annotations: [{ type: 'text', at: [0, -106], text: '死刑打 ST,替身零傷害', color: 'yellow' }],
        },
        {
          caption: '替身倒數結束 → 詛咒返還(全屏,傷害 = 替身期間受到的傷害放大)。爆炸後 MT 再挑釁拉回',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: 0, y: -28 }, ST: { x: -28, y: 0 },
            H1: { x: 10, y: 48 }, H2: { x: -10, y: 48 },
            D1: { x: -20, y: 26 }, D2: { x: 20, y: 26 },
            D3: { x: 0, y: 56 }, D4: { x: 10, y: 34 },
          },
          tethers: [{ from: 'boss', to: 'MT', color: 'white' }],
          annotations: [
            { type: 'arrow', from: [34, -24], to: [4, -28], color: 'white' },
            { type: 'text', at: [0, -106], text: '爆炸後才換回來', color: 'yellow' },
          ],
        },
      ],
    },

    // ───────────────────────── P2 ─────────────────────────
    {
      id: 'p2-wheels',
      phase: 'P2',
      title: '式鬼召喚:青突進 / 赤突進(車輪)',
      body:
        '青龍詠唱**式鬼召喚**後移動到**場地前方(北)**蓄力並變成**不可選中**,出現「青龍的神通力」量表。P2 是一段式鬼運動會加小怪,**神通力累積到 100 前沒殺完小怪會被強制滅團**。\n\n' +
        '### 第一波:三個車輪\n' +
        '- **蒼之式鬼**(藍色,場地前方 1 隻):隨機連線 1 名**補師**,一段時間後朝該補師發動**青突進** —— **可分攤、隨距離衰減**的高傷害直線(寬 5m、貫穿全場)。連線需拉開 25m 以上。\n' +
        '- **紅之式鬼**(紅色,左右兩側各 1 隻):各隨機連線 1 名 **DPS**,發動**赤突進** —— 朝目標的直線(寬 5m),並把目標**擊退 18m**。\n\n' +
        '### 處理\n' +
        '- 藍色車輪的位置固定在北方,所以**分攤組全員在 C 點集合**:離得越遠衰減越多,也滿足拉線距離。\n' +
        '- 被紅色車輪連到的兩位 DPS **不能進分攤**(赤突進的直線會一起打到分攤組),往自己車輪的**斜前方**站,讓直線往北側空地打,彼此錯開角度別掃到對方。\n' +
        '- 赤突進有擊退,可以開**防擊退**;沒開的話留好距離,注意擊退方向。',
      roleNotes: {
        'H1 H2': '被藍線連到的補師站到 C 點最遠處,其他人跟著你分攤。',
        'D1-D4': '被紅線連到 → 離開分攤組,往自家車輪的斜前方站;可開防擊退。沒被連 → 去 C 分攤。',
        'MT ST': '去 C 參加分攤,分攤人數越多越安全。',
      },
      steps: [
        {
          caption: '青龍到北方蓄力(不可選中)。藍色車輪在前方連線補師(示例 H1),兩隻紅色車輪在東西兩側各連一位 DPS(示例 D1、D2)',
          boss: { x: 0, y: -104, facing: 180 },
          actors: {
            MT: { x: -8, y: 80 }, ST: { x: 8, y: 80 },
            H1: { x: 0, y: 88 }, H2: { x: -12, y: 72 },
            D1: { x: -60, y: -25 }, D2: { x: 60, y: -25 },
            D3: { x: 12, y: 72 }, D4: { x: 0, y: 70 },
          },
          aoes: [
            { type: 'enemy', at: [0, -72], r: 8, tone: 'neutral', label: '蒼' },
            { type: 'enemy', at: [-104, 0], r: 8, tone: 'fire', label: '紅' },
            { type: 'enemy', at: [104, 0], r: 8, tone: 'fire', label: '紅' },
          ],
          tethers: [
            { from: [0, -72], to: 'H1', color: 'white' },
            { from: [-104, 0], to: 'D1', color: 'purple' },
            { from: [104, 0], to: 'D2', color: 'purple' },
          ],
          markers: [{ type: 'share', at: 'H1' }],
          annotations: [{ type: 'text', at: [0, 108], text: '分攤組全員到 C', color: 'yellow' }],
        },
        {
          caption: '青突進往 C 的分攤組直線打下(距離衰減);赤突進朝被連的 DPS 打直線並擊退 18m —— 直線往北側空地,不會掃到分攤組',
          boss: { x: 0, y: -104, facing: 180 },
          actors: {
            MT: { x: -8, y: 80 }, ST: { x: 8, y: 80 },
            H1: { x: 0, y: 88 }, H2: { x: -12, y: 72 },
            D1: { x: 18, y: -69 }, D2: { x: -18, y: -69 },
            D3: { x: 12, y: 72 }, D4: { x: 0, y: 70 },
          },
          aoes: [
            { type: 'enemy', at: [0, -72], r: 8, tone: 'neutral', label: '蒼' },
            { type: 'enemy', at: [-104, 0], r: 8, tone: 'fire', label: '紅' },
            { type: 'enemy', at: [104, 0], r: 8, tone: 'fire', label: '紅' },
            { type: 'rect', at: [0, -72], angle: 180, lengthFront: 200, halfWidth: 12.5, color: 'thunder' },
            { type: 'rect', at: [-104, 0], angle: 60, lengthFront: 210, halfWidth: 12.5, color: 'fire' },
            { type: 'rect', at: [104, 0], angle: 300, lengthFront: 210, halfWidth: 12.5, color: 'fire' },
          ],
          annotations: [
            { type: 'arrow', from: [-60, -25], to: [16, -67], color: 'white', dash: true },
            { type: 'arrow', from: [60, -25], to: [-16, -67], color: 'white', dash: true },
            { type: 'text', at: [0, 108], text: '赤突進 擊退 18m(可防擊退)', color: 'yellow' },
          ],
        },
      ],
    },
    {
      id: 'p2-iwa',
      phase: 'P2',
      title: '岩之式鬼:百噸迴轉 → 山神樂 → 如虎添翼',
      body:
        '### 百噸迴轉\n' +
        '藍色車輪詠唱期間,它左右各出現 1 隻**岩之式鬼**(石頭鬼),稍後**交叉跳到場地對稱的兩側邊緣**,詠唱**百噸迴轉**(4 秒):以自身為中心**半徑 16m** 的大圓 + 擊退。\n' +
        '場地半徑約 20m,兩邊各吃掉 16m → **只剩中央一條空隙**。落點不一定是正點,也可能是斜的,無所謂,**往中間集合**就對了。\n\n' +
        '### 山神樂\n' +
        '石頭鬼詠唱期間,場地**隨機一側出現 4 隻天之式鬼(天狗)**,詠唱 5 秒後沿直線衝鋒(寬 6m、貫穿全場),並小距離擊退。天狗的線**一定避開中央** → 繼續待在中間。\n\n' +
        '### 如虎添翼\n' +
        '同時兩隻石頭鬼各和一名玩家**連線**,約 6 秒後朝連線方向打**60° 扇形**(長 45m)的物理高傷害。\n' +
        '- 本攻略規定 **MT 接左邊、ST 接右邊**的線。\n' +
        '- 接到線後坦克要把扇形**往場外引導** —— 遊戲裡**沒有範圍提示**,要自己估角度,別讓扇形掃回中央的人群。\n' +
        '- 天狗的直線先打、扇形後打:坦克**等天狗衝完再出去**。',
      roleNotes: {
        MT: '接**左邊**石頭鬼的線,天狗衝完後站到石頭鬼旁邊,讓扇形沿場邊往外打。',
        ST: '接**右邊**石頭鬼的線,處理同 MT。',
        'H1 H2 D1-D4': '全程待在場地中央;天狗、百噸迴轉都打不到中間。',
      },
      steps: [
        {
          caption: '百噸迴轉:兩隻石頭鬼跳到對稱兩側(示例:東西),各放半徑 16m 大圓 → 全員往中央集合',
          boss: { x: 0, y: -104, facing: 180 },
          actors: {
            MT: { x: -6, y: -10 }, ST: { x: 6, y: -10 },
            H1: { x: -6, y: 10 }, H2: { x: 6, y: 10 },
            D1: { x: -8, y: 0 }, D2: { x: 8, y: 0 },
            D3: { x: 0, y: 14 }, D4: { x: 0, y: -14 },
          },
          aoes: [
            { type: 'circle', at: [-92, 0], r: 80, color: 'void' },
            { type: 'circle', at: [92, 0], r: 80, color: 'void' },
            { type: 'enemy', at: [-92, 0], r: 10, tone: 'earth', label: '岩' },
            { type: 'enemy', at: [92, 0], r: 10, tone: 'earth', label: '岩' },
          ],
          annotations: [{ type: 'text', at: [0, 108], text: '中央集合(落點可能是斜的)', color: 'yellow' }],
        },
        {
          caption: '山神樂:一側出現 4 隻天狗(示例:北方)朝對面直線衝鋒,中央一定安全。同時石頭鬼連線 MT(左)與 ST(右)—— 坦克先留在中間',
          boss: { x: 0, y: -104, facing: 180 },
          actors: {
            MT: { x: -6, y: -10 }, ST: { x: 6, y: -10 },
            H1: { x: -6, y: 10 }, H2: { x: 6, y: 10 },
            D1: { x: -8, y: 0 }, D2: { x: 8, y: 0 },
            D3: { x: 0, y: 14 }, D4: { x: 0, y: -14 },
          },
          aoes: [
            { type: 'enemy', at: [-92, 0], r: 10, tone: 'earth', label: '岩' },
            { type: 'enemy', at: [92, 0], r: 10, tone: 'earth', label: '岩' },
            { type: 'rect', at: [-72, -110], angle: 180, lengthFront: 220, halfWidth: 15, color: 'wind' },
            { type: 'rect', at: [-38, -110], angle: 180, lengthFront: 220, halfWidth: 15, color: 'wind' },
            { type: 'rect', at: [38, -110], angle: 180, lengthFront: 220, halfWidth: 15, color: 'wind' },
            { type: 'rect', at: [72, -110], angle: 180, lengthFront: 220, halfWidth: 15, color: 'wind' },
          ],
          tethers: [
            { from: [-92, 0], to: 'MT', color: 'green' },
            { from: [92, 0], to: 'ST', color: 'green' },
          ],
          annotations: [{ type: 'text', at: [0, 108], text: '天狗線位置為示意 · 中央安全', color: 'yellow' }],
        },
        {
          caption: '如虎添翼:天狗衝完後,兩坦走到自己的石頭鬼旁,把 60° 扇形沿場邊往外引導,別讓扇形掃到中央',
          boss: { x: 0, y: -104, facing: 180 },
          actors: {
            MT: { x: -78, y: -48 }, ST: { x: 78, y: 48 },
            H1: { x: -6, y: 10 }, H2: { x: 6, y: 10 },
            D1: { x: -8, y: 0 }, D2: { x: 8, y: 0 },
            D3: { x: 0, y: 14 }, D4: { x: 0, y: -14 },
          },
          aoes: [
            { type: 'enemy', at: [-92, 0], r: 10, tone: 'earth', label: '岩' },
            { type: 'enemy', at: [92, 0], r: 10, tone: 'earth', label: '岩' },
            { type: 'cone', at: [-92, 0], angle: 16, spread: 60, r: 225, color: 'thunder' },
            { type: 'cone', at: [92, 0], angle: 196, spread: 60, r: 225, color: 'thunder' },
          ],
          tethers: [
            { from: [-92, 0], to: 'MT', color: 'green' },
            { from: [92, 0], to: 'ST', color: 'green' },
          ],
          annotations: [{ type: 'text', at: [0, 108], text: '沒有範圍提示 · 往場外引導', color: 'yellow' }],
        },
      ],
    },
    {
      id: 'p2-adds',
      phase: 'P2',
      title: '泥巴小怪 → 靈氣 → 雲蒸龍變',
      body:
        '### 沼之式鬼 / 泥之式鬼\n' +
        '運動會結束後,依序生成 **2 隻沼之式鬼(大)** 與 **9 隻泥之式鬼(小,3 隻一組)**:\n' +
        '- **石膚**(大怪詠唱 5 秒,**可打斷**):為自己與附近的式鬼附加石膚。第一隻由 **MT 打斷**、第二隻由 **ST 打斷**。\n' +
        '- **爆炸**:不管大小,**死亡時都會自爆**,對全場造成地屬性魔法傷害;**大怪的傷害更高**。\n\n' +
        '→ 為了避免同時爆炸,擊殺順序是 **小 → 大 → 小 → 大 → 小**,每次爆炸之間讓補師把血補回來。小怪拉到一起用範圍技打。\n\n' +
        '### 量表與轉場\n' +
        '殺光全部小怪後,青龍詠唱**靈氣**(5 秒):以自身為中心擊退全員 24m 並**拘束**,接著施放轉場大招**雲蒸龍變**(24 秒詠唱),把場地淹沒並造成全屏傷害。\n' +
        '> 若「青龍的神通力」量表累積到 100 時還沒殺完,青龍會強制擊殺所有式鬼,並在雲蒸龍變後**直接滅團** —— 這是 P2 的 DPS 檢定。\n\n' +
        '雲蒸龍變之後所有人會被丟進海裡,進入 P3。',
      roleNotes: {
        MT: '負責打斷**第一隻**沼之式鬼的石膚。把小怪拉在一起。',
        ST: '負責打斷**第二隻**沼之式鬼的石膚。',
        'H1 H2': '每次自爆都是全屏,大怪更痛;按小大小大小的節奏補血。雲蒸龍變前補滿。',
        'D1-D4': '依 **小 → 大 → 小 → 大 → 小** 的順序擊殺,不要讓兩組同時爆。',
      },
      steps: [
        {
          caption: '泥巴怪出現:一隻大的(沼)+ 三隻小的(泥),拉到一起範圍打。大怪詠唱石膚 → MT 打斷',
          boss: { x: 0, y: -104, facing: 180 },
          actors: {
            MT: { x: 0, y: -22 }, ST: { x: -18, y: -10 },
            H1: { x: -14, y: 40 }, H2: { x: 14, y: 40 },
            D1: { x: -16, y: 14 }, D2: { x: 16, y: 14 },
            D3: { x: -4, y: 36 }, D4: { x: 4, y: 20 },
          },
          aoes: [
            { type: 'enemy', at: [0, -4], r: 10, tone: 'earth', label: '沼' },
            { type: 'enemy', at: [-12, 4], r: 6, tone: 'earth', label: '泥' },
            { type: 'enemy', at: [12, 4], r: 6, tone: 'earth', label: '泥' },
            { type: 'enemy', at: [0, 10], r: 6, tone: 'earth', label: '泥' },
          ],
          annotations: [{ type: 'text', at: [0, 108], text: '擊殺順序:小 → 大 → 小 → 大 → 小', color: 'yellow' }],
        },
        {
          caption: '殺光小怪 → 靈氣:以青龍為中心擊退 + 拘束 → 雲蒸龍變(24 秒詠唱,全屏)把場地淹沒',
          boss: { x: 0, y: -60, facing: 180 },
          actors: {
            MT: { x: -40, y: 70 }, ST: { x: 40, y: 70 },
            H1: { x: -70, y: 30 }, H2: { x: 70, y: 30 },
            D1: { x: -20, y: 80 }, D2: { x: 20, y: 80 },
            D3: { x: -60, y: 55 }, D4: { x: 60, y: 55 },
          },
          annotations: [
            { type: 'knockback', at: [0, -60], count: 8, rInner: 20, rOuter: 50 },
            { type: 'text', at: [0, 108], text: '雲蒸龍變前補滿血', color: 'yellow' },
          ],
        },
      ],
    },

    // ───────────────────────── P3 ─────────────────────────
    {
      id: 'p3-sea',
      phase: 'P3',
      title: '轉場:海水、荒波與第一次蛇崩',
      body:
        '### 場地變化\n' +
        '雲蒸龍變之後,陸地變成**半徑 20m 的圓**,外側全部是**海水**。所有人一開始都在海裡:\n' +
        '- 只要待在海水中就會被附加 3 秒**淹沒**與**受傷加重**,而且**只能游泳、不能施放技能**。\n' +
        '- **荒波**:青龍會持續在海面放小範圍扇形與環形預兆(詠唱 4 秒),被打中會擊飛並再次淹沒。\n\n' +
        '→ 開場第一件事:**避開海面的預兆,盡快游回陸地**。\n\n' +
        '### 蛇崩(青之大蛇)\n' +
        '青龍詠唱**式鬼召喚**(5 秒),在場地**隨機一側(B 東或 D 西)**召喚**青之大蛇**(蛇巢)。一段時間後大蛇詠唱**蛇崩**(8 秒):\n' +
        '- 朝前方衝刺,對全場造成水屬性傷害,並**沿衝刺方向擊退 25m**。\n' +
        '- **防擊退技能無效**。\n\n' +
        '陸地直徑只有 40m,擊退 25m → 必須**站在蛇巢那一側的場邊**,被推過中央後才會停在陸地上。站錯邊會直接被推進海裡。',
      roleNotes: {
        'MT ST H1 H2 D1-D4': '游回陸地 → 看蛇巢在 B 還是 D → **往蛇巢那側的場邊靠**。蛇崩不能用防擊退。',
      },
      steps: [
        {
          caption: '雲蒸龍變後全員被丟進海裡:海中只能游泳、無法施放技能,荒波會在海面放扇形與環形預兆 → 避開預兆盡快游回陸地',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: 0, y: -110 }, ST: { x: 78, y: -78 },
            H1: { x: -110, y: 0 }, H2: { x: 110, y: 0 },
            D1: { x: -78, y: -78 }, D2: { x: 78, y: 78 },
            D3: { x: -78, y: 78 }, D4: { x: 0, y: 110 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'cone', at: [0, 0], angle: 70, spread: 30, r: 170, color: 'wind' },
            { type: 'cone', at: [0, 0], angle: 250, spread: 30, r: 170, color: 'wind' },
          ],
          annotations: [
            { type: 'arrow', from: [0, -108], to: [0, -84], color: 'white' },
            { type: 'arrow', from: [-108, 0], to: [-84, 0], color: 'white' },
            { type: 'arrow', from: [108, 0], to: [84, 0], color: 'white' },
            { type: 'arrow', from: [0, 108], to: [0, 84], color: 'white' },
            { type: 'text', at: [0, 0], text: '陸地 r20m', color: 'yellow' },
          ],
        },
        {
          caption: '蛇崩:蛇巢出現在 B 或 D(示例:D 西)→ 全員到 D 側場邊。大蛇朝東衝刺,全員沿衝刺方向被擊退 25m,停在東側陸地上',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: -82, y: -24 }, ST: { x: -88, y: -10 },
            H1: { x: -88, y: 10 }, H2: { x: -82, y: 24 },
            D1: { x: -76, y: -12 }, D2: { x: -76, y: 12 },
            D3: { x: -90, y: 0 }, D4: { x: -78, y: 0 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'enemy', at: [-110, 0], r: 8, tone: 'neutral', label: '蛇' },
          ],
          annotations: [
            { type: 'arrow', from: [-70, -40], to: [55, -40], color: 'blue' },
            { type: 'arrow', from: [-70, 40], to: [55, 40], color: 'blue' },
            { type: 'text', at: [0, -106], text: '蛇崩擊退 25m · 防擊退無效', color: 'yellow' },
          ],
        },
      ],
    },
    {
      id: 'p3-yama',
      phase: 'P3',
      title: '山之式鬼:壓殺掌 ×3 → 大壓殺 + 蛇崩',
      body:
        '### 壓殺掌\n' +
        '青龍詠唱**式鬼召喚**(3 秒),在**場地前方(北)**召喚巨大的**山之式鬼**(大太法師)。它會**舉起一隻手蓄力**(4.5 秒),然後**拍向該手所在的半場**:\n' +
        '- 對該半場的玩家造成打擊傷害,並附加 60 秒**打擊耐性降低**。\n' +
        '- 被拍一次不會死,但**第二次被拍幾乎必死**。\n' +
        '- 只有「**左 → 右 → 左**」與「**右 → 左 → 右**」兩種,**一定交替**。\n\n' +
        '→ 看它舉哪隻手,跑到**另一半場**。中間會夾一次陰陽五行(全屏)。\n\n' +
        '### 第 4 下:大壓殺 + 蛇崩\n' +
        '拍完三次後,第四下改成**大壓殺**:場地中央出現擊退預兆,砸向中央 —— **中央半徑 5m 即死**(999999 固定傷害),並以中央為原點**往外擊退 10m**。\n' +
        '同一時間青龍**必定再召喚蛇巢**,大壓殺之後約 2 秒接著蛇崩(擊退 25m)。\n\n' +
        '→ 兩段擊退要接得起來:**站在蛇巢那一側、靠近中央但在紅圈外**。大壓殺把你往蛇巢方向推 10m,蛇崩再把你推過中央,最後停在對側陸地上。\n' +
        '> 小心不要踩進中央的紅色範圍。',
      roleNotes: {
        'MT ST H1 H2 D1-D4': '看舉哪隻手 → 跑到另一半。第四下:先確認蛇巢方向,站在蛇巢那側的中央紅圈外。',
      },
      steps: [
        {
          caption: '壓殺掌:大太法師(北)舉起手 → 拍下該手所在的半場(示例:先拍西半場)→ 全員到東半場',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: 30, y: -40 }, ST: { x: 40, y: 20 },
            H1: { x: 60, y: 50 }, H2: { x: 55, y: -10 },
            D1: { x: 22, y: -20 }, D2: { x: 30, y: 10 },
            D3: { x: 70, y: 20 }, D4: { x: 25, y: 40 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'cone', at: [0, 0], angle: 270, spread: 180, r: 100, color: 'death' },
            { type: 'enemy', at: [0, -106], r: 12, tone: 'earth', label: '山' },
          ],
          annotations: [{ type: 'text', at: [0, 106], text: '左右左 或 右左右,一定交替', color: 'yellow' }],
        },
        {
          caption: '第二下拍另一半(示例:東)→ 全員回西半場。被拍過一次的人絕對不能再被拍',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: -30, y: -40 }, ST: { x: -40, y: 20 },
            H1: { x: -60, y: 50 }, H2: { x: -55, y: -10 },
            D1: { x: -22, y: -20 }, D2: { x: -30, y: 10 },
            D3: { x: -70, y: 20 }, D4: { x: -25, y: 40 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'cone', at: [0, 0], angle: 90, spread: 180, r: 100, color: 'death' },
            { type: 'enemy', at: [0, -106], r: 12, tone: 'earth', label: '山' },
          ],
          annotations: [{ type: 'text', at: [0, 106], text: '第二次被拍必死', color: 'red' }],
        },
        {
          caption: '第四下大壓殺 + 蛇崩:蛇巢在 D(示例)→ 全員站在中央紅圈外的西側。先被大壓殺往西推 10m,再被蛇崩往東推 25m,落在東側陸地',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: -30, y: -14 }, ST: { x: -32, y: 0 },
            H1: { x: -32, y: 10 }, H2: { x: -28, y: 18 },
            D1: { x: -36, y: -8 }, D2: { x: -36, y: 8 },
            D3: { x: -40, y: 0 }, D4: { x: -30, y: -4 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'circle', at: [0, 0], r: 25, color: 'death' },
            { type: 'enemy', at: [0, -106], r: 12, tone: 'earth', label: '山' },
            { type: 'enemy', at: [-110, 0], r: 8, tone: 'neutral', label: '蛇' },
          ],
          annotations: [
            { type: 'arrow', from: [-40, 30], to: [-80, 30], color: 'white' },
            { type: 'arrow', from: [-80, 44], to: [40, 44], color: 'blue' },
            { type: 'text', at: [-60, 22], text: '① 10m', color: 'white' },
            { type: 'text', at: [0, 56], text: '② 蛇崩 25m', color: 'blue' },
            { type: 'text', at: [0, -84], text: '中央 r5m 即死', color: 'red' },
          ],
        },
      ],
    },
    {
      id: 'p3-forbidden',
      phase: 'P3',
      title: '刀禁咒(二連分攤)→ 荒魂燃燒',
      body:
        '### 刀禁咒\n' +
        '青龍點名 **2 名補師**(固定點補師),頭上出現可分攤的高傷害直線預兆,稍後**依序**從青龍身上朝兩位補師的方向各放一次直線(寬 8m、貫穿全場),間隔約 2 秒。\n' +
        '- **一般版**(荒魂燃燒前):直接**全員集合**在同一處,連吃兩次即可。補師注意團血。\n' +
        '- **強化版**(荒魂燃燒後):額外附加 5 秒**魔法受傷加重** → 吃過第一刀的人再吃第二刀會死,必須**分兩組**。強化版的處理見「升龍」章節。\n\n' +
        '### 荒魂燃燒\n' +
        '青龍詠唱**荒魂燃燒**(5 秒),為自身附加同名狀態,之後以下技能全部強化:\n\n' +
        '| 技能 | 強化內容 |\n' +
        '|---|---|\n' +
        '| 九字切 | **連發兩次**,第二次打第一次沒打到的地方 |\n' +
        '| 陰陽之印 / 蛇眼之印 | 兩個**隨機順序連續**施放 |\n' +
        '| 陰陽五行 | 傷害提高 |\n' +
        '| 刀禁咒 | 附加魔法受傷加重(要分組) |\n' +
        '| 咒怨的替身 | **連續兩次** |',
      roleNotes: {
        'H1 H2': '刀禁咒固定點補師。一般版兩人站在一起讓全員分攤;強化版 H1 去 A、H2 去 C。',
        'MT ST D1-D4': '一般版全員跟著補師集合吃兩次。',
      },
      steps: [
        {
          caption: '一般版刀禁咒:點兩位補師 → 全員在青龍背面(C 方向)集合,連吃兩刀直線分攤',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: -6, y: 56 }, ST: { x: 6, y: 56 },
            H1: { x: -4, y: 64 }, H2: { x: 4, y: 64 },
            D1: { x: -8, y: 48 }, D2: { x: 8, y: 48 },
            D3: { x: -6, y: 72 }, D4: { x: 6, y: 72 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'rect', at: [0, 0], angle: 180, lengthFront: 120, halfWidth: 20, color: 'thunder' },
          ],
          markers: [{ type: 'share', at: 'H1' }, { type: 'share', at: 'H2' }],
          annotations: [{ type: 'text', at: [0, -106], text: '一般版:全員吃兩刀', color: 'yellow' }],
        },
      ],
    },
    {
      id: 'p3-empowered',
      phase: 'P3',
      title: '強化陰陽 / 蛇眼之印與強化九字切',
      body:
        '### 強化陰陽之印 + 蛇眼之印\n' +
        '荒魂燃燒後的第一招。青龍同樣**先瞬移到最遠的玩家身邊**,身上**依序**浮現兩種圖案,然後照出現順序**連續**發動鋼鐵(12m 圓)與月環(7m 外環),間隔約 3 秒。\n' +
        '- 先看到**龍紋** → 先**月環** → 先貼近,看到第一招的光效後再遠離。\n' +
        '- 先看到**八卦** → 先**鋼鐵** → 先遠離,第一招打完再貼回來。\n' +
        '> 每次發動前青龍都會閃到最遠的人身上,**大家最好別站太遠**,讓它閃到近處比較好躲。\n\n' +
        '### 強化九字切\n' +
        '九字切**連發兩次**,間隔約 1.5 秒:第二次的線剛好落在**第一次的空隙**上,兩次加起來會蓋滿全場。\n' +
        '→ 利用時間差躲:**先站在第一次的空格裡**,第一次炸完的瞬間**踩進剛炸過的線上**(那裡是第二次的空格)。\n\n' +
        '影片中第一輪是**先月環後鋼鐵**,接著強化九字切,然後是**先鋼鐵**再接陰陽五行全屏。',
      roleNotes: {
        'MT ST H1 H2 D1-D4': '鋼鐵月環:看圖案順序。九字切:站空格 → 第一發炸完立刻踩上剛炸的線。',
      },
      steps: [
        {
          caption: '強化鋼鐵月環(示例:龍紋先 → 先月環):青龍閃到身邊,全員先貼近青龍',
          boss: { x: 0, y: -30 },
          actors: {
            MT: { x: 0, y: -50 }, ST: { x: -16, y: -16 },
            H1: { x: 16, y: -16 }, H2: { x: -22, y: -34 },
            D1: { x: -14, y: -46 }, D2: { x: 14, y: -46 },
            D3: { x: 22, y: -34 }, D4: { x: 0, y: -10 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'donut', at: 'boss', rInner: 35, rOuter: 150, color: 'void' },
          ],
          annotations: [{ type: 'text', at: [0, 106], text: '① 月環 → 貼近', color: 'yellow' }],
        },
        {
          caption: '看到第一招的光效後立刻遠離 → 第二招鋼鐵(12m 圓)',
          boss: { x: 0, y: -30 },
          actors: {
            MT: { x: -40, y: 40 }, ST: { x: -60, y: 20 },
            H1: { x: 30, y: 60 }, H2: { x: -10, y: 60 },
            D1: { x: -70, y: -10 }, D2: { x: 70, y: -10 },
            D3: { x: 60, y: 30 }, D4: { x: 10, y: 45 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'circle', at: 'boss', r: 60, color: 'void' },
          ],
          annotations: [{ type: 'text', at: [0, 106], text: '② 鋼鐵 → 遠離', color: 'yellow' }],
        },
        {
          caption: '強化九字切第一發:先站在空格裡(線位置為示意)',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: -20, y: -40 }, ST: { x: 20, y: -40 },
            H1: { x: -20, y: 40 }, H2: { x: 20, y: 40 },
            D1: { x: -20, y: 0 }, D2: { x: 20, y: 0 },
            D3: { x: -60, y: 40 }, D4: { x: 60, y: 40 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'rect', at: [-80, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [-40, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [40, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [80, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, -60], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, -20], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, 20], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
            { type: 'rect', at: [0, 60], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'ice' },
          ],
          annotations: [{ type: 'text', at: [0, -106], text: '① 站空格', color: 'yellow' }],
        },
        {
          caption: '第一發炸完 → 立刻踩進剛炸過的線(第二發的空格),第二發打的正是剛剛的空格',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: -40, y: -20 }, ST: { x: 40, y: -20 },
            H1: { x: -40, y: 20 }, H2: { x: 40, y: 20 },
            D1: { x: 0, y: -20 }, D2: { x: 0, y: 20 },
            D3: { x: -80, y: 20 }, D4: { x: 80, y: 20 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'rect', at: [-60, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
            { type: 'rect', at: [-20, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
            { type: 'rect', at: [20, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
            { type: 'rect', at: [60, 0], angle: 0, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
            { type: 'rect', at: [0, -80], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
            { type: 'rect', at: [0, -40], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
            { type: 'rect', at: [0, 0], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
            { type: 'rect', at: [0, 40], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
            { type: 'rect', at: [0, 80], angle: 90, lengthFront: 100, lengthBack: 100, halfWidth: 10, color: 'void' },
          ],
          annotations: [{ type: 'text', at: [0, -106], text: '② 踩上剛炸過的線', color: 'yellow' }],
        },
      ],
    },
    {
      id: 'p3-towers',
      phase: 'P3',
      title: '升龍(踩塔)→ 強化刀禁咒 3:5',
      body:
        '### 升龍\n' +
        '青龍詠唱**升龍**(4 秒),同時發生三件事:\n' +
        '1. **場地四角出現藍色的塔**(半徑 3m)。\n' +
        '2. **所有玩家腳下**出現降蛇的黃圈預兆(半徑 5m,約 3 秒後落下)。\n' +
        '3. 隨機點名 **4 人升蛇**(紅圈,約 6 秒後以本人為中心降蛇):被點的**要嘛是 4 個 DPS,要嘛是雙坦 + 雙補**。\n\n' +
        '塔的判定:塔內有人 → **蛇牙**(只對踩塔者造成小傷害);**塔內沒人 → 自爆大蛇牙**,全員高傷害水屬性 + 疊一層 30 秒傷害降低。\n' +
        '→ 所以四座塔**每座都要有一個人**,而**被點紅圈的人不能踩塔**(紅圈會炸到踩塔的隊友,且身上的水耐性降低會讓蛇牙變很痛)。\n\n' +
        '### 處理\n' +
        '1. 全員先在**中央集合**,讓腳下的黃圈都放在中間。\n' +
        '2. 黃圈出現後散開:**沒有紅圈的 4 人去踩自己組的塔**;有紅圈的人往**自己組對應的正點**散開。\n' +
        '   - 紅圈點 DPS → 雙坦雙補踩塔;紅圈點 T/H → 4 個 DPS 踩塔。\n\n' +
        '### 強化刀禁咒(3:5)\n' +
        '踩塔結束後青龍會再放刀禁咒,這次是**強化版**(魔法受傷加重)→ 不能全員吃兩刀:\n' +
        '- **H1 + MT + ST** 去 **A**(北)\n' +
        '- **H2 + 4 DPS** 去 **C**(南)\n\n' +
        '刀禁咒一定點兩位補師,只要滿血 3 人也吃得下。如果場上只剩一位補師,**補師無腦去 A**,形成 3:4 一樣能處理。',
      roleNotes: {
        'MT ST H1 H2': '沒紅圈去踩自己組的塔、有紅圈去自己組的正點(MT 東北塔 / A、ST 東南塔 / B、H2 西南塔 / C、H1 西北塔 / D)。刀禁咒:MT、ST、H1 去 A。',
        'D1-D4': '沒紅圈去踩自己組的塔、有紅圈去自己組的正點(D1 東北塔 / A、D2 東南塔 / B、D4 西南塔 / C、D3 西北塔 / D)。刀禁咒:跟 H2 去 C。',
      },
      steps: [
        {
          caption: '升龍詠唱:全員中央集合。四角出現塔,每個人腳下都會落降蛇黃圈;紅圈點名(示例:4 個 DPS)',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: 26, y: -6 }, ST: { x: 26, y: 6 },
            H1: { x: -26, y: -6 }, H2: { x: -26, y: 6 },
            D1: { x: 14, y: -20 }, D2: { x: 14, y: 20 },
            D3: { x: -14, y: -20 }, D4: { x: -14, y: 20 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'tower', at: [-50, -50], r: 15 },
            { type: 'tower', at: [50, -50], r: 15 },
            { type: 'tower', at: [-50, 50], r: 15 },
            { type: 'tower', at: [50, 50], r: 15 },
          ],
          markers: [
            { type: 'triangle', at: 'D1' }, { type: 'triangle', at: 'D2' },
            { type: 'triangle', at: 'D3' }, { type: 'triangle', at: 'D4' },
          ],
          annotations: [{ type: 'text', at: [0, -106], text: '中央集合放黃圈(塔位置為示意)', color: 'yellow' }],
        },
        {
          caption: '黃圈落在中央 → 散開:沒紅圈的 MT / ST / H1 / H2 踩自己組的塔,有紅圈的 DPS 去自己組的正點(D1 A、D2 B、D4 C、D3 D)',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: 50, y: -50 }, ST: { x: 50, y: 50 },
            H1: { x: -50, y: -50 }, H2: { x: -50, y: 50 },
            D1: { x: 0, y: -88 }, D2: { x: 88, y: 0 },
            D3: { x: -88, y: 0 }, D4: { x: 0, y: 88 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'circle', at: [26, -6], r: 25, color: 'fire' },
            { type: 'circle', at: [-26, 6], r: 25, color: 'fire' },
            { type: 'circle', at: [-14, -20], r: 25, color: 'fire' },
            { type: 'circle', at: [14, 20], r: 25, color: 'fire' },
            { type: 'tower', at: [-50, -50], r: 15 },
            { type: 'tower', at: [50, -50], r: 15 },
            { type: 'tower', at: [-50, 50], r: 15 },
            { type: 'tower', at: [50, 50], r: 15 },
            { type: 'circle', at: 'D1', r: 25, color: 'thunder' },
            { type: 'circle', at: 'D2', r: 25, color: 'thunder' },
            { type: 'circle', at: 'D3', r: 25, color: 'thunder' },
            { type: 'circle', at: 'D4', r: 25, color: 'thunder' },
          ],
          annotations: [{ type: 'text', at: [0, -106], text: '紅圈點 DPS → T/H 踩塔', color: 'yellow' }],
        },
        {
          caption: '強化刀禁咒 3:5:H1 + 雙坦到 A、H2 + 4 DPS 到 C,各吃一刀(吃兩刀會因魔法受傷加重而死)',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: -8, y: -58 }, ST: { x: 8, y: -58 },
            H1: { x: 0, y: -66 }, H2: { x: 0, y: 66 },
            D1: { x: -8, y: 56 }, D2: { x: 8, y: 56 },
            D3: { x: -8, y: 72 }, D4: { x: 8, y: 72 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'rect', at: [0, 0], angle: 0, lengthFront: 120, halfWidth: 20, color: 'thunder' },
            { type: 'rect', at: [0, 0], angle: 180, lengthFront: 120, halfWidth: 20, color: 'thunder' },
          ],
          markers: [{ type: 'share', at: 'H1' }, { type: 'share', at: 'H2' }],
          annotations: [
            { type: 'text', at: [40, -66], text: '3 人', color: 'white' },
            { type: 'text', at: [40, 66], text: '5 人', color: 'white' },
          ],
        },
      ],
    },
    {
      id: 'p3-curse-adds',
      phase: 'P3',
      title: '二連替身 → 式鬼再召喚',
      body:
        '### 二連咒怨的替身\n' +
        '陰陽五行全屏後,青龍施放咒怨的替身。荒魂燃燒後**必定連續兩次**:\n' +
        '1. 第一次:替身掛在 MT 身上 → **ST 挑釁**吃虛證彈。\n' +
        '2. 第二次:替身掛在 ST 身上 → **MT 挑釁**換回來吃第二發。\n\n' +
        '兩坦的減傷要分配好;處理原則與 P1 相同(讀條中換、彼此離開 4m、替身爆炸前不換回)。\n\n' +
        '### 式鬼再召喚(機制同 P2,但外面是海)\n' +
        '青龍再次詠唱**式鬼召喚**,順序為**岩之式鬼 → 車輪**,並和青龍本體的技能交錯:\n' +
        '1. **百噸迴轉 + 鋼鐵月環**:石頭鬼跳到兩側放大圓,同時青龍要放陰陽 / 蛇眼之印 → 全員待在中央,讓**青龍閃現到中間**,就很好躲(影片中是**先月環後鋼鐵**:先貼近,百噸迴轉結束後再往外)。\n' +
        '2. **如虎添翼**:同 P2,MT 接左、ST 接右,扇形往外(海)引導。\n' +
        '3. **青突進 / 赤突進**:同 P2 處理。⚠ 外面是海 —— 被紅輪連的 DPS **要嘛開防擊退,要嘛留足距離**,掉進海裡會被淹沒 + 受傷加重,很容易被紅圈黃圈打死。\n' +
        '4. **升蛇 + 強化九字切 + 大太法師**:九字切的同時大太法師出現,**一定要注意它舉哪隻手**,這裡很多人忘記。\n' +
        '5. 拍三下後蛇巢出現,往蛇巢那側站,處理大壓殺 + 蛇崩。青龍隨後會閃過來放鋼鐵月環,**閃的時候大太又舉手了**,也很容易被忽略。',
      roleNotes: {
        MT: '第一次替身在你身上 → 退開;第二次挑釁換回來吃死刑。如虎添翼接左邊。',
        ST: '第一次替身時挑釁吃死刑;第二次替身在你身上 → 退開。如虎添翼接右邊。',
        'D1-D4': '被紅輪連線時注意擊退會把你推進海裡,開防擊退或站在可以往陸地推的位置。',
        'H1 H2': '二連替身期間坦克壓力大;車輪分攤照 P2 的位置在 C 集合。',
      },
      steps: [
        {
          caption: '百噸迴轉 + 鋼鐵月環:全員待在中央,讓青龍閃到中間。先月環 → 貼近青龍;百噸迴轉的大圓吃掉兩側',
          boss: { x: 0, y: 0 },
          actors: {
            MT: { x: 0, y: -22 }, ST: { x: -10, y: 18 },
            H1: { x: 12, y: 24 }, H2: { x: -14, y: -14 },
            D1: { x: -20, y: 4 }, D2: { x: 20, y: 4 },
            D3: { x: 0, y: 28 }, D4: { x: 14, y: -16 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'circle', at: [-70, -70], r: 80, color: 'void' },
            { type: 'circle', at: [70, 70], r: 80, color: 'void' },
            { type: 'enemy', at: [-70, -70], r: 10, tone: 'earth', label: '岩' },
            { type: 'enemy', at: [70, 70], r: 10, tone: 'earth', label: '岩' },
            { type: 'donut', at: 'boss', rInner: 35, rOuter: 150, color: 'void' },
          ],
          annotations: [{ type: 'text', at: [0, -106], text: '① 月環 → 貼近(石頭鬼落點為示意)', color: 'yellow' }],
        },
        {
          caption: '百噸迴轉結束後才往外 → 第二招鋼鐵。接著石頭鬼連線坦克(如虎添翼),往海的方向引導',
          boss: { x: 0, y: 0 },
          actors: {
            MT: { x: -82, y: -30 }, ST: { x: 82, y: 30 },
            H1: { x: 40, y: -70 }, H2: { x: -40, y: 70 },
            D1: { x: -20, y: -76 }, D2: { x: 20, y: 76 },
            D3: { x: -66, y: 40 }, D4: { x: 66, y: -40 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'enemy', at: [-70, -70], r: 10, tone: 'earth', label: '岩' },
            { type: 'enemy', at: [70, 70], r: 10, tone: 'earth', label: '岩' },
            { type: 'circle', at: 'boss', r: 60, color: 'void' },
          ],
          tethers: [
            { from: [-70, -70], to: 'MT', color: 'green' },
            { from: [70, 70], to: 'ST', color: 'green' },
          ],
          annotations: [{ type: 'text', at: [0, -106], text: '② 鋼鐵 → 遠離;坦克接如虎添翼', color: 'yellow' }],
        },
      ],
    },
    {
      id: 'p3-loop',
      phase: 'P3',
      title: '後半循環與狂暴',
      body:
        '之後的內容全部是前面機制的重複,不會再有新花樣。依 BossMod 時間軸,式鬼再召喚之後大致是:\n\n' +
        '1. **大壓殺 + 蛇崩**\n' +
        '2. **鋼鐵月環 + 壓殺掌 ×3**(青龍閃過來的同時大太舉手)\n' +
        '3. **大壓殺 + 蛇崩**\n' +
        '4. **強化刀禁咒**(一看到分攤點名,立刻按 **A / C** 站好)→ 陰陽五行\n' +
        '5. **二連替身**\n' +
        '6. **鋼鐵月環**\n' +
        '7. **升龍踩塔 + 強化九字切**:踩塔的同時要躲兩發九字切\n' +
        '8. **陰陽五行 ×3** → 約 11 分鐘時青龍詠唱**陰陽五行(狂暴)**:18 秒詠唱,全場 999999 固定傷害。\n\n' +
        '> 對熟練的玩家來說這個副本不需要特別背板,看到什麼就處理什麼。重點只有三件事:\n' +
        '> **看青龍的圖案**(鋼鐵 / 月環的順序)、**看大太法師舉哪隻手**、**看蛇巢在哪一側**。',
      roleNotes: {
        'H1 H2': '最後連續三次陰陽五行(強化版)傷害很高,留好群體減傷與團補。',
        'MT ST': '後半還有一輪二連替身,減傷別在前面用完。',
      },
      steps: [
        {
          caption: '最後一次升龍:踩塔的同時還有強化九字切 —— 塔的人站在塔裡也要配合兩發九字切的時間差移動',
          boss: { x: 0, y: 0, facing: 0 },
          actors: {
            MT: { x: 50, y: -50 }, ST: { x: 50, y: 50 },
            H1: { x: -50, y: -50 }, H2: { x: -50, y: 50 },
            D1: { x: 0, y: -88 }, D2: { x: 88, y: 0 },
            D3: { x: -88, y: 0 }, D4: { x: 0, y: 88 },
          },
          aoes: [
            { type: 'donut', at: [0, 0], rInner: 100, rOuter: 170, color: 'thunder' },
            { type: 'tower', at: [-50, -50], r: 15 },
            { type: 'tower', at: [50, -50], r: 15 },
            { type: 'tower', at: [-50, 50], r: 15 },
            { type: 'tower', at: [50, 50], r: 15 },
          ],
          annotations: [{ type: 'text', at: [0, -106], text: '約 11 分鐘狂暴', color: 'red' }],
        },
      ],
    },
  ],
};
