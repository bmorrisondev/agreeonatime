/**
 * True when the page runs in Mobile Safari (not Chrome/Firefox on iOS, not desktop).
 * Used to gate web → native vote redirects.
 */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const isIosDevice =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|OPiOS/i.test(ua);
  return isIosDevice && isSafari;
}
