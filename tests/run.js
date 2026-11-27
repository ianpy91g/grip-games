// 執行全部測試：node tests/run.js
// 1. 每個 .js 檔做語法檢查  2. 依序執行 tests/ 裡的 *_test.js，任何一個失敗就以非 0 結束
'use strict';
var fs = require('fs'), path = require('path'), cp = require('child_process');
var root = path.join(__dirname, '..'), failed = 0;

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (n) {
    if (n === '.git' || n === 'node_modules') return;
    var p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.js$/.test(n)) out.push(p);
  });
  return out;
}

console.log('== 語法檢查');
walk(root, []).forEach(function (f) {
  var r = cp.spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { failed++; console.log('FAIL ' + path.relative(root, f) + '\n' + r.stderr); }
});
console.log(failed ? '語法錯誤 ' + failed + ' 個' : 'OK   全部 .js 語法正確');

fs.readdirSync(__dirname).filter(function (n) { return /_test\.js$/.test(n); }).sort().forEach(function (n) {
  console.log('\n== ' + n);
  var r = cp.spawnSync(process.execPath, [path.join(__dirname, n)], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.log('>> ' + n + ' 失敗'); }
});
console.log(failed ? '\n有 ' + failed + ' 項失敗' : '\n全部通過');
process.exitCode = failed ? 1 : 0;
