/* ==========================================================================
   Murgatroyd Opticians blog - image preparation
   --------------------------------------------------------------------------
   Photos straight from a phone or camera are far too big for a web page. A
   4MB photo makes the page slow to load on mobile data, which costs you
   readers and search ranking.

   This shrinks them to a sensible size for the web. It uses the browser to
   do the actual work, so there is nothing to install.

   HOW IT IS USED
     1. Put the original photos in the  incoming/  folder
     2. Run:  node tools/prepare-images.js
     3. Open the address it prints, in a browser
     4. Finished images land in assets/img/ and the originals are untouched

   Target: 1600 pixels wide, good quality JPEG, usually 200-400KB.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IN = path.join(ROOT, 'incoming');
const OUT = path.join(ROOT, 'assets', 'img');
const PORT = 4331;
const MAX_WIDTH = 1600;
const QUALITY = 0.82;

if (!fs.existsSync(IN)) fs.mkdirSync(IN);

const exts = /\.(jpe?g|png|webp)$/i;
const files = fs.readdirSync(IN).filter(f => exts.test(f));

if (!files.length) {
  console.log(`\nNothing to do. Put photos in:\n  ${IN}\nthen run this again.\n`);
  process.exit(0);
}

// name the finished file: lower case, hyphens, always .jpg
const outName = f => f
  .replace(exts, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') + '.jpg';

const page = `<!doctype html><meta charset="utf-8">
<title>Preparing images</title>
<style>
 body{font:15px/1.6 Helvetica,Arial,sans-serif;color:#003366;background:#fff;margin:0;padding:28px}
 h1{font-size:19px;margin:0 0 4px}
 p.sub{margin:0 0 20px;color:#5f7d99}
 li{margin-bottom:7px;list-style:none}
 .ok{color:#1a7f37}.err{color:#b3261e}
 code{background:#f2f6f9;padding:1px 5px}
 #done{margin-top:20px;font-weight:bold}
</style>
<h1>Preparing images for the blog</h1>
<p class="sub">Resizing to ${MAX_WIDTH}px wide. You can close this tab when it says finished.</p>
<ul id="log"></ul>
<div id="done"></div>
<script>
const files = ${JSON.stringify(files)};
const log = document.getElementById('log');
const line = (html, cls) => { const li=document.createElement('li'); li.className=cls||''; li.innerHTML=html; log.appendChild(li); return li; };

function load(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error('could not read')); i.src=src; }); }

(async () => {
  let ok=0, failed=0;
  for (const f of files) {
    const li = line('Working on <code>'+f+'</code> ...');
    try {
      const img = await load('/raw/'+encodeURIComponent(f));
      const scale = Math.min(1, ${MAX_WIDTH}/img.naturalWidth);
      const w = Math.round(img.naturalWidth*scale), h = Math.round(img.naturalHeight*scale);
      const c = document.createElement('canvas');
      c.width=w; c.height=h;
      const ctx=c.getContext('2d');
      ctx.imageSmoothingQuality='high';
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);   // flatten any transparency
      ctx.drawImage(img,0,0,w,h);
      const blob = await new Promise(r=>c.toBlob(r,'image/jpeg',${QUALITY}));
      const r = await fetch('/save?name='+encodeURIComponent(f),{method:'POST',body:blob});
      const out = await r.json();
      li.className='ok';
      li.innerHTML='&#10003; <code>'+out.name+'</code> &mdash; '+img.naturalWidth+'&times;'+img.naturalHeight+
                   ' became '+w+'&times;'+h+', '+Math.round(out.bytes/1024)+'KB';
      ok++;
    } catch(e) {
      li.className='err';
      li.innerHTML='&#10007; <code>'+f+'</code> &mdash; '+e.message;
      failed++;
    }
  }
  document.getElementById('done').textContent =
    'Finished. '+ok+' image'+(ok===1?'':'s')+' ready'+(failed?', '+failed+' failed':'')+'. You can close this tab.';
  fetch('/finished',{method:'POST'});
})();
</script>`;

const results = [];

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');

  if (u.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(page);
  }

  if (u.pathname.startsWith('/raw/')) {
    const name = decodeURIComponent(u.pathname.slice(5));
    const p = path.join(IN, name);
    if (path.dirname(p) !== IN || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'image/*' });
    return res.end(fs.readFileSync(p));
  }

  if (u.pathname === '/save' && req.method === 'POST') {
    const src = u.searchParams.get('name') || '';
    const name = outName(src);
    const dest = path.join(OUT, name);
    if (path.dirname(dest) !== OUT) { res.writeHead(400); return res.end(); }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(dest, buf);
      results.push({ name, bytes: buf.length });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name, bytes: buf.length }));
    });
    return;
  }

  if (u.pathname === '/finished' && req.method === 'POST') {
    res.writeHead(200); res.end('ok');
    setTimeout(() => {
      console.log('\nReady in assets/img/:');
      results.forEach(r => console.log(`  ${r.name}  (${Math.round(r.bytes / 1024)}KB)`));
      console.log('\nUse the file name in the "image:" line of your content file.\n');
      server.close(() => process.exit(0));
    }, 150);
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, () => {
  console.log(`\n${files.length} image${files.length === 1 ? '' : 's'} found in incoming/`);
  console.log(`Open this in a browser to prepare them:\n\n  http://localhost:${PORT}\n`);
});
