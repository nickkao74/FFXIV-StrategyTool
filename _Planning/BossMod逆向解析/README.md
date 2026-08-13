# BossMod Reborn 逆向解析方案

## 目的

`_OriginalReferences/BossmodReborn` 是一個 FFXIV 的 BOSS 機制輔助插件,它的 module 原始碼裡
**已經把每一招的幾何資訊寫成程式碼**:形狀(圓/扇/矩形/甜甜圈)、半徑、角度、指向、
生效時間、施法者、目標選定方式。這些數字是插件作者用實戰封包對出來的,精度遠高於文字攻略。

本方案的目標是把這些資訊 **系統性地翻譯成本專案的攻略資料格式**(`data/*.js` 的 `steps[].aoes[]`),
讓之後新增副本攻略時,沙盤圖上的每一個 AOE 都有可考的座標與尺寸,而不是靠目測。

## 為什麼從朱雀開始

`data/hells-kier-ex.js`(極朱雀)是本專案 **已經過實戰驗證** 的攻略。
插件端有兩份等價 module:

| 插件 module | 對應副本 | 路徑 |
|---|---|---|
| `Ex7Suzaku` | 極朱雀徵魂戰(Hell's Kier EX) | `BossMod/Modules/Stormblood/Extreme/Ex7Suzaku/` |
| `UnSuzaku` | 幻朱雀(Hell's Kier Unreal) | `BossMod/Modules/Dawntrail/Unreal/UnSuzaku/` |

兩份 **程式邏輯逐行相同,只有 OID / AID 數值不同**(已 diff 確認)。
也就是說幻朱雀 module 的幾何資訊可以 1:1 套用到我們的極朱雀攻略上。

於是我們有一組理想的對照實驗:**已知正確的攻略** ↔ **未知格式的插件資料**。
用前者去校準後者的座標系、角度慣例與命名,校準完成後,這套轉換規則就能安全地
套用到我們還沒寫過的副本上。

## 文件結構

| 檔案 | 內容 |
|---|---|
| `01-資料模型.md` | BossMod 的座標系、角度慣例、AOEShape 詞彙、Component 詞彙 |
| `02-UnSuzaku機制解析.md` | 朱雀每一招的 OID/AID/形狀/尺寸/時序,逐條列出 |
| `03-座標與圖元轉換.md` | 世界座標 → 本專案座標的公式,以及 AOEShape → `arena.js` 圖元的對照表 |
| `04-交叉驗證.md` | 用已驗證的極朱雀攻略反向驗證上述規則,以及發現的落差 |
| `05-取用SOP.md` | 之後做新副本攻略時的標準流程 |
| `06-尺寸對照表.md` | 極朱雀每個圖元的實測尺寸;原本是攻略頁的第一章,已移出 |

## 外部參考

- [Making a Module: What kind of attacks exist?](https://github.com/awgil/ffxiv_bossmod/wiki/Making-a-Module:-What-kind-of-attacks-exist%3F)
  —— 上游 `awgil/ffxiv_bossmod` 的官方 wiki。**只寫了 circle 與 cone 兩種形狀**,
  `DirectionOffset` 官方自己標成「???」。可用來佐證(它確認了 `HalfAngle` 是半角),
  但不足以當主要依據。我們讀的是 `BossmodReborn` fork,形狀種類比 wiki 多得多。

## 資料可信度(重要)

取用插件資料時一律照這個順序,詳見 `01` 第 0 節與 `05` 的「註解的可信度」:

| 等級 | 來源 |
|:--:|---|
| **A** | 形狀類別的實作、module 裡實際 `new AOEShape…` 的參數 |
| **B** | 官方 wiki(不完整) |
| **C** | `<Module>Enums.cs` 的 AID / OID 行末註解 |

> ⚠️ **C 級(程式碼註解)對 BOSS 資訊的可信度低,不優先用於對照。**
> 那些註解是半自動產生的,改版時不保證同步。
> 若不得不引用,文件要標 `⚠️ 僅註解`,**並且在交付時向使用者回報**。
>
> 目前 `data/hells-kier-ex.js` 用到的幾何**全部是 A 級**。
> 唯一引用註解的地方是 **P1 小羽毛的 r9**(插件只對大羽毛建構了 `AOEShapeCircle(9f)`),
> 已記錄在 `02` 的技能總表下方。

## 硬性約束

- **`_OriginalReferences/BossmodReborn` 是唯讀的**(它有自己的 Git 版控),
  本方案只讀取、不修改該目錄下任何檔案。
- 所有產出文件都放在本資料夾。
- 插件原始碼是 **參考資料**,不是可以直接複製進本專案的內容;
  我們取用的是「機制的客觀幾何事實」,重新用本專案的格式表達。

## 已套用到極朱雀攻略

校準完成後,已經把實測幾何套進正式攻略。**檔案關係如下,動手前務必看清楚**:

```
data/hells-kier-ex-legacy.js     ← 文字的來源(目測版沙盤圖,首頁封存區可看)
        │
        │  node "_Planning/BossMod逆向解析/tools/rebuild-hells-kier.js"
        ▼
data/hells-kier-ex.js            ← 現行版(自動產生,勿手改)
```

| 要改什麼 | 改哪裡 |
|---|---|
| 攻略**文字**(body / caption / roleNotes / cheatsheet) | `data/hells-kier-ex-legacy.js` |
| 沙盤圖**幾何**、新增步驟 | `tools/rebuild-hells-kier.js` |
| 兩者改完 | 重跑產生器 |

```bash
node "_Planning/BossMod逆向解析/tools/rebuild-hells-kier.js"
```

> ⚠️ **直接手改 `data/hells-kier-ex.js` 會在下次重跑時被覆蓋。**
> 檔頭也寫了同樣的警語。

白板場地 `data/arenas/hells-kier.js` 也一併校正:天坑 26 → **17.5**,
P3 預設站位改用「塔的位置 − 擊退 11m」反推出來的 29。

## 目前狀態

- [x] 座標系與角度慣例已解出並用朱雀四色地板交叉驗證通過(4/4 象限吻合)
- [x] 朱雀全招式幾何表已建立
- [x] AOEShape → `arena.js` 圖元對照表已建立
- [x] 補上 `rect` 原生圖元(`js/arena.js` + `js/board/import.js`,已通過白板匯入驗證)
- [x] 極朱雀攻略已改用實測幾何,舊版封存在首頁
- [ ] 套用到下一個新副本
