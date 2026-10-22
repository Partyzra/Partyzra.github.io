(() => {
  const cards = [...document.querySelectorAll('[data-track-card]')];
  if (!cards.length) return;

  const tracks = cards.map(card => {
    const audio = card.querySelector('[data-audio]');
    const title = card.querySelector('h2')?.textContent?.trim() || 'Track';
    return {
      id: card.dataset.trackId || title.toLowerCase().replace(/\s+/g, '-'),
      title,
      artist: card.querySelector('.track-artist')?.textContent?.trim() || 'Jonesy',
      card,
      audio,
      playButton: card.querySelector('[data-track-play]'),
      seek: card.querySelector('[data-track-seek]'),
      current: card.querySelector('[data-track-current]'),
      duration: card.querySelector('[data-track-duration]')
    };
  }).filter(track => track.audio && track.playButton);

  if (!tracks.length) return;

  let currentTrackId = null;
  let activated = false;
  const subscribers = new Set();

  const currentTrack = () => tracks.find(track => track.id === currentTrackId) || null;
  const currentAudio = () => currentTrack()?.audio || null;

  const formatTime = seconds => {
    if (!Number.isFinite(seconds)) return '—:—';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  };

  const notify = () => {
    subscribers.forEach(fn => {
      try { fn(); } catch (_) {}
    });
    try {
      window.parent?.__registerPartyzraMusicPlayer?.(api);
    } catch (_) {}
  };

  const syncControls = () => {
    const active = currentTrack();
    tracks.forEach(track => {
      const isActive = active?.id === track.id;
      const isPlaying = isActive && !track.audio.paused && !track.audio.ended;
      track.card.classList.toggle('is-selected', isActive);
      track.card.classList.toggle('is-playing', isPlaying);
      track.playButton.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} ${track.title}`);

      if (isActive) {
        const ratio = track.audio.duration > 0 ? track.audio.currentTime / track.audio.duration : 0;
        const progress = Math.max(0, Math.min(1, ratio || 0));
        if (track.seek) {
          track.seek.value = String(Math.round(progress * 1000));
          track.seek.style.setProperty('--progress', `${progress * 100}%`);
        }
        if (track.current) track.current.textContent = formatTime(track.audio.currentTime);
        if (track.duration) track.duration.textContent = formatTime(track.audio.duration);
      } else {
        if (track.seek) {
          track.seek.value = '0';
          track.seek.style.setProperty('--progress', '0%');
        }
        if (track.current) track.current.textContent = '0:00';
        if (track.duration && Number.isFinite(track.audio.duration)) {
          track.duration.textContent = formatTime(track.audio.duration);
        }
      }
    });
  };

  const pauseOthers = keep => {
    tracks.forEach(track => {
      if (track !== keep && !track.audio.paused) track.audio.pause();
    });
  };

  const selectTrack = async (idOrIndex, options = {}) => {
    let track;
    if (typeof idOrIndex === 'number') {
      const index = ((idOrIndex % tracks.length) + tracks.length) % tracks.length;
      track = tracks[index];
    } else {
      track = tracks.find(item => item.id === String(idOrIndex || '')) || currentTrack() || tracks[0];
    }

    const previous = currentTrack();
    const changing = previous && previous !== track;
    if (changing) previous.audio.pause();

    currentTrackId = track.id;
    pauseOthers(track);

    if (options.restart) {
      try { track.audio.currentTime = 0; } catch (_) {}
    }

    if (options.autoplay) {
      try {
        await track.audio.play();
        activated = true;
      } catch (error) {
        // Keep the selected track visible, but do not pretend playback began.
        syncControls();
        notify();
        throw error;
      }
    }

    syncControls();
    notify();
    return true;
  };

  const play = async () => {
    const track = currentTrack() || tracks[0];
    currentTrackId = track.id;
    pauseOthers(track);
    if (track.audio.ended) {
      try { track.audio.currentTime = 0; } catch (_) {}
    }
    await track.audio.play();
    activated = true;
    syncControls();
    notify();
    return true;
  };

  const pause = () => {
    const audio = currentAudio();
    if (audio && !audio.paused) audio.pause();
    syncControls();
    notify();
  };

  const next = async ({ preservePlayback = true } = {}) => {
    const active = currentTrack();
    const index = active ? tracks.findIndex(track => track.id === active.id) : -1;
    const wasPlaying = Boolean(active && !active.audio.paused && !active.audio.ended);
    return selectTrack((index + 1) % tracks.length, {
      autoplay: preservePlayback && wasPlaying,
      restart: true
    });
  };

  const api = {
    version: '2.8.0',
    tracks: tracks.map(({ id, title, artist }) => ({ id, title, artist })),
    get currentTrack() {
      const track = currentTrack();
      return track ? { id: track.id, title: track.title, artist: track.artist } : null;
    },
    get audio() { return currentAudio(); },
    get isPlaying() {
      const audio = currentAudio();
      return Boolean(audio && !audio.paused && !audio.ended);
    },
    get isActivated() { return activated; },
    play,
    pause,
    next,
    selectTrack,
    notify,
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      subscribers.add(fn);
      try { fn(); } catch (_) {}
      return () => subscribers.delete(fn);
    }
  };

  // Music-page Play buttons start the local audio directly inside the same
  // document as the user's click. This is intentionally not delegated to the
  // parent shell; it avoids browser autoplay/user-gesture restrictions.
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-track-play]');
    if (!button) return;

    const track = tracks.find(item => item.card === button.closest('[data-track-card]'));
    if (!track) return;

    event.preventDefault();
    event.stopPropagation();

    const sameTrack = currentTrackId === track.id;
    if (sameTrack && !track.audio.paused && !track.audio.ended) {
      track.audio.pause();
      syncControls();
      notify();
      return;
    }

    try {
      if (!sameTrack) {
        await selectTrack(track.id, { autoplay: true, restart: false });
      } else {
        await play();
      }
    } catch (_) {
      // The browser rejected playback; keep UI truthful and let the next direct
      // user tap try again rather than silently falling back to another player.
    }
  });

  document.addEventListener('input', event => {
    const seek = event.target.closest('[data-track-seek]');
    if (!seek) return;
    const track = tracks.find(item => item.card === seek.closest('[data-track-card]'));
    if (!track || currentTrackId !== track.id) return;
    if (!Number.isFinite(track.audio.duration) || track.audio.duration <= 0) return;
    track.audio.currentTime = (Number(seek.value) / 1000) * track.audio.duration;
    syncControls();
    notify();
  });

  tracks.forEach(track => {
    const { audio } = track;
    audio.preload = 'metadata';
    audio.addEventListener('play', () => {
      currentTrackId = track.id;
      activated = true;
      pauseOthers(track);
      syncControls();
      notify();
    });
    audio.addEventListener('pause', () => {
      syncControls();
      notify();
    });
    audio.addEventListener('ended', () => {
      syncControls();
      notify();
    });
    ['timeupdate', 'loadedmetadata', 'durationchange', 'seeking', 'seeked'].forEach(name => {
      audio.addEventListener(name, () => {
        syncControls();
        notify();
      });
    });
  });

  window.__partyzraMusicPagePlayer = api;
  syncControls();

  try {
    window.parent?.__registerPartyzraMusicPlayer?.(api);
  } catch (_) {}

  window.dispatchEvent(new CustomEvent('partyzra:music-page-player-ready'));
})();
