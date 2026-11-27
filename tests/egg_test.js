// 捏蛋大挑戰：放手判定（每次捏只扣一次機會、沒完全放開也能再捏），以及一路捏完 10 關＋特別關並每幀畫圖
'use strict';
var h = require('./helpers'), ok = h.ok;
var E = require('../egg/game.js');
var DT = 1 / 60;

function mk() {
  var grip = { force: 0, rising: false, connected: true, status: '' };
  var g = new E.Game({ grip: grip, storage: h.memStorage(), audio: null, connectGrip: function () { }, bluetoothSupported: true,
                       makeCanvas: h.mockCanvas, kiwiImage: { complete: false, width: 0, height: 0 } });
  return { g: g, grip: grip };
}
function run(o, force, sec, ctx) { o.grip.force = force; for (var t = 0; t < sec; t += DT) { o.g.update(DT); if (ctx) o.g.draw(ctx); } }

// 1. 每次都完全放開：捏過門檻撐住就破
var o = mk(); o.g.startLevel(1, false);
run(o, 0, 0.5); run(o, 8, 0.2); run(o, 0, 0.5); run(o, 20, 3);
ok(o.g.state !== 'play', '完全放開後再捏過門檻撐住：蛋破了');

// 2. 放手只鬆到 2.5（沒降到 1.5 以下），再捏過門檻：也要能破
o = mk(); o.g.startLevel(1, false);
run(o, 0, 0.5); run(o, 8, 0.2); run(o, 2.5, 0.5); run(o, 20, 3);
ok(o.g.state !== 'play', '放手沒降到 1.5 以下，再捏過門檻撐住：蛋也會破');

// 3. 捏到 9（沒過門檻）再慢慢鬆到 0：只扣一次機會
o = mk(); o.g.startLevel(1, false);
var a0 = o.g.attempts, f; run(o, 0, 0.3);
for (f = 0; f <= 9; f += 0.5) run(o, f, 0.03);
for (f = 9; f >= 0; f -= 0.3) run(o, f, 0.03);
run(o, 0, 0.5);
ok(a0 - o.g.attempts === 1, '捏到 9 再慢慢鬆開：只扣一次機會（扣了 ' + (a0 - o.g.attempts) + ' 次）');

// 4. 鬆手時讀數上下抖動，也只扣一次
o = mk(); o.g.startLevel(1, false); var a1 = o.g.attempts; run(o, 0, 0.3); run(o, 8, 0.3);
for (f = 8; f >= 2; f -= 0.4) { run(o, f + 0.8, 0.02); run(o, f - 0.4, 0.02); }
run(o, 2.2, 1);
ok(a1 - o.g.attempts === 1, '讀數抖動著鬆手：只扣一次機會（扣了 ' + (a1 - o.g.attempts) + ' 次）');

// 5. 從選單一路捏完 10 關＋特別關，每幀畫圖
o = mk(); var ctx = h.mockContext(), err = null, cleared = 0, seen = {};
try {
  o.g.toMenu(); run(o, 0, 1.2, ctx); run(o, 30, 0.2, ctx); run(o, 0, 0.3, ctx);   // 捏一下＝開始
  for (var step = 0; step < 400 && o.g.state !== 'ending2'; step++) {
    seen[o.g.state] = true;
    if (o.g.state === 'play') { run(o, 0, 0.3, ctx); run(o, o.g.thr + 5, 1.0, ctx); run(o, 0, 0.3, ctx); }
    else if (o.g.state === 'smash') { run(o, 0, 3.2, ctx); cleared++; }
    else { run(o, 0, 1.2, ctx); run(o, 30, 0.2, ctx); run(o, 0, 0.3, ctx); }   // intro／clear／ending：捏一下＝下一步
  }
  seen[o.g.state] = true; run(o, 0, 1, ctx);
} catch (e) { err = e; }
ok(!err, '一路玩到底每幀畫圖沒有錯誤' + (err ? '：' + err.stack : ''));
ok(o.g.state === 'ending2' && cleared === 11, '10 關＋特別關全部捏破（' + cleared + ' 顆蛋，最後畫面 ' + o.g.state + '）');
h.done();
