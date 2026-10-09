// Рация — программа для Windows (Electron).
// Окно с той же страницей, что и racia.html, плюс то, чего браузер не умеет:
//  • клавиши рации и микрофона работают, даже когда ты в игре (помощник RaciaKeys.exe);
//  • свой выбор экрана или окна для стрима, со звуком компьютера;
//  • обновляется сама (updater.js), запускает её loader.js.
'use strict';
const { app, BrowserWindow, session, desktopCapturer, ipcMain, Menu, nativeTheme, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');
const http = require('http');
const crypto = require('crypto');

app.setName('Racia');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Звонок должен работать и когда окно спрятано за игрой.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

let win = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (e, argv) => {
    const link = findLink(argv);
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    if (link) sendLink(link);
  });
  app.whenReady().then(start);
}

// Ссылки racia://join/КОД и racia://msg/чат/сообщение открывают Рацию.
let pendingLink = findLink(process.argv);
function findLink(argv) { return (argv || []).find((a) => /^racia:\/\//i.test(String(a))) || null; }
function sendLink(link) {
  if (!/^racia:\/\/[A-Za-z0-9/_-]{1,200}$/.test(link)) return;
  if (win && !win.webContents.isLoading()) win.webContents.send('racia:link', link);
  else pendingLink = link;
}
ipcMain.handle('racia:pending-link', () => { const l = pendingLink; pendingLink = null; return l; });

function start() {
  if (process.platform === 'win32') app.setAppUserModelId('ICEING.Racia');
  try {
    if (process.defaultApp) app.setAsDefaultProtocolClient('racia', process.execPath, [path.resolve(process.argv[1] || '.')]);
    else app.setAsDefaultProtocolClient('racia');
  } catch (e) {}
  Menu.setApplicationMenu(null);
  setupSession(session.defaultSession);
  createWindow();
  startKeys();
  require('./updater')(() => win);
}

const R = global.racia || { version: 0, base: __dirname, markReady() {} };
ipcMain.handle('racia:info', () => ({ version: R.version }));
// Мигнуть значком на панели задач (новое сообщение).
ipcMain.on('racia:flash', () => { if (win && !win.isFocused()) win.flashFrame(true); });
app.on('browser-window-focus', () => { if (win) win.flashFrame(false); });

// ---------- вход через Google ----------
// Google не пускает входить из окон внутри программ, поэтому вход идёт в обычном браузере:
// Рация на минуту поднимает страничку на этом компьютере (http://localhost:порт), там кнопка
// «Войти через Google». После входа страничка отдаёт Рации одноразовый пропуск Google — и всё.
const FIREBASE = {
  apiKey: 'AIzaSyDzTTuY3UaO7HyjnpWmKYiyKwhYnhy_nF0',
  authDomain: 'walkie-talkie-01.firebaseapp.com',
  projectId: 'walkie-talkie-01',
  appId: '1:111055131729:web:67f98376c8693498189470'
};
const FB_SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
let login = null; // { server, state, resolve, reject, timer }
function finishLogin(err, cred) {
  const l = login; login = null;
  if (!l) return;
  clearTimeout(l.timer);
  setTimeout(() => { try { l.server.close(); } catch (e) {} if (l.server6) { try { l.server6.close(); } catch (e) {} } }, 1500);
  if (err) l.reject(err); else l.resolve(cred);
}
const LOGIN_TEXT = {
  ru: { title: 'Walkie-Talkie — вход', h: 'Вход в Walkie-Talkie', p: 'Нажми кнопку и выбери свой Google-аккаунт.', btn: 'Войти через Google',
    rejected: 'Walkie-Talkie не принял вход. Нажми «Войти» в программе ещё раз.', done: 'Готово! Возвращайся в Walkie-Talkie, эту вкладку можно закрыть.',
    blocked: 'Браузер заблокировал окно входа — разреши всплывающие окна для этой страницы.', closed: 'Окно входа закрыли. Нажми кнопку ещё раз.',
    domain: 'В Firebase не разрешён адрес localhost (Authentication → Settings → Authorized domains).', failed: 'Не получилось:' },
  en: { title: 'Walkie-Talkie — sign in', h: 'Sign in to Walkie-Talkie', p: 'Press the button and pick your Google account.', btn: 'Sign in with Google',
    rejected: 'Walkie-Talkie did not accept the sign-in. Press “Sign in” in the app again.', done: 'Done! Go back to Walkie-Talkie, you can close this tab.',
    blocked: 'The browser blocked the sign-in window — allow pop-ups for this page.', closed: 'The sign-in window was closed. Press the button again.',
    domain: 'Firebase does not allow localhost (Authentication → Settings → Authorized domains).', failed: 'Failed:' }
};
function loginPage(state, lang) {
  const T = LOGIN_TEXT[lang] || LOGIN_TEXT.ru;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${T.title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#141612;color:#e6e9df;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
.box{max-width:420px;padding:32px;border:1px solid #31362c;border-radius:18px;background:#1d201a;text-align:center}
h1{margin:0 0 8px;font-size:1.5rem}p{color:#8f978a;margin:0 0 20px}
button{font:inherit;font-weight:600;padding:14px 20px;border-radius:10px;border:0;background:#f08a3c;color:#1c1006;cursor:pointer}
button:disabled{opacity:.6}.err{color:#ef6a5a;margin-top:16px}</style></head>
<body><div class="box"><h1>${T.h}</h1><p id="t">${T.p}</p>
<button id="go">${T.btn}</button><div class="err" id="err"></div></div>
<script type="module">
import { initializeApp } from '${FB_SDK}firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, inMemoryPersistence, setPersistence } from '${FB_SDK}firebase-auth.js';
const auth = getAuth(initializeApp(${JSON.stringify(FIREBASE)}));
const go = document.getElementById('go'), t = document.getElementById('t'), err = document.getElementById('err');
const T = ${JSON.stringify(T)};
go.onclick = async () => {
  go.disabled = true; err.textContent = '';
  try {
    await setPersistence(auth, inMemoryPersistence);
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    const r = await signInWithPopup(auth, p);
    const c = GoogleAuthProvider.credentialFromResult(r);
    const res = await fetch('/done?s=${state}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: c.idToken, accessToken: c.accessToken }) });
    if (!res.ok) throw new Error(T.rejected + ' (' + res.status + ')');
    await signOut(auth);
    go.remove(); t.textContent = T.done;
  } catch (e) {
    go.disabled = false;
    err.textContent = e && e.code === 'auth/popup-blocked' ? T.blocked
      : e && e.code === 'auth/popup-closed-by-user' ? T.closed
      : e && e.code === 'auth/unauthorized-domain' ? T.domain
      : T.failed + ' ' + ((e && e.message) || e);
  }
};
</script></body></html>`;
}
ipcMain.handle('racia:google-login', (e, lang) => new Promise((resolve, reject) => {
  if (login) finishLogin(new Error('restart'));
  const state = crypto.randomBytes(16).toString('hex');
  const handler = (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET' && u.pathname === '/' && u.searchParams.get('s') === state) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(loginPage(state, lang === 'en' ? 'en' : 'ru'));
      return;
    }
    if (req.method === 'POST' && u.pathname === '/done' && u.searchParams.get('s') === state) {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy(); });
      req.on('end', () => {
        let d = null;
        try { d = JSON.parse(body); } catch (e) {}
        if (!d || typeof d.idToken !== 'string' || d.idToken.length > 8000) { res.writeHead(400); res.end(); return; }
        res.writeHead(200); res.end('ok');
        if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
        finishLogin(null, { idToken: d.idToken, accessToken: typeof d.accessToken === 'string' ? d.accessToken : null });
      });
      return;
    }
    res.writeHead(404); res.end();
  };
  const server = http.createServer(handler);
  server.on('error', (e) => finishLogin(e));
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    // Браузер может сначала пойти на ::1 — слушаем и его, если получится.
    const server6 = http.createServer(handler);
    server6.on('error', () => {});
    try { server6.listen(port, '::1'); } catch (e) {}
    login = { server, server6, state, resolve, reject, timer: setTimeout(() => finishLogin(new Error('timeout')), 5 * 60 * 1000) };
    shell.openExternal('http://localhost:' + port + '/?s=' + state);
  });
}));
ipcMain.on('racia:google-cancel', () => finishLogin(new Error('cancel')));
// Сколько секунд к компьютеру никто не прикасался — для статуса «неактивен».
ipcMain.handle('racia:idle', () => { try { return powerMonitor.getSystemIdleTime(); } catch (e) { return null; } });

app.on('before-quit', () => { quitting = true; stopKeys(); });
app.on('window-all-closed', () => app.quit());

function createWindow() {
  // Иконка Walkie-Talkie (WT). racia.ico — запасная, для старых ярлыков.
  const icon = [path.join(__dirname, 'wt.ico'), path.join(__dirname, 'racia.ico')].find((p) => fs.existsSync(p));
  win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 380,
    minHeight: 520,
    title: 'Walkie-Talkie',
    icon,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#06010F' : '#F2EFFA',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false
    }
  });
  win.once('ready-to-show', () => win.show());
  // Страница открылась — значит, эта версия рабочая (см. loader.js).
  win.webContents.once('did-finish-load', () => { try { R.markReady(); } catch (e) {} });
  win.on('focus', () => win.flashFrame(false));
  win.on('closed', () => { win = null; });

  // Внутри окна — только сама Рация. Любые ссылки открываются в обычном браузере.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) {
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  // F12 / Ctrl+Shift+I — консоль разработчика (пригодится, если что-то сломается). Ctrl+R — перезагрузить.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12' || (input.control && input.shift && input.code === 'KeyI')) {
      win.webContents.toggleDevTools(); e.preventDefault();
    } else if (input.control && !input.shift && input.code === 'KeyR') {
      win.webContents.reload(); e.preventDefault();
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

// ---------- разрешения и показ экрана ----------
const ALLOWED = new Set(['media', 'display-capture', 'fullscreen', 'clipboard-sanitized-write', 'speaker-selection']);
let chosen = null; // { id, audio, at } — что выбрали в окне выбора экрана

function setupSession(ses) {
  ses.setPermissionRequestHandler((wc, permission, callback) => callback(ALLOWED.has(permission)));
  ses.setPermissionCheckHandler((wc, permission) => ALLOWED.has(permission));
  ses.setDisplayMediaRequestHandler((request, callback) => {
    const pick = chosen; chosen = null;
    if (!pick || Date.now() - pick.at > 30000) { callback(null); return; }
    desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } })
      .then((sources) => {
        const src = sources.find((s) => s.id === pick.id);
        if (!src) { callback(null); return; }
        const res = { video: src };
        // Звук всего компьютера есть только в Windows.
        if (pick.audio && request.audioRequested && process.platform === 'win32') res.audio = 'loopback';
        callback(res);
      })
      .catch(() => callback(null));
  }, { useSystemPicker: false });
}

ipcMain.handle('racia:sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 400, height: 225 },
    fetchWindowIcons: true
  });
  const ownTitle = win ? win.getTitle() : '';
  const screens = sources.filter((s) => s.id.startsWith('screen'));
  return sources
    .filter((s) => s.name && !(s.id.startsWith('window') && s.name === ownTitle))
    .map((s) => {
      const isScreen = s.id.startsWith('screen');
      return {
        id: s.id,
        type: isScreen ? 'screen' : 'window',
        name: isScreen ? (screens.length > 1 ? 'Экран ' + (screens.indexOf(s) + 1) : 'Весь экран') : s.name,
        thumb: s.thumbnail && !s.thumbnail.isEmpty() ? s.thumbnail.toDataURL() : '',
        icon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : ''
      };
    });
});
ipcMain.handle('racia:choose', (e, id, audio) => {
  chosen = { id: String(id || ''), audio: !!audio, at: Date.now() };
  return true;
});

// ---------- клавиши поверх игр ----------
// RaciaKeys.exe собирает установщик. Его нет — клавиши работают только в окне Рации.
let keys = null;          // процесс-помощник
let keysOk = false;
let keysState = process.platform === 'win32' ? 'starting' : 'failed';
let keysFails = 0;
let watch = { ptt: 0, mute: 0 };
let captureWaiter = null; // ждёт нажатия при назначении клавиши
// Свежий помощник из обновления, иначе тот, что собрал установщик.
const keysExe = [path.join(__dirname, 'RaciaKeys.exe'), path.join(R.base || __dirname, 'RaciaKeys.exe')].find((p) => fs.existsSync(p)) || path.join(__dirname, 'RaciaKeys.exe');

function startKeys() {
  if (process.platform !== 'win32' || quitting) return;
  if (!fs.existsSync(keysExe)) { keysFailed(); return; }
  let p;
  try {
    p = spawn(keysExe, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (e) { keysFailed(); return; }
  keys = p;
  p.on('error', () => {});
  p.stdin.on('error', () => {});
  const rl = readline.createInterface({ input: p.stdout });
  rl.on('line', (line) => {
    const [cmd, num] = line.trim().split(/\s+/);
    const vk = Number(num) | 0;
    if (cmd === 'ready') { keysOk = true; keysFails = 0; keysState = 'ok'; sendWatch(); return; }
    if (cmd === 'captured') { finishCapture({ vk }); return; }
    if (cmd === 'down' || cmd === 'up') {
      for (const name of ['ptt', 'mute']) {
        if (watch[name] && watch[name] === vk && win) win.webContents.send('racia:hotkey', name, cmd === 'down');
      }
    }
  });
  p.on('exit', () => {
    if (keys === p) keys = null;
    keysOk = false;
    finishCapture(null);
    if (quitting) return;
    keysFails++;
    if (keysFails <= 5) setTimeout(startKeys, 1500 * keysFails);
    else keysFailed();
  });
}
function keysFailed() {
  keysState = 'failed';
  if (win) win.webContents.send('racia:keys-failed');
}
ipcMain.handle('racia:keys-state', () => keysState);
function stopKeys() {
  if (!keys) return;
  try { keys.stdin.end(); } catch (e) {}
  const p = keys; keys = null;
  setTimeout(() => { try { p.kill(); } catch (e) {} }, 500);
}
function tell(line) {
  if (keys && keysOk) { try { keys.stdin.write(line + '\n'); } catch (e) {} }
}
function sendWatch() { tell('watch ' + [watch.ptt, watch.mute].filter((v) => v > 0).join(' ')); }
function finishCapture(result) {
  const w = captureWaiter; captureWaiter = null;
  if (!w) return;
  clearTimeout(w.timer);
  // Esc — отмена, Backspace — убрать клавишу.
  if (result && result.vk === 0x1B) result = null;
  else if (result && result.vk === 0x08) result = { vk: 0 };
  w.resolve(result);
}

ipcMain.on('racia:set-hotkeys', (e, w) => {
  watch = { ptt: Number(w && w.ptt) | 0, mute: Number(w && w.mute) | 0 };
  sendWatch();
});
ipcMain.handle('racia:capture', () => new Promise((resolve) => {
  finishCapture(null);
  if (!keys || !keysOk) { resolve(null); return; }
  captureWaiter = { resolve, timer: setTimeout(() => { tell('cancel'); finishCapture(null); }, 15000) };
  tell('capture');
}));
ipcMain.on('racia:cancel-capture', () => { tell('cancel'); finishCapture(null); });
