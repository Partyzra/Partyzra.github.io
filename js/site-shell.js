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
      // Exact filename currently published in the GitHub MusicTracks folder.
      // Alternate names are kept as fallbacks in case the file is cleaned up later.
      sources: [
        'MusicTracks/Lovely Day, Good As Hell Mashup - Pomplamoose .mp3',
        'MusicTracks/Lovely Day, Good As Hell Mashup - Pomplamoose.mp3',
        'MusicTracks/Lovely Day, Good As Hell - Pomplamoose.mp3'
      ],
      title: 'Lovely Day, Good As Hell'
    },
    {
      // Exact filename currently published in the GitHub MusicTracks folder.
      sources: [
        'MusicTracks/Pain Killers - Rainbow Kitten Surprise.mp3',
        'MusicTracks/Painkillers - Rainbow Kitten Surprise.mp3',
        'MusicTracks/Painkillers - Rainbow Cat Surprise.mp3'
      ],
      title: 'Painkillers'
    },
    {
      sources: ['MusicTracks/Guitar Solo.wav'],
      title: 'Unknown Guitar Track'
    },
    {
      sources: ['assets/audio/the-drive-back-tom-anello.mp3'],
      title: 'The Drive Back — Tom Anello'
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
