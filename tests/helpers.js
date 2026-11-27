// 測試共用工具：假畫布（所有繪圖指令都接受但不畫）、記憶體存檔、可重現的亂數、簡單斷言
'use strict';

// 假的 2D context：任何方法都能呼叫，屬性可以設定；measureText 回傳大約的寬度
function mockContext() {
  var store = {};
  var gradient = { addColorStop: function () { } };
  return new Proxy(store, {
    get: function (t, k) {
      if (k in t) return t[k];
      if (k === 'measureText') return function (s) { return { width: String(s).length * 10 }; };
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return function () { return gradient; };
      if (k === 'getImageData' || k === 'createImageData') return function (x, y, w, h) { return { width: w || 1, height: h || 1, data: new Uint8ClampedArray(4 * (w || 1) * (h || 1)) }; };
      if (k === 'getTransform') return function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; };
      if (k === 'canvas') return mockCanvas(960, 720);
      return function () { };
    },
    set: function (t, k, v) { t[k] = v; return true; }
  });
}
function mockCanvas(w, h) {
  var ctx = null;
  return { width: w, height: h, getContext: function () { return ctx || (ctx = mockContext()); } };
}
function memStorage() { var v = null; return { get: function () { return v; }, set: function (s) { v = s; } }; }
function seededRandom(seed) {
  var a = seed | 0;
  return function () {
    a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var failures = 0;
function ok(cond, msg) { console.log((cond ? 'OK  ' : 'FAIL') + ' ' + msg); if (!cond) failures++; }
function done() { process.exitCode = failures ? 1 : 0; }

module.exports = { mockContext: mockContext, mockCanvas: mockCanvas, memStorage: memStorage, seededRandom: seededRandom, ok: ok, done: done };
