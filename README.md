# 握力遊戲合集

用藍牙健身裝置玩的網頁小遊戲。

**開始玩：** https://ianpy91g.github.io/grip-games/

| 遊戲 | 裝置 | 說明 |
|---|---|---|
| [捏蛋大挑戰](egg/) | ORIORI 握力球 | 握力超過門檻撐 0.5 秒捏破蛋，10 關＋特別關 |
| [水火箭發射](rocket/) | ORIORI 握力球 | 握緊打氣、放開發射，握力決定高度 |
| [釣魚大師](fishing/) | ORIORI 握力球 | 握緊收線、放鬆下沉，魚越大要越大的握力，90 秒比總重＋圖鑑 |
| [守門員大作戰](keeper/) | 健身趣握力環 ×2 | 左右手撲球，球要碰到身體才算擋下 |

## 瀏覽器

| 裝置 | 瀏覽器 |
|---|---|
| iPad / iPhone | **Bluefy**（Safari 不支援網頁藍牙），iOS 12 以上 |
| Android | Chrome |
| 電腦 | Chrome / Edge |

## 開發

- 測試：`node tests/run.js`
- 推到 `main` 後由 GitHub Actions 測試並部署到 GitHub Pages。
- 專案規則、新增遊戲步驟與裝置協定見 [CLAUDE.md](CLAUDE.md)。
