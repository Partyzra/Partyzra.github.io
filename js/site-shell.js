(() => {
  // Privacy preference lives on the visitor-facing page, not just in the iframe.
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
    version: '2.8.0',
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

  const initialFrame = document.querySelector('[data-site-shell-frame]');
  const toggle = document.querySelector('[data-soundtrack-toggle]');
  const next = document.querySelector('[data-soundtrack-next]');
  const icon = document.querySelector('[data-soundtrack-icon]');
  const status = document.querySelector('[data-soundtrack-status]');
  const title = document.querySelector('[data-soundtrack-title]');
  const playerShell = document.querySelector('.site-soundtrack-player');

  const routes = {
    home: {
      publicPath: 'index.html',
      contentPath: 'home.html',
      title: 'Ryan — Photography, Music & Film',
      frameTitle: 'Ryan portfolio'
    },
    photography: {
      publicPath: 'photography.html',
      contentPath: 'photography-content.html',
      title: 'Photography — Ryan',
      frameTitle: 'Ryan photography portfolio'
    },
    music: {
      publicPath: 'music.html',
      contentPath: 'music-content.html',
      title: 'Music — Ryan',
      frameTitle: 'Ryan music'
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
  let contentFrame = null; // reused for Home / Photography
  let musicFrame = null;   // deliberately kept alive once created
  let musicApi = null;
  let unsubscribeMusic = null;

  const frameRoute = frame => frame?.dataset?.shellRoute || '';

  const markFrame = (frame, route) => {
    if (!frame) return null;
    frame.dataset.siteShellFrame = '';
    frame.dataset.shellRoute = route;
    frame.classList.add('site-shell-frame');
    frame.title = routes[route].frameTitle;
    return frame;
  };

  if (initialFrame) {
    if (currentRoute === 'music') musicFrame = markFrame(initialFrame, 'music');
    else contentFrame = markFrame(initialFrame, currentRoute);
  }

  const createFrame = route => {
    const frame = document.createElement('iframe');
    frame.className = 'site-shell-frame is-shell-hidden';
    frame.setAttribute('data-site-shell-frame', '');
    frame.dataset.shellRoute = route;
    frame.title = routes[route].frameTitle;
    frame.src = routes[route].contentPath;
    document.body.insertBefore(frame, playerShell || null);
    return frame;
  };

  const setFrameVisible = (frame, visible) => {
    if (!frame) return;
    frame.classList.toggle('is-shell-hidden', !visible);
    frame.setAttribute('aria-hidden', visible ? 'false' : 'true');
  };

  const ensureContentFrame = route => {
    if (!contentFrame) contentFrame = createFrame(route);
    markFrame(contentFrame, route);
    return contentFrame;
  };

  const ensureMusicFrame = () => {
    if (!musicFrame) {
      musicFrame = createFrame('music');
      musicFrame.addEventListener('load', () => connectMusicApi(), { passive: true });
    }
    return musicFrame;
  };

  const updatePublicHistory = (routeName, hash = '', { push = false } = {}) => {
    if (!push || window.location.protocol === 'file:') return;
    const route = routes[routeName] || routes.home;
    const publicUrl = `${route.publicPath}${cleanHash(hash)}`;
    try {
      history.pushState({ route: routeName, hash: cleanHash(hash) }, '', publicUrl);
    } catch (_) {}
  };

  const sameContentUrl = (frame, routeName, hash = '') => {
    if (!frame) return false;
    const wanted = `${routes[routeName].contentPath}${cleanHash(hash)}`;
    const raw = frame.getAttribute('src') || '';
    return raw === wanted;
  };

  const syncFrameVisibility = () => {
    setFrameVisible(musicFrame, currentRoute === 'music');
    setFrameVisible(contentFrame, currentRoute !== 'music');
  };

  const loadRoute = (routeName, hash = '', { push = false } = {}) => {
    const route = routes[routeName] || routes.home;
    const nextHash = cleanHash(hash);
    currentRoute = routeName;
    document.title = route.title;

    if (routeName === 'music') {
      const frame = ensureMusicFrame();
      if (!frame.getAttribute('src')) frame.src = route.contentPath;
    } else {
      const frame = ensureContentFrame(routeName);
      const wanted = `${route.contentPath}${nextHash}`;
      if (!sameContentUrl(frame, routeName, nextHash)) {
        frame.dataset.shellRoute = routeName;
        frame.title = route.frameTitle;
        frame.setAttribute('src', wanted);
      } else if (nextHash) {
        try { frame.contentWindow.location.hash = nextHash; } catch (_) {}
      }
    }

    syncFrameVisibility();
    syncCompactPlayer();
    updatePublicHistory(routeName, nextHash, { push });
  };

  window.__portfolioNavigate = (routeName, hash = '') => {
    const route = routeName === 'photography'
      ? 'photography'
      : (routeName === 'music' ? 'music' : 'home');
    const nextHash = cleanHash(hash || '');

    if (route === currentRoute) {
      if (route === 'home' && nextHash) {
        const frame = ensureContentFrame('home');
        if (frameRoute(frame) !== 'home') {
          frame.dataset.shellRoute = 'home';
          frame.setAttribute('src', `${routes.home.contentPath}${nextHash}`);
        } else {
          try { frame.contentWindow.location.hash = nextHash; } catch (_) {}
        }
        updatePublicHistory('home', nextHash, { push: true });
      }
      return;
    }

    loadRoute(route, nextHash, { push: true });
  };

  window.addEventListener('message', event => {
    const knownSource = [contentFrame, musicFrame]
      .filter(Boolean)
      .some(frame => event.source === frame.contentWindow);
    if (!knownSource) return;

    const data = event.data;
    if (!data || data.type !== 'portfolio:navigate') return;
    const route = data.route === 'photography'
      ? 'photography'
      : (data.route === 'music' ? 'music' : 'home');
    window.__portfolioNavigate(route, cleanHash(data.hash || ''));
  });

  window.addEventListener('popstate', () => {
    loadRoute(routeFromLocation(), window.location.hash, { push: false });
  });

  // -------- Persistent music bridge --------
  // Audio stays inside music-content.html, where the user actually clicks Play.
  // The Music iframe remains mounted when hidden, so audio never restarts during
  // Home / Photography navigation. The compact shell controls proxy that same
  // player only after the user has explicitly started music on the Music page.

  const getMusicApi = () => {
    if (musicApi) return musicApi;
    try {
      return musicFrame?.contentWindow?.__partyzraMusicPagePlayer || null;
    } catch (_) {
      return null;
    }
  };

  const detachMusicSubscription = () => {
    if (typeof unsubscribeMusic === 'function') {
      try { unsubscribeMusic(); } catch (_) {}
    }
    unsubscribeMusic = null;
  };

  const connectMusicApi = apiOverride => {
    const api = apiOverride || getMusicApi();
    if (!api) return false;
    if (musicApi === api && unsubscribeMusic) {
      syncCompactPlayer();
      return true;
    }

    detachMusicSubscription();
    musicApi = api;
    if (typeof api.subscribe === 'function') {
      unsubscribeMusic = api.subscribe(syncCompactPlayer);
    }
    syncCompactPlayer();
    return true;
  };

  window.__registerPartyzraMusicPlayer = api => {
    if (!api) return;
    connectMusicApi(api);
  };

  const syncCompactPlayer = () => {
    const api = getMusicApi();
    const activated = Boolean(api?.isActivated);
    const track = api?.currentTrack || null;
    const playing = Boolean(api?.isPlaying);
    const shouldShow = activated && currentRoute !== 'music';

    playerShell?.classList.toggle('is-available', shouldShow);
    playerShell?.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');

    if (toggle) {
      toggle.classList.toggle('is-playing', playing);
      toggle.setAttribute('aria-pressed', String(playing));
      toggle.setAttribute('aria-label', track
        ? `${playing ? 'Pause' : 'Play'} ${track.title}`
        : 'Music player');
    }
    if (icon) icon.textContent = playing ? 'Ⅱ' : '▶';
    if (status) status.textContent = playing ? 'Now playing' : 'Play music';
    if (title) title.textContent = track ? `${track.title} — ${track.artist}` : '';

    if (next && api?.tracks?.length && track) {
      const index = Math.max(0, api.tracks.findIndex(item => item.id === track.id));
      const following = api.tracks[(index + 1) % api.tracks.length];
      next.setAttribute('aria-label', `Next song: ${following.title}`);
      next.setAttribute('title', `Next: ${following.title}`);
    }
  };

  toggle?.addEventListener('click', async () => {
    const api = getMusicApi();
    if (!api?.isActivated) return;
    try {
      if (api.isPlaying) api.pause();
      else await api.play();
    } catch (_) {}
    syncCompactPlayer();
  });

  next?.addEventListener('click', async () => {
    const api = getMusicApi();
    if (!api?.isActivated) return;
    try { await api.next({ preservePlayback: true }); } catch (_) {}
    syncCompactPlayer();
  });

  // Initialize the correct route without replacing a Music iframe that may have
  // already begun playback.
  if (currentRoute === 'music') {
    ensureMusicFrame();
    setFrameVisible(musicFrame, true);
    setFrameVisible(contentFrame, false);
    // music-persistence.js will register itself when ready.
  } else {
    ensureContentFrame(currentRoute);
    setFrameVisible(contentFrame, true);
    setFrameVisible(musicFrame, false);
  }

  syncCompactPlayer();
})();
