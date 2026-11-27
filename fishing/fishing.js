/* 釣魚大師（網頁版）— 遊戲本體：畫圖、邏輯、音效、音樂。不碰 DOM，可在 Node 測試。 */
(function (root) {
  'use strict';
  var VERSION = '2026.11.27-2';   // 每次發佈都改，選單右下角會顯示
  var W = 960, H = 540, H_MIN = 540, H_MAX = 760;
  var WATER_Y = 150;              // 水面高度（上面是天空和船）
  var BOAT_X = 160, TIP_X = 300, TIP_Y = 50;   // 船的位置、竿尖
  var ROUND_TIME = 90;            // 一局幾秒
  var FISH_COUNT = 8;             // 水裡同時有幾條魚

  // 三種難度：握力倍率（拉魚門檻、上鉤握力、收線與拋竿的參考握力都乘這個）、「！」出現後幾秒內要握
  var MODES = {
    kids:   { label: '兒童模式', short: '兒童', ratio: 0.6,  window: 1.4, color: [96, 220, 150], fill: [40, 160, 95], ink: [255, 255, 255] },
    normal: { label: '一般模式', short: '一般', ratio: 1.0,  window: 1.0, color: [255, 190, 70], fill: [240, 165, 40], ink: [40, 26, 10] },
    hard:   { label: '困難模式', short: '困難', ratio: 1.25, window: 0.8, color: [255, 90, 90], fill: [215, 55, 60], ink: [255, 255, 255] }
  };
  var MODE_ORDER = ['kids', 'normal', 'hard'];
  var START_FORCE = 3.0;     // 超過這個值算「握緊」（收線、開始蓄力拋竿）
  var RELEASE_FORCE = 1.5;   // 低於這個值算完全放開
  var CONFIRM_FORCE = 5.0;   // 選單/結算畫面「捏一下＝下一步」所需的握力
  var CONFIRM_DELAY = 0.8;   // 畫面出現多久之後才接受捏一下
  var HOOK_BASE = 8;         // 「！」出現時要握到的力（一般模式）
  var REEL_REF = 15;         // 握到這個力收線最快（一般模式）
  var CAST_REF = 20;         // 握到這個力拋最遠（一般模式）
  var STRUGGLE_K = 1.3;      // 魚掙扎時門檻變成幾倍
  var WARN_TIME = 0.8;       // 掙扎前幾秒先警告
  var SINK_SPEED = 50;       // 放鬆時餌下沉速度（px/秒）
  var REEL_MIN = 45, REEL_MAX = 160;   // 收線速度（px/秒）
  var FONT = '"PingFang TC", "Heiti TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif';

  var TEXT = [240, 238, 245], DIM = [175, 190, 210], GOLD = [255, 205, 70], GREEN = [96, 220, 150];
  var RED = [255, 90, 90], ORANGE = [255, 150, 60], SKYBLUE = [120, 210, 255];

  // 魚：d＝出現深度（0 水面～1 海底）、len＝畫面長度、thr＝一般模式拉魚門檻、kg＝重量範圍、
  //     stam＝剛好在門檻時拉上來要幾秒、esc＝握力不夠時每秒逃走多少、w＝出現機率權重、speed＝游速
  var FISH = [
    { id: 'clown', name: '小丑魚', d: [0.02, 0.32], len: 46, thr: 6, kg: [0.1, 0.25], stam: 2.2, esc: 0.15, w: 10, speed: 55,
      look: { top: [255, 125, 30], belly: [255, 165, 80], fin: [255, 125, 30], aspect: 0.52, pattern: 'clown' },
      fact: '小丑魚住在海葵裡，身上的黏液讓牠不怕被海葵螫。' },
    { id: 'tang', name: '藍倒吊', d: [0.05, 0.4], len: 52, thr: 8, kg: [0.2, 0.5], stam: 2.5, esc: 0.15, w: 9, speed: 60,
      look: { top: [40, 95, 225], belly: [70, 140, 245], fin: [40, 95, 225], tail: [255, 210, 40], aspect: 0.62, pattern: 'tang' },
      fact: '藍倒吊尾巴旁有像刀片的硬棘，遇到危險拿來保護自己。' },
    { id: 'jack', name: '竹莢魚', d: [0.1, 0.5], len: 62, thr: 11, kg: [0.3, 0.8], stam: 3.0, esc: 0.17, w: 9, speed: 85,
      look: { top: [70, 125, 155], belly: [215, 228, 235], fin: [230, 200, 90], aspect: 0.32, pattern: 'jack' },
      fact: '竹莢魚身體側面有一排像鋸齒的硬鱗，叫做稜鱗。' },
    { id: 'bream', name: '嘉鱲', d: [0.25, 0.6], len: 72, thr: 15, kg: [0.8, 2], stam: 3.5, esc: 0.17, w: 8, speed: 55,
      look: { top: [235, 95, 115], belly: [255, 195, 195], fin: [240, 120, 135], aspect: 0.48, pattern: 'bream' },
      fact: '嘉鱲就是真鯛，粉紅身體配藍色亮點，是喜宴常見的魚。' },
    { id: 'puffer', name: '河豚', d: [0.3, 0.65], len: 54, thr: 18, kg: [0.5, 1.5], stam: 3.5, esc: 0.18, w: 6, speed: 40,
      look: { top: [205, 175, 95], belly: [250, 242, 215], fin: [215, 185, 110], aspect: 0.6, pattern: 'puffer' },
      fact: '河豚遇到危險會吸水脹成一顆球，很多河豚的內臟有劇毒。' },
    { id: 'bass', name: '鱸魚', d: [0.35, 0.7], len: 84, thr: 21, kg: [1.5, 4], stam: 4.0, esc: 0.19, w: 7, speed: 65,
      look: { top: [85, 105, 95], belly: [222, 228, 218], fin: [110, 125, 115], aspect: 0.34, pattern: 'bass' },
      fact: '鱸魚能在海水和河口之間來去，台灣也有養殖的金目鱸。' },
    { id: 'mahi', name: '鬼頭刀', d: [0.4, 0.75], len: 100, thr: 26, kg: [4, 12], stam: 4.5, esc: 0.2, w: 9, speed: 110,
      look: { top: [40, 170, 125], belly: [250, 215, 60], fin: [40, 140, 200], aspect: 0.36, pattern: 'mahi' },
      fact: '鬼頭刀又叫鱰魚，游得很快，是台灣東部漁港的名產。' },
    { id: 'grouper', name: '石斑魚', d: [0.6, 0.95], len: 104, thr: 31, kg: [6, 20], stam: 5.0, esc: 0.21, w: 8, speed: 35,
      look: { top: [150, 105, 72], belly: [205, 175, 135], fin: [130, 90, 60], aspect: 0.46, pattern: 'grouper' },
      fact: '石斑魚愛躲在礁石洞裡，很多一出生是母的，長大才變公的。' },
    { id: 'tuna', name: '黑鮪魚', d: [0.55, 0.9], len: 130, thr: 37, kg: [30, 120], stam: 5.5, esc: 0.22, w: 6, speed: 120,
      look: { top: [32, 48, 95], belly: [215, 222, 232], fin: [60, 70, 110], aspect: 0.36, pattern: 'tuna' },
      fact: '黑鮪魚時速可達 70 公里，屏東東港每年都有黑鮪魚季。' },
    { id: 'shark', name: '鯊魚', d: [0.78, 1.0], len: 160, thr: 44, kg: [60, 200], stam: 6.5, esc: 0.24, w: 3, speed: 80,
      look: { top: [112, 128, 145], belly: [228, 232, 238], fin: [100, 115, 132], aspect: 0.28, pattern: 'shark' },
      fact: '鯊魚的牙齒會一直換新，一輩子可以換掉上萬顆牙。' }
  ];
  var FISH_BY_ID = {};
  FISH.forEach(function (f, i) { f.index = i; FISH_BY_ID[f.id] = f; });

  // ---------- 小工具 ----------
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, lo, hi) { if (lo === undefined) { lo = 0; hi = 1; } return Math.max(lo, Math.min(hi, x)); }
  function rgb(c, a) { return a === undefined ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function shade(c, amt) { var t = amt < 0 ? 0 : 255, k = Math.abs(amt); return [lerp(c[0], t, k) | 0, lerp(c[1], t, k) | 0, lerp(c[2], t, k) | 0]; }
  function fmtKg(kg) { return kg < 10 ? kg.toFixed(2) : kg.toFixed(1); }
  function bedY() { return H - 48; }   // 海底（沙地頂端）
  function depthY(fr) { var top = WATER_Y + 34, bot = bedY() - 30; return top + fr * (bot - top); }
  function depthOf(y) { var top = WATER_Y + 34, bot = bedY() - 30; return (y - top) / (bot - top); }   // depthY 的反函數
  // 魚只追自己出沒深度附近的餌：小魚不會一路追到深海，餌沉下去才輪得到大魚
  function canReach(sp, y) { return depthOf(y) <= sp.d[1] + 0.1; }
  function ellipse(ctx, cx, cy, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function polygon(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function pickSpecies(rnd) {
    var sum = 0, i;
    for (i = 0; i < FISH.length; i++) sum += FISH[i].w;
    var r = rnd() * sum;
    for (i = 0; i < FISH.length; i++) { r -= FISH[i].w; if (r <= 0) return FISH[i]; }
    return FISH[0];
  }
  // 這條魚的實際重量與拉力門檻（q：0～1 的體型）
  function fishKg(sp, q) { var k = lerp(sp.kg[0], sp.kg[1], q); return Math.round(k * (k < 10 ? 100 : 10)) / (k < 10 ? 100 : 10); }
  function fishThr(sp, q, mode) { return Math.max(4, Math.round(sp.thr * (0.92 + 0.16 * q) * MODES[mode].ratio)); }
  function hookForce(mode) { return Math.max(5, Math.round(HOOK_BASE * MODES[mode].ratio)); }

  // ---------- 畫魚（卡通風） ----------
  var DOTS = [[0.12, -0.2], [-0.08, 0.05], [0.2, 0.12], [-0.24, -0.12], [0.02, -0.28], [-0.16, 0.22], [0.08, 0.26], [-0.3, 0.12], [0.26, -0.05], [-0.04, -0.12]];
  var SIL = 'rgba(12,28,52,0.82)';
  function fishBodyPath(ctx, L, Hh) { ctx.beginPath(); ctx.ellipse(0, 0, L * 0.42, Hh * 0.5, 0, 0, Math.PI * 2); }
  // dir：1 面向右、-1 面向左；o：{ sil 剪影, puff 河豚脹大 0～1, fast 拍尾快, angle 旋轉 }
  function drawFish(ctx, sp, x, y, len, dir, t, o) {
    o = o || {};
    var lk = sp.look, L = len, Hh = L * lk.aspect, sil = !!o.sil, pat = lk.pattern, i;
    var top = sil ? SIL : rgb(lk.top), belly = rgb(lk.belly), fin = sil ? SIL : rgb(lk.fin), tail = sil ? SIL : rgb(lk.tail || lk.fin);
    var wag = Math.sin(t * (o.fast ? 24 : 9)) * (o.fast ? 0.35 : 0.22), ty = wag * Hh * 0.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    if (o.angle) ctx.rotate(o.angle);
    if (pat === 'puffer' && o.puff > 0) {   // 脹成球的河豚
      var R = L * 0.36 * (1 + 0.35 * o.puff);
      for (i = 0; i < 16; i++) {
        var a = i / 16 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        polygon(ctx, [[c * R * 0.9 - s * 4, s * R * 0.9 + c * 4], [c * R * 1.25, s * R * 1.25], [c * R * 0.9 + s * 4, s * R * 0.9 - c * 4]], fin);
      }
      polygon(ctx, [[-R * 0.9, 0], [-R * 1.35, -R * 0.4 + ty], [-R * 1.35, R * 0.4 + ty]], tail);
      ellipse(ctx, 0, 0, R, R, top);
      if (!sil) {
        ctx.save(); ellipse(ctx, 0, 0, R, R); ctx.clip(); ellipse(ctx, 0, R * 0.55, R * 1.1, R * 0.7, belly);
        for (i = 0; i < DOTS.length; i++) if (DOTS[i][1] < 0) ellipse(ctx, DOTS[i][0] * R * 2, DOTS[i][1] * R * 2, 2.5, 2.5, rgb(shade(lk.top, -0.4)));
        ctx.restore();
        ellipse(ctx, R * 0.45, -R * 0.25, R * 0.22, R * 0.22, '#fff'); ellipse(ctx, R * 0.5, -R * 0.25, R * 0.12, R * 0.12, '#141414');
        ellipse(ctx, R * 0.92, R * 0.1, R * 0.1, R * 0.07, 'rgb(150,70,60)');
      }
      ctx.restore();
      return;
    }
    // 尾鰭
    var tx = -L * 0.38;
    if (pat === 'shark') polygon(ctx, [[tx + L * 0.04, 0], [tx - L * 0.2, -Hh * 0.95 + ty], [tx - L * 0.1, ty * 0.6], [tx - L * 0.16, Hh * 0.55 + ty]], tail);
    else if (pat === 'tuna' || pat === 'mahi' || pat === 'jack') polygon(ctx, [[tx + L * 0.05, 0], [tx - L * 0.2, -Hh * 0.8 + ty], [tx - L * 0.09, ty], [tx - L * 0.2, Hh * 0.8 + ty]], tail);
    else polygon(ctx, [[tx + L * 0.05, 0], [tx - L * 0.17, -Hh * 0.58 + ty], [tx - L * 0.13, ty], [tx - L * 0.17, Hh * 0.58 + ty]], tail);
    // 背鰭
    if (pat === 'shark') polygon(ctx, [[-L * 0.1, -Hh * 0.4], [L * 0.0, -Hh * 1.15], [L * 0.12, -Hh * 0.4]], fin);
    else if (pat === 'mahi') polygon(ctx, [[L * 0.22, -Hh * 0.42], [L * 0.12, -Hh * 0.72], [-L * 0.25, -Hh * 0.62], [-L * 0.36, -Hh * 0.2]], fin);
    else polygon(ctx, [[-L * 0.17, -Hh * 0.38], [-L * 0.04, -Hh * 0.74], [L * 0.12, -Hh * 0.4]], fin);
    if (pat === 'tuna' && !sil) for (i = 0; i < 4; i++) {   // 黃色小鰭
      var fx = -L * 0.1 - i * L * 0.06;
      polygon(ctx, [[fx, -Hh * 0.42 + i * 2], [fx - 5, -Hh * 0.55 + i * 2], [fx - 7, -Hh * 0.4 + i * 2]], 'rgb(250,210,60)');
      polygon(ctx, [[fx, Hh * 0.42 - i * 2], [fx - 5, Hh * 0.55 - i * 2], [fx - 7, Hh * 0.4 - i * 2]], 'rgb(250,210,60)');
    }
    // 身體
    if (pat === 'shark') polygon(ctx, [[L * 0.3, -Hh * 0.38], [L * 0.56, Hh * 0.02], [L * 0.3, Hh * 0.42]], top);
    fishBodyPath(ctx, L, Hh); ctx.fillStyle = top; ctx.fill();
    if (!sil) {
      ctx.save(); fishBodyPath(ctx, L, Hh); ctx.clip();
      ellipse(ctx, 0, Hh * 0.34, L * 0.5, Hh * 0.36, belly);
      var dark = rgb(shade(lk.top, -0.45));
      if (pat === 'clown') {
        [0.2, -0.04, -0.27].forEach(function (u) {
          ctx.fillStyle = 'rgb(25,20,20)'; ctx.fillRect(u * L - L * 0.06, -Hh, L * 0.12, Hh * 2);
          ctx.fillStyle = 'rgb(255,255,255)'; ctx.fillRect(u * L - L * 0.04, -Hh, L * 0.08, Hh * 2);
        });
      } else if (pat === 'tang') {
        ellipse(ctx, -L * 0.04, -Hh * 0.08, L * 0.24, Hh * 0.17, 'rgb(15,25,70)');
        ellipse(ctx, -L * 0.1, -Hh * 0.06, L * 0.1, Hh * 0.07, top);
      } else if (pat === 'jack' || pat === 'bass') {
        ctx.fillStyle = pat === 'jack' ? 'rgba(250,230,120,0.8)' : dark;
        ctx.fillRect(-L * 0.42, -Hh * 0.04, L * 0.72, pat === 'jack' ? Hh * 0.1 : 2);
        if (pat === 'bass') for (i = 0; i < DOTS.length; i++) if (DOTS[i][1] < 0) ellipse(ctx, DOTS[i][0] * L, DOTS[i][1] * Hh * 1.3, 1.6, 1.6, dark);
      } else if (pat === 'bream' || pat === 'mahi') {
        for (i = 0; i < DOTS.length; i++) ellipse(ctx, DOTS[i][0] * L, DOTS[i][1] * Hh * 1.2, Math.max(1.6, L * 0.022), Math.max(1.6, L * 0.022), pat === 'bream' ? 'rgb(90,200,255)' : 'rgb(30,90,170)');
      } else if (pat === 'grouper' || pat === 'puffer') {
        for (i = 0; i < DOTS.length; i++) ellipse(ctx, DOTS[i][0] * L, DOTS[i][1] * Hh * 1.3, L * 0.035, L * 0.03, dark);
      } else if (pat === 'tuna') {
        ctx.fillStyle = 'rgba(190,205,225,0.7)'; ctx.fillRect(-L * 0.42, Hh * 0.02, L * 0.75, 2);
      }
      ctx.restore();
    }
    fishBodyPath(ctx, L, Hh); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 胸鰭
    ctx.save(); ctx.translate(L * 0.06, Hh * 0.14); ctx.rotate(0.5 + wag * 0.8);
    ellipse(ctx, -L * 0.05, 0, L * 0.08, Hh * 0.1, fin); ctx.restore();
    if (sil) { ctx.restore(); return; }
    if (pat === 'shark') {   // 鰓
      ctx.strokeStyle = 'rgba(40,50,60,0.5)'; ctx.lineWidth = 1.5;
      for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L * (0.18 - i * 0.035), -Hh * 0.15); ctx.lineTo(L * (0.16 - i * 0.035), Hh * 0.15); ctx.stroke(); }
    }
    // 眼睛與嘴
    var er = Math.max(2.6, Hh * 0.13), ex = pat === 'shark' ? L * 0.33 : L * 0.25, ey = -Hh * 0.1;
    ellipse(ctx, ex, ey, er, er, '#fff');
    ellipse(ctx, ex + er * 0.25, ey, er * 0.58, er * 0.58, '#141414');
    ellipse(ctx, ex + er * 0.4, ey - er * 0.3, er * 0.2, er * 0.2, '#fff');
    ctx.strokeStyle = 'rgba(60,20,20,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(L * (pat === 'shark' ? 0.44 : 0.38), Hh * 0.12); ctx.lineTo(L * (pat === 'shark' ? 0.36 : 0.32), Hh * 0.16); ctx.stroke();
    ctx.restore();
  }

  // ---------- 音效（WebAudio 合成；沒有音效裝置就靜音） ----------
  function Sfx(audio) {
    this.ac = audio || null;
    this.buf = {};
    if (!this.ac) return;
    var rate = this.ac.sampleRate, self = this;
    function noise(dur, decay, vol) { var o = []; for (var i = 0; i < rate * dur; i++) o.push((Math.random() * 2 - 1) * vol * Math.exp(-decay * i / rate)); return o; }
    function tone(dur, f, decay, vol) { var o = []; for (var i = 0; i < rate * dur; i++) o.push(Math.sin(2 * Math.PI * f * i / rate) * vol * Math.exp(-decay * i / rate)); return o; }
    function chirp(dur, f0, f1, vol) { var o = [], ph = 0, n = rate * dur; for (var i = 0; i < n; i++) { ph += 2 * Math.PI * lerp(f0, f1, i / n) / rate; o.push(Math.sin(ph) * vol * (1 - i / n)); } return o; }
    function melody(notes, dur, vol) { var o = []; notes.forEach(function (f) { o = o.concat(tone(dur, f, 6, vol)); }); return o; }
    function make(samples) {
      var b = self.ac.createBuffer(1, samples.length, rate), d = b.getChannelData(0);
      for (var i = 0; i < samples.length; i++) d[i] = clamp(samples[i], -1, 1);
      return b;
    }
    var sp = noise(0.35, 9, 0.5), plop = chirp(0.12, 500, 150, 0.4);
    this.buf.splash = make(sp.map(function (v, i) { return v + (plop[i] || 0); }));
    this.buf.tick = make(noise(0.02, 200, 0.25));
    this.buf.nib = make(chirp(0.07, 900, 600, 0.3));
    this.buf.strike = make(chirp(0.18, 400, 1300, 0.4));
    this.buf.warn = make(tone(0.08, 880, 10, 0.3).concat(tone(0.04, 1, 1, 0)).concat(tone(0.08, 880, 10, 0.3)));
    this.buf.sec = make(tone(0.06, 1200, 30, 0.25));
    this.buf.win = make(melody([523, 659, 784, 1047, 1319], 0.1, 0.3));
    this.buf.lose = make(melody([392, 330, 262], 0.16, 0.3));
    this.buf.snap = make(noise(0.12, 40, 0.6).concat(melody([300, 220], 0.12, 0.25)));
    this.buf.miss = make(melody([330, 294], 0.09, 0.2));
  }
  Sfx.prototype.play = function (name) {
    if (!this.ac || !this.buf[name]) return;
    try {
      var src = this.ac.createBufferSource();
      src.buffer = this.buf[name]; src.connect(this.ac.destination); src.start(0);
    } catch (e) { /* 忽略 */ }
  };

  // ---------- 背景音樂（程式合成的 8 小節循環，C → Am → Dm → G，輕鬆的海邊風） ----------
  var MELODY = [
    67, null, 72, null, 76, null, 74, 72,   69, null, 72, null, 76, null, null, null,
    74, null, 77, null, 81, null, 79, 77,   79, null, 74, null, 71, null, null, null,
    72, 74, 76, null, 79, null, 76, null,   81, null, 79, 76, 72, null, 69, null,
    74, null, 77, 76, 74, null, 71, null,   72, null, null, null, 67, null, null, null
  ];
  var BASS = [48, 45, 50, 43, 48, 45, 50, 43];
  var BPM = 112;
  function Music(ac) {
    this.ac = ac; this.enabled = false; this.step = 0; this.next = 0;
    this.master = ac.createGain(); this.master.gain.value = 0; this.master.connect(ac.destination);
  }
  Music.VOLUME = 0.12;
  Music.prototype.setEnabled = function (on) {
    this.enabled = on;
    var t = this.ac.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? Music.VOLUME : 0, t, 0.2);
    clearInterval(this.timer); this.timer = null;
    if (on) {   // 用自己的計時器排程，畫面卡一下音樂也不會斷
      var self = this;
      this.next = t + 0.1;
      this.timer = setInterval(function () { self.tick(); }, 50);
    }
  };
  Music.prototype.note = function (type, midi, t, dur, vol) {
    var o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type;
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  };
  Music.prototype.tick = function () {   // 每 50ms：預先排好接下來 0.5 秒內的音符
    if (!this.enabled) return;
    var now = this.ac.currentTime, eighth = 60 / BPM / 2;
    if (this.next < now - 0.3) this.next = now + 0.05;
    while (this.next < now + 0.5) {
      var t = this.next, st = this.step, bar = Math.floor(st / 8) % 8, inBar = st % 8, m = MELODY[st];
      if (m !== null) {
        var len = 1;
        while (len < 4 && MELODY[(st + len) % MELODY.length] === null) len++;
        this.note('triangle', m, t, eighth * len * 0.95, 0.35);
        this.note('square', m + 12, t, eighth * 0.5, 0.04);
      }
      if (inBar % 2 === 0) { var r = BASS[bar]; this.note('triangle', inBar % 4 === 0 ? r : r + 7, t, eighth * 1.6, 0.45); }
      this.step = (st + 1) % MELODY.length;
      this.next += eighth;
    }
  };

  // ---------- 遊戲 ----------
  function Game(env) {
    this.env = env;   // { grip:{force,rising,connected,status}, storage, audio, connectGrip(), bluetoothSupported, makeCanvas, random }
    this.rnd = env.random || Math.random;
    this.sfx = new Sfx(env.audio);
    this.save = this.loadSave();
    this.modeName = this.save.mode;
    this.time = 0; this.sim = 0; this.force = 0;
    this.held = false; this.keyHeld = false;
    this.texts = []; this.particles = []; this.bubbles = [];
    this.flash = 0; this.toast = null;
    this.lastState = 'menu'; this.stateT = 0; this.btnArmed = false;
    this.buttons = [];
    this.lure = { x: TIP_X, y: TIP_Y + 40 };
    this.weeds = this.makeWeeds();
    this.fishes = [];
    for (var i = 0; i < FISH_COUNT; i++) this.fishes.push(this.spawnFish(true));
    this.chaser = null;
    this.catches = []; this.total = 0;
    this.state = 'menu'; this.phase = 'aim';
    this.dexFrom = 'menu';
  }
  var G = Game.prototype;

  G.setAudio = function (ac) {   // iOS 要在第一次觸碰後才能啟動音效
    this.sfx = new Sfx(ac);
    try { this.music = new Music(ac); this.music.setEnabled(this.save.music); } catch (e) { this.music = null; }
  };

  // ---- 存檔：難度、音樂、圖鑑、各難度最佳總重 ----
  G.loadSave = function () {
    var s = { mode: 'normal', music: true, dex: {}, best: { kids: 0, normal: 0, hard: 0 } };
    try {
      var d = JSON.parse(this.env.storage.get() || 'null');
      if (d) {
        if (MODES[d.mode]) s.mode = d.mode;
        s.music = d.music !== false;
        if (d.dex) for (var id in d.dex) if (FISH_BY_ID[id] && d.dex[id]) s.dex[id] = { n: +d.dex[id].n || 1, best: +d.dex[id].best || 0 };
        if (d.best) MODE_ORDER.forEach(function (m) { s.best[m] = +d.best[m] || 0; });
      }
    } catch (e) { /* 沒有存檔或格式錯誤 */ }
    return s;
  };
  G.saveData = function () {
    this.save.mode = this.modeName;
    try { this.env.storage.set(JSON.stringify(this.save)); } catch (e) { }
  };
  G.cfg = function () { return MODES[this.modeName]; };
  G.ratio = function () { return MODES[this.modeName].ratio; };
  G.dexCount = function () { var n = 0; for (var id in this.save.dex) n++; return n; };

  // ---- 輸入：握力球，或按住畫面/空白鍵模擬 ----
  G.simCap = function () {
    if (this.state === 'play' && this.phase === 'fight') return this.fight.fish.thr * STRUGGLE_K * 1.15;
    if (this.state === 'play' && this.phase === 'bite') return hookForce(this.modeName) * 1.6;
    return CAST_REF * this.ratio() * 1.1;
  };
  G.readInput = function (dt) {
    var cap = this.simCap();
    var held = this.held && this.state === 'play' || this.keyHeld;
    if (held) this.sim = Math.min(cap, this.sim + cap * 1.8 * dt);
    else this.sim = Math.max(0, this.sim - cap * 4 * dt);
    if (this.sim > cap) this.sim = cap;
    var g = this.env.grip;
    return g.force >= this.sim ? g.force : this.sim;
  };

  // ---- 場景 ----
  G.makeWeeds = function () {   // 海底的水草叢：餌沉到這裡會被勾住
    var out = [], xs = [430, 610, 800];
    for (var i = 0; i < xs.length; i++) out.push({ x: xs[i] + (this.rnd() - 0.5) * 80, w: 48 + this.rnd() * 26, h: 55 + this.rnd() * 40 });
    return out;
  };
  G.spawnFish = function (anywhere) {
    var sp = pickSpecies(this.rnd), q = this.rnd(), dir = this.rnd() < 0.5 ? 1 : -1;
    var len = sp.len * (0.88 + 0.24 * q), fr = lerp(sp.d[0], sp.d[1], this.rnd());
    var x = anywhere ? 330 + this.rnd() * (W - 360) : (dir > 0 ? -len : W + len);
    return { sp: sp, q: q, len: len, dir: dir, x: x, y: depthY(fr), fr: fr, t: this.rnd() * 10, ph: this.rnd() * 6,
             mode: 'swim', cool: 0, chaseT: 0, speed: sp.speed * (0.8 + 0.4 * this.rnd()), puff: 0 };
  };
  G.mouth = function (f) { return { x: f.x + f.dir * f.len * 0.45, y: f.y }; };

  // ---- 一局 ----
  G.startRound = function () {
    this.calmFish();
    this.state = 'play';
    this.timeLeft = ROUND_TIME;
    this.catches = []; this.total = 0; this.newSpecies = 0;
    this.weeds = this.makeWeeds();
    this.texts = []; this.particles = [];
    this.lastSec = ROUND_TIME;
    this.toAim();
    this.say('捏一下握力球，拋竿！', GOLD, 2);
  };
  G.toAim = function () {
    this.releaseChaser();
    this.phase = 'aim'; this.reeling = false;
    this.castArmed = false; this.charging = false; this.castPeak = 0;
    this.bite = null; this.fight = null; this.caught = null;
    this.lure = { x: TIP_X, y: TIP_Y + 40 };
  };
  G.releaseChaser = function () {
    if (this.chaser && this.chaser.mode === 'chase') this.chaser.mode = 'swim';
    this.chaser = null;
  };
  G.say = function (s, color, dur, size) { this.toast = { s: s, color: color || TEXT, t: dur || 1.6, max: dur || 1.6, size: size || 34 }; };
  G.endRound = function () {
    var m = this.modeName;
    this.newBest = this.total > 0 && this.total > this.save.best[m];
    if (this.newBest) this.save.best[m] = Math.round(this.total * 100) / 100;
    this.saveData();
    this.state = 'result';
    this.sfx.play(this.catches.length ? 'win' : 'miss');
  };

  // ---- 更新 ----
  G.update = function (dt) {
    var force = this.readInput(dt), i;
    this.force = force;
    this.time += dt;
    if (this.state !== this.lastState) { this.lastState = this.state; this.stateT = 0; }
    this.stateT += dt;
    this.gripConfirm(this.env.grip.force);
    this.flash = Math.max(0, this.flash - dt);
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    for (i = 0; i < this.texts.length; i++) { this.texts[i].life -= dt; this.texts[i].y -= 36 * dt; }
    this.texts = this.texts.filter(function (t) { return t.life > 0; });
    for (i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt;
    }
    this.particles = this.particles.filter(function (p) { return p.life > 0; });
    this.updateBubbles(dt);
    this.updateFish(dt);
    if (this.state === 'play') this.updatePlay(dt, force);
  };
  G.updateBubbles = function (dt) {
    if (this.bubbles.length < 14 && this.rnd() < dt * 3) this.bubbles.push({ x: 20 + this.rnd() * (W - 40), y: bedY() - 4, r: 2 + this.rnd() * 3.5, v: 30 + this.rnd() * 30, ph: this.rnd() * 6 });
    for (var i = 0; i < this.bubbles.length; i++) { var b = this.bubbles[i]; b.y -= b.v * dt; b.x += Math.sin(this.time * 2 + b.ph) * 12 * dt; }
    this.bubbles = this.bubbles.filter(function (b) { return b.y > WATER_Y + 6; });
  };
  G.updateFish = function (dt) {
    var lureFree = this.state === 'play' && this.phase === 'sink', L = this.lure, i;
    for (i = 0; i < this.fishes.length; i++) {
      var f = this.fishes[i];
      f.t += dt; f.cool -= dt;
      if (f.mode === 'swim') {
        f.x += f.dir * f.speed * dt;
        f.y += (depthY(f.fr) + Math.sin(f.t * 1.3 + f.ph) * 7 - f.y) * Math.min(1, dt * 2);
        if (lureFree && !this.chaser && f.cool <= 0 && L.y > WATER_Y + 14) {
          // 越大的魚（深海）看得越遠、越容易被吸引，游得快的魚經過時才來得及注意到餌
          var m = this.mouth(f), dx = L.x - m.x, dy = L.y - m.y, tier = f.sp.index / (FISH.length - 1);
          if (canReach(f.sp, L.y) && Math.abs(dy) < 90 + 60 * tier && Math.abs(dx) < 150 + 130 * tier && this.rnd() < dt * (1.6 + 2.4 * tier)) {
            f.mode = 'chase'; f.chaseT = 0; this.chaser = f;
          }
        }
      } else if (f.mode === 'chase') {
        f.chaseT += dt;
        if (!lureFree || f.chaseT > 7 || !canReach(f.sp, L.y)) { f.mode = 'swim'; f.cool = 3; if (this.chaser === f) this.chaser = null; continue; }
        if (Math.abs(L.x - f.x) > 6) f.dir = L.x > f.x ? 1 : -1;
        var tx = L.x - f.dir * f.len * 0.45, ty = L.y, ddx = tx - f.x, ddy = ty - f.y, d = Math.sqrt(ddx * ddx + ddy * ddy);
        var v = Math.max(50, f.speed * 0.75) * dt;
        if (d <= v + 4) { f.x = tx; f.y = ty; this.startBite(f); }
        else { f.x += ddx / d * v; f.y += ddy / d * v; }
        f.y = clamp(f.y, WATER_Y + 16, bedY() - 12);
      } else if (f.mode === 'flee') {
        f.x += f.dir * f.speed * 2.6 * dt;
        f.y += (depthY(f.fr) - f.y) * Math.min(1, dt);
      }
      if ((f.mode === 'swim' || f.mode === 'flee') && ((f.dir < 0 && f.x < -f.len - 40) || (f.dir > 0 && f.x > W + f.len + 40))) this.fishes[i] = this.spawnFish(false);
    }
    // 畫面比較高（iPad）水比較深，魚也多放幾條，密度跟手機差不多
    var want = Math.round(FISH_COUNT * (bedY() - WATER_Y) / 342);
    if (this.fishes.length < want) this.fishes.push(this.spawnFish(false));
    else if (this.fishes.length > want) {
      for (i = this.fishes.length - 1; i >= 0; i--) if (this.fishes[i].mode === 'swim' && (this.fishes[i].x < -40 || this.fishes[i].x > W + 40)) { this.fishes.splice(i, 1); break; }
    }
  };
  G.scare = function (f) {   // 魚嚇跑：往遠離船的方向游走，一陣子不會再咬
    f.mode = 'flee'; f.dir = f.x > TIP_X + 100 ? 1 : (this.rnd() < 0.5 ? -1 : 1); f.cool = 6; f.puff = 0;
    if (this.chaser === f) this.chaser = null;
  };

  G.updatePlay = function (dt, force) {
    var ph = this.phase, timed = ph === 'aim' || ph === 'cast' || ph === 'sink' || ph === 'bite';
    if (timed) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      var sec = Math.ceil(this.timeLeft);
      if (sec !== this.lastSec) { this.lastSec = sec; if (sec <= 10 && sec > 0) this.sfx.play('sec'); }
      if (this.timeLeft <= 0) { this.timeUp(); return; }
    }
    if (ph === 'aim') this.updateAim(dt, force);
    else if (ph === 'cast') this.updateCast(dt);
    else if (ph === 'sink') this.updateSink(dt, force);
    else if (ph === 'bite') this.updateBite(dt, force);
    else if (ph === 'fight') this.updateFight(dt, force);
    else if (ph === 'catch') {
      this.catchT += dt;
      if (this.catchT > 6) this.afterCatch();
    } else if (ph === 'lost') {
      this.lostT -= dt;
      if (this.lostT <= 0) { if (this.timeLeft <= 0) this.timeUp(); else this.toAim(); }
    } else if (ph === 'timeup') {
      this.lostT -= dt;
      if (this.lostT <= 0) this.endRound();
    }
  };
  G.timeUp = function () {
    if (this.bite) this.scare(this.bite.fish);
    this.releaseChaser();
    this.phase = 'timeup'; this.lostT = 1.6; this.bite = null;
    this.say('時間到！', GOLD, 1.6, 56);
    this.sfx.play('warn');
  };
  G.lose = function (msg, color, dur) {
    this.releaseChaser();
    this.phase = 'lost'; this.lostT = dur || 1.6; this.bite = null; this.fight = null;
    this.say(msg, color || RED, this.lostT);
  };

  // 拋竿：握緊蓄力，放開就拋出去；放開前的最大握力越大拋越遠
  G.updateAim = function (dt, force) {
    this.lure.x = TIP_X + Math.sin(this.time * 2) * 3; this.lure.y = TIP_Y + 40;
    if (force < START_FORCE) this.castArmed = true;
    if (!this.charging && this.castArmed && force >= START_FORCE) { this.charging = true; this.castPeak = force; }
    if (this.charging) {
      this.castPeak = Math.max(this.castPeak, force);
      // 放手後讀數不一定歸零（可能停在 2～3），所以鬆到最大值的一半以下也算放開
      if (force <= RELEASE_FORCE || force < Math.max(2.8, this.castPeak * 0.55)) this.cast(this.castPeak);
    }
  };
  G.castPower = function (peak) { return clamp((peak - START_FORCE) / (CAST_REF * this.ratio() - START_FORCE), 0.12, 1); };
  G.cast = function (peak) {
    this.charging = false;
    this.castFrom = { x: this.lure.x, y: this.lure.y };
    this.castTo = lerp(380, 860, this.castPower(peak));
    this.castT = 0;
    this.phase = 'cast';
  };
  G.updateCast = function (dt) {
    this.castT += dt;
    var k = clamp(this.castT / 0.7);
    this.lure.x = lerp(this.castFrom.x, this.castTo, k);
    this.lure.y = lerp(this.castFrom.y, WATER_Y + 4, k) - Math.sin(k * Math.PI) * 90;
    if (k >= 1) {
      this.phase = 'sink'; this.reelAcc = 0;
      this.splash(this.lure.x, WATER_Y, 14);
      this.sfx.play('splash');
    }
  };
  // 水中：放鬆＝往下沉，握緊＝收線（往船的方向拉），越用力收越快
  G.updateSink = function (dt, force) {
    var L = this.lure, bed = bedY() - 8;
    this.reeling = force >= START_FORCE;
    if (this.reeling) {
      var sp = lerp(REEL_MIN, REEL_MAX, clamp((force - START_FORCE) / (REEL_REF * this.ratio() - START_FORCE)));
      var tx = TIP_X, ty = WATER_Y + 6, dx = tx - L.x, dy = ty - L.y, d = Math.sqrt(dx * dx + dy * dy) || 1, mv = Math.min(d, sp * dt);
      L.x += dx / d * mv; L.y += dy / d * mv;
      this.reelAcc += mv;
      if (this.reelAcc > 22) { this.reelAcc = 0; this.sfx.play('tick'); }
      this.onBed = false;
    } else if (L.y < bed) {
      L.y = Math.min(bed, L.y + SINK_SPEED * dt);
      L.x += Math.sin(this.time * 1.7) * 4 * dt;
    } else if (!this.onBed) {
      this.onBed = true;
      for (var i = 0; i < this.weeds.length; i++) {
        var w = this.weeds[i];
        if (Math.abs(L.x - w.x) < w.w / 2) { this.lose('勾到水草了！要重新拋竿', ORANGE, 1.8); this.sfx.play('miss'); return; }
      }
    }
    L.y = Math.max(WATER_Y + 6, L.y);
    if (L.x <= TIP_X + 24 && L.y <= WATER_Y + 16) { this.toAim(); this.say('收線回來了，再拋一次', TEXT, 1.4, 26); }
  };

  // 魚咬餌：先輕咬幾下（太早握會嚇跑），「！」出現後在時限內用力握就上鉤
  G.startBite = function (f) {
    f.mode = 'bite';
    var hf = hookForce(this.modeName);
    this.chaser = null;
    this.phase = 'bite';
    this.bite = { fish: f, nibLeft: 1 + Math.floor(this.rnd() * 3), nibT: 0.5 + this.rnd() * 0.4, ready: false, readyT: 0, dip: 0,
                  armed: this.force < Math.max(3.5, hf * 0.5) };
  };
  G.updateBite = function (dt, force) {
    var b = this.bite, f = b.fish, hf = hookForce(this.modeName);
    if (force < Math.max(3.5, hf * 0.5)) b.armed = true;
    b.dip = Math.max(0, b.dip - dt * 4);
    f.x = this.lure.x - f.dir * f.len * 0.45 - b.dip * f.dir * 6; f.y = this.lure.y;
    if (!b.ready) {
      if (b.armed && force >= hf) { this.scare(f); this.bite = null; this.phase = 'sink'; this.say('太早了！魚被嚇跑了', ORANGE, 1.5, 28); this.sfx.play('miss'); return; }
      b.nibT -= dt;
      if (b.nibT <= 0) {
        if (b.nibLeft > 0) { b.nibLeft--; b.dip = 1; b.nibT = 0.5 + this.rnd() * 0.35; this.sfx.play('nib'); }
        else { b.ready = true; b.readyT = 0; b.dip = 1; this.sfx.play('nib'); }
      }
    } else {
      b.readyT += dt;
      if (b.armed && force >= hf) { this.startFight(f); return; }
      if (b.readyT > this.cfg().window) { this.scare(f); this.lose('魚把餌吃掉跑了…', ORANGE, 1.6); this.sfx.play('miss'); }
    }
  };

  // 拉魚：握力超過門檻就把魚拉近，不夠就被魚拖走；魚會不時掙扎，門檻變成 1.3 倍
  G.startFight = function (f) {
    f.mode = 'hooked';
    f.kg = fishKg(f.sp, f.q);
    f.thr = fishThr(f.sp, f.q, this.modeName);
    f.dir = -1;   // 被拉著時頭朝船、線綁在嘴上
    if (f.sp.pattern === 'puffer') f.puff = 1;
    this.bite = null;
    this.phase = 'fight';
    this.fight = { fish: f, p: 0.35, next: 1.6 + this.rnd() * 1.2, strug: 0, warned: false, hx: this.lure.x, hy: this.lure.y, peak: 0, reelAcc: 0 };
    this.flash = 0.15;
    this.say(f.sp.name + '上鉤了！', GOLD, 1.4, 40);
    this.sfx.play('strike');
  };
  G.thrEff = function () { var F = this.fight; return F.fish.thr * (F.strug > 0 ? STRUGGLE_K : 1); };
  G.updateFight = function (dt, force) {
    var F = this.fight, f = F.fish, tier = f.sp.index / (FISH.length - 1);
    F.peak = Math.max(F.peak, force);
    if (F.strug > 0) {
      F.strug -= dt;
      if (F.strug <= 0) { F.strug = 0; F.next = (2.4 + this.rnd() * 1.8) * (1 - 0.3 * tier); F.warned = false; }
    } else {
      F.next -= dt;
      if (F.next <= WARN_TIME && !F.warned) { F.warned = true; this.sfx.play('warn'); }
      if (F.next <= 0) { F.strug = 1.0 + this.rnd() * 0.5 + 0.4 * tier; this.say('魚在掙扎！用力！', RED, 1.0, 30); }
    }
    var thr = this.thrEff();
    if (force >= thr) {
      var gain = 0.65 / f.sp.stam * (1 + 0.6 * clamp((force - thr) / (thr * 0.5)));
      F.p += gain * dt;
      F.reelAcc += gain * dt;
      if (F.reelAcc > 0.04) { F.reelAcc = 0; this.sfx.play('tick'); }
    } else {
      F.p -= f.sp.esc * (F.strug > 0 ? 1.4 : 1) * (1 - 0.6 * clamp(force / thr)) * dt;
    }
    var k = clamp(F.p), shake = F.strug > 0 ? 2.5 : 1;
    f.x = lerp(F.hx + f.len * 0.45, TIP_X + 40 + f.len * 0.45, k) + Math.sin(this.time * 9) * 6 * shake;
    f.y = lerp(F.hy, WATER_Y + 28, k) + Math.cos(this.time * 7) * 4 * shake;
    this.lure.x = f.x - f.len * 0.45; this.lure.y = f.y;
    if (F.strug > 0 && f.y < WATER_Y + 60 && this.rnd() < dt * 12) this.splash(f.x + (this.rnd() - 0.5) * f.len, WATER_Y, 2);
    if (F.p >= 1) this.landFish(f);
    else if (F.p <= 0) {
      this.scare(f);
      this.lose('線斷了！' + f.sp.name + '跑掉了', RED, 1.8);
      this.sfx.play('snap');
    }
  };
  G.landFish = function (f) {
    var sp = f.sp, d = this.save.dex[sp.id];
    var isNew = !d, isBest = !!d && f.kg > d.best;
    if (isNew) { this.save.dex[sp.id] = { n: 1, best: f.kg }; this.newSpecies++; }
    else { d.n++; if (isBest) d.best = f.kg; }
    this.catches.push({ id: sp.id, kg: f.kg });
    this.total = Math.round((this.total + f.kg) * 100) / 100;
    this.saveData();
    this.caught = { sp: sp, kg: f.kg, len: f.len, isNew: isNew, isBest: isBest, x: f.x, y: f.y, peak: this.fight.peak, thr: f.thr };
    var i = this.fishes.indexOf(f);
    if (i >= 0) this.fishes[i] = this.spawnFish(false);
    this.fight = null;
    this.phase = 'catch'; this.catchT = 0;
    this.splash(f.x, WATER_Y, 22);
    this.sfx.play('splash'); this.sfx.play('win');
    this.floatText('+' + fmtKg(f.kg) + ' kg', GOLD, f.x, WATER_Y - 30, 30);
  };
  G.afterCatch = function () {
    if (this.timeLeft <= 0) this.timeUp(); else this.toAim();
  };

  // ---- 特效 ----
  G.splash = function (x, y, n) {
    for (var i = 0; i < n && this.particles.length < 200; i++) {
      var a = -Math.PI / 2 + (this.rnd() - 0.5) * 2.2, s = 80 + this.rnd() * 160;
      this.particles.push({ x: x + (this.rnd() - 0.5) * 16, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 500, life: 0.5 + this.rnd() * 0.4, max: 0.9, r: 2 + this.rnd() * 3, c: 'rgba(225,245,255,0.9)' });
    }
  };
  G.floatText = function (s, color, x, y, size) { this.texts.push({ s: s, color: color, x: x, y: y, life: 1.6, max: 1.6, size: size || 26 }); };

  // ---- 捏一下＝下一步 ----
  G.gripConfirm = function (force) {
    if (force < START_FORCE) this.btnArmed = true;
    else if (this.btnArmed && force >= CONFIRM_FORCE) {
      this.btnArmed = false;
      var s = this.state;
      if ((s === 'menu' || s === 'result' || s === 'dex') && this.stateT > CONFIRM_DELAY) this.confirm();
      else if (s === 'play' && this.phase === 'catch' && this.catchT > 1.2) this.confirm();
    }
  };
  G.confirm = function () {
    var s = this.state;
    if (s === 'menu' || s === 'result') this.startRound();
    else if (s === 'dex') this.state = this.dexFrom;
    else if (s === 'play' && this.phase === 'catch') this.afterCatch();
  };
  G.calmFish = function () {   // 中途離開：咬餌中、上鉤中的魚放走
    for (var i = 0; i < this.fishes.length; i++) { var f = this.fishes[i]; if (f.mode === 'bite' || f.mode === 'hooked' || f.mode === 'chase') this.scare(f); }
    this.chaser = null;
  };
  G.toMenu = function () { this.calmFish(); this.toAim(); this.state = 'menu'; };
  G.openDex = function () { this.dexFrom = this.state === 'result' ? 'result' : 'menu'; this.state = 'dex'; };

  // ---- 觸控 / 按鍵 ----
  G.button = function (id, x, y, w, h, label, opts) {
    opts = opts || {};
    this.buttons.push({ id: id, x: x, y: y, w: w, h: h });
    return { x: x, y: y, w: w, h: h, label: label, primary: opts.primary, on: opts.on, fill: opts.fill, ink: opts.ink, size: opts.size };
  };
  G.hit = function (x, y) {
    for (var i = this.buttons.length - 1; i >= 0; i--) {
      var b = this.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
    }
    return null;
  };
  G.tap = function (x, y) {   // 點一下。回傳 true 表示有按到按鈕
    var id = this.hit(x, y);
    if (!id) {
      if (this.state === 'play' && this.phase === 'catch' && this.catchT > 0.8) { this.confirm(); return true; }
      return false;
    }
    if (id === 'grip') this.env.connectGrip();
    else if (id === 'mode') this.cycleMode();
    else if (id === 'music') this.toggleMusic();
    else if (id === 'start' || id === 'again') this.startRound();
    else if (id === 'dex') this.openDex();
    else if (id === 'back') this.state = this.dexFrom;
    else if (id === 'cont') this.confirm();
    else if (id === 'menu') this.toMenu();
    return true;
  };
  G.pointerInPlayArea = function (x, y) {
    return this.state === 'play' && this.phase !== 'catch' && this.phase !== 'timeup' && !this.hit(x, y);
  };
  G.key = function (code, down) {
    if (code === 'Space') { this.keyHeld = down; return; }
    if (!down) return;
    var s = this.state;
    if (code === 'Escape') { if (s !== 'menu') this.toMenu(); }
    else if (code === 'Enter') this.confirm();
    else if (s === 'menu' && code === 'KeyK') this.cycleMode();
    else if (s === 'menu' && code === 'KeyD') this.openDex();
    else if (code === 'KeyM') this.toggleMusic();
  };
  G.cycleMode = function () {
    this.modeName = MODE_ORDER[(MODE_ORDER.indexOf(this.modeName) + 1) % MODE_ORDER.length];
    this.saveData();
  };
  G.toggleMusic = function () {
    this.save.music = !this.save.music; this.saveData();
    if (this.music) this.music.setEnabled(this.save.music);
  };

  // ---------- 繪圖 ----------
  G.text = function (ctx, s, size, color, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.translate(x, y);
    if (o.scale) ctx.scale(o.scale, o.scale);
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(10,20,40,0.85)'; ctx.fillText(s, 2, 2); }
    ctx.fillStyle = typeof color === 'string' ? color : rgb(color);
    ctx.fillText(s, 0, 0);
    ctx.restore();
  };
  G.panel = function (ctx, x, y, w, h, alpha) {
    roundRect(ctx, x, y, w, h, 18); ctx.fillStyle = 'rgba(10,26,48,' + (alpha === undefined ? 0.8 : alpha) + ')'; ctx.fill();
  };
  G.drawButton = function (ctx, b) {
    roundRect(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = b.fill ? rgb(b.fill) : b.primary ? 'rgb(255,140,50)' : b.on ? 'rgba(255,205,70,0.9)' : 'rgba(18,40,70,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    this.text(ctx, b.label, b.size || 20, b.ink ? b.ink : b.on ? [40, 30, 10] : TEXT, b.x + b.w / 2, b.y + b.h / 2 + 1, { shadow: false });
  };

  // 天空、海水、沙地（不會動的部分畫一次存起來）
  G.drawBackground = function (ctx) {
    var make = this.env.makeCanvas, ps = this.pixelScale || 1, key = H + '@' + ps.toFixed(2);
    if (!make) { this.paintBackground(ctx); return; }
    if (!this.bg || this.bg.key !== key) {
      var c = make(Math.ceil(W * ps), Math.ceil(H * ps)), x = c.getContext('2d');
      x.scale(ps, ps);
      this.paintBackground(x);
      this.bg = { key: key, c: c };
    }
    ctx.drawImage(this.bg.c, 0, 0, W, H);
  };
  G.paintBackground = function (ctx) {
    var bed = bedY(), g = ctx.createLinearGradient(0, 0, 0, WATER_Y);
    g.addColorStop(0, 'rgb(105,185,245)'); g.addColorStop(1, 'rgb(200,235,255)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, WATER_Y);
    ellipse(ctx, 790, 62, 46, 46, 'rgba(255,240,170,0.35)'); ellipse(ctx, 790, 62, 30, 30, 'rgb(255,235,140)');
    [[440, 44, 1], [620, 96, 0.8], [880, 120, 0.7]].forEach(function (c) {
      var s = c[2];
      ellipse(ctx, c[0], c[1], 34 * s, 14 * s, 'rgba(255,255,255,0.9)'); ellipse(ctx, c[0] + 26 * s, c[1] + 4 * s, 26 * s, 11 * s, 'rgba(255,255,255,0.9)');
      ellipse(ctx, c[0] - 24 * s, c[1] + 5 * s, 22 * s, 9 * s, 'rgba(255,255,255,0.9)');
    });
    polygon(ctx, [[520, WATER_Y], [570, WATER_Y - 26], [620, WATER_Y - 34], [680, WATER_Y - 20], [720, WATER_Y]], 'rgb(90,160,120)');   // 遠方小島
    g = ctx.createLinearGradient(0, WATER_Y, 0, bed);
    g.addColorStop(0, 'rgb(70,185,225)'); g.addColorStop(0.45, 'rgb(30,105,170)'); g.addColorStop(1, 'rgb(12,40,90)');
    ctx.fillStyle = g; ctx.fillRect(0, WATER_Y, W, bed - WATER_Y + 20);
    for (var i = 0; i < 5; i++) {   // 光束
      var x0 = 300 + i * 150;
      polygon(ctx, [[x0, WATER_Y], [x0 + 40, WATER_Y], [x0 - 60, bed], [x0 - 150, bed]], 'rgba(255,255,255,0.05)');
    }
    // 深度提示：越深魚越大
    var self = this;
    [['淺水', 0.12], ['中層', 0.5], ['深海', 0.9]].forEach(function (d) { self.text(ctx, d[0], 15, 'rgba(255,255,255,0.4)', 12, depthY(d[1]), { align: 'left', shadow: false }); });
    // 沙地
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 40) ctx.lineTo(x, bed + Math.sin(x * 0.02) * 5);
    ctx.lineTo(W, H); ctx.closePath();
    g = ctx.createLinearGradient(0, bed - 5, 0, H);
    g.addColorStop(0, 'rgb(225,200,140)'); g.addColorStop(1, 'rgb(170,140,90)');
    ctx.fillStyle = g; ctx.fill();
    ellipse(ctx, 120, bed + 6, 40, 18, 'rgb(110,110,120)'); ellipse(ctx, 150, bed + 2, 22, 12, 'rgb(130,130,140)');
    ellipse(ctx, 905, bed + 8, 34, 14, 'rgb(115,112,120)');
    // 珊瑚
    ctx.strokeStyle = 'rgb(250,120,140)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    [[250, 1], [330, 0.8]].forEach(function (c) {
      var cx = c[0], s = c[1], b0 = bed + 2;
      ctx.beginPath(); ctx.moveTo(cx, b0); ctx.lineTo(cx, b0 - 40 * s);
      ctx.moveTo(cx, b0 - 18 * s); ctx.lineTo(cx - 16 * s, b0 - 38 * s); ctx.moveTo(cx, b0 - 24 * s); ctx.lineTo(cx + 14 * s, b0 - 46 * s);
      ctx.moveTo(cx - 16 * s, b0 - 38 * s); ctx.lineTo(cx - 20 * s, b0 - 52 * s); ctx.stroke();
    });
    ctx.lineCap = 'butt';
  };
  G.drawWaves = function (ctx) {
    ctx.beginPath();
    for (var x = 0; x <= W; x += 20) {
      var y = WATER_Y + Math.sin(x * 0.03 + this.time * 2) * 2.5;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5; ctx.stroke();
  };
  G.drawWeeds = function (ctx) {
    var bed = bedY(), t = this.time;
    ctx.lineCap = 'round';
    for (var i = 0; i < this.weeds.length; i++) {
      var w = this.weeds[i];
      for (var j = 0; j < 5; j++) {
        var bx = w.x - w.w / 2 + (j + 0.5) * w.w / 5, h = w.h * (0.7 + 0.3 * ((j * 7) % 3) / 2), sw = Math.sin(t * 1.4 + j + i) * 12;
        ctx.strokeStyle = j % 2 ? 'rgb(40,150,80)' : 'rgb(60,180,90)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(bx, bed + 4); ctx.quadraticCurveTo(bx - sw, bed - h * 0.5, bx + sw, bed - h); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  };
  G.drawBubbles = function (ctx) {
    ctx.strokeStyle = 'rgba(220,245,255,0.55)'; ctx.lineWidth = 1.2;
    for (var i = 0; i < this.bubbles.length; i++) { var b = this.bubbles[i]; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
  };
  G.tipPos = function () {
    var bob = Math.sin(this.time * 1.5) * 3, bend = 0;
    if (this.state === 'play' && this.phase === 'fight') bend = clamp(this.force / this.thrEff()) * 0.8 + 0.2;
    else if (this.state === 'play' && this.phase === 'bite' && this.bite.dip > 0) bend = this.bite.dip * 0.3;
    return { x: TIP_X + bend * 30, y: TIP_Y + bob + bend * 45, bend: bend, bob: bob };
  };
  G.drawBoat = function (ctx) {
    var tp = this.tipPos(), y0 = WATER_Y + tp.bob, bx = BOAT_X;
    // 釣客
    var hx = bx + 18, hy = y0 - 76;
    roundRect(ctx, bx, y0 - 64, 36, 44, 12); ctx.fillStyle = 'rgb(240,110,70)'; ctx.fill();
    ellipse(ctx, hx, hy, 16, 16, 'rgb(255,215,175)');
    ellipse(ctx, hx + 6, hy - 2, 2.2, 2.6, '#222');
    ctx.strokeStyle = '#7a3b2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx + 5, hy + 4, 5, 0.2, Math.PI * 0.8); ctx.stroke();
    ellipse(ctx, hx, hy - 10, 28, 6, 'rgb(240,205,110)');   // 草帽
    ctx.beginPath(); ctx.ellipse(hx, hy - 12, 15, 11, 0, Math.PI, Math.PI * 2); ctx.fillStyle = 'rgb(240,205,110)'; ctx.fill();
    ctx.fillStyle = 'rgb(220,70,60)'; ctx.fillRect(hx - 15, hy - 15, 30, 4);
    // 釣竿（越用力彎越多）
    var gx = bx + 44, gy = y0 - 40;
    ctx.strokeStyle = 'rgb(70,45,30)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx - 16, gy + 16); ctx.quadraticCurveTo(lerp(gx, tp.x, 0.6), lerp(gy, TIP_Y, 0.6) - 30 + tp.bend * 30, tp.x, tp.y); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgb(255,215,175)'; ctx.beginPath(); ctx.moveTo(bx + 28, y0 - 48); ctx.lineTo(gx - 4, gy + 4); ctx.stroke();   // 手臂
    ellipse(ctx, gx - 10, gy + 8, 7, 7, 'rgb(60,60,70)');   // 捲線器
    ctx.lineCap = 'butt';
    // 船身
    polygon(ctx, [[bx - 100, y0 - 22], [bx + 110, y0 - 22], [bx + 88, y0 + 16], [bx - 76, y0 + 16]], 'rgb(200,80,60)', 'rgb(120,40,30)', 2);
    ctx.fillStyle = 'rgb(250,245,235)'; ctx.fillRect(bx - 94, y0 - 14, 198, 6);
    this.text(ctx, '握力號', 13, [255, 240, 220], bx - 40, y0 + 2, { shadow: false });
  };
  G.drawLine = function (ctx) {
    var tp = this.tipPos(), L = this.lure, ph = this.phase, taut = this.state === 'play' && (ph === 'fight' || ph === 'cast' || this.reeling && ph === 'sink');
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y);
    if (taut) ctx.lineTo(L.x, L.y);
    else ctx.quadraticCurveTo((tp.x + L.x) / 2, Math.max(tp.y, L.y) + 20, L.x, L.y);
    ctx.stroke();
    if (!(this.state === 'play' && ph === 'fight')) this.drawLure(ctx, L.x, L.y);
  };
  G.drawLure = function (ctx, x, y) {
    var ready = this.state === 'play' && this.phase === 'bite' && this.bite.ready;
    ellipse(ctx, x, y, 11, 11, ready ? 'rgba(255,220,80,0.4)' : 'rgba(255,255,255,0.18)');
    ctx.strokeStyle = 'rgb(200,205,215)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y + 4, 4, 0, Math.PI); ctx.stroke();   // 鉤子
    ctx.strokeStyle = 'rgb(255,130,150)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';   // 蚯蚓
    ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.quadraticCurveTo(x + 5 + Math.sin(this.time * 8) * 3, y - 1, x - 3, y + 4); ctx.stroke();
    ctx.lineCap = 'butt';
  };
  G.drawFishes = function (ctx, hookedOnly) {
    for (var i = 0; i < this.fishes.length; i++) {
      var f = this.fishes[i], hooked = f.mode === 'hooked';
      if (hooked !== !!hookedOnly) continue;
      var strug = hooked && this.fight && (this.fight.strug > 0 || this.fight.next < WARN_TIME);
      drawFish(ctx, f.sp, f.x, f.y, f.len, f.dir, f.t, { puff: f.puff, fast: f.mode === 'flee' || strug, angle: hooked ? -0.25 : 0 });
    }
  };
  G.drawEffects = function (ctx) {
    var i;
    for (i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.8, p.r * Math.min(1, p.life / p.max * 1.5)), 0, Math.PI * 2);
      ctx.fillStyle = p.c; ctx.fill();
    }
    for (i = 0; i < this.texts.length; i++) {
      var t = this.texts[i];
      this.text(ctx, t.s, t.size, t.color, t.x, t.y, { alpha: Math.min(1, t.life / t.max * 2) });
    }
  };
  G.drawScene = function (ctx) {
    this.drawBackground(ctx);
    this.drawWeeds(ctx);
    this.drawBubbles(ctx);
    this.drawFishes(ctx, false);
    this.drawBoat(ctx);
    this.drawWaves(ctx);
    if (this.state === 'play' && this.phase !== 'catch') this.drawLine(ctx);
    this.drawFishes(ctx, true);
    this.drawEffects(ctx);
  };

  // 右側握力計：依階段畫出要達到的線
  G.drawGauge = function (ctx) {
    var ph = this.phase, force = this.force, x = W - 56, y = WATER_Y + 56, w = 32, h = bedY() - 64 - y;
    var top, lines = [], target = 0;
    if (ph === 'fight') {
      var f = this.fight.fish, warn = this.fight.strug > 0 || this.fight.next < WARN_TIME;
      top = f.thr * STRUGGLE_K * 1.25; target = this.thrEff();
      lines.push([f.thr, GOLD, String(f.thr)]);
      if (warn) lines.push([Math.round(f.thr * STRUGGLE_K), RED, String(Math.round(f.thr * STRUGGLE_K))]);
    } else if (ph === 'bite') { var hf = hookForce(this.modeName); top = hf * 1.8; target = hf; lines.push([hf, this.bite.ready ? RED : DIM, String(hf)]); }
    else { top = CAST_REF * this.ratio() * 1.2; target = START_FORCE; lines.push([START_FORCE, DIM, ph === 'aim' ? '拋' : '收']); }
    roundRect(ctx, x - 5, y - 5, w + 10, h + 10, 14); ctx.fillStyle = 'rgba(10,22,40,0.75)'; ctx.fill();
    var fill = clamp(force / top) * h, color = force >= target ? GREEN : SKYBLUE;
    if (fill > 1) { roundRect(ctx, x, y + h - fill, w, fill, 10); ctx.fillStyle = rgb(color); ctx.fill(); }
    for (var i = 0; i < lines.length; i++) {
      var ly = y + h - clamp(lines[i][0] / top) * h;
      ctx.fillStyle = rgb(lines[i][1]); ctx.fillRect(x - 10, ly - 1.5, w + 20, 3);
      this.text(ctx, lines[i][2], 16, lines[i][1], x - 24, ly);
    }
    this.text(ctx, force.toFixed(1), 26, color, x + w / 2, y - 26);
  };
  G.hint = function () {
    var ph = this.phase, dev = this.env.grip.connected;
    if (ph === 'aim') return dev ? '握緊再放開就拋竿，握越用力拋越遠' : '按住畫面再放開就拋竿，按越久拋越遠';
    if (ph === 'sink') return dev ? '放鬆：餌往下沉　·　握緊：收線　·　越深的魚越大' : '放開：餌往下沉　·　按住：收線　·　越深的魚越大';
    if (ph === 'bite') return this.bite.ready ? '現在！用力握到 ' + hookForce(this.modeName) + '！' : '魚在咬餌了…先放鬆，等「！」出現';
    if (ph === 'fight') return '握力超過 ' + this.fight.fish.thr + ' 就能把魚拉近，掙扎時要更用力！';
    return '';
  };
  G.drawHud = function (ctx) {
    var ph = this.phase, sec = Math.ceil(this.timeLeft), paused = ph === 'fight' || ph === 'catch' || ph === 'lost';
    this.text(ctx, '剩 ' + sec + ' 秒', 28, sec <= 10 ? RED : GOLD, 470, 28);
    if (paused && sec > 0) this.text(ctx, '拉魚時暫停計時', 14, DIM, 470, 54, { shadow: false });
    this.text(ctx, '總重 ' + fmtKg(this.total) + ' kg　' + this.catches.length + ' 條', 20, TEXT, 720, 28);
    if (this.modeName !== 'normal') this.text(ctx, this.cfg().label, 15, this.cfg().color, 720, 54);
    this.drawButton(ctx, this.button('menu', W - 94, 10, 84, 38, '選單', { size: 18 }));
    if (ph === 'fight') {
      var F = this.fight, f = F.fish, bx = 380, bw = 420, by = 98, warn = F.strug > 0 || F.next < WARN_TIME;
      this.text(ctx, f.sp.name + '　需要握力 ' + this.thrEff().toFixed(0) + (F.strug > 0 ? '（掙扎中！）' : ''), 20, F.strug > 0 ? RED : TEXT, bx + bw / 2, 80);
      roundRect(ctx, bx, by, bw, 18, 9); ctx.fillStyle = 'rgba(10,22,40,0.8)'; ctx.fill();
      var p = clamp(F.p);
      if (p > 0) { roundRect(ctx, bx, by, Math.max(18, bw * p), 18, 9); ctx.fillStyle = rgb(p < 0.25 ? RED : GREEN); ctx.fill(); }
      this.text(ctx, '拉近 ' + Math.round(p * 100) + '%', 15, TEXT, bx + bw / 2, by + 10, { shadow: false });
      if (warn && Math.floor(this.time * 6) % 2 === 0) this.text(ctx, '⚠', 30, RED, bx - 22, by + 8);
    }
    if (ph === 'bite') {
      var L = this.lure;
      if (this.bite.ready) {   // 黃色泡泡裡的驚嘆號
        var bs = 1 + 0.12 * Math.sin(this.time * 20), by2 = L.y - 50;
        polygon(ctx, [[L.x - 8, by2 + 18], [L.x + 8, by2 + 18], [L.x, by2 + 34]], 'rgb(255,220,60)');
        ellipse(ctx, L.x, by2, 26 * bs, 26 * bs, 'rgb(255,220,60)');
        ctx.strokeStyle = 'rgb(200,60,40)'; ctx.lineWidth = 3; ctx.stroke();
        this.text(ctx, '!', 38, RED, L.x, by2 + 2, { shadow: false, scale: bs });
      }
      else if (this.bite.dip > 0.5) this.text(ctx, '咚', 18, TEXT, L.x + 16, L.y - 22, { alpha: this.bite.dip });
    }
    var hint = this.hint();
    if (hint) this.text(ctx, hint, 19, ph === 'bite' && this.bite.ready ? GOLD : TEXT, W / 2 - 30, bedY() - 22);
    if (ph !== 'catch' && ph !== 'timeup') this.drawGauge(ctx);
  };
  G.drawCatch = function (ctx) {
    var c = this.caught, t = this.catchT, sp = c.sp;
    if (t < 0.9) {   // 魚跳出水面
      var k = t / 0.9, x = lerp(c.x, W / 2, k), y = lerp(c.y, 230, k) - Math.sin(k * Math.PI) * 140;
      drawFish(ctx, sp, x, y, c.len, 1, this.time, { fast: true, angle: -1.2 + k * 2.4, puff: sp.pattern === 'puffer' ? 1 : 0 });
      return;
    }
    var pw = 640, ph = 330, px = W / 2 - pw / 2, py = Math.max(70, (H - ph) / 2 - 30);
    this.panel(ctx, px, py, pw, ph, 0.88);
    var dl = Math.min(220, c.len * 1.25);
    drawFish(ctx, sp, W / 2, py + 72, dl, 1, this.time, { puff: sp.pattern === 'puffer' ? 1 : 0 });
    this.text(ctx, '釣到 ' + sp.name + '！', 36, GOLD, W / 2, py + 146);
    this.text(ctx, fmtKg(c.kg) + ' 公斤', 26, TEXT, W / 2, py + 186);
    var tag = c.isNew ? '第一次釣到！圖鑑 +1' : c.isBest ? '這種魚的新紀錄！' : '';
    if (tag) this.text(ctx, tag, 20, GREEN, W / 2, py + 216);
    this.text(ctx, sp.fact, 17, DIM, W / 2, py + 246);
    if (t > 1.2) this.drawButton(ctx, this.button('cont', W / 2 - 110, py + ph - 58, 220, 44, '繼續（捏一下）', { primary: true }));
  };
  G.drawStatus = function (ctx) {
    var g = this.env.grip;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, H - 30, W, 30);
    this.text(ctx, g.status, 15, g.connected ? GREEN : DIM, 14, H - 15, { align: 'left', shadow: false });
    if (this.state === 'menu') this.text(ctx, '版本 ' + VERSION, 14, DIM, W - 14, H - 15, { align: 'right', shadow: false });
  };
  G.drawMenu = function (ctx) {
    this.panel(ctx, 330, 14, 400, 128, 0.72);
    this.text(ctx, '釣魚大師', 54, GOLD, 530, 52);
    this.text(ctx, '握緊收線、放鬆下沉，把餌送到魚旁邊', 17, TEXT, 530, 95);
    this.text(ctx, '魚上鉤後握力超過門檻，就能拉上來！', 17, TEXT, 530, 122);
    this.drawButton(ctx, this.button('music', W - 176, 18, 160, 40, this.save.music ? '♪ 音樂：開' : '♪ 音樂：關', { on: this.save.music, size: 18 }));
    var c = this.cfg(), best = this.save.best[this.modeName];
    var iy = WATER_Y + 46;
    this.panel(ctx, 230, iy, 500, 104, 0.7);
    this.text(ctx, ROUND_TIME + ' 秒內，釣到的魚總重越重越好', 22, TEXT, 480, iy + 26);
    this.text(ctx, c.label + (c.ratio !== 1 ? '：握力門檻 ×' + c.ratio : '') + '　·　最佳 ' + (best ? fmtKg(best) + ' 公斤' : '還沒有紀錄'), 17, c.color, 480, iy + 58);
    this.text(ctx, '圖鑑 ' + this.dexCount() + ' / ' + FISH.length + ' 種', 17, DIM, 480, iy + 84);
    var bw = 200, gap = 14, x0 = (W - (bw * 4 + gap * 3)) / 2, by = H - 92, g = this.env.grip;
    this.drawButton(ctx, this.button('mode', x0, by, bw, 48, '難度：' + c.short + '（切換）', { fill: c.fill, ink: c.ink }));
    this.drawButton(ctx, this.button('start', x0 + bw + gap, by, bw, 48, '開始釣魚', { primary: true, size: 22 }));
    this.drawButton(ctx, this.button('dex', x0 + (bw + gap) * 2, by, bw, 48, '魚類圖鑑'));
    var gl = g.connected ? '✔ 已連線（重連）' : this.env.bluetoothSupported ? '連接握力球' : '此瀏覽器不支援藍牙';
    this.drawButton(ctx, this.button('grip', x0 + (bw + gap) * 3, by, bw, 48, gl, g.connected ? { ink: GREEN } : {}));
  };
  G.drawResult = function (ctx) {
    var pw = 640, ph = 340, px = W / 2 - pw / 2, py = Math.max(56, (H - 30 - ph) / 2), self = this;
    this.panel(ctx, px, py, pw, ph, 0.88);
    this.text(ctx, '時間到！', 46, GOLD, W / 2, py + 44);
    var n = this.catches.length, lines = [];
    if (n) {
      lines.push(['釣到 ' + n + ' 條魚，總重 ' + fmtKg(this.total) + ' 公斤', TEXT, 26]);
      var big = this.catches.slice().sort(function (a, b) { return b.kg - a.kg; })[0];
      lines.push(['最大的一條：' + FISH_BY_ID[big.id].name + ' ' + fmtKg(big.kg) + ' 公斤', TEXT, 20]);
    } else {
      lines.push(['這次沒有釣到魚…', TEXT, 26]);
      lines.push(['提示：放鬆讓餌沉到魚附近，「！」出現再用力握', DIM, 18]);
    }
    lines.push([this.newBest ? '★ 新紀錄！（' + this.cfg().label + '）' : '最佳紀錄 ' + fmtKg(this.save.best[this.modeName]) + ' 公斤（' + this.cfg().label + '）', this.newBest ? GOLD : DIM, 20]);
    lines.push(['圖鑑 ' + this.dexCount() + ' / ' + FISH.length + ' 種' + (this.newSpecies ? '（這局新收集 ' + this.newSpecies + ' 種）' : ''), this.newSpecies ? GREEN : DIM, 18]);
    lines.forEach(function (l, i) { self.text(ctx, l[0], l[2], l[1], W / 2, py + 104 + i * 42); });
    var bw = 180, gap = 14, x0 = W / 2 - (bw * 3 + gap * 2) / 2, by = py + ph - 64;
    this.drawButton(ctx, this.button('again', x0, by, bw, 46, '再玩一次', { primary: true }));
    this.drawButton(ctx, this.button('dex', x0 + bw + gap, by, bw, 46, '魚類圖鑑'));
    this.drawButton(ctx, this.button('menu', x0 + (bw + gap) * 2, by, bw, 46, '選單'));
  };
  G.drawDex = function (ctx) {
    ctx.fillStyle = 'rgba(6,20,40,0.72)'; ctx.fillRect(0, 0, W, H);
    var oy = Math.max(0, (H - 540) / 2), cw = 172, ch = 168, gap = 12, x0 = (W - (cw * 5 + gap * 4)) / 2, y0 = oy + 78;
    this.text(ctx, '魚類圖鑑　' + this.dexCount() + ' / ' + FISH.length, 34, GOLD, W / 2, oy + 38);
    for (var i = 0; i < FISH.length; i++) {
      var sp = FISH[i], d = this.save.dex[sp.id], cx = x0 + (i % 5) * (cw + gap), cy = y0 + Math.floor(i / 5) * (ch + gap);
      roundRect(ctx, cx, cy, cw, ch, 14); ctx.fillStyle = d ? 'rgba(40,110,170,0.55)' : 'rgba(20,40,70,0.7)'; ctx.fill();
      drawFish(ctx, sp, cx + cw / 2 + 6, cy + 58, Math.min(130, 44 + sp.len * 0.55), 1, this.time * 0.5, { sil: !d });
      this.text(ctx, d ? sp.name : '？？？', 20, d ? TEXT : DIM, cx + cw / 2, cy + 112);
      this.text(ctx, d ? '最大 ' + fmtKg(d.best) + ' kg・' + d.n + ' 條' : '門檻約 ' + Math.round(sp.thr * this.ratio()), 14, d ? GOLD : DIM, cx + cw / 2, cy + 142, { shadow: false });
    }
    this.drawButton(ctx, this.button('back', W / 2 - 100, y0 + ch * 2 + gap + 16, 200, 44, '返回'));
  };

  G.draw = function (ctx) {
    this.buttons = [];
    this.drawScene(ctx);
    if (this.state === 'menu') this.drawMenu(ctx);
    else if (this.state === 'play') {
      if (this.phase === 'catch') this.drawCatch(ctx);
      this.drawHud(ctx);
    } else if (this.state === 'result') this.drawResult(ctx);
    else if (this.state === 'dex') this.drawDex(ctx);
    if (this.toast && this.state === 'play') {
      var tt = this.toast, a = clamp(tt.t / 0.35), s = 1 + 0.25 * clamp(1 - (tt.max - tt.t) / 0.15);   // 出現時從大縮回
      this.text(ctx, tt.s, tt.size, tt.color, W / 2, WATER_Y + 80, { alpha: a, scale: s });
    }
    this.drawStatus(ctx);
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * this.flash / 0.15) + ')'; ctx.fillRect(0, 0, W, H); }
  };

  function setHeight(h) { H = Math.round(clamp(h, H_MIN, H_MAX)); api.H = H; return H; }   // 由 app.js 依螢幕比例設定
  var api = { VERSION: VERSION, Game: Game, W: W, H: H, setHeight: setHeight, FISH: FISH, MODES: MODES, ROUND_TIME: ROUND_TIME,
              STRUGGLE_K: STRUGGLE_K, canReach: canReach, depthY: depthY, fishThr: fishThr, hookForce: hookForce, drawFish: drawFish };
  root.FishingGame = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
