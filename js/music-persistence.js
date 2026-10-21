(() => {
  const cards = [...document.querySelectorAll('[data-track-card]')];
  if (!cards.length) return;

  let host = null;
  try {
    if (window.parent && window.parent !== window && window.parent.document) {
      host = window.parent;
    }
  } catch (_) {}

  // If music-content.html is opened directly there is no persistent outer
  // shell. In that case portfolio.js keeps the page-local controls usable.
  if (!host) return;

  let teardown = null;

  const setup = () => {
    const api = host.__partyzraMusicPlayer;
    if (!api || !api.audio) return false;
    if (teardown) return true;

    const player = api.audio;

    const trackFromElement = element => {
      const card = element.closest('[data-track-card]');
      if (!card) return null;
      const id = card.dataset.trackId || '';
      const apiTrack = api.tracks.find(track => track.id === id);
      if (!apiTrack) return null;

      return {
        id,
        card,
        apiTrack,
        play: card.querySelector('[data-track-play]'),
        seek: card.querySelector('[data-track-seek]'),
        current: card.querySelector('[data-track-current]'),
        duration: card.querySelector('[data-track-duration]')
      };
    };

    const allTracks = () => cards.map(card => trackFromElement(card)).filter(Boolean);

    const formatTime = seconds => {
      if (!Number.isFinite(seconds)) return '—:—';
      const minutes = Math.floor(seconds / 60);
      const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${minutes}:${remainder}`;
    };

    const syncControls = () => {
      const activeId = api.currentTrack?.id || '';

      allTracks().forEach(track => {
        const active = track.id === activeId;
        const playing = active && api.isPlaying;

        track.card.classList.toggle('is-playing', playing);
        track.card.classList.toggle('is-selected', active);
        track.play?.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${track.apiTrack.title}`);

        if (!active) return;

        const ratio = player.duration > 0 ? player.currentTime / player.duration : 0;
        const progress = Math.max(0, Math.min(1, ratio));

        if (track.seek) {
          track.seek.value = String(Math.round(progress * 1000));
          track.seek.style.setProperty('--progress', `${progress * 100}%`);
        }
        if (track.current) track.current.textContent = formatTime(player.currentTime);
        if (track.duration) track.duration.textContent = formatTime(player.duration);
      });
    };

    // Local <audio> elements remain only as graceful standalone-page fallbacks.
    cards.forEach(card => card.querySelector('[data-audio]')?.pause());

    const onClick = async event => {
      const button = event.target.closest('[data-track-play]');
      if (!button) return;
      const track = trackFromElement(button);
      if (!track) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const sameTrack = api.currentTrack?.id === track.id;
      if (sameTrack && api.isPlaying) {
        api.pause();
        return;
      }

      if (!sameTrack) {
        await api.selectTrack(track.id, { autoplay: true, gentleFade: false });
      } else {
        if (player.ended) player.currentTime = 0;
        await api.play({ gentleFade: false });
      }
    };

    const onInput = event => {
      const seek = event.target.closest('[data-track-seek]');
      if (!seek) return;
      const track = trackFromElement(seek);
      if (!track || api.currentTrack?.id !== track.id) return;
      if (!Number.isFinite(player.duration) || player.duration <= 0) return;

      event.stopImmediatePropagation();
      player.currentTime = (Number(seek.value) / 1000) * player.duration;
      api.notify();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    const unsubscribe = api.subscribe(syncControls);

    teardown = () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('input', onInput, true);
      unsubscribe();
    };

    window.addEventListener('pagehide', () => teardown?.(), { once: true });
    syncControls();
    return true;
  };

  if (!setup()) {
    host.addEventListener('partyzra:music-player-ready', setup, { once: true });
  }
})();
