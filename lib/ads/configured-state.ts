let adsInitialized = false;

export function isAdsInitialized(): boolean {
  return adsInitialized;
}

export function markAdsInitialized(): void {
  adsInitialized = true;
}
