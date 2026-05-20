#!/usr/bin/env node
/**
 * Creates Pro annual SKUs in RevenueCat (Test Store, Web Billing, App Store catalog)
 * and wires $rc_annual on offering default + entitlement pro.
 *
 * Requires REVENUECAT_API_V2_SECRET (write-enabled API v2 secret).
 *
 *   REVENUECAT_API_V2_SECRET=sk_... node scripts/setup-revenuecat-annual-skus.mjs
 */

const PROJECT_ID = 'projf3b630b9';
const ENTITLEMENT_ID = 'entl4ab2abb7cd';
const OFFERING_LOOKUP = 'default';
const ANNUAL_PACKAGE_LOOKUP = '$rc_annual';

const PRO_ANNUAL_STORE_PRODUCT_ID = 'agreeonatime_pro_annual_3999';
const PRO_ANNUAL_IOS_PRODUCT_ID = 'me.brianmm.agreeonatime.pro.annual';

const API_BASE = 'https://api.revenuecat.com/v2';

const secret = process.env.REVENUECAT_API_V2_SECRET?.trim();
if (secret == null || secret.length === 0) {
  console.error(
    'Set REVENUECAT_API_V2_SECRET (RevenueCat → Project → API keys → Secret API key v2, write access).',
  );
  process.exit(1);
}

/** Fail fast with actionable auth hints before mutating catalog state. */
async function assertApiKeyWorks() {
  const res = await fetch(`${API_BASE}/projects/${PROJECT_ID}/apps?limit=1`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  let body;
  try {
    body = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (res.ok) {
    return;
  }
  const msg =
    typeof body === 'object' && body != null && 'message' in body
      ? String(body.message)
      : text;

  console.error(`RevenueCat API auth failed (${res.status}): ${msg}\n`);

  if (res.status === 403 && String(msg).includes('legacy API key')) {
    console.error(
      'This is the v1 secret (Convex REVENUECAT_SECRET_API_KEY). Create a new key:',
      'https://app.revenuecat.com/projects/projf3b630b9/api-keys',
      '→ + New secret API key → choose API v2 with write access.',
    );
  } else if (res.status === 401) {
    console.error(
      'Invalid or revoked secret. Common causes:',
      '• Copied the public SDK key (appl_… / rcb_…) instead of a secret (sk_…)',
      '• Typo or truncated paste in ~/.zshrc',
      '• Key from a different RevenueCat project',
      '\nCreate a fresh v2 secret:',
      'https://app.revenuecat.com/projects/projf3b630b9/api-keys',
    );
  }

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
    const err = new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function listAll(path) {
  const items = [];
  let next = path;
  while (next != null) {
    const page = await rc(next);
    items.push(...(page?.items ?? []));
    const rel = page?.next_page;
    next = rel != null && String(rel).length > 0 ? rel : null;
  }
  return items;
}

async function findOrCreateProduct(appId, storeIdentifier, displayName) {
  const products = await listAll(`/projects/${PROJECT_ID}/products?app_id=${appId}&limit=100`);
  const existing = products.find((p) => p.store_identifier === storeIdentifier);
  if (existing != null) {
    console.log(`  ✓ product exists: ${storeIdentifier} (${existing.id})`);
    return existing.id;
  }

  try {
    const created = await rc(`/projects/${PROJECT_ID}/products`, {
      method: 'POST',
      body: JSON.stringify({
        store_identifier: storeIdentifier,
        app_id: appId,
        type: 'subscription',
        display_name: displayName,
      }),
    });
    console.log(`  + created product: ${storeIdentifier} (${created.id})`);
    return created.id;
  } catch (err) {
    if (err.status === 403) {
      console.warn(
        `  ! API cannot create ${storeIdentifier} for app ${appId} — create in dashboard (Web Billing often 403).`,
      );
      return null;
    }
    throw err;
  }
}

async function attachToEntitlement(productIds) {
  const ids = productIds.filter((id) => id != null);
  if (ids.length === 0) {
    return;
  }
  await rc(`/projects/${PROJECT_ID}/entitlements/${ENTITLEMENT_ID}/actions/attach_products`, {
    method: 'POST',
    body: JSON.stringify({ product_ids: ids }),
  });
  console.log(`  ✓ attached ${ids.length} product(s) to entitlement pro`);
}

async function attachToPackage(packageId, productIds) {
  const ids = productIds.filter((id) => id != null);
  if (ids.length === 0 || packageId == null) {
    return;
  }
  await rc(`/projects/${PROJECT_ID}/packages/${packageId}/actions/attach_products`, {
    method: 'POST',
    body: JSON.stringify({
      products: ids.map((product_id) => ({ product_id, eligibility_criteria: 'all' })),
    }),
  });
  console.log(`  ✓ attached ${ids.length} product(s) to package ${ANNUAL_PACKAGE_LOOKUP}`);
}

async function main() {
  console.log('RevenueCat annual SKU setup (DEV-432)\n');

  await assertApiKeyWorks();

  const apps = await listAll(`/projects/${PROJECT_ID}/apps`);
  const iosApp = apps.find((a) => a.type === 'app_store') ?? null;
  const webApp = apps.find((a) => a.type === 'rc_billing') ?? null;
  const testStoreApp =
    apps.find((a) => a.type === 'test_store') ??
    apps.find((a) => a.name?.toLowerCase().includes('test store')) ??
    null;

  console.log('Apps:');
  for (const a of apps) {
    console.log(`  - ${a.id} (${a.type}) ${a.name ?? ''}`);
  }

  const productIds = [];

  if (iosApp != null) {
    console.log('\niOS App Store product:');
    productIds.push(
      await findOrCreateProduct(
        iosApp.id,
        PRO_ANNUAL_IOS_PRODUCT_ID,
        'Agree Pro Annual',
      ),
    );
  } else {
    console.warn('\nNo app_store app found — add iOS app in RevenueCat first.');
  }

  if (testStoreApp != null) {
    console.log('\nTest Store product:');
    productIds.push(
      await findOrCreateProduct(
        testStoreApp.id,
        PRO_ANNUAL_STORE_PRODUCT_ID,
        'Agree Pro Annual ($39.99/yr)',
      ),
    );
  } else {
    console.log('\nNo dedicated Test Store app — skipping Test Store SKU (web may cover dev).');
  }

  if (webApp != null) {
    console.log('\nWeb Billing product:');
    productIds.push(
      await findOrCreateProduct(
        webApp.id,
        PRO_ANNUAL_STORE_PRODUCT_ID,
        'Agree Pro Annual ($39.99/yr)',
      ),
    );
  } else {
    console.warn('\nNo rc_billing app — run pnpm run setup:revenuecat-web first.');
  }

  const offerings = await listAll(`/projects/${PROJECT_ID}/offerings`);
  const offering =
    offerings.find((o) => o.is_current === true) ??
    offerings.find((o) => o.lookup_key === OFFERING_LOOKUP) ??
    offerings[0] ??
    null;

  if (offering == null) {
    console.error('\nNo offering found — create offering "default" in dashboard.');
    process.exit(1);
  }

  console.log(`\nOffering: ${offering.lookup_key} (${offering.id})`);

  const packages = await listAll(
    `/projects/${PROJECT_ID}/offerings/${offering.id}/packages?limit=50`,
  );
  let annualPkg =
    packages.find((p) => p.lookup_key === ANNUAL_PACKAGE_LOOKUP) ??
    packages.find((p) => p.lookup_key === 'annual') ??
    null;

  if (annualPkg == null) {
    console.log(`\nCreating package ${ANNUAL_PACKAGE_LOOKUP}…`);
    annualPkg = await rc(`/projects/${PROJECT_ID}/offerings/${offering.id}/packages`, {
      method: 'POST',
      body: JSON.stringify({
        lookup_key: ANNUAL_PACKAGE_LOOKUP,
        display_name: 'Pro Yearly',
        position: 2,
      }),
    });
    console.log(`  + package ${annualPkg.id}`);
  } else {
    console.log(`\nPackage ${ANNUAL_PACKAGE_LOOKUP} already exists (${annualPkg.id})`);
  }

  console.log('\nLinking products…');
  await attachToEntitlement(productIds);
  await attachToPackage(annualPkg.id, productIds);

  console.log('\nDone. Next steps for you:');
  console.log(`  • App Store Connect: subscription ${PRO_ANNUAL_IOS_PRODUCT_ID} @ $39.99/yr`);
  console.log(`  • RevenueCat → attach App Store product to ${PRO_ANNUAL_IOS_PRODUCT_ID} if needed`);
  console.log('  • Restart app / invalidate offerings cache and test paywall yearly option');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
