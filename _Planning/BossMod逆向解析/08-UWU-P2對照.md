# 08 — UWU P2 伊弗利特:BossMod 尺寸校對

延續 `07-UWU-P1對照.md` 的做法。P2 的資料鏈比 P1 更完整(多了 12 張影片截圖與繁中隊伍簡報),
所以這一次 BossMod **幾乎沒有機制上的爭議**,單純用來修正尺寸 —— 但**修正幅度是三次校對裡最大的**。

## 資料優先序

| 序 | 來源 | 角色 |
|:--:|---|---|
| 1 | `_OriginalReferences/UWU/captionfy_qoI6B2QZxb8.srt` + `image/` 截圖 | **機制描述與打法的最終依據** |
| 2 | `_OriginalReferences/UWU/huijiwiki.md` | 補完數值與細則 |
| 3 | `_OriginalReferences/UWU/究極武器絕境戰 火神篇.pdf` | 本隊約定(分工、口訣) |
| 4 | BossMod `Modules/Stormblood/Ultimate/UWU/` | **只用來調整幾何尺寸** |

整理過程見 `_Planning/UWU-P2-整理.md`。

## 場地

`UWU.cs`:`ArenaCenter = (100, 100)`、`Polygon(center, 20f, 64)`;`OID.Ifrit = R5.000`。
**半徑 20m ↔ 圖上 100 單位,1m = 5 單位**,與 P1 相同。

> ⚠ **伊弗利特的 hitbox 半徑是 5m**,比迦樓羅的 1.7m 大很多。
> P1 學到的「註解的 `X+R` 已經加進程式碼的數字裡」在 P2 依然成立,而且因為 R 大,**差距更明顯**。

---

## A. 尺寸對照(全部 A 級:程式碼與 AID 註解互相吻合)

| 機制 | BossMod 出處 | 實際尺寸 | 圖上 | 原本畫的 | 幅度 |
|---|---|---|---|---|---|
| **深紅旋風(主衝)** | `CrimsonCyclone._shapeMain` `AOEShapeRect(49, 9, 5)` | 直線 前 49m / 後 5m / **半寬 9m** | 245 / 25 / **45** | 半寬 20 | ⚠️ **極大** |
| **三連死刑** | `P2Incinerate` `AOEShapeCone(15, 60°)` | 扇形 15m × **120°** | r75 / 120° | r100 / **60°** | ⚠️ **極大(角度差一倍)** |
| **火神爆裂** | `P2VulcanBurst` `Knockback(_, 15f)` + 註解 `range 16+R` | 圓 **21m** + 擊退 15m | r105 | r96 | 中(但語意改變) |
| 深紅旋風(追加正交) | `CrimsonCyclone._shapeCross` `AOEShapeRect(44.5, 5, 0.5)` | 直線 前 44.5m / **半寬 5m** | 222.5 / 2.5 / 25 | 半寬 20 | 小 |
| 光輝炎柱 | `P2RadiantPlume` `SimpleAOEs(…, 8f)` | 圓 8m | 40 | 24 | 大 |
| 地火噴發 | `P2Eruption` `SimpleAOEs(…, 8)` | 圓 8m | 40 | 30 | 中 |
| 熱風(灼熱) | `P2SearingWind` `UniformStackSpread(_, 14f)` | 圓 **14m**(不含自己) | 70 | 75 | 小 ⚠ 見 C |
| 烈焰碎擊 | `FlamingCrush` `UniformStackSpread(4f, _, 6, 6)` | 分攤圈 4m,**6 人** | 20 | (未畫圈) | — |
| 地獄之火炎 | `AID.Hellfire` raidwide | 全體,無形狀 | — | — | — |
| 火獄之楔 | `P2Nails` 只畫 actor | 無 AOE 形狀 | — | — | — |
| 火獄之鎖 | `P2InfernalFetters` 只畫連線 | 無 AOE 形狀 | — | — | — |

### `X+R` 關係再次驗證(R = Ifrit 的 5.0)

| 招式 | AID 註解 | 相加 | 程式碼 |
|---|---|---:|---:|
| CrimsonCyclone | `range 44+R width 18` | 49 / 半寬 9 | `Rect(49, 9, 5)` ✅ |
| Incinerate | `range 10+R 120-degree cone` | 15 / 120° | `Cone(15, 60°half)` ✅ |
| VulcanBurst | `range 16+R circle … knockback 15` | 21 | `Knockback(_, 15f)` ✅ |

**註解的 `lengthBack = 5` 剛好等於 Ifrit 的 hitbox 半徑** —— 直線 AOE 從施法者的背面邊緣起算。

---

## B. 三個影響站位判斷的重大修正

### B-1. 深紅旋風的寬度:**半寬 9m,總寬 18m**

場地直徑 40m,**一道衝鋒就吃掉 45% 的場地**。原本畫的半寬 20 單位(4m)嚴重低估。

實證:截圖 `image/3-2.png` 量測突進矩形寬度佔場地直徑約 **44%**,與 18/40 = 45% 吻合。

**連帶影響**:覺醒後的「東西南北十字衝鋒」是**兩道主衝**(BossMod 註解:
`p2 second cast is two charges along both cardinals`),各半寬 9m
→ 兩軸合計切掉場地中央 18m 寬的十字,**四個角落的安全區比直覺小得多**。

> 四連衝鋒的跑法用真實寬度重算過,**兩種模式的終點都仍然安全**:
> - 90 度終點(2 號腳下):距 ③ 軸 12.8m、距 ④ 軸 18.1m,均 > 9m ✅
> - 45 度終點(正北空位):距 ②④ 兩條斜軸各 12.4m,均 > 9m ✅
> - 集合點(4 號正面):距 ①③ 兩軸各 12.4m ✅ —— 只有 ④ 自己的通道會蓋到,
>   但 ④ 最後才衝,這正是逐字稿說的「**暫時是安全區**」。

### B-2. 三連死刑是 **120°**,不是 60°

`AOEShapeCone(15f, 60f.Degrees())` 的第二參數是**半角**,所以全張角 120°。
半徑 15m 也遠大於原圖的想像。

**意義**:**站在王的側面會被掃到**,不是只有正前方危險 —— 必須確實繞到背面。
這是原本的圖會誤導人的地方。

### B-3. 火神爆裂 **半徑 21m = 覆蓋全場**

`range 16+R` = 21m,而場地半徑只有 20m。
**沒有任何安全區可躲**,唯一的解法就是簡報寫的「H2 下盾把傷害吃成 0」。
原本畫成 r96 會讓人以為場邊可以躲。擊退距離 15m 也補上了。

---

## C. 唯一的數值衝突:熱風是 14m 還是 15m

| 來源 | 值 |
|---|---|
| 灰機 wiki | 半徑 **15m** |
| BossMod `P2SearingWind` | `UniformStackSpread(_, **14f**)` |
| `UWUEnums.cs` 註解 | `SearingWind … range **14** circle around player` |

**採 BossMod 的 14m**:程式碼與 AID 註解互相佐證(兩個獨立來源),wiki 的 15m 只有一處。
差距只有 1m,對走位判斷沒有實質影響,但圖上照實畫。

> 附帶:BossMod 註解特別寫 `not including player himself` —— **中招者自己不會被熱風打到**,
> 這解釋了簡報說的「熱風奶退到場邊**自己玩**」。

---

## D. BossMod 反過來佐證我們判斷的三件事

這次很難得,BossMod 不只調尺寸,還替三個原本靠推理的結論蓋了章:

### D-1. 分攤是 **6 人**,而且**兩名補師都不進去**

```csharp
// during P2, everyone except searing wind targets (typically two healers) should stack
class P2FlamingCrush : FlamingCrush
```
`UniformStackSpread(4f, default, 6, 6)` —— minStackSize 與 maxStackSize 都是 **6**。

我們原本是從繁中簡報的「剩餘六人(**無奶**)」+ 截圖 `4-11` 兩補站對角推出來的,
**BossMod 的註解與參數完全一致**。這條可以定案。

### D-2. 「引導第 3 次時第 1 次才引爆」

```csharp
// casts are 3s long and 2s apart (overlapping)
```
詠唱 3 秒、每 2 秒一發 → 第 3 發起手(t=4s)時第 1 發(t=3s 結束)剛落地。
**與繁中簡報 p4 寫的節奏完全吻合**,原本只有簡報一個來源,現在有程式碼佐證。

### D-3. 「本體在正點 → X 字;在斜點 → 十字」

```csharp
var a45 = spell.Rotation + 45f.Degrees();
var am45 = spell.Rotation - 45f.Degrees();
_predicted.Add((_shapeCross, Arena.Center - 19.5f * a45.ToDirection(), a45, act));
```
追加的兩道方向是**本體主衝方向 ±45°**,延遲 `FutureTime(2.2d)`。

- 主衝沿正線(本體在正點)→ ±45° 落在斜線 → **X 字**
- 主衝沿斜線(本體在斜點)→ ±45° 落在正線 → **十字**

與 wiki 的敘述一致,而且解釋了「**為什麼**」是這個規則 —— 它根本就是同一條規則的兩種呈現。
延遲 2.2 秒也對上 wiki 的「2 秒後」。

---

## E. 沒有 BossMod 依據、維持示意的項目

| 項目 | 狀態 |
|---|---|
| 火獄之楔的生成半徑 | 圖上用 60(12m),來自截圖 `1-3` 量測約 0.6R。BossMod 只畫 actor,無座標依據 |
| 討伐後的距離衰減 | BossMod 無對應元件,維持示意並在圖上標註 |
| 四連衝鋒四隻火神的站位半徑 | 圖上用 105,為配合截圖的視覺(牠們站在場地邊緣外) |

---

## F. 工具變更:`rebuild-uwu.js` → `rebuild-uwu.py`

本機**沒有安裝 Node**(`node` 不在 PATH,也不存在於 nodejs / nvm / volta / scoop 的常見安裝路徑),
原本的 `tools/rebuild-uwu.js` 無法執行,已移植為 `tools/rebuild-uwu.py`。

- 用法:`py "_Planning/BossMod逆向解析/tools/rebuild-uwu.py"`
- 遵循全域規則:本機一律用 `py` 而非 `python`
- **移植正確性已驗證**:新腳本產出的 **P1 七個章節與八張速查卡,與 Node 版的輸出逐欄位完全相同**
- Windows 主控台是 cp950,腳本內已把 stdout 轉成 UTF-8,否則印 `⚠` 會拋 `UnicodeEncodeError`

`tools/rebuild-hells-kier.js` 仍是 JS,尚未移植(目前沒有重跑需求)。
