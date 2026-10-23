
(() => {
  'use strict';

  const grid = document.querySelector('#photoGrid');
  if (!grid) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MAX_ACTIVE = 3;

  let layer = null;
  let active = 0;
  let nextTimer = 0;
  let resizeTimer = 0;
  let running = false;

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = items => items[Math.floor(Math.random() * items.length)];

  function ensureLayer() {
    if (layer?.isConnected) return layer;

    // Remove any orphaned instance from a prior reload/setup.
    grid.querySelectorAll('.photo-grid-neural-energy').forEach(el => el.remove());

    layer = document.createElement('span');
    layer.className = 'photo-grid-neural-energy';
    layer.setAttribute('aria-hidden', 'true');
    grid.appendChild(layer);
    return layer;
  }

  function geometry() {
    const items = [...grid.querySelectorAll('.photo-grid-item')];
    if (items.length < 2) return null;

    const gridRect = grid.getBoundingClientRect();
    if (gridRect.width < 20 || gridRect.height < 20) return null;

    const rects = items.map(item => {
      const rect = item.getBoundingClientRect();
      return {
        left: rect.left - gridRect.left,
        right: rect.right - gridRect.left,
        top: rect.top - gridRect.top,
        bottom: rect.bottom - gridRect.top
      };
    });

    // Group by visual row.
    const rows = [];
    rects
      .slice()
      .sort((a, b) => a.top - b.top || a.left - b.left)
      .forEach(rect => {
        let row = rows.find(r => Math.abs(r.top - rect.top) < 3);
        if (!row) {
          row = { top: rect.top, bottom: rect.bottom, items: [] };
          rows.push(row);
        }
        row.items.push(rect);
        row.bottom = Math.max(row.bottom, rect.bottom);
      });

    rows.forEach(row => row.items.sort((a, b) => a.left - b.left));
    rows.sort((a, b) => a.top - b.top);

    const horizontal = [];
    for (let i = 0; i < rows.length - 1; i += 1) {
      const a = rows[i];
      const b = rows[i + 1];
      const gap = b.top - a.bottom;
      if (gap >= 2) {
        horizontal.push({
          left: 0,
          top: a.bottom,
          width: gridRect.width,
          height: gap
        });
      }
    }

    // Find vertical gutter centers from every row, then merge duplicates.
    const verticalRaw = [];
    rows.forEach(row => {
      for (let i = 0; i < row.items.length - 1; i += 1) {
        const a = row.items[i];
        const b = row.items[i + 1];
        const gap = b.left - a.right;
        if (gap >= 2) {
          verticalRaw.push({
            center: a.right + gap / 2,
            width: gap
          });
        }
      }
    });

    const vertical = [];
    verticalRaw.forEach(candidate => {
      let existing = vertical.find(v => Math.abs(v.center - candidate.center) < 3);
      if (!existing) {
        existing = { center: candidate.center, width: candidate.width };
        vertical.push(existing);
      } else {
        existing.center = (existing.center + candidate.center) / 2;
        existing.width = Math.min(existing.width, candidate.width);
      }
    });

    return {
      width: gridRect.width,
      height: gridRect.height,
      horizontal,
      vertical: vertical.map(v => ({
        left: v.center - v.width / 2,
        top: 0,
        width: v.width,
        height: gridRect.height
      }))
    };
  }

  function makeChannel(rect) {
    const channel = document.createElement('span');
    channel.className = 'photo-grid-neural-channel';
    channel.style.left = `${rect.left}px`;
    channel.style.top = `${rect.top}px`;
    channel.style.width = `${rect.width}px`;
    channel.style.height = `${rect.height}px`;
    ensureLayer().appendChild(channel);
    return channel;
  }

  function spawnPulse() {
    if (reduceMotion.matches || active >= MAX_ACTIVE) return;

    const g = geometry();
    if (!g) return;

    const possible = [];
    if (g.horizontal.length) possible.push('horizontal');
    if (g.vertical.length) possible.push('vertical');
    if (!possible.length) return;

    const orientation = pick(possible);
    const directionForward = Math.random() >= 0.5;
    const channelRect = pick(orientation === 'horizontal' ? g.horizontal : g.vertical);
    const channel = makeChannel(channelRect);

    const pulse = document.createElement('span');
    pulse.className =
      `photo-grid-neural-pulse is-${orientation} ${directionForward ? 'dir-forward' : 'dir-reverse'}`;

    // Most signals remain small and quiet. A minority are a little longer/brighter.
    const isLong = Math.random() < 0.22;
    const length = orientation === 'horizontal'
      ? rand(isLong ? 145 : 86, isLong ? 220 : 150)
      : rand(isLong ? 120 : 68, isLong ? 188 : 122);

    const thickness = Math.max(
      1,
      Math.min(
        isLong ? 2.1 : 1.55,
        (orientation === 'horizontal' ? channelRect.height : channelRect.width) * 0.32
      )
    );

    pulse.style.setProperty('--pulse-length', `${length}px`);
    pulse.style.setProperty('--pulse-thickness', `${thickness}px`);

    const intensity = rand(.72, 1);
    pulse.style.filter = `brightness(${intensity})`;

    channel.appendChild(pulse);
    active += 1;

    const travel = orientation === 'horizontal' ? channelRect.width : channelRect.height;
    const start = -length - 8;
    const end = travel + length + 8;

    const from = directionForward ? start : end;
    const to = directionForward ? end : start;

    // The beam emerges from darkness, becomes legible, then dissolves before
    // the movement ends — so it feels like a signal, not a moving decoration.
    const keyframes = orientation === 'horizontal'
      ? [
          { transform: `translate3d(${from}px,-50%,0) scaleX(.72)`, opacity: 0 },
          { opacity: .18, offset: .08 },
          { transform: `translate3d(${from + (to-from)*.18}px,-50%,0) scaleX(.92)`, opacity: .62, offset: .18 },
          { opacity: .88, offset: .43 },
          { opacity: .66, offset: .72 },
          { transform: `translate3d(${from + (to-from)*.90}px,-50%,0) scaleX(.88)`, opacity: .22, offset: .90 },
          { transform: `translate3d(${to}px,-50%,0) scaleX(.68)`, opacity: 0 }
        ]
      : [
          { transform: `translate3d(-50%,${from}px,0) scaleY(.72)`, opacity: 0 },
          { opacity: .18, offset: .08 },
          { transform: `translate3d(-50%,${from + (to-from)*.18}px,0) scaleY(.92)`, opacity: .62, offset: .18 },
          { opacity: .88, offset: .43 },
          { opacity: .66, offset: .72 },
          { transform: `translate3d(-50%,${from + (to-from)*.90}px,0) scaleY(.88)`, opacity: .22, offset: .90 },
          { transform: `translate3d(-50%,${to}px,0) scaleY(.68)`, opacity: 0 }
        ];

    const duration = orientation === 'horizontal'
      ? rand(4200, 7000)
      : rand(5200, 8400);

    const animation = pulse.animate(keyframes, {
      duration,
      easing: 'linear',
      fill: 'none'
    });

    animation.finished
      .catch(() => {})
      .finally(() => {
        channel.remove();
        active = Math.max(0, active - 1);
      });
  }

  function scheduleNext(initial = false) {
    window.clearTimeout(nextTimer);
    if (!running || reduceMotion.matches) return;

    // First signal appears quickly enough to confirm the effect is alive.
    const delay = initial ? 900 : rand(1700, 4800);

    nextTimer = window.setTimeout(() => {
      spawnPulse();

      // Sometimes a second pulse follows, but never predictably.
      if (Math.random() < 0.34 && active < MAX_ACTIVE) {
        window.setTimeout(() => spawnPulse(), rand(240, 1050));
      }

      // Very occasionally a third signal slips through.
      if (Math.random() < 0.10 && active < MAX_ACTIVE - 1) {
        window.setTimeout(() => spawnPulse(), rand(900, 1850));
      }

      scheduleNext(false);
    }, delay);
  }

  function start() {
    if (running || reduceMotion.matches) return;
    if (!geometry()) return;

    running = true;
    ensureLayer();
    scheduleNext(true);
  }

  function stop() {
    running = false;
    window.clearTimeout(nextTimer);
    nextTimer = 0;
    layer?.replaceChildren();
    active = 0;
  }

  function restart() {
    stop();
    layer?.remove();
    layer = null;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(start);
    });
  }

  // The gallery is rendered dynamically. Observe it instead of depending on
  // photography-page.js internals.
  const observer = new MutationObserver(() => {
    if (!running && grid.querySelector('.photo-grid-item')) start();
  });

  observer.observe(grid, { childList: true });

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(restart, 180);
  }, { passive: true });

  reduceMotion.addEventListener?.('change', () => {
    if (reduceMotion.matches) stop();
    else restart();
  });

  // Works whether the gallery was already rendered or renders a moment later.
  if (grid.querySelector('.photo-grid-item')) start();
})();
