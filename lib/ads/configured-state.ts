let configured = false;

export function isAdMobConfigured(): boolean {
  return configured;
}

export function markAdMobConfigured(): void {
  configured = true;
}
