/* =========================================================
   Sonorathy Portfolio — motion layer
   GSAP + ScrollTrigger + Lenis smooth scroll
   ========================================================= */

/* ---------------- Scroll position memory ----------------
   GSAP's pinned sections (hero, work gallery) inject spacer elements
   whose final height only exists once ScrollTrigger has initialized.
   The browser's own scroll-position restoration runs before any of our
   JS executes, so it uses the page's pre-init height and can land the
   user somewhere unrelated to where they actually left off — e.g.
   snapping to Featured Projects on a reload instead of wherever they'd
   scrolled to. We take manual control: remember the real scrollY
   ourselves and restore it only after the pinned layout has settled
   (see restoreScrollPosition() below, called from hidePreloader). */
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const SNRT_SCROLL_KEY = 'sonorathy:scrollY';
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem(SNRT_SCROLL_KEY, String(window.scrollY || window.pageYOffset || 0));
});

// current-language string (see i18n.js); English when i18n isn't loaded
const i18nText = (en, vi) => (window.SNRT_I18N ? window.SNRT_I18N.t(en, vi) : en);

document.addEventListener('DOMContentLoaded', () => {

  const hasGSAP = typeof gsap !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Lenis smooth scroll ---------------- */
  let lenis;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });
    lenis.on('scroll', () => { if (hasGSAP) ScrollTrigger.update(); });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ---------------- Keep pinned scroll math in sync with real page height ----------------
     ScrollTrigger measures each pin's start/end in pixels once, during its
     initial refresh. Lazy-loaded images finishing decode later quietly grow
     the page's true height, so a trigger's cached numbers can drift out of
     sync with reality (e.g. the hero pin reading the wrong progress for its
     position after you've scrolled away and back). A single refresh once
     everything has settled on load keeps that honest.
     Deliberately NOT hooked to every individual <img> load event: the Work
     section's pin has a scrub + dynamic `end` that depends on its own card
     images, so refreshing every time any image anywhere finishes loading —
     including a work-card image lazy-loading in mid-drag — recalculates
     that pin's math while the visitor is actively scrolling through it,
     which is exactly what read as "giật" jank when moving between cards. */
  if (hasGSAP) {
    let refreshTimer;
    function scheduleScrollTriggerRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
    }
    window.addEventListener('load', scheduleScrollTriggerRefresh);
    // a language switch changes text lengths (and so section heights) —
    // it's a click, so the page is at rest and a refresh is safe
    document.addEventListener('snrt:lang', scheduleScrollTriggerRefresh);
  }

  /* ---------------- Preloader ---------------- */
  const preloader = document.getElementById('preloader');
  const counterEl = document.getElementById('counter');
  const fillEl = document.getElementById('preloaderFill');
  let count = 0;
  const preloadInterval = setInterval(() => {
    count += Math.floor(Math.random() * 8) + 4;
    if (count >= 100) {
      count = 100;
      clearInterval(preloadInterval);
      counterEl.textContent = count;
      fillEl.style.width = '100%';
      setTimeout(hidePreloader, 350);
    } else {
      counterEl.textContent = count;
      fillEl.style.width = count + '%';
    }
  }, 90);

  function restoreScrollPosition() {
    const saved = sessionStorage.getItem(SNRT_SCROLL_KEY);
    const y = saved ? parseFloat(saved) : 0;
    if (!y) return; // fresh visit — already at top, nothing to restore
    if (hasGSAP) ScrollTrigger.refresh();
    requestAnimationFrame(() => {
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    });
  }

  function hidePreloader() {
    restoreScrollPosition(); // do this first, still hidden behind the preloader
    if (hasGSAP) {
      gsap.to(preloader, {
        yPercent: -100,
        duration: 1,
        ease: 'power4.inOut',
        onComplete: () => { preloader.style.display = 'none'; playHeroIntro(); setupHeroSequence(); }
      });
    } else {
      preloader.style.transition = 'transform .8s ease';
      preloader.style.transform = 'translateY(-100%)';
      setTimeout(() => { preloader.style.display = 'none'; playHeroIntro(); setupHeroSequence(); }, 850);
    }
  }

  /* ---------------- Custom cursor ---------------- */
  const cursor = document.getElementById('cursor');
  const cursorLabel = cursor.querySelector('.cursor-label');
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

  /* Skill & Tool icons: hide the custom cursor and let the native pointer
     + name tooltip (CSS ::after, driven by data-tool) take over instead */
  document.querySelectorAll('.tool-tile').forEach(tile => {
    tile.addEventListener('mouseenter', () => cursor.classList.add('hide'));
    tile.addEventListener('mouseleave', () => cursor.classList.remove('hide'));
  });

  /* Featured-project cards: "View Detail" cursor label on hover */
  document.querySelectorAll('.work-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      cursor.classList.add('work-hover');
      cursorLabel.textContent = i18nText('View Detail', 'Xem chi tiết');
    });
    card.addEventListener('mouseleave', () => {
      cursor.classList.remove('work-hover');
    });
  });

  /* ---------------- Magnetic buttons ---------------- */
  document.querySelectorAll('[data-magnetic]').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      if (hasGSAP) {
        gsap.to(btn, { x: relX * 0.35, y: relY * 0.5, duration: 0.4, ease: 'power3.out' });
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (hasGSAP) gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });

  /* ---------------- Header: hide on scroll down, show on scroll up ---------------- */
  const header = document.getElementById('siteHeader');
  const heroEl = document.getElementById('hero');
  let heroBottom = heroEl ? heroEl.offsetTop + heroEl.offsetHeight : 0;
  window.addEventListener('resize', () => {
    heroBottom = heroEl ? heroEl.offsetTop + heroEl.offsetHeight : 0;
  });
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    // keep header pinned/visible while the hero name is morphing into the logo
    if (y > 120 && y > lastY && y > heroBottom) header.classList.add('hide');
    else header.classList.remove('hide');
    header.classList.toggle('scrolled', y > 40);
    lastY = y;
  });

  /* ---------------- Floating dock nav: active-section highlight ---------------- */
  const dockNav = document.getElementById('dockNav');
  const dockIndicator = document.getElementById('dockIndicator');
  if (dockNav) {
    const dockLinks = Array.from(dockNav.querySelectorAll('a'));
    const dockSections = dockLinks
      .map(a => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    function moveDockIndicator(link) {
      if (!link || !dockIndicator) return;
      const navRect = dockNav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const x = linkRect.left - navRect.left - 8; // account for nav padding
      const width = linkRect.width;
      dockIndicator.style.opacity = 1;
      if (hasGSAP) {
        gsap.to(dockIndicator, { x, width, duration: 0.5, ease: 'power3.out' });
      } else {
        dockIndicator.style.transform = `translateX(${x}px)`;
        dockIndicator.style.width = width + 'px';
      }
    }

    function setActive(id) {
      dockLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
      const activeLink = dockLinks.find(a => a.getAttribute('href') === '#' + id);
      if (activeLink) moveDockIndicator(activeLink);
    }

    if ('IntersectionObserver' in window && dockSections.length) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      dockSections.forEach(section => observer.observe(section));
    }

    window.addEventListener('resize', () => {
      const active = dockLinks.find(a => a.classList.contains('is-active'));
      if (active) moveDockIndicator(active);
    });
  }

  /* ---------------- Hero intro animation (crosses, copy, wordmark) ---------------- */
  function playHeroIntro() {
    if (!hasGSAP) return;
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('.hero-crosses span', { opacity: 0.4, duration: 0.6, stagger: 0.03 })
      .to('.hero-img-item', { opacity: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.12 }, '-=0.4')
      .to('.hero-meta-grid .hero-meta', { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, '-=0.5')
      .to('#heroWordmark', { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' }, '-=0.5');
  }

  // Set initial state for hero reveal
  if (hasGSAP) {
    gsap.set('#heroWordmark', { xPercent: -50, opacity: 0, scale: 0.9 });
    gsap.set('.hero-crosses span', { opacity: 0 });
    gsap.set('.hero-img-item', { opacity: 0, y: 30, scale: 0.94 });
    gsap.set('.hero-meta-grid .hero-meta', { opacity: 0, y: 24 });
  } else {
    document.getElementById('heroWordmark').style.transform = 'translateX(-50%)';
  }

  // the nav logo is only ever a scroll-morph target for the hero wordmark —
  // it must stay hidden from first paint (not just once setupHeroSequence's
  // deferred init() runs), otherwise both "Sonorathy" strings show at once
  // during the ~2.6s intro before the scroll wiring kicks in.
  const navLogoEl = document.getElementById('navLogo');
  if (navLogoEl) navLogoEl.style.visibility = 'hidden';

  /* ---------------- Hero triptych: cursor-driven parallax depth + hover scale ----
     Each still drifts at its own depth as the pointer moves across the stage,
     and scales up independently on hover — two separate GSAP tweens on two
     different properties of the same <img>, so they compose instead of fight. */
  const heroStageForParallax = document.getElementById('heroStage');
  const heroImgItems = document.querySelectorAll('.hero-img-item');
  // touch browsers sometimes synthesize a single `mousemove` at the tap
  // coordinates for legacy compatibility — with no matching mouseleave to
  // follow it, that one-off event would permanently shift the images
  // sideways within their oversized crop. This is a mouse-only hover
  // effect, so only wire it up on devices that actually have a real
  // pointer + hover (matches the same check used to hide the custom cursor).
  const supportsHoverParallax = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (heroStageForParallax && heroImgItems.length && hasGSAP && supportsHoverParallax) {
    const depths = [14, 24, 18]; // px drift range, staggered per still
    heroImgItems.forEach(item => {
      const img = item.querySelector('img');
      if (!img) return;
      item.addEventListener('mouseenter', () => gsap.to(img, { scale: 1.07, duration: 0.6, ease: 'power3.out' }));
      item.addEventListener('mouseleave', () => gsap.to(img, { scale: 1, duration: 0.6, ease: 'power3.out' }));
    });
    heroStageForParallax.addEventListener('mousemove', (e) => {
      const rect = heroStageForParallax.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      heroImgItems.forEach((item, i) => {
        const img = item.querySelector('img');
        if (!img) return;
        const depth = depths[i % depths.length];
        gsap.to(img, { x: relX * depth, y: relY * depth * 0.6, duration: 1, ease: 'power3.out' });
      });
    });
    heroStageForParallax.addEventListener('mouseleave', () => {
      heroImgItems.forEach(item => {
        const img = item.querySelector('img');
        if (img) gsap.to(img, { x: 0, y: 0, duration: 0.8, ease: 'power3.out' });
      });
    });
  }

  /* ---------------- Pinned hero sequence: wordmark scales into the nav logo,
     then copy fades, then the portrait shrinks into a framed inset —
     three strictly sequential layers while the stage is held in view. ---------------- */
  function setupHeroSequence() {
    const heroWordmark = document.getElementById('heroWordmark');
    const navLogo = document.getElementById('navLogo');
    const heroStageEl = document.getElementById('heroStage');
    if (!heroWordmark || !navLogo || !heroStageEl || !hasGSAP) return;

    // Pre-pin immediately, before ScrollTrigger even exists (that's wired up
    // ~2.6s from now, in init() below, once the intro reveal has settled).
    // At the current scroll position (top) this looks identical to the
    // stage's normal, unpinned layout, so there's no visible jump — but it
    // means that if a visitor scrolls during this window, the stage (and the
    // wordmark inside it) stays glued to the correct on-screen spot instead
    // of scrolling away in normal document flow. Without this, measuring the
    // wordmark's position below could capture it wherever a fast scroll had
    // carried it to, baking a wrong, permanent shrink-origin for the whole
    // session — the wordmark would then visibly run downward instead of
    // tucking into the nav on every later pass through hero.
    heroStageEl.classList.add('is-pinned');

    function init() {
      // measure where the wordmark rests and where the nav logo sits, so the
      // wordmark lands exactly on that spot on any layout/viewport.
      // Safe to measure now (rather than at true scroll position 0): heroStage
      // has been sitting in its pinned (fixed, top:0) state since page load
      // (see the pre-pin right after preloader hides, below) precisely so a
      // visitor who scrolls during this ~2.6s intro window can't shift the
      // wordmark out of its resting on-screen spot before we get to measure
      // it — that race used to bake a wrong, permanent transform-origin for
      // the rest of the session (wordmark shrinking toward the wrong point,
      // visibly running downward instead of tucking into the nav, but only
      // reproducible if you happened to scroll early — e.g. on a return visit
      // where you're quicker to scroll than on a first, unhurried load).
      // Scale from the wordmark's own center while translating that center
      // onto the logo's center, in the same tween. (Scaling around an origin
      // placed at the logo only converges at scale 0 — at the real end scale
      // the wordmark stopped ~40px short, then the logo swap snapped it up,
      // which read as "shrink first, move after".)
      const wordmarkRect = heroWordmark.getBoundingClientRect();
      const logoRect = navLogo.getBoundingClientRect();
      const moveX = (logoRect.left + logoRect.width / 2) - (wordmarkRect.left + wordmarkRect.width / 2);
      const moveY = (logoRect.top + logoRect.height / 2) - (wordmarkRect.top + wordmarkRect.height / 2);
      heroWordmark.style.transformOrigin = '50% 50%';

      const wordmarkFontSize = parseFloat(getComputedStyle(heroWordmark).fontSize);
      const logoFontSize = parseFloat(getComputedStyle(navLogo).fontSize);
      const scaleEnd = logoFontSize / wordmarkFontSize;

      // navLogo is already hidden from first paint (see navLogoEl above) —
      // it only becomes visible once the scroll timeline crosses 1/3 progress.

      // now hand pin authority over to ScrollTrigger — it takes the stage
      // straight from the pre-pinned state set right after the preloader hid,
      // so there's no visual jump at the handoff.
      heroStageEl.classList.remove('is-pinned');

      // manually pin the stage while scrolling through the 200vh spacer above —
      // a plain class toggle + position:fixed rather than ScrollTrigger's pin
      // option, so it can dock at the bottom of the spacer once finished.
      ScrollTrigger.create({
        trigger: '.hero-pin',
        start: 'top top',
        end: 'bottom top',
        onEnter: () => { heroStageEl.classList.remove('is-past'); heroStageEl.classList.add('is-pinned'); },
        onLeave: () => { heroStageEl.classList.remove('is-pinned'); heroStageEl.classList.add('is-past'); },
        onEnterBack: () => { heroStageEl.classList.remove('is-past'); heroStageEl.classList.add('is-pinned'); },
        onLeaveBack: () => heroStageEl.classList.remove('is-pinned')
      });

      // four layered phases, each overlapping the previous instead of
      // waiting for it to fully finish — the handoff blends rather than
      // snapping between segments. Easing is applied to each phase's own
      // local progress (still fully scrub-driven overall, just curved
      // rather than linear) so values accelerate/settle instead of moving
      // at a constant, slightly robotic rate.
      const P1_START = 0,   P1_DUR = 1.2; // wordmark scales into nav logo
      const P2_START = 0.7, P2_DUR = 1.2; // hero copy fades out
      const P3_START = 1.5, P3_DUR = 1.3; // media shrinks into framed inset
      const TOTAL = P3_START + P3_DUR;
      // fraction of scroll progress where the wordmark visually finishes
      // scaling and hands off to the nav logo — derived from the phase
      // timing above instead of a hardcoded guess, so it stays correct if
      // the durations change.
      const SWAP_AT = P1_DUR / TOTAL;

      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-pin',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.7
        },
        // swap on the timeline's own (scrub-smoothed) progress, not raw scroll
        // progress — otherwise a fast scroll hides the wordmark before the
        // lagging scrub has actually carried it into the logo slot
        onUpdate() {
          if (heroTl.progress() > SWAP_AT) {
            navLogo.style.visibility = 'visible';
            heroWordmark.style.opacity = 0;
          } else {
            navLogo.style.visibility = 'hidden';
            heroWordmark.style.opacity = 1;
          }
        }
      });
      heroTl
        // layer 1 — scale and travel into the nav logo slot together, eased
        // so it settles into place instead of stopping dead
        .to(heroWordmark, { scale: scaleEnd, x: moveX, y: moveY, ease: 'power1.inOut', duration: P1_DUR }, P1_START)
        // decorative crosses drift up and fade at their own, slower rate
        // across the whole pin — an extra depth plane behind the copy/media
        .to('.hero-crosses', { y: -60, opacity: 0.25, ease: 'none', duration: TOTAL }, 0)
        // layer 2 — remaining hero copy fades as layer 1 finishes
        .to('.hero-copy', { opacity: 0, y: -40, ease: 'power1.inOut', duration: P2_DUR }, P2_START)
        // layer 3 — project stack shrinks into a framed inset + parallax
        // drift; a brief blur-in makes it read as pulling back in depth
        // rather than just scaling down flat. It then fades out (instead
        // of sharpening back to full clarity) so it's fully gone by the
        // time the pin releases — otherwise a small-but-sharp triptych
        // sits directly on top of the About section as soon as it scrolls
        // into view, and the two compete for attention.
        .to('#heroMedia', { borderRadius: 24, scale: 0.6, y: -10, ease: 'power1.inOut', duration: P3_DUR }, P3_START)
        .to('#heroMedia', { filter: 'blur(6px)', ease: 'power1.in', duration: P3_DUR * 0.5 }, P3_START)
        .to('#heroMedia', { filter: 'blur(2px)', ease: 'power1.out', duration: P3_DUR * 0.35 }, P3_START + P3_DUR * 0.5)
        .to('#heroMedia', { opacity: 0, ease: 'power1.in', duration: P3_DUR * 0.4 }, P3_START + P3_DUR * 0.6)
        .to('#projectStack', { y: '6%', ease: 'none', duration: P3_DUR }, P3_START);
    }

    // wait until the intro reveal has fully finished before wiring this up
    setTimeout(init, 2600);
  }

  /* ---------------- Marquee infinite loop ---------------- */
  const track = document.querySelector('.marquee-track');
  if (track && hasGSAP) {
    const width = track.scrollWidth / 2;
    gsap.to(track, {
      x: -width,
      duration: 22,
      ease: 'none',
      repeat: -1
    });
  }

  /* ---------------- Projects overview: 3D coverflow preview reel — driven by scroll ---------------- */
  const carouselTrack = document.getElementById('carouselTrack');
  if (carouselTrack) {
    const slides = Array.from(carouselTrack.querySelectorAll('.carousel-slide'));
    const n = slides.length;

    // cards ride the surface of an invisible sphere/cylinder: the further a
    // card sits from center, the more it swings out, drops down, and tilts —
    // like a Ferris wheel rotating in place, not a flat left-right slide.
    // wider angle + radius than a first pass at this (24deg / 0.72x) — that
    // combination only pushed neighboring cards ~120px apart while they're
    // 420px wide, so adjacent cards buried ~70% of each other and read as a
    // messy overlap rather than a clean fanned stack. This spacing keeps
    // neighbors readable as distinct cards with just a partial, deliberate
    // overlap instead.
    const ANGLE_STEP = 40; // degrees between each slide position
    // radius scales off the actual rendered slide width instead of a fixed
    // px value, so the coverflow geometry looks consistent at any viewport
    // instead of over-overlapping on narrow phone screens
    function getRadius() {
      const w = slides[0] ? slides[0].getBoundingClientRect().width : 420;
      return w * 1.0;
    }

    let activeFloat = 0; // continuous position, driven by scroll (or click)

    function render() {
      const RADIUS = getRadius();
      slides.forEach((slide, i) => {
        let offset = i - activeFloat;
        offset = ((offset % n) + n) % n; // 0..n
        if (offset > n / 2) offset -= n; // shortest path, -n/2..n/2
        const abs = Math.abs(offset);

        const angleDeg = offset * ANGLE_STEP;
        const angleRad = angleDeg * (Math.PI / 180);

        const x = Math.sin(angleRad) * RADIUS;
        const z = (Math.cos(angleRad) - 1) * RADIUS;
        const y = (1 - Math.cos(angleRad)) * (RADIUS * 0.25); // droop downward off-center
        const rotateY = -angleDeg;
        const scale = Math.max(1 - abs * 0.16, 0.5);
        const opacity = abs > 2.1 ? 0 : Math.max(1 - abs * 0.3, 0);
        const zIndex = Math.round(100 - abs * 10);

        slide.classList.toggle('is-center', abs < 0.5);

        if (hasGSAP) {
          gsap.set(slide, { x, y, z, rotateY, scale, opacity, zIndex });
        } else {
          slide.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) rotateY(${rotateY}deg) scale(${scale})`;
          slide.style.opacity = opacity;
          slide.style.zIndex = zIndex;
        }
      });
    }

    // click a side card to jump straight to it
    slides.forEach((slide, i) => {
      slide.addEventListener('click', () => { activeFloat = i; render(); });
    });

    // re-measure/re-render on resize so rotating a phone or resizing a
    // window doesn't leave the geometry keyed to a stale slide width
    let carouselResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(carouselResizeTimer);
      carouselResizeTimer = setTimeout(render, 120);
    });

    render();

    // Below the breakpoint where slides go near-full-width (matches the
    // .overview-carousel mobile rule), tying rotation to vertical page
    // scroll feels disconnected from a component that visually reads as a
    // horizontal carousel — swipe left/right on it directly instead, and
    // let vertical scroll just move past the section like normal.
    const isMobileCarousel = window.matchMedia('(max-width:700px)').matches;

    if (hasGSAP && !isMobileCarousel) {
      // scroll through the section = rotate through the images
      ScrollTrigger.create({
        trigger: '.projects-overview',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.6,
        onUpdate(self) {
          activeFloat = self.progress * n * 1.5;
          render();
        }
      });
    } else if (!hasGSAP && !isMobileCarousel) {
      window.addEventListener('scroll', () => {
        const section = document.querySelector('.projects-overview');
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const total = rect.height + window.innerHeight;
        const passed = window.innerHeight - rect.top;
        const progress = Math.min(Math.max(passed / total, 0), 1);
        activeFloat = progress * n * 1.5;
        render();
      });
    }

    if (isMobileCarousel) {
      const swipeEl = document.getElementById('overviewCarousel');
      if (swipeEl) {
        let dragging = false;
        let axisLock = null; // 'x' once a horizontal drag is detected, 'y' if vertical (let page scroll)
        let startX = 0, startY = 0, startFloat = 0;

        function slideWidthPx() {
          return (slides[0] ? slides[0].getBoundingClientRect().width : 300) * 0.9;
        }
        function settle(target) {
          if (hasGSAP) {
            gsap.to({ v: activeFloat }, {
              v: target, duration: 0.4, ease: 'power2.out',
              onUpdate() { activeFloat = this.targets()[0].v; render(); }
            });
          } else {
            activeFloat = target;
            render();
          }
        }

        swipeEl.addEventListener('touchstart', (e) => {
          const t = e.touches[0];
          dragging = true; axisLock = null;
          startX = t.clientX; startY = t.clientY; startFloat = activeFloat;
        }, { passive: true });

        swipeEl.addEventListener('touchmove', (e) => {
          if (!dragging) return;
          const t = e.touches[0];
          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
          if (!axisLock) {
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
              axisLock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            }
          }
          if (axisLock === 'x') {
            e.preventDefault(); // own the gesture once it reads as horizontal
            activeFloat = startFloat - dx / slideWidthPx();
            render();
          }
          // axisLock === 'y' (or undecided): do nothing, let the page scroll
        }, { passive: false });

        function onTouchEnd() {
          if (!dragging) return;
          dragging = false;
          if (axisLock === 'x') settle(Math.round(activeFloat));
          axisLock = null;
        }
        swipeEl.addEventListener('touchend', onTouchEnd);
        swipeEl.addEventListener('touchcancel', onTouchEnd);
      }
    }
  }

  /* ---------------- Work gallery: pin (detail panel + cards together)
     + horizontal scrub. Detail panel content follows the active card via
     scroll progress, so the description is always on-screen in the same
     frame as the cards it describes — not just on hover. ---------------- */
  const workPinWrap = document.getElementById('workPinWrap');
  const workScrollPin = document.getElementById('workScrollPin');
  const workScrollTrack = document.getElementById('workScrollTrack');
  const workScrollActiveEl = document.getElementById('workScrollActive');
  const workDetail = document.getElementById('workDetail');
  const detailTitleEl = document.getElementById('workDetailTitle');
  const detailRoleEl = document.getElementById('workDetailRole');
  const detailListEl = document.getElementById('workDetailHighlights');
  const detailProblemEl = document.getElementById('workDetailProblem');

  if (workPinWrap && workScrollPin && workScrollTrack) {
    const allCards = Array.from(workScrollTrack.querySelectorAll('.work-card'));
    const placeholderCard = workScrollTrack.querySelector('.work-card-empty');
    const realCards = allCards.filter(c => c !== placeholderCard);
    const workScrollTotalEl = document.getElementById('workScrollTotal');

    // `cards` is whichever set the active filter currently shows — the pin,
    // scrub math, detail panel and counter all read off this one array, so
    // switching category never has two subsystems disagreeing about what's
    // on screen.
    let cards = [];
    let total = 0;
    let activeIdx = -1;
    let currentST = null;
    let currentIO = null;

    // Below the breakpoint where cards drop to ~1-per-view, the detail
    // text (role/highlights/problem) wraps onto many more lines than it
    // does on a wide desktop column. Pinning detail+cards together as one
    // fixed-height frame (as on desktop) would then push the cards mostly
    // off the bottom of a phone screen — so on narrow viewports this skips
    // the pin/scrub entirely and falls back to a plain native horizontal
    // swipe strip, with the detail panel just updating from whichever card
    // is most visible.
    const isNarrow = window.matchMedia('(max-width:860px)').matches;

    function fillWorkDetail(card) {
      if (!card || !workDetail) return;
      detailTitleEl.textContent = card.dataset.title || '';
      detailRoleEl.textContent = card.dataset.role || '';
      detailProblemEl.textContent = card.dataset.problem || '';
      const highlights = (card.dataset.highlights || '').split('|').map(s => s.trim()).filter(Boolean);
      detailListEl.innerHTML = highlights.map(h => `<li>${h}</li>`).join('');
    }

    // instant: used while scroll-scrubbing, so text tracks the scroll
    // 1:1 with no lag/flicker. animated: used for direct mouse hover.
    // language switch rewrote the cards' data-* text — refresh the panel
    document.addEventListener('snrt:lang', () => { if (cards[activeIdx]) fillWorkDetail(cards[activeIdx]); });

    function setActive(idx, animated) {
      if (idx === activeIdx || !cards[idx]) return;
      activeIdx = idx;
      if (animated && workDetail) {
        workDetail.style.opacity = 0;
        setTimeout(() => { fillWorkDetail(cards[idx]); workDetail.style.opacity = 1; }, 160);
      } else {
        fillWorkDetail(cards[idx]);
      }
    }

    // hover/focus bound once against every real card — looks up the card's
    // CURRENT index in the active `cards` set at event time, rather than
    // capturing a stale index, so this stays correct across filter switches
    realCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        const i = cards.indexOf(card);
        if (i !== -1) setActive(i, true);
      });
      card.addEventListener('focus', () => {
        const i = cards.indexOf(card);
        if (i !== -1) setActive(i, true);
      });
    });

    function buildScrollDriver() {
      // Deliberately no `snap` here: GSAP's snap plays its own eased
      // animation to nudge the scroll position to the nearest page after
      // the visitor stops scrolling — but Lenis is *also* independently
      // smoothing/easing the same scroll position at the same time. Two
      // systems both trying to own "where the scroll is" fight each other,
      // and it shows up worst right at a card-to-card handoff — exactly the
      // "chuyển content khi đến project khác" stutter. Pure scrub (no snap)
      // means only one thing ever drives the scroll position, so the track
      // and the detail text — both driven off the same self.progress below —
      // stay in lockstep with no separate settle-animation to desync from.
      if (hasGSAP && !isNarrow) {
        currentST = ScrollTrigger.create({
          trigger: workPinWrap,
          start: 'top top+=88',
          end: () => {
            const maxX = Math.max(workScrollTrack.scrollWidth - workScrollPin.clientWidth, 0);
            return '+=' + (maxX + window.innerHeight * 0.4);
          },
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const maxX = Math.max(workScrollTrack.scrollWidth - workScrollPin.clientWidth, 0);
            gsap.set(workScrollTrack, { x: -maxX * self.progress });
            if (cards.length) {
              const cardW = cards[0].getBoundingClientRect().width || 1;
              const perPage = Math.max(1, Math.round(workScrollPin.clientWidth / cardW));
              const startIdx = Math.min(total - 1, Math.round((maxX * self.progress) / cardW));
              const endIdx = Math.min(total, startIdx + perPage);
              if (workScrollActiveEl) {
                const label = perPage <= 1
                  ? String(startIdx + 1).padStart(2, '0')
                  : `${String(startIdx + 1).padStart(2, '0')}–${String(endIdx).padStart(2, '0')}`;
                workScrollActiveEl.textContent = label;
              }
              setActive(startIdx, false);
            }
          }
        });
      } else if ('IntersectionObserver' in window) {
        // native swipe: whichever card is most visible inside the scroll
        // strip drives the detail panel + counter
        currentIO = new IntersectionObserver((entries) => {
          let best = null;
          entries.forEach(entry => {
            if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
          });
          if (best && best.intersectionRatio > 0.5) {
            const idx = cards.indexOf(best.target);
            if (idx !== -1) {
              setActive(idx, true);
              if (workScrollActiveEl) workScrollActiveEl.textContent = String(idx + 1).padStart(2, '0');
            }
          }
        }, { root: workScrollPin, threshold: [0.5, 0.75, 0.9] });
        cards.forEach(card => currentIO.observe(card));
      }
    }

    function computeVisible(filter) {
      const matches = filter === 'all'
        ? realCards
        : realCards.filter(c => c.dataset.category === filter);
      // Every capability tab keeps looking intentional, not broken, even
      // before any real project is tagged for it — swap in the coming-soon
      // placeholder only when that capability is truly empty (Product
      // Marketing / Content Strategy / AI Workflow today), and it
      // disappears on its own the moment a real card gets that category.
      if (filter !== 'all' && matches.length === 0 && placeholderCard) {
        const btn = document.querySelector(`.work-filter-btn[data-filter="${filter}"]`);
        const labelEl = btn && (btn.querySelector('.work-filter-label') || btn);
        const label = labelEl ? labelEl.textContent.trim() : i18nText('This capability', 'Mảng này');
        placeholderCard.dataset.title = label;
        placeholderCard.dataset.problem = i18nText(`${label} case studies are on the way — check back soon, or reach out directly for examples in the meantime.`,
          `Case study mảng ${label} đang được chuẩn bị — hãy quay lại sau, hoặc liên hệ trực tiếp để xem ví dụ.`);
        const titleEl = document.getElementById('workEmptyCardTitle');
        if (titleEl) titleEl.textContent = label;
        return [placeholderCard];
      }
      return matches;
    }

    // Filter tabs live in the (unpinned) section head above workPinWrap, so
    // switching category only ever happens while the pin is at rest — never
    // mid-drag — which is what makes a ScrollTrigger.refresh() here safe
    // (see the window.load-only refresh note lower in this file for why an
    // *ambient* refresh during active scroll is the dangerous case, not this
    // explicit, user-initiated one).
    function applyFilter(filter) {
      const visible = computeVisible(filter);
      allCards.forEach(c => c.classList.toggle('is-filtered-out', !visible.includes(c)));

      if (currentST) { currentST.kill(); currentST = null; }
      if (currentIO) { currentIO.disconnect(); currentIO = null; }
      if (hasGSAP) gsap.set(workScrollTrack, { x: 0 });
      else workScrollTrack.style.transform = '';
      workScrollPin.scrollLeft = 0;

      cards = visible;
      total = cards.length;
      activeIdx = -1;
      if (workScrollTotalEl) workScrollTotalEl.textContent = String(total).padStart(2, '0');
      if (workScrollActiveEl) workScrollActiveEl.textContent = total ? '01' : '00';

      setActive(0, false);
      buildScrollDriver();
      if (hasGSAP) ScrollTrigger.refresh();
    }

    const filterBtns = Array.from(document.querySelectorAll('.work-filter-btn'));

    // show how many real projects back up each capability, right in the
    // tab label — makes the nav double as proof, not just navigation
    filterBtns.forEach(btn => {
      const countEl = btn.querySelector('.work-filter-count');
      if (!countEl) return;
      const filter = btn.dataset.filter;
      const count = filter === 'all' ? realCards.length : realCards.filter(c => c.dataset.category === filter).length;
      countEl.textContent = `(${count})`;
    });

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-active')) return;
        filterBtns.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        applyFilter(btn.dataset.filter);
      });
    });

    applyFilter('all');

    // mobile prev/next buttons — explicit alternative to swiping, since a
    // card fills the whole frame at this width (see CSS: flex:0 0 100vw-ish)
    if (isNarrow) {
      const navPrev = document.getElementById('workNavPrev');
      const navNext = document.getElementById('workNavNext');
      if (navPrev && navNext) {
        const gapPx = parseFloat(getComputedStyle(workScrollTrack).gap) || 8;
        function updateNavButtons() {
          const maxScroll = workScrollPin.scrollWidth - workScrollPin.clientWidth;
          navPrev.disabled = workScrollPin.scrollLeft <= 4;
          navNext.disabled = workScrollPin.scrollLeft >= maxScroll - 4;
        }
        function goTo(dir) {
          const cardW = (cards[0] ? cards[0].getBoundingClientRect().width : workScrollPin.clientWidth) + gapPx;
          workScrollPin.scrollBy({ left: dir * cardW, behavior: 'smooth' });
        }
        navPrev.addEventListener('click', () => goTo(-1));
        navNext.addEventListener('click', () => goTo(1));
        workScrollPin.addEventListener('scroll', updateNavButtons, { passive: true });
        updateNavButtons();
      }
    }
  }

  /* ---------------- About section: parallax on both photos ---------------- */
  if (hasGSAP) {
    // images are pre-sized larger than their frame (see CSS) so they can
    // translate vertically as the section scrolls without exposing edges
    document.querySelectorAll('.overview-photo img, .overview-photo-full img').forEach(img => {
      gsap.fromTo(img,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: img.closest('.overview-photo, .overview-photo-full'),
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    });
  }

  /* ---------------- Scroll reveals + parallax ----------------
     Non-title copy (eyebrows, paragraphs, labels, taglines — anything
     tagged .reveal-word/.reveal-lines) now does two things on one
     scrub-linked timeline instead of a single fixed-duration fade:
       1. a quick fade/slide-in as it enters the viewport
       2. a slower continuous drift for the rest of its time on screen
     Both phases are tied directly to scroll position (scrub), so the
     motion follows the user's scroll speed 1:1 instead of playing an
     independent timed tween — this is what makes it read as parallax
     rather than a one-shot "appear" animation. Titles (.split-lines)
     keep their own distinct mask-reveal further below, untouched. */
  if (hasGSAP) {
    function parallaxReveal(el, introY) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top 95%',
          end: 'bottom 15%',
          scrub: 0.6
        }
      });
      tl.fromTo(el,
          { opacity: 0, y: introY },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power1.out' }, 0)
        .to(el, { y: -introY * 0.75, duration: 0.65, ease: 'none' }, 0.35);
    }

    gsap.utils.toArray('.reveal-word').forEach(el => {
      if (el.closest('.hero')) return; // hero handled by intro tl
      parallaxReveal(el, 24);
    });

    gsap.utils.toArray('.reveal-lines').forEach(el => {
      parallaxReveal(el, 40);
    });

    // section titles: mask reveal per line
    gsap.utils.toArray('.split-lines').forEach(title => {
      const spans = title.querySelectorAll('span');
      gsap.set(spans, { yPercent: 110 });
      gsap.to(spans, {
        yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.08,
        scrollTrigger: { trigger: title, start: 'top 88%' }
      });
    });

    // service cards
    gsap.utils.toArray('.service-card').forEach((card, i) => {
      gsap.from(card, {
        opacity: 0, y: 30, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 92%' },
        delay: (i % 4) * 0.05
      });
    });

    // faq items
    gsap.utils.toArray('.faq-item').forEach((item, i) => {
      gsap.from(item, {
        opacity: 0, y: 24, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'top 92%' },
        delay: i * 0.05
      });
    });

  }

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(open => {
        open.classList.remove('open');
        open.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------------- Testimonials: hide entirely until there's real proof
     to show ---------------- a partly-empty "coming soon" section still
     reads as "nobody's reviewed this person yet"; hiding the section
     outright until at least one approved review exists avoids that signal,
     and it reappears on its own the moment a real .testimonial-card gets
     added to #testimonialsGrid. */
  const testimonialsSection = document.getElementById('testimonials');
  if (testimonialsSection) {
    const grid = document.getElementById('testimonialsGrid');
    const hasReviews = !!(grid && grid.querySelector('.testimonial-card'));
    if (!hasReviews) testimonialsSection.style.display = 'none';
  }

  /* ---------------- Recommendation modal ----------------
     Opens only on an explicit click — the testimonials section itself
     never shows a form by default, per the "reading and contributing are
     two different jobs" reasoning behind this redesign. */
  const testimonialModal = document.getElementById('testimonialModal');
  const openModalBtn = document.getElementById('openTestimonialModal');
  const closeModalBtn = document.getElementById('testimonialModalClose');
  const modalBackdrop = document.getElementById('testimonialModalBackdrop');
  let lastFocusedEl = null;

  function openTestimonialModal() {
    if (!testimonialModal) return;
    lastFocusedEl = document.activeElement;
    testimonialModal.classList.add('is-open');
    testimonialModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const firstInput = testimonialModal.querySelector('input,textarea,select');
    if (firstInput) firstInput.focus();
  }
  function closeTestimonialModal() {
    if (!testimonialModal) return;
    testimonialModal.classList.remove('is-open');
    testimonialModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocusedEl) lastFocusedEl.focus();
  }
  if (openModalBtn) openModalBtn.addEventListener('click', openTestimonialModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeTestimonialModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeTestimonialModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && testimonialModal && testimonialModal.classList.contains('is-open')) {
      closeTestimonialModal();
    }
  });

  /* ---------------- Star rating input ---------------- */
  const starButtons = Array.from(document.querySelectorAll('.testimonial-star'));
  const ratingInput = document.getElementById('testimonialRatingValue');
  function paintStars(value) {
    starButtons.forEach((btn) => {
      btn.classList.toggle('is-filled', Number(btn.dataset.value) <= value);
    });
  }
  if (starButtons.length) {
    paintStars(Number(ratingInput ? ratingInput.value : 5));
    starButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = Number(btn.dataset.value);
        if (ratingInput) ratingInput.value = String(val);
        paintStars(val);
      });
      btn.addEventListener('mouseenter', () => paintStars(Number(btn.dataset.value)));
    });
    const starWrap = document.getElementById('testimonialStarInput');
    if (starWrap) {
      starWrap.addEventListener('mouseleave', () => paintStars(Number(ratingInput ? ratingInput.value : 5)));
    }
  }

  /* ---------------- Toast ---------------- */
  const testimonialToast = document.getElementById('testimonialToast');
  let toastTimer;
  function showToast() {
    if (!testimonialToast) return;
    testimonialToast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => testimonialToast.classList.remove('is-visible'), 5000);
  }

  /* ---------------- Recommendation submission (Formspree) ----------------
     Submits via fetch instead of a normal page-navigating POST. On success
     the modal closes and a toast confirms it — nothing here breaks if the
     form ID hasn't been set up yet, it'll just show an inline error instead. */
  const testimonialForm = document.getElementById('testimonialForm');
  if (testimonialForm) {
    const statusEl = document.getElementById('testimonialFormStatus');
    const submitBtn = testimonialForm.querySelector('.testimonial-form-submit');
    testimonialForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (submitBtn) submitBtn.disabled = true;
      if (statusEl) { statusEl.textContent = i18nText('Sending…', 'Đang gửi…'); statusEl.className = 'testimonial-form-status'; }

      fetch(testimonialForm.action, {
        method: 'POST',
        body: new FormData(testimonialForm),
        headers: { Accept: 'application/json' }
      })
        .then((res) => {
          if (res.ok) {
            testimonialForm.reset();
            if (ratingInput) ratingInput.value = '5';
            paintStars(5);
            if (statusEl) { statusEl.textContent = ''; statusEl.className = 'testimonial-form-status'; }
            closeTestimonialModal();
            showToast();
          } else {
            throw new Error('submission failed');
          }
        })
        .catch(() => {
          if (statusEl) {
            statusEl.textContent = i18nText('Something went wrong — mind trying again in a moment?', 'Có lỗi xảy ra — bạn thử lại sau ít phút nhé?');
            statusEl.className = 'testimonial-form-status is-error';
          }
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ---------------- Smooth anchor links (works with Lenis) ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.2 });
          else target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

});
