// Мостик между страницей Рации и программой: только эти несколько функций, ничего больше.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('racia', {
  isApp: true,
  platform: process.platform,
  hotkeysSupported: process.platform === 'win32',
  loopbackAudio: process.platform === 'win32',
  keysState: () => ipcRenderer.invoke('racia:keys-state'),
  setHotkeys: (w) => ipcRenderer.send('racia:set-hotkeys', { ptt: Number(w && w.ptt) | 0, mute: Number(w && w.mute) | 0 }),
  captureKey: () => ipcRenderer.invoke('racia:capture'),
  cancelCapture: () => ipcRenderer.send('racia:cancel-capture'),
  onHotkey: (fn) => { ipcRenderer.on('racia:hotkey', (e, name, down) => fn(String(name), !!down)); },
  onKeysFailed: (fn) => { ipcRenderer.on('racia:keys-failed', () => fn()); },
  getSources: () => ipcRenderer.invoke('racia:sources'),
  chooseSource: (id, audio) => ipcRenderer.invoke('racia:choose', String(id), !!audio),
  info: () => ipcRenderer.invoke('racia:info'),
  idleTime: () => ipcRenderer.invoke('racia:idle'),
  updateState: () => ipcRenderer.invoke('racia:update-state'),
  checkUpdate: () => ipcRenderer.invoke('racia:update-check'),
  restartToUpdate: () => ipcRenderer.send('racia:update-restart'),
  onUpdate: (fn) => { ipcRenderer.on('racia:update', (e, s) => fn(s)); },
  googleLogin: (lang) => ipcRenderer.invoke('racia:google-login', lang === 'en' ? 'en' : 'ru'),
  cancelGoogleLogin: () => ipcRenderer.send('racia:google-cancel'),
  flash: () => ipcRenderer.send('racia:flash'),
  notify: (n) => ipcRenderer.send('racia:notify', { tag: String((n && n.tag) || ''), title: String((n && n.title) || ''), body: String((n && n.body) || ''), icon: n && typeof n.icon === 'string' && n.icon.length < 300000 ? n.icon : '' }),
  closeNotify: (tag) => ipcRenderer.send('racia:notify-close', String(tag || '')),
  processes: () => ipcRenderer.invoke('racia:procs'),
  windows: () => ipcRenderer.invoke('racia:apps'),
  pendingLink: () => ipcRenderer.invoke('racia:pending-link'),
  onLink: (fn) => { ipcRenderer.on('racia:link', (e, l) => fn(String(l))); }
});
