/*
  Partyzra Analytics — V2.4 privacy + low-priority dispatch

  This file replaces only js/analytics.js on the GitHub Pages portfolio.
  Cloudflare Worker, dashboard, D1 schema, and analytics-config.js stay unchanged.

  Personal browser opt-out (saved in localStorage):
    https://partyzra.github.io/?analytics=off   STOP tracking this browser
    https://partyzra.github.io/?analytics=on    RESUME tracking this browser

  This setting is per browser profile, not per IP/device/network. It never
  needs or stores an IP address, MAC address, or browser fingerprint.
*/
(() => {
  'use strict';

  const config = window.PORTFOLIO_ANALYTICS_CONFIG || {};
  const endpoint = String(config.endpoint || '').trim();
  const enabled = config.provider === 'partyzra-custom' && /^https:\/\//i.test(endpoint);
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(location.hostname)
    || location.protocol === 'file:';
  const optOutKey = 'partyzra_analytics_opt_out';
  const sessionKey = 'partyzra_analytics_session';
  const version = '2.4.0';

  // The public shell (index.html, photography.html, music.html) contains an
  // iframe. Look at the shell's query string so the opt-out links work from
  // the real visitor-facing URL, even though analytics runs in the iframe.
  const queryPreference = () => {
    try {
      const ownMode = new URLSearchParams(location.search).get('analytics');
      let shellMode = null;
      if (window.parent && window.parent !== window
          && window.parent.location.origin === location.origin) {
        shellMode = new URLSearchParams(window.parent.location.search).get('analytics');
      }
      const mode = String(shellMode || ownMode || '').trim().toLowerCase();
      return mode === 'off' || mode === 'on' ? mode : null;
    } catch (_) {
      return null;
    }
  };

  const preference = queryPreference();
  if (preference) {
    try {
      if (preference === 'off') localStorage.setItem(optOutKey, '1');
      else localStorage.removeItem(optOutKey);
    } catch (_) {
      // If browser storage is disabled, the URL preference still applies
      // while the URL is present. Persistence across future visits cannot
      // be guaranteed without browser storage.
    }
  }

  const isOptedOut = () => {
    // The outer shell decides privacy before it starts loading this iframe.
    // Honor that decision even when localStorage is unavailable.
    try {
      if (window.parent !== window && window.parent.PartyzraPrivacy?.optedOut === true) return true;
    } catch (_) {}
    if (preference === 'off') return true;
    if (preference === 'on') return false;
    try { return localStorage.getItem(optOutKey) === '1'; }
    catch (_) { return false; }
  };

  const logicalPage = () => {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!file || file === 'index.html' || file === 'home.html') return { path: '/home', title: 'Home' };
    if (file === 'photography-content.html' || file === 'photography.html') return { path: '/photography', title: 'Photography' };
    if (file === 'music-content.html' || file === 'music.html') return { path: '/music', title: 'Music' };
    return { path: location.pathname || '/', title: document.title || 'Portfolio' };
  };

  const cleanText = (value, max = 180) => String(value || '').trim().slice(0, max);

  const getSessionId = () => {
    try {
      let value = sessionStorage.getItem(sessionKey);
      if (!value) {
        value = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
          .replace(/[^a-zA-Z0-9-]/g, '')
          .slice(0, 64);
        sessionStorage.setItem(sessionKey, value);
      }
      return value;
    } catch (_) {
      return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  };

  const externalReferrer = () => {
    // Prefer the outside referrer, not the URL of the site's own shell iframe.
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        return cleanText(window.parent.document.referrer || document.referrer, 500);
      }
    } catch (_) {}
    return cleanText(document.referrer, 500);
  };

  // Defer the small analytics requests until after image/viewer work has had
  // a chance to run. Tracking never blocks a photo opening or page navigation.
  // The existing Worker expects one POST per event, so do not change its API.
  const pending = [];
  let delayTimer = null;
  let idleHandle = null;

  const dispatch = details => {
    const payload = {
      ...details,
      session_id: getSessionId()
    };

    // text/plain keeps the cross-origin request simple (no CORS preflight).
    // keepalive allows the browser to finish an in-flight request on navigation.
    try {
      fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (_) {}
  };

  const flush = () => {
    delayTimer = null;
    idleHandle = null;
    if (!enabled || (isLocal && !config.trackLocal) || isOptedOut()) {
      pending.length = 0;
      return;
    }
    for (const event of pending.splice(0)) dispatch(event);
  };

  const flushOnExit = () => {
    if (delayTimer !== null) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleHandle);
      idleHandle = null;
    }
    flush();
  };

  const schedule = () => {
    if (delayTimer !== null || idleHandle !== null) return;
    delayTimer = setTimeout(() => {
      delayTimer = null;
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(flush, { timeout: 1200 });
      } else {
        // Fallback for browsers without requestIdleCallback.
        delayTimer = setTimeout(flush, 0);
      }
    }, 300);
  };

  const send = (eventType, { page = '', item = '', label = '' } = {}) => {
    if (!enabled || (isLocal && !config.trackLocal) || isOptedOut()) return;

    pending.push({
      event_type: cleanText(eventType, 40),
      page: cleanText(page, 180),
      item: cleanText(item, 240),
      label: cleanText(label, 240),
      referrer: externalReferrer()
    });

    if (document.visibilityState === 'hidden') flushOnExit();
    else schedule();
  };

  window.PortfolioAnalytics = {
    version,
    get enabled() {
      return enabled && !(isLocal && !config.trackLocal) && !isOptedOut();
    },
    get optedOut() { return isOptedOut(); },

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

  if (!enabled || (isLocal && !config.trackLocal) || isOptedOut()) return;

  // Flush pending events when leaving an iframe or hiding the page, without
  // synchronous requests or unload handlers that can hurt navigation speed.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnExit();
  });
  window.addEventListener('pagehide', flushOnExit);

  const page = logicalPage();
  send('page_view', { page: page.path, label: page.title });
})();
