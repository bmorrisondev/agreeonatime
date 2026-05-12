---
name: linear-github-pr-sync
description: >-
  Aligns Linear Development-team issue status with GitHub PR state for agreeonatime:
  open PR → Needs Review; merged or closed PR → Done. Use when the user asks to sync
  Linear with GitHub, fix ticket status vs PRs, update DEV-### from PRs, or run a
  Linear/GitHub PR status audit.
disable-model-invocation: true
---

# Linear ↔ GitHub PR status sync

## Preconditions

- Repo is `agreeonatime` (GitHub: `bmorrisondev/agreeonatime` or same `gh` default).
- **GitHub CLI**: `gh` available and authenticated (`gh auth status`).
- **Linear MCP** enabled: use `get_issue`, `save_issue`, optionally `list_issue_statuses` on team **Development**.

Exact Linear state names for this workspace: **Needs Review**, **Done** (see `.cursor/rules/linear-github-pr-status.mdc`).

## Target mapping (per ticket / `DEV-###`)

Collect all PRs whose **title** contains `DEV-NNN` (regex: `\bDEV-\d+\b`, case-sensitive).

For each issue id found:

| GitHub PR situation | Linear `state` for `save_issue` |
|---------------------|----------------------------------|
| At least one PR is **OPEN** | **Needs Review** |
| No open PR; at least one **MERGED** | **Done** |
| No open PR; only **CLOSED** (never merged) | **Done** |

If no PR references a ticket, **do not** change that ticket via this skill (out of scope).

**Duplicate PRs** (e.g. superseded branch + merged PR): apply the table to the **set** of PRs for that `DEV-###` — if any is open → Needs Review; else Done if any merged or all closed.

## Procedure (agent)

1. **Collect PRs** from repo root:

   ```bash
   gh pr list --state all --limit 250 --json number,title,state,headRefName
   ```

2. **Build a map** `DEV-###` → `{ open: boolean, merged: boolean, closedOnly: boolean }` from the JSON. Parse `DEV-###` only from `title` (and optionally from `headRefName` if the project convention is `feature/dev-NNN-...` — use branch only when `title` lacks the id).

3. **Resolve desired Linear state** per id using the table above.

4. **Fetch current Linear status** with `get_issue` for each id that will change (or all ids in the map if the user asked for a full audit).

5. **Apply updates** with `save_issue` **only** where `issue.status` ≠ desired state:

   ```json
   { "id": "DEV-NNN", "state": "Needs Review" }
   ```

   or

   ```json
   { "id": "DEV-NNN", "state": "Done" }
   ```

6. **Report** a short markdown summary: `DEV-###` → old → new (or “unchanged”), and PR numbers cited.

## Verification

- Re-run `gh pr list ...` and spot-check a few issues in the Linear UI.
- If `save_issue` errors on `state`, run `list_issue_statuses` with `team: "Development"` and use the returned **name** string exactly.

## Out of scope

- Creating PRs or branches (see `.cursor/rules/git-push-and-pr.mdc`).
- Tickets without a matching PR (leave status to normal workflow).
- Non–Development teams unless the user names them (then run `list_issue_statuses` for that team first).
