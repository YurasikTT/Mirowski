/* ================================================================
   GALLERY.JS — Lightbox · Keyboard navigation · Touch swipe
   MIROWSKI BARBERSHOP
================================================================ */
const GalleryModule = (() => {
  const lightbox  = document.getElementById('lightbox');
  const lbImg     = lightbox?.querySelector('.lightbox__img');
  const lbCaption = lightbox?.querySelector('.lightbox__caption');
  const lbClose   = lightbox?.querySelector('.lightbox__close');
  const lbPrev    = lightbox?.querySelector('.lightbox__prev');
  const lbNext    = lightbox?.querySelector('.lightbox__next');

  let items   = [];
  let current = 0;

  /* ── Show specific item ── */
  const show = idx => {
    current = (idx + items.length) % items.length;
    const item = items[current];
    const img  = item.querySelector('img');
    const cap  = item.querySelector('.gallery__caption');

    if (!lbImg || !img) return;

    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbImg.src            = img.src;
      lbImg.alt            = img.alt;
      lbCaption.textContent = cap?.textContent || '';
      lbImg.style.opacity  = '1';
    }, 180);
  };

  /* ── Open / close ── */
  const open = idx => {
    if (!lightbox) return;
    show(idx);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    lbImg.style.transition = 'opacity 0.18s';
    lbClose?.focus();
  };

  const close = () => {
    lightbox?.classList.remove('is-open');
    lightbox?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  };

  /* ── Touch swipe ── */
  const setupSwipe = () => {
    if (!lightbox) return;
    let startX = 0;
    lightbox.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) dx < 0 ? show(current + 1) : show(current - 1);
    }, { passive: true });
  };

  /* ── Keyboard ── */
  const onKey = e => {
    if (!lightbox?.classList.contains('is-open')) return;
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft')  show(current - 1);
    if (e.key === 'Escape')     close();
  };

  const init = () => {
    items = [...document.querySelectorAll('.gallery__item')];
    if (!items.length || !lightbox) return;

    /* Open on click */
    items.forEach((item, i) => {
      item.addEventListener('click', () => open(i));
      item.setAttribute('tabindex', '0');
      item.addEventListener('keydown', e => { if (e.key === 'Enter') open(i); });
    });

    lbClose?.addEventListener('click', close);
    lbPrev?.addEventListener('click',  () => show(current - 1));
    lbNext?.addEventListener('click',  () => show(current + 1));

    /* Close on backdrop click */
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', onKey);
    setupSwipe();
  };

  return { init };
})();
