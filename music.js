/* 握力遊戲合集：共用背景音樂引擎（WebAudio 即時合成，不用音檔）。
 * 每個遊戲一首不同風格、約一分鐘的曲子：new GripMusic(audioContext, 'egg')，setEnabled(true/false)，duck(秒)。
 * 各遊戲的 index.html 先載入 ../music.js；沒載到時遊戲照樣能玩，只是沒有音樂。
 * iPad iOS 12 相容：ES5 寫法，只用 Oscillator / Gain / BiquadFilter / Delay / BufferSource。 */
(function (root) {
  'use strict';

  // ---------- 曲譜格式 ----------
  // sections：每段有 chords（每小節一個字串，空白隔開＝一小節兩個和弦）與 mel（每小節 8 個八分音符：音名、'-' 延長、'.' 休止）
  // order：段落順序。bass：每小節 8 個八分音符（R 根音、F 五度、O 高八度、3 三度、'-' 延長、'.' 休止）
  // comp：伴奏（pad 長和弦、skank 反拍短和弦、stab 銅管短和弦、arp 十六分音符琶音），pat 為 8 個八分音符的位置
  // drums：每小節 16 個十六分音符（x 打、o 開鈸、. 不打）；fill：每段最後一小節加過門
  var SONGS = {
    // 捏蛋大挑戰：木琴＋彈跳低音的俏皮廚房風（F 大調，搖擺節奏）
    egg: {
      bpm: 132, swing: 0.16, vol: 0.2,
      lead: { voice: 'marimba', vol: 0.32, echo: 0.12 },
      bass: { voice: 'pluckbass', vol: 0.4, pat: 'R . O . F . O .' },
      comp: { style: 'skank', voice: 'soft', vol: 0.05, pat: '. x . x . x . x' },
      drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', vol: 0.5, fill: true },
      sections: {
        A: { chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm7 C7', 'F'],
             mel: ['C5 . F5 . A5 . G5 F5', 'D5 . F5 . A5 - . .', 'Bb4 . D5 . F5 . D5 Bb4', 'C5 . E5 . G5 - . .',
                   'A5 . G5 F5 C5 . F5 .', 'A5 . Bb5 A5 F5 . D5 .', 'G5 . Bb5 . A5 . G5 E5', 'F5 - - - . . C5 .'] },
        A2: { chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm7 C7', 'F'],
              mel: ['C5 . F5 . A5 . G5 F5', 'D5 . F5 . A5 - . .', 'Bb4 . D5 . F5 . D5 Bb4', 'C5 . E5 . G5 - . .',
                    'A5 . G5 F5 C5 . F5 .', 'A5 . Bb5 A5 F5 . D5 .', 'G5 . Bb5 . A5 . G5 E5', 'F5 - - - - - . .'] },
        B: { chords: ['Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Gm7', 'C7'],
             mel: ['F5 . Bb5 . D6 - C6 Bb5', 'C6 . G5 . E5 - . .', 'E5 . A5 . C6 - B5 A5', 'A5 . F5 . D5 - . .',
                   'D5 E5 F5 . Bb5 . A5 G5', 'E5 F5 G5 . C6 . Bb5 A5', 'G5 . Bb5 . D6 . C6 Bb5', 'C6 - Bb5 - G5 - E5 -'] }
      },
      order: ['A', 'A2', 'B', 'A2']
    },
    // 水火箭發射：電子合成器的冒險風（A 小調，十六分音符琶音往前推）
    rocket: {
      bpm: 120, swing: 0, vol: 0.065,
      lead: { voice: 'synth', vol: 0.2, echo: 0.3 },
      bass: { voice: 'synthbass', vol: 0.32, pat: 'R R O R R R O R' },
      comp: { style: 'arp', voice: 'pluck', vol: 0.08 },
      pad: { vol: 0.035 },
      drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', vol: 0.45, fill: true },
      sections: {
        A: { chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
             mel: ['E5 - - - E5 . D5 E5', 'F5 - C5 - A4 - - -', 'G5 - - - G5 . F5 E5', 'D5 - - - B4 - - -',
                   'E5 - - - E5 . D5 E5', 'F5 - C5 - F5 - A5 -', 'G5 - E5 - C5 - E5 -', 'D5 - - - - - . .'] },
        B: { chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'E7', 'E7'],
             mel: ['A5 - - - C6 - A5 -', 'B5 - - - D6 - B5 -', 'G5 - - - B5 - G5 -', 'A5 - - - E5 - - -',
                   'F5 - A5 - C6 - A5 F5', 'G5 - B5 - D6 - C6 B5', 'G#5 - - - B5 - - -', 'E5 - - - - - . .'] }
      },
      order: ['A', 'B', 'A', 'B']
    },
    // 守門員大作戰：銅管＋拍手的足球場加油風（D 大調）
    keeper: {
      bpm: 128, swing: 0, vol: 0.095,
      lead: { voice: 'brass', vol: 0.22, echo: 0.15 },
      bass: { voice: 'synthbass', vol: 0.32, pat: 'R O R O R O R O' },
      comp: { style: 'stab', voice: 'brass', vol: 0.06, pat: '. . x . . . x .' },
      drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..o...o...o...o.', vol: 0.45, fill: true },
      sections: {
        A: { chords: ['D', 'G', 'Bm', 'A', 'D', 'G', 'A', 'D'],
             mel: ['D5 . D5 . F#5 . A5 .', 'B5 - D6 - G5 - . .', 'F#5 . F#5 . A5 . D6 .', 'C#6 - - - A5 - . .',
                   'D5 . D5 . F#5 . A5 .', 'B5 - D6 - G5 - B5 -', 'A5 . G5 . F#5 . E5 .', 'D5 - - - . . A4 .'] },
        B: { chords: ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'Bm A', 'A7'],
             mel: ['B4 . D5 . G5 - F#5 G5', 'A5 - - - E5 - . .', 'F#5 . A5 . C#6 - B5 A5', 'B5 - - - F#5 - . .',
                   'G5 . G5 . B5 . D6 .', 'C#6 . C#6 . E6 . C#6 .', 'D6 - B5 - C#6 - A5 -', 'E5 . F#5 . G5 . A5 .'] }
      },
      order: ['A', 'B', 'A', 'B']
    },
    // 釣魚大師：鋼鼓＋反拍吉他的海島悠閒風（C 大調）
    fishing: {
      bpm: 100, swing: 0.1, vol: 0.1,
      lead: { voice: 'steel', vol: 0.3, echo: 0.22 },
      bass: { voice: 'roundbass', vol: 0.42, pat: 'R - . F O . R .' },
      comp: { style: 'skank', voice: 'skank', vol: 0.06, pat: '. x . x . x . x' },
      drums: { kick: 'x.......x.......', rim: '........x.......', hat: 'x.xxx.xxx.xxx.xx', vol: 0.4, fill: false },
      sections: {
        A: { chords: ['C', 'F', 'G', 'C', 'Am', 'F', 'G7', 'C'],
             mel: ['E5 . G5 E5 . C5 D5 E5', 'F5 . A5 . C6 - A5 .', 'G5 . B5 G5 . D5 E5 F5', 'E5 - C5 - . . . .',
                   'E5 . A5 E5 . C5 D5 E5', 'F5 . A5 . F5 - E5 D5', 'B4 . D5 . F5 . E5 D5', 'C5 - - - . . G4 .'] },
        B: { chords: ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'C'],
             mel: ['A5 - - - G5 . F5 .', 'G5 - - - F5 . E5 .', 'E5 . G5 . B5 - A5 G5', 'A5 - - - . . E5 .',
                   'F5 . A5 . D6 - C6 A5', 'B5 . D6 . B5 - G5 F5', 'E5 . G5 . C6 - - -', '. . . . . . G4 .'] }
      },
      order: ['A', 'A', 'B', 'A']
    }
  };

  // ---------- 樂理小工具 ----------
  var PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function noteMidi(s) {   // 'F#5' → 78
    var m = /^([A-G][b#]?)(-?\d)$/.exec(s);
    if (!m || PC[m[1]] === undefined) throw new Error('音名看不懂：' + s);
    return 12 * (parseInt(m[2], 10) + 1) + PC[m[1]];
  }
  function chordInfo(name) {   // 'F#m' → { root: 6, iv: [0, 3, 7] }
    var m = /^([A-G][b#]?)(.*)$/.exec(name);
    if (!m || PC[m[1]] === undefined) throw new Error('和弦看不懂：' + name);
    var q = m[2], iv = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], sus2: [0, 2, 7], dim: [0, 3, 6] }[q];
    if (!iv) throw new Error('和弦看不懂：' + name);
    return { root: PC[m[1]], iv: iv };
  }
  function voicing(ch) {   // 伴奏用的和弦音，放在中音域（G3～G4 附近）
    var out = [];
    for (var i = 0; i < ch.iv.length; i++) { var n = 48 + ch.root + ch.iv[i]; if (n < 53) n += 12; out.push(n); }
    return out.sort(function (a, b) { return a - b; });
  }
  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function tokens(s, n, what) {
    var t = s.split(/\s+/).filter(function (x) { return x; });
    if (t.length !== n) throw new Error(what + ' 應該有 ' + n + ' 格：' + s);
    return t;
  }
  // 把曲譜攤平成一小節一筆，事先算好每個音的長度（幾個十六分音符）
  function compile(song) {
    var bars = [];
    song.order.forEach(function (name) {
      var sec = song.sections[name];
      if (!sec) throw new Error('沒有段落 ' + name);
      if (sec.chords.length !== sec.mel.length) throw new Error('段落 ' + name + ' 的和弦與旋律小節數不同');
      for (var i = 0; i < sec.mel.length; i++) {
        bars.push({ chords: sec.chords[i].split(/\s+/).map(chordInfo), mel: tokens(sec.mel[i], 8, '旋律'), last: i === sec.mel.length - 1 });
      }
    });
    var seq = [], b, k;
    for (b = 0; b < bars.length; b++) for (k = 0; k < 8; k++) seq.push(bars[b].mel[k]);
    bars.forEach(function (bar, bi) {   // 旋律：音名 → { midi, len }，延長可以跨小節
      bar.notes = [];
      for (k = 0; k < 8; k++) {
        var tk = bar.mel[k];
        if (tk === '-' || tk === '.') { bar.notes.push(null); continue; }
        var len = 1, j = bi * 8 + k + 1;
        while (len < 16 && seq[j % seq.length] === '-') { len++; j++; }
        bar.notes.push({ midi: noteMidi(tk), len: len * 2 });
      }
    });
    var bp = tokens(song.bass.pat, 8, '低音');
    song._bass = bp.map(function (tk, k) {
      if (tk === '-' || tk === '.') return null;
      var len = 1;
      while (k + len < 8 && bp[k + len] === '-') len++;
      return { tk: tk, len: len * 2 };
    });
    song._comp = song.comp && song.comp.pat ? tokens(song.comp.pat, 8, '伴奏') : null;
    ['kick', 'snare', 'clap', 'rim', 'hat'].forEach(function (d) {
      if (song.drums[d] && song.drums[d].length !== 16) throw new Error('鼓 ' + d + ' 應該有 16 格');
    });
    return bars;
  }

  // ---------- 引擎 ----------
  function GripMusic(ac, id) {
    var song = SONGS[id];
    if (!song) throw new Error('沒有這首曲子：' + id);
    this.ac = ac; this.id = id; this.song = song;
    this.bars = song._bars || (song._bars = compile(song));
    this.enabled = false; this.step = 0; this.next = 0; this.timer = null;
    this.volume = song.vol;
    this.master = ac.createGain(); this.master.gain.value = 0; this.master.connect(ac.destination);
    // 回聲（旋律送一點進來，聽起來比較有空間感）
    this.echo = ac.createDelay(1.0); this.echo.delayTime.value = 60 / song.bpm * 0.75;
    var fb = ac.createGain(); fb.gain.value = 0.3;
    var tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2500;
    var wet = ac.createGain(); wet.gain.value = 1;
    this.echo.connect(tone); tone.connect(fb); fb.connect(this.echo); tone.connect(wet); wet.connect(this.master);
    // 鼓用的白噪音
    var n = Math.floor(ac.sampleRate * 0.4), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }
  var M = GripMusic.prototype;

  M.setEnabled = function (on) {
    this.enabled = on;
    var t = this.ac.currentTime, self = this, g = this.master.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(on ? this.volume : 0, t, 0.2);
    clearInterval(this.timer); this.timer = null;
    if (on) {   // 用自己的計時器排程，不跟畫面更新綁在一起：畫面卡一下，音樂也不會斷
      if (this.next < t) this.next = t + 0.1;
      this.timer = setInterval(function () { self.tick(); }, 50);
    }
  };
  M.duck = function (sec) {   // 重要時刻讓音樂暫時變小聲
    if (!this.enabled) return;
    var t = this.ac.currentTime, g = this.master.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this.volume * 0.25, t, 0.05);
    g.setTargetAtTime(this.volume, t + sec, 0.5);
  };
  M.tick = function () {
    if (!this.enabled) return;
    var now = this.ac.currentTime;
    if (this.next < now - 0.3) this.next = now + 0.05;   // 分頁在背景太久，重新對時
    this.scheduleUntil(now + 0.5);
  };
  M.scheduleUntil = function (tEnd) {   // 預先排好到 tEnd 為止的音符（十六分音符一格）
    var s = this.song, six = 60 / s.bpm / 4, total = this.bars.length * 16;
    while (this.next < tEnd) {
      var st = this.step, bi = Math.floor(st / 16), k = st % 16, t = this.next;
      if (s.swing && k % 4 === 2) t += s.swing * six * 2;   // 搖擺：反拍的八分音符晚一點
      this.playStep(this.bars[bi], k, t, six);
      this.step = (st + 1) % total;
      this.next += six;
    }
  };
  M.playStep = function (bar, k, t, six) {
    var s = this.song, nc = bar.chords.length, ci = Math.min(nc - 1, Math.floor(k / (16 / nc))), ch = bar.chords[ci];
    var chordStart = k === ci * (16 / nc), chordLen = 16 / nc;
    if (k % 2 === 0) {
      var e = k / 2, n = bar.notes[e];
      if (n) this.voice(s.lead.voice, n.midi, t, n.len * six, s.lead.vol, s.lead.echo);
      var b = s._bass[e];
      if (b) {
        var bm = 36 + ch.root + (b.tk === 'F' ? 7 : b.tk === 'O' ? 12 : b.tk === '3' ? ch.iv[1] : 0);
        this.voice(s.bass.voice, bm, t, b.len * six, s.bass.vol, 0);
      }
      if (s._comp && s._comp[e] === 'x') {
        var vs = voicing(ch);
        for (var i = 0; i < vs.length; i++) this.voice(s.comp.voice, vs[i] + 12, t, s.comp.style === 'stab' ? six * 1.5 : six * 1.2, s.comp.vol, 0);
      }
    }
    if (s.comp.style === 'arp') {   // 十六分音符琶音：和弦音往上爬兩個八度
      var av = voicing(ch), seq = av.concat(av.map(function (x) { return x + 12; }));
      this.voice(s.comp.voice, seq[k % seq.length] + 12, t, six * 1.5, s.comp.vol, 0.15);
    }
    if (s.pad && chordStart) {
      var pv = voicing(ch);
      for (var j = 0; j < pv.length; j++) this.voice('pad', pv[j], t, chordLen * six, s.pad.vol, 0);
    }
    var dr = s.drums, dv = dr.vol;
    if (dr.fill && bar.last && k >= 12) { this.snare(t, dv * (0.4 + 0.15 * (k - 12))); if (k === 12) this.kick(t, dv); return; }
    if (dr.kick && dr.kick.charAt(k) === 'x') this.kick(t, dv);
    if (dr.snare && dr.snare.charAt(k) === 'x') this.snare(t, dv * 0.7);
    if (dr.clap && dr.clap.charAt(k) === 'x') this.clap(t, dv * 0.8);
    if (dr.rim && dr.rim.charAt(k) === 'x') this.rim(t, dv * 0.7);
    if (dr.hat) { var hc = dr.hat.charAt(k); if (hc === 'x' || hc === 'o') this.hat(t, dv * (k % 4 === 0 ? 0.35 : 0.22), hc === 'o'); }
  };

  // ---------- 音色 ----------
  function env(g, t, attack, peak, hold, release) {   // 起音 → 維持 → 收尾
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    if (hold > attack) g.gain.setValueAtTime(peak, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(hold, attack) + release);
    return t + Math.max(hold, attack) + release + 0.05;
  }
  function decay(g, t, peak, len) {   // 敲擊類：一下子衰減
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    return t + len + 0.05;
  }
  M.osc = function (type, f, t, end, dest) {
    var o = this.ac.createOscillator();
    o.type = type; o.frequency.value = f;
    o.connect(dest); o.start(t); o.stop(end);
    return o;
  };
  M.out = function (vol, echo) {   // 一個音的輸出：接到主音量，需要的話也送一點進回聲
    var g = this.ac.createGain();
    g.connect(this.master);
    if (echo) { var e = this.ac.createGain(); e.gain.value = echo; g.connect(e); e.connect(this.echo); }
    return g;
  };
  M.voice = function (name, midi, t, dur, vol, echo) {
    var ac = this.ac, f = freq(midi), g = this.out(vol, echo), end, g2, flt;
    if (name === 'marimba') {   // 木琴：基音＋很快消失的高泛音
      end = decay(g, t, 1, 0.45);
      this.osc('sine', f, t, end, g);
      g2 = ac.createGain(); g2.connect(g); decay(g2, t, 0.25, 0.08); this.osc('sine', f * 4, t, end, g2);
    } else if (name === 'steel') {   // 鋼鼓：幾個泛音、亮亮的
      end = decay(g, t, 1, 0.7);
      this.osc('sine', f, t, end, g);
      g2 = ac.createGain(); g2.connect(g); decay(g2, t, 0.35, 0.3); this.osc('sine', f * 2, t, end, g2);
      var g3 = ac.createGain(); g3.connect(g); decay(g3, t, 0.12, 0.15); this.osc('sine', f * 3.01, t, end, g3);
    } else if (name === 'pluck') {   // 撥弦（琶音用）
      flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.connect(g);
      flt.frequency.setValueAtTime(3500, t); flt.frequency.exponentialRampToValueAtTime(600, t + 0.2);
      end = decay(g, t, 1, Math.min(0.3, dur + 0.1));
      this.osc('sawtooth', f, t, end, flt);
    } else if (name === 'synth') {   // 合成器主旋律：兩個鋸齒波稍微走音疊在一起
      flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 2200; flt.connect(g);
      end = env(g, t, 0.015, 1, dur * 0.9, 0.18);
      this.osc('sawtooth', f, t, end, flt); this.osc('sawtooth', f * 1.006, t, end, flt);
    } else if (name === 'brass') {   // 銅管：濾波器一開一收
      flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 2; flt.connect(g);
      flt.frequency.setValueAtTime(500, t); flt.frequency.exponentialRampToValueAtTime(2600, t + 0.05);
      flt.frequency.exponentialRampToValueAtTime(1300, t + 0.3);
      end = env(g, t, 0.025, 1, dur * 0.85, 0.12);
      this.osc('sawtooth', f, t, end, flt); this.osc('sawtooth', f * 1.004, t, end, flt);
    } else if (name === 'soft') {   // 柔和短音
      end = decay(g, t, 1, Math.min(0.25, dur + 0.08));
      this.osc('triangle', f, t, end, g);
    } else if (name === 'skank') {   // 反拍吉他：短短的、偏亮
      flt = ac.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1500; flt.Q.value = 0.8; flt.connect(g);
      end = decay(g, t, 1, 0.14);
      this.osc('square', f, t, end, flt);
    } else if (name === 'pad') {   // 長和弦：慢慢浮出來
      flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 900; flt.connect(g);
      end = env(g, t, 0.3, 1, dur, 0.4);
      this.osc('sawtooth', f, t, end, flt); this.osc('sawtooth', f * 1.008, t, end, flt);
    } else if (name === 'pluckbass') {   // 彈跳低音
      end = decay(g, t, 1, Math.min(0.35, dur + 0.1));
      this.osc('triangle', f, t, end, g); this.osc('sine', f / 2, t, end, g);
    } else if (name === 'synthbass') {   // 電子低音
      flt = ac.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 4; flt.connect(g);
      flt.frequency.setValueAtTime(1200, t); flt.frequency.exponentialRampToValueAtTime(250, t + 0.15);
      end = env(g, t, 0.005, 1, dur * 0.7, 0.06);
      this.osc('sawtooth', f, t, end, flt);
    } else {   // roundbass：圓潤低音
      end = env(g, t, 0.01, 1, dur * 0.8, 0.1);
      this.osc('triangle', f, t, end, g); this.osc('sine', f, t, end, g);
    }
  };

  // ---------- 鼓 ----------
  M.noiseHit = function (t, vol, type, fq, q, len) {
    var s = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = fq; if (q) f.Q.value = q;
    s.connect(f); f.connect(g); g.connect(this.master);
    decay(g, t, vol, len); s.start(t); s.stop(t + len + 0.05);
  };
  M.kick = function (t, vol) {
    var o = this.ac.createOscillator(), g = this.ac.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(decay(g, t, vol * 1.6, 0.22));
  };
  M.snare = function (t, vol) {
    this.noiseHit(t, vol, 'bandpass', 2200, 0.7, 0.16);
    var o = this.ac.createOscillator(), g = this.ac.createGain();
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(decay(g, t, vol * 0.6, 0.1));
  };
  M.clap = function (t, vol) {   // 拍手：三下很快的噪音
    for (var i = 0; i < 3; i++) this.noiseHit(t + i * 0.012, vol * (i === 2 ? 1 : 0.6), 'bandpass', 1300, 1.2, i === 2 ? 0.18 : 0.02);
  };
  M.rim = function (t, vol) {   // 鼓框：短促的「喀」
    this.noiseHit(t, vol * 0.5, 'highpass', 3000, 0, 0.03);
    var o = this.ac.createOscillator(), g = this.ac.createGain();
    o.frequency.value = 820; o.connect(g); g.connect(this.master); o.start(t); o.stop(decay(g, t, vol * 0.5, 0.05));
  };
  M.hat = function (t, vol, open) { this.noiseHit(t, vol * 0.5, 'highpass', 7000, 0, open ? 0.22 : 0.05); };

  GripMusic.SONGS = SONGS;
  GripMusic.compile = compile;
  root.GripMusic = GripMusic;
  if (typeof module !== 'undefined' && module.exports) module.exports = GripMusic;
})(typeof window !== 'undefined' ? window : this);
