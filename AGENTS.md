# 握力遊戲合集：AI 代理作業指南

給 Codex、Google Jules、GitHub Copilot 等代理看的入口。**完整規則在 [CLAUDE.md](CLAUDE.md)，動手前先讀完。**

重點摘要：

- 一律用繁體中文（台灣用語）回覆、寫註解與 commit 訊息。
- 遊戲要在舊 iPad（iOS 12）的 Bluefy 瀏覽器跑：遊戲程式只用 ES5 寫法，CSS 避開 iOS 12 不支援的功能。
- 改了哪個遊戲，就改那個遊戲本體 js 裡的 `VERSION`（格式 `YYYY.MM.DD-N`）。
- 改完執行 `node tests/run.js`，全部通過才能提交；新功能要補測試。
- 新增遊戲：放新資料夾，在 `games.js` 加一筆，縮圖放 `thumbs/`，步驟見 CLAUDE.md。
- 推到 `main`（或 PR 合併進 `main`）後，GitHub Actions 會先測試、通過才部署到 https://ianpy91g.github.io/grip-games/ 。
