#!/usr/bin/env node
/* =========================================================
   Build: content/projects.json  ->  project-<slug>.html pages
                                  +  homepage Work cards & carousel
   Zero dependencies. Run with `npm run build`, or let the admin
   run it for you every time you press Save.
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content', 'projects.json');
const MANIFEST = path.join(ROOT, 'content', '.generated.json');

/* ---------------- helpers ---------------- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function inline(s) {
  let t = esc(s);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" data-hover>$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return t;
}

/* markdown-lite: blank line = new paragraph, "- " lines = bullet list */
function md(body, indent) {
  const pad = ' '.repeat(indent);
  return String(body || '').split(/\n\s*\n/).map((chunk) => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    if (lines.every((l) => l.startsWith('- '))) {
      const items = lines.map((l) => l.slice(2));
      const cls = items.some((i) => i.startsWith('**')) ? ' class="pd-objectives"' : '';
      return `${pad}<ul${cls}>\n${items.map((i) => `${pad}  <li>${inline(i)}</li>`).join('\n')}\n${pad}</ul>`;
    }
    return `${pad}<p>${lines.map(inline).join('<br>')}</p>`;
  }).filter(Boolean).join('\n');
}

const secId = (name) => 'sec-' + String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function renderBlock(b) {
  const h = b.heading ? `      <h2>${esc(b.heading)}</h2>\n` : '';
  let inner = '';
  if (b.type === 'chips') {
    inner = `      <div class="pd-deliverables">\n${(b.items || []).map((c) => c.nda
      ? `        <span class="pd-deliverable pd-nda">${esc(c.text)} <em>NDA</em></span>`
      : `        <span class="pd-deliverable">${esc(c.text)}</span>`).join('\n')}\n      </div>`;
  } else if (b.type === 'stats') {
    inner = `      <div class="pd-stats">\n${(b.items || []).map((s) =>
      `        <div class="pd-stat"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('\n')}\n      </div>`;
  } else if (b.type === 'table') {
    const cols = (b.columns || []).map((c) => `<th>${inline(c)}</th>`).join('');
    const rows = (b.rows || []).map((r) => `        <tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('\n');
    inner = [b.intro ? md(b.intro, 6) : '',
      `      <table class="pd-table">\n        <tr>${cols}</tr>\n${rows}\n      </table>`,
      b.note ? md(b.note, 6).replace('<p>', '<p style="margin-top:1rem;">') : ''].filter(Boolean).join('\n');
  } else {
    inner = md(b.body, 6);
  }
  const sec = b.section ? ` data-section="${esc(secId(b.section))}"` : '';
  return `\n    <div class="pd-block"${sec}>\n${h}${inner}\n    </div>\n`;
}

function renderShot(s, i, all) {
  const lazy = i === 0 ? '' : ' loading="lazy"';
  // first shot of each named section becomes the anchor the section nav jumps to
  const firstOfSection = s.section && all.findIndex((x) => x.section === s.section) === i;
  const secAttr = s.section ? ` data-section="${esc(secId(s.section))}"${firstOfSection ? ` id="${esc(secId(s.section))}"` : ''}` : '';
  const cap = s.caption ? `\n      <figcaption class="pd-showcase-caption">${esc(s.caption)}</figcaption>` : '';
  if (s.type === 'video') {
    return `    <figure class="pd-showcase-item"${secAttr} data-hover>\n      <video src="${esc(s.src)}" controls muted playsinline preload="metadata"></video>${cap}\n    </figure>`;
  }
  if (s.type === 'gradient') {
    return `    <figure class="pd-showcase-item"${secAttr} data-hover>\n      <div class="pd-showcase-grad" style="width:100%;aspect-ratio:16/10;background:${esc(s.css)}"></div>${cap}\n    </figure>`;
  }
  const cls = s.mobile ? 'pd-showcase-item pd-showcase-mobile' : 'pd-showcase-item';
  const alt = s.alt || s.caption || '';
  return `    <figure class="${cls}"${secAttr} data-hover>\n      <img src="${esc(s.src)}" alt="${esc(alt)}"${lazy}>${cap}\n    </figure>`;
}

/* vertical section breadcrumb — one entry per distinct shot.section, in
   order. Active entry: long line + section name; others: short line,
   name revealed on hover. Scroll-spy lives in project-detail.js. */
function sectionNav(p) {
  if (p.sectionNav === false) return '';
  const names = [];
  (p.shots || []).forEach((s) => { if (s.section && !names.includes(s.section)) names.push(s.section); });
  if (names.length < 2) return '';
  return `
<nav class="pd-secnav" aria-label="Sections">
${names.map((n, i) => `  <a href="#${esc(secId(n))}" class="pd-secnav-item${i === 0 ? ' is-active' : ''}" data-target="${esc(secId(n))}" data-hover><span class="pd-secnav-line"></span><span class="pd-secnav-label">${esc(n)}</span></a>`).join('\n')}
</nav>
`;
}

function gateHtml(p) {
  return `
<!-- Password gate — content stays blurred until the right password is
     entered. Client-side only: it hides the case study from casual
     visitors, it is not real security. -->
<div class="pd-gate" id="pdGate">
  <div class="pd-gate-card">
    <i class="pd-gate-lock">&#128274;</i>
    <h2>This case study is protected</h2>
    <p>${esc(p.title)} is under NDA. Enter the password to view the full case study.</p>
    <form class="pd-gate-form" id="pdGateForm" autocomplete="off">
      <input type="password" class="pd-gate-input" id="pdGateInput" placeholder="Password" />
      <button type="submit" class="pd-gate-submit">Unlock</button>
      <span class="pd-gate-error" id="pdGateError">Incorrect password — try again.</span>
    </form>
  </div>
</div>
`;
}

function gateScript(p) {
  const key = p.passwordStorageKey || `snrt:unlocked:${p.slug}`;
  return `<script>
(function(){
  var HASH = '${p.passwordHash}';
  var KEY = '${key}';
  var form = document.getElementById('pdGateForm');
  var input = document.getElementById('pdGateInput');
  var error = document.getElementById('pdGateError');
  try { if (sessionStorage.getItem(KEY) === '1') document.body.classList.add('pd-unlocked'); } catch(e){}
  function sha256(str){
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    });
  }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    sha256((input.value || '').trim().toLowerCase()).then(function(h){
      if (h === HASH) {
        document.body.classList.add('pd-unlocked');
        try { sessionStorage.setItem(KEY, '1'); } catch(e){}
        error.classList.remove('show');
      } else {
        error.classList.add('show'); input.focus(); input.select();
      }
    });
  });
})();
</script>
`;
}

function renderPage(p, prev, next) {
  const locked = !!p.passwordHash;
  const title = esc(p.title);
  const meta = (p.meta || []).map((m) =>
    `      <div class="pd-meta-row"><span>${esc(m.label)}</span><span>${esc(m.value)}</span></div>`).join('\n');
  const badge = p.badge ? `\n    <span class="pd-badge">${esc(p.badge)}</span>` : '';
  const robots = p.visible === false ? '\n<meta name="robots" content="noindex" />' : '';
  return `<!DOCTYPE html>
<!-- GENERATED by tools/build.js from content/projects.json — edit in the admin (npm run admin), not here. -->
<html lang="en">
<head>
<meta charset="UTF-8" />
<script>(function(){try{var t=localStorage.getItem('snrt:theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — Sonorathy</title>
<meta name="description" content="${esc(p.metaDescription || p.tagline)}" />${robots}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,400;500;600;700;800&family=Newsreader:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body class="project-detail-page${locked ? ' pd-gated' : ''}">

<div class="cursor" id="cursor">
  <div class="cursor-dot"></div>
  <div class="cursor-ring"></div>
  <span class="cursor-label">VIEW</span>
</div>

<button class="theme-toggle" id="themeToggle" aria-label="Toggle light / dark mode" data-hover>
  <i class="theme-icon theme-icon-sun">&#9728;</i>
  <i class="theme-icon theme-icon-moon">&#9789;</i>
</button>

<a href="index.html#work" class="pd-back" data-hover><i>←</i> Back</a>
${locked ? gateHtml(p) : ''}
<div class="pd-grid">
  <div class="pd-info">
    <h1 class="pd-title">${title}</h1>${badge}
    <p class="pd-tagline">${inline(p.tagline)}</p>

    <div class="pd-meta">
${meta}
    </div>
${(p.blocks || []).map(renderBlock).join('')}
    <div class="pd-block pd-reach">
      <h2 class="pd-reach-title">Reach out.</h2>
      <p class="pd-reach-sub">Let&rsquo;s work together to bring your ideas to life.</p>
${contactEmail('pd-reach-link', '', 6)}
      <div class="pd-reach-socials">${contactSocials(8)}
      </div>
    </div>

    <div class="pd-footer-inline">
      <span>Designed by <a href="index.html" data-hover>Sonorathy</a></span>
      <span>&copy; 2026 All rights reserved</span>
    </div>
  </div>

  <div class="pd-showcase pd-showcase-stack">
${(p.shots || []).map(renderShot).join('\n')}
  </div>
</div>
${sectionNav(p)}
<a href="project-${prev.slug}.html" class="pd-prev-float" data-hover>
  <i>&larr;</i><span>Previous</span>
</a>

<a href="project-${next.slug}.html" class="pd-next-float" data-hover>
  <span>Next</span><i>&rarr;</i>
</a>

<script src="theme.js"></script>
<script src="img-slots.js"></script>
<script src="project-detail.js"></script>
${locked ? gateScript(p) : ''}</body>
</html>
`;
}

function renderCard(p, i) {
  const c = p.card || {};
  const locked = !!p.passwordHash;
  const media = c.cover
    ? `<div class="work-card-media${locked ? ' work-card-media-locked' : ''}"><img src="${esc(c.cover)}" alt="${esc(c.coverAlt || p.title)}" loading="lazy">${locked ? '<i class="work-card-lock">&#128274;</i>' : ''}</div>`
    : `<div class="work-card-media work-card-grad" style="background:${esc(c.coverGradient || 'linear-gradient(155deg,#555,#0a0a0b)')}">${locked ? '<i class="work-card-lock">&#128274;</i>' : ''}</div>`;
  return `
        <a href="project-${p.slug}.html" class="work-card${locked ? ' work-card-locked' : ''}" data-hover
           data-category="${esc(p.category || 'product-uiux')}"
           data-title="${esc(c.title || p.title)}"
           data-role="${esc(c.role)}"
           data-highlights="${esc((c.highlights || []).join('|'))}"
           data-problem="${esc(c.problem)}">
          ${media}
          <div class="work-card-meta">
            <span class="work-card-index">${String(i + 1).padStart(2, '0')}</span>
            <span class="work-card-title">${esc(c.title || p.title)}</span>
            <span class="work-card-tag">${esc(c.tag)}</span>
          </div>
        </a>
`;
}

function renderSlide(p) {
  const c = p.card || {};
  const locked = !!p.passwordHash;
  const media = c.cover
    ? `<div class="carousel-media${locked ? ' carousel-media-locked' : ''}"><img src="${esc(c.cover)}" alt="${esc(c.coverAlt || p.title)}" loading="lazy">${locked ? '<i class="carousel-lock">&#128274;</i>' : ''}</div>`
    : `<div class="carousel-media carousel-media-grad" style="background:${esc(c.coverGradient || 'linear-gradient(135deg,#555,#0a0a0b)')}"></div>`;
  return `
        <div class="carousel-slide" data-hover>
          ${media}
          <span class="carousel-caption">${esc(c.title || p.title)}</span>
        </div>`;
}

/* replace everything between two marker comments (inserting the markers
   the first time, around the given start/end anchors) */
/* ---------------- contacts ----------------
   The first visible email is the big link; every other visible contact goes
   in the row of small links. An empty link renders as "#" so the row keeps
   its shape until a real URL is filled in. */
const DEFAULT_CONTACTS = [
  { type: 'email', label: 'Email', link: 'maianhthyvo@gmail.com', visible: true },
  { type: 'instagram', label: 'Instagram', link: '', visible: true },
  { type: 'linkedin', label: 'LinkedIn', link: '', visible: true },
  { type: 'behance', label: 'Behance', link: '', visible: true },
  { type: 'dribbble', label: 'Dribbble', link: '', visible: true },
];
let CONTACTS = DEFAULT_CONTACTS;
function contactHref(c) {
  const v = String(c.link || '').trim();
  if (!v) return '#';
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  if (c.type === 'email') return `https://mail.google.com/mail/?view=cm&fs=1&to=${v}`;
  if (c.type === 'phone') return 'tel:' + v.replace(/[^\d+]/g, '');
  if (c.type === 'zalo') return 'https://zalo.me/' + v.replace(/[^\d]/g, '');
  return 'https://' + v.replace(/^\/+/, '');
}
const isExternal = (href) => /^https?:/i.test(href);
const shownContacts = () => CONTACTS.filter((c) => c.visible !== false);
const mainEmail = () => shownContacts().find((c) => c.type === 'email' && String(c.link || '').trim());
function contactEmail(cls, extra, indent) {
  const c = mainEmail();
  if (!c) return '';
  const href = contactHref(c);
  const tgt = isExternal(href) ? ' target="_blank" rel="noopener"' : '';
  return `${' '.repeat(indent)}<a href="${esc(href)}" class="${cls}" data-hover${extra}${tgt}>${esc(String(c.link).replace(/^mailto:/i, ''))}</a>`;
}
function contactSocials(indent) {
  const main = mainEmail();
  return shownContacts().filter((c) => c !== main).map((c) => {
    const href = contactHref(c);
    const tgt = href !== '#' && isExternal(href) ? ' target="_blank" rel="noopener"' : '';
    return `\n${' '.repeat(indent)}<a href="${esc(href)}" data-hover${tgt}>${esc(c.label || c.type)}</a>`;
  }).join('');
}

// capability tabs above the Work list; "All" is always shown first
const DEFAULT_FILTERS = [
  { id: 'product-uiux', label: 'Product & UI/UX Design', visible: true },
  { id: 'branding', label: 'Branding', visible: true },
  { id: 'product-marketing', label: 'Product Marketing', visible: true },
  { id: 'content-strategy', label: 'Content Strategy', visible: true },
  { id: 'ai-workflow', label: 'AI Workflow', visible: true },
];
const filterBtn = (id, label, active) =>
  `\n        <button class="work-filter-btn${active ? ' is-active' : ''}" type="button" data-filter="${esc(id)}" data-hover role="tab" aria-selected="${active}">${esc(label)}<span class="work-filter-count"></span></button>`;
function renderFilters(filters) {
  return filterBtn('all', 'All', true) + filters.filter((f) => f.visible !== false).map((f) => filterBtn(f.id, f.label, false)).join('');
}

function replaceRegion(htmlStr, name, content, openAnchor, closeAnchor) {
  const START = `<!-- BUILD:${name}:START -->`;
  const END = `<!-- BUILD:${name}:END -->`;
  if (!htmlStr.includes(START)) {
    const a = htmlStr.indexOf(openAnchor);
    if (a < 0) throw new Error(`anchor not found for ${name}`);
    const from = a + openAnchor.length;
    const b = htmlStr.indexOf(closeAnchor, from);
    if (b < 0) throw new Error(`close anchor not found for ${name}`);
    htmlStr = htmlStr.slice(0, from) + '\n        ' + START + '\n        ' + END + '\n' + htmlStr.slice(b);
  }
  const s = htmlStr.indexOf(START) + START.length;
  const e = htmlStr.indexOf(END);
  return htmlStr.slice(0, s) + content + '\n        ' + htmlStr.slice(e);
}

/* ---------------- main ---------------- */
function build() {
  const data = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
  const all = data.projects || [];
  CONTACTS = Array.isArray(data.contacts) ? data.contacts : DEFAULT_CONTACTS;
  const slugs = new Set();
  all.forEach((p) => {
    if (!/^[a-z0-9-]+$/.test(p.slug || '')) throw new Error(`Invalid slug "${p.slug}" (use a-z, 0-9, -)`);
    if (slugs.has(p.slug)) throw new Error(`Duplicate slug "${p.slug}"`);
    slugs.add(p.slug);
  });
  const visible = all.filter((p) => p.visible !== false);

  // pages: visible ones chain prev/next in order; hidden ones still get a
  // (noindex) page so a direct link keeps working, pointing back into the chain
  const written = [];
  all.forEach((p) => {
    const i = visible.indexOf(p);
    const prev = i >= 0 ? visible[(i - 1 + visible.length) % visible.length] : (visible[visible.length - 1] || p);
    const next = i >= 0 ? visible[(i + 1) % visible.length] : (visible[0] || p);
    const file = `project-${p.slug}.html`;
    fs.writeFileSync(path.join(ROOT, file), renderPage(p, prev, next));
    written.push(file);
  });

  // remove pages this build generated before but whose project was deleted
  let previous = [];
  try { previous = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) {}
  const removed = previous.filter((f) => !written.includes(f) && /^project-[a-z0-9-]+\.html$/.test(f));
  removed.forEach((f) => { try { fs.unlinkSync(path.join(ROOT, f)); } catch (e) {} });
  fs.writeFileSync(MANIFEST, JSON.stringify(written, null, 2) + '\n');

  // homepage
  const indexPath = path.join(ROOT, 'index.html');
  let idx = fs.readFileSync(indexPath, 'utf8');
  idx = replaceRegion(idx, 'WORK', visible.map(renderCard).join(''),
    '<div class="work-scroll-track" id="workScrollTrack">', '        <!-- Generic "coming soon" placeholder');
  idx = replaceRegion(idx, 'CAROUSEL', visible.filter((p) => p.featured !== false).map(renderSlide).join(''),
    '<div class="carousel-track" id="carouselTrack">', '\n      </div>\n    </div>');
  idx = replaceRegion(idx, 'FILTERS', renderFilters(data.filters || DEFAULT_FILTERS),
    '<div class="work-filter reveal-word" id="workFilter" role="tablist">', '\n      </div>');
  idx = replaceRegion(idx, 'CONTACT_EMAIL', '\n' + contactEmail('footer-connect-email', ' data-magnetic', 6),
    'business days.</p>', '\n    </div>\n    <div class="footer-connect-socials">');
  idx = replaceRegion(idx, 'CONTACT_LINKS', contactSocials(6),
    '<div class="footer-connect-socials">', '\n    </div>\n  </div>\n\n  <div class="footer-bottom">');
  fs.writeFileSync(indexPath, idx);

  return { pages: written.length, visible: visible.length, removed };
}

module.exports = { build, DEFAULT_FILTERS, DEFAULT_CONTACTS };

if (require.main === module) {
  try {
    const r = build();
    console.log(`Built ${r.pages} project pages (${r.visible} visible on the homepage).` +
      (r.removed.length ? ` Removed: ${r.removed.join(', ')}` : ''));
  } catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
  }
}
