// 共用背景音樂 music.js：四首曲譜都看得懂、每首至少 24 小節且彼此不同；用假的音效裝置排程兩分鐘不出錯、音高都合理
'use strict';
var h = require('./helpers'), ok = h.ok;
var GripMusic = require('../music.js');

// 假的 AudioContext：記錄建立了哪些節點、振盪器的頻率
function mockAudio() {
  var log = { osc: 0, freqs: [], bad: 0 };
  function param(v) {
    return { value: v, setValueAtTime: chk, exponentialRampToValueAtTime: function (x, t) { if (!(x > 0)) log.bad++; chk(x, t); },
             linearRampToValueAtTime: chk, setTargetAtTime: chk, cancelScheduledValues: function () { } };
  }
  function chk(x, t) { if (!isFinite(x) || !isFinite(t) || t < 0) log.bad++; }
  function node(extra) {
    var n = { connect: function () { }, disconnect: function () { }, start: chk2, stop: chk2 };
    for (var k in extra) n[k] = extra[k];
    return n;
  }
  function chk2(t) { if (t !== undefined && (!isFinite(t) || t < 0)) log.bad++; }
  var ac = {
    currentTime: 0, sampleRate: 8000, destination: node({}),
    createGain: function () { return node({ gain: param(1) }); },
    createDelay: function () { return node({ delayTime: param(0) }); },
    createBiquadFilter: function () { return node({ frequency: param(350), Q: param(1), type: 'lowpass' }); },
    createOscillator: function () {
      log.osc++;
      var o = node({ type: 'sine', frequency: param(440) });
      var start = o.start; o.start = function (t) { log.freqs.push(o.frequency.value); start(t); };
      return o;
    },
    createBufferSource: function () { return node({ buffer: null }); },
    createBuffer: function (c, n) { var d = new Float32Array(n); return { getChannelData: function () { return d; } }; }
  };
  return { ac: ac, log: log };
}

var ids = Object.keys(GripMusic.SONGS);
['egg', 'rocket', 'keeper', 'fishing'].forEach(function (id) { ok(ids.indexOf(id) >= 0, '有遊戲 ' + id + ' 的曲子'); });
var sigs = {};
ids.forEach(function (id) {
  var s = GripMusic.SONGS[id], bars = null, err = null;
  try { bars = GripMusic.compile(s); } catch (e) { err = e; }
  ok(!err, id + '：曲譜格式正確' + (err ? '：' + err.message : ''));
  if (!bars) return;
  var sec = bars.length * 4 * 60 / s.bpm;
  ok(bars.length >= 24 && sec >= 45, id + '：' + bars.length + ' 小節、約 ' + Math.round(sec) + ' 秒才重複一次');
  sigs[id] = s.bpm + s.lead.voice + JSON.stringify(s.sections.A.mel);
  var m = mockAudio(), mus = new GripMusic(m.ac, id);
  for (var t = 0; t < 120; t += 0.05) { m.ac.currentTime = t; mus.enabled = true; mus.tick(); }
  var lo = Math.min.apply(null, m.log.freqs), hi = Math.max.apply(null, m.log.freqs);
  ok(m.log.bad === 0, id + '：排程兩分鐘，時間與音量參數都正確');
  ok(m.log.osc > 300 && lo >= 20 && hi <= 6000, id + '：' + m.log.osc + ' 個音，頻率 ' + Math.round(lo) + '～' + Math.round(hi) + ' Hz');
  ok(mus.step > 0, id + '：曲子有往前播');
});
var uniq = {};
ids.forEach(function (id) { uniq[sigs[id]] = true; });
ok(Object.keys(uniq).length === ids.length, '每個遊戲的曲子都不一樣');
var bad = null;
try { new GripMusic(mockAudio().ac, 'nope'); } catch (e) { bad = e; }
ok(!!bad, '沒有的曲子名稱會丟出錯誤（遊戲裡會接住，變成沒有音樂）');
h.done();
