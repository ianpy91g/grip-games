// 釣魚大師：拋竿放開判定、太早握會嚇跑魚、拉魚與掙扎、圖鑑存檔，以及自動玩完一整局並每幀畫圖（兩種畫面高度）
'use strict';
var h = require('./helpers'), ok = h.ok;
var F = require('../fishing/fishing.js');
var DT = 1 / 60;

function mk(seed, storage) {
  var grip = { force: 0, rising: false, connected: true, status: '' };
  var g = new F.Game({ grip: grip, storage: storage || h.memStorage(), audio: null, connectGrip: function () { }, bluetoothSupported: true,
                       makeCanvas: h.mockCanvas, random: h.seededRandom(seed || 1) });
  return { g: g, grip: grip };
}
function run(o, force, sec, ctx) { o.grip.force = force; for (var t = 0; t < sec; t += DT) { o.g.update(DT); if (ctx) o.g.draw(ctx); } }
// 把餌直接放進水裡，旁邊放一條指定的魚讓牠來咬
function setupBite(o, id) {
  var g = o.g;
  g.startRound(); g.phase = 'sink'; g.lure.x = 600; g.lure.y = 300; g.reelAcc = 0;
  var f = g.spawnFish(true), sp = F.FISH.filter(function (s) { return s.id === id; })[0];
  f.sp = sp; f.len = sp.len; f.x = 500; f.y = 300; f.dir = 1; g.fishes = [f];
  g.startBite(f);
  return f;
}

// 1. 拋竿：握緊後放手只鬆到 2.5（讀數沒歸零）也要拋出去；越用力拋越遠
var o = mk(1); o.g.startRound();
run(o, 0, 0.3); run(o, 25, 0.3); run(o, 2.5, 0.2);
ok(o.g.phase === 'cast' || o.g.phase === 'sink', '握緊後鬆到 2.5 也會拋竿（現在 ' + o.g.phase + '）');
run(o, 0, 1);
var farX = o.g.lure.x;
var o2 = mk(1); o2.g.startRound(); run(o2, 0, 0.3); run(o2, 6, 0.3); run(o2, 0, 1.2);
ok(o2.g.phase === 'sink' && farX > o2.g.lure.x + 100, '用力握拋得比較遠（' + Math.round(farX) + ' vs ' + Math.round(o2.g.lure.x) + '）');

// 2. 水中：放鬆往下沉、握緊收線往船靠近
var y0 = o2.g.lure.y; run(o2, 0, 1);
ok(o2.g.lure.y > y0 + 30, '放鬆時餌往下沉');
var x0 = o2.g.lure.x; o2.g.fishes = []; run(o2, 15, 0.8);
ok(o2.g.lure.x < x0 - 50, '握緊時收線往船靠近');
run(o2, 15, 8);
ok(o2.g.phase === 'aim', '一直收線會把餌收回船上，重新拋竿');

// 3. 魚在輕咬時就用力握：魚被嚇跑
o = mk(2); var f = setupBite(o, 'bream');
run(o, 0, 0.1); run(o, 20, 0.2);
ok(o.g.phase === 'sink' && f.mode === 'flee', '「！」出現前用力握：魚被嚇跑，餌還在水裡');

// 4. 等「！」出現再握：上鉤
o = mk(3); f = setupBite(o, 'bream');
for (var i = 0; i < 400 && !o.g.bite.ready; i++) run(o, 0, DT);
ok(o.g.bite && o.g.bite.ready, '輕咬幾下後出現「！」');
run(o, 20, 0.1);
ok(o.g.phase === 'fight' && f.mode === 'hooked', '「！」出現後用力握：魚上鉤');

// 5. 「！」出現後一直不握：魚把餌吃掉，要重新拋竿
o = mk(4); f = setupBite(o, 'clown');
run(o, 0, 5);
ok(o.g.phase === 'aim' || o.g.phase === 'lost', '「！」出現後沒握：魚跑了（' + o.g.phase + '）');

// 6. 拉魚：握力不夠會讓魚跑掉
o = mk(5); f = setupBite(o, 'tuna'); o.g.startFight(f);
run(o, f.thr * 0.5, 15);
ok(o.g.phase === 'lost' || o.g.phase === 'aim', '握力只有門檻一半：魚跑掉了');

// 7. 掙扎時門檻變 1.3 倍：只握到原門檻的 1.1 倍會被拖走
o = mk(6); f = setupBite(o, 'bass'); o.g.startFight(f);
o.g.fight.next = 0.01; run(o, f.thr * 1.1, 0.05);
var p0 = o.g.fight.p; run(o, f.thr * 1.1, 0.5);
ok(o.g.fight && o.g.fight.strug > 0 && o.g.fight.p < p0, '掙扎時握力 1.1 倍門檻不夠：被魚拖走');
o.g.fight.strug = 2; p0 = o.g.fight.p; run(o, f.thr * 1.4, 0.5);
ok(o.g.fight.p > p0, '掙扎時握到 1.4 倍門檻：還是拉得動');

// 8. 一直握在門檻以上：釣起來、記進圖鑑並存檔；重新讀檔圖鑑還在
var store = h.memStorage();
o = mk(7, store); f = setupBite(o, 'grouper'); o.g.startFight(f);
var t0 = o.g.timeLeft;
for (i = 0; i < 2000 && o.g.phase === 'fight'; i++) run(o, f.thr * STRUGGLE(), DT);
ok(o.g.phase === 'catch' && o.g.catches.length === 1, '握力一直夠：把石斑魚釣起來');
ok(o.g.timeLeft === t0, '拉魚時計時暫停');
var o3 = mk(8, store);
ok(o3.g.save.dex.grouper && o3.g.save.dex.grouper.n === 1, '圖鑑有存檔，重新開啟還在');
function STRUGGLE() { return F.STRUGGLE_K * 1.1; }

// 9. 難度：兒童門檻比較低，困難比較高
var sp = F.FISH[5];
ok(F.fishThr(sp, 0.5, 'kids') < F.fishThr(sp, 0.5, 'normal') && F.fishThr(sp, 0.5, 'normal') < F.fishThr(sp, 0.5, 'hard'), '門檻：兒童 < 一般 < 困難');

// 10. 自動玩完一整局（從選單開始），每幀畫圖；兩種畫面高度各一次
[540, 760].forEach(function (H) {
  F.setHeight(H);
  var o = mk(11 + H), ctx = h.mockContext(), err = null, seen = {}, steps = 0;
  try {
    o.g.toMenu(); run(o, 0, 1.0, ctx); run(o, 20, 0.2, ctx); run(o, 0, 0.3, ctx);   // 捏一下＝開始
    while (o.g.state === 'play' && steps++ < 20000) {
      var g = o.g, ph = g.phase; seen[ph] = true;
      if (ph === 'aim') { run(o, 0, 0.2, ctx); run(o, 25, 0.3, ctx); run(o, 0, 0.3, ctx); }
      else if (ph === 'sink') run(o, g.lure.y > H - 80 ? 6 : 0, 0.1, ctx);
      else if (ph === 'bite') run(o, g.bite.ready ? 20 : 0, DT, ctx);
      else if (ph === 'fight') run(o, g.fight.fish.thr * F.STRUGGLE_K + 3, DT, ctx);
      else if (ph === 'catch') { run(o, 0, 1.3, ctx); run(o, 20, 0.1, ctx); run(o, 0, 0.1, ctx); }
      else run(o, 0, 0.1, ctx);
    }
    seen.result = o.g.state === 'result';
    run(o, 0, 0.5, ctx);
    o.g.openDex(); run(o, 0, 0.5, ctx); o.g.tap(480, 0); o.g.confirm(); run(o, 0, 0.5, ctx);
  } catch (e) { err = e; }
  ok(!err, '高度 ' + H + '：一整局每幀畫圖沒有錯誤' + (err ? '：' + err.stack : ''));
  ok(seen.result, '高度 ' + H + '：時間到進入結算畫面');
  ok(o.g.catches.length >= 2, '高度 ' + H + '：一局釣到 ' + o.g.catches.length + ' 條魚（' + o.g.total + ' kg）');
  ok(seen.bite && seen.fight && seen.catch, '高度 ' + H + '：經過咬餌、拉魚、釣起各階段');
  ok(o.g.state === 'result' && o.g.save.best[o.g.modeName] > 0, '高度 ' + H + '：結算後記錄最佳總重');
});
h.done();
