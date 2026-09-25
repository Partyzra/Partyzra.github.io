(() => {
  const cards = [...document.querySelectorAll('[data-track-card]')];
  if (!cards.length) return;

  // Use the persistent outer site shell whenever we're inside it.
  let host = window;

  try {
    if (
      window.parent &&
      window.parent !== window &&
      window.parent.document
    ) {
      host = window.parent;
    }
  } catch (_) {}

  const KEY = '__partyzraMusicRoom';

  // Create the persistent player once.
  if (!host[KEY]) {
    const audio = host.document.createElement('audio');

    audio.preload = 'metadata';
    audio.style.display = 'none';
    audio.dataset.persistentMusicRoom = '';

    host.document.body.appendChild(audio);

    const subscribers = new Set();

    const room = {
      audio,
      src: '',
      title: '',
      subscribers,

      notify() {
        subscribers.forEach(fn => {
          try {
            fn();
          } catch (_) {}
        });
      }
    };

    [
      'play',
      'pause',
      'timeupdate',
      'loadedmetadata',
      'durationchange'
    ].forEach(eventName => {
      audio.addEventListener(eventName, () => room.notify());
    });

    audio.addEventListener('ended', () => {
      audio.currentTime = 0;
      room.notify();
    });

    // If the bottom-right soundtrack starts,
    // pause the Music-page song.
    const soundtrack =
      host.document.querySelector('[data-site-soundtrack]');

    if (soundtrack) {
      soundtrack.addEventListener('play', () => {
        if (!audio.paused) {
          audio.pause();
        }
      });
    }

    host[KEY] = room;
  }

  const room = host[KEY];
  const player = room.audio;

  const absoluteURL = src => {
    try {
      return new URL(src, document.baseURI).href;
    } catch (_) {
      return src;
    }
  };

  const trackFromElement = element => {
    const card = element.closest('[data-track-card]');
    if (!card) return null;

    const localAudio = card.querySelector('[data-audio]');
    const source =
      localAudio?.querySelector('source')?.getAttribute('src') ||
      localAudio?.getAttribute('src');

    if (!source) return null;

    return {
      card,
      audio: localAudio,
      play: card.querySelector('[data-track-play]'),
      seek: card.querySelector('[data-track-seek]'),
      current: card.querySelector('[data-track-current]'),
      duration: card.querySelector('[data-track-duration]'),
      title:
        card.querySelector('h2')?.textContent?.trim() ||
        'Track',
      src: absoluteURL(source)
    };
  };

  const allTracks = () =>
    cards
      .map(card => trackFromElement(card))
      .filter(Boolean);

  const formatTime = seconds => {
    if (!Number.isFinite(seconds)) return '—:—';

    const minutes = Math.floor(seconds / 60);
    const remainder =
      Math.floor(seconds % 60)
        .toString()
        .padStart(2, '0');

    return `${minutes}:${remainder}`;
  };

  const currentSource = () =>
    absoluteURL(
      room.src ||
      player.currentSrc ||
      player.src ||
      ''
    );

  const syncControls = () => {
    const activeSource = currentSource();

    allTracks().forEach(track => {
      const active =
        activeSource &&
        track.src === activeSource;

      const playing =
        active &&
        !player.paused &&
        !player.ended;

      track.card.classList.toggle(
        'is-playing',
        playing
      );

      track.play?.setAttribute(
        'aria-label',
        `${playing ? 'Pause' : 'Play'} ${track.title}`
      );

      if (!active) return;

      const ratio =
        player.duration > 0
          ? player.currentTime / player.duration
          : 0;

      const progress =
        Math.max(0, Math.min(1, ratio));

      if (track.seek) {
        track.seek.value =
          String(Math.round(progress * 1000));

        track.seek.style.setProperty(
          '--progress',
          `${progress * 100}%`
        );
      }

      if (track.current) {
        track.current.textContent =
          formatTime(player.currentTime);
      }

      if (track.duration) {
        track.duration.textContent =
          formatTime(player.duration);
      }
    });
  };

  // Prevent any disposable iframe-local audio
  // from continuing to play.
  cards.forEach(card => {
    card.querySelector('[data-audio]')?.pause();
  });

  /*
   * Capture phase is intentional.
   * It intercepts the click before portfolio.js's
   * existing local-audio handler receives it.
   */
  document.addEventListener(
    'click',
    async event => {
      const button =
        event.target.closest('[data-track-play]');

      if (!button) return;

      const track = trackFromElement(button);
      if (!track) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const sameTrack =
        currentSource() === track.src;

      if (
        sameTrack &&
        !player.paused &&
        !player.ended
      ) {
        player.pause();
        return;
      }

      if (!sameTrack) {
        player.pause();

        room.src = track.src;
        room.title = track.title;

        player.src = track.src;
        player.load();
      }

      if (player.ended) {
        player.currentTime = 0;
      }

      // Don't allow the persistent soundtrack and
      // Music-page track to play simultaneously.
      const soundtrack =
        host.document.querySelector(
          '[data-site-soundtrack]'
        );

      if (
        soundtrack &&
        !soundtrack.paused
      ) {
        soundtrack.pause();
      }

      try {
        await player.play();
      } catch (_) {}

      room.notify();
    },
    true
  );

  document.addEventListener(
    'input',
    event => {
      const seek =
        event.target.closest('[data-track-seek]');

      if (!seek) return;

      const track = trackFromElement(seek);

      if (
        !track ||
        currentSource() !== track.src ||
        !Number.isFinite(player.duration) ||
        player.duration <= 0
      ) {
        return;
      }

      event.stopImmediatePropagation();

      player.currentTime =
        (Number(seek.value) / 1000) *
        player.duration;

      room.notify();
    },
    true
  );

  room.subscribers.add(syncControls);

  window.addEventListener(
    'pagehide',
    () => {
      room.subscribers.delete(syncControls);
    },
    { once: true }
  );

  // If you come back to Music while a track
  // is already playing, reconnect immediately.
  syncControls();
})();