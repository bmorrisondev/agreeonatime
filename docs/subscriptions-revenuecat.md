# Subscriptions (RevenueCat + Convex)

Agree on a Time uses **RevenueCat** for in-app purchases on **iOS** and **Expo web**, with **Convex** as the source of truth for server-side gating (create-event limits, eligibility queries).

## Plans

| Plan | Active events | Price |
|------|----------------|-------|
| **Free** | Up to **3** active events | — |
| **Pro** | Unlimited | **$3.99/mo** (target; App Store + Web Billing) |

**Entitlement id (RevenueCat + code):** `pro`

**Pro is active when** `users.proExpiresAt` is set and `> Date.now()` (milliseconds). The client also reads RevenueCat `CustomerInfo` for immediate UI; Convex is enforced on mutations.

### What counts as an “active” event

Used for free-tier limits and the home usage banner:

1. **`status === 'open'`** — voting still open.
2. **`status === 'decided'`** and the **decided timeslot `startTime` is in the future** — meeting is scheduled but has not started yet.

Does **not** count:

- `status === 'closed'` (archived)
- Decided events whose start time has passed
- Decided events with no resolved timeslot

Implementation: `countActiveEventsForOwner` in `convex/subscriptionLimits.ts`.

Home list grouping (`events:listForHome`): the **Active** section includes open events and future decided events; past decided events appear under **Decided**.

---

## Architecture

```
┌─────────────────┐     purchase / restore      ┌──────────────────┐
│  Expo app       │ ──────────────────────────► │  RevenueCat      │
│  (iOS / web)    │ ◄── CustomerInfo / offerings  │  (Test Store /   │
└────────┬────────┘                               │   App Store /    │
         │                                        │   Web Billing)   │
         │ syncFromRevenueCat (action)            └────────┬─────────┘
         ▼                                                 │
┌─────────────────┐     webhook POST                       │
│  Convex         │ ◄────────────────────────────────────┘
│  users.         │
│  proExpiresAt   │
│  events.create  │── assertCanCreateActiveEvent (free cap)
└─────────────────┘
```

### Client (`lib/purchases/`, `components/purchases/`)

| Piece | Role |
|-------|------|
| `RevenueCatInit` | `Purchases.configure()` once per session (iOS + web) |
| `RevenueCatIdentify` | `Purchases.logIn(Better Auth user id)` after sign-in |
| `SubscriptionSync` | Calls `subscriptions:syncFromRevenueCat` on session start and when SDK Pro state changes |
| `PaywallModal` | Subscribe + restore; identifies user before purchase |
| `SubscriptionSettingsSection` | Settings: plan, usage, upgrade, restore, manage billing |
| `useEntitlement` | SDK `CustomerInfo` → active `pro` entitlement |
| `useSubscription` | Convex `getCreateEligibility` + SDK (combined `isPro`) |
| `useCreateEventGate` | Blocks navigation to create when at cap; opens paywall |

**Purchase path (web):** always `Purchases.purchasePackage($rc_monthly)` — `purchaseStoreProduct` is not supported in browser/Test Store mode.

**Purchase path (iOS):** prefers `$3.99` sku via `purchaseStoreProduct` when the offering package still points at the legacy Test Store id; otherwise `purchasePackage`.

### Convex (`convex/`)

| File | Role |
|------|------|
| `schema.ts` | `users.proExpiresAt` (optional number, ms) |
| `subscriptionLimits.ts` | `FREE_MAX_ACTIVE_OPEN_EVENTS`, `countActiveEventsForOwner`, `assertCanCreateActiveEvent` |
| `subscriptions.ts` | `syncFromRevenueCat`, `getCreateEligibility`, webhook-driven `syncFromRevenueCatInternal` |
| `http.ts` | `POST /revenuecat-webhook` |
| `events.ts` | `create` mutation calls `assertCanCreateActiveEvent` |

**Webhook → Pro expiry**

1. Validates `Authorization` bearer against `REVENUECAT_WEBHOOK_AUTHORIZATION`.
2. Logs full body (`[revenuecat-webhook] request`) for debugging.
3. Schedules internal sync with `app_user_id`, `aliases`, `product_id`, `entitlement_ids`, `expiration_at_ms`, etc.

**Deriving `proExpiresAt`**

1. From webhook `entitlement_ids` including `pro`, or singular `entitlement_id`.
2. Else from known **`product_id`** + `expiration_at_ms` (Test Store often sends `entitlement_ids: null`).
3. Else REST `GET /v1/subscribers/{id}` with secret key, trying all candidate ids (auth id, aliases, anonymous).

**User matching:** `applyProExpiresAt` looks up `users` by `authUserId` using webhook `app_user_id`, `original_app_user_id`, and `aliases` (skips `$RCAnonymousID` when a real id exists).

### Shared constants (keep in sync)

| Location | Constant |
|----------|----------|
| `convex/subscriptionLimits.ts` | `FREE_MAX_ACTIVE_OPEN_EVENTS = 3` |
| `lib/subscription/free-tier.ts` | Same value for client fallbacks |
| `lib/purchases/constants.ts` | Product ids, `PRO_ENTITLEMENT_ID` |
| `convex/subscriptionLimits.ts` | `PRO_PRODUCT_IDS` for webhook product fallback |

---

## RevenueCat dashboard setup

**Project id (this repo’s scripts):** `projf3b630b9`

### Product catalog

| Product id | Store | Notes |
|------------|-------|--------|
| `agreeonatime_pro_monthly_399` | Test Store / Web Billing | **Current** $3.99/mo — attach to entitlement `pro` and package `$rc_monthly` |
| `me.brianmm.agreeonatime.pro.monthly` | App Store | iOS production |
| `agreeonatime_pro_monthly` | Test Store | **Legacy** $9.99 — **archive** (`pnpm run setup:revenuecat-archive-legacy-test`) |

### Offering

- **Offering:** `default`
- **Package:** `$rc_monthly` → must reference **`agreeonatime_pro_monthly_399`** (not legacy sku)

If `$rc_monthly` still maps to `agreeonatime_pro_monthly`, web checkout charges $9.99 and may not grant `pro` in webhooks.

### Entitlement

- Identifier: **`pro`**
- Attach all Pro product ids above (except archived legacy).

### Webhook (per Convex deployment)

1. RevenueCat → Project → Integrations → Webhooks.
2. **URL:** `https://<deployment>.convex.site/revenuecat-webhook`  
   - Dev: `https://fastidious-cardinal-591.convex.site/revenuecat-webhook`  
   - Prod: `https://hearty-grasshopper-692.convex.site/revenuecat-webhook`
3. **Authorization header:** same random secret as Convex env `REVENUECAT_WEBHOOK_AUTHORIZATION` (bearer token).
4. Enable subscription lifecycle events (purchase, renewal, expiration, etc.).

### Web Billing (production web)

RevenueCat’s API often returns **403** when creating Web Billing products via API; create the $3.99/mo product in the dashboard and attach it to `pro` / `$rc_monthly`.

Helper script (creates app, prints public key — does not replace dashboard product attach):

```bash
REVENUECAT_API_V2_SECRET=sk_... pnpm run setup:revenuecat-web
```

---

## Environment variables

### Client (Expo / EAS — public keys)

Set in `.env.local`, Vercel, and `eas.json` profiles as needed.

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | Legacy alias for iOS `appl_…` key |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` / `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | iOS public SDK key |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_WEB` | Web Billing `rcb_…` / sandbox `rcb_sb_…` |

**Local web dev:** Test Store key `test_…` in `EXPO_PUBLIC_REVENUECAT_API_KEY_WEB` works in browser mode before Web Billing products exist.

Resolution order: `lib/purchases/revenuecat-keys.ts`.

### Convex (server only — never `EXPO_PUBLIC_`)

Set per deployment (`pnpm convex env set` or dashboard):

| Variable | Purpose |
|----------|---------|
| `REVENUECAT_SECRET_API_KEY` | REST API v1 secret (`sk_…`) — subscriber lookup in `syncFromRevenueCat` |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | Bearer token for webhook auth |
| `REVENUECAT_API_V2_SECRET` | Optional fallback for v1 secret; required for setup scripts |

---

## EAS builds

`eas.json` includes `EXPO_PUBLIC_REVENUECAT_API_KEY` (iOS) and `EXPO_PUBLIC_REVENUECAT_API_KEY_WEB` on preview/production profiles. See [eas-build.md](./eas-build.md) for profiles and local TestFlight.

---

## UX surfaces

| Surface | Behavior |
|---------|----------|
| **Home** | Free users: banner `X of 3 active events` + upgrade → paywall |
| **Create event** | Gated client-side; server throws if over cap |
| **Onboarding create** | Same gate + paywall on limit error |
| **Settings → Subscription** | Plan, usage, upgrade, restore, manage billing (iOS App Store sheet; web billing URL when present) |

---

## npm scripts

| Script | Command |
|--------|---------|
| Web Billing setup helper | `pnpm run setup:revenuecat-web` |
| Archive legacy $9.99 Test Store product | `pnpm run setup:revenuecat-archive-legacy-test` |

---

## Troubleshooting

### Webhook fires but `users.proExpiresAt` stays empty

- Confirm **`REVENUECAT_SECRET_API_KEY`** on the same Convex deployment as the webhook URL.
- Check Convex logs for `[revenuecat-webhook]` and `[subscriptions] applyProExpiresAt: no users row`.
- **`app_user_id`** should be the Better Auth user id, not only `$RCAnonymousID:…`. Ensure sign-in before purchase (`RevenueCatIdentify`, paywall `identifyUser`).
- Search **`aliases`** in the webhook payload for the real user id.

### `entitlement_ids: null` in webhook

Common on Test Store. Convex falls back to **`product_id`** + `expiration_at_ms` for known Pro skus, then REST subscriber API.

### Checkout $9.99 instead of $3.99

- Legacy product **`agreeonatime_pro_monthly`** still on package `$rc_monthly` or an old sandbox subscription renewing.
- Archive legacy product; confirm offering; cancel old Test Store sub and subscribe again.

### Paywall: “Checkout finished but Pro did not activate”

- Purchased sku not attached to entitlement **`pro`** in RevenueCat.
- Wrong product id in checkout (legacy sku).

### Paywall: “No subscription plan available” (web)

- No offering / empty `$rc_monthly`, or missing public web key.
- Use Test Store `test_…` locally or complete Web Billing product + `rcb_…` key.

### `invalidateCustomerInfoCache` / `purchaseStoreProduct` errors on web

- Expected: web uses **`purchasePackage` only**; cache invalidation is iOS-only.

### Free limit error string (client detection)

Server message prefix: **`Free accounts can have`** — used in create-event and onboarding to open the paywall.

---

## Verification checklist

1. **`pnpm convex:dev`** — deploy schema + functions.
2. **`pnpm run web`** — sign in, Settings → Subscription shows usage.
3. Free account with 3 active events (open + future decided) → create blocked; home banner at cap.
4. Subscribe (Test Store or sandbox) → RevenueCat customer shows active **`pro`**.
5. Convex **Data → users** → `proExpiresAt` future timestamp.
6. Webhook test in RevenueCat → Convex log `[revenuecat-webhook] request` + `scheduling sync`.
7. **`pnpm run build:web`** — export succeeds.

---

## Related files (quick index)

```
app/(tabs)/index.tsx              # Home usage banner
app/(tabs)/settings.tsx           # Subscription section
app/create-event.tsx              # Create gate + paywall
components/purchases/
  paywall-modal.tsx
  subscription-settings-section.tsx
  subscription-sync.tsx
  revenuecat-identify.tsx
components/revenue-cat-init.tsx
convex/subscriptionLimits.ts
convex/subscriptions.ts
convex/http.ts
hooks/use-subscription.ts
hooks/use-entitlement.ts
hooks/use-create-event-gate.ts
lib/purchases/
lib/subscription/free-tier.ts
patches/convex@1.39.0.patch          # pnpm patch if present for Convex tooling
scripts/setup-revenuecat-web-billing.mjs
scripts/archive-revenuecat-legacy-test-product.mjs
```
