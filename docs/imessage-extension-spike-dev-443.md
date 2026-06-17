# iMessage App Extension — research spike (DEV-443)

**Date:** 2026-06-16  
**Status:** Descoped for AOAT v1.2 — ship link sharing instead

## Goal

Allow Agree+ owners to create and share polls inside iMessage as rich bubbles, without copy/pasting share links.

## Findings

### 1. Expo / EAS constraints

- iMessage App Extensions require a **native iOS app extension target** (`MessagesExtension`) in Xcode.
- Expo **managed workflow** does not support adding extension targets without **prebuild + custom native code** (bare or config plugins).
- This repo uses EAS Build with native modules (AdMob, calendar, etc.) but **no extension target** exists today.
- Adding one means: config plugin or manual `ios/` changes, separate extension bundle id, App Store review for extension entitlements, and ongoing maintenance outside Expo’s happy path.

### 2. Authentication

- Extensions run in a **separate process** from the main app.
- Convex + Better Auth session cookies live in the main app’s storage (MMKV on native).
- Extension would need **App Groups** + shared keychain (or shared MMKV container) to read auth tokens.
- Better Auth tokens expire; extension must handle refresh failures gracefully → likely **“Open main app to sign in”** fallback for most edge cases.

### 3. MSMessage capabilities

- `MSMessage` supports a **URL + summary text + optional image** in the message bubble.
- Recipients tap the bubble → opens URL (Universal Link to `/vote/[token]` works today via DEV-392).
- Extension **cannot** embed a full in-message voting UI; vote flow still lands on web/app responder.
- Value over link paste: **branded bubble + one-tap create** inside Messages — meaningful but incremental vs copy link.

### 4. Convex / create flow

- Extension can call Convex HTTP or mutations **if** it has a valid auth token (same as main app).
- Minimal create form (title + 2–3 slots, default 48h deadline) is feasible in SwiftUI/UIKit extension UI.
- Agree+ gate: check RevenueCat/Convex pro state before create — adds latency and failure modes in extension context.

### 5. Effort estimate

| Workstream | Estimate |
|---|---|
| Xcode extension target + App Groups + entitlements | 2–3 days |
| Shared auth bridge + token refresh | 2–3 days |
| Extension UI + Convex create integration | 2–3 days |
| QA (Messages versions, iPad, auth edge cases) | 1–2 days |
| App Store review / entitlement updates | 1+ week calendar time |

**Total:** ~1.5–2 engineering weeks + review risk.

## Ship / no-ship decision

**No-ship for v1.2.**

Reasons:

1. **Link sharing already works** with Universal Links (DEV-392) — primary viral loop is unblocked.
2. **High native complexity** for a low-priority (P4) ticket relative to calendar sync, templates, and web ads already in flight.
3. **Agree+ value** is better spent on features owners use every create flow (calendar conflicts, AI suggestions, templates).
4. Extension UX still **redirects to vote URL** — not a in-Messages vote experience.

## Recommended follow-up (post v1.2)

If revisiting:

1. Add `ios/MessagesExtension` via Expo config plugin (evaluate `@config-plugins/*` or custom plugin).
2. App Group: `group.me.brianmm.agreeonatime` for shared auth session snapshot.
3. Extension MVP: title + 2 slots → `events:create` → embed `buildVoteUrl(shareToken)` in MSMessage.
4. Gate on Agree+ via lightweight Convex query before showing create UI.
5. Fallback card: “Download Agree on a Time” when no auth in shared container.

## References

- [DEV-443](https://linear.app/brianmmdev/issue/DEV-443/imessage-app-extension-create-and-share-polls-inside-messages-agree)
- [Apple: Messages App Extension](https://developer.apple.com/documentation/messages)
- Existing Universal Links: `public/.well-known/apple-app-site-association`, `lib/linking/open-vote-in-app.ts`
