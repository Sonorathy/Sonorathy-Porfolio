/* Custom circle cursor for standalone project detail pages
   (lightweight mirror of the cursor logic in script.js — no GSAP/Lenis dependency) */
document.addEventListener('DOMContentLoaded', () => {
  /* Mobile: keep the intro short so the images come right after it. The
     long text blocks collapse behind a "Read the case study" toggle; the
     CSS only applies the collapse at the stacked (≤900px) layout. */
  const infoCol = document.querySelector('.pd-info');
  const textBlocks = infoCol ? infoCol.querySelectorAll('.pd-block:not(.pd-reach)') : [];
  const moreAnchor = infoCol && (infoCol.querySelector('.pd-meta') || infoCol.querySelector('.pd-tagline'));
  if (textBlocks.length && moreAnchor) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'pd-more';
    more.setAttribute('aria-expanded', 'false');
    const T = (en, vi) => (window.SNRT_I18N ? window.SNRT_I18N.t(en, vi) : en);
    const n = textBlocks.length;
    const label = (open) => open ? T('Show less', 'Thu gọn')
      : T(`Read the case study · ${n} section${n > 1 ? 's' : ''}`, `Đọc case study · ${n} phần`);
    more.innerHTML = `<span>${label(false)}</span><i aria-hidden="true">&darr;</i>`;
    moreAnchor.insertAdjacentElement('afterend', more);
    infoCol.classList.add('is-collapsible');
    const isOpen = () => infoCol.classList.contains('is-expanded');
    more.addEventListener('click', () => {
      const open = infoCol.classList.toggle('is-expanded');
      more.setAttribute('aria-expanded', String(open));
      more.querySelector('span').textContent = label(open);
      if (!open) more.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.addEventListener('snrt:lang', () => { more.querySelector('span').textContent = label(isOpen()); });
  }

  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  let mx = 0, my = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });

  function animateCursor() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  document.querySelectorAll('[data-hover]').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
  });

  /* Showcase video: auto-play (muted) once it scrolls into view, pause when it leaves */
  const showcaseVideos = document.querySelectorAll('.pd-showcase-item video');
  if (showcaseVideos.length && 'IntersectionObserver' in window) {
    showcaseVideos.forEach(video => {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { root: video.closest('.pd-showcase'), threshold: 0.5 });
      io.observe(video);
    });
  }

  /* Floating Prev/Next buttons: reveal once the visitor has scrolled to
     the end of either column (finished reading/viewing), or whenever the
     cursor hovers near the very bottom of the screen. */
  const navFloats = document.querySelectorAll('.pd-next-float, .pd-prev-float');
  if (navFloats.length) {
    const panels = [document.querySelector('.pd-info'), document.querySelector('.pd-showcase')].filter(Boolean);
    const BOTTOM_ZONE = 120;
    const EDGE_SLACK = 24;

    function panelAtBottom(el) {
      return el.scrollTop + el.clientHeight >= el.scrollHeight - EDGE_SLACK;
    }
    function pageAtBottom() {
      return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - EDGE_SLACK;
    }
    function updateFromScroll() {
      // stacked (mobile) layout: the columns don't scroll on their own, so
      // only the page position counts — otherwise the buttons cover the images
      const stackedLayout = window.matchMedia('(max-width:900px)').matches;
      const atBottom = (!stackedLayout && panels.some(panelAtBottom)) || pageAtBottom();
      navFloats.forEach(el => el.classList.toggle('show', atBottom));
    }

    panels.forEach(el => el.addEventListener('scroll', updateFromScroll, { passive: true }));
    window.addEventListener('scroll', updateFromScroll, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (window.innerHeight - e.clientY < BOTTOM_ZONE) {
        navFloats.forEach(el => el.classList.add('show'));
      } else {
        updateFromScroll();
      }
    });

    updateFromScroll();
  }

  /* Vertical section breadcrumb: highlight the section currently at the
     top of the showcase column; clicking jumps the showcase there and
     scrolls the text column to the block tagged with the same section. */
  const secNav = document.querySelector('.pd-secnav');
  const showcase = document.querySelector('.pd-showcase');
  if (secNav && showcase) {
    const items = [...secNav.querySelectorAll('.pd-secnav-item')];
    const anchors = items.map((a) => document.getElementById(a.dataset.target)).filter(Boolean);
    const info = document.querySelector('.pd-info');
    const stacked = () => window.matchMedia('(max-width:900px)').matches;

    function setActive(id) {
      items.forEach((a) => a.classList.toggle('is-active', a.dataset.target === id));
    }
    function spy() {
      const top = showcase.getBoundingClientRect().top + showcase.clientHeight * 0.3;
      let current = anchors[0];
      anchors.forEach((a) => { if (a.getBoundingClientRect().top <= top) current = a; });
      if (current) setActive(current.id);
    }
    showcase.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('scroll', spy, { passive: true });

    items.forEach((a) => a.addEventListener('click', (e) => {
      const target = document.getElementById(a.dataset.target);
      if (!target) return;
      e.preventDefault();
      if (stacked()) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        showcase.scrollTo({ top: target.offsetTop - showcase.offsetTop, behavior: 'smooth' });
        const block = info && info.querySelector(`[data-section="${a.dataset.target}"]`);
        if (block) info.scrollTo({ top: block.offsetTop - info.offsetTop - 80, behavior: 'smooth' });
      }
      setActive(a.dataset.target);
    }));
    spy();
  }
});
