// 守門員大作戰：撲救判定、大招、選單握一下、關卡參數，以及完整跑一局並每幀畫圖
'use strict';
var h = require('./helpers'), ok = h.ok;
var K = require('../keeper/keeper.js');
var DT = 1 / 60;

function mk(seed, rings) {
  return new K.Game({ rings: rings || {}, storage: h.memStorage(), connectRing: function () { }, bluetoothSupported: false, random: h.seededRandom(seed) });
}
function run(g, sec, bot, ctx) { for (var i = 0; i < sec / DT; i++) { if (bot) bot(g); g.update(DT); if (ctx) g.draw(ctx); } }

// 1. 不出手：只有站著就碰得到的中間球會被擋下，其他都進球
var g = mk(1); g.newGame(); g.startLevel(); g.stateT = 1; g.advance();
var standOk = true, shots = 0, prev = '';
for (var n = 0; n < 15 / DT && g.state !== 'fail' && g.state !== 'clear'; n++) {
  g.update(DT);
  if (g.state === 'result' && prev !== 'result') {
    shots++; var p = K.ballRel(g.balls[0]);
    if ((g.result.saved === 1) !== K.bodyHit(K.keeperPose(null), p.x, p.y, K.BALL_R)) standOk = false;
  }
  prev = g.state;
}
ok(standOk && shots > 0, '完全不撲：只有碰到站著身體的球算擋下（' + shots + ' 球）');

// 2. 碰到身體才算：同一顆角落球，早撲擋下、太晚撲進球、撲錯邊進球
function oneShot(pressSide, pressBefore) {
  var g = mk(2); g.newGame(); g.go('runup');
  g.balls = [{ side: 1, fake: 1, curve: false, dist: 260, targetY: 0.3, spin: 1 }]; g.flight = 1.2; g.dive = null; g.result = null;
  g.go('flight');
  while (g.state === 'flight') { if (!g.dive && g.stateT >= g.flight - pressBefore) g.press(pressSide); g.update(1 / 120); }
  return g.result;
}
var rA = oneShot('R', 0.8), rB = oneShot('R', 0.05), rC = oneShot('L', 0.8);
ok(rA.saved === 1, '角落球提早撲：撲到');
ok(rB.conceded === 1 && rB.why === 'late', '角落球太晚撲：進球，顯示太晚了');
ok(rC.conceded === 1 && rC.why === 'wrong', '撲錯邊：進球，顯示撲錯邊');

// 3. 球門裡每個位置都規劃得出碰得到的撲救
var allReach = true;
for (var ty = 0; ty <= 1.0001; ty += 0.1) for (var d = 0; d <= 290; d += 20) {
  var q = K.ballRel({ side: 1, dist: d, targetY: ty }), dv = K.planDive(1, q.x, q.y); dv.t = 9;
  if (!K.bodyHit(K.keeperPose(dv), q.x, q.y, K.BALL_R)) allReach = false;
}
ok(allReach, '球門內每個落點，撲到位都碰得到球');

// 4. 看清方向再撲的機器人：大多能 10 關全破（同時每幀畫圖，抓畫面錯誤）
function bot(g) {
  if (g.state === 'intro' || g.state === 'clear') { if (g.stateT > 0.7) g.advance(); return; }
  if (g.state !== 'flight' || g.dive || g.superActive) return;
  if (g.balls.length > 1) { if (g.supers > 0) g.pressBoth(); else g.press('L'); return; }
  var b = g.balls[0], t = g.stateT / g.flight, p = K.ballRel(b);
  if (K.bodyHit(K.keeperPose(null), p.x, p.y, K.BALL_R)) return;
  if (t > (b.curve ? 0.45 : 0.2)) g.press(b.side < 0 ? 'L' : 'R');
}
var wins = 0, ctx = h.mockContext(), drawErr = null;
for (var s = 1; s <= 12; s++) {
  g = mk(s, { L: { connected: true }, R: { connected: true } }); g.newGame(); g.startLevel();
  try { run(g, 300, bot, s === 1 ? ctx : null); } catch (e) { drawErr = e; break; }
  if (g.state === 'win') wins++;
}
ok(!drawErr, '完整一局每幀畫圖沒有錯誤' + (drawErr ? '：' + drawErr.stack : ''));
ok(wins >= 9, '看清楚方向再撲的玩家，大多能 10 關全破（' + wins + '/12）');

// 5. 太早照變化球一開始的方向撲，會被騙
g = mk(5); g.newGame(); g.level = 8; g.startLevel(); g.stateT = 1; g.advance();
var fooled = 0, curves = 0; prev = '';
for (n = 0; n < 6000 && g.state !== 'fail'; n++) {
  if (g.state === 'runup' && !g.dive && g.balls.length === 1) g.press(g.balls[0].fake < 0 ? 'L' : 'R');
  g.update(DT);
  if (g.state === 'result' && prev !== 'result' && g.balls.length === 1 && g.balls[0].curve) { curves++; fooled += g.result.conceded ? 1 : 0; }
  prev = g.state;
}
ok(curves === 0 || fooled === curves, '照變化球一開始的方向撲，會被騙進球（' + fooled + '/' + curves + '）');

// 6. 大招：連續撲到 10 球存一次；兩手一起握使出重影，雙球全擋
g = mk(9); g.newGame(); g.startLevel(); g.stateT = 1; g.advance();
g.streak = 9;
g.go('flight'); g.balls = [{ side: 1, fake: 1, curve: false, dist: 200, targetY: 0.5, spin: 1 }]; g.flight = 1; g.dive = g.aimDive(1); g.dive.t = 9;
g.resolve();
ok(g.streak === 10 && g.supers === 1 && g.result.charged, '連續第 10 球撲到：存一次大招');
g.go('runup'); g.balls = [{ side: -1, fake: -1, curve: false, dist: 200, targetY: 0.5, spin: 1 }, { side: 1, fake: 1, curve: false, dist: 200, targetY: 0.5, spin: 1 }]; g.dive = null; g.superActive = false;
g.t = 100; g.press('L'); g.t += 0.1; g.press('R');
ok(g.superActive && g.supers === 0, '兩手 0.1 秒內先後握下：使出重影');
g.go('flight'); g.resolve();
ok(g.result.saved === 2 && g.result.conceded === 0, '重影擋下左右雙球');
g.supers = 1; g.go('runup'); g.dive = null; g.superActive = false; g.t = 200; g.press('L'); g.t += 0.6; g.press('R');
ok(!g.superActive && g.dive.side === -1 && g.supers === 1, '兩手間隔 0.6 秒：只撲第一下的方向，不用大招');
g.supers = 0; g.go('flight'); g.dive = g.aimDive(1); g.dive.t = 9; g.superActive = false; g.resolve();
ok(g.result.saved === 1 && g.result.conceded === 1 && g.streak === 0, '雙球沒有大招：擋一球、被踢進一球，連續紀錄歸零');

// 7. 選單：握一下只亮連線框，兩手一起握才開始
g = mk(3); g.go('menu'); g.update(1);
g.press('L'); ok(g.state === 'menu' && g.gripCount.L === 1 && g.menuFlash.L === 1, '選單握左手：不開始、次數 1、亮起');
g.update(0.5); g.press('L'); ok(g.state === 'menu' && g.gripCount.L === 2, '選單再握一次：次數 2');
g.update(1.2); ok(g.menuFlash.L === 0, '選單亮起約 1 秒後恢復');
g.update(0.5); g.press('R'); ok(g.state === 'menu' && g.gripCount.R === 1, '選單只握右手也不開始');
g.update(1); g.press('L'); g.update(0.1); g.press('R'); ok(g.state === 'intro', '選單兩手一起握才開始');

// 8. 選單在各種畫面高度都畫得出來
var menuErr = null;
[540, 600, 720, 760].forEach(function (hh) {
  K.setHeight(hh); var m = mk(4); m.go('menu');
  try { m.draw(h.mockContext()); } catch (e) { menuErr = e; }
});
K.setHeight(720);
ok(!menuErr, '選單在高度 540～760 都畫得出來' + (menuErr ? '：' + menuErr.stack : ''));

// 9. 關卡參數
var p1 = K.levelParams(1), p5 = K.levelParams(5), p6 = K.levelParams(6), p10 = K.levelParams(10);
ok(K.SHOTS_PER_LEVEL === 5, '每關 5 球');
ok(p1.flight > p10.flight && p5.curve === 0 && p6.curve > 0 && p1.double === 0, '球速遞增、第 6 關起有變化球、第 1 關沒有雙球');
h.done();
