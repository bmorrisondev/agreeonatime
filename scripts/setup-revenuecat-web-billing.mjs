#!/usr/bin/env node
/**
 * Creates RevenueCat Web Billing (rc_billing) app and prints the public web SDK key.
 * Requires REVENUECAT_API_V2_SECRET (API v2 secret from RevenueCat → Project → API keys).
 *
 * Usage:
 *   REVENUECAT_API_V2_SECRET=sk_... node scripts/setup-revenuecat-web-billing.mjs
 */

const PROJECT_ID = 'projf3b630b9';
const ENTITLEMENT_ID = 'entl4ab2abb7cd';
const PACKAGE_ID = 'pkge8bbafa1cbc';
const API_BASE = 'https://api.revenuecat.com/v2';
/** Match iOS App Store US price for Pro Monthly. */
const PRO_MONTHLY_USD = '$3.99';

const secret = process.env.REVENUECAT_API_V2_SECRET?.trim();
if (secret == null || secret.length === 0) {
  console.error(
    'Set REVENUECAT_API_V2_SECRET (RevenueCat dashboard → Project → API keys → Secret API key v2).',
  );
  process.exit(1);
}

async function rc(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' && body != null && 'message' in body
        ? String(body.message)
        : text;
    throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${msg}`);
  }
  return body;
}

async function findWebApp() {
  const list = await rc(`/projects/${PROJECT_ID}/apps`);
  const items = list?.items ?? [];
  return items.find((a) => a.type === 'rc_billing') ?? null;
}

async function createWebApp() {
  return rc(`/projects/${PROJECT_ID}/apps`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Agree On A Time (Web)',
      type: 'rc_billing',
      rc_billing: { app_name: 'Agree On A Time', default_currency: 'USD' },
    }),
  });
}

async function getPublicKeys(appId) {
  return rc(`/projects/${PROJECT_ID}/apps/${appId}/public_api_keys`);
}

async function attachProductToEntitlement(productId) {
  return rc(
    `/projects/${PROJECT_ID}/entitlements/${ENTITLEMENT_ID}/actions/attach_products`,
    {
      method: 'POST',
      body: JSON.stringify({ product_ids: [productId] }),
    },
  );
}

async function attachProductToPackage(productId) {
  return rc(`/projects/${PROJECT_ID}/packages/${PACKAGE_ID}/actions/attach_products`, {
    method: 'POST',
    body: JSON.stringify({
      products: [{ product_id: productId, eligibility_criteria: 'all' }],
    }),
  });
}

async function main() {
  console.log('RevenueCat Web Billing setup for Agree On A Time\n');

  let webApp = await findWebApp();
  if (webApp == null) {
    console.log('Creating Web Billing app…');
    webApp = await createWebApp();
    console.log(`Created app ${webApp.id} (${webApp.name})`);
  } else {
    console.log(`Web Billing app already exists: ${webApp.id} (${webApp.name})`);
  }

  const keys = await getPublicKeys(webApp.id);
  const keyRows = keys?.items ?? [];
  const productionKey =
    keyRows.find((k) => k.environment === 'production' && k.key?.startsWith('rcb_')) ??
    keyRows.find((k) => k.key?.startsWith('rcb_')) ??
    keyRows[0];

  if (productionKey?.key == null) {
    console.warn('\nNo public web SDK key yet. Finish Web Billing config in the dashboard.');
  } else {
    console.log('\n── Web public SDK key (set as EXPO_PUBLIC_REVENUECAT_API_KEY_WEB) ──');
    console.log(productionKey.key);
    console.log('\nVercel (from repo root):');
    console.log(
      `  printf '%s' '${productionKey.key}' | vercel env add EXPO_PUBLIC_REVENUECAT_API_KEY_WEB production --force`,
    );
    console.log(
      `  printf '%s' '${productionKey.key}' | vercel env add EXPO_PUBLIC_REVENUECAT_API_KEY_WEB preview --force`,
    );
  }

  const products = await rc(`/projects/${PROJECT_ID}/products?app_id=${webApp.id}`);
  const webProducts = (products?.items ?? []).filter((p) => p.app_id === webApp.id);

  if (webProducts.length === 0) {
    console.log('\n── Web Billing product (dashboard only — API/MCP cannot create) ──');
    console.log(
      'https://app.revenuecat.com/projects/projf3b630b9/product-catalog/products',
    );
    console.log('Under "Agree On A Time (Web)" → + New:');
    console.log('  Identifier: agreeonatime_pro_monthly');
    console.log('  Type: Auto-renewing subscription · Duration: 1 month');
    console.log(`  USD price: ${PRO_MONTHLY_USD} (match iOS)`);
    console.log('  Entitlement: pro');
    console.log('Then re-run: pnpm run setup:revenuecat-web');
  } else {
    console.log(`\nFound ${webProducts.length} web product(s):`);
    for (const p of webProducts) {
      console.log(`  - ${p.id} (${p.display_name ?? p.store_identifier})`);
      try {
        await attachProductToEntitlement(p.id);
        await attachProductToPackage(p.id);
        console.log('    Attached to entitlement "pro" and package "$rc_monthly".');
      } catch (err) {
        console.warn(`    Attach skipped: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  console.log('\nConvex: set REVENUECAT_SECRET_API_KEY (v1 secret) for server sync if not set yet.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
