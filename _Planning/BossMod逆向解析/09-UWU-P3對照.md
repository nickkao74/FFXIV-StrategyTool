# 09 — UWU P3 泰坦:BossMod 對照

延續 `07`、`08` 的做法,但順序不同:P1/P2 是先有目測版圖解、再用 BossMod 校對;
**P3 是在畫圖之前就讀完 BossMod**,所以 `data/uwu.js` 的 P3 章節**直接採用實測尺寸**,
`tools/rebuild-uwu.py` 對 P3 只做檢查、不做修改(尺寸不符就中止,避免兩份檔案悄悄分岔)。

## 資料優先序

| 序 | 來源 | 角色 |
|:--:|---|---|
| 1 | 影片逐字稿 `captionfy_-hAfONuZEcE.srt`(<https://youtu.be/-hAfONuZEcE>) | **機制描述與打法的最終依據** |
| 2 | 灰機 wiki 泰坦段落 | 補完機制定義 |
| 3 | BossMod `Modules/Stormblood/Ultimate/UWU/` | 幾何尺寸、時間軸 |

⚠ **P3 沒有繁中隊伍簡報、也還沒有影片截圖**。整理過程見 `_Planning/UWU-P3-整理.md`。

## 場地

與 P1/P2 相同:`ArenaCenter = (100, 100)`、`Polygon(center, 20f, 64)`,**1m = 5 單位**。
P3 的特別之處是**場地會縮**:`P3Geocrush2.OnCastStarted` 內

```csharp
Arena.Bounds = new ArenaBoundsCircle(NumCasts == 0 ? 16f : 12f);
```

→ 第一次跳躍後半徑 **16m**(圖上 80),第二次 **12m**(圖上 60)。圖上用 `donut` + `death` 色畫出外圈即死區。

`OID.Titan = R4.550`。這個值雖然出自 OID 註解,但 `LandslideBase.ShapeBoss = Rect(44.55, 3, 4.55)`
與 `ShapeHelper = Rect(40.5, 3, 0.5)` 的差正好是 4.05 = 4.55 − 0.5(註解原文:「difference is only in hitbox radius」),
所以 **4.55 由程式碼佐證,視為 A 級**。

---

## A. 尺寸對照

| 機制 | BossMod 出處 | 實際尺寸 | 圖上 | 級別 |
|---|---|---|---|:--:|
| 大地粉碎(落地) | `P3Geocrush1` `SimpleAOEs(…, 18f)` | 衰減半徑 18m | r90 | A |
| 大地粉碎(跳躍) | `P3Geocrush2._shapeCrush` `AOEShapeCircle(24f)` | 衰減半徑 24m | r120 | A |
| 縮場 | `ArenaBoundsCircle(16f / 12f)` | 16m / 12m | donut 80 / 60 | A |
| 碎岩 | `P3RockBuster` `AOEShapeCone(10.55f, 60°)` | 10.55m × **120°** | r52.75 / 120° | ⚠ 角度 TODO |
| 山崩 | `P3MountainBuster` `AOEShapeCone(15.55f, 45°)` | 15.55m × **90°** | r77.75 / 90° | ⚠ 角度 TODO |
| 大地之重 | `P3WeightOfTheLand` `SimpleAOEs(…, 6f)` | 圓 6m | r30 | A |
| 大激震 | `P3Upheaval` `SimpleKnockbacks(…, 24f, true)` | 擊退 24m | 箭頭 | A |
| 爆破岩石 大爆炸 | `P3Burst._shape` `AOEShapeCircle(6.3f)` | 圓 6.3m | r31.5 | A |
| 石牢爆炸 | `P3Gaols._freefireShape` `new(6f)` | 圓 6m | r30 | A |
| 地裂斬(主線) | `LandslideBase.ShapeBoss` `Rect(44.55, 3, 4.55)` | 前 44.55 / 後 4.55 / **半寬 3m** | 222.75 / 22.75 / 15 | A |
| 地裂斬(其餘 4 道) | `ShapeHelper` `Rect(40.5, 3, 0.5)` | 前 40.5 / 後 0.5 / 半寬 3m | 202.5 / 2.5 / 15 | A |
| 激震 | `P3Tumult` `CastCounter` | 全體,無形狀 | — | — |
| 汙泥 | 無(`// TODO: add sludge voidzones?..`) | — | r14 **示意** | ✗ |
| 爆破岩石落地 | `Bury` 只有 AID 註解 `range 3+R` | — | 未畫 | ⚠ 僅註解 |
| 石牢本體 | `OID.GraniteGaol` 註解 `R1.800` | 1.8m | 標記圈 r11 | ⚠ 僅註解 |

### 註解的 `X+R` 再驗證(R = Titan 4.55)

| 招式 | AID 註解 | 相加 | 程式碼 |
|---|---|---:|---:|
| RockBuster | `range 6+R ?-degree cone` | 10.55 | `Cone(10.55, …)` ✅ |
| MountainBuster | `range 11+R ?-degree cone` | 15.55 | `Cone(15.55, …)` ✅ |
| Landslide | `range 40+R width 6 rect` | 44.55 / 半寬 3 | `Rect(44.55, 3, 4.55)` ✅ |
| Burst | `range 5+R circle`(R = 爆破岩石 1.3) | 6.3 | `Circle(6.3)` ✅ |

兩招死刑的**角度**在註解裡是「?」,程式碼也標了 `// TODO: verify angle` —— 半徑可信,**張角只是作者的假設**。
圖上照畫,但在步驟上加了黃字提醒。

---

## B. 時間軸(`Phase3Titan` 的 delay 累加)

完整表見 `UWU-P3-整理.md` §3。重點:

```
 5.2  Geocrush1(落地衰減)        10.8 EarthenFury
19.0  Cleave 1 / 22.1 Cleave 2      ← 第 1 組死刑
27.2  Puddles x2 → 35.4 Geocrush2(→16m)
44.0  Upheaval → 46.1 gaol targets → 50.5 Landslide 1 → (+0.6 fetters) → 55.0 Landslide 2
57.1–64.9 Tumult x8
73.0  Puddles x2 → 78.0/80.0 Landslide (awakened)
89.6  Geocrush2(→12m) → 單岩牢 → 106.5/108.5 Landslide (awakened)
111.7–117.3 Tumult x6
119.5 / 123.6  第 2 組死刑
130.8 Puddles x3 + central bombs → 136.3/138.3 Landslide (awakened) → 140.4 bombs
144.6 / 148.7  第 3 組死刑
153.8 Puddles x3 → 161.4–169.2 Tumult x8
184.6 EarthenFury(狂暴)
```

---

## C. BossMod 反過來佐證逐字稿的四件事

### C-1. 第 1、3 組死刑相隔 2 分鐘

逐字稿:「剛好間隔 2 分鐘,MT 和 ST 交替吃死刑可能也是個好選擇」。
時間軸:19.0 → 144.6 秒,**相隔 125.6 秒** —— 2 分鐘的無敵 / 減傷剛好轉好。

### C-2. 拘束在地裂斬 1 判定之後才上身

`P3UpheavalGaolsLandslideTumult` 在兩發地裂斬之間註記 `// +0.6s: fetters for gaols`。
這解釋了逐字稿「第一次的地裂斬是有判定的,所以必須抓在不被打中的極限時機進去」——
**岩牢組要在地裂斬 1 判定結束的那一刻就站在固定位置**,早了會被打、晚了會被關在錯的地方。

### C-3. 引爆源是「多出來的那一顆岩石」

```csharp
P3LandslideNormal(id + 0x20u, 1.8f, "Landslide 1")
    .ActivateOnEnter<P3Burst>(); // extra bomb appears ~0.1s before landslide start
...
P3LandslideNormal(id + 0x30u, 2.3f, "Landslide 2")
    .DeactivateOnExit<P3Burst>(); // bomb explodes ~0.5s before landslide end
P3Tumult(id + 0x1000u, 2.1f, 8)
    .DeactivateOnExit<P3Gaols>(); // if everything is done correctly, last gaol explodes ~0.7s before raidwide
```

逐字稿的「大激震結束後,剛剛的安全區馬上會有岩石掉下來」+「以剛剛掉下來的岩石為引爆源」
= 這顆在地裂斬 1 之前出現、地裂斬 2 結束前爆炸的岩石。
連鎖順利的話,最後一個石牢在激震第一段之前約 0.7 秒炸開,與逐字稿「岩牢期間會有全體攻擊」的節奏一致。

### C-4. 覺醒地裂斬「第 1 發的範圍 = 第 2 發的安全區」

```csharp
// if boss is awakened, these 5 landslides are followed by another 5 landslides
// at phi +- 22.5, phi +- 90 and phi + 180
```
第 1 發在 0°、±45°、±135°,第 2 發在 ±22.5°、±90°、180° —— **十個方向兩兩錯開**,
所以站在第 1 發剛打完的直線裡,第 2 發一定打不到。這就是逐字稿口訣的幾何根據。

> 延伸:相對主線 **±67.5°、±112.5°** 的縫隙兩發都打不到,但離泰坦要超過約 9m 才有足夠寬度。
> 圖上 MT 的位置就是用這個縫隙算出來的。

---

## D. 一個以 BossMod 修正逐字稿的地方

逐字稿 05:36「然後再次『大地之怒』」,緊接著卻說「MT 要盡量把泰坦引導到正中央,這時候場地會變得更小」。
`Phase3Titan` 在覺醒地裂斬之後是 `P3Geocrush3` → `P3GeocrushSide` → **`Geocrush2`(跳躍,縮場到 12m)**,
沒有 `EarthenFury`。縮場只會發生在跳躍,所以判定為逐字稿誤譯,**採大地粉碎(跳躍)**。

---

## E. 沒有 BossMod 依據、維持示意的項目(交付時已回報)

| 項目 | 圖上 | 依據 |
|---|---|---|
| 泰坦跳躍的落點距中心 14m | (±70, 0) / (0, ±70) | ⚠ 只出現在 `P3Geocrush2` **被註解掉**的 `_possibleOffsets`;wiki 只說「降落在正點」 |
| 大激震的岩石配置、「缺角」 | 兩個候補點擇一 | 逐字稿描述,**待截圖** |
| 三連岩牢的排列 | 落石 → H2 → H1(中央)→ D4 → 泰坦,每段約 7m | 由爆炸半徑推導;與逐字稿「站在標記上」的說法有出入,見整理檔 §4-5 |
| 汙泥大小 | r14 | BossMod 未建模;wiki 說「實際範圍比動畫小」 |
| 中央 4 顆岩石的位置 | (±8, ±8) | 只確定有 4 顆、在中央附近(逐字稿「能用的只有外周邊緣」) |
| 石牢本體大小 | 標記圈 r11 | ⚠ 僅 OID 註解 R1.8,只用於畫標記 |
| 碎岩 / 山崩的張角 | 120° / 90° | BossMod 程式碼,但作者標 `TODO: verify angle` |

---

## F. 產生器的變更

`tools/rebuild-uwu.py` 新增 P3 區塊:**不改任何東西,只檢查** P3 章節裡的每個圓 / 扇 / 矩形 / 環形的尺寸
都屬於上表的 BossMod 值(示意用的 `generic` / `void` 色圓圈除外),不符就中止。
重跑結果:P1/P2 的輸出與先前**逐位元相同**(在 HEAD 上重跑無差異),P3 原樣帶入 `uwu-lab.js`。
