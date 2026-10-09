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
//
// Manual check: the real microphone, nothing automatic — the owner tries the new version by hand.
//   electron.exe <this dir> --app=<app dir> --data=<userData dir> --manual=1
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
if (!MANUAL) {
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
  return out;
})()`;

// The test copy must not be mistaken for the installed program.
if (MANUAL) {
  app.on('browser-window-created', (e, w) => {
    const title = 'Walkie-Talkie — ТЕСТОВАЯ КОПИЯ';
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
        await wc.executeJavaScript(`localStorage.setItem('racia-relay-only', '${RELAY ? 1 : 0}'); ${ice} location.reload(); true`);
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
        setTimeout(() => { log('done'); app.exit(0); }, SECS * 1000);
        return;
      }
      const res = await wc.executeJavaScript(STATS);
      fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
    } catch (e) { log('error: ' + (e && e.message)); }
  }, 2000);
});
