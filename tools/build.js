/* ==========================================================================
   Murgatroyd Opticians blog - page builder
   --------------------------------------------------------------------------
   Turns the plain text files in content/ into finished web pages.

   Run it with:   node tools/build.js

   It reads every .md file in content/, writes a matching page into posts/,
   and rebuilds the article list on index.html. Nothing else is touched.

   Why this exists: the search engine mark-up on each post has to match the
   visible words on the page exactly. Doing that by hand goes wrong. This
   generates both from the same source, so they cannot drift apart.

   No installation needed. Plain Node, no add-ons.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const POSTS = path.join(ROOT, 'posts');
const SITE = 'https://blog.murgatroydopticians.co.uk';

const problems = [];
const notes = [];

/* ---------- small helpers ------------------------------------------------ */

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');

// [text](url) -> link.  Nothing else is interpreted, so an apostrophe or a
// bracket in ordinary prose stays exactly as written.
function inline(text) {
  return esc(text).replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, href) => `<a href="${href}">${label}</a>`
  );
}

// Where the crop should centre, e.g. "center 18%". The header is a wide
// band cut from a taller photo, so the default centre crop can slice through
// faces. Lower percentages keep more of the top of the picture.
function focusStyle(p) {
  const v = p['image-focus'];
  if (!v) return '';
  if (!/^[a-z0-9 %.]+$/i.test(v)) {
    problems.push(`${p.file}: image-focus "${v}" is not a valid position, e.g. "center 18%"`);
    return '';
  }
  return ` style="object-position: ${attr(v)}"`;
}

// Where the small card thumbnail should centre, e.g. "12% center". The card
// is a 3:2 box, so a wide banner gets cropped left and right rather than top
// and bottom. Lower percentages keep more of the left of the picture.
function thumbStyle(p) {
  const v = p['thumb-focus'];
  if (!v) return '';
  if (!/^[a-z0-9 %.]+$/i.test(v)) {
    problems.push(`${p.file}: thumb-focus "${v}" is not a valid position, e.g. "12% center"`);
    return '';
  }
  return ` style="object-position: ${attr(v)}"`;
}

// The header is a wide band on desktop and a 4:3 box on phones. A wide
// two-up banner survives the first and gets gutted by the second, so a post
// can name a second picture for phones with "image-mobile". When it does,
// the header becomes a <picture> and the phone gets its own photograph.
function heroImage(p) {
  const main = `<img src="../assets/img/${attr(p.image)}" alt="${attr(p['image-alt'])}"${focusStyle(p)}>`;
  const mob = p['image-mobile'];
  if (!mob) return '    ' + main;
  if (!fs.existsSync(path.join(ROOT, 'assets', 'img', mob))) {
    problems.push(`${p.file}: the image-mobile "${mob}" is not in assets/img/`);
    return '    ' + main;
  }
  return `    <picture>
      <source media="(max-width: 640px)" srcset="../assets/img/${attr(mob)}">
      ${main}
    </picture>`;
}

function ukDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July',
                  'August','September','October','November','December'];
  return `${d} ${months[m - 1]} ${y}`;
}

/* ---------- parse one content file --------------------------------------- */

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const split = raw.indexOf('\n---\n');
  if (split < 0) {
    problems.push(`${path.basename(file)}: missing the --- line that separates the details from the article`);
    return null;
  }

  const meta = {};
  raw.slice(0, split).split('\n').forEach(line => {
    if (!line.trim()) return;
    const c = line.indexOf(':');
    if (c < 0) return;
    meta[line.slice(0, c).trim()] = line.slice(c + 1).trim();
  });

  const required = ['title', 'slug', 'date', 'category', 'image', 'image-alt', 'summary', 'description'];
  required.forEach(k => {
    if (!meta[k]) problems.push(`${path.basename(file)}: missing "${k}:" at the top`);
  });

  if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
    problems.push(`${path.basename(file)}: date must be written year-month-day, e.g. 2026-09-01`);
  }
  if (meta.image && !fs.existsSync(path.join(ROOT, 'assets', 'img', meta.image))) {
    problems.push(`${path.basename(file)}: the image "${meta.image}" is not in assets/img/`);
  }

  meta.body = raw.slice(split + 5).trim();
  meta.file = path.basename(file);
  return meta;
}

/* ---------- turn the article text into HTML ------------------------------ */

function renderBody(md) {
  const blocks = md.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const html = [];
  const faq = [];
  let inFaq = false;
  let pendingQuestion = null;

  for (const b of blocks) {
    if (b.startsWith('### ')) {
      const q = b.slice(4).trim();
      html.push(`      <h3>${inline(q)}</h3>`);
      pendingQuestion = inFaq ? q : null;
    } else if (b.startsWith('## ')) {
      const h = b.slice(3).trim();
      inFaq = /frequently asked questions|common questions|questions about/i.test(h);
      pendingQuestion = null;
      html.push(`      <h2>${inline(h)}</h2>`);
    } else if (b.startsWith('> ')) {
      html.push(`      <p class="pullquote">${inline(b.slice(2).trim())}</p>`);
    } else {
      const text = b.replace(/\n\s*/g, ' ');
      html.push(`      <p>\n        ${inline(text)}\n      </p>`);
      // first paragraph after an FAQ question becomes that question's answer
      if (pendingQuestion) {
        // strip link syntax so the schema matches the words actually shown
        faq.push({ q: pendingQuestion, a: text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') });
        pendingQuestion = null;
      }
    }
  }

  if (/^-|^\*\s|^\d+\./m.test(md)) {
    notes.push('House style: bullet points or numbered lists found in the article. These should be prose.');
  }
  if (md.includes('—')) {
    problems.push('House style: an em dash appears in the article. Rewrite the sentence.');
  }
  if (/\*\*/.test(md)) {
    notes.push('House style: bold text found in the article. Structure should come from headings.');
  }

  return { html: html.join('\n\n'), faq };
}

/* ---------- shared page furniture ---------------------------------------- */

const NAV = [
  ['http://www.murgatroydopticians.co.uk/index.html', 'Home'],
  ['http://www.murgatroydopticians.co.uk/eye_examinations.html', 'Book Appointment'],
  ['http://www.murgatroydopticians.co.uk/myopia.html', 'Myopia'],
  ['http://www.murgatroydopticians.co.uk/contact_lenses.html', 'Contact Lenses'],
  ['http://www.murgatroydopticians.co.uk/spectacle_lenses.html', 'Spectacle Lenses'],
  ['http://www.murgatroydopticians.co.uk/designer_frames.html', 'Designer Brands'],
  ['http://www.murgatroydopticians.co.uk/frames.html', 'Frames'],
  ['__BLOG__', 'Blog'],
  ['http://www.murgatroydopticians.co.uk/contact_us.html', 'Contact']
];

const header = up => `  <header class="site-header">
    <div class="site-header__logo">
      <a href="http://www.murgatroydopticians.co.uk/index.html">
        <img src="${up}assets/img/murgatroydOpticians.png" alt="Murgatroyd Opticians">
      </a>
    </div>
    <div class="site-header__panel">
      <img src="${up}assets/img/phone_the_surgery3.png" alt="Family eyecare in Conisbrough and Staveley. Conisbrough 01709 862885. Staveley 01246 477199.">
    </div>
    <div class="site-header__tel">
      CONISBROUGH: <a href="tel:+441709862885">01709&nbsp;862885</a><br>
      STAVELEY: <a href="tel:+441246477199">01246&nbsp;477199</a>
    </div>
  </header>`;

const nav = blogHref => `  <nav class="site-nav" aria-label="Main">
    <ul>
${NAV.map(([h, l]) =>
  h === '__BLOG__'
    ? `      <li><a href="${blogHref}" aria-current="page">${l}</a></li>`
    : `      <li><a href="${h}">${l}</a></li>`
).join('\n')}
    </ul>
  </nav>`;

const footer = up => `  <footer class="site-footer">
    <div class="site-footer__cards">
      <img src="${up}assets/img/creditcards.png" alt="We accept all major credit and debit cards">
    </div>
    <div class="site-footer__addresses">
      The Old Surgery, March Street, Conisbrough, Doncaster&nbsp;DN12&nbsp;2LY
      <p>Murgatroyd Holmes Opticians, 33 High Street, Staveley, Chesterfield&nbsp;S43&nbsp;3UU</p>
    </div>
  </footer>

</div><!-- /.shell -->

<div class="smallprint">
  <p>Registered as a limited company in England and Wales under company number:&nbsp;04510330<br>
     Registered office: Murgatroyd Opticians Ltd, Kelham House, Kelham Street, Doncaster DN1 3RE</p>
  <p><a href="http://www.murgatroydopticians.co.uk/gdpr.html">GDPR Statement</a></p>
  <p>&copy;&nbsp;${new Date().getFullYear()} Murgatroyd Opticians Ltd</p>
</div>`;

/* ---------- build one post page ------------------------------------------ */

function buildPost(p) {
  const { html, faq } = renderBody(p.body);
  const url = `${SITE}/posts/${p.slug}.html`;
  const img = `${SITE}/assets/img/${p.image}`;

  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    datePublished: p.date,
    dateModified: p.date,
    inLanguage: 'en-GB',
    image: img,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Murgatroyd Opticians' },
    publisher: { '@type': 'Organization', name: 'Murgatroyd Opticians', url: 'http://www.murgatroydopticians.co.uk/' }
  };

  // Built from the same words that appear on the page, so they always match.
  const faqBlock = faq.length ? `
<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a }
  }))
}, null, 2)}
</script>` : '';

  const cta = p['cta-heading'] ? `
      <div class="cta">
        <h2>${inline(p['cta-heading'])}</h2>
        <p>${inline(p['cta-line'] || 'Appointments are available at both practices.')}</p>
        <p>Conisbrough <strong><a href="tel:+441709862885">01709&nbsp;862885</a></strong>
           &nbsp;&middot;&nbsp;
           Staveley <strong><a href="tel:+441246477199">01246&nbsp;477199</a></strong></p>
        <p><a href="${p['cta-link'] || 'http://www.murgatroydopticians.co.uk/eye_examinations.html'}">${inline(p['cta-link-text'] || 'Book an eye examination at Murgatroyd Opticians')}</a></p>
      </div>
` : '';

  return `<!DOCTYPE html>
<!-- Generated by tools/build.js from content/${p.file} - do not edit by hand -->
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(p['seo-title'] || p.title)} | Murgatroyd Opticians</title>
<meta name="description" content="${attr(p.description)}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Murgatroyd Opticians">
<meta property="og:locale" content="en_GB">
<meta property="og:title" content="${attr(p.title)}">
<meta property="og:description" content="${attr(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="article:published_time" content="${p.date}">
<meta name="twitter:card" content="summary_large_image">

<link rel="stylesheet" href="../assets/css/blog.css">

<script type="application/ld+json">
${JSON.stringify(blogPosting, null, 2)}
</script>${faqBlock}
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>

<div class="shell">

${header('../')}

${nav('../index.html')}

  <div class="hero">
${heroImage(p)}
  </div>

  <main id="main" class="article">

    <div class="article__head">
      <p class="article__meta">${ukDate(p.date)} &middot; ${esc(p.category)}</p>
      <h1 class="article__title">${esc(p.title)}</h1>
      <p class="article__standfirst">
        ${inline(p.standfirst || p.summary)}
      </p>
    </div>

    <div class="article__body">

${html}
${cta}
    </div><!-- /.article__body -->

    <div class="article-foot">
      <a href="../index.html">&#8592; All blog articles</a>
      <a href="http://www.murgatroydopticians.co.uk/contact_us.html">Find our Conisbrough and Staveley practices</a>
    </div>

  </main>

${footer('../')}

</body>
</html>
`;
}

/* ---------- rebuild the list of articles on index.html ------------------- */

function buildIndex(posts) {
  const file = path.join(ROOT, 'index.html');
  let page = fs.readFileSync(file, 'utf8');

  const START = '<!-- POSTS:START - built by tools/build.js, do not edit between these markers -->';
  const END = '<!-- POSTS:END -->';

  const cards = posts.map(p => `      <article class="post-card">
        <div class="post-card__media">
          <a href="posts/${p.slug}.html" tabindex="-1" aria-hidden="true">
            <img src="assets/img/${attr(p.image)}" alt=""${thumbStyle(p)}>
          </a>
        </div>
        <div class="post-card__body">
          <p class="post-card__meta">${ukDate(p.date)} &middot; ${esc(p.category)}</p>
          <h2 class="post-card__title">
            <a href="posts/${p.slug}.html">${esc(p.title)}</a>
          </h2>
          <p class="post-card__excerpt">
            ${inline(p.summary)}
          </p>
          <a class="readmore" href="posts/${p.slug}.html">Read the full article</a>
        </div>
      </article>`).join('\n\n');

  const s = page.indexOf(START), e = page.indexOf(END);
  if (s < 0 || e < 0) {
    problems.push('index.html is missing the POSTS:START / POSTS:END markers');
    return;
  }
  page = page.slice(0, s + START.length) + '\n' + cards + '\n' + page.slice(e);
  fs.writeFileSync(file, page);
}

/* ---------- go ----------------------------------------------------------- */

if (!fs.existsSync(CONTENT)) {
  console.error('No content/ folder found.');
  process.exit(1);
}

const files = fs.readdirSync(CONTENT).filter(f => f.endsWith('.md')).sort();
const posts = files.map(f => parse(path.join(CONTENT, f))).filter(Boolean);

// newest first
posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const slugs = new Set();
posts.forEach(p => {
  if (slugs.has(p.slug)) problems.push(`Two posts share the slug "${p.slug}"`);
  slugs.add(p.slug);
});

if (!fs.existsSync(POSTS)) fs.mkdirSync(POSTS);

posts.forEach(p => {
  fs.writeFileSync(path.join(POSTS, p.slug + '.html'), buildPost(p));
});
buildIndex(posts);

// remove pages whose content file has gone
fs.readdirSync(POSTS).filter(f => f.endsWith('.html')).forEach(f => {
  if (!slugs.has(f.replace(/\.html$/, ''))) {
    fs.unlinkSync(path.join(POSTS, f));
    notes.push(`Removed posts/${f} because there is no matching file in content/`);
  }
});

console.log(`\nBuilt ${posts.length} post${posts.length === 1 ? '' : 's'}:`);
posts.forEach(p => console.log(`  ${p.date}  posts/${p.slug}.html   (${p.body.split(/\s+/).length} words)`));

if (notes.length) {
  console.log('\nWorth a look:');
  notes.forEach(n => console.log('  - ' + n));
}

if (problems.length) {
  console.log('\nPROBLEMS - fix these before uploading:');
  problems.forEach(p => console.log('  ! ' + p));
  process.exit(1);
}
console.log('\nAll good. Upload index.html and the posts/ folder.\n');
