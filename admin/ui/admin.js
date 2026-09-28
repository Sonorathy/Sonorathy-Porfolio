/* Sonorathy admin — edits content/projects.json, uploads images into
   assets/work/<slug>/, rebuilds the static pages on every save, and
   publishes with git. No framework, no build step. */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const state = { data: null, sel: -1, view: 'project', dirty: false, saving: false };

// fallback when content/projects.json has no "filters" list yet
const CATEGORIES = [
  ['product-uiux', 'Product & UI/UX Design'],
  ['branding', 'Branding'],
  ['product-marketing', 'Product Marketing'],
  ['content-strategy', 'Content Strategy'],
  ['ai-workflow', 'AI Workflow'],
];
// [type, name, placeholder for the link field]
const CONTACT_TYPES = [
  ['email', 'Email', 'ten@gmail.com'],
  ['phone', 'Số điện thoại', '0901 234 567'],
  ['zalo', 'Zalo', 'Số Zalo hoặc https://zalo.me/…'],
  ['instagram', 'Instagram', 'https://instagram.com/…'],
  ['linkedin', 'LinkedIn', 'https://linkedin.com/in/…'],
  ['behance', 'Behance', 'https://behance.net/…'],
  ['dribbble', 'Dribbble', 'https://dribbble.com/…'],
  ['facebook', 'Facebook', 'https://facebook.com/…'],
  ['tiktok', 'TikTok', 'https://tiktok.com/@…'],
  ['threads', 'Threads', 'https://threads.net/@…'],
  ['youtube', 'YouTube', 'https://youtube.com/@…'],
  ['github', 'GitHub', 'https://github.com/…'],
  ['website', 'Website', 'https://…'],
  ['other', 'Khác', 'https://…'],
];
const contactType = (t) => CONTACT_TYPES.find((x) => x[0] === t) || CONTACT_TYPES[CONTACT_TYPES.length - 1];
// the site shows these types in the visitor's language (Phone / Điện thoại),
// so their label stays empty unless you type a custom one
const AUTO_LABEL = { phone: 'Phone / Điện thoại', other: 'Other / Khác' };
const defaultLabel = (t) => (AUTO_LABEL[t] ? '' : contactType(t)[1]);
const categories = () => state.data.filters.map((f) => [f.id, f.label]);
const BLOCK_TYPES = [['text', 'Đoạn văn / danh sách'], ['chips', 'Chips (Deliverables)'], ['stats', 'Số liệu'], ['table', 'Bảng']];

/* ---------------- tiny DOM helper ---------------- */
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else if (k in n && typeof v !== 'string') n[k] = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
}
const cur = () => state.data.projects[state.sel];

function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = 'toast'), err ? 6000 : 2600);
}
/* ---------------- undo / redo ----------------
   Every edit goes through markDirty(), so that is where history is recorded:
   a JSON snapshot of the state *before* the edit goes on the undo stack.
   Keystrokes in the same text field within 1s are merged into one step. */
const hist = { undo: [], redo: [], last: '', saved: '', at: 0, field: null, LIMIT: 200 };

function resetHistory() {
  hist.undo = []; hist.redo = [];
  hist.last = hist.saved = JSON.stringify(state.data);
  updateHistoryButtons();
}
function isTyping() {
  const a = document.activeElement;
  return a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && /^(text|search|url|)$/.test(a.type)));
}
function recordHistory() {
  const now = JSON.stringify(state.data);
  if (now === hist.last) return;
  const field = isTyping() ? document.activeElement : null;
  const merge = field && field === hist.field && Date.now() - hist.at < 1000;
  if (!merge) {
    hist.undo.push(hist.last);
    if (hist.undo.length > hist.LIMIT) hist.undo.shift();
  }
  hist.redo = [];
  hist.last = now; hist.at = Date.now(); hist.field = field;
  updateHistoryButtons();
}
function updateHistoryButtons() {
  $('#undoBtn').disabled = !hist.undo.length;
  $('#redoBtn').disabled = !hist.redo.length;
}
function restore(from, to, label) {
  if (!from.length) return;
  to.push(hist.last);
  const snap = from.pop();
  const slug = cur() && cur().slug;
  state.data = JSON.parse(snap);
  hist.last = snap; hist.field = null;
  const idx = state.data.projects.findIndex((p) => p.slug === slug);
  state.sel = idx >= 0 ? idx : Math.min(Math.max(state.sel, 0), state.data.projects.length - 1);
  renderList(); renderEditor(); renderPreviewOptions();
  updateSaveState(); updateHistoryButtons();
  toast(label);
}
const undo = () => restore(hist.undo, hist.redo, 'Đã hoàn tác');
const redo = () => restore(hist.redo, hist.undo, 'Đã làm lại');

function updateSaveState() {
  state.dirty = hist.last !== hist.saved;
  const s = $('#saveState');
  s.textContent = state.dirty ? 'Chưa lưu' : 'Đã lưu';
  s.className = 'save-state' + (state.dirty ? ' dirty' : '');
}
function markDirty() {
  recordHistory();
  updateSaveState();
}
function markSaved(err, snap) {
  const s = $('#saveState');
  if (err) { s.textContent = 'Lỗi build'; s.className = 'save-state error'; return; }
  hist.saved = snap;
  updateSaveState();
}

/* ---------------- data ---------------- */
async function load() {
  state.data = await (await fetch('/api/content')).json();
  if (!Array.isArray(state.data.contacts)) state.data.contacts = [];
  if (!Array.isArray(state.data.filters)) state.data.filters = CATEGORIES.map(([id, label]) => ({ id, label, visible: true }));
  state.sel = state.data.projects.length ? 0 : -1;
  renderList(); renderEditor(); renderPreviewOptions(); setPreview('index.html');
  resetHistory();
}

async function save() {
  if (state.saving) return;
  state.saving = true; $('#saveBtn').disabled = true;
  try {
    const body = JSON.stringify(state.data);
    const r = await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Save failed');
    markSaved(false, body); toast(`Đã lưu & build ${j.result.pages} trang`);
    renderPreviewOptions(); reloadPreview();
  } catch (e) { markSaved(true); toast('Lỗi: ' + e.message, true); }
  finally { state.saving = false; $('#saveBtn').disabled = false; }
}

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
function uniqueSlug(base, ignoreIndex) {
  let s = base, i = 2;
  while (state.data.projects.some((p, idx) => idx !== ignoreIndex && p.slug === s)) s = `${base}-${i++}`;
  return s;
}

/* ---------------- uploads ---------------- */
const readAsDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

async function prepareFile(file) {
  // big raster images get downscaled to 2400px wide JPEG before upload,
  // so the live site never ships 10MB screenshots
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { name: file.name, data: await readAsDataURL(file) };
  const bmp = await createImageBitmap(file);
  const MAX = 2400;
  if (bmp.width <= MAX && file.type === 'image/jpeg' && file.size < 1.5e6) return { name: file.name, data: await readAsDataURL(file) };
  const scale = Math.min(1, MAX / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return { name: file.name.replace(/\.\w+$/, '') + '.jpg', data: c.toDataURL('image/jpeg', 0.86) };
}

async function upload(file) {
  const p = cur();
  const { name, data } = await prepareFile(file);
  const r = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: p.slug, name, data }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Upload failed');
  return j.path;
}

function filePicker(multiple, accept = 'image/*,video/mp4,video/webm') {
  return new Promise((resolve) => {
    const i = el('input', { type: 'file', accept, multiple });
    i.onchange = () => resolve([...i.files]); i.click();
  });
}

async function pickExisting() {
  const j = await (await fetch('/api/images')).json();
  const grid = $('#pickerGrid'); grid.innerHTML = '';
  const dlg = $('#pickerDialog');
  return new Promise((resolve) => {
    j.images.forEach((src) => grid.append(el('button', { type: 'button', onclick: () => { dlg.close(); resolve(src); } },
      /\.(mp4|webm)$/i.test(src) ? el('div', { style: 'aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;background:#eee' }, '▶ video') : el('img', { src: '/site/' + src, loading: 'lazy' }),
      el('span', {}, src.replace('assets/work/', '')))));
    dlg.onclose = () => resolve(null);
    dlg.showModal();
  });
}

/* ---------------- sidebar ---------------- */
function renderFilters() {
  const ul = $('#filterList'); ul.innerHTML = '';
  state.data.filters.forEach((f) => {
    const n = state.data.projects.filter((p) => p.visible !== false && p.category === f.id).length;
    const cb = el('input', { type: 'checkbox' }); cb.checked = f.visible !== false;
    cb.addEventListener('change', () => { f.visible = cb.checked; markDirty(); renderFilters(); });
    ul.append(el('li', {}, el('label', { class: 'switch' + (cb.checked ? '' : ' off'), title: cb.checked ? 'Đang hiện — bỏ chọn để ẩn tab' : 'Đang ẩn — chọn để hiện tab' },
      cb, f.label, el('span', { class: 'f-count' }, `${n} project`))));
  });
}

function renderContactsSummary() {
  const shown = state.data.contacts.filter((c) => c.visible !== false);
  const empty = shown.filter((c) => !String(c.link || '').trim()).length;
  $('#contactsSummary').textContent = `${shown.length} đang hiện` + (empty ? ` · ${empty} chưa có link` : '');
  $('#contactsBtn').classList.toggle('on', state.view === 'contacts');
}

function renderList() {
  renderFilters(); renderContactsSummary();
  const ul = $('#projectList'); ul.innerHTML = '';
  let visibleNo = 0;
  state.data.projects.forEach((p, i) => {
    const vis = p.visible !== false;
    if (vis) visibleNo++;
    const li = el('li', {
      class: `project-item${i === state.sel && state.view === 'project' ? ' active' : ''}${vis ? '' : ' hidden-proj'}`, draggable: 'true',
      onclick: () => { state.sel = i; state.view = 'project'; renderList(); renderEditor(); setPreview(`project-${p.slug}.html`); },
    },
    el('span', { class: 'p-handle', title: 'Kéo để sắp xếp' }, '⋮⋮'),
    el('span', { class: 'p-num' }, vis ? String(visibleNo).padStart(2, '0') : '—'),
    el('span', { class: 'p-title', title: p.title }, p.title || '(chưa đặt tên)'),
    p.passwordHash ? el('span', { class: 'p-lock', title: 'Có mật khẩu' }, '🔒') : null,
    el('button', {
      class: 'icon-btn', type: 'button', title: vis ? 'Đang hiển thị — bấm để ẩn' : 'Đang ẩn — bấm để hiện',
      onclick: (e) => { e.stopPropagation(); p.visible = !vis; markDirty(); renderList(); if (i === state.sel) renderEditor(); },
    }, vis ? '👁' : '⌀'));

    li.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); li.classList.add('dragging'); });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const below = e.offsetY > li.offsetHeight / 2;
      li.classList.toggle('drop-below', below); li.classList.toggle('drop-above', !below);
    });
    li.addEventListener('dragleave', () => li.classList.remove('drop-above', 'drop-below'));
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('text/plain'));
      let to = i + (li.classList.contains('drop-below') ? 1 : 0);
      li.classList.remove('drop-above', 'drop-below');
      if (from === to || from + 1 === to) return;
      const selected = cur();
      const [moved] = state.data.projects.splice(from, 1);
      if (from < to) to--;
      state.data.projects.splice(to, 0, moved);
      state.sel = state.data.projects.indexOf(selected);
      markDirty(); renderList();
    });
    ul.append(li);
  });
}

function newProject() {
  const title = prompt('Tên project mới?');
  if (!title) return;
  const slug = uniqueSlug(slugify(title));
  state.data.projects.push({
    slug, visible: false, featured: true, category: 'product-uiux', title, badge: '', tagline: '', metaDescription: '',
    meta: [{ label: 'Year', value: String(new Date().getFullYear()) }, { label: 'Role', value: '' }, { label: 'Scope', value: '' }],
    card: { title, tag: '', role: '', highlights: [], problem: '', cover: '', coverAlt: '', coverGradient: '' },
    blocks: [
      { type: 'text', heading: 'The Scenario & Business Problem', body: '' },
      { type: 'text', heading: 'The Design & Strategy Challenge', body: '' },
      { type: 'chips', heading: 'Deliverables', items: [] },
    ],
    shots: [], passwordHash: '', passwordStorageKey: '',
  });
  state.sel = state.data.projects.length - 1; state.view = 'project';
  markDirty(); renderList(); renderEditor();
  toast('Đã tạo project ở chế độ ẨN — bật 👁 khi sẵn sàng');
}

/* ---------------- editor helpers ---------------- */
function input(obj, key, { type = 'text', rows, placeholder, onchange, counter } = {}) {
  const tag = type === 'textarea' ? 'textarea' : 'input';
  const n = el(tag, { type: tag === 'input' ? type : null, rows, placeholder });
  n.value = obj[key] == null ? '' : obj[key];
  let cnt = null;
  if (counter) {
    cnt = el('div', { class: 'counter' });
    const upd = () => {
      const len = n.value.length;
      cnt.textContent = `${len} ký tự · nên ${counter[0]}–${counter[1]}`;
      cnt.classList.toggle('warn', len < counter[0] || len > counter[1]);
    };
    n.addEventListener('input', upd); upd();
  }
  n.addEventListener('input', () => {
    obj[key] = n.value; markDirty(); if (onchange) onchange(n.value);
    // the English changed under an existing translation — say so once
    if (obj.vi && obj.vi[key] && !viWarned.has(obj)) { viWarned.add(obj); toast('Trường này có bản tiếng Việt — sửa xong nhớ cập nhật ở chế độ VI'); }
  });
  return cnt ? [n, cnt] : n;
}
const viWarned = new WeakSet();
const field = (label, ...control) => el('label', {}, label, ...control);
function toggle(label, obj, key, onchange) {
  const cb = el('input', { type: 'checkbox' });
  // visible / featured / sectionNav default to ON when the field is missing
  cb.checked = ['visible', 'featured', 'sectionNav'].includes(key) ? obj[key] !== false : !!obj[key];
  cb.addEventListener('change', () => { obj[key] = cb.checked; markDirty(); if (onchange) onchange(); });
  return el('label', { class: 'switch' }, cb, label);
}
function select(obj, key, options, onchange) {
  const s = el('select', {}, options.map(([v, t]) => el('option', { value: v }, t)));
  s.value = obj[key] || options[0][0];
  s.addEventListener('change', () => { obj[key] = s.value; markDirty(); if (onchange) onchange(); });
  return s;
}
const card = (title, open, ...body) => el('details', { class: 'card', open }, el('summary', {}, title), el('div', { class: 'card-body' }, ...body));
function moveIn(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; }

/* list of plain strings (highlights) or objects with fields */
function listEditor(arr, fields, makeNew, rerender) {
  const box = el('div', { class: 'row-list' });
  arr.forEach((item, i) => {
    const row = el('div', { class: 'row' });
    if (typeof fields === 'string') {
      const inp = el('input', { type: 'text', placeholder: fields }); inp.value = item;
      inp.addEventListener('input', () => { arr[i] = inp.value; markDirty(); });
      row.append(inp);
    } else {
      fields.forEach(([k, ph, kind]) => {
        if (kind === 'check') {
          const cb = el('input', { type: 'checkbox' }); cb.checked = !!item[k];
          cb.addEventListener('change', () => { item[k] = cb.checked; markDirty(); });
          row.append(el('label', { class: 'switch', style: 'font-size:.75rem' }, cb, ph));
        } else {
          const inp = el('input', { type: 'text', placeholder: ph }); inp.value = item[k] || '';
          inp.addEventListener('input', () => { item[k] = inp.value; markDirty(); });
          row.append(inp);
        }
      });
    }
    row.append(
      el('button', { class: 'icon-btn', type: 'button', title: 'Lên', onclick: () => { if (moveIn(arr, i, -1)) { markDirty(); rerender(); } } }, '↑'),
      el('button', { class: 'icon-btn', type: 'button', title: 'Xuống', onclick: () => { if (moveIn(arr, i, 1)) { markDirty(); rerender(); } } }, '↓'),
      el('button', { class: 'icon-btn', type: 'button', title: 'Xoá', onclick: () => { arr.splice(i, 1); markDirty(); rerender(); } }, '✕'));
    box.append(row);
  });
  box.append(el('button', { class: 'btn small', type: 'button', onclick: () => { arr.push(makeNew()); markDirty(); rerender(); } }, '+ Thêm dòng'));
  return box;
}

/* media thumb that shows a hatched placeholder if the file is missing */
function thumb(src) {
  const wrap = el('div', { class: 'shot-media' });
  if (!src) { wrap.append(el('span', { class: 'missing' }, 'Chưa có ảnh')); return wrap; }
  const url = '/site/' + src + '?t=' + Date.now();
  const media = /\.(mp4|webm)$/i.test(src) ? el('video', { src: url, muted: true }) : el('img', { src: url, loading: 'lazy' });
  media.addEventListener('error', () => { media.remove(); wrap.append(el('span', { class: 'missing' }, 'Thiếu file: ' + src)); });
  wrap.append(media);
  return wrap;
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------------- contacts ---------------- */
function renderContacts(ed) {
  const list = state.data.contacts;
  const rr = () => { renderEditor(); renderContactsSummary(); };
  const firstEmail = list.find((c) => c.visible !== false && c.type === 'email' && String(c.link || '').trim());
  ed.append(el('div', { class: 'editor-head' }, el('h1', {}, 'Liên hệ')));

  const box = el('div', { class: 'row-list' },
    el('div', { class: 'contact-head' }, el('span', {}, 'Hiện'), el('span', {}, 'Loại'), el('span', {}, 'Chữ hiển thị'), el('span', {}, 'Đường dẫn / địa chỉ')));
  list.forEach((c, i) => {
    const on = c.visible !== false;
    const vis = el('input', { type: 'checkbox', title: on ? 'Đang hiện — bỏ chọn để ẩn' : 'Đang ẩn — chọn để hiện' }); vis.checked = on;
    vis.addEventListener('change', () => { c.visible = vis.checked; markDirty(); rr(); });
    const type = el('select', {}, CONTACT_TYPES.map(([v, t]) => el('option', { value: v }, t)));
    type.value = contactType(c.type)[0];
    type.addEventListener('change', () => {
      // keep a custom label, but follow the type when the label was just the old type's name
      if (!c.label || c.label === contactType(c.type)[1]) c.label = defaultLabel(type.value);
      c.type = type.value; markDirty(); rr();
    });
    const label = el('input', { type: 'text', placeholder: AUTO_LABEL[c.type] ? `Tự đổi theo ngôn ngữ: ${AUTO_LABEL[c.type]}` : contactType(c.type)[1] }); label.value = c.label || '';
    label.addEventListener('input', () => { c.label = label.value; markDirty(); });
    const link = el('input', { type: 'text', placeholder: contactType(c.type)[2] }); link.value = c.link || '';
    link.addEventListener('input', () => { c.link = link.value; markDirty(); });
    link.addEventListener('change', () => rr());
    box.append(el('div', { class: 'contact-row' + (on ? '' : ' off') }, vis, type, label, link,
      el('button', { class: 'icon-btn', type: 'button', title: 'Lên', onclick: () => { if (moveIn(list, i, -1)) { markDirty(); rr(); } } }, '↑'),
      el('button', { class: 'icon-btn', type: 'button', title: 'Xuống', onclick: () => { if (moveIn(list, i, 1)) { markDirty(); rr(); } } }, '↓'),
      el('button', { class: 'icon-btn', type: 'button', title: 'Xoá', onclick: () => { list.splice(i, 1); markDirty(); rr(); } }, '✕')));
    if (on && !String(c.link || '').trim()) box.append(el('div', { class: 'contact-warn' }, 'Chưa có đường dẫn — trên web bấm vào sẽ không đi đâu.'));
    else if (c === firstEmail) box.append(el('div', { class: 'contact-warn', style: 'color:#77736a' }, 'Email này hiện chữ lớn ở cuối trang và cuối mỗi case study.'));
  });

  const newType = el('select', {}, CONTACT_TYPES.map(([v, t]) => el('option', { value: v }, t)));
  box.append(el('div', { class: 'add-row' }, newType,
    el('button', { class: 'btn small', type: 'button', onclick: () => {
      list.push({ type: newType.value, label: defaultLabel(newType.value), link: '', visible: true });
      markDirty(); rr();
    } }, '+ Thêm liên hệ')));

  ed.append(card('Các kênh liên hệ', true,
    el('p', { class: 'hint' }, 'Hiện ở cuối trang chủ và cuối mỗi case study. Email đầu tiên đang bật sẽ hiện chữ lớn, các kênh còn lại xếp thành hàng link nhỏ theo thứ tự ở đây. Email và số điện thoại chỉ cần nhập địa chỉ/số, admin tự tạo link.'),
    box));
}

/* ---------------- Vietnamese ----------------
   The site is written in English; any field can carry a Vietnamese version
   in a sibling "vi" object ({ title, tagline, … }) that tools/build.js
   renders next to the English and the site's EN / VI switch swaps in.
   The VI view edits only those translations — order, rows, images and
   settings are shared and edited in the EN view. */
state.lang = (() => { try { return localStorage.getItem('snrt-admin:lang') === 'vi' ? 'vi' : 'en'; } catch (e) { return 'en'; } })();
function setLang(l) {
  state.lang = l;
  try { localStorage.setItem('snrt-admin:lang', l); } catch (e) {}
  renderEditor(); setPreview($('#previewPage').value || 'index.html');
}

const viGet = (obj, key) => (obj && obj.vi && obj.vi[key] != null ? obj.vi[key] : '');
const blank = (v) => v == null || v === '' || (Array.isArray(v) ? v.every(blank)
  : typeof v === 'object' ? Object.values(v).every(blank) : false);
// an empty value removes the key (and the vi object once nothing is left)
function viSet(obj, key, value) {
  if (blank(value)) {
    if (obj.vi) { delete obj.vi[key]; if (!Object.keys(obj.vi).length) delete obj.vi; }
  } else {
    obj.vi = obj.vi || {}; obj.vi[key] = value;
  }
  markDirty(); updateViProgress();
}

// one Vietnamese input with the English original shown above it;
// get/set default to obj.vi[key], or pass them for list / table cells
function viField(label, en, { rows, get, set } = {}) {
  const tag = rows ? 'textarea' : 'input';
  const n = el(tag, { type: rows ? null : 'text', rows, placeholder: en ? 'Chưa dịch — để trống thì web hiện tiếng Anh' : '' });
  n.value = get() || '';
  const wrap = el('label', { class: 'vi-field' + (en && !n.value ? ' todo' : '') }, label,
    en ? el('div', { class: 'en-ref' }, String(en)) : null, n);
  n.addEventListener('input', () => { set(n.value); wrap.classList.toggle('todo', !!en && !n.value); });
  return wrap;
}
const viOf = (obj, key, label, opts = {}) => viField(label, obj[key], Object.assign({
  get: () => viGet(obj, key), set: (v) => viSet(obj, key, v) }, opts));
// arrays that follow the English length: highlights, table columns
function viArrayCell(obj, key, enArr, i) {
  return {
    get: () => (viGet(obj, key) || [])[i],
    set: (v) => { const a = enArr.map((_, j) => (viGet(obj, key) || [])[j] || ''); a[i] = v; viSet(obj, key, a); },
  };
}

// every translatable field of a project: [englishText, vietnameseText]
function viPairs(p) {
  const out = [];
  const add = (o, k) => { if (o && o[k]) out.push([o[k], viGet(o, k)]); };
  ['title', 'tagline', 'metaDescription', 'badge'].forEach((k) => add(p, k));
  ['title', 'tag', 'role', 'problem', 'coverAlt'].forEach((k) => add(p.card, k));
  (p.card.highlights || []).forEach((h, i) => h && out.push([h, (viGet(p.card, 'highlights') || [])[i]]));
  (p.meta || []).forEach((m) => { add(m, 'label'); add(m, 'value'); });
  (p.blocks || []).forEach((b) => {
    ['heading', 'body', 'intro', 'note'].forEach((k) => add(b, k));
    if (b.type === 'table') {
      (b.columns || []).forEach((c, i) => c && out.push([c, (viGet(b, 'columns') || [])[i]]));
      (b.rows || []).forEach((r, i) => r.forEach((c, j) => c && out.push([c, ((viGet(b, 'rows') || [])[i] || [])[j]])));
    }
    (b.items || []).forEach((it) => add(it, b.type === 'stats' ? 'label' : 'text'));
  });
  (p.shots || []).forEach((s) => { add(s, 'alt'); add(s, 'caption'); });
  const secs = viGet(p, 'sections') || {};
  [...new Set((p.shots || []).map((s) => s.section).filter(Boolean))].forEach((n) => out.push([n, secs[n]]));
  return out;
}
function viProgressText(p) {
  const pairs = viPairs(p);
  const done = pairs.filter(([, v]) => v).length;
  return `Tiếng Việt: ${done}/${pairs.length}`;
}
function updateViProgress() {
  const pill = $('#viProgress'); const p = cur();
  if (pill && p) pill.textContent = viProgressText(p);
}

function renderViEditor(ed, p) {
  ed.append(el('p', { class: 'hint vi-intro' },
    'Mỗi ô có bản tiếng Anh ở trên để đối chiếu. Ô để trống thì web hiện tiếng Anh ở chế độ VI. Muốn thêm/bớt dòng, đổi thứ tự hay ảnh thì chuyển về EN — cấu trúc dùng chung cho cả hai ngôn ngữ.'));

  ed.append(card('Thông tin chung', true,
    viOf(p, 'title', 'Tên project'),
    p.badge ? viOf(p, 'badge', 'Nhãn nhỏ dưới tên') : null,
    viOf(p, 'tagline', 'Tagline', { rows: 2 }),
    viOf(p, 'metaDescription', 'Mô tả SEO', { rows: 2 })));

  ed.append(card('Thông số', true, ...(p.meta || []).map((m) => el('div', { class: 'grid2' },
    viOf(m, 'label', 'Tên'), viOf(m, 'value', 'Giá trị')))));

  const hl = p.card.highlights || [];
  ed.append(card('Thẻ ở trang chủ (Work)', true,
    el('div', { class: 'grid2' }, viOf(p.card, 'title', 'Tên trên thẻ'), viOf(p.card, 'tag', 'Tag dưới tên')),
    viOf(p.card, 'role', 'Vai trò (Role)'),
    ...hl.map((h, i) => viField(`Highlight ${i + 1}`, h, viArrayCell(p.card, 'highlights', hl, i))),
    viOf(p.card, 'problem', 'Problem', { rows: 4 }),
    viOf(p.card, 'coverAlt', 'Mô tả ảnh cover (alt)')));

  const blocks = el('div', { class: 'row-list' });
  (p.blocks || []).forEach((b, bi) => {
    const box = el('div', { class: 'block' }, el('div', { class: 'block-head' },
      el('b', {}, `Khối ${bi + 1}`), el('span', { class: 'hint' }, BLOCK_TYPES.find(([t]) => t === b.type)?.[1] || b.type)));
    box.append(viOf(b, 'heading', 'Tiêu đề khối'));
    if (b.type === 'table') {
      const cols = b.columns || []; const rows = b.rows || [];
      if (b.intro) box.append(viOf(b, 'intro', 'Đoạn mở đầu', { rows: 2 }));
      box.append(el('div', { class: 'grid2' }, ...cols.map((c, i) => viField(`Cột ${i + 1}`, c, viArrayCell(b, 'columns', cols, i)))));
      rows.forEach((r, ri) => box.append(el('div', { class: 'vi-row' }, el('span', { class: 'hint' }, `Hàng ${ri + 1}`),
        ...r.map((c, ci) => viField(cols[ci] || `Cột ${ci + 1}`, c, {
          rows: String(c).length > 28 ? Math.min(6, Math.max(2, Math.ceil(String(c).length / 38))) : undefined,
          get: () => ((viGet(b, 'rows') || [])[ri] || [])[ci],
          set: (v) => {
            const cur2 = viGet(b, 'rows') || [];
            const grid = rows.map((row, i) => row.map((_, j) => (cur2[i] || [])[j] || ''));
            grid[ri][ci] = v; viSet(b, 'rows', grid);
          },
        })))));
      if (b.note) box.append(viOf(b, 'note', 'Ghi chú dưới bảng', { rows: 2 }));
    } else if (b.type === 'chips' || b.type === 'stats') {
      const k = b.type === 'stats' ? 'label' : 'text';
      box.append(el('div', { class: 'grid2' }, ...(b.items || []).map((it, i) =>
        viOf(it, k, b.type === 'stats' ? `${it.value || ''} — chú thích` : `Mục ${i + 1}`))));
    } else {
      box.append(viOf(b, 'body', 'Nội dung', { rows: Math.min(14, Math.max(4, Math.ceil(String(b.body || '').length / 90))) }));
    }
    blocks.append(box);
  });
  ed.append(card('Nội dung case study', true,
    el('div', { class: 'md-help', html: 'Giữ nguyên cách viết như bản tiếng Anh: dòng trống = đoạn mới · <code>- </code> = gạch đầu dòng · <code>**chữ đậm**</code>' }),
    blocks));

  const names = [...new Set((p.shots || []).map((s) => s.section).filter(Boolean))];
  if (names.length) {
    ed.append(card('Tên section (breadcrumb)', false, el('div', { class: 'grid2' }, ...names.map((n) => viField(n, n, {
      get: () => (viGet(p, 'sections') || {})[n],
      set: (v) => viSet(p, 'sections', Object.assign({}, viGet(p, 'sections') || {}, { [n]: v })),
    })))));
  }

  const shots = (p.shots || []).filter((s) => s.alt || s.caption);
  if (shots.length) {
    ed.append(card(`Mô tả ảnh (${shots.length})`, false, ...shots.map((s) => el('div', { class: 'vi-shot' },
      thumb(s.src),
      el('div', { class: 'row-list' },
        s.alt ? viOf(s, 'alt', 'Alt') : null,
        s.caption ? viOf(s, 'caption', 'Chú thích') : null)))));
  }

  ed.append(card('Tên tab năng lực (dùng chung mọi project)', false, el('div', { class: 'grid2' },
    ...state.data.filters.map((f) => viOf(f, 'label', f.id)))));
}

/* ---------------- editor ---------------- */
function renderEditor() {
  const ed = $('#editor');
  const scroll = ed.scrollTop;
  const openState = [...ed.querySelectorAll('details.card')].map((d) => d.open);
  ed.innerHTML = '';
  if (state.view === 'contacts') { renderContacts(ed); ed.scrollTop = scroll; return; }
  if (state.sel < 0) { ed.append(el('div', { class: 'empty' }, 'Chưa có project nào. Bấm “+ Thêm”.')); return; }
  const p = cur();
  p.card = p.card || {}; p.meta = p.meta || []; p.blocks = p.blocks || []; p.shots = p.shots || [];
  p.card.highlights = p.card.highlights || [];
  const rr = () => renderEditor();
  ed.append(el('datalist', { id: 'sectionNames' }, [...new Set(p.shots.map((x) => x.section).filter(Boolean))].map((n) => el('option', { value: n }))));

  ed.append(el('div', { class: 'editor-head' },
    el('h1', {}, p.title || '(chưa đặt tên)'),
    el('span', { class: 'pill' + (p.visible !== false ? ' on' : '') }, p.visible !== false ? 'Đang hiển thị' : 'Đang ẩn'),
    p.passwordHash ? el('span', { class: 'pill on' }, '🔒 Có mật khẩu') : null,
    el('span', { class: 'pill', id: 'viProgress', title: 'Số ô đã dịch / tổng số ô có chữ' }, viProgressText(p)),
    el('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Ngôn ngữ đang sửa' },
      ...[['en', 'EN'], ['vi', 'VI']].map(([l, t]) => el('button', {
        type: 'button', class: state.lang === l ? 'on' : '', 'aria-pressed': String(state.lang === l),
        onclick: () => { if (state.lang !== l) setLang(l); },
      }, t)))));

  if (state.lang === 'vi') {
    renderViEditor(ed, p);
    const cardsVi = ed.querySelectorAll('details.card');
    if (openState.length === cardsVi.length) cardsVi.forEach((d, i) => (d.open = openState[i]));
    ed.scrollTop = scroll;
    return;
  }

  /* basics */
  const slugInput = el('input', { type: 'text' }); slugInput.value = p.slug;
  slugInput.addEventListener('change', () => {
    const s = uniqueSlug(slugify(slugInput.value), state.sel);
    slugInput.value = s; p.slug = s; markDirty(); renderList();
  });
  ed.append(card('Thông tin chung', true,
    el('div', { class: 'grid2' },
      field('Tên project', input(p, 'title', { onchange: () => renderList() })),
      field('Đường dẫn (slug) → project-<slug>.html', slugInput)),
    el('div', { class: 'grid2' },
      field('Nhóm (tab năng lực)', select(p, 'category', categories(), renderFilters)),
      field('Nhãn nhỏ dưới tên (tuỳ chọn, vd: Self-initiated concept)', input(p, 'badge'))),
    field('Tagline — 1 câu dưới tên trên trang chi tiết', input(p, 'tagline', { type: 'textarea', rows: 2 })),
    field('Mô tả SEO (meta description)', input(p, 'metaDescription', { type: 'textarea', rows: 2 })),
    el('div', { class: 'row' },
      toggle('Hiển thị trên web', p, 'visible', () => { renderList(); rr(); }),
      toggle('Có trong carousel “Projects overview”', p, 'featured'),
      toggle('Breadcrumb section dọc', p, 'sectionNav'))));

  /* meta rows */
  ed.append(card('Thông số (Year, Role, Scope…)', false,
    listEditor(p.meta, [['label', 'Tên (vd: Year)'], ['value', 'Giá trị']], () => ({ label: '', value: '' }), rr)));

  /* homepage card */
  const coverBox = el('div', { class: 'cover-row' },
    thumb(p.card.cover),
    el('div', { class: 'row-list' },
      el('div', { class: 'add-row' },
        el('button', { class: 'btn small', type: 'button', onclick: async () => {
          const [f] = await filePicker(false, 'image/*'); if (!f) return;
          try { p.card.cover = await upload(f); markDirty(); rr(); toast('Đã tải ảnh cover'); } catch (e) { toast(e.message, true); }
        } }, 'Tải ảnh cover'),
        el('button', { class: 'btn small ghost', type: 'button', onclick: async () => {
          const src = await pickExisting(); if (src) { p.card.cover = src; markDirty(); rr(); }
        } }, 'Chọn ảnh có sẵn'),
        p.card.cover ? el('button', { class: 'btn small ghost', type: 'button', onclick: () => { p.card.cover = ''; markDirty(); rr(); } }, 'Bỏ ảnh') : null),
      field('Mô tả ảnh (alt)', input(p.card, 'coverAlt')),
      field('Nền gradient khi chưa có ảnh (CSS)', input(p.card, 'coverGradient', { placeholder: 'linear-gradient(155deg,#4fa9ff,#0a0a0b)' }))));
  ed.append(card('Thẻ ở trang chủ (Work)', true,
    coverBox,
    el('div', { class: 'grid2' },
      field('Tên trên thẻ', input(p.card, 'title')),
      field('Tag dưới tên (vd: B2B SaaS · IoT)', input(p.card, 'tag'))),
    field('Vai trò (Role)', input(p.card, 'role')),
    field('Highlights (3 dòng là đẹp nhất)', listEditor(p.card.highlights, 'Highlight', () => '', rr)),
    field('Problem — đoạn mô tả bên trái', ...[].concat(input(p.card, 'problem', { type: 'textarea', rows: 4, counter: [150, 260] })))));

  /* content blocks */
  const blocksBox = el('div', { class: 'row-list' });
  p.blocks.forEach((b, i) => blocksBox.append(blockEditor(p.blocks, b, i, rr)));
  blocksBox.append(el('div', { class: 'add-row' },
    ...BLOCK_TYPES.map(([t, name]) => el('button', { class: 'btn small', type: 'button', onclick: () => {
      p.blocks.push(t === 'text' ? { type: t, heading: '', body: '' } : t === 'table'
        ? { type: t, heading: '', intro: '', columns: ['Cột 1', 'Cột 2'], rows: [['', '']], note: '' }
        : { type: t, heading: '', items: [] });
      markDirty(); rr();
    } }, '+ ' + name))));
  ed.append(card('Nội dung case study', true,
    el('div', { class: 'md-help', html: 'Cách viết: dòng trống = đoạn mới · dòng bắt đầu bằng <code>- </code> = gạch đầu dòng · <code>**chữ đậm**</code> · <code>*nghiêng*</code> · <code>[chữ](https://link)</code>' }),
    blocksBox));

  /* showcase */
  const shotsGrid = el('div', { class: 'shots' });
  p.shots.forEach((s, i) => shotsGrid.append(shotEditor(p.shots, s, i, rr)));
  const dz = el('div', { class: 'dropzone' }, 'Kéo thả ảnh / video vào đây, hoặc bấm để chọn (nhiều file cùng lúc)');
  const addFiles = async (files) => {
    for (const f of files) {
      try {
        const src = await upload(f);
        p.shots.push({ type: /^video\//.test(f.type) ? 'video' : 'image', src, caption: '', alt: '', mobile: false });
      } catch (e) { toast(e.message, true); }
    }
    markDirty(); rr(); toast(`Đã tải ${files.length} file`);
  };
  dz.addEventListener('click', async () => addFiles(await filePicker(true)));
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); addFiles([...e.dataTransfer.files]); });
  ed.append(card(`Ảnh / video hiển thị (${p.shots.length})`, true, dz,
    el('div', { class: 'add-row' },
      el('button', { class: 'btn small ghost', type: 'button', onclick: async () => {
        const src = await pickExisting(); if (!src) return;
        p.shots.push({ type: /\.(mp4|webm)$/i.test(src) ? 'video' : 'image', src, caption: '', alt: '', mobile: false }); markDirty(); rr();
      } }, 'Thêm ảnh có sẵn')),
    shotsGrid));

  /* password */
  const pw = el('input', { type: 'password', placeholder: 'Mật khẩu mới' });
  ed.append(card('Mật khẩu (NDA)', !!p.passwordHash,
    el('div', { class: 'lock-state' }, p.passwordHash ? '🔒 Project này đang khoá bằng mật khẩu.' : 'Không khoá — ai cũng xem được.'),
    el('div', { class: 'row' }, pw,
      el('button', { class: 'btn small', type: 'button', onclick: async () => {
        const v = pw.value.trim().toLowerCase(); if (!v) return toast('Nhập mật khẩu trước', true);
        p.passwordHash = await sha256(v); markDirty(); rr(); toast('Đã đặt mật khẩu — nhớ Lưu');
      } }, p.passwordHash ? 'Đổi mật khẩu' : 'Đặt mật khẩu'),
      p.passwordHash ? el('button', { class: 'btn small ghost', type: 'button', onclick: () => { p.passwordHash = ''; markDirty(); rr(); } }, 'Gỡ mật khẩu') : null),
    el('p', { class: 'hint' }, 'Mật khẩu không phân biệt hoa thường. Đây là lớp che phía trình duyệt — đủ để giữ NDA với người xem bình thường, không phải bảo mật tuyệt đối.')));

  /* danger */
  ed.append(card('Xoá project', false,
    el('p', { class: 'hint' }, 'Xoá khỏi danh sách và xoá trang project-' + p.slug + '.html khi lưu. Ảnh trong assets/ vẫn được giữ lại.'),
    el('button', { class: 'btn danger', type: 'button', onclick: () => {
      if (!confirm(`Xoá hẳn project “${p.title}”?`)) return;
      state.data.projects.splice(state.sel, 1);
      state.sel = Math.min(state.sel, state.data.projects.length - 1);
      markDirty(); renderList(); renderEditor(); setPreview('index.html');
    } }, 'Xoá project này')));

  // keep collapsed/expanded state and scroll position across re-renders
  const cards = ed.querySelectorAll('details.card');
  if (openState.length === cards.length) cards.forEach((d, i) => (d.open = openState[i]));
  ed.scrollTop = scroll;
}

function blockEditor(arr, b, i, rr) {
  const typeSel = select(b, 'type', BLOCK_TYPES, () => {
    if (b.type === 'text' && b.body == null) b.body = '';
    if ((b.type === 'chips' || b.type === 'stats') && !Array.isArray(b.items)) b.items = [];
    if (b.type === 'table' && !b.columns) Object.assign(b, { intro: '', columns: ['Cột 1', 'Cột 2'], rows: [['', '']], note: '' });
    rr();
  });
  const box = el('div', { class: 'block' },
    el('div', { class: 'block-head' }, typeSel, el('span', { class: 'spacer' }),
      el('button', { class: 'icon-btn', type: 'button', title: 'Lên', onclick: () => { if (moveIn(arr, i, -1)) { markDirty(); rr(); } } }, '↑'),
      el('button', { class: 'icon-btn', type: 'button', title: 'Xuống', onclick: () => { if (moveIn(arr, i, 1)) { markDirty(); rr(); } } }, '↓'),
      el('button', { class: 'icon-btn', type: 'button', title: 'Xoá khối', onclick: () => { if (confirm('Xoá khối này?')) { arr.splice(i, 1); markDirty(); rr(); } } }, '✕')),
    el('div', { class: 'grid2' },
      field('Tiêu đề khối', input(b, 'heading')),
      field('Gắn với section (tuỳ chọn)', (() => { const i = input(b, 'section'); i.setAttribute('list', 'sectionNames'); return i; })())));

  if (b.type === 'chips') {
    b.items = b.items || [];
    box.append(listEditor(b.items, [['text', 'Deliverable'], ['nda', 'NDA', 'check']], () => ({ text: '', nda: false }), rr));
  } else if (b.type === 'stats') {
    b.items = b.items || [];
    box.append(listEditor(b.items, [['value', 'Số (vd: 1,229)'], ['label', 'Chú thích']], () => ({ value: '', label: '' }), rr));
  } else if (b.type === 'table') {
    const cols = el('input', { type: 'text' }); cols.value = (b.columns || []).join(' | ');
    cols.addEventListener('input', () => { b.columns = cols.value.split('|').map((s) => s.trim()); markDirty(); });
    const rows = el('textarea', { rows: 5 }); rows.value = (b.rows || []).map((r) => r.join(' | ')).join('\n');
    rows.addEventListener('input', () => { b.rows = rows.value.split('\n').filter((l) => l.trim()).map((l) => l.split('|').map((s) => s.trim())); markDirty(); });
    box.append(
      field('Đoạn mở đầu (tuỳ chọn)', input(b, 'intro', { type: 'textarea', rows: 2 })),
      field('Tên cột — ngăn cách bằng |', cols),
      field('Các dòng — mỗi dòng một hàng, ngăn cột bằng |', rows),
      field('Ghi chú dưới bảng (tuỳ chọn)', input(b, 'note', { type: 'textarea', rows: 2 })));
  } else {
    box.append(field('Nội dung', input(b, 'body', { type: 'textarea', rows: 6 })));
  }
  return box;
}

function shotEditor(arr, s, i, rr) {
  const mob = el('input', { type: 'checkbox' }); mob.checked = !!s.mobile;
  mob.addEventListener('change', () => { s.mobile = mob.checked; markDirty(); });
  const cap = el('input', { type: 'text', placeholder: 'Chú thích (hiện dưới ảnh)' }); cap.value = s.caption || '';
  cap.addEventListener('input', () => { s.caption = cap.value; markDirty(); });
  const alt = el('input', { type: 'text', placeholder: 'Alt (mô tả cho SEO)' }); alt.value = s.alt || '';
  alt.addEventListener('input', () => { s.alt = alt.value; markDirty(); });
  const sec = el('input', { type: 'text', placeholder: 'Section (tên trên breadcrumb)', list: 'sectionNames' }); sec.value = s.section || '';
  sec.addEventListener('input', () => { s.section = sec.value.trim(); markDirty(); });
  return el('div', { class: 'shot' },
    s.type === 'gradient' ? el('div', { class: 'shot-media', style: `background:${s.css}` }) : thumb(s.src),
    el('div', { class: 'shot-body' },
      sec, cap, s.type === 'image' ? alt : null,
      el('div', { class: 'shot-tools' },
        s.type === 'image' ? el('label', { class: 'switch' }, mob, 'Khung mobile') : el('span', { style: 'margin-right:auto;font-size:.72rem;color:#77736a' }, s.type),
        el('button', { class: 'icon-btn', type: 'button', title: 'Lên trước', onclick: () => { if (moveIn(arr, i, -1)) { markDirty(); rr(); } } }, '←'),
        el('button', { class: 'icon-btn', type: 'button', title: 'Ra sau', onclick: () => { if (moveIn(arr, i, 1)) { markDirty(); rr(); } } }, '→'),
        el('button', { class: 'icon-btn', type: 'button', title: 'Thay file', onclick: async () => {
          const [f] = await filePicker(false); if (!f) return;
          try { s.src = await upload(f); s.type = /^video\//.test(f.type) ? 'video' : 'image'; markDirty(); rr(); } catch (e) { toast(e.message, true); }
        } }, '⟳'),
        el('button', { class: 'icon-btn', type: 'button', title: 'Xoá', onclick: () => { arr.splice(i, 1); markDirty(); rr(); } }, '✕'))));
}

/* ---------------- preview ---------------- */
function renderPreviewOptions() {
  const sel = $('#previewPage'); const keep = sel.value;
  sel.innerHTML = '';
  sel.append(el('option', { value: 'index.html' }, 'Trang chủ'));
  state.data.projects.forEach((p) => sel.append(el('option', { value: `project-${p.slug}.html` }, (p.visible === false ? '(ẩn) ' : '') + p.title)));
  if (keep) sel.value = keep;
}
function setPreview(page) {
  $('#previewPage').value = page;
  // preview in the language being edited
  const url = '/site/' + page + (state.lang === 'vi' ? '?lang=vi' : '?lang=en');
  $('#previewFrame').src = url; $('#openPreview').href = url;
}
function reloadPreview() {
  const f = $('#previewFrame');
  try { f.contentWindow.location.reload(); } catch (e) { f.src = f.src; }
}

/* ---------------- publish ---------------- */
async function openPublish() {
  if (state.dirty) {
    if (!confirm('Bạn còn thay đổi chưa lưu. Lưu & build trước khi publish?')) return;
    await save(); if (state.dirty) return;
  }
  const j = await (await fetch('/api/git/status')).json();
  $('#publishBranch').textContent = `Nhánh: ${j.branch} · commit gần nhất: ${j.last}`;
  const box = $('#changedFiles'); box.innerHTML = '';
  if (!j.files.length) box.append(el('div', {}, 'Không có thay đổi mới. Bấm Publish sẽ chỉ đẩy các commit chưa push (nếu có).'));
  j.files.forEach((f) => box.append(el('div', {}, el('b', {}, f.state || '?'), f.file)));
  $('#publishLog').hidden = true; $('#doPublish').disabled = false;
  $('#publishDialog').showModal();
}
async function doPublish() {
  const btn = $('#doPublish'); btn.disabled = true; btn.textContent = 'Đang đẩy lên…';
  const log = $('#publishLog'); log.hidden = false; log.textContent = 'Đang chạy git…';
  try {
    const r = await fetch('/api/git/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: $('#commitMsg').value }) });
    const j = await r.json();
    log.textContent = (j.log || []).map((l) => `$ ${l.cmd}\n${l.out || ''}`).join('\n\n') + (j.hint ? `\n\n⚠ ${j.hint}` : '');
    if (j.ok) toast('Đã publish! GitHub Pages sẽ cập nhật sau ~1 phút.');
    else toast('Publish chưa thành công — xem log', true);
  } catch (e) { log.textContent = e.message; toast(e.message, true); }
  btn.textContent = 'Commit & Push'; btn.disabled = false;
}

/* ---------------- wiring ---------------- */
$('#saveBtn').addEventListener('click', save);
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);
$('#newProjectBtn').addEventListener('click', newProject);
$('#contactsBtn').addEventListener('click', () => {
  state.view = 'contacts'; state.sel = state.data.projects.length ? state.sel : -1;
  document.querySelectorAll('.project-item.active').forEach((n) => n.classList.remove('active'));
  $('#editor').scrollTop = 0; renderEditor(); renderContactsSummary(); setPreview('index.html');
});
$('#publishBtn').addEventListener('click', openPublish);
$('#doPublish').addEventListener('click', doPublish);
$('#reloadPreview').addEventListener('click', reloadPreview);
$('#previewPage').addEventListener('change', (e) => setPreview(e.target.value));
$('#togglePreview').addEventListener('click', () => {
  const l = $('#layout'); l.classList.toggle('no-preview');
  $('#togglePreview').textContent = l.classList.contains('no-preview') ? 'Hiện preview' : 'Ẩn preview';
});
$('#previewSize').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  $('#previewSize').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  $('#previewFrame').style.width = b.dataset.w;
});
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  // ⌘Z inside a text field keeps the browser's own per-field undo
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !isTyping()) {
    e.preventDefault(); e.shiftKey ? redo() : undo();
  }
});
window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

load().catch((e) => toast('Không tải được dữ liệu: ' + e.message, true));
