let adsInitialized = false;

export function isAdsInitialized(): boolean {
  return adsInitialized;
}

export function markAdsInitialized(): void {
  adsInitialized = true;
}

/** DEV-451 alias — shares init guard with {@link isAdsInitialized}. */
export function isAdMobConfigured(): boolean {
  return isAdsInitialized();
}

export function markAdMobConfigured(): void {
  markAdsInitialized();
}
