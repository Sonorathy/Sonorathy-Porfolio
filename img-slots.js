/* Image slots: any <img> whose file doesn't exist yet turns its frame into
   a labelled placeholder (showing the exact filename expected) instead of
   a broken-image icon. Once the real file is dropped into assets/, the
   image simply loads and the placeholder never appears. */
(function () {
  function markMissing(img) {
    var holder = img.closest('.pd-showcase-item, .work-card-media, .carousel-media');
    if (!holder || holder.classList.contains('img-slot')) return;
    var src = img.getAttribute('src') || '';
    holder.classList.add('img-slot');
    holder.setAttribute('data-slot', src.replace(/^assets\/work\//, ''));
    img.style.display = 'none';
  }
  function check(img) {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
    else img.addEventListener('error', function () { markMissing(img); }, { once: true });
  }
  function run() {
    document.querySelectorAll('.pd-showcase-item img, .work-card-media img, .carousel-media img').forEach(function (img) {
      check(img);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
