/**
 * Fit the app to the visible area while the on-screen keyboard is open.
 *
 * Chrome on Android honors `interactive-widget=resizes-content` in the viewport meta tag and
 * shrinks the layout by itself. Safari on iOS only shrinks the visual viewport and pans the page,
 * so the height is mirrored into `--app-h` and the pan is undone.
 */
export function trackVisualViewport(): void {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  const sync = () => {
    const keyboard = window.innerHeight - vv.height > 80;
    if (keyboard) {
      root.style.setProperty('--app-h', `${vv.height}px`);
      if (window.scrollY) window.scrollTo(0, 0);
    } else {
      root.style.removeProperty('--app-h');
    }
  };
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
}
