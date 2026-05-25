let shownThisSession = false;

export function hasShownInterstitialThisSession(): boolean {
  return shownThisSession;
}

export function markInterstitialShownThisSession(): void {
  shownThisSession = true;
}
