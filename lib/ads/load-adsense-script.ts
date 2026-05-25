declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

let loadPromise: Promise<void> | null = null;
let loadedClientId: string | null = null;

/** Loads the AdSense script once per page (web only). */
export function loadAdSenseScript(clientId: string): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  if (loadPromise != null && loadedClientId === clientId) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    );
    if (existing != null) {
      loadedClientId = clientId;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
    script.setAttribute('data-ad-client', clientId);
    script.onload = () => {
      loadedClientId = clientId;
      resolve();
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('[AdSense] failed to load adsbygoogle.js'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Registers a newly mounted `<ins class="adsbygoogle">` with the AdSense loader. */
export function pushAdSenseSlot(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.adsbygoogle = window.adsbygoogle ?? [];
    window.adsbygoogle.push({});
  } catch (error: unknown) {
    console.warn('[AdSense] adsbygoogle.push failed', error);
  }
}
