/* ================================================================
   SERVICES.JS — Category filter + card interactions
   MIROWSKI BARBERSHOP
================================================================ */
const ServicesModule = (() => {
  const init = () => {
    setupFilter();
    setupBookingButtons();
  };

  /* ── Category filter ── */
  const setupFilter = () => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards      = document.querySelectorAll('.service-card');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        /* Update active button */
        filterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        /* Show/hide cards with GSAP if available */
        cards.forEach(card => {
          const match = filter === 'all' || card.dataset.category === filter;

          if (typeof gsap !== 'undefined') {
            if (match) {
              card.classList.remove('is-hidden-filter');
              gsap.fromTo(card,
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
              );
            } else {
              gsap.to(card, {
                opacity: 0, y: -8, duration: 0.25, ease: 'power2.in',
                onComplete: () => card.classList.add('is-hidden-filter'),
              });
            }
          } else {
            card.classList.toggle('is-hidden-filter', !match);
          }
        });
      });
    });
  };

  /* ── Pre-select service when "Book" is clicked on a card ── */
  const setupBookingButtons = () => {
    document.querySelectorAll('[data-booking-open][data-service]').forEach(btn => {
      btn.addEventListener('click', () => {
        const serviceId = btn.dataset.service;
        if (serviceId && window.MirowskiState) {
          window.MirowskiState.booking.serviceId = serviceId;
        }
      });
    });
  };

  return { init };
})();
