/* Custom circle cursor for standalone project detail pages
   (lightweight mirror of the cursor logic in script.js — no GSAP/Lenis dependency) */
document.addEventListener('DOMContentLoaded', () => {
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
      const atBottom = panels.some(panelAtBottom) || pageAtBottom();
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
});
