# 02 — 朱雀(UnSuzaku / Ex7Suzaku)機制幾何解析

資料來源:`BossMod/Modules/Dawntrail/Unreal/UnSuzaku/*.cs`(全 10 檔)。
`Ex7Suzaku`(極朱雀)為逐行等價版本,只有 OID/AID 數值不同 —— 本篇的所有幾何數字兩者通用。

單位一律為 **遊戲碼(yalm)**,角度為 **BossMod 慣例(0°=南,順時針為正)**。

---

## 0. 場地

`UnSuzaku.cs:582-584`

```csharp
ArenaCenter  = new WPos(100f, 100f);
Phase1Bounds = Polygon(ArenaCenter, 19.5f, 80);       // P1/P2:半徑 19.5 的圓
Phase2Bounds = DonutV(ArenaCenter, 3.5f, 20f, 80);    // P3:內 3.5 / 外 20 的甜甜圈
```

- 場地切換發生在 `ScarletFever`(全屏)讀條後,中央塌陷成 **半徑 3.5 的天坑**。
- `ArenaChange.cs` 在 `ScarletFever` 開始讀條時就先畫出中央 r=3.5 的圓當預警
  (`CastFinishAt(spell, 7d)` = 讀條結束後再 7 秒才真正生效)。

> **對應我們攻略**:`hells-kier-ex.js` 的 `arena.shape` 需要在 P3 切成甜甜圈。
> 天坑實際半徑佔全場的 `3.5 / 20 = 17.5%`。

---

## 1. 演員 ID(OID)

| OID (Unreal / EX) | 名稱 | 半徑 | 用途 |
|---|---|---:|---|
| `0x47D1` / `0x2464` | Boss 朱雀 | 2.8–6.93 | 本體(P3 變人形時 hitbox 變小) |
| `0x47D2` / `0x2465` | ScarletLady | **1.12** | 火焰鳥(小鳥) |
| `0x47D3` / `0x2466` | ScarletPlume | 1.0 | 小羽毛(可打) |
| `0x47D4` / `0x2467` | ScarletTailFeather | 1.8 | 大羽毛(無敵,不可打) |
| `0x47D5` / `0x2468` | RapturousEcho | 1.5 | P2 藍球 |
| `0x1EA1A1` | RapturousEchoPlatform | 2.0 | P2 腳下的圈(帶箭頭) |
| `0x47CD..D0` / `0x2460..63` | SongOfFire/Sorrow/Oblivion/Durance | 1.5 | **場外四色詩(決定地板爆炸順序)** |
| `0x47D7..DA` / `0x246C..6F` | Northern/Eastern/Southern/WesternPyre | 2.0 | 傀儡旋律的四個「炎」 |
| `0x1EA9FF` | Towers | 0.5 | 灼熱旋律的塔 |

## 2. 技能幾何總表

| AID (Unreal) | 名稱 | 施法者 / 讀條 | 幾何 | 出處 |
|---|---|---|---|---|
| 43004 | ScreamsOfTheDamned 悲鳴之詩 | Boss, 3s | 全屏(r40 圓) | Enums |
| 43003 | Cremate 赤熱擊 | Boss→player, 3s | 單體死刑 | Enums |
| 43027 | Rout 敗走 | Boss, 3s | **矩形 長 55 × 半寬 3(寬 6)** | `UnSuzaku.cs:561` |
| 43005 | FleetingSummer 殘夏 | Boss, 3s | **扇形 r40 × 半角 45°(總 90°)** | `UnSuzaku.cs:562` |
| 43016 | Rekindle 再燃 | Helper→players | **分散 r6,圖示後 5.1s** | `Rekindle.cs:421` |
| 43006 | WingAndAPrayer(大羽毛) | ScarletTailFeather, **20s** | **圓 r9** | `Feathers.cs:34` |
| 43001 | WingAndAPrayer(小羽毛) | ScarletPlume, 20s | 圓 r9(同上) | Enums |
| 43009 | ScarletFever | Helper, 7s | 全屏 + **場地變甜甜圈** | `ArenaChange.cs` |
| 43015 | SouthronStar 南斗星 | Boss, 4s | 全屏(r41 圓) | Enums |
| 43010 | MesmerizingMelody 引誘的旋律 | Boss, 4s | **牽引 11m,朝中心** | `KnockbacksForcedMarch.cs:330` |
| 43011 | RuthlessRefrain 拒絕的旋律 | Boss, 4s | **擊退 11m,遠離中心** | `KnockbacksForcedMarch.cs:344` |
| 43017 | WellOfFlame 井宿焰 | Boss, 4s | **矩形 長 41 × 半寬 10(寬 20)** | `UnSuzaku.cs:563` |
| 43000 | ScathingNet | Helper→player | **集合分攤 r6,5.1s,需 8 人** | `UnSuzaku.cs:564` |
| 43012/13/14 | PhantomFlurry 鬼宿腳 | Boss, 4s | **換坦死刑 + 扇形 r41 × 半角 90°(總 180°)** | `UnSuzaku.cs:565-566` |
| 43018 | Hotspot 地板爆炸 | Helper, 0.9s | **扇形 r21 × 半角 45°(=一個象限)** | `Hotspot.cs:173` |
| 43022-25 | PayThePiper 傀儡旋律 | Pyre→player | **強制位移 4m,倒數 10s** | `KnockbacksForcedMarch.cs:382` |
| 43021 / 43020 | Immolate / Burn | Helper | 踩塔失敗全屏 / 成功 r4 | Enums |
| 43026 | EnrageSouthronStar | Boss, **39s** | 狂暴 | Enums |

### 兩個常被誤記的數字

- **鬼宿腳的扇形是 180°(半角 90°),不是 90°。** 站側面不安全,必須繞到背面。
- **井宿焰寬 20**(半寬 10),在半徑 20 的場地上等於封住整條直徑帶。

---

## 3. 逐機制詳解

### 3.1 火焰鳥 + 蘇生之羽(P1)

`Feathers.cs` + `Rekindle.cs`

關鍵數字 **7.12**,出現三次(`Feathers.cs:146,151`、`Rekindle.cs:435`):

```
7.12 = 6 (Rekindle 分散圈半徑) + 1.12 (ScarletLady 鳥的 hitbox 半徑)
```

- `RekindleP1.AddAIHints`:**還沒出羽毛時**,身上有紅圈的人要 `AddForbiddenZone(SDCircle(鳥, 7.12))`
  —— 也就是 **離鳥中心 7.12m 以外**,確保紅圈不碰到鳥。
- `Feathers.AddAIHints`:**出羽毛後**反過來,`GoalProximity(死掉的鳥, 7.12)`
  —— 主動貼上去讓圈碰到鳥、把鳥復活拉出黃圈。
- 大羽毛 `ScarletTailFeather` 被標成 `PriorityInvincible`(打不掉);
  小羽毛 `ScarletPlume` 優先度 1(要打)。
- 判定「鳥有沒有在黃圈裡」用的是 `b.Position.InCircle(f.Position, 9f)`,9 = 羽毛 AOE 半徑。
- 被 `PrimaryTarget`(SID 1689)標記的人,建議站位是
  `ArenaCenter - 20 * (羽毛位置 - ArenaCenter).Normalized()`
  —— 也就是 **羽毛的正對面、場地邊緣**。

> **驗證**:這完全對上我們攻略 cheatsheet 的「一人一鳥、一鳥一圈、拉到無黃圈的空檔」。
> 插件把「不要碰到鳥」量化成 7.12m,「空檔」量化成 9m 圈外。

### 3.2 P2 音遊(RapturousEcho / ScarletMelody)

`ScarletMelody.cs`

- 塔:`Towers.Add(new(平台位置, 半徑 1f, min 1, max 1, ...))` —— **每個圈只能站 1 人,半徑僅 1m**。
- 箭頭方向由平台的動畫狀態(EAnim)決定:

| EAnim state | 面向 |
|---|---|
| `0x00080004` | 北(`0°` = BossMod 的南?見下) |
| `0x02000100` | 東 |
| `0x00400020` | 南 |
| `0x10000800` | 西 |

  程式碼裡註記為 north/east/south/west 的角度值是 `0 / -90 / 180 / 90`。
  依 `01` 的慣例 `0°`=南,所以 **這裡的註解是以「玩家該面向的相反」或以另一套慣例寫的**,
  屬於插件內部不一致的註解 —— 實際使用時以 `ForbiddenDirections` 的語意為準:
  `hints.ForbiddenDirections.Add((direction, 175°, time))` 表示
  **「以 direction 為中心的 ±175° 都是禁止面向」**,亦即 **只有 direction 本身那 ±5° 是正確面向**。

- 換句話說:`ForbiddenDirections` 加上一個接近 180° 的半角,就是「必須朝這個方向」的慣用寫法。

### 3.3 朱紅旋律 / 四色地板(Hotspot)— 本次最大收穫

`Hotspot.cs`。這是整個逆向工程中價值最高的一段,因為它把
「看場外文字順序」這個模糊的口訣變成了 **可計算的規則**。

**幾何**:每一塊地板 = 從場地中心射出的 `AOEShapeCone(21f, 45°)`,朝向四個斜角之一:

```csharp
SongOfDurance  => AnglesIntercardinals[3]  // -135°  → 西北
SongOfOblivion => AnglesIntercardinals[0]  //  -45°  → 西南
SongOfSorrow   => AnglesIntercardinals[1]  //  +45°  → 東南
SongOfFire     => AnglesIntercardinals[2]  // +135°  → 東北
```

**順序**(`Hotspot.cs:239-255`):

```csharp
var relativeAngle = Angle.FromDirection(song.Position - ArenaCenter);
var index = ((int)MathF.Round((startrot - relativeAngle).Deg / 12f) + 30) % 30;
AOEs.Add(new(cone, center, rot, WorldState.FutureTime(delay + index * 1.25d)));
```

解讀:

1. 場外的「詩」actor 排在一個 **30 格的環上,每格 12°**(30 × 12° = 360°)。
2. 有一個旋轉的指揮者(`Helper2`,ActionTimeline `0x1E43`)提供起始角 `startrot`。
3. 某個 actor 相對於起始角的格數 `index`,就是它在序列中的位置。
4. **每格間隔固定 1.25 秒**;第一發的偏移量是 6.7s(第一輪)或 −2.2s(接續輪)。
5. actor 的 **種類** 決定爆哪一塊地板,actor 的 **角度位置** 決定第幾個爆。

也就是我們攻略講的「場外文字」,在資料層就是這些 Song actor;
「文字順序」= 它們沿環的排列順序;「秒穿」的來源 = 1.25s 的間隔。

**總數**:完整版一輪 16 發(`AOEs.Count == 16`),短版 8 發(見 `States.cs` 的 Hotspot1/2/3)。

**安全區結論**(`Hotspot.cs:265`):

```csharp
hints.AddForbiddenZone(new SDInvertedCross(ArenaCenter, default, 20f, 1f), DateTime.MaxValue);
```

= 「除了四條正軸方向、寬 ±1m 的十字帶以外全部禁止」
= **貼在四塊地板的交界線上**,因為每發只隔 1.25 秒,只有騎在邊界上才來得及左右閃。
插件註解直說了原因:`since there is usually just 1.2s between hits`。

> 這是一條我們攻略目前沒有寫出來的操作要點,值得補進 cheatsheet。

### 3.4 引誘 / 拒絕的旋律

`KnockbacksForcedMarch.cs:330-356`

| 招式 | 位移 | 安全區(插件給的解) |
|---|---|---|
| MesmerizingMelody 引誘 | 牽引 11m 朝中心 | `SDCircle(origin, 14.5)` 禁止 → **站在離中心 14.5m 以外** |
| RuthlessRefrain 拒絕 | 擊退 11m 遠離中心 | `SDInvertedCircle(origin, 9)` 禁止 → **站在離中心 9m 以內** |

兩者都是 `stopAfterWall: true`(撞到場地邊界就停,不會摔出去);
但 P3 中央是 r=3.5 的天坑,被牽引拉進去就是摔死 —— 所以 14.5 這個數字的來源是
`3.5(天坑) + 11(牽引距離)` = 14.5。**完全可以反推。**

同理 `9` 的來源是 `20(場地外緣) − 11(擊退距離)` = 9。

> 這兩個數字驗證了我們攻略的「引誘→靠外場邊緣、拒絕→貼中央」,並且給出了精確門檻。

### 3.5 傀儡旋律(PayThePiper)

`KnockbacksForcedMarch.cs:358-417`

- 連線 `TetherID.PayThePiper = 79`,由四個 Pyre 之一發出。
- 位移方向 **只由 Pyre 的方位決定**,與玩家位置無關:

```csharp
NorthernPyre => 180°   // 北
EasternPyre  =>  90°   // 東
SouthernPyre =>   0°   // 南
WesternPyre  => -90°   // 西
```

- `AddForcedMovement(target, direction, 4f, FutureTime(10d))`
  —— **距離 4m,連線後 10 秒發動**。
- 實際起跑時機由 debuff `PayingThePiper`(SID 1681)的 `ExpireAt` 決定。
- 安全區:

```csharp
forbidden[0] = SDInvertedCircle(ArenaCenter - offset * dir, 19f);
forbidden[1] = SDRect(ArenaCenter, -dir, 20f, default, 4.5f);
```

  第二條就是 **「沿移動方向畫一條過中心、半寬 4.5 的帶子,不要站在裡面」**
  —— 也就是我們攻略寫的「沿箭頭指向畫過自己的平行線,避開天坑」。
  半寬 4.5 ≈ 天坑半徑 3.5 + 1m 安全邊際(插件註解:`adding 1 unit of safety margin`)。
- `offset` 兩種:單獨版 25、與地板同時發生的版本 30(`PayThePiperRegular` / `PayThePiperHotspotCombo`)。

### 3.6 灼熱旋律(踩塔,IncandescentInterlude)

`IncandescentInterlude.cs`

- 塔:`new Tower(位置, 半徑 4f, activation: FutureTime(9.7d))`。
- **有紅圈(Spreadmarker,IconID 139)的人被列入 `ForbiddenSoakers`** —— 插件直接把
  「有圈者不能踩塔」寫進資料。
- 安全區(`:317-323`):

```csharp
for i in 0..3:
    forbidden[i] = SDCone(ArenaCenter, 20f, 有圈 ? AnglesCardinals[i] : AnglesIntercardinals[i], 35°);
hints.AddForbiddenZone(SDUnion(forbidden), 擊退時刻);
```

  = **有紅圈的人禁止待在正位象限(要去斜位)、沒紅圈的人禁止待在斜位(要留正位)**,
  然後由拒絕的旋律把大家推進塔裡。
  這正是我們攻略「有紅圈者順時針移到斜位、沒紅圈者原地不動」的機器版本。
- 注意 `party == 8` 的條件:插件對非滿編(unsync 練等)關閉這些限制,逆向時別把它當機制。

---

## 4. 時間軸(來自 `UnSuzakuStates.cs`)

`delay` 為距上一事件的秒數。可直接拿來當攻略的節奏表。

```
SinglePhase
├─ 6.1  悲鳴之詩(全屏)          → 啟用 Rout / RekindleP1
│   ├─ 9.9  紅圈出現
│   ├─ 3.1  敗走(直線)
│   ├─ 2.0  紅圈落地
│   ├─ 8.9  殘夏(扇形)
│   └─ 4.6  赤熱擊(死刑)
├─ 8.5  鳳凰之尾 → 羽毛生成
│   ├─ 1.0  羽毛可選取     → 啟用 羽毛 + 紅圈
│   ├─ 7.4  紅圈出現 / 5.1 落地
│   ├─ 7.9  赤熱擊(讀條 10.9s)
│   ├─ 1.1  羽毛結算
│   ├─ 9.4  悲鳴之詩(全屏)
│   └─ 10.1 鳥狂暴檢查(所有鳥必須已死)
├─ 6.7  【P2 音遊】不可選取 → DowntimeStart
│   ├─ 20.4 DDR 開始
│   ├─ 31.2 DDR 結束
│   ├─ 4.9  ScarletFever(7s 讀條,全屏)→ 場地變甜甜圈
│   └─ 4.0  可選取 → DowntimeEnd
├─ 6.2  【P3 開始】南斗星(全屏)
│   ├─ 11.1 引誘(牽引)
│   ├─ 3.1  紅圈 → 井宿焰 → 分攤(RekindleWellOfFlameScathingNet)
│   └─ 1.0  鬼宿腳
├─ 12.8 【地板 #1】16 發,節奏 11.7 +7×1.25,休息 10.7,再 +7×1.25
├─ 9.9  引誘/拒絕 → 傀儡旋律 → 紅圈組合技 → 鬼宿腳
├─ 13.9 【地板 #2】前 8 發 → 南斗星 → 後 8 發
├─ 9.5  鬼宿腳 → 南斗星 → 踩塔 + 拒絕 + 紅圈 → 井宿焰
├─ 16.9 【地板 #3】8 發,中間插入 傀儡旋律 / 引誘拒絕 / 鬼宿腳
├─ 16.9 南斗星 → 引誘拒絕 → 紅圈組合 → 鬼宿腳 → 南斗星 → 引誘拒絕 → 南斗星 → 鬼宿腳
└─ 23.5 狂暴
```

**組合技模式**(在 `States.cs` 裡被抽成可重用的私有方法,代表它是固定套路):

- `RekindleWellOfFlameScathingNet` — 紅圈出現 → 4.2s 井宿焰 → 0.9s 紅圈落地 → 1.2s 分攤標記 → 5.1s 分攤結算。
- `PhantomFlurry` — 讀條 4s → 0.1s 換坦 → 6.1s 正面 180° → 1.6s 第二段。
- `MesmerizingMelodyRuthlessRefrain` — 兩招共用一個 `CastMulti`,即 **兩者二選一、需要看技能名判讀**
  (與我們攻略「聽到笛聲就看技能名」一致)。
