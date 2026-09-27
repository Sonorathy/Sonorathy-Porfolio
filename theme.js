// Light / dark theme toggle — shared across every page.
// The actual theme is applied synchronously by an inline snippet in <head>
// (before first paint, to avoid a flash of the wrong theme). This file wires
// up the floating toggle button and plays a "curtain falling" transition:
// a full-viewport panel sweeps down covering the screen, the theme swaps
// underneath while hidden, then the panel keeps falling through and off
// the bottom edge, revealing the new theme as it passes — one continuous
// motion, no cross-fade flash.
(function () {
  var KEY = 'snrt:theme';
  // must stay in sync with --bg in style.css (:root and [data-theme="light"])
  var BG = { dark: '#0a0a0b', light: '#f6f4ee' };
  var isAnimating = false;

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function persist(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) {}
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function getCurtain() {
    var el = document.getElementById('themeCurtain');
    if (!el) {
      el = document.createElement('div');
      el.id = 'themeCurtain';
      el.className = 'theme-curtain';
      document.body.appendChild(el);
    }
    return el;
  }

  function switchTheme(next) {
    if (isAnimating) return;

    if (prefersReducedMotion() || !('animate' in document.documentElement)) {
      apply(next);
      persist(next);
      return;
    }

    isAnimating = true;
    var curtain = getCurtain();
    curtain.style.background = BG[next];
    curtain.style.transform = 'translateY(-100%)';
    curtain.style.opacity = '1';

    var fall = curtain.animate(
      [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0%)' }],
      { duration: 500, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }
    );

    fall.onfinish = function () {
      // theme swaps while fully hidden behind the curtain
      apply(next);
      persist(next);

      var through = curtain.animate(
        [{ transform: 'translateY(0%)' }, { transform: 'translateY(100%)' }],
        { duration: 560, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }
      );
      through.onfinish = function () {
        curtain.style.transform = 'translateY(-100%)';
        curtain.style.opacity = '0';
        isAnimating = false;
      };
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      switchTheme(next);
    });
  });
})();
