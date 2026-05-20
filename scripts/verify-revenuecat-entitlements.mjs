#!/usr/bin/env node
/**
 * Verifies RevenueCat entitlement + product wiring for Agree on a Time (DEV-431).
 *
 *   REVENUECAT_API_V2_SECRET=sk_... node scripts/verify-revenuecat-entitlements.mjs
 */

const PROJECT_ID = 'projf3b630b9';
const PRO_ENTITLEMENT_LOOKUP = 'pro';
const EXPECTED_PRODUCT_LOOKUPS = [
  'agreeonatime_pro_monthly_399',
  'me.brianmm.agreeonatime.pro.monthly',
];
const API_BASE = 'https://api.revenuecat.com/v2';

const secret = process.env.REVENUECAT_API_V2_SECRET?.trim();
if (secret == null || secret.length === 0) {
  console.error(
    'Set REVENUECAT_API_V2_SECRET (RevenueCat → Project → API keys → Secret API key v2).',
  );
  process.exit(1);
}

async function rc(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
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
    throw new Error(`GET ${path} → ${res.status}: ${msg}`);
  }
  return body;
}

function lookupOf(entity) {
  return entity?.lookup_key ?? entity?.identifier ?? entity?.id ?? '(unknown)';
}

async function main() {
  console.log('RevenueCat entitlement verification (DEV-431)\n');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Expected entitlement lookup: ${PRO_ENTITLEMENT_LOOKUP}\n`);

  const entitlements = await rc(`/projects/${PROJECT_ID}/entitlements`);
  const entitlementItems = entitlements?.items ?? [];
  const proEntitlement = entitlementItems.find((e) => lookupOf(e) === PRO_ENTITLEMENT_LOOKUP);

  if (proEntitlement == null) {
    console.error(`✗ Entitlement "${PRO_ENTITLEMENT_LOOKUP}" not found.`);
    console.error('  Create it in RevenueCat → Product catalog → Entitlements.');
    process.exit(1);
  }

  console.log(`✓ Entitlement "${PRO_ENTITLEMENT_LOOKUP}" exists (id: ${proEntitlement.id})`);

  const attached = await rc(
    `/projects/${PROJECT_ID}/entitlements/${proEntitlement.id}/products`,
  );
  const attachedItems = attached?.items ?? [];
  const attachedLookups = attachedItems.map((p) => lookupOf(p));

  console.log(`\nProducts attached to "${PRO_ENTITLEMENT_LOOKUP}" (${attachedItems.length}):`);
  for (const p of attachedItems) {
    console.log(`  - ${lookupOf(p)} (${p.id})`);
  }

  let ok = true;
  for (const expected of EXPECTED_PRODUCT_LOOKUPS) {
    if (!attachedLookups.includes(expected)) {
      console.warn(`\n⚠ Missing expected product on entitlement: ${expected}`);
      ok = false;
    }
  }

  const products = await rc(`/projects/${PROJECT_ID}/products`);
  const productItems = products?.items ?? [];
  const legacy = productItems.find((p) => lookupOf(p) === 'agreeonatime_pro_monthly');
  if (legacy != null && legacy.state !== 'archived') {
    console.warn(
      '\n⚠ Legacy Test Store product agreeonatime_pro_monthly is still active — run:',
    );
    console.warn('  pnpm run setup:revenuecat-archive-legacy-test');
    ok = false;
  }

  const offerings = await rc(`/projects/${PROJECT_ID}/offerings`);
  const defaultOffering =
    (offerings?.items ?? []).find((o) => lookupOf(o) === 'default') ?? offerings?.items?.[0];
  if (defaultOffering != null) {
    const packages = await rc(
      `/projects/${PROJECT_ID}/offerings/${defaultOffering.id}/packages`,
    );
    const monthly =
      (packages?.items ?? []).find((p) => lookupOf(p) === '$rc_monthly') ?? packages?.items?.[0];
    if (monthly != null) {
      const pkgProducts = await rc(
        `/projects/${PROJECT_ID}/packages/${monthly.id}/products`,
      );
      const pkgLookups = (pkgProducts?.items ?? []).map((p) => lookupOf(p));
      console.log(`\nOffering "${lookupOf(defaultOffering)}" package "${lookupOf(monthly)}" products:`);
      for (const lookup of pkgLookups) {
        console.log(`  - ${lookup}`);
      }
      if (!pkgLookups.includes('agreeonatime_pro_monthly_399')) {
        console.warn(
          '\n⚠ Package $rc_monthly should reference agreeonatime_pro_monthly_399 ($3.99).',
        );
        ok = false;
      }
    }
  }

  console.log('\nCode constants (keep in sync):');
  console.log('  lib/purchases/constants.ts → PRO_ENTITLEMENT_ID, PRO_PRODUCT_IDS');
  console.log('  convex/subscriptionLimits.ts → PRO_ENTITLEMENT_ID, PRO_PRODUCT_IDS');

  if (!ok) {
    console.error('\n✗ Verification found issues — see docs/revenuecat-entitlements.md');
    process.exit(1);
  }

  console.log('\n✓ Entitlement configuration looks correct.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
