(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Header and mobile navigation.
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
      navToggle.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    });
    qsa('a', siteNav).forEach(link => link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    }));
  }

  // Dynamic copyright year. Scope this to the footer only.
  // Photography items also use data-year as metadata, so a global [data-year]
  // selector would replace each gallery button's image/content with the current year.
  qsa('.site-footer [data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Soft reveal on scroll. Elements remain visible when JS is unavailable.
  const revealItems = qsa('[data-reveal]');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reveal-ready');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  // Custom music controls.
  const trackCards = qsa('[data-track-card]');
  const formatTime = value => {
    if (!Number.isFinite(value)) return '—:—';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const pauseOtherTracks = activeAudio => {
    trackCards.forEach(card => {
      const audio = qs('[data-audio]', card);
      if (audio && audio !== activeAudio) audio.pause();
    });
  };

  trackCards.forEach(card => {
    const audio = qs('[data-audio]', card);
    const play = qs('[data-track-play]', card);
    const seek = qs('[data-track-seek]', card);
    const current = qs('[data-track-current]', card);
    const duration = qs('[data-track-duration]', card);
    if (!audio || !play || !seek) return;

    const title = qs('h2', card)?.textContent?.trim() || 'track';

    const syncPlayState = () => {
      const playing = !audio.paused && !audio.ended;
      card.classList.toggle('is-playing', playing);
      play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${title}`);
    };

    const syncTimeline = () => {
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      seek.value = String(Math.round(ratio * 1000));
      seek.style.setProperty('--progress', `${ratio * 100}%`);
      if (current) current.textContent = formatTime(audio.currentTime);
      if (duration) duration.textContent = formatTime(audio.duration);
    };

    play.addEventListener('click', () => {
      if (audio.paused) {
        pauseOtherTracks(audio);
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });

    seek.addEventListener('input', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
        syncTimeline();
      }
    });

    audio.addEventListener('loadedmetadata', syncTimeline);
    audio.addEventListener('durationchange', syncTimeline);
    audio.addEventListener('timeupdate', syncTimeline);
    audio.addEventListener('play', () => { pauseOtherTracks(audio); syncPlayState(); });
    audio.addEventListener('pause', syncPlayState);
    audio.addEventListener('ended', () => { syncPlayState(); audio.currentTime = 0; syncTimeline(); });
    syncPlayState();
    syncTimeline();
  });

  // Photography collections + seamless lightbox.
  const allGalleryButtons = qsa('.gallery-button');
  const countEl = qs('[data-photo-count]');
  const statusEl = qs('[data-gallery-status]');
  const filterButtons = qsa('[data-collection-filter]');

  const visibleGalleryButtons = () => allGalleryButtons.filter(button => !button.closest('.gallery-item')?.hidden);

  const updateGalleryCount = (label = 'All') => {
    const visible = visibleGalleryButtons();
    if (countEl) countEl.textContent = `${allGalleryButtons.length} photographs`;
    if (statusEl) statusEl.textContent = label === 'All' ? `${visible.length} photographs` : `${label} / ${visible.length} photographs`;
  };

  filterButtons.forEach(filter => {
    filter.addEventListener('click', () => {
      const selected = filter.dataset.collectionFilter || 'All';

      filterButtons.forEach(button => {
        const active = button === filter;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });

      allGalleryButtons.forEach(button => {
        const item = button.closest('.gallery-item');
        if (!item) return;
        const matches = selected === 'All' || button.dataset.collection === selected;
        item.hidden = !matches;
        item.classList.toggle('is-filtered-out', !matches);
      });

      updateGalleryCount(selected);
      window.dispatchEvent(new CustomEvent('portfolio:gallery-filtered', { detail: { collection: selected } }));
    });
  });

  updateGalleryCount();

  const lightbox = qs('[data-lightbox]');
  if (!lightbox || !allGalleryButtons.length) return;

  const stage = qs('[data-lightbox-stage]', lightbox);
  const currentSlide = qs('.lightbox-slide-current', lightbox);
  const prevSlide = qs('.lightbox-slide-prev', lightbox);
  const nextSlide = qs('.lightbox-slide-next', lightbox);
  const currentImg = qs('[data-lightbox-image]', lightbox);
  const prevImg = qs('img', prevSlide);
  const nextImg = qs('img', nextSlide);
  const captionEl = qs('[data-lightbox-caption]', lightbox);
  const metaEl = qs('[data-lightbox-meta]', lightbox);
  const indexEl = qs('[data-lightbox-index]', lightbox);
  const progressEl = qs('[data-lightbox-progress]', lightbox);
  const closeBtn = qs('[data-lightbox-close]', lightbox);
  const prevBtn = qs('[data-lightbox-prev]', lightbox);
  const nextBtn = qs('[data-lightbox-next]', lightbox);

  let currentIndex = 0;
  let lastFocused = null;
  let pointerStartX = 0;
  let pointerDeltaX = 0;
  let isPointerDown = false;
  let transitionLock = false;

  const currentSet = () => visibleGalleryButtons().length ? visibleGalleryButtons() : allGalleryButtons;
  const wrap = (index, items = currentSet()) => (index + items.length) % items.length;
  const itemAt = index => {
    const items = currentSet();
    return items[wrap(index, items)];
  };
  const sourceAt = index => itemAt(index)?.dataset.full || qs('img', itemAt(index))?.src || '';
  const captionAt = index => itemAt(index)?.dataset.title || itemAt(index)?.dataset.caption || qs('img', itemAt(index))?.alt || '';
  const metaAt = index => {
    const item = itemAt(index);
    if (!item) return '';
    return [item.dataset.collection, item.dataset.location, item.dataset.year].filter(Boolean).join(' · ');
  };

  function preloadAround(index) {
    const items = currentSet();
    if (items.length < 2) return;
    [-2, -1, 1, 2].forEach(offset => {
      const src = sourceAt(index + offset);
      if (!src) return;
      const preloader = new Image();
      preloader.src = src;
    });
  }

  function syncSlides(index) {
    const items = currentSet();
    if (!items.length) return;
    currentIndex = wrap(index, items);
    currentImg.src = sourceAt(currentIndex);
    currentImg.alt = captionAt(currentIndex);
    prevImg.src = sourceAt(currentIndex - 1);
    prevImg.alt = '';
    nextImg.src = sourceAt(currentIndex + 1);
    nextImg.alt = '';
    captionEl.textContent = captionAt(currentIndex);
    if (metaEl) metaEl.textContent = metaAt(currentIndex);
    indexEl.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    if (progressEl) progressEl.style.width = `${((currentIndex + 1) / items.length) * 100}%`;
    preloadAround(currentIndex);
  }

  function resetSlidePositions() {
    [currentSlide, prevSlide, nextSlide].forEach(slide => {
      slide.style.transform = '';
      slide.style.opacity = '';
    });
  }

  function open(trigger) {
    const items = currentSet();
    const index = items.indexOf(trigger);
    if (index < 0) return;
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
    const items = currentSet();
    if (transitionLock || items.length < 2) return;
    transitionLock = true;
    stage.classList.remove('is-dragging');

    const width = Math.max(stage.clientWidth, 1);
    currentSlide.style.transform = `translate3d(${direction > 0 ? -width : width}px,0,0)`;
    currentSlide.style.opacity = '.08';
    const incoming = direction > 0 ? nextSlide : prevSlide;
    incoming.style.transform = 'translate3d(0,0,0)';
    incoming.style.opacity = '1';

    window.setTimeout(() => {
      syncSlides(currentIndex + direction);
      resetSlidePositions();
      transitionLock = false;
    }, 430);
  }

  allGalleryButtons.forEach(button => button.addEventListener('click', () => open(button)));
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
    const x = pointerDeltaX * .94;
    currentSlide.style.transform = `translate3d(${x}px,0,0)`;
    currentSlide.style.opacity = String(Math.max(.28, 1 - Math.abs(x) / width * .78));
    prevSlide.style.transform = `translate3d(calc(-103% + ${x}px),0,0)`;
    nextSlide.style.transform = `translate3d(calc(103% + ${x}px),0,0)`;
  });

  function finishPointer(event) {
    if (!isPointerDown) return;
    isPointerDown = false;
    stage.releasePointerCapture?.(event.pointerId);
    stage.classList.remove('is-dragging');
    const threshold = Math.min(100, stage.clientWidth * .14);
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
})();
