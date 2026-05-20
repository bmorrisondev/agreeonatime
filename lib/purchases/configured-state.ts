let purchasesConfigured = false;

export function markPurchasesConfigured(): void {
  purchasesConfigured = true;
}

export function isPurchasesConfigured(): boolean {
  return purchasesConfigured;
}
