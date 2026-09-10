---
name: git-conventions
description: >-
  Use whenever the user asks Claude to do anything involving git commits or branches: writing/suggesting a commit message, running `git commit`, creating or naming a branch, opening a PR, or reviewing/cleaning up commit history. Also trigger if the user pastes a diff and asks "commit this" or "what should I name this branch". Enforces Conventional Commits for commit messages (type(scope): subject, with feat/fix/docs/style/refactor/test/chore/perf/ci/revert types) and a standard branch-naming scheme (feature/, fix/, hotfix/, chore/, docs/, refactor/, test/ prefixes with a short kebab-case description, referencing an issue number where one exists). Applies regardless of language, framework, or repo host (GitHub/GitLab/Bitbucket). Do not use for general git troubleshooting unrelated to commit/branch naming (merge conflicts, rebasing, detached HEAD) — handle those directly.
---

# Git Commit & Branch Conventions

Whenever Claude writes a commit message, runs `git commit`, or names/creates a branch on the user's behalf, it follows the rules in this skill rather than improvising a format. This applies to every commit/branch action in a conversation once triggered, not just the first one.

## Commit messages — Conventional Commits

**Format:** `<type>(<scope>): <subject>`

- `<scope>` is optional — include it when the change is clearly localized to one module/area (e.g. `feat(auth): ...`); omit it for cross-cutting changes.
- `<subject>` is imperative mood, lowercase, no trailing period, under ~72 characters (e.g. "add rate limiting to login endpoint", not "Added rate limiting." or "Adds Rate Limiting To Login Endpoint").
- Body (optional, separated by a blank line): explain *why*, not just *what* — the diff already shows what changed. Wrap at ~72 chars.
- Footer (optional): `BREAKING CHANGE: ...` for breaking changes, or `Closes #123` / `Refs #123` to link an issue.

### Commit types

| Type | When to use |
|---|---|
| `feat` | New feature for the user |
| `fix` | Bug fix for the user |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no feature/fix |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependencies |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration |
| `revert` | Reverts a previous commit |

### Choosing the right type
- If the diff adds a capability a user/consumer of the code didn't have before → `feat`.
- If the diff corrects behavior that was wrong → `fix`.
- If the diff only touches `.md`/comments/docs → `docs`.
- If the diff only reformats (whitespace, linting) with zero behavior change → `style`.
- If the diff reorganizes code with no observable behavior change (not even a bug fix) → `refactor`.
- If the diff only adds/modifies test files → `test`.
- If the diff only touches build config, CI YAML, or dependency versions → `chore` (or `ci` specifically for CI/CD pipeline files).
- If the diff's primary intent is making something faster/lighter with no new behavior → `perf`.
- When a commit is a mix (e.g. a refactor that also fixes a bug), pick the type matching the *primary* intent and mention the secondary effect in the body, don't invent a combined type.

### Examples
```
feat(cart): add quantity stepper to line items

fix(auth): prevent expired reset tokens from passing validation

Date.parse(undefined) was evaluating to NaN, which failed the
expiry comparison open instead of closed.

Closes #482

perf(dashboard): collapse 54 stat queries into 2 aggregations

refactor(tickets): extract sequence generation into its own service

chore(deps): bump prisma to 5.20.0

docs(readme): add local setup instructions for Redis
```

## Branch naming

**Format:** `<type>/<short-kebab-case-description>`, with an issue number folded into the description when one exists.

| Prefix | When to use |
|---|---|
| `feature/short-description` | New functionality |
| `fix/issue-123-null-pointer` | Bug fixes — reference the issue number when there is one |
| `hotfix/critical-auth-bypass` | Urgent production fixes, typically branched from the production/release branch rather than the normal integration branch |
| `chore/update-dependencies` | Maintenance tasks |
| `docs/update-readme` | Documentation only |
| `refactor/extract-auth-module` | Code restructuring |
| `test/add-unit-tests-for-auth` | Adding tests |

Rules:
- Description is short, kebab-case, lowercase — a few words that describe the change, not a full sentence.
- Include the issue/ticket number in the description when the work tracks one (`fix/issue-123-null-pointer`, not just `fix/null-pointer`, once an issue number exists).
- `hotfix/` is reserved for urgent, production-branched fixes — don't use it for a normal bug fix that goes through the regular branch (that's plain `fix/`).
- Match whichever branch-type list the repo already uses if its CONTRIBUTING.md or existing branch history shows a different but consistent convention — consistency with the repo beats forcing this exact list. Use this list as the default when the repo has no established convention yet.

## Applying this when acting on the user's behalf

- When asked to write a commit message for a diff/staged changes, inspect the actual change (don't guess from the request alone) and produce a message following the format above.
- When asked to create a branch, derive the type from the nature of the work (ask only if genuinely ambiguous between e.g. `feature/` vs `refactor/`) and produce a compliant name before running `git checkout -b ...`.
- When asked to commit, still show the proposed commit message and get confirmation before running `git commit` if the action tools require confirmation for state-changing operations — this skill governs the *message content*, not whether confirmation is needed.
- If the user's repo has its own documented commit/branch convention (e.g. a `CONTRIBUTING.md` with different rules), follow the repo's documented convention instead and mention the discrepancy.
