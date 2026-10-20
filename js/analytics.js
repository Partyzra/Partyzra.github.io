(() => {
  'use strict';

  const config = window.PORTFOLIO_ANALYTICS_CONFIG || {};
  const endpoint = String(config.endpoint || '').trim();
  const enabled = config.provider === 'partyzra-custom' && /^https:\/\//i.test(endpoint);
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(location.hostname)
    || location.protocol === 'file:';

  const logicalPage = () => {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!file || file === 'index.html' || file === 'home.html') return { path: '/home', title: 'Home' };
    if (file === 'photography-content.html' || file === 'photography.html') return { path: '/photography', title: 'Photography' };
    if (file === 'music-content.html' || file === 'music.html') return { path: '/music', title: 'Music' };
    return { path: location.pathname || '/', title: document.title || 'Portfolio' };
  };

  const cleanText = (value, max = 180) => String(value || '').trim().slice(0, max);

  const getSessionId = () => {
    const key = 'partyzra_analytics_session';
    try {
      let value = sessionStorage.getItem(key);
      if (!value) {
        value = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
          .replace(/[^a-zA-Z0-9-]/g, '')
          .slice(0, 64);
        sessionStorage.setItem(key, value);
      }
      return value;
    } catch (_) {
      return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  };

  const externalReferrer = () => {
    // The visual pages live inside same-origin iframes so the iframe's own
    // document.referrer is normally just the shell page. Prefer the shell's
    // incoming referrer when we can read it.
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        return cleanText(window.parent.document.referrer || document.referrer, 500);
      }
    } catch (_) {}
    return cleanText(document.referrer, 500);
  };

  const sessionId = getSessionId();

  const send = (eventType, { page = '', item = '', label = '' } = {}) => {
    if (!enabled || (isLocal && !config.trackLocal)) return;

    const payload = {
      event_type: cleanText(eventType, 40),
      page: cleanText(page, 180),
      item: cleanText(item, 240),
      label: cleanText(label, 240),
      referrer: externalReferrer(),
      session_id: sessionId
    };

    // text/plain keeps this a simple cross-origin request (no preflight), while
    // the Worker still parses the body as JSON. keepalive lets a final event
    // finish even if the visitor navigates immediately afterward.
    fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  };

  window.PortfolioAnalytics = {
    enabled,

    trackPhotoView({ file = '', title = '', variantIndex = 0 } = {}) {
      const page = logicalPage();
      const frameSuffix = variantIndex > 0
        ? ` — Frame ${String(variantIndex + 1).padStart(2, '0')}`
        : '';
      send('photo_view', {
        page: page.path,
        item: file || title || 'untitled',
        label: `${title || file || 'Untitled'}${frameSuffix}`
      });
    },

    trackEvent(name, title = '') {
      const page = logicalPage();
      send('custom_event', {
        page: page.path,
        item: name,
        label: title || name
      });
    }
  };

  if (!enabled || (isLocal && !config.trackLocal)) return;

  const page = logicalPage();
  send('page_view', {
    page: page.path,
    label: page.title
  });
})();
