(() => {
  'use strict';

  const config = window.PORTFOLIO_ANALYTICS_CONFIG || {};
  const rawCode = String(config.code || '').trim();
  const code = rawCode.replace(/^https?:\/\//i, '').replace(/\.goatcounter\.com.*$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
  const enabled = config.provider === 'goatcounter' && Boolean(code);
  const pending = [];
  let ready = false;

  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(location.hostname)
    || location.protocol === 'file:';

  const logicalPage = () => {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!file || file === 'index.html' || file === 'home.html') return { path: '/home', title: 'Home' };
    if (file === 'photography-content.html' || file === 'photography.html') return { path: '/photography', title: 'Photography' };
    if (file === 'music-content.html' || file === 'music.html') return { path: '/music', title: 'Music' };
    return { path: location.pathname || '/', title: document.title || 'Portfolio' };
  };

  const slug = value => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140) || 'untitled';

  const send = payload => {
    if (!enabled || (isLocal && !config.trackLocal)) return;
    if (!ready || !window.goatcounter?.count) {
      pending.push(payload);
      return;
    }
    window.goatcounter.count(payload);
  };

  const flush = () => {
    if (!window.goatcounter?.count) return;
    ready = true;
    while (pending.length) window.goatcounter.count(pending.shift());
  };

  window.PortfolioAnalytics = {
    enabled,

    trackPhotoView({ file = '', title = '', variantIndex = 0 } = {}) {
      const id = slug(file || title);
      send({
        path: `photo/${id}`,
        title: `Photo — ${title || file || id}${variantIndex > 0 ? ` (Frame ${String(variantIndex + 1).padStart(2, '0')})` : ''}`,
        event: true,
        no_session: true
      });
    },

    trackEvent(name, title = '') {
      send({
        path: `event/${slug(name)}`,
        title: title || name,
        event: true,
        no_session: true
      });
    }
  };

  if (!enabled || (isLocal && !config.trackLocal)) return;

  // We count manually so iframe-hosted content is represented by clean logical
  // paths (/home, /photography, /music) rather than implementation filenames.
  window.goatcounter = {
    no_onload: true,
    allow_frame: true,
    allow_local: Boolean(config.trackLocal)
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  script.addEventListener('load', () => {
    flush();
    const page = logicalPage();
    send({ path: page.path, title: page.title, event: false });
  });
  script.addEventListener('error', () => {
    ready = false;
  });
  document.head.appendChild(script);
})();
