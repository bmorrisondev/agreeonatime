---
name: chat-handoff-summary
description: >-
  Produces a compact, paste-ready summary of the current chat’s work for starting a new
  conversation. Use when the user asks for a chat handoff, session summary, context for a new
  chat, “summarize what we did,” or to export work notes for another agent or thread.
disable-model-invocation: true
---

# Chat handoff summary

## When this skill applies

The user wants a **single block of text** they can paste into a **new chat** so the next session (or another person) can continue without re-reading the thread.

## Instructions

1. **Scan the conversation** from the earliest relevant user goal through the latest message. Prefer facts from the chat and repo over guesses.
2. **Infer the handoff reader**: default = another coding agent on the same repo; adjust if the user names a different audience.
3. **Output one markdown document** (no preambles like “Here’s a summary”). Lead with a **one-line title** (e.g. `# Handoff: <short topic>`).
4. **Be scannable**: short paragraphs, `##` sections, bullets; avoid long prose and duplicate bullets.
5. **Include only what helps continuation** — not a transcript. Omit routine tool chatter unless it changed outcomes.

## Required sections (in order)

1. **Goal / problem** — What the user was trying to achieve; constraints they stated.
2. **Outcome** — Done vs in progress vs blocked; one short paragraph max.
3. **Key decisions** — Non-obvious choices, trade-offs, rejected approaches (bullets).
4. **Code & files** — Table or bullets: path → what changed or why it matters. Note deleted/renamed files.
5. **Environment & ops** — Branches, Convex/env vars, commands run, deploy notes if relevant.
6. **Verification** — What was run (e.g. lint, tsc, manual URL) and results; **untested** gaps if any.
7. **Follow-ups for the next chat** — Numbered checklist: concrete next steps, open questions, edge cases called out in thread.

## Style rules

- Use **repo-relative paths** in backticks (e.g. `app/sign-in/index.tsx`).
- Prefer **“should verify”** over claiming production behavior without evidence from the chat.
- If the thread referenced **issue IDs** (e.g. `DEV-###`) or **URLs**, repeat them verbatim once where useful.
- Do **not** paste secrets, tokens, or full `.env` values; say “set in Convex / `.env.local`” instead.
- If context is ambiguous, add **“Assumptions”** (max 3 bullets) labeled as such.

## Optional sections (only if applicable)

- **Regressions / risks** — What could break and why.
- **Related prior work** — Earlier threads or PRs mentioned by the user (names/IDs only).

## Example shape (keep real output tighter than this)

```markdown
# Handoff: Magic link routing on web

## Goal / problem
Fix Unmatched Route when magic links land on `/sign-in/nEmail?ott=…`.

## Outcome
Implemented nested `app/sign-in/` routes and URL sync; lint/tsc clean.

## Key decisions
- …

## Code & files
- `app/sign-in/[tail].tsx` — …
- …

## Environment & ops
- Branch: `fix/…`

## Verification
- `pnpm lint`, `pnpm exec tsc --noEmit` — pass
- Manual: …

## Follow-ups for the next chat
1. …
```

## Anti-patterns

- Dumping raw diffs or entire files into the handoff.
- Vague bullets (“fixed stuff”, “updated auth”) without paths or intent.
- Omitting **follow-ups** when work is partial.
