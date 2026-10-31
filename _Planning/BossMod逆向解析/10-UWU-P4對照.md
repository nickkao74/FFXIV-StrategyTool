# 10 — UWU P4 究極神兵(LB 階段 → 一運):BossMod 對照

延續 `09` 的做法:**畫圖之前就讀完 BossMod**,`data/uwu.js` 的 P4 章節直接採用實測尺寸,
`tools/rebuild-uwu.py` 對 P4 只做檢查、不做修改。整理過程見 `_Planning/UWU-P4-一運-整理.md`。

## 資料優先序

| 序 | 來源 | 角色 |
|:--:|---|---|
| 1 | 影片逐字稿 `captionfy_iSZOcsMIKhQ.srt`(Zundamon「究極神兵階段 序盤」) | **機制描述與打法的最終依據** |
| 2 | 灰機 wiki 突破極限 / 究極神兵段落 | 補完機制定義 |
| 3 | BossMod `Modules/Stormblood/Ultimate/UWU/`(`P4*.cs` + 共用的 P1~P3 元件) | 幾何尺寸、時間軸 |

⚠ **沒有繁中隊伍簡報、也還沒有影片截圖**。

## 場地

與 P1~P3 相同:`ArenaCenter = (100, 100)`、`Polygon(center, 20f, 64)`,**1m = 5 單位**。泰坦倒下後縮場解除,回到 20m。

`OID.UltimaWeapon = R6.000`。`CeruleumVent` 的 AID 註解寫 `range 8+R`,程式碼是 `AOEShapeCircle(14f)` = 8 + 6 → **R6 由程式碼佐證**。

---

## A. 尺寸對照

| 機制 | BossMod 出處 | 實際尺寸 | 圖上 | 級別 |
|---|---|---|---|:--:|
| 追蹤爆炸 | `P4Freefire` `AOEShapeCircle(15)` | 圓 15m | r75 | ⚠ `TODO: verify falloff` |
| 吸附式炸彈 附加 | `P4ViscousAetheroplasmApply` `Cleave(Circle(2))` | 圓 2m | r10 | A |
| 吸附式炸彈 引爆 | `P4ViscousAetheroplasmResolve` `UniformStackSpread(4)` | 分攤 4m | r20 | A |
| 追蹤射線 | `P4HomingLasers` `SpreadFromCastTargets(4)` | 圓 4m | r20 | A |
| 邪輪旋風 | `WickedWheelBase.ShapeWheel` `Circle(8.7)` | 8.7m | r43.5 | A |
| 邪氣龍捲 | `ShapeTornado` `Donut(7, 20)` | 7~20m | 35 / 100 | A |
| 妙翅 / 美翼 邪輪旋風 | `ShapeSister` `Circle(8.36)` | 8.36m | r41.8 | A |
| 深紅旋風(主衝) | `CrimsonCyclone._shapeMain` `Rect(49, 9, 5)` | 前 49 / 半寬 9 / 後 5 | 245 / 45 / 25 | A |
| 深紅旋風(十字) | `_shapeCross` `Rect(44.5, 5, 0.5)`,原點 `Center − 19.5 × dir`,`dir = 主衝 ±45°` | 前 44.5 / 半寬 5 / 後 0.5 | 222.5 / 25 / 2.5 | A |
| 地裂斬(泰坦) | `LandslideBase.ShapeBoss / ShapeHelper` | 同 `09` | 同 `09` | A |
| 地裂斬(究極神兵) | `LandslideBase.OnCastStarted` `Rect(40 + R, 3)` | 前 46 / 半寬 3 | 230 / 15 | A(副線方向 ✗) |
| 青磷放射 | `P4CeruleumVent` `Circle(14)` | 14m | r70 | A |
| 地火噴發 | `P2Eruption` `SimpleAOEs(8)` | 8m | r40 | A |
| 光輝炎柱 | `P2RadiantPlume` `SimpleAOEs(8)` | 8m | r40 | A(位置 ✗) |
| 落石 | `P3Burst` `Circle(6.3)` | 6.3m | r31.5 | A(位置 ✗) |
| 飛羽雨 | `P1FeatherRain` `Circle(3)` | 3m | r15 | A |

### 解法元件:`P4UltimatePredation`

BossMod 為追擊之究極幻想寫了專用的安全點搜尋,值得逐行讀:

```csharp
_first.ForbidInfiniteRect(titan.Position, titan.Rotation, 3f);          // 泰坦主線
_first.ForbidInfiniteRect(titan.Position, titan.Rotation ± 45°, 3f);    // 泰坦 ±45°
_second.ForbidInfiniteRect(titan.Position, titan.Rotation ± 22.5°, 3f); // 覺醒第 2 組
_second.ForbidInfiniteRect(titan.Position, titan.Rotation + 90°, 3f);
_first.ForbidInfiniteRect(ifrit.Position, ifrit.Rotation, 9f);          // 伊弗利特主衝
_second.ForbidInfiniteRect(Center − (R, 0), 90°, 5f);                   // 十字(兩條)
_second.ForbidInfiniteRect(Center − (0, R), 0°, 5f);
_first.ForbidCircle(garuda.Position, 20f);                              // 邪輪 + 龍捲 視為 20m
_second.ForbidCircle(garuda.Position, 20f);
_second.ForbidCircle(ultima.Position, 14f);                             // 青磷放射
// 安全點取在離中心 _dodgeRadius = 19m 的圓周上
```

- **十字寫死在正點方向**(`(R, 0)` 與 `(0, R)`)→ 伊弗利特在 P4 一定從**斜點**衝,印證影片「伊弗利特出現在斜點」。
- **BossMod 會把十字也閃掉**;本攻略依影片**無視十字**,所以產生器只對「十字以外」做碰撞檢查。
- 迦樓羅被視為 **20m 的禁區** → 走到離迦樓羅最遠的場邊就安全,對上影片「背對迦樓羅」。
- 安全點在 **19m 的圓周** → 對上影片「往外周走」「吃十字時靠外周邊緣」。

---

## B. 時間軸(`Phase4LahabreaUltima` 的 delay 累加)

完整表見 `UWU-P4-一運-整理.md` §3。重點:

```
  9.1 Proximity → 11.3 Caster LB → 22.8 Heal LB(誤差可達 16 秒)→ 31.9 Melee LB → 54.9 Tank LB(究極)
 94.6 Ultima appears → 98.7 Raidwide → 100.9 Aetheroplasm apply → 107.1 Homing lasers → 112.0 resolve
118.2 Predation cast → 132.9 Predation 1 → 135.0 Predation 2 → 140.3 Feathers
142.3 Reappear → 151.8–160.8 Eruptions ×8 → 165.9 Outer plumes(+ bombs)
169.5 / 170.1 / 171.5 Landslides(泰坦 → 究極神兵)
177.4 Aetheroplasm apply → 184.5 Mistral Shriek → 188.5 resolve → 189.4 Homing lasers
187.8 / 191.3 Feathers ×2 → 193.6 Ultimate Annihilation(爆擊之究極幻想)
```

---

## C. BossMod 反過來佐證逐字稿的三件事

### C-1. 「究極神兵在附近就稍微偏一點」

青磷放射 14m,究極神兵站在斜點場外約 22.5m(影片示意圖量測)時,相鄰正點場邊離牠約 16m —— 正點正中打不到,
**閃地裂斬往究極神兵那一側偏約 8° 就會進圈**。
所以影片說「圓其實挺小的,偏一點點就夠」,而不是「換一個正點」。

### C-2. 「炸彈引爆比雷射快」

一運後半:`Aetheroplasm resolve` 188.5 → `Tankbuster`(射線讀條結束)189.4,相差 0.9 秒。
無敵在**炸彈倒數快結束時**開,兩發都吃得到。

### C-3. 「地裂斬在炎柱爆炸後馬上出現預兆」

`Outer plumes` 165.9 → 泰坦地裂斬讀條 167.3、究極神兵 167.9。炎柱一炸完就要看兩邊的直線。
第一顆落石在炎柱讀條結束後 0.1 秒出現、6.5 秒後爆炸 → 落石爆炸與雙重地裂斬重疊,
**右移的落點同時要躲落石**,這也是影片強調「再往外側靠一點」的原因之一。

---

## D. 沒有 BossMod 依據、維持示意的項目(交付時已回報)

| 項目 | 圖上 | 依據 |
|---|---|---|
| 追擊時四隻的位置 | 迦樓羅 6.7m、伊弗利特 / 究極神兵 22.5m、泰坦 20m(正點偏 9°、面向正前方) | 影片示意圖量測(整理檔 §4-5);BossMod 從實際位置算,不預測 |
| 光輝炎柱的位置 | 正點 4 根 19m、斜點 4 根 15.5m | 影片示意圖量測(整理檔 §4-4);BossMod 只在讀條時畫圓,不預測位置 |
| 中央落石的位置 | 6 顆、離中心 3m,依順時針落下 | 影片示意圖量測(整理檔 §4-4) |
| 究極神兵地裂斬的 4 道副線 | ±45° / ±135°;本體面向正北 | BossMod 對 `LandslideUltimaHelper` 只建一般矩形,方向來自實際讀條;面向正北依影片字幕,用這組方向算出的安全點與影片落點吻合(整理檔 §4-6) |
| 一運後半的伊弗利特 / 泰坦 | 北 13.6m / 西南 18m | 影片只給方向;伊弗利特往內放以免被 2 號標記蓋住 |
| 妙翅、美翼、迦樓羅 | 西 / 東 / 南的場邊 | wiki「場地周圍」 |
| 魔導浮游炮 | 6 個、離中心 11m | wiki「六個」 |
| 追蹤爆炸的衰減 | 圓 15m | BossMod `TODO: verify falloff` |

---

## E. 產生器

`tools/layout-uwu-p4.py`:P4 的章節、速查卡與站位都由它產生,寫回 `data/uwu.js` 的 P4 區塊。
內建檢查(任一不過就不寫入):

1. **碰撞**:躲避步驟中沒有人站在 AOE 裡(追擊第 2 波排除十字)。
2. **出界**:20m。
3. **地火**:4 發都炸不到北邊集合的人與 A 外側的凹處。
4. **落石**:站在 A 標記上會被打到、凹處最裡面打不到(對上影片示意圖)。

`layout-uwu-p3.py` 同步修改為「有 P4 區塊時只替換到 P4 之前」。
流程:改 `layout-uwu-p3.py` / `layout-uwu-p4.py` → 執行 → 再執行 `rebuild-uwu.py`。
`rebuild-uwu.py` 新增 `EXPECT_P4`,P4 出現 BossMod 以外的尺寸就中止。
