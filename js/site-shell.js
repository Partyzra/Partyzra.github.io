(() => {
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

  const targetVolume = 0.50;
  const tracks = [
    {
      // GitHub Pages is case-sensitive, so keep a few safe fallbacks for this
      // filename. The first entry remains the canonical filename to use.
      sources: [
        'MusicTracks/Lovely Day, Good As Hell - Pomplamoose.mp3',
        'MusicTracks/Lovely Day, Good as Hell - Pomplamoose.mp3',
        'MusicTracks/Lovely Day, Good As Hell - Pomplamoose.MP3',
        'MusicTracks/Lovely Day, Good as Hell - Pomplamoose.MP3'
      ],
      title: 'Lovely Day, Good As Hell'
    },
    {
      src: 'MusicTracks/Painkillers - Rainbow Cat Surprise.mp3',
      title: 'Painkillers'
    },
    {
      src: 'MusicTracks/Guitar Solo.wav',
      title: 'Unknown Guitar Track'
    },
    {
      src: 'assets/audio/the-drive-back-tom-anello.mp3',
      title: 'The Drive Back — Tom Anello'
    }
  ];

  let currentTrackIndex = 0;
  let currentSourceIndex = 0;
  let fadeFrame = null;
  let changingTrack = false;

  const currentTrack = () => tracks[currentTrackIndex];

  const trackSources = track => {
    if (Array.isArray(track.sources) && track.sources.length) return track.sources;
    return track.src ? [track.src] : [];
  };

  const mediaUrl = path => {
    // Encode each path segment independently. This safely handles spaces,
    // commas and other filename punctuation without encoding the slashes.
    return String(path || '')
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
  };

  const currentSource = () => {
    const sources = trackSources(currentTrack());
    return sources[currentSourceIndex] || sources[0] || '';
  };

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

  const loadCurrentSource = () => {
    const source = currentSource();
    if (!source) return;

    const safeSource = mediaUrl(source);
    const currentAttr = soundtrack.getAttribute('src') || '';
    if (currentAttr !== safeSource) {
      soundtrack.setAttribute('src', safeSource);
      soundtrack.load();
    }
  };

  const loadTrack = index => {
    currentTrackIndex = ((index % tracks.length) + tracks.length) % tracks.length;
    currentSourceIndex = 0;
    loadCurrentSource();
    setTrackTitle();
  };

  const playSoundtrack = async ({ gentleFade = true } = {}) => {
    const sources = trackSources(currentTrack());
    if (!sources.length) {
      setUI('paused');
      return false;
    }

    // If a hosted filename differs only by case, try the next declared source
    // automatically instead of leaving the Play button apparently broken.
    for (let attempt = currentSourceIndex; attempt < sources.length; attempt += 1) {
      currentSourceIndex = attempt;
      loadCurrentSource();

      try {
        soundtrack.volume = gentleFade ? 0.12 : targetVolume;
        await soundtrack.play();
        if (gentleFade) fadeVolume(0.12, targetVolume);
        setUI('playing');
        return true;
      } catch (_) {
        soundtrack.pause();
        soundtrack.currentTime = 0;
      }
    }

    currentSourceIndex = 0;
    loadCurrentSource();
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
