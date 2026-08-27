(() => {
  const inShell = window.parent !== window;
  const isPhotographyContent = document.body.classList.contains('photo-page');

  // These content documents are implementation details. If one is opened
  // directly, return the visitor to the corresponding public shell page.
  if (!inShell) {
    const target = isPhotographyContent ? 'photography.html' : 'index.html';
    window.location.replace(`${target}${window.location.hash || ''}`);
    return;
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.target === '_blank') return;

    const rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (_) {
      return;
    }

    if (url.origin !== window.location.origin && window.location.protocol !== 'file:') return;

    const file = url.pathname.split('/').pop().toLowerCase();

    const requestShellNavigation = route => {
      const hash = url.hash || '';

      // Home and Photography are same-origin inside the persistent shell, so
      // direct parent navigation is the most reliable route. Keep postMessage
      // as a fallback for environments that block direct frame access.
      try {
        if (typeof window.parent.__portfolioNavigate === 'function') {
          window.parent.__portfolioNavigate(route, hash);
          return;
        }
      } catch (_) {}

      window.parent.postMessage({ type: 'portfolio:navigate', route, hash }, '*');
    };

    if (file === 'photography.html') {
      event.preventDefault();
      requestShellNavigation('photography');
      return;
    }

    if (file === 'index.html' || file === '') {
      event.preventDefault();
      requestShellNavigation('home');
      return;
    }

    // Other full pages (for example Music) intentionally leave the shell.
    // The continuous soundtrack requirement is scoped to Home + Photography.
    if (file === 'music.html') {
      event.preventDefault();
      window.top.location.href = link.href;
    }
  });
})();
