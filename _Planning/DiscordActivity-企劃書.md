# Discord Activity 企劃書

把攻略工具做成 Discord 私人 Activity，讓固定隊在語音頻道裡一起看攻略、排戰術。

- **開發主分支**：`discord-activity`。各子項目從這裡開分支，完成後合回這裡；整個項目穩定後再合進 `main`。
- **上架範圍**：私人使用（自己的伺服器、未驗證 App 上限 100 個伺服器），不送 App Directory 審核。
- **托管**：Cloudflare Workers（靜態網站 + API），第二階段加 Durable Objects。

## 里程碑

### M1 私人上架：靜態檢視攻略 ✅
在 Discord 裡開啟 Activity，可以瀏覽首頁、開啟攻略頁、播放步驟。每個人各看各的，不同步。

- [x] Discord Embedded App SDK 打包成單檔（`js/discord/sdk.min.js`，無建置工具）
- [x] `js/discord/activity.js`：偵測是否在 Discord 內、SDK 握手、XIVAPI 網址改寫、站內換頁保留 Discord 參數
- [x] Discord 內先隱藏戰術白板入口（白板留到 M2 以後）
- [x] Worker：托管靜態檔、`/api/token`（OAuth 交換，M2 起才會用到）
- [x] `discord/build.sh`：只打包公開檔案到 `discord/dist`
- [x] 建立 Discord Application、部署 Worker、設定 URL Mappings
- [x] 桌面版 Discord 實測：首頁、攻略頁、橫幅圖、換頁

### M2 主持人模式（隊長主控）← 目前（分支 `discord/m2-host`）

實作狀態：
- [x] Room Durable Object（`discord/worker/src/room.js`）：主持人規則、盤面保存與轉發、30 秒寬限期（alarm）
- [x] `/api/room`：以 Discord access token 驗證身分後連線；本機開發可用 `DEV_MODE=1` + `?devuser=`
- [x] 前端 `js/discord/room.js`：房間面板（在線名單、申請／同意／拒絕、指派）、觀看者唯讀
- [x] Discord 內白板免密碼（`gate.js`），首頁重新顯示白板入口
- [x] 本機三人模擬測試：同步、非主持人變更不外流、申請→同意、指派、斷線 30 秒轉交、晚加入者取得目前盤面
- [ ] 設定 `DISCORD_CLIENT_SECRET` 後部署，在 Discord 內實測（授權視窗、多人）
- [ ] 已知限制：觀看者目前無法自行縮放／平移白板；攻略頁跟隨尚未實作

設計：
一位主持人操作白板／攻略播放，其他參與者即時跟著看。

- **身分**：Activity 內走 OAuth（`identify` scope），用 Discord 使用者 ID 區分參與者；取代 `gate.js` 的寫死密碼。
- **房間**：Durable Object，每個 `instanceId` 一個房間；保存最後一份盤面，晚加入的人直接拿到目前狀態。
- **同步**：沿用 `history.js` 的 250ms 落定時機，主持人廣播盤面。訊息格式一開始就預留「整份盤面」與「單一物件變更」兩種，方便日後升級成多人編輯。
- **主持人規則**
  - 第一個進入房間的人自動成為主持人。
  - **指派**：主持人可以把主持權交給任一參與者。
  - **請求**：參與者可以申請主持權，主持人同意或拒絕；主持人一段時間沒回應時不自動轉移。
  - 主持人離線：保留一段寬限期（例如 30 秒）讓他重連，期滿後交給最早加入且仍在線上的人。
  - 只有主持人的變更會被伺服器接受；非主持人的編輯操作在前端停用，伺服器端也會拒收。
- **畫面**：參與者名單（頭像、主持人標示）、「申請主持」／「交出主持」按鈕、主持人收到請求時的提示。
- **攻略頁跟隨**（可選）：主持人切換攻略與步驟時，其他人跟著換頁。

### M3 之後（暫定）
- 多人同時編輯（只傳變動的物件，或改用 Yjs）
- 主持人的指標／雷射筆
- 存檔分享到頻道

## 上架步驟（M1）

1. **建立 Application**：<https://discord.com/developers/applications> → New Application。
2. **啟用 Activity**：左側 Activities → Settings → Enable Activities。
3. **OAuth2**：記下 Client ID；Reset Secret 取得 Client Secret（不要提交到 repo）。Redirects 填 `https://127.0.0.1`（Activity 不會真的導向，但欄位不能空）。
4. **部署 Worker**（需要 Cloudflare 帳號，免費方案即可）：
   ```bash
   DISCORD_CLIENT_ID=<你的 Client ID> ./discord/build.sh
   cd discord/worker
   npx wrangler deploy
   npx wrangler secret put DISCORD_CLIENT_SECRET
   ```
   並把 `wrangler.toml` 的 `DISCORD_CLIENT_ID` 填上。部署後會得到 `https://ffxiv-strategytool-activity.<帳號>.workers.dev`。
5. **URL Mappings**（Activities → URL Mappings）：

   | Prefix | Target |
   |---|---|
   | `/` | `ffxiv-strategytool-activity.<帳號>.workers.dev` |
   | `/xivapi` | `v2.xivapi.com` |

6. **安裝到伺服器**：Installation → 勾選 Guild Install，用產生的連結把 App 加到自己的伺服器。
7. **啟動**：在語音頻道點「活動（火箭圖示）」→ 選這個 App。

## 技術備註
- Discord 的 CSP 只允許連 `<app_id>.discordsays.com`；所有外部網域都要在 URL Mappings 登記，並同步加進 `activity.js` 的 `URL_MAPPINGS`。
- Activity 內的換頁不會保留 Discord 帶來的 `frame_id` 等參數，`activity.js` 會在點擊站內連結時自動補上。
- 沒有填 Client ID 時，`activity.js` 會略過 SDK 握手，網站照常以一般網頁運作；一般瀏覽器開啟時完全不受影響。

## 本機測試 M2（不需 Discord）
```bash
./discord/build.sh
cd discord/worker && printf 'DEV_MODE=1\n' > .dev.vars && npx wrangler dev
```
用不同瀏覽器（或無痕視窗）開 `http://localhost:8787/board?room=test&devuser=alice`、`...&devuser=bob`。`.dev.vars` 只在本機使用，不會部署，也已列入 `.gitignore`。
