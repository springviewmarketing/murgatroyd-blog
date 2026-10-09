/* ==========================================================================
   Murgatroyd Opticians blog - two-up banner builder
   --------------------------------------------------------------------------
   Joins two photographs side by side into one landscape header image.

   Why this exists: the blog header is a wide band, so a single portrait
   photograph cannot be used without slicing through the subject's face.
   Putting two pictures side by side gives each one a panel closer to its
   natural shape, so faces stay whole.

   Run it with:   node tools/make-banner.js tools/banner-config.json

   It prints a local address. Open it in a browser, wait for "Finished",
   and the finished banner appears in assets/img/.

   The config file looks like this. "weight" is each panel's share of the
   width, and "focus" is where the crop sits vertically: 0 is the top of the
   photograph, 1 is the bottom, 0.5 is the middle. Lower numbers keep more
   of the top, which is usually where faces are.

   {
     "out": "julia-banner.jpg",
     "panels": [
       { "src": "incoming/DSCF0102.jpg", "weight": 0.588, "focus": 0.20 },
       { "src": "incoming/DSCF9898.jpg", "weight": 0.412, "focus": 0.33 }
     ]
   }

   No installation needed. Plain Node, no add-ons.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4332;

const cfgPath = process.argv[2];
if (!cfgPath || !fs.existsSync(cfgPath)) {
  console.error('\nUsage: node tools/make-banner.js <config.json>\n');
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const WIDTH = cfg.width || 1600;
const ASPECT = cfg.aspect || 1024 / 290;   // same shape as the blog header
const HEIGHT = Math.round(WIDTH / ASPECT);
const GAP = cfg.gap === undefined ? 6 : cfg.gap;
const GAP_COLOUR = cfg.gapColour || '#33cccc';
const QUALITY = cfg.quality || 0.84;

const panels = cfg.panels || [];
if (panels.length < 2) {
  console.error('\nNeed at least two panels in the config.\n');
  process.exit(1);
}

for (const p of panels) {
  const abs = path.join(ROOT, p.src);
  if (!fs.existsSync(abs)) {
    console.error(`\nMissing image: ${p.src}\n`);
    process.exit(1);
  }
}

const page = `<!doctype html><meta charset="utf-8">
<title>Building the banner</title>
<style>
 body{font:15px/1.6 Helvetica,Arial,sans-serif;color:#003366;background:#fff;margin:0;padding:28px}
 h1{font-size:19px;margin:0 0 4px}
 p.sub{margin:0 0 20px;color:#5f7d99}
 li{margin-bottom:7px;list-style:none}
 .ok{color:#1a7f37}.err{color:#b3261e}
 code{background:#f2f6f9;padding:1px 5px}
 #done{margin-top:20px;font-weight:bold}
 #preview{margin-top:18px;max-width:100%;border:1px solid #dbe4ec}
</style>
<h1>Building the banner</h1>
<p class="sub">${WIDTH} by ${HEIGHT} pixels. You can close this tab when it says finished.</p>
<ul id="log"></ul>
<div id="done"></div>
<img id="preview" hidden>
<script>
const cfg = ${JSON.stringify({ panels, WIDTH, HEIGHT, GAP, GAP_COLOUR, QUALITY })};
const log = document.getElementById('log');
const line = (html, cls) => { const li=document.createElement('li'); li.className=cls||''; li.innerHTML=html; log.appendChild(li); return li; };
const load = src => new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error('could not read')); i.src=src; });

(async () => {
  const c = document.createElement('canvas');
  c.width = cfg.WIDTH; c.height = cfg.HEIGHT;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = cfg.GAP_COLOUR;
  ctx.fillRect(0, 0, c.width, c.height);

  const totalGap = cfg.GAP * (cfg.panels.length - 1);
  const usable = cfg.WIDTH - totalGap;
  let x = 0;

  for (const p of cfg.panels) {
    const li = line('Placing <code>' + p.src + '</code> ...');
    try {
      const img = await load('/raw?p=' + encodeURIComponent(p.src));
      const pw = Math.round(usable * p.weight);
      const ph = cfg.HEIGHT;

      // cover: scale so the panel is filled, then offset by focus
      const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const focus = p.focus === undefined ? 0.5 : p.focus;
      const dx = x + (pw - dw) / 2;                 // horizontally centred
      const dy = (ph - dh) * focus;                 // focus 0 = top, 1 = bottom

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, pw, ph);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      li.className = 'ok';
      li.innerHTML = '&#10003; <code>' + p.src + '</code> &mdash; panel ' + pw + '&times;' + ph +
                     ', showing ' + Math.round(ph / dh * 100) + '% of its height from ' +
                     Math.round(-dy / dh * 100) + '% down';
      x += pw + cfg.GAP;
    } catch (e) {
      li.className = 'err';
      li.innerHTML = '&#10007; <code>' + p.src + '</code> &mdash; ' + e.message;
    }
  }

  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', cfg.QUALITY));
  const r = await fetch('/save', { method: 'POST', body: blob });
  const out = await r.json();

  const prev = document.getElementById('preview');
  prev.src = c.toDataURL('image/jpeg', 0.7);
  prev.hidden = false;

  document.getElementById('done').textContent =
    'Finished. Saved as ' + out.name + ', ' + Math.round(out.bytes/1024) + 'KB. You can close this tab.';
  fetch('/finished', { method: 'POST' });
})();
</script>`;

let saved = null;

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');

  if (u.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(page);
  }

  if (u.pathname === '/raw') {
    const rel = u.searchParams.get('p') || '';
    const abs = path.join(ROOT, rel);
    if (!abs.startsWith(ROOT) || !fs.existsSync(abs)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'image/*' });
    return res.end(fs.readFileSync(abs));
  }

  if (u.pathname === '/save' && req.method === 'POST') {
    const dest = path.join(ROOT, 'assets', 'img', cfg.out);
    if (path.dirname(dest) !== path.join(ROOT, 'assets', 'img')) { res.writeHead(400); return res.end(); }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(dest, buf);
      saved = { name: cfg.out, bytes: buf.length };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(saved));
    });
    return;
  }

  if (u.pathname === '/finished' && req.method === 'POST') {
    res.writeHead(200); res.end('ok');
    setTimeout(() => {
      if (saved) {
        console.log(`\nSaved assets/img/${saved.name}  (${Math.round(saved.bytes / 1024)}KB)`);
        console.log(`Use that file name in the "image:" line of the content file.\n`);
      } else {
        console.log('\nNothing was saved. Check the page for errors.\n');
      }
      server.close(() => process.exit(saved ? 0 : 1));
    }, 150);
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, () => {
  console.log(`\nBuilding a ${WIDTH}x${HEIGHT} banner from ${panels.length} images.`);
  console.log(`Open this in a browser:\n\n  http://localhost:${PORT}\n`);
});
