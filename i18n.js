// Language switch (EN / VI) — shared across every page.
// English is authored directly in the HTML; the Vietnamese copy sits next to
// it on the same element: data-vi for the element's content, data-vi-<attr>
// for an attribute (data-vi-alt, data-vi-placeholder, data-vi-data-title…).
// This file must load before script.js / project-detail.js so the chosen
// language is in place before any animation measures or splits text.
// Switching swaps the text in place (no reload, no second preloader) and
// fires a "snrt:lang" event so scripts can refresh text they generate.
(function () {
  var KEY = 'snrt:lang';
  var ATTRS = ['alt', 'placeholder', 'aria-label', 'content', 'title',
    'data-title', 'data-role', 'data-problem', 'data-highlights'];
  var SELECTOR = '[data-vi],' + ATTRS.map(function (a) { return '[data-vi-' + a + ']'; }).join(',');
  var originals = new WeakMap();

  function persist(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }

  function initial() {
    var q = /[?&]lang=(vi|en)\b/.exec(location.search);
    if (q) { persist(q[1]); return q[1]; }
    try {
      var s = localStorage.getItem(KEY);
      if (s === 'vi' || s === 'en') return s;
    } catch (e) {}
    var n = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^vi\b/i.test(n) ? 'vi' : 'en';
  }

  var lang = initial();

  function apply(l) {
    document.documentElement.lang = l;
    var els = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var en = originals.get(el);
      if (!en) {
        en = { html: el.innerHTML, attrs: {} };
        ATTRS.forEach(function (a) { if (el.hasAttribute('data-vi-' + a)) en.attrs[a] = el.getAttribute(a); });
        originals.set(el, en);
      }
      if (el.hasAttribute('data-vi')) el.innerHTML = l === 'vi' ? el.getAttribute('data-vi') : en.html;
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute('data-vi-' + a)) return;
        var v = l === 'vi' ? el.getAttribute('data-vi-' + a) : en.attrs[a];
        if (v == null) el.removeAttribute(a); else el.setAttribute(a, v);
      });
    }
    var btns = document.querySelectorAll('.lang-toggle [data-lang]');
    for (var j = 0; j < btns.length; j++) btns[j].setAttribute('aria-pressed', String(btns[j].getAttribute('data-lang') === l));
  }

  function set(l) {
    if (l !== 'vi' && l !== 'en') return;
    persist(l);
    if (l === lang) return;
    lang = l;
    apply(l);
    document.dispatchEvent(new CustomEvent('snrt:lang', { detail: { lang: l } }));
  }

  window.SNRT_I18N = {
    get lang() { return lang; },
    // pick the string for the current language; falls back to English
    t: function (en, vi) { return lang === 'vi' && vi != null ? vi : en; },
    set: set
  };

  // English is already in the markup, so only a Vietnamese visit needs work
  if (lang === 'vi') apply('vi');
  else apply('en');

  var toggle = document.getElementById('langToggle');
  if (toggle) {
    toggle.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lang]');
      set(b ? b.getAttribute('data-lang') : (lang === 'vi' ? 'en' : 'vi'));
    });
  }
})();
