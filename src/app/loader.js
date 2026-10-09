// Рация — запуск. Этот файл ставится один раз и не обновляется.
// Он выбирает, какую версию Рации запустить: ту, что пришла с установщиком,
// или самую новую скачанную обновлением (%APPDATA%\Racia\updates\<номер>).
// Скачанная версия запускается, только если все её файлы целы (сверяются по SHA-256).
// Если новая версия не смогла открыть окно, при следующем запуске Рация вернётся на прошлую.
'use strict';
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

app.setName('Racia');

const BASE = __dirname;
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } };
const bundled = readJson(path.join(BASE, 'version.json'), { version: 0 });
const UPD = path.join(app.getPath('userData'), 'updates');
const STATE = path.join(UPD, 'state.json');

function cmpVer(a, b) {
  const x = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const y = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  }
  return 0;
}
function engineOk(min) { return !min || cmpVer(process.versions.electron, min) >= 0; }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function checkDir(dir) {
  const m = readJson(path.join(dir, 'manifest.json'), null);
  if (!m || !m.files || typeof m.files !== 'object') return null;
  for (const name of Object.keys(m.files)) {
    if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
    const f = path.join(dir, name);
    if (!fs.existsSync(f) || sha256(f) !== String(m.files[name]).toLowerCase()) return null;
  }
  return m;
}
function saveState(s) {
  try { fs.mkdirSync(UPD, { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s)); } catch (e) {}
}

const state = Object.assign({ bad: [], trying: 0 }, readJson(STATE, {}));
if (!Array.isArray(state.bad)) state.bad = [];
// Прошлый запуск этой версии так и не открыл окно — больше её не запускаем.
if (state.trying) {
  if (!state.bad.includes(state.trying)) state.bad.push(state.trying);
  state.trying = 0;
}

// Все целые скачанные версии новее установленной — от новой к старой.
const candidates = [];
try {
  for (const name of fs.readdirSync(UPD)) {
    if (!/^\d+$/.test(name)) continue;
    const v = parseInt(name, 10);
    if (v <= (bundled.version | 0) || state.bad.includes(v)) continue;
    const dir = path.join(UPD, name);
    const m = checkDir(dir);
    if (m && (m.version | 0) === v && engineOk(m.minEngine)) candidates.push({ version: v, dir });
  }
} catch (e) { /* обновлений ещё нет */ }
candidates.sort((a, b) => b.version - a.version);
candidates.push({ version: bundled.version | 0, dir: BASE });

global.racia = {
  base: BASE,
  dir: BASE,
  version: bundled.version | 0,
  bundledVersion: bundled.version | 0,
  updatesDir: UPD,
  bad: state.bad.slice(),
  engineOk,
  checkDir,
  // Окно открылось — эта версия рабочая.
  markReady() {
    if (!state.trying) return;
    state.trying = 0;
    saveState(state);
  }
};

// Запускаем самую новую. Если её код падает сразу при запуске — помечаем её сломанной
// и перезапускаемся начисто: тогда запустится следующая по новизне.
const pick = candidates[0];
Object.assign(global.racia, { dir: pick.dir, version: pick.version });
state.trying = pick.dir === BASE ? 0 : pick.version;
saveState(state);
try {
  require(path.join(pick.dir, 'main.js'));
} catch (err) {
  if (pick.dir === BASE) throw err;
  state.bad.push(pick.version);
  state.trying = 0;
  saveState(state);
  app.relaunch();
  app.exit(0);
}
