/* =========================================================
   Sonorathy Portfolio — motion layer
   GSAP + ScrollTrigger + Lenis smooth scroll
   ========================================================= */

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

  function hidePreloader() {
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
      cursorLabel.textContent = 'View Detail';
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

    function init() {
      // anchor the scale origin at wherever the nav logo actually sits, so the
      // wordmark reads as shrinking directly into that exact spot — no separate
      // translate needed, and it adapts automatically to any layout/viewport.
      const wordmarkRect = heroWordmark.getBoundingClientRect();
      const logoRect = navLogo.getBoundingClientRect();
      const originX = logoRect.left + logoRect.width / 2 - wordmarkRect.left;
      const originY = logoRect.top + logoRect.height / 2 - wordmarkRect.top;
      heroWordmark.style.transformOrigin = `${originX}px ${originY}px`;

      const wordmarkFontSize = parseFloat(getComputedStyle(heroWordmark).fontSize);
      const logoFontSize = parseFloat(getComputedStyle(navLogo).fontSize);
      const scaleEnd = logoFontSize / wordmarkFontSize;

      // navLogo is already hidden from first paint (see navLogoEl above) —
      // it only becomes visible once the scroll timeline crosses 1/3 progress.

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

      // three strictly sequential phases along one scrubbed timeline
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero-pin',
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
          onUpdate(self) {
            if (self.progress > 1 / 3) {
              navLogo.style.visibility = 'visible';
              heroWordmark.style.opacity = 0;
            } else {
              navLogo.style.visibility = 'hidden';
              heroWordmark.style.opacity = 1;
            }
          }
        }
      });
      heroTl
        // layer 1 — pure scale toward the nav logo slot, no separate move
        .to(heroWordmark, { scale: scaleEnd, ease: 'none', duration: 1 }, 0)
        // layer 2 — remaining hero copy fades as layer 1 finishes
        .to('.hero-copy', { opacity: 0, y: -40, ease: 'none', duration: 1 }, 1)
        // layer 3 — project stack shrinks into a framed inset + parallax drift
        .to('#heroMedia', { borderRadius: 24, scale: 0.6, y: -10, ease: 'none', duration: 1 }, 2)
        .to('#projectStack', { y: '6%', ease: 'none', duration: 1 }, 2);
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
    const ANGLE_STEP = 24; // degrees between each slide position
    // radius scales off the actual rendered slide width (~0.72x it) instead
    // of a fixed px value, so the coverflow geometry looks consistent at
    // any viewport instead of over-overlapping on narrow phone screens
    function getRadius() {
      const w = slides[0] ? slides[0].getBoundingClientRect().width : 420;
      return w * 0.72;
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
        const y = (1 - Math.cos(angleRad)) * (RADIUS * 0.38); // droop downward off-center
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
    const cards = Array.from(workScrollTrack.querySelectorAll('.work-card'));
    const total = cards.length;
    let activeIdx = -1;

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

    cards.forEach((card, i) => {
      card.addEventListener('mouseenter', () => setActive(i, true));
      card.addEventListener('focus', () => setActive(i, true));
    });

    setActive(0, false);

    // Below the breakpoint where cards drop to ~1-per-view, the detail
    // text (role/highlights/problem) wraps onto many more lines than it
    // does on a wide desktop column. Pinning detail+cards together as one
    // fixed-height frame (as on desktop) would then push the cards mostly
    // off the bottom of a phone screen — so on narrow viewports this skips
    // the pin/scrub entirely and falls back to a plain native horizontal
    // swipe strip, with the detail panel just updating from whichever card
    // is most visible.
    const isNarrow = window.matchMedia('(max-width:860px)').matches;

    if (hasGSAP && !isNarrow) {
      // cards are sized so exactly N fit inside the pin's width (N=2 on
      // desktop) — scroll snaps a full page (one pin-width) at a time, so
      // it always shows a clean N-up grid, never a partial card mid-
      // transition. The whole wrapper (detail panel + card row) is pinned
      // as one unit, so the two never separate.
      ScrollTrigger.create({
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
        snap: (progress) => {
          const maxX = Math.max(workScrollTrack.scrollWidth - workScrollPin.clientWidth, 0);
          if (maxX <= 0) return 0;
          const step = workScrollPin.clientWidth / maxX; // one page-width, as a fraction of progress
          return Math.min(1, Math.round(progress / step) * step);
        },
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
      const io = new IntersectionObserver((entries) => {
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
      cards.forEach(card => io.observe(card));
    }

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

  /* ---------------- Scroll reveals ---------------- */
  if (hasGSAP) {
    // words / paragraphs fade-up
    gsap.utils.toArray('.reveal-word').forEach(el => {
      if (el.closest('.hero')) return; // hero handled by intro tl
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    gsap.utils.toArray('.reveal-lines').forEach(el => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
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

    // contact section title + email
    gsap.from('.contact-email', {
      opacity: 0, y: 20, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '.contact-email', start: 'top 90%' }
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
