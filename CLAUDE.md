# 握力遊戲合集

用藍牙健身裝置玩的網頁遊戲合集，部署在 GitHub Pages。
正式網站：https://ianpy91g.github.io/grip-games/ （首頁是遊戲選單，各遊戲在子資料夾）

## 溝通

- 一律用繁體中文（台灣用語）回覆、寫註解與 commit 訊息。
- 使用者常用手機或平板下指令：回覆精簡，重點說「改了什麼」和「畫面上看得到什麼變化」，最後附上要確認的版號。

## 結構

| 路徑 | 內容 |
|---|---|
| `index.html` | 首頁：依裝置分區列出遊戲卡片，清單讀 `games.js` |
| `games.js` | 遊戲清單 `GAMES` 與裝置清單 `DEVICES`（新增遊戲只改這裡＋放遊戲資料夾） |
| `thumbs/` | 首頁卡片縮圖（640×360 JPG，取自遊戲選單畫面的 16:9 截圖） |
| `egg/` | 捏蛋大挑戰（ORIORI 握力球）：`game.js` 本體、`app.js`、`kiwi.png` |
| `rocket/` | 水火箭發射（ORIORI 握力球）：`rocket.js` 本體、`art.js` 背景繪圖、`app.js` |
| `keeper/` | 守門員大作戰（健身趣握力環 ×2）：`keeper.js` 本體、`app.js` |
| `tests/` | Node 測試，`node tests/run.js` 全部執行（不會部署上線） |
| `.github/workflows/pages.yml` | 推到 main → 跑測試 → 通過才部署；PR 只跑測試 |

每個遊戲資料夾都是同一套架構：

- `index.html`：小外殼，每次開啟用時間參數載入 js（避免 Bluefy 拿到快取舊版）。幾乎不用改。左上角有「← 遊戲選單」連結 `#home`。
- 遊戲本體 js：畫圖、邏輯、音效、音樂；**不碰 DOM**，可在 Node 測試；開頭有 `VERSION`，畫面右下角會顯示。
- `app.js`：畫面縮放、觸控、鍵盤、Web Bluetooth、存檔（localStorage）。`HOME_STATES`／`HOME_POS` 決定「← 遊戲選單」在哪些畫面顯示、放在哪裡（遊戲座標）。

## 必須遵守

1. **iPad iOS 12 相容**：主要在舊 iPad 的 Bluefy 瀏覽器玩（Safari 不支援網頁藍牙）。遊戲程式用 ES5 寫法（`var`、`function`，不用箭頭函式、`let/const`、class、模板字串、`?.`、`??`），CSS 也避開 iOS 12 不支援的功能（例如 flex 的 `gap`）。Canvas 不用 `ctx.filter`。`tests/` 是 Node 執行的，不受此限。
2. **改了哪個遊戲就改那個遊戲的 `VERSION`**，格式 `YYYY.MM.DD-N`（同一天第幾版）。使用者靠畫面右下角版號確認拿到新版。
3. **畫布寬 960，高度 540～760 依螢幕比例**（iPad 4:3 是 720，手機橫放約 540）。改畫面時兩種高度都要檢查，不能疊字或超出。
4. **藍牙連線要在使用者觸碰的事件裡呼叫 `requestDevice`**；離開頁面（`pagehide`）要斷線，否則下一個遊戲找不到裝置。
5. 遊戲資料存在 localStorage；網址都在 `ianpy91g.github.io` 同一個網域，**不要改存檔的 key**，否則玩家紀錄會不見。
6. 不要在專案裡留截圖、暫存檔或任何 token。

## 修改與發佈流程

1. 修改程式，改對應遊戲的 `VERSION`。
2. 跑測試：`node tests/run.js`（語法檢查＋各遊戲測試，全部要通過）。新功能或修 bug 時，在 `tests/` 補對應的測試。
3. 有改畫面時截圖檢查：在專案根目錄 `python -m http.server 8766`，用無頭瀏覽器開 `http://localhost:8766/<遊戲>/`，視窗 1280×720（16:9）與 1024×768（iPad）各截一張（不要用 file:// 開，會卡住）。
4. commit（繁體中文訊息）後推到 `main`：GitHub Actions 自動跑測試、通過才部署。
   - 在使用者電腦上：直接推 `main`。
   - 在雲端工作階段：照環境推到分支並開 PR 指向 `main`，使用者合併後自動部署。
5. 部署後確認上線：`curl -s "https://ianpy91g.github.io/grip-games/<遊戲>/<本體>.js?t=$RANDOM" | grep VERSION`，看到新版號才算完成。
6. 回報時告訴使用者：在 Bluefy 關掉網頁重開，看右下角版號。

## 新增遊戲

1. 建新資料夾（例如 `newgame/`），複製一個現有遊戲的 `index.html` 外殼與 `app.js` 當起點（同裝置的遊戲最接近：握力球參考 `egg/`，握力環參考 `keeper/`）。
2. 本體 js 照同樣模式：`Game(env)`、`update(dt)`、`draw(ctx)`、`state`，匯出到 `root.XxxGame` 與 `module.exports`。
3. 在 `app.js` 設好 `HOME_STATES`、`HOME_POS`（選單畫面裡不會擋到東西的位置）。
4. 在 `games.js` 的 `GAMES` 加一筆；用到新裝置時在 `DEVICES` 加一筆。
5. 截一張選單畫面（1280×720）縮成 640×360 JPG 放 `thumbs/`。
6. 在 `tests/` 加 `<遊戲>_test.js`：至少跑完一局並每幀用 `helpers.mockContext()` 畫圖。`tests/portal_test.js` 會檢查清單、縮圖、回選單連結有沒有漏。
7. 遊戲資料夾放一份 `README.md` 說明玩法與操作。

## 裝置協定

### ORIORI 握力球（egg、rocket）

- 藍牙名稱 `weixin-` 開頭；服務 `FFB0`，通知通道 `FFB2`。
- 資料是 ASCII：`"19" + 方向(1=用力/0=放鬆) + 握力值`，例如 `19128.0`。
- 放手後讀數不一定歸零（可能停在 2～3），判斷「放開」不能只看降到很低的門檻（egg 曾因此蛋一直捏不破）。

### 健身趣 智能握力環 Fit 100（keeper，兩支當左右手）

- 藍牙名稱 `FUNFITGRIP`；服務 `0000fff0-…`。
- 每 0.2 秒寫 `0x05` 到 `FFF2`，握力環才會持續回報；`FFF1` 通知 `0c 01`＝握下、`0c 00`＝放開；`04`／`0b` 訊息第 5 個位元組是次數（次數增加也當作握下，因為剛連線時第一次握下可能漏掉）。
- `requestDevice` **只能用名稱篩選**（`namePrefix: 'FUNFIT'`）：握力環的廣播沒有宣告 FFF0 服務，用服務篩選在 iPad 上清單會全空。
- 握力環連著別的裝置（手機 App、Windows 配對、電腦背景程式）時不會出現在清單裡。

## 舊網址

以前三個遊戲各自一個 repo（`egg-game`、`rocket-game`、`keeper-game`），現在那三個網址只剩轉址頁，會自動轉到這裡對應的遊戲。不要再改那三個 repo 的遊戲程式。
