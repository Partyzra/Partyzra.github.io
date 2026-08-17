(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Shared header / mobile navigation.
  const header = qs('[data-site-header]');
  const navToggle = qs('[data-nav-toggle]');
  const siteNav = qs('[data-site-nav]');

  const syncHeader = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 18);
  };
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    });
    qsa('a', siteNav).forEach(link => link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    }));
  }

  // Dynamic copyright year.
  qsa('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Music behavior: only one HTML audio element plays at a time.
  const audios = qsa('audio');
  audios.forEach(audio => {
    audio.addEventListener('play', () => {
      audios.forEach(other => {
        if (other !== audio) other.pause();
      });
      qsa('[data-track-card]').forEach(card => card.classList.remove('is-playing'));
      audio.closest('[data-track-card]')?.classList.add('is-playing');
    });
    audio.addEventListener('pause', () => {
      audio.closest('[data-track-card]')?.classList.remove('is-playing');
    });
    audio.addEventListener('ended', () => {
      audio.closest('[data-track-card]')?.classList.remove('is-playing');
    });
  });

  // Seamless photography lightbox.
  const galleryButtons = qsa('.gallery-button');
  const countEl = qs('[data-photo-count]');
  if (countEl && galleryButtons.length) countEl.textContent = `${galleryButtons.length} photographs`;

  const lightbox = qs('[data-lightbox]');
  if (!lightbox || !galleryButtons.length) return;

  const stage = qs('[data-lightbox-stage]', lightbox);
  const currentSlide = qs('.lightbox-slide-current', lightbox);
  const prevSlide = qs('.lightbox-slide-prev', lightbox);
  const nextSlide = qs('.lightbox-slide-next', lightbox);
  const currentImg = qs('[data-lightbox-image]', lightbox);
  const prevImg = qs('img', prevSlide);
  const nextImg = qs('img', nextSlide);
  const captionEl = qs('[data-lightbox-caption]', lightbox);
  const indexEl = qs('[data-lightbox-index]', lightbox);
  const closeBtn = qs('[data-lightbox-close]', lightbox);
  const prevBtn = qs('[data-lightbox-prev]', lightbox);
  const nextBtn = qs('[data-lightbox-next]', lightbox);

  let currentIndex = 0;
  let lastFocused = null;
  let pointerStartX = 0;
  let pointerDeltaX = 0;
  let isPointerDown = false;
  let transitionLock = false;

  const wrap = index => (index + galleryButtons.length) % galleryButtons.length;
  const itemAt = index => galleryButtons[wrap(index)];
  const sourceAt = index => itemAt(index).dataset.full || qs('img', itemAt(index)).src;
  const captionAt = index => itemAt(index).dataset.caption || qs('img', itemAt(index)).alt || '';

  function preloadAround(index) {
    [-2, -1, 1, 2].forEach(offset => {
      const preloader = new Image();
      preloader.src = sourceAt(index + offset);
    });
  }

  function syncSlides(index) {
    currentIndex = wrap(index);
    currentImg.src = sourceAt(currentIndex);
    currentImg.alt = captionAt(currentIndex);
    prevImg.src = sourceAt(currentIndex - 1);
    prevImg.alt = '';
    nextImg.src = sourceAt(currentIndex + 1);
    nextImg.alt = '';
    captionEl.textContent = captionAt(currentIndex);
    indexEl.textContent = `${currentIndex + 1} / ${galleryButtons.length}`;
    preloadAround(currentIndex);
  }

  function resetSlidePositions() {
    currentSlide.style.transform = '';
    currentSlide.style.opacity = '';
    prevSlide.style.transform = '';
    prevSlide.style.opacity = '';
    nextSlide.style.transform = '';
    nextSlide.style.opacity = '';
  }

  function open(index, trigger) {
    lastFocused = trigger || document.activeElement;
    syncSlides(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    resetSlidePositions();
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus({ preventScroll: true });
  }

  function go(direction) {
    if (transitionLock || galleryButtons.length < 2) return;
    transitionLock = true;
    stage.classList.remove('is-dragging');

    const width = Math.max(stage.clientWidth, 1);
    currentSlide.style.transform = `translateX(${direction > 0 ? -width : width}px)`;
    currentSlide.style.opacity = '.18';
    const incoming = direction > 0 ? nextSlide : prevSlide;
    incoming.style.transform = 'translateX(0)';
    incoming.style.opacity = '1';

    window.setTimeout(() => {
      syncSlides(currentIndex + direction);
      resetSlidePositions();
      transitionLock = false;
    }, 390);
  }

  galleryButtons.forEach((button, index) => button.addEventListener('click', () => open(index, button)));
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  lightbox.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') go(-1);
    if (event.key === 'ArrowRight') go(1);
    if (event.key === 'Tab') {
      const focusables = [closeBtn, prevBtn, nextBtn].filter(Boolean);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    isPointerDown = true;
    pointerStartX = event.clientX;
    pointerDeltaX = 0;
    stage.classList.add('is-dragging');
    stage.setPointerCapture?.(event.pointerId);
  });

  stage.addEventListener('pointermove', event => {
    if (!isPointerDown) return;
    pointerDeltaX = event.clientX - pointerStartX;
    const width = Math.max(stage.clientWidth, 1);
    const resistance = 0.94;
    const x = pointerDeltaX * resistance;
    currentSlide.style.transform = `translateX(${x}px)`;
    currentSlide.style.opacity = String(Math.max(.38, 1 - Math.abs(x) / width * .7));
    prevSlide.style.transform = `translateX(calc(-104% + ${x}px))`;
    nextSlide.style.transform = `translateX(calc(104% + ${x}px))`;
  });

  function finishPointer(event) {
    if (!isPointerDown) return;
    isPointerDown = false;
    stage.releasePointerCapture?.(event.pointerId);
    stage.classList.remove('is-dragging');
    const threshold = Math.min(110, stage.clientWidth * .16);
    if (Math.abs(pointerDeltaX) > threshold) {
      const direction = pointerDeltaX < 0 ? 1 : -1;
      resetSlidePositions();
      go(direction);
    } else {
      resetSlidePositions();
    }
    pointerDeltaX = 0;
  }
  stage.addEventListener('pointerup', finishPointer);
  stage.addEventListener('pointercancel', finishPointer);
}
)();
