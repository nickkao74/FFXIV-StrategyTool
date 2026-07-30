---
name: board-object-parity
description: >-
  攻略端(js/arena.js)與戰術白板端(js/board/)的圖元對等檢查表。當你在這個專案為某個副本
  新增、修改或重新命名任何自訂圖元/物件時就要用它 —— 包含在 arena.js 的 _drawAoe /
  _drawAnnotation / _drawMarker 加 case、在 data/<raid>.js 的 steps 裡寫出一個現有引擎
  不認得的 type、在白板 objects.js 加物件種類、或是想把某個機制物件放進白板工具列的
  「副本專屬」分類。只要聽到「新增圖元」「加一個物件」「白板沒有帶過來」「導入後元件不見了」
  「副本專屬物件」「加到工具列」這類需求就該載入。攻略端單獨加圖元一定會造成白板匯入時
  靜默丟棄,這個 skill 的存在就是為了讓那件事不再發生。
---

# 攻略圖元 ↔ 白板物件 對等檢查表

## 為什麼需要這份檢查表

這個專案有兩套彼此獨立的渲染引擎，共用同一份攻略資料：

- **攻略頁**：`js/arena.js` 逐步渲染 `data/<raidId>.js` 的每個 `step`，每步自帶完整畫面。
- **戰術白板**：`js/board/` 是全域物件清單 + 逐格快照，並透過 `js/board/import.js` 把攻略的
  step 轉成白板物件。

兩者沒有共用的圖元登記表。`import.js` 的 `convertGuideStep()` 用 `switch (a.type)` 逐一比對，
**遇到不認識的 type 會直接跳過，不報錯、不警告**。所以只在攻略端加圖元，症狀是：

> 使用者在白板按「導入攻略」，畫面只出現兵棋和幾個圓圈，
> 精心畫的機制圖元全部消失，而 console 一片乾淨。

這種 bug 特別難查，因為沒有任何錯誤訊息。這份檢查表就是為了在動手時就把它擋掉。

## 動手前先分類：這個圖元屬於哪一種？

不是每個攻略圖元都該變成白板物件。先判斷類型，會省下很多白工：

| 類型 | 判準 | 該怎麼做 |
|---|---|---|
| **場地特徵** | 整個階段都存在、玩家不會移動它、也不需要逐格開關（中央天坑、破損的地板、固定的傳送陣） | 做成**場地屬性**（`data/arenas/<arena>.js` 的 phase 欄位 + `canvas.js` 的 `setPhase()` 繪製），**不要**做成物件。並在 `import.js` 明確跳過它，避免和場地重複疊一層 |
| **可操作物件** | 團隊會想拖動、複製、逐格顯示隱藏（塔、羽毛、小鳥、禁止標記） | 做成白板物件，走完下面整份清單 |
| **純敘述** | 只是攻略頁的文字說明或圖例，白板上沒有對應概念 | 兩邊都不用加；但要在 `import.js` 有意識地跳過，並在該 case 留一行註解說明為什麼 |

判斷不出來就問使用者：「這個東西在白板上，你會想拖它、還是它應該像地板一樣固定？」

## 清單 A：新增可操作物件（8 個註冊點）

漏掉任何一個都會有具體症狀，所以下表把症狀寫出來，方便你反推自己漏了哪個。

| # | 檔案 | 要加什麼 | 漏掉的症狀 |
|---|---|---|---|
| 1 | `js/arena.js` | `_drawAoe()`／`_drawAnnotation()`／`_drawMarker()` 的 `case` | 攻略頁該步驟空白 |
| 2 | `css/style.css` | 攻略端樣式（`.<kind>-*`） | 攻略頁畫出來但沒有顏色／看不見 |
| 3 | `js/board/objects.js` | `OBJECT_DEFAULTS['<kind>'] = { …預設欄位 }` | 從工具列放置後欄位是 `undefined`，畫出破圖 |
| 4 | `js/board/objects.js` | `renderBoardObject()` 的 `case`（回傳 SVG 節點） | 白板上完全看不到，但物件清單裡有一列 |
| 5 | `js/board/app.js` | `OBJECT_LABELS['<kind>'] = '中文名'` | 物件清單顯示原始 kind 字串 |
| 6 | `js/board/app.js` | `PROPERTY_SCHEMAS['<kind>'] = [ …欄位 ]` | 選取後屬性面板空白，無法調整 |
| 7 | `js/board/app.js` | `OBJECT_GROUPS` 裡 `id: 'special'` 那列的 `match` 陣列 | 物件清單裡歸不到任何分組而消失 |
| 8 | `data/board-special-objects.js` | `{ kind, label, icon, raids: ['<raidId>'] }` | 工具列沒有按鈕，只能靠導入產生 |
| 9 | `css/board.css` | 白板端樣式 | 白板畫出來但沒有顏色 |
| 10 | `js/board/import.js` | `convertGuideStep()` 的 `case`（攻略 type → 白板 kind） | **導入後靜默消失 —— 最常漏的一個** |

> 表頭寫「8 個」是因為第 1、2 點屬於攻略端；白板端本身是 8 個。實務上請把整張表當成一次完成的工作。

### 各註冊點的寫法

**3. `OBJECT_DEFAULTS`** — 只放「可調整的欄位」。位置（`x`/`y`/`attachTo`/`dx`/`dy`）由框架處理，
不要放進來。`id`/`kind`/`locked`/`sync`/`visible` 也由框架補。

```js
'tower': { r: 15, color: 'yellow' },
```

**4. `renderBoardObject()`** — 回傳一個**尚未插入 DOM** 的節點。這點很重要：
不能在這裡呼叫 `getBBox()` 或任何需要 layout 的 API，因為節點還沒進文件樹，量出來會是 0。
需要依內容決定尺寸時只能估算（見下方「文字寬度估算」）。

```js
case 'tower': {
  const g = bo('g', { class: 'bobj tower' });
  bo('circle', { cx: p.x, cy: p.y, r: obj.r, class: 'tower-ring' }, g);
  return g;
}
```

節點的最外層要帶 `bobj` class，選取、鎖定、拖曳的樣式才會生效。

**6. `PROPERTY_SCHEMAS`** — 欄位型別有 `number`（可帶 `min`/`max`）、`color`、`select`
（帶 `options: [[值, 顯示], …]`）、`text`。只列真正需要手動調的欄位。

**8. `data/board-special-objects.js`** — `raids` 是陣列，同一個物件可以掛在多個副本下。
`kind` 必須已經在 `OBJECT_DEFAULTS` 裡定義過，否則按下工具列會放出一個沒有預設值的破物件。

**10. `import.js` 的轉換** — 攻略的 `type` 和白板的 `kind` 命名不必相同，但**必須有意識地對應**。
用 `place(at)` 取得位置（它會在座標剛好落在某個兵棋上時自動吸附，之後拖兵棋範圍會跟著跑），
用 `guideColor()` 把攻略的語意色（`fire`/`death`/…）轉成白板的一般色名。

```js
case 'tower':
  push({ kind: 'tower', ...pos, r: a.r || 15, color: 'yellow' }, at);
  break;
```

## 清單 B：新增場地特徵

1. `data/arenas/<arena>.js` 的 phase 加欄位（例：`hole: { r: 26 }`）。
2. `js/board/canvas.js` 的 `setPhase()` 讀該欄位並畫進 `this.floorLayer`。
   `floorLayer` 每次 `setPhase()` 會整個重建，所以不需要自己清理。
3. `css/board.css` 加樣式。
4. `js/arena.js`：攻略端如果也要顯示，通常是逐步的 aoe（因為攻略每步自帶完整畫面）。
5. `js/board/import.js`：**明確跳過**這個 type，並留註解說明它由場地提供，
   否則會和場地畫的那一層疊起來變兩層。

## 完成後的驗證

改完一定要實際跑一次匯入，不要只看程式碼。白板有密碼閘門，不要嘗試繞過它 —— 用一個臨時
測試頁載入真正的 `js/board/import.js`，把 `initGuideImportUI` 需要的 DOM 節點湊出來，
直接呼叫並檢查產出的物件。驗完刪掉測試頁。

驗證要涵蓋這幾點：

- 每個新 type 都真的產出了物件（**不是**只看畫面上「好像有東西」）。可以用
  `convertGuideStep(step, {})` 直接檢查回傳的 `objects` 陣列長度與 `kind`。
- 攻略頁該章節每個 step 都還正常（`document.querySelectorAll('#arena svg .<你的 class>')`）。
- 沒有 phase 標記或沒有專屬物件的舊副本（例如 `o4s-p1`）行為完全不變 —— 這是最容易被
  順手改壞的地方。
- console 沒有錯誤。注意 `python -m http.server` 沒有送 no-cache 標頭，瀏覽器會把舊的
  `data/<raid>.js` 快取住；驗證前先用網址參數或 `fetch(url, {cache:'reload'})` 破快取，
  否則你會對著舊檔案除錯。

## 這個專案已經踩過的坑

- **`guideRaidId` 是一對一的。** `js/board/app.js` 的 `ensureArenaForRaid()` 用
  `def.phases.find((p) => p.guideRaidId === raidId)`，只會取第一個相符的階段。
  同一個 arena 的多個 phase 填相同的 `guideRaidId` 會導致其他階段永遠選不到，
  而且會把使用者手動切好的階段強制切回第一個。多階段要靠攻略章節的 `phase` 欄位去對應。
- **`ann-<color>` 的 `stroke` 會被子元素繼承。** `css/board.css` 的 `.ann-red` 之類同時設了
  `stroke` 和 `color`。任何放在 `marker-group ann-*` 裡的 `<text>` 都會被自己的顏色描邊，
  中文字腔會被填滿而糊成一團。新增含文字的物件時，文字要明確寫 `stroke: none`
  （需要外框增加對比就用深色描邊搭 `paint-order: stroke`）。
- **文字寬度估算要分全角半角。** 節點還沒進 DOM，量不到寬度。全角（CJK、全角標點）約
  1em，半角約 0.55em。全部當 1em 算會讓背景板在英數字串上明顯過寬。
- **攻略端的 `opacity` 不會跟著過去。** 攻略的 `.aoe` 有 `opacity: .55`，白板的 `.aoe` 也有，
  但你自訂的 class 沒有。不透明的大面積圖元會蓋掉場地標記 A/B/C/D —— 攻略端已經靠
  把 waymark 圖層排在 AOE 之上解決，白板端的 `waymarkLayer` 也在 `objectLayer` 之後，
  但仍要確認自己的圖元沒有畫到更上層。
