// Test harness: runs a Walkie-Talkie app folder in a separate Electron 44.7.0 with its own userData
// (so it doesn't hit the installed program's single-instance lock and doesn't touch its settings).
//
// Automatic test: fake microphone, joins a channel, writes connection stats to a JSON file every 2 s
// (pair of ICE candidates, relay or not, audio bytes, the "Связь" legend), quits after --secs.
//   electron.exe <this dir> --app=<app dir> --data=<userData dir> --code=<channel> --name=<name>
//     --out=<result.json> [--secs=60] [--relay=1] [--icefile=<ice.json> [--tcp=1]] [--fetchtest=1]
//   --relay=1    connect only through the TURN server (iceTransportPolicy: 'relay')
//   --icefile    use this TURN list instead of the built-in one; --tcp=1 keeps only its TCP addresses
//   --fetchtest  check that the page can download from raw.githubusercontent.com and jsdelivr
//   --do=<sec>:<script.js>  (repeatable) run a script in the page <sec> s after joining; it may await
//                and `return` a value (goes to the log). window.__racia = { st, settings, members, rms, chat }
//   --shot=<png> a picture of the window just before quitting; --size=1400x860 sets the window size
//   --theme=holo|deep|solar, --lang=ru|en
// The JSON also has "chat": what the chat panel holds (names, texts, pictures, edits, reactions…).
//
// Manual check: the real microphone, nothing automatic — the owner tries the new version by hand.
//   electron.exe <this dir> --app=<app dir> --data=<userData dir> --manual=1 [--label=2] [--fakemic=1]
'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const APPDIR = arg('app'), DATA = arg('data'), CODE = arg('code'), NAME = arg('name', 'Test');
const MANUAL = arg('manual', '0') === '1';
const RELAY = arg('relay', '0') === '1', SECS = +arg('secs', '60'), OUT = arg('out', path.join(DATA, 'result.json'));
const LOG = OUT.replace(/\.json$/, '.log');
fs.mkdirSync(DATA, { recursive: true });
fs.writeFileSync(LOG, '');
const log = (s) => fs.appendFileSync(LOG, new Date().toISOString().slice(11, 19) + ' ' + s + '\n');

app.setPath('userData', DATA);
// --fakemic=1 in the manual mode: a second test window that doesn't pick up the room (no echo)
if (!MANUAL || arg('fakemic') === '1') {
  app.commandLine.appendSwitch('use-fake-device-for-media-stream');
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
}
// Leave the real system alone: the racia:// links stay with the installed program.
app.setAsDefaultProtocolClient = () => true;
// Open the page with ?debug so window.__racia (st, members) is reachable.
app.on('web-contents-created', (e, wc) => {
  const orig = wc.loadFile.bind(wc);
  wc.loadFile = (p, o) => orig(p, Object.assign({}, o, { query: { debug: '1' } }));
  wc.on('console-message', (ev) => log('console: ' + (ev.message || '')));
});

require(path.join(APPDIR, 'loader.js'));
log('userData = ' + app.getPath('userData') + ', relay-only = ' + RELAY);

const STATS = `(async () => {
  const R = window.__racia; if (!R) return { err: 'no __racia' };
  const st = R.st;
  const out = { inCall: st.inCall, turnOn: st.turnOn, joinErr: st.joinErr || '', members: [...R.members.values()].map((m) => m.name), peers: [] };
  const peers = st.room && st.room.getPeers ? st.room.getPeers() : {};
  for (const [id, pc] of Object.entries(peers)) {
    const rep = await pc.getStats();
    const c = new Map(); let pairId = null, aIn = 0, aOut = 0;
    rep.forEach((r) => {
      if (r.type === 'local-candidate' || r.type === 'remote-candidate') c.set(r.id, r);
      if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId;
      if (r.type === 'inbound-rtp' && r.kind === 'audio') aIn += r.bytesReceived || 0;
      if (r.type === 'outbound-rtp' && r.kind === 'audio') aOut += r.bytesSent || 0;
    });
    const p = pairId ? rep.get(pairId) : null;
    const cand = (x) => x && { type: x.candidateType, protocol: x.protocol, relayProtocol: x.relayProtocol, url: x.url };
    const cfg = pc.getConfiguration();
    out.peers.push({
      name: (R.members.get(id) || {}).name, state: pc.connectionState, policy: cfg.iceTransportPolicy,
      turnUrls: cfg.iceServers.flatMap((s) => [].concat(s.urls)).filter((u) => /^turns?:/.test(u)),
      local: cand(p && c.get(p.localCandidateId)), remote: cand(p && c.get(p.remoteCandidateId)),
      audioInBytes: aIn, audioOutBytes: aOut, shownRelay: (st.net.get(id) || {}).relay
    });
  }
  const nb = document.querySelector('#netBtn'), np = document.querySelector('#netPanel');
  if (nb && np && np.hidden) nb.click();
  const lg = document.querySelector('#netLegend');
  out.legend = lg ? lg.innerText : '';
  const ch = R.chat;
  if (ch) out.chat = { open: ch.open, unread: ch.unread, mention: ch.mention,
    old: (document.querySelector('#chatOld') || {}).innerText || '', why: (document.querySelector('#chatWhy') || {}).innerText || '',
    msgs: ch.msgs.map((m) => ({ name: m.name, text: m.text, img: m.img ? (m.img.url ? 'live' : 'gone') : '', del: m.del, edited: !!m.ed,
      re: m.re ? m.re.name : '', rx: Object.fromEntries(Object.entries(m.rx).map(([k, v]) => [k, Object.values(v)])), ment: !!m.ment, failed: !!m.failed })) };
  return out;
})()`;

// The test copy must not be mistaken for the installed program.
if (MANUAL) {
  app.on('browser-window-created', (e, w) => {
    const title = 'Walkie-Talkie — ТЕСТОВАЯ КОПИЯ' + (arg('label') ? ' ' + arg('label') : '');
    w.setTitle(title);
    w.on('page-title-updated', (ev) => { ev.preventDefault(); w.setTitle(title); });
  });
}

app.whenReady().then(() => {
  if (MANUAL) return;
  let stage = 0;
  const tick = setInterval(async () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (!w || w.webContents.isLoading()) return;
    const wc = w.webContents;
    try {
      if (stage === 0) {
        stage = 1;
        // --icefile=<ice.json> [--tcp=1]: use this TURN list (only its TCP addresses, as if UDP were blocked)
        let ice = '';
        if (arg('icefile')) {
          const v = JSON.parse(fs.readFileSync(arg('icefile'), 'utf8'));
          if (arg('tcp') === '1') v.turn.forEach((s) => { s.urls = s.urls.filter((u) => /transport=tcp/.test(u)); });
          ice = `localStorage.setItem('racia-ice', ${JSON.stringify(JSON.stringify(v))});`;
        }
        // --theme=holo|deep|solar, --lang=ru|en
        const prefs = {};
        if (arg('theme')) prefs.theme = arg('theme');
        if (arg('lang')) prefs.lang = arg('lang');
        const setPrefs = Object.keys(prefs).length
          ? `localStorage.setItem('racia-settings', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('racia-settings') || '{}'), ${JSON.stringify(prefs)})));` : '';
        // --size=1400x860
        const size = /^(\d+)x(\d+)$/.exec(arg('size', ''));
        if (size) w.setSize(+size[1], +size[2]);
        await wc.executeJavaScript(`localStorage.setItem('racia-relay-only', '${RELAY ? 1 : 0}'); ${ice} ${setPrefs} location.reload(); true`);
        return;
      }
      if (stage === 1) {
        stage = 2;
        await new Promise((r) => setTimeout(r, 1500));
        await wc.executeJavaScript(`(() => { document.querySelector('#name').value = ${JSON.stringify(NAME)};
          document.querySelector('#room').value = ${JSON.stringify(CODE)};
          document.querySelector('#joinView').requestSubmit(); return true; })()`);
        log('join submitted');
        if (arg('fetchtest') === '1') {
          const r = await wc.executeJavaScript(`(async () => {
            const out = [];
            for (const u of ['https://raw.githubusercontent.com/pashok3345u-netizen/walkie-talkie/main/update.json',
                             'https://cdn.jsdelivr.net/gh/pashok3345u-netizen/walkie-talkie@main/update.json']) {
              try { const r = await fetch(u + '?t=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
                    const j = await r.json(); out.push(u.split('/')[2] + ' -> ' + r.status + ', version ' + j.version); }
              catch (e) { out.push(u.split('/')[2] + ' -> FAIL ' + e.message); }
            }
            return out.join(' | ');
          })()`);
          log('fetchtest: ' + r);
        }
        // --do=<seconds after joining>:<script.js> (any number): run the script in the page;
        // it may use await and `return` a value, which goes to the log.
        for (const a of process.argv.filter((x) => x.startsWith('--do='))) {
          const [, sec, file] = /^--do=(\d+(?:\.\d+)?):(.+)$/.exec(a) || [];
          if (!file) continue;
          setTimeout(async () => {
            try {
              const r = await wc.executeJavaScript('(async () => {\n' + fs.readFileSync(file, 'utf8') + '\n})()');
              log('do ' + path.basename(file) + ': ' + JSON.stringify(r));
            } catch (e) { log('do ' + path.basename(file) + ' FAILED: ' + (e && e.message)); }
          }, +sec * 1000);
        }
        setTimeout(async () => {
          // --shot=<png>: a picture of the window just before quitting
          if (arg('shot')) {
            try { fs.writeFileSync(arg('shot'), (await wc.capturePage()).toPNG()); log('shot saved'); }
            catch (e) { log('shot FAILED: ' + (e && e.message)); }
          }
          try { fs.writeFileSync(OUT, JSON.stringify(await wc.executeJavaScript(STATS), null, 1)); } catch (e) {}
          log('done'); app.exit(0);
        }, SECS * 1000);
        return;
      }
      const res = await wc.executeJavaScript(STATS);
      fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
    } catch (e) { log('error: ' + (e && e.message)); }
  }, 2000);
});
