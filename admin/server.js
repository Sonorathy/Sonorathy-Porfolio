#!/usr/bin/env node
/* =========================================================
   Sonorathy local admin — `npm run admin`, then open
   http://localhost:4321
   Zero dependencies. Listens on 127.0.0.1 only, so nothing
   outside this Mac can reach it. Publishing uses your own
   git + SSH key, exactly like pushing from Terminal.
   ========================================================= */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { build } = require('../tools/build.js');

const ROOT = path.resolve(__dirname, '..');
const UI = path.join(__dirname, 'ui');
const CONTENT = path.join(ROOT, 'content', 'projects.json');
const PORT = Number(process.env.PORT) || 4321;
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function serveFile(res, baseDir, rel) {
  const target = path.resolve(baseDir, '.' + path.sep + decodeURIComponent(rel));
  if (!target.startsWith(baseDir) || target.includes(`${path.sep}.git`)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.stat(target, (err, st) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    const file = st.isDirectory() ? path.join(target, 'index.html') : target;
    fs.readFile(file, (e, buf) => {
      if (e) return send(res, 404, 'Not found', 'text/plain');
      send(res, 200, buf, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    });
  });
}

function readBody(req, limit = 200 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('Upload too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function git(args) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err ? err.code : 0, out: `${stdout || ''}${stderr || ''}`.replace(/\s+$/, ''), cmd: `git ${args.join(' ')}` });
    });
  });
}

const slugOk = (s) => /^[a-z0-9-]+$/.test(s || '');
function safeName(name) {
  const rawExt = path.extname(name || '');
  const ext = rawExt.toLowerCase();
  const base = path.basename(name || 'file', rawExt).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  return base + (ext || '.jpg');
}

async function api(req, res, url) {
  const p = url.pathname;

  if (p === '/api/content' && req.method === 'GET') {
    return send(res, 200, fs.readFileSync(CONTENT, 'utf8'));
  }

  if (p === '/api/content' && req.method === 'PUT') {
    const data = await readBody(req);
    if (!data || !Array.isArray(data.projects)) return send(res, 400, { error: 'Missing projects array' });
    const before = fs.readFileSync(CONTENT, 'utf8');
    fs.writeFileSync(CONTENT, JSON.stringify(data, null, 2) + '\n');
    try {
      const result = build();
      return send(res, 200, { ok: true, result });
    } catch (e) {
      fs.writeFileSync(CONTENT, before); // keep the site buildable
      return send(res, 400, { error: e.message });
    }
  }

  if (p === '/api/upload' && req.method === 'POST') {
    const { slug, name, data } = await readBody(req);
    if (!slugOk(slug)) return send(res, 400, { error: 'Invalid project slug' });
    const m = /^data:[^;]+;base64,(.+)$/s.exec(data || '');
    if (!m) return send(res, 400, { error: 'Invalid file data' });
    const dir = path.join(ROOT, 'assets', 'work', slug);
    fs.mkdirSync(dir, { recursive: true });
    let file = safeName(name);
    const ext = path.extname(file); const base = path.basename(file, ext);
    for (let i = 2; fs.existsSync(path.join(dir, file)); i++) file = `${base}-${i}${ext}`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(m[1], 'base64'));
    return send(res, 200, { ok: true, path: `assets/work/${slug}/${file}` });
  }

  if (p === '/api/images' && req.method === 'GET') {
    const slug = url.searchParams.get('slug');
    const out = [];
    const walk = (dir, rel) => {
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) walk(full, `${rel}/${f}`);
        else if (/\.(jpe?g|png|gif|webp|svg|mp4|webm)$/i.test(f)) out.push(`${rel}/${f}`);
      }
    };
    if (slug && slugOk(slug)) walk(path.join(ROOT, 'assets', 'work', slug), `assets/work/${slug}`);
    else walk(path.join(ROOT, 'assets', 'work'), 'assets/work');
    return send(res, 200, { images: out.sort() });
  }

  if (p === '/api/git/status' && req.method === 'GET') {
    const [branch, status, last] = await Promise.all([
      git(['rev-parse', '--abbrev-ref', 'HEAD']), git(['status', '--porcelain', '-uall']), git(['log', '-1', '--format=%h %s (%cr)']),
    ]);
    const files = status.out ? status.out.split('\n').map((l) => ({ state: l.slice(0, 2).trim(), file: l.slice(3) })) : [];
    return send(res, 200, { branch: branch.out, files, last: last.out, ok: branch.ok });
  }

  if (p === '/api/git/publish' && req.method === 'POST') {
    const { message } = await readBody(req);
    const msg = String(message || '').trim() || 'Update portfolio content';
    const log = [];
    const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).out || 'main';
    const steps = [['add', '-A']];
    for (const s of steps) { const r = await git(s); log.push(r); if (!r.ok) return send(res, 500, { ok: false, log }); }
    const staged = await git(['diff', '--cached', '--quiet']);
    if (!staged.ok) { // non-zero exit = there ARE staged changes
      const c = await git(['commit', '-m', msg]); log.push(c);
      if (!c.ok) return send(res, 500, { ok: false, log });
    } else {
      log.push({ ok: true, cmd: 'git commit', out: 'Nothing new to commit — pushing existing commits.' });
    }
    const pull = await git(['pull', '--rebase', '--autostash', 'origin', branch]); log.push(pull);
    if (!pull.ok) return send(res, 500, { ok: false, log, hint: 'Pull failed (maybe a conflict). Open Terminal in the repo and run `git status`.' });
    const push = await git(['push', 'origin', branch]); log.push(push);
    return send(res, push.ok ? 200 : 500, { ok: push.ok, log });
  }

  return send(res, 404, { error: 'Unknown API route' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/site' ) { res.writeHead(302, { Location: '/site/' }); return res.end(); }
    if (url.pathname.startsWith('/site/')) return serveFile(res, ROOT, url.pathname.slice('/site/'.length) || 'index.html');
    return serveFile(res, UI, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Sonorathy admin running →  http://localhost:${PORT}\n  (Ctrl+C to stop)\n`);
});
