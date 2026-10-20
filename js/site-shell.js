(() => {
  // Privacy preference lives on the visitor-facing page, not just in the iframe.
  // The corresponding small <head> script sets it before the iframe loads.
  const privacyKey = 'partyzra_analytics_opt_out';
  const privacyMode = new URLSearchParams(window.location.search).get('analytics');
  let privacyPersisted = true;
  let privacyFallback = privacyMode === 'off';
  if (privacyMode === 'off' || privacyMode === 'on') {
    try {
      if (privacyMode === 'off') localStorage.setItem(privacyKey, '1');
      else localStorage.removeItem(privacyKey);
      privacyFallback = privacyMode === 'off';
    } catch (_) {
      privacyPersisted = false;
    }
  }
  const optedOut = () => {
    try { return localStorage.getItem(privacyKey) === '1'; }
    catch (_) { return privacyFallback; }
  };
  window.PartyzraPrivacy = {
    version: '2.4.0',
    get optedOut() { return optedOut(); },
    get persistent() { return privacyPersisted; }
  };

  if (['off', 'on', 'status'].includes(privacyMode)) {
    const excluded = optedOut();
    const notice = document.createElement('div');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.style.cssText = [
      'position:fixed', 'z-index:2147483647', 'bottom:18px', 'left:18px',
      'right:18px', 'max-width:460px', 'padding:16px 18px',
      'background:#161718', 'color:#f0eee9', 'border:1px solid #a58960',
      'border-radius:8px', 'font:14px/1.5 system-ui, sans-serif',
      'box-shadow:0 12px 32px rgba(0,0,0,.45)'
    ].join(';');
    const message = document.createElement('span');
    message.textContent = !privacyPersisted
      ? 'Privacy preference could not be saved. Check that this browser allows site storage.'
      : excluded
        ? 'Personal analytics excluded in this browser. Your future visits and photo clicks will not be recorded.'
        : 'Analytics enabled in this browser. This visit and future clicks can be recorded.';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss privacy notice');
    close.style.cssText = 'float:right;margin-left:10px;color:inherit;background:none;border:0;font-size:22px;cursor:pointer;line-height:1';
    close.addEventListener('click', () => notice.remove());
    notice.append(close, message);
    document.body.appendChild(notice);
  }

  const frame = document.querySelector('[data-site-shell-frame]');
  const soundtrack = document.querySelector('[data-site-soundtrack]');
  const toggle = document.querySelector('[data-soundtrack-toggle]');
  const next = document.querySelector('[data-soundtrack-next]');
  const icon = document.querySelector('[data-soundtrack-icon]');
  const status = document.querySelector('[data-soundtrack-status]');
  const title = document.querySelector('[data-soundtrack-title]');

  const routes = {
    home: {
      publicPath: 'index.html',
      contentPath: 'home.html',
      title: 'Ryan — Photography, Music & Film'
    },
    photography: {
      publicPath: 'photography.html',
      contentPath: 'photography-content.html',
      title: 'Photography — Ryan'
    },
    music: {
      publicPath: 'music.html',
      contentPath: 'music-content.html',
      title: 'Music — Ryan'
    }
  };

  const cleanHash = value => {
    if (!value) return '';
    return value.startsWith('#') ? value : `#${value}`;
  };

  const routeFromLocation = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('/photography.html') || path.endsWith('photography.html')) return 'photography';
    if (path.endsWith('/music.html') || path.endsWith('music.html')) return 'music';
    return 'home';
  };

  let currentRoute = routeFromLocation();

  const updatePublicHistory = (routeName, hash = '', { push = false } = {}) => {
    // History APIs can reject relative file:// URL rewrites when the site is
    // tested directly from a local folder. Navigation must never depend on it.
    if (!push || window.location.protocol === 'file:') return;

    const route = routes[routeName] || routes.home;
    const nextHash = cleanHash(hash);
    const publicUrl = `${route.publicPath}${nextHash}`;

    try {
      history.pushState({ route: routeName, hash: nextHash }, '', publicUrl);
    } catch (_) {
      // Keep the persistent shell and soundtrack working even if a browser or
      // hosting environment refuses the cosmetic URL update.
    }
  };

  const loadRoute = (routeName, hash = '', { push = false } = {}) => {
    const route = routes[routeName] || routes.home;
    const nextHash = cleanHash(hash);
    const contentUrl = `${route.contentPath}${nextHash}`;

    currentRoute = routeName;
    document.title = route.title;

    // Change the visible content first. A failed history update must never be
    // able to leave the visitor stranded on the current page.
    if (frame) {
      const currentSrc = frame.getAttribute('src') || '';
      if (currentSrc !== contentUrl) {
        frame.setAttribute('src', contentUrl);
      }
    }

    updatePublicHistory(routeName, nextHash, { push });
  };

  // Same-origin content pages can call this directly. shell-navigation.js
  // still falls back to postMessage when direct parent access is unavailable.
  window.__portfolioNavigate = (routeName, hash = '') => {
    const route = routeName === 'photography'
      ? 'photography'
      : (routeName === 'music' ? 'music' : 'home');
    const nextHash = cleanHash(hash || '');

    if (route === currentRoute) {
      if (route === 'home' && nextHash) {
        if (window.location.protocol !== 'file:') {
          try {
            history.pushState({ route, hash: nextHash }, '', `${routes.home.publicPath}${nextHash}`);
          } catch (_) {}
        }
        try {
          frame?.contentWindow.location.replace(`${routes.home.contentPath}${nextHash}`);
        } catch (_) {}
      }
      return;
    }

    loadRoute(route, nextHash, { push: true });
  };

  if (frame) {
    loadRoute(currentRoute, window.location.hash, { push: false });

    window.addEventListener('message', event => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== 'portfolio:navigate') return;

      const route = data.route === 'photography'
        ? 'photography'
        : (data.route === 'music' ? 'music' : 'home');
      const hash = cleanHash(data.hash || '');

      window.__portfolioNavigate(route, hash);
    });

    window.addEventListener('popstate', () => {
      loadRoute(routeFromLocation(), window.location.hash, { push: false });
    });
  }

  if (!soundtrack || !toggle) return;

  const targetVolume = 1;
  const tracks = [
    {
      sources: ['MusicTracks/1234 - Calum Graham.mp3'],
      title: '1234 - Calum Graham'
    },
    {
      sources: ['MusicTracks/Outset Island - TPR.mp3'],
      title: 'Outset Island - TPR'
    },
    {
      // Exact filename currently published in the GitHub MusicTracks folder.
      // Alternate names are kept as fallbacks in case the file is cleaned up later.
      sources: [
        'MusicTracks/Painkillers - Rainbow Kitten Surprise.mp3'
      ],
      title: 'Painkillers - RKS'
    }
  ];

  let currentTrackIndex = 0;
  let currentSourceIndex = 0;
  let fadeFrame = null;
  let changingTrack = false;

  const currentTrack = () => tracks[currentTrackIndex];
  const currentSources = () => currentTrack().sources || [];

  const setTrackTitle = () => {
    if (title) title.textContent = currentTrack().title;
  };

  const setUI = state => {
    const playing = state === 'playing';
    const ended = state === 'ended';

    toggle.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? 'Pause soundtrack' : 'Play soundtrack');

    if (icon) icon.textContent = playing ? 'Ⅱ' : '▶';
    if (status) status.textContent = playing ? 'Now playing' : (ended ? 'Track ended' : 'Play soundtrack');
    setTrackTitle();
  };

  const fadeVolume = (from, to, duration = 900) => {
    if (fadeFrame) cancelAnimationFrame(fadeFrame);
    const started = performance.now();
    soundtrack.volume = Math.max(0, Math.min(1, from));

    const step = now => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      soundtrack.volume = from + (to - from) * eased;
      if (progress < 1) fadeFrame = requestAnimationFrame(step);
    };

    fadeFrame = requestAnimationFrame(step);
  };

  const loadSource = sourceIndex => {
    const sources = currentSources();
    if (!sources.length) return false;

    currentSourceIndex = Math.max(0, Math.min(sourceIndex, sources.length - 1));
    const src = sources[currentSourceIndex];

    if (soundtrack.getAttribute('src') !== src) {
      soundtrack.src = src;
      soundtrack.load();
    }

    return true;
  };

  const loadTrack = index => {
    currentTrackIndex = ((index % tracks.length) + tracks.length) % tracks.length;
    currentSourceIndex = 0;
    loadSource(0);
    setTrackTitle();
  };

  const playSoundtrack = async ({ gentleFade = true } = {}) => {
    const sources = currentSources();
    if (!sources.length) {
      setUI('paused');
      return false;
    }

    // Try every known filename for this track. This protects the site from
    // small GitHub filename differences (spaces, wording, or later cleanup).
    for (let i = currentSourceIndex; i < sources.length; i += 1) {
      if (i !== currentSourceIndex || soundtrack.getAttribute('src') !== sources[i]) {
        loadSource(i);
      }

      try {
        soundtrack.volume = gentleFade ? 0.12 : targetVolume;
        await soundtrack.play();
        if (gentleFade) fadeVolume(0.12, targetVolume);
        setUI('playing');
        return true;
      } catch (_) {
        soundtrack.pause();
      }
    }

    soundtrack.volume = targetVolume;
    setUI('paused');
    return false;
  };

  const pauseSoundtrack = () => {
    if (fadeFrame) cancelAnimationFrame(fadeFrame);
    soundtrack.pause();
    soundtrack.volume = targetVolume;
    setUI('paused');
  };

  toggle.addEventListener('click', async () => {
    if (!soundtrack.paused && !soundtrack.ended) {
      pauseSoundtrack();
      return;
    }

    if (soundtrack.ended) soundtrack.currentTime = 0;
    await playSoundtrack();
  });

  next?.addEventListener('click', async () => {
    const wasPlaying = !soundtrack.paused && !soundtrack.ended;
    changingTrack = true;

    if (fadeFrame) cancelAnimationFrame(fadeFrame);
    soundtrack.pause();
    loadTrack(currentTrackIndex + 1);
    soundtrack.currentTime = 0;
    soundtrack.volume = targetVolume;

    if (wasPlaying) {
      await playSoundtrack({ gentleFade: false });
    } else {
      setUI('paused');
    }

    changingTrack = false;
  });

  soundtrack.addEventListener('play', () => setUI('playing'));
  soundtrack.addEventListener('pause', () => {
    if (!soundtrack.ended && !changingTrack) setUI('paused');
  });
  soundtrack.addEventListener('ended', () => setUI('ended'));

  // The site opens silent, with Lovely Day, Good As Hell selected first.
  loadTrack(0);
  soundtrack.volume = targetVolume;
  setUI('paused');
})();
