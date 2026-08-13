# 05 — 新副本攻略的標準取用流程

朱雀這一輪已經把規則校準完畢。之後要做新副本時,照這份流程走。

---

## 步驟 0 — 找到 module

```
_OriginalReferences/BossmodReborn/BossMod/Modules/<資料片>/<類別>/<副本代號>/
```

`<類別>` = `Raid`(零式)/ `Ultimate`(絕)/ `Extreme`(極)/ `Trial` / `Dungeon` /
`Unreal`(幻)/ `Alliance` / `Foray`。

找不到就全域搜尋 BOSS 英文名。**同一個 BOSS 的極/幻版本常有兩份幾乎相同的 module,
可以互相對照補完**(朱雀的 `Ex7Suzaku` ↔ `UnSuzaku` 就是這種關係)。

`[ModuleInfo(...)]` 屬性裡的 `Maturity` 值得看一眼:
`Verified` 表示插件作者實戰驗證過,`WIP` 則要保留懷疑。

## 步驟 1 — 抽場地參數

從主檔(`<副本>.cs`)抄:

```csharp
public static readonly WPos ArenaCenter = new(X, Z);
public static readonly ArenaBoundsCustom Bounds = ...;
```

決定 `RADIUS_YALM`(取外緣)與 `K = 100 / RADIUS_YALM`。
記錄在新的 `data/<raid>.js` 檔頭註解裡。

### ⚠️ 註解的可信度:低,不優先採用

`<Module>Enums.cs` 裡每個 AID / OID 後面都有一行看起來很誘人的註解:

```csharp
WellOfFlame = 43017,   // Boss->self, 4s cast, range 41 width 20 rect
ScarletLady = 0x47D2,  // R1.12
```

**這些是半自動產生的,可信度是全部來源裡最低的一級(C 級,見 `01` 第 0 節)。**
理由:

- 它們由封包 dump 工具批次寫出,**module 改版時不一定會同步更新**。
- 同一份註解在極版與幻版之間是整段沿用的,**只換 ID 不重新驗證**。
- 註解描述的是「這一招長什麼樣」,但插件真正拿去判定的是
  `new AOEShape…` 的參數 —— **兩者不一致時,以程式碼為準**。
- 檔名同樣不可望文生義:`ScarletMelody.cs` 處理的是 P2 音遊,
  我們稱為「朱紅旋律」的四色地板在插件裡叫 `Hotspot.cs`。

**工作規則**:

1. 註解**只當索引**,用來快速定位「這招大概是什麼類型」。
2. 任何要進到沙盤圖的數字,**一律回頭找程式碼裡的 `new AOEShape…`**。
3. 找不到對應程式碼、又非得引用註解不可時:
   - 在文件的出處欄標 **`⚠️ 僅註解`**;
   - **並且在交付訊息裡向使用者明確回報「這一項只有註解佐證」**,
     讓對方決定要不要實測。不要默默用掉。
4. 全屏 AOE、單體死刑這類**沒有範圍可畫**的招式是合理例外 ——
   插件本來就不會替它們建構形狀,引用註解做定性描述沒問題,
   但註解裡的 `range 41` 之類的數字仍然不要拿去畫圖。

上游官方 wiki
([Making a Module: What kind of attacks exist?](https://github.com/awgil/ffxiv_bossmod/wiki/Making-a-Module:-What-kind-of-attacks-exist%3F))
比註解可信,但**只寫了 circle 與 cone 兩種形狀**,而且 `DirectionOffset`
那一欄官方自己標成「??? (need to experiment on this one)」。
它可以拿來佐證(例如它確認了 `HalfAngle` 是半角),但不足以當主要依據。

## 步驟 2 — 抽時間軸

從 `<副本>States.cs`,把 `delay` 累加成流程表。重點:

- 被抽成 **私有方法** 的段落 = 固定套路組合技,直接對應攻略的一個「節」。
- `.SetHint(Raidwide / Tankbuster / Knockback / DowntimeStart)` → 攻略的標記。
- `CastMulti([A, B], ...)` → **需要判讀技能名的二選一機制**,一定要寫進 cheatsheet。
- `ActivateOnEnter<X>` / `DeactivateOnExit<X>` → 哪些機制同時存在(複合機制的來源)。

## 步驟 3 — 抽幾何

在該資料夾全域搜尋:

```bash
grep -rn "new AOEShape" .        # 所有形狀與尺寸
grep -rn "new AOEInstance" .     # 形狀 + 位置 + 指向 + 時間
grep -rn "AddForcedMovement\|Towers.Add\|Knockback" .
```

牢記 `halfAngle` / `halfWidth` 都是「一半」。

## 步驟 4 — 抽「解法」(最有價值的一步)

```bash
grep -rn "AddForbiddenZone\|GoalZones\|ForbiddenDirections\|SetPriority" .
```

`SD*` 形狀寫的是 **站位解**。常見句型:

| 程式碼 | 意思 |
|---|---|
| `SDCircle(c, r)` 禁止 | 站 r 以外 |
| `SDInvertedCircle(c, r)` 禁止 | 站 r 以內 |
| `SDInvertedCross(c, dir, len, halfW)` 禁止 | 站在十字線帶上 |
| `SDCone(c, r, dir, half)` 禁止 | 避開那個扇區 |
| `SDRect(c, dir, len, back, halfW)` 禁止 | 避開那條帶子 |
| `SDUnion([...])` | 以上聯集,全都要避開 |
| `GoalProximity(p, r, w)` | 反過來:**要靠近** p 到 r 以內 |
| `ForbiddenDirections.Add((d, ~175°, t))` | **必須面向 d** |

**這些數字往往能被反推出物理來源**(例:`14.5 = 3.5 天坑 + 11 牽引)。
反推成功 = 你真的理解了這個機制;反推不出來就先照抄並標記待驗證。

## 步驟 5 — 轉換並寫入

套用 `03` 的公式與圖元對照表,產出 `data/<raid>.js`。

- 位置:`(worldX - centerX) * K`,`(worldZ - centerZ) * K`
- 角度:`(180 - bossmodDeg + 360) % 360`
- 長度:`yalm * K`

## 步驟 6 — 需要新圖元時

1. **先讀 `board-object-parity` skill。**
2. 在 `js/arena.js` 的 `_drawAoe` 加 case。
3. **同步** `js/board/objects.js` 與白板工具列的「副本專屬」分類。
4. 兩邊命名一致,否則攻略匯入白板時會靜默丟棄。

目前已知待補的原生圖元:**`rect`**(規格見 `03` 第 3 節),
之後可能還會需要 `donutSector` 與 `cross`。

## 步驟 7 — 交叉驗證

新副本沒有「已驗證攻略」可對照,改用這三個替代驗證:

1. **自洽性**:插件的安全區數字能不能由場地尺寸 + 位移距離反推出來?
2. **時間軸總長**:把 `States.cs` 的所有 delay 累加,應接近該副本的實際 enrage 時間。
3. **文字攻略對照**:找一份社群攻略,確認出招順序與插件狀態機同構(像 `04` B 段那樣)。

三項都過才把該副本標為可信。

---

## 該做與不該做

**該做**

- 取用機制的客觀幾何事實(位置、尺寸、角度、時間)。
- 把插件的 AI 站位解當作 **一種解法** 記錄下來,並與社群主流解法並列。

**不該做**

- 修改 `_OriginalReferences/BossmodReborn` 底下任何檔案(它有獨立 Git 版控)。
- 把插件程式碼直接複製進本專案。
- 把 `party == 8` 之類的插件體驗調整當成遊戲機制。
- 相信 AID / OID 註解與檔名而不看實際程式碼
  (`ScarletMelody.cs` 其實是 P2 音遊,不是朱紅旋律)。
- **把只有註解佐證的數字畫進沙盤圖,而且不告訴使用者。**
  真的只能用註解時,文件標 `⚠️ 僅註解`,交付時明講。
