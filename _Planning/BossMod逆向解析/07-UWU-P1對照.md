# 07 — UWU P1 迦樓羅:三方資料對照

第一次把 `05-取用SOP.md` 的流程用在朱雀以外的副本。與朱雀不同的是,
**這次有攻略逐字稿與 wiki 當第一手資料**,BossMod 只負責調整尺寸。

## 資料優先序(本次的指定規則)

| 序 | 來源 | 角色 |
|:--:|---|---|
| 1 | `_OriginalReferences/UWU/P1/逐字稿_繁體中文.md`(影片逐字稿,附實戰截圖校對) | **機制描述與打法的最終依據** |
| 2 | `_OriginalReferences/UWU/P1/huijiwiki.md`(灰機 wiki) | 補完數值與細則 |
| 3 | BossMod `Modules/Stormblood/Ultimate/UWU/` | **只用來調整幾何尺寸** |

原則:**先以既有圖解為主,再用 BossMod 調整。**
BossMod 不用來推翻前兩者對機制「是什麼」的描述,只用來修正「有多大」。

## 場地

`UWU.cs`:`ArenaCenter = (100, 100)`、`Polygon(center, 20f, 64)`。
與朱雀相同,**半徑 20m ↔ 圖上 100 單位,1m = 5 單位**,換算率可直接沿用。

---

## A. 尺寸對照(全部為 A 級,即程式碼裡實際的 `new AOEShape…`)

| 機制 | BossMod 出處 | 實際尺寸 | 圖上 | 原本畫的 | 幅度 |
|---|---|---|---|---|---|
| **台風眼** | `P1EyeOfTheStorm` `AOEShapeDonut(12, 25)` | 環形 12–25m | 60–125 | 92–104 | ⚠️ **極大** |
| 螺旋氣流 | `P1Slipstream` `AOEShapeCone(11.7, 45°)` | 扇形 11.7m × 90° | r58.5 | r100 × 100° | 大 |
| 下行突風 | `P1Downburst` `AOEShapeCone(11.7, 45°)` | 扇形 11.7m × 90° | r58.5 | r100 × 60° | 大 |
| 邪氣龍捲 | `WickedWheel.ShapeTornado` `Donut(7, 20)` | 環形 7–20m | 35–100 | 26–100 | 中 |
| 大龍捲風 | `P1GreatWhirlwind` `SimpleAOEs(…, 8f)` | 圓 8m | 40 | 26–30 | 中 |
| 邪輪旋風(本體) | `WickedWheel.ShapeWheel` `Circle(8.7)` | 圓 8.7m | 43.5 | 34 | 中 |
| 邪輪旋風(分身) | `WickedWheel.ShapeSister` `Circle(8.36)` | 圓 8.36m | 41.8 | (未畫) | — |
| 飛翎雨 | `P1FeatherRain._shape` `Circle(3)` | 圓 3m | 15 | 11 | 小 |
| 高氣壓穹頂 | `P1PlumeShield` `AddCircle(…, 6f)` | 圓 6m | 30 | 26 | 小 |
| 中高壓 | `P1Mesohigh._radius = 3` | 圓 3m | 15 | 14 | 幾乎正確 |

### 順帶驗證到的一件事:程式碼的半徑已含王的 hitbox

`UWUEnums.cs` 的註解寫 `Slipstream … range 10+R 90-degree cone`,
而 `OID.Garuda` 的註解是 `R1.700`。`10 + 1.7 = 11.7`,**與程式碼的 `AOEShapeCone(11.7f, …)` 完全吻合**。

同一組關係在其他招式上也成立:

| 招式 | 註解 | 施法者 R | 相加 | 程式碼 |
|---|---|---:|---:|---:|
| WickedWheel | `7+R` | Garuda 1.7 | 8.7 | 8.7 ✅ |
| WickedWheelSister | `7+R` | Sister 1.36 | 8.36 | 8.36 ✅ |
| Gigastorm | `6+R` | SpinyPlume 0.5 | 6.5 | 6.5 ✅ |

**意義**:`10+R` 這種寫法的 `R` 是**施法者的 hitbox 半徑**,程式碼裡的數字是相加後的結果。
畫圖時直接用程式碼的值即可,不要再自己加一次。
(這也讓 C 級註解在這幾項上獲得了 A 級佐證。)

---

## B. 三方衝突:寒風之歌的形狀 —— **維持扇形不動**

這是本次唯一的實質衝突,也是最需要記錄的一項。

| 來源 | 說法 |
|---|---|
| **逐字稿(優先度 1)** | **較寬的扇形**。並且已經明確處理過這個衝突:<br>「wiki 記載為直線 AOE,但影片 `[圖 2-1]` 的示意圖與字幕(「この技は広めの扇範囲なので」)皆為**扇形**,此處**以影片為準**」 |
| wiki(優先度 2) | 直線 AOE |
| BossMod(優先度 3) | 直線衝鋒。`P1MistralSongBoss : GenericWildCharge(module, 5, …, 40)`(半寬 5、長 40)<br>`P1MistralSongAdds` 用 `AOEShapeRect(40, 5)` |

**判定:維持既有圖解的扇形,不改。** 理由:

1. **使用者指定的優先序**就是逐字稿 > wiki > BossMod,而逐字稿是**看過影片截圖後**
   刻意推翻 wiki 的,不是沒注意到。
2. **BossMod 自己標註這一項未經驗證**,信心度是全檔最低的:
   - `UWUEnums.cs`:`MistralSongBoss = 11074, // Garuda->self, no cast, ???`
   - `P1MistralSong.cs` 有 **兩處** `// TODO: verify width`
   - 還有 `// TODO: this assumes everyone shares the cleave, OT is front; other strategies have people avoid it`

   也就是說 BossMod 的矩形是**作者的建模假設**,不是量出來的判定範圍。
   這種東西的可信度不比 C 級註解高。

> **反面意見(留給日後實測)**:「先頭判定」(第一個被命中者吃滿傷、後方衰減)
> 是**直線衝鋒**的典型語意,扇形通常沒有這種前後之分。
> wiki 與 BossMod 兩個獨立來源也都指向直線。
> 若日後要推翻逐字稿,**這是最值得優先實測的一項**。
> 在那之前,圖解維持扇形,並在該步驟加了一行註記說明兩種說法都存在。

---

## C. 只有註解、沒有程式碼佐證的項目(C 級,已在圖上標黃字)

BossMod **沒有替這幾招做元件**,尺寸只出現在 `UWUEnums.cs` 的行末註解裡:

| 機制 | 註解 | 圖上採用 | 風險 |
|---|---|---|---|
| **烈風刃** `Friction` | `range 5 circle` | r25 | 這招要「刻意集合全員一起吃」,半徑影響集合的鬆緊度 |
| **羽槍** `Featherlance` | `range 8 circle` | r40 | 覺醒後剛羽撞人才觸發,實戰較少對到 |
| 熱流 `ThermalTumult` | `range 20 circle` | 未畫(全場睡眠) | 無所謂,反正是全場 |
| 氣旋 `Cyclone` | `single-target` | 未畫 | 單體,無範圍 |

另外一項半 C 級:

- **邪氣龍捲的內圈 7m** —— 程式碼寫 `ShapeTornado = new(7f, 20f)`,是 A 級;
  但 `UWUEnums.cs` 的註解寫 `range ?-20 donut`,**作者對內圈打問號**。
  兩者不一致時以程式碼為準(它才是實際畫出來的),但這一項的內圈值請視為
  **A 級中信心較低的**,圖上已加註記。

---

## D. 修正幅度最大的一項:台風眼

原本畫成 `donut rInner 92 / rOuter 104` —— 貼牆的一圈細環,
讀起來像是「只有最外緣危險」。

實際是 `AOEShapeDonut(12, 25)`:**從中心 12m 起一路到 25m**。
場地半徑只有 20m,所以:

- **12m 到牆邊(20m)全部是判定範圍**,佔了場地面積的 **64%**
- 安全區是**中央直徑 24m 的圓**

三方在這件事上是一致的,只是原圖畫錯了:

- 逐字稿:「此時**外周範圍(台風眼)也會來**,坦克要看預兆,把寒風之歌**稍微往內側**處理」
- wiki:「场地出现环形AOE，任何玩家进入后会受到伤害并弹回场中」
- BossMod:`AOEShapeDonut(12, 25)`

修正後,逐字稿說的「稍微往內側」才看得出來是**必須退到 12m 以內**,不是象徵性地挪一點。

---

## E. 順手確認過、不需要改的東西

- **飛翎雨點名 5 人** —— 逐字稿與 wiki 都寫 5 人。BossMod 的 `P1FeatherRain`
  是對**全隊每個人**都預測一個圈(`Raid.WithoutSlot(...)` 全取),那是保守畫法,
  不是機制人數。**這裡不要被 BossMod 帶偏。**
- **飛翎雨的預警時機** —— BossMod 在 ActionTimeline `0x1E3A` 觸發時鎖定全員當下位置,
  `FutureTime(2.5)` 後生效。這正好對上逐字稿的「範圍在**迦樓羅發出特徵叫聲的瞬間**決定,
  聽到叫聲後才移動」——**程式碼佐證了那句口訣**。
- **大龍捲風長在誰腳下** —— `UWUEnums.cs` 註解:
  `GreatWhirlwind … (on mistral song interceptor)`,與逐字稿「首個被命中者原地留下」一致。
- **刺羽死後的高氣壓穹頂** —— `OID.SpinyShield` 是 EventObj,`P1PlumeShield` 畫 r6 的圈,
  與逐字稿「留下持續 20 秒的高氣壓區域」一致。
- **覺醒後才有剛羽** —— `OID.RazorPlume` 的註解寫
  `spawn during fight if awakened earlier than expected`,與 wiki 的「覺醒後召喚羽毛改為剛羽」一致。

---

## F. 尚未導入的東西

- **P2 以後**(伊弗利特 / 泰坦 / 拉哈布雷亞 / 究極神兵)目前的圖解還沒寫,
  所以這次只做 P1。`_OriginalReferences/UWU/P2/` 已經有逐字稿與 wiki,
  BossMod 那邊 P2–P5 的元件也齊全,隨時可以照同一套流程做。
- **時間軸**:`UWUStates.cs` 的 P1 段落有完整的 delay 串,可以做成流程總表,
  但既有圖解是分章節的敘事結構,硬塞時間軸會打亂閱讀順序,這次先不動。
