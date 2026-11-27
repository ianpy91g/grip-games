// 水火箭發射：握不到 1 秒不發射；用不同握力發射，等級與握力對應，且每幀畫圖沒有錯誤
'use strict';
var h = require('./helpers'), ok = h.ok;
var R = require('../rocket/rocket.js');
var DT = 1 / 60;

var grip = { force: 0, connected: true, status: '' };
var g = new R.Game({ grip: grip, storage: h.memStorage(), audio: null, connectGrip: function () { }, bluetoothSupported: true, makeCanvas: h.mockCanvas });
var ctx = h.mockContext(), err = null;
function run(force, sec) { grip.force = force; for (var t = 0; t < sec; t += DT) { g.update(DT); g.draw(ctx); } }
function waitReady(maxSec) { for (var t = 0; t < maxSec && g.state !== 'ready'; t += 0.5) run(0, 0.5); }

try {
  run(0, 1.5);
  ok(g.state === 'ready', '一開始在發射台待命');

  // 握 0.4 秒就放開：打氣不夠，不發射
  run(20, 0.4); run(0, 0.5);
  ok(g.state === 'ready' && !g.launchForce, '握不到 1 秒就放開：不發射');

  // 不同握力發射：5（失敗）、12（等級 1）、33（等級 5）、60（等級 10）
  [[5, 0], [12, 1], [33, 5], [60, 10]].forEach(function (c) {
    waitReady(30); run(0, 0.5);
    run(c[0], 1.5); run(0, 0.2);
    var flew = g.state === 'flight', lv = g.level;
    run(0, 15); waitReady(30);
    ok(flew && lv === c[1] && R.levelOf(c[0]) === c[1], '握力 ' + c[0] + ' 發射：等級 ' + lv + '（應為 ' + c[1] + '）');
  });
} catch (e) { err = e; }
ok(!err, '打氣、發射、飛行、結果每幀畫圖沒有錯誤' + (err ? '：' + err.stack : ''));
h.done();
