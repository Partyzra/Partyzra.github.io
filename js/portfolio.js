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

  // Landing hero slideshow — start immediately with a random photograph from
  // the selected Photography hero pool, then keep cycling through the remaining images.
  // Each incoming image is preloaded before its crossfade, while the first image
  // is assigned immediately so the hero never intentionally waits on a hold timer.
  const homeHero = qs('.home-page .hero-v3');
  const heroPrimary = homeHero ? qs('.hero-photo', homeHero) : null;

  if (homeHero && heroPrimary) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heroAlternate = document.createElement('div');
    heroAlternate.className = 'hero-photo hero-photo--alternate is-hero-hidden';
    heroAlternate.setAttribute('aria-hidden', 'true');
    heroPrimary.after(heroAlternate);

    const HERO_HOLD_MS = 12000;
    const HERO_FADE_MS = 2000;
    const HERO_MOTIONS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'];
    const normalize = value => String(value || '').trim().toLowerCase();

    const shuffled = values => {
      const copy = [...values];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const loadPhotoManifest = () => new Promise(resolve => {
      if (Array.isArray(window.PORTFOLIO_PHOTOS)) {
        resolve(window.PORTFOLIO_PHOTOS);
        return;
      }

      const existing = document.querySelector('script[data-home-photo-manifest]');
      if (existing) {
        existing.addEventListener('load', () => {
          resolve(Array.isArray(window.PORTFOLIO_PHOTOS) ? window.PORTFOLIO_PHOTOS : []);
        }, { once: true });
        existing.addEventListener('error', () => resolve([]), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'js/photos.js';
      script.dataset.homePhotoManifest = '';
      script.onload = () => resolve(Array.isArray(window.PORTFOLIO_PHOTOS) ? window.PORTFOLIO_PHOTOS : []);
      script.onerror = () => resolve([]);
      document.head.appendChild(script);
    });

    // Homepage backgrounds must stay lightweight. Never fall back to a
    // camera-original photograph simply because a thumbnail path is missing.
    const heroSourceCandidates = file => [
      `Images/photo-thumbs/${file}.webp`
    ];

    const preloadFirstAvailable = candidates => new Promise(resolve => {
      let index = 0;

      const tryNext = () => {
        if (index >= candidates.length) {
          resolve(null);
          return;
        }

        const src = candidates[index++];
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(src);
        image.onerror = tryNext;
        image.src = src;
      };

      tryNext();
    });

    const setHeroBackground = (layer, src) => {
      layer.style.backgroundImage = `url(${JSON.stringify(src)})`;
      layer.style.backgroundPosition = 'center center';
      layer.style.backgroundSize = 'cover';
      layer.style.backgroundRepeat = 'no-repeat';
    };

    let previousMotion = '';

    const startHeroMotion = layer => {
      if (reduceMotion) {
        layer.removeAttribute('data-hero-motion');
        return;
      }

      const available = HERO_MOTIONS.filter(motion => motion !== previousMotion);
      const motion = available[Math.floor(Math.random() * available.length)] || HERO_MOTIONS[0];
      previousMotion = motion;

      // Removing/re-adding the attribute restarts the one-way CSS animation even
      // when this DOM layer is reused for a later slide.
      layer.removeAttribute('data-hero-motion');
      void layer.offsetWidth;
      layer.dataset.heroMotion = motion;
    };

    let activeLayer = heroPrimary;
    let standbyLayer = heroAlternate;
    let slides = [];
    let slideIndex = 0;
    let heroTimer = null;
    let transitionTimer = null;
    let heroRunning = false;

    const scheduleNext = delay => {
      if (reduceMotion || slides.length < 2) return;
      window.clearTimeout(heroTimer);
      heroTimer = window.setTimeout(showNextHero, delay);
    };

    const showNextHero = async () => {
      if (heroRunning || slides.length < 2) return;

      if (document.hidden) {
        scheduleNext(1000);
        return;
      }

      heroRunning = true;
      let attempts = 0;
      let source = null;
      let file = null;

      while (!source && attempts < slides.length - 1) {
        slideIndex = (slideIndex + 1) % slides.length;

        // Give each complete pass a fresh order while preventing an immediate
        // repeat of the photograph that just finished.
        if (slideIndex === 0 && slides.length > 2) {
          const currentFile = slides[slides.length - 1];
          const reshuffled = shuffled(slides);
          if (normalize(reshuffled[0]) === normalize(currentFile)) {
            [reshuffled[0], reshuffled[1]] = [reshuffled[1], reshuffled[0]];
          }
          slides = reshuffled;
        }

        file = slides[slideIndex];
        source = await preloadFirstAvailable(heroSourceCandidates(file));
        attempts += 1;
      }

      if (!source || !file) {
        heroRunning = false;
        scheduleNext(1200);
        return;
      }

      setHeroBackground(standbyLayer, source);
      startHeroMotion(standbyLayer);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          standbyLayer.classList.remove('is-hero-hidden');
          standbyLayer.classList.add('is-hero-visible');
          activeLayer.classList.remove('is-hero-visible');
          activeLayer.classList.add('is-hero-hidden');
        });
      });

      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => {
        const previousActive = activeLayer;
        activeLayer = standbyLayer;
        standbyLayer = previousActive;

        standbyLayer.classList.remove('is-hero-visible');
        standbyLayer.classList.add('is-hero-hidden');

        heroRunning = false;
        scheduleNext(HERO_HOLD_MS);
      }, HERO_FADE_MS);
    };

    loadPhotoManifest().then(async photos => {
      const seen = new Set();
      const photoFiles = [];

      // Optional homepage curation:
      // Add `hero: true` to any entry in js/photos.js that you specifically
      // want in the landing-page rotation. As soon as at least one photo is
      // marked, the hero uses only marked photos. With no marks, the current
      // full-archive rotation remains unchanged.
      const curatedHeroPhotos = photos.filter(photo => photo?.hero === true);
      const heroPhotos = curatedHeroPhotos.length ? curatedHeroPhotos : photos;

      heroPhotos.forEach(photo => {
        const file = String(photo?.file || '').trim();
        const key = normalize(file);
        if (!file || seen.has(key)) return;
        seen.add(key);
        photoFiles.push(file);
      });

      if (!photoFiles.length) return;

      // No fixed opening photograph: every load starts from a freshly shuffled
      // hero pool. Keep the hero visually hidden until the first randomized
      // photograph has actually loaded; this prevents the legacy Sunset fallback
      // (or a partially loaded thumbnail) from flashing during startup.
      slides = shuffled(photoFiles);
      slideIndex = 0;

      let firstSource = null;
      let firstFile = null;
      let firstIndex = 0;

      // Normally the first item succeeds immediately. Walking the shuffled list
      // also makes startup resilient if a thumbnail/original is ever missing.
      // Bound missing-file retries so a bad thumbnail set cannot stall startup.
      while (!firstSource && firstIndex < Math.min(slides.length, 12)) {
        firstFile = slides[firstIndex];
        firstSource = await preloadFirstAvailable(heroSourceCandidates(firstFile));
        if (!firstSource) firstIndex += 1;
      }

      if (!firstSource || !firstFile) return;

      slideIndex = firstIndex;
      setHeroBackground(heroPrimary, firstSource);
      startHeroMotion(heroPrimary);

      // Give the browser a painted hidden frame before revealing the image. The
      // existing opacity transition then becomes a true first-load fade-in.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          heroPrimary.classList.remove('is-hero-hidden');
          heroPrimary.classList.add('is-hero-visible');
        });
      });

      scheduleNext(HERO_HOLD_MS);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.clearTimeout(heroTimer);
        return;
      }
      scheduleNext(1000);
    });
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

  // Film motion studies. Desktop keeps the existing cinematic behavior, while
  // phones/tablets allow only the most-visible local clip to decode/play at a
  // time. This prevents several large MP4s from competing for bandwidth and
  // hardware decoding while the visitor scrolls through the Film section.
  const filmMotionIntros = qsa('[data-film-motion-intro]');

  if (filmMotionIntros.length) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileMotion = window.matchMedia('(max-width: 700px), (max-width: 900px) and (pointer: coarse)').matches;
    const saveData = Boolean(navigator.connection?.saveData);
    const motionItems = [];
    const viewportVisibility = element => {
      const rect = element.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      return visible / Math.max(rect.height, 1);
    };

    filmMotionIntros.forEach((intro, index) => {
      const video = qs('video', intro);
      if (!video) return;

      // Older homepage markup marked Hot Box and Abandoned as manual clips.
      // Normalize those elements at runtime so all six films behave alike.
      intro.removeAttribute('data-film-manual');
      intro.removeAttribute('data-film-label');
      intro.removeAttribute('role');
      intro.removeAttribute('tabindex');
      intro.removeAttribute('aria-label');
      intro.classList.remove('is-video-playing');
      qs('.film-motion-manual-cue', intro)?.remove();

      const assistiveCopy = qs('.sr-only', intro);
      if (assistiveCopy) {
        assistiveCopy.textContent = assistiveCopy.textContent.replace(/\s*Click to play or pause\.?\s*$/i, '').trim();
      }

      const item = {
        intro,
        video,
        index,
        loaded: false,
        nearby: false,
        viewportRatio: 0,
        posterPrepared: Boolean(video.getAttribute('poster')),
        loadPromise: null
      };

      if (item.posterPrepared) intro.classList.add('has-video-poster');

      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = 'none';

      item.preparePoster = () => {
        if (item.posterPrepared) return;
        item.posterPrepared = true;

        const poster = video.dataset.posterSrc;
        if (!poster) return;
        video.poster = poster;
        intro.classList.add('has-video-poster');
      };

      item.load = () => {
        if (item.loadPromise) return item.loadPromise;

        item.loadPromise = Promise.resolve().then(() => {
          if (item.loaded) return;
          item.loaded = true;
          item.preparePoster();
          // The <source media> element chooses the lightweight mobile encode on
          // phones and the original high-quality file on larger screens. No
          // HEAD/preflight request is needed before the actual media request.
          video.load();
        });

        return item.loadPromise;
      };

      item.canPlayNow = () => item.nearby && !document.hidden && !reduceMotion;

      item.play = async () => {
        if (!item.canPlayNow()) return;
        await item.load();
        if (!item.canPlayNow()) return;
        video.play().catch(() => {
          // If a browser declines autoplay, the prepared poster/still remains.
        });
      };

      item.pause = () => {
        if (!video.paused) video.pause();
      };

      video.addEventListener('loadeddata', () => {
        intro.classList.add('is-video-ready');
      });
      video.addEventListener('playing', () => {
        intro.classList.add('is-video-ready', 'is-video-playing');
      });
      video.addEventListener('pause', () => {
        intro.classList.remove('is-video-playing');
      });

      motionItems.push(item);
    });

    let mobileSyncFrame = 0;
    let activeMobileItem = null;

    const syncMobilePlayback = () => {
      mobileSyncFrame = 0;
      if (!mobileMotion || reduceMotion) return;

      motionItems.forEach(item => {
        item.viewportRatio = viewportVisibility(item.intro);
      });

      const candidates = motionItems
        .filter(item => item.nearby && item.viewportRatio > 0.18)
        .sort((a, b) => b.viewportRatio - a.viewportRatio);

      let nextActive = candidates[0] || null;

      // Avoid rapid A/B/A switching when two stacked clips are almost equally
      // visible during a slow scroll. Keep the current clip until the incoming
      // clip is clearly more visible, then hand playback over once.
      if (activeMobileItem && activeMobileItem.nearby && activeMobileItem.viewportRatio > 0.12) {
        const challenger = nextActive;
        if (!challenger || challenger === activeMobileItem ||
            challenger.viewportRatio < activeMobileItem.viewportRatio + 0.12) {
          nextActive = activeMobileItem;
        }
      }

      activeMobileItem = nextActive;

      motionItems.forEach(item => {
        if (item === activeMobileItem && !document.hidden) {
          item.play();
        } else {
          item.pause();
        }
      });

      // Once the current clip is established, prepare only the next clip's
      // poster. Do not start another video download on Save-Data connections.
      if (activeMobileItem && !saveData) {
        const next = motionItems[activeMobileItem.index + 1];
        next?.preparePoster();
      }
    };

    const requestMobileSync = () => {
      if (!mobileMotion || mobileSyncFrame) return;
      mobileSyncFrame = requestAnimationFrame(syncMobilePlayback);
    };

    if ('IntersectionObserver' in window) {
      const filmObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const item = motionItems.find(candidate => candidate.intro === entry.target);
          if (!item) return;
          item.nearby = entry.isIntersecting;

          if (item.nearby) item.preparePoster();

          if (!mobileMotion) {
            if (item.nearby) {
              if (!reduceMotion) item.play();
            } else {
              item.pause();
            }
          }
        });

        if (mobileMotion) requestMobileSync();
      }, {
        // Don't start decoding large clips until they're almost visible.
        rootMargin: mobileMotion ? '0px' : '80px 0px 80px 0px',
        threshold: mobileMotion ? [0, .12, .18, .3, .5, .7, .9, 1] : 0.01
      });

      motionItems.forEach(item => filmObserver.observe(item.intro));

      if (mobileMotion) {
        window.addEventListener('scroll', requestMobileSync, { passive: true });
        window.addEventListener('resize', requestMobileSync, { passive: true });
      }

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          motionItems.forEach(item => item.pause());
          return;
        }

        if (mobileMotion) {
          requestMobileSync();
        } else {
          motionItems.forEach(item => {
            if (item.nearby && item.canPlayNow()) item.play();
          });
        }
      });
    } else if (mobileMotion) {
      motionItems.forEach(item => { item.nearby = true; });
      requestMobileSync();
    } else {
      motionItems.forEach(item => {
        item.nearby = true;
        if (!reduceMotion) item.play();
      });
    }
  }

  // Custom music controls. When the Music page is inside the persistent site
  // shell, music-persistence.js owns these controls and drives the shell audio.
  // The local <audio> elements remain only for metadata / direct-page fallback.
  const musicUsesPersistentShell = document.body.classList.contains('music-page') && window.parent !== window;
  const trackCards = musicUsesPersistentShell ? [] : qsa('[data-track-card]');
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

  // Photography: simple gallery + full-frame viewer.
  const allGalleryButtons = qsa('.gallery-button').filter(button => button.isConnected);
  const countEl = qs('[data-photo-count]');
  const statusEl = qs('[data-gallery-status]');

  const connectedGalleryButtons = () => allGalleryButtons.filter(button => button.isConnected);

  const syncGalleryCount = () => {
    const count = connectedGalleryButtons().length;
    if (countEl) countEl.textContent = `${count} photographs`;
    if (statusEl) statusEl.textContent = `${count} photographs`;
  };

  syncGalleryCount();
  window.addEventListener('portfolio:photo-missing', syncGalleryCount);

  const lightbox = qs('[data-lightbox]');
  if (!lightbox || !allGalleryButtons.length) return;

  const stage = qs('[data-lightbox-stage]', lightbox);
  const currentImg = qs('[data-lightbox-image]', lightbox);
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
  let transitionTimer = 0;

  const currentSet = () => connectedGalleryButtons();
  const wrap = (index, items = currentSet()) => (index + items.length) % items.length;
  const itemAt = index => {
    const items = currentSet();
    if (!items.length) return null;
    return items[wrap(index, items)];
  };
  const sourceAt = index => itemAt(index)?.dataset.full || qs('img', itemAt(index))?.src || '';
  const captionAt = index => itemAt(index)?.dataset.title || itemAt(index)?.dataset.caption || qs('img', itemAt(index))?.alt || '';
  const metaAt = index => {
    const item = itemAt(index);
    if (!item) return '';
    return [item.dataset.collection, item.dataset.location, item.dataset.year].filter(Boolean).join(' · ');
  };

  const preloadCache = new Map();

  function preload(src) {
    if (!src) return Promise.resolve();
    if (preloadCache.has(src)) return preloadCache.get(src);

    const promise = new Promise(resolve => {
      const image = new Image();
      image.onload = async () => {
        try { if (image.decode) await image.decode(); } catch (_) {}
        resolve();
      };
      image.onerror = resolve;
      image.src = src;
      if (image.complete) image.onload();
    });

    preloadCache.set(src, promise);
    return promise;
  }

  function preloadAround(index) {
    [-2, -1, 1, 2].forEach(offset => preload(sourceAt(index + offset)));
  }

  function syncCopy(index) {
    const items = currentSet();
    if (!items.length) return;
    currentIndex = wrap(index, items);
    if (captionEl) captionEl.textContent = captionAt(currentIndex);
    if (metaEl) metaEl.textContent = metaAt(currentIndex);
    if (indexEl) indexEl.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    if (progressEl) progressEl.style.width = `${((currentIndex + 1) / items.length) * 100}%`;
  }

  async function show(index, { animate = false, direction = 1 } = {}) {
    const items = currentSet();
    if (!items.length) return;

    const targetIndex = wrap(index, items);
    const src = sourceAt(targetIndex);
    if (!src) return;

    // Adjacent photographs are normally already in cache. Awaiting the target
    // before swapping prevents the viewer from briefly showing an empty frame.
    await preload(src);

    if (animate) {
      currentImg.style.setProperty('--photo-exit-x', `${direction > 0 ? -14 : 14}px`);
      currentImg.classList.add('is-leaving');
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }

    syncCopy(targetIndex);

    // Place the new image slightly on the opposite side, then softly settle it
    // to center. The image box itself always fills the stage with object-fit:
    // contain, so portrait and landscape photographs remain completely visible.
    currentImg.classList.add('no-transition');
    currentImg.classList.remove('is-leaving');
    currentImg.src = src;
    currentImg.alt = captionAt(targetIndex);
    currentImg.style.opacity = '0';
    currentImg.style.transform = `translate3d(${animate ? (direction > 0 ? 12 : -12) : 0}px, 0, 0) scale(.992)`;

    try { if (currentImg.decode) await currentImg.decode(); } catch (_) {}

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        currentImg.classList.remove('no-transition');
        currentImg.style.opacity = '1';
        currentImg.style.transform = 'translate3d(0,0,0) scale(1)';
      });
    });

    preloadAround(targetIndex);
  }

  async function open(trigger) {
    const items = currentSet();
    const index = items.indexOf(trigger);
    if (index < 0) return;

    lastFocused = trigger || document.activeElement;
    await show(index, { animate: false });
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    closeBtn?.focus({ preventScroll: true });
  }

  function close() {
    window.clearTimeout(transitionTimer);
    transitionLock = false;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    currentImg.classList.remove('is-leaving', 'no-transition');
    currentImg.style.transform = '';
    currentImg.style.opacity = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus({ preventScroll: true });
  }

  async function go(direction) {
    const items = currentSet();
    if (transitionLock || items.length < 2) return;
    transitionLock = true;
    stage?.classList.remove('is-dragging');

    await show(currentIndex + direction, { animate: true, direction });

    transitionTimer = window.setTimeout(() => {
      transitionLock = false;
    }, 360);
  }

  allGalleryButtons.forEach(button => button.addEventListener('click', () => open(button)));
  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => go(-1));
  nextBtn?.addEventListener('click', () => go(1));

  document.addEventListener('keydown', event => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
  });

  // Swipe/drag is intentionally restrained. It provides feedback without
  // physically pulling neighboring slides into view, which keeps the full
  // photograph stable and centered.
  stage?.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    isPointerDown = true;
    pointerStartX = event.clientX;
    pointerDeltaX = 0;
    stage.classList.add('is-dragging');
    stage.setPointerCapture?.(event.pointerId);
  });

  stage?.addEventListener('pointermove', event => {
    if (!isPointerDown || transitionLock) return;
    pointerDeltaX = event.clientX - pointerStartX;
    const width = Math.max(stage.clientWidth, 1);
    const softX = Math.max(-42, Math.min(42, pointerDeltaX * .14));
    const opacity = Math.max(.72, 1 - Math.abs(pointerDeltaX) / width * .45);
    currentImg.style.transform = `translate3d(${softX}px,0,0) scale(.995)`;
    currentImg.style.opacity = String(opacity);
  });

  function finishPointer(event) {
    if (!isPointerDown) return;
    isPointerDown = false;
    stage?.releasePointerCapture?.(event.pointerId);
    stage?.classList.remove('is-dragging');

    const threshold = Math.min(90, Math.max(52, stage.clientWidth * .1));
    const delta = pointerDeltaX;
    pointerDeltaX = 0;

    currentImg.style.transform = 'translate3d(0,0,0) scale(1)';
    currentImg.style.opacity = '1';

    if (Math.abs(delta) >= threshold) go(delta < 0 ? 1 : -1);
  }

  stage?.addEventListener('pointerup', finishPointer);
  stage?.addEventListener('pointercancel', finishPointer);
})();

// In-page contact composer. FormSubmit provides the mail delivery layer for the
// static GitHub Pages site, while AJAX keeps visitors on the portfolio.
(() => {
  const dialog = document.querySelector('[data-contact-dialog]');
  const openButton = document.querySelector('[data-contact-open]');
  const closeButton = document.querySelector('[data-contact-close]');
  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-contact-status]');
  const submitButton = document.querySelector('[data-contact-submit]');
  const submitLabel = document.querySelector('[data-contact-submit-label]');

  if (!dialog || !openButton || !form) return;

  const endpoint = 'https://formsubmit.co/ajax/12rparker@gmail.com';
  let lastFocused = null;

  const setStatus = (message = '', state = '') => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-success', state === 'success');
    status.classList.toggle('is-error', state === 'error');
  };

  const setSending = sending => {
    if (submitButton) submitButton.disabled = sending;
    if (submitLabel) submitLabel.textContent = sending ? 'Sending…' : 'Send message';
  };

  const openDialog = () => {
    lastFocused = document.activeElement;
    setStatus();

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    window.setTimeout(() => form.querySelector('input[name="email"]')?.focus(), 60);
  };

  const closeDialog = () => {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  };

  openButton.addEventListener('click', openDialog);
  closeButton?.addEventListener('click', closeDialog);

  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog();
  });

  dialog.addEventListener('click', event => {
    // Native <dialog> reports backdrop clicks on the dialog element itself.
    if (event.target === dialog) closeDialog();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    setSending(true);
    setStatus('Sending your message…');

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload._replyto = String(payload.email || '').trim();
    payload._template = 'table';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Unable to send the message right now.');
      }

      const serverMessage = typeof result.message === 'string' ? result.message : '';
      if (/activat/i.test(serverMessage)) {
        setStatus('One-time setup needed: check 12rparker@gmail.com for the FormSubmit activation email.', 'success');
      } else {
        form.reset();
        setStatus('Message sent. Thank you — I’ll be in touch.', 'success');
      }
    } catch (error) {
      console.error('Contact form submission failed:', error);
      setStatus('The message could not be sent. Please try again, or email 12rparker@gmail.com directly.', 'error');
    } finally {
      setSending(false);
    }
  });
})();
