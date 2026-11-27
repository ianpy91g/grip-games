// 首頁遊戲清單：每個遊戲的資料夾、index.html、縮圖、裝置都存在，且遊戲有「← 遊戲選單」連結
'use strict';
var h = require('./helpers'), ok = h.ok;
var fs = require('fs'), path = require('path'), vm = require('vm');
var root = path.join(__dirname, '..');

var win = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'games.js'), 'utf8'), { window: win });
ok(Array.isArray(win.GAMES) && win.GAMES.length > 0 && Array.isArray(win.DEVICES), 'games.js 有 GAMES 與 DEVICES');

var folders = {};
win.GAMES.forEach(function (g) {
  var dir = path.join(root, g.folder), page = path.join(dir, 'index.html');
  var html = fs.existsSync(page) ? fs.readFileSync(page, 'utf8') : '';
  ok(!folders[g.folder], g.title + '：資料夾名稱沒有重複'); folders[g.folder] = true;
  ok(!!html, g.title + '：' + g.folder + '/index.html 存在');
  ok(fs.existsSync(path.join(root, g.thumb)), g.title + '：縮圖 ' + g.thumb + ' 存在');
  ok(win.DEVICES.some(function (d) { return d.id === g.device; }), g.title + '：裝置 ' + g.device + ' 有定義在 DEVICES');
  ok(/id="home"[^>]*href="\.\.\/"/.test(html), g.title + '：有「← 遊戲選單」連結回首頁');
  ok(html.indexOf("'../music.js'") >= 0, g.title + '：有載入共用背景音樂 ../music.js');
});
h.done();
