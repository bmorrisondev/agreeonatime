#!/usr/bin/env node
/**
 * Archives the legacy $9.99 Test Store product (agreeonatime_pro_monthly).
 * After this, web Test Store checkout should use agreeonatime_pro_monthly_399 ($3.99).
 *
 *   REVENUECAT_API_V2_SECRET=sk_... node scripts/archive-revenuecat-legacy-test-product.mjs
 */

const PROJECT_ID = 'projf3b630b9';
const LEGACY_PRODUCT_ID = 'prodd9b5e8b35f';
const API_BASE = 'https://api.revenuecat.com/v2';

const secret = process.env.REVENUECAT_API_V2_SECRET?.trim();
if (secret == null || secret.length === 0) {
  console.error('Set REVENUECAT_API_V2_SECRET (RevenueCat → Project → API keys → Secret v2).');
  process.exit(1);
}

const res = await fetch(
  `${API_BASE}/projects/${PROJECT_ID}/products/${LEGACY_PRODUCT_ID}/archive`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  },
);

const text = await res.text();
if (!res.ok) {
  console.error(`Archive failed (${res.status}):`, text);
  process.exit(1);
}

console.log('Archived legacy Test Store product prodd9b5e8b35f (agreeonatime_pro_monthly @ $9.99).');
console.log('Restart the web app and subscribe again — expect agreeonatime_pro_monthly_399 @ $3.99.');
