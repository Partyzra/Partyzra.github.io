(() => {
  // Portfolio media protection
  // --------------------------
  // This intentionally removes the easiest browser download paths (right-click,
  // image dragging, long-press callouts, and native video download controls).
  // It is a deterrent rather than DRM: anything delivered to a browser can still
  // be captured by a determined visitor via developer tools or screenshots.

  const PROTECTED_SELECTOR = [
    'img',
    'picture',
    'video',
    '.hero-v3',
    '.hero-photo',
    '.triptych-frame',
    '.film-motion-intro',
    '.photo-grid-item',
    '.photo-viewer-stage'
  ].join(', ');

  const MEDIA_SELECTOR = 'img, video';

  const protectedTarget = target => {
    if (!(target instanceof Element)) return null;
    return target.closest(PROTECTED_SELECTOR);
  };

  // Remove "Save image as…" / "Save video as…" from the normal right-click path.
  document.addEventListener('contextmenu', event => {
    if (!protectedTarget(event.target)) return;
    event.preventDefault();
  }, { capture: true });

  // Prevent dragging an image out of the browser or into another application.
  document.addEventListener('dragstart', event => {
    if (!protectedTarget(event.target)) return;
    event.preventDefault();
  }, { capture: true });

  const hardenMediaElement = element => {
    if (!(element instanceof Element) || !element.matches(MEDIA_SELECTOR)) return;

    element.setAttribute('draggable', 'false');

    if (element instanceof HTMLVideoElement) {
      element.setAttribute('controlsList', 'nodownload noremoteplayback');
      element.setAttribute('disablepictureinpicture', '');
      element.setAttribute('disableremoteplayback', '');
      element.disablePictureInPicture = true;
      try { element.disableRemotePlayback = true; } catch (_) {}
    }
  };

  const hardenTree = root => {
    if (!(root instanceof Element) && root !== document) return;
    if (root instanceof Element) hardenMediaElement(root);
    root.querySelectorAll?.(MEDIA_SELECTOR).forEach(hardenMediaElement);
  };

  // Existing media.
  hardenTree(document);

  // Gallery thumbnails and some hero layers are created dynamically, so apply
  // the same attributes to any media inserted later.
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) hardenTree(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
