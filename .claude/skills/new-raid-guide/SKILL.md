---
name: new-raid-guide
description: >-
  製作新攻略時的完整流程，重點是攻略寫完後怎麼把它掛上首頁並維護首頁卡片。凡是在這個專案
  新增一個副本攻略（新的 data/<id>.js）、為既有攻略補上新階段（例如 UWU 加 P5）、
  用新版取代舊版並把舊版封存、修改首頁卡片上的任何資訊（副本名稱、代號、系列、
  難度、版本、攻略來源／作者、橫幅圖、階段膠囊），或是首頁篩選需要新的難度／系列時，
  都要載入。只要聽到「新增攻略」「新副本」「做 XX 的攻略」「加一個階段」「掛到首頁」
  「首頁沒有出現」「改作者」「改代號」「加系列」「換橫幅」「封存舊版」這類需求就該用。
  漏做首頁這一步的症狀是：攻略頁本身打得開，但首頁找不到入口，或卡片上的作者、
  階段膠囊是錯的。
---

# 製作新攻略：從資料檔到首頁

攻略內容寫在 `data/<id>.js`，首頁卡片則由 **`data/raids.js`** 單獨驅動，兩者不會自動同步。
`js/home.js` 只讀 `raids.js`（不載入各攻略檔），所以章節、階段或作者有變動時，
**`raids.js` 一定要手動跟著改**，否則首頁會沉默地顯示舊資訊，或根本沒有入口。

## 流程總覽

1. 寫攻略資料檔 `data/<id>.js`（`window.RAID_DATA['<id>']`，`id` 要與檔名一致）
2. 若有新圖元或副本專屬物件 → 走 **board-object-parity** skill 的檢查表
3. （選做）白板場地：`data/arenas/<arena>.js` ＋ `data/arenas/index.js` 的 `ARENA_INDEX`
4. **登記到首頁：`data/raids.js`**（本 skill 的重點，見下）
5. 調整快取版本號
6. 執行檢查腳本 ＋ 在瀏覽器看過首頁

## 4. 登記到首頁：`data/raids.js`

### 4-1 `RAID_LIST` 欄位

在 `window.RAID_LIST` 加一筆。陣列順序就是首頁卡片的順序。

| 欄位 | 必填 | 規則 |
|---|---|---|
| `id` | ✓ | 與 `data/<id>.js` 的檔名、`RAID_DATA` 的 key 相同 |
| `name` | ✓ | 完整名稱。**白板的副本下拉選單用的是這個**，不要刪 |
| `title` | ✓ | 卡片主標：**完整的副本名稱（繁中）**，不要用簡稱 |
| `alias` | | 玩家俗稱的代號（`UWU`、`O4S`）。**沒有通用代號就不要填**，不要自己發明 |
| `subtitle` | | 選填補充說明，例如「目前只有第一階段（艾克斯迪司）」 |
| `category` | ✓ | `ultimate`（絕境戰）／`savage`（零式）／`extreme`（極） |
| `series` | | 同系列副本的名稱，用於首頁第二層篩選。現有：`歐米茄`、`四聖獸`。**同系列一定要用完全相同的字串**（篩選靠字串比對）。絕境戰沒有系列，不要填 |
| `patch` | ✓ | 版本／資料片，例如 `4.0 紅蓮之狂潮` |
| `phases` | ✓ | 階段膠囊，`[{ "label": "P1 迦樓羅", "section": "<章節 id>" }]`。`section` 必須是攻略檔裡**該階段第一個章節**的 `id`，點膠囊會開 `guide.html?raid=<id>&section=<章節 id>` |
| `author` | ✓ | **攻略來源（原作者）**，顯示在每張卡片上。**不知道就問使用者，絕對不要猜或留空** |
| `measured` | | `true` = 沙盤圖尺寸為 BossMod 實測值；目測或示意的就填 `false` |
| `banner` | | 卡片橫幅，二擇一：`{ "xivapi": "<任務搜尋器英文名稱的一部分>" }` 或 `{ "url": "<圖檔網址或專案內路徑>" }` |
| `description` | | 完整說明，滑鼠停在卡片上時顯示，也會被首頁搜尋比對 |

**找各階段第一個章節 id 的方法**：

```bash
node -e 'global.window={};require("./data/<id>.js");const seen=new Set();for(const s of window.RAID_DATA["<id>"].sections){if(s.phase&&!seen.has(s.phase)){seen.add(s.phase);console.log(s.phase,"→",s.id)}}'
```

### 4-2 橫幅（`banner.xivapi`）

首頁會用 `Name~"<字串>"` 到 XIVAPI 的 `ContentFinderCondition` 搜尋，取第一筆的 `Image`
（任務搜尋器封面圖，376×120），並把網址快取在瀏覽器的 localStorage
（key：`ffxiv-banner:<字串>`）。

- 填**英文**副本名稱中足以唯一辨識的一段，避開撇號這種容易出錯的字元。
  例：`Refrain (Ultimate)`、`Deltascape V4.0 (Savage)`、`Kier (Extreme)`、`Wreath of Snakes (Extreme)`
- 加上 `(Savage)`／`(Extreme)`／`(Ultimate)`，免得搜到同名的普通難度版本。
- 查不到或離線時，卡片維持難度色塊，不會報錯。
- 抓到錯圖時，請使用者清除該網站的 localStorage，或改用 `{ "url": ... }` 直接指定圖檔。
- 雲端開發環境通常連不到 XIVAPI：橫幅請使用者在自己的瀏覽器確認，不要宣稱已驗證。

### 4-3 新版取代舊版：封存

同一副本出新版（例如沙盤圖改為實測尺寸）時，照極朱雀、UWU 的做法：

1. 舊檔改名為 `data/<id>-legacy.js`，`RAID_DATA` 的 key、`id` 改成 `<id>-legacy`，
   `name` 加上「（目測版沙盤圖）」之類的區別字樣，檔頭註明已被誰取代
2. 新版沿用原本的 `<id>`，首頁和既有書籤的網址才不會失效
3. `raids.js` 的 `RAID_ARCHIVE` 加一筆：`id`、`name`、`author`（**必填**）、`description`、`replacedBy: "<id>"`
4. 若新版由產生器從舊版產出（`_Planning/BossMod逆向解析/tools/rebuild-*.py|js`），
   產生器的讀寫路徑要跟著改，並更新 `_Planning/BossMod逆向解析/README.md` 的檔案關係圖

**不要**在 `RAID_LIST` 放「校對版」這類平行版本，這個做法已經廢除。

### 4-4 既有攻略補新階段

攻略檔加了新階段（例如 P5）之後：

- 在 `phases` 補一個膠囊（`section` 填新階段第一章的 id）
- 視情況更新 `description`；若新階段不是實測尺寸，重新判斷 `measured`

### 4-5 新的難度或系列

- **新系列**：直接在 `series` 填新字串即可，首頁第二層篩選會自動長出來。
  同系列的其他攻略要填完全相同的字串（含繁簡、異體字）。
- **新難度**（`ultimate`／`savage`／`extreme` 以外）：要同步修改
  - `js/home.js` 的 `CATEGORIES`（id 與中文標籤）
  - `css/style.css` 首頁區塊的 `--cat-<id>`／`--cat-<id>-bg` 色票與 `.cat-<id>` 規則
  - `check-raids.js` 的 `CATEGORIES`

## 5. 快取版本號

靜態網站靠網址上的 `?v=` 避開瀏覽器快取。改過的檔案，引用處的版本號要加 1：

- `data/raids.js` → `index.html` **和** `board.html` 都有引用
- `js/home.js`、`css/style.css` → `index.html`
- `js/app.js`、`js/arena.js` → `guide.html`

## 6. 驗證

```bash
node .claude/skills/new-raid-guide/check-raids.js
```

它會檢查：必填欄位、`category` 是否合法、每個階段膠囊的 `section` 是否真的存在於攻略檔、
攻略裡有但首頁漏列的階段、封存的 `replacedBy` 是否有效、`author` 有沒有填。
**有 ✗ 就必須修好；⚠ 要逐條判斷。**

接著用瀏覽器開首頁實際看過（可用 `python3 -m http.server` ＋ Playwright）：

- 新卡片出現在對的難度與系列篩選底下
- 主標、代號、攻略來源正確
- 每個階段膠囊都跳到對的章節
- 頁尾聲明仍在：「本工具僅為個人使用，所有攻略之著作皆屬原作者所有。」

## 完成前自問

- [ ] `author` 是使用者確認過的原作者，不是我猜的？
- [ ] `title` 是完整的繁中副本名稱？`alias` 是玩家真的在用的代號？
- [ ] 同系列的 `series` 字串和既有攻略完全一致？
- [ ] `check-raids.js` 沒有 ✗？
- [ ] `index.html`、`board.html` 引用 `raids.js` 的 `?v=` 都加過了？
- [ ] 有新圖元的話，board-object-parity 的檢查表走完了？
