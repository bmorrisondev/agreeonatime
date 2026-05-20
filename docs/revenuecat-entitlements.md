# RevenueCat entitlements (DEV-431)

Agree on a Time uses a single RevenueCat entitlement for paid access:

| Constant | Value |
|----------|--------|
| Entitlement lookup id | `pro` |
| Display name (dashboard) | Pro |

Grant **Pro** when `CustomerInfo.entitlements.active.pro` is present (client) or when Convex `users.proExpiresAt > now` (server — see `feature/revenuecat-subscriptions` / follow-on tickets).

## Product ids (attach all to entitlement `pro`)

| Product id | Store | Notes |
|------------|-------|--------|
| `agreeonatime_pro_monthly_399` | Test Store / Web Billing | **Current** $3.99/mo |
| `me.brianmm.agreeonatime.pro.monthly` | App Store | iOS production |
| `agreeonatime_pro_monthly` | Test Store | **Legacy** $9.99 — archive when possible |

Canonical definitions:

- `lib/purchases/constants.ts`
- `convex/subscriptionLimits.ts`

## RevenueCat project

**Project id:** `projf3b630b9`  
**Dashboard:** https://app.revenuecat.com/projects/projf3b630b9

### Dashboard checklist

1. **Entitlements** → create or confirm **`pro`**.
2. **Product catalog** → ensure the three product ids above exist.
3. Attach each active Pro product to entitlement **`pro`**.
4. **Offerings** → `default` → package **`$rc_monthly`** → product **`agreeonatime_pro_monthly_399`** (not legacy `agreeonatime_pro_monthly`).
5. Archive legacy Test Store product if still active.

### Client env (public keys)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | iOS `appl_…` (also used in `eas.json`) |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` | Alias for iOS |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_WEB` | Web Billing `rcb_…` or Test Store `test_…` |

Resolution: `lib/purchases/revenuecat-keys.ts`.

## npm scripts

| Script | Purpose |
|--------|---------|
| `pnpm run setup:revenuecat-verify` | API check: entitlement `pro`, products, `$rc_monthly` |
| `pnpm run setup:revenuecat-web` | Web Billing app + attach web products to `pro` |
| `pnpm run setup:revenuecat-archive-legacy-test` | Archive legacy $9.99 Test Store sku |

All setup/verify scripts require:

```bash
export REVENUECAT_API_V2_SECRET=sk_...  # RevenueCat → Project → API keys → Secret v2
```

## Client usage

```ts
import { PRO_ENTITLEMENT_ID, isProFromCustomerInfo } from '@/lib/purchases';
import { useEntitlement } from '@/hooks/use-entitlement';

// Hook: SDK CustomerInfo → active pro entitlement
const { isPro, isLoaded, refresh } = useEntitlement();
```

`RevenueCatInit` configures the SDK on iOS + web; `RevenueCatIdentify` calls `Purchases.logIn` with the Better Auth user id.

## Related work

- **DEV-393** — SDK wiring (done on `main`)
- **DEV-432+** — Paywall, Convex webhook sync, free-tier limits (`feature/revenuecat-subscriptions`)
- Full subscription runbook: `docs/subscriptions-revenuecat.md` (on subscriptions feature branch)
