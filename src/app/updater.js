// Рация — обновления.
// Раз в несколько часов смотрит на GitHub, есть ли новая версия (файл update.json),
// скачивает её файлы в %APPDATA%\Racia\updates\<номер>, сверяет каждый по SHA-256
// и предлагает перезапуститься. При следующем запуске новая версия включится сама.
'use strict';
const { app, net, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const CHECK_EVERY = 3 * 60 * 60 * 1000;
const FIRST_CHECK = 8000;

module.exports = function setupUpdater(getWin) {
  const R = global.racia || { version: 0, updatesDir: path.join(app.getPath('userData'), 'updates'), bad: [], engineOk: () => true, checkDir: () => null };
  const cfg = readJson(path.join(__dirname, 'update-source.json'), {});
  const repo = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(cfg.github || '') ? cfg.github : '';
  const branch = /^[A-Za-z0-9._-]+$/.test(cfg.branch || '') ? cfg.branch : 'main';
  const bases = repo ? [
    'https://raw.githubusercontent.com/' + repo + '/' + branch + '/',
    'https://cdn.jsdelivr.net/gh/' + repo + '@' + branch + '/'
  ] : [];

  // state: off | idle | checking | latest | downloading | ready | reinstall | error
  let status = { state: repo ? 'idle' : 'off', version: R.version };
  let busy = false;

  function set(s) {
    status = Object.assign({ version: R.version }, s);
    const w = getWin();
    if (w && !w.isDestroyed()) w.webContents.send('racia:update', status);
  }

  async function check(manual) {
    if (!repo || busy) return status;
    busy = true;
    if (manual) set({ state: 'checking' });
    try {
      let man = null, base = '', lastErr = null;
      for (const b of bases) {
        try {
          man = JSON.parse(await getText(b + 'update.json?t=' + Date.now()));
          base = b;
          break;
        } catch (e) { lastErr = e; }
      }
      if (!man) throw lastErr || new Error('нет связи');
      const v = man.version | 0;
      const notes = String(man.notes || '').slice(0, 300);
      if (v <= R.version || R.bad.includes(v)) { set({ state: 'latest' }); return status; }
      if (!R.engineOk(man.minEngine)) { set({ state: 'reinstall', next: v, notes }); return status; }

      const dest = path.join(R.updatesDir, String(v));
      if (!R.checkDir(dest)) {
        set({ state: 'downloading', next: v, notes });
        await download(man, base, v, dest);
      }
      cleanup(v);
      set({ state: 'ready', next: v, notes });
    } catch (e) {
      set({ state: 'error', error: String((e && e.message) || e).slice(0, 200), manual: !!manual });
    } finally {
      busy = false;
    }
    return status;
  }

  async function download(man, base, v, dest) {
    const files = man.files && typeof man.files === 'object' ? man.files : null;
    if (!files || !files['main.js'] || !files['index.html']) throw new Error('в обновлении не хватает файлов');
    const tmp = dest + '.part';
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    for (const name of Object.keys(files)) {
      if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error('странное имя файла в обновлении');
      const want = String(files[name]).toLowerCase();
      const buf = await getBuffer(base + 'v' + v + '/' + name);
      const got = crypto.createHash('sha256').update(buf).digest('hex');
      if (got !== want) throw new Error('файл ' + name + ' скачался с ошибкой');
      fs.writeFileSync(path.join(tmp, name), buf);
    }
    // Новый помощник для клавиш собираем сразу, иначе берётся тот, что от установщика.
    if (files['RaciaKeys.cs'] && process.platform === 'win32') await compileKeys(tmp);
    fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ version: v, minEngine: man.minEngine || '', files }));
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(tmp, dest);
    if (!R.checkDir(dest)) throw new Error('обновление не прошло проверку');
  }

  function compileKeys(dir) {
    const win = process.env.WINDIR || 'C:\\Windows';
    const csc = [
      path.join(win, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
      path.join(win, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
    ].find((p) => fs.existsSync(p));
    if (!csc) return Promise.resolve();
    return new Promise((resolve) => {
      let p;
      try {
        p = spawn(csc, ['/nologo', '/optimize+', '/target:exe', '/out:' + path.join(dir, 'RaciaKeys.exe'), path.join(dir, 'RaciaKeys.cs')],
          { windowsHide: true, stdio: 'ignore' });
      } catch (e) { resolve(); return; }
      const t = setTimeout(() => { try { p.kill(); } catch (e) {} resolve(); }, 60000);
      p.on('error', () => { clearTimeout(t); resolve(); });
      p.on('exit', () => { clearTimeout(t); resolve(); });
    });
  }

  // Оставляем работающую версию и самую новую, остальное удаляем.
  function cleanup(newest) {
    try {
      for (const name of fs.readdirSync(R.updatesDir)) {
        const full = path.join(R.updatesDir, name);
        if (name.endsWith('.part')) { fs.rmSync(full, { recursive: true, force: true }); continue; }
        if (!/^\d+$/.test(name)) continue;
        const v = parseInt(name, 10);
        if (v !== newest && v !== R.version) fs.rmSync(full, { recursive: true, force: true });
      }
    } catch (e) {}
  }

  ipcMain.handle('racia:update-state', () => status);
  ipcMain.handle('racia:update-check', () => check(true));
  ipcMain.on('racia:update-restart', () => {
    if (status.state !== 'ready') return;
    app.relaunch();
    app.quit();
  });

  if (repo) {
    setTimeout(() => check(false), FIRST_CHECK);
    setInterval(() => check(false), CHECK_EVERY);
  }
};

function readJson(p, d) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } }

async function getResponse(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await net.fetch(url, { cache: 'no-store', signal: ctrl.signal, headers: { 'User-Agent': 'Racia-Updater' } });
    if (!r.ok) throw new Error('сервер ответил ' + r.status);
    return { r, t };
  } catch (e) { clearTimeout(t); throw e; }
}
async function getText(url) {
  const { r, t } = await getResponse(url);
  try { return await r.text(); } finally { clearTimeout(t); }
}
async function getBuffer(url) {
  const { r, t } = await getResponse(url);
  try { return Buffer.from(await r.arrayBuffer()); } finally { clearTimeout(t); }
}
