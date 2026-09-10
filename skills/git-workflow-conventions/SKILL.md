---
name: git-workflow-conventions
description: Apply Conventional Commits formatting to git commit messages and standard branch-naming conventions when creating branches, writing commit messages, or preparing pull requests. Use this whenever the user asks to "commit this", "write a commit message", "create a branch", "name a branch for this", or asks for help with git workflow - even if they don't explicitly mention "conventional commits" or naming conventions by name. Always follow these exact conventions rather than inventing a different style, unless the user's repository clearly already uses a different established convention (check recent git log/branch history first if available).
---

# Git Commit & Branch Naming Conventions

Consistent commit messages and branch names make history searchable, changelogs automatable, and code review faster to triage. This skill applies one specific, standard convention - check the repo's actual history first in case it already has an established (possibly different) convention in place, and match that instead of overriding it silently.

## Before writing anything: check existing conventions

If you have access to the repository, look at `git log --oneline -20` and recent branch names first. If the project already consistently follows a *different* scheme, follow the existing scheme rather than introducing a second convention into the same history - consistency within the project outranks this skill's specific defaults. If there's no clear existing convention, or the project is new, apply the conventions below.

## Commit messages: Conventional Commits

Format: `type(optional scope): short description`

### Commit types

| Type | When to use |
| --- | --- |
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

### Rules

- Subject line: imperative mood ("add", not "added" or "adds"), no trailing period, ideally under ~72 characters.
- Scope (optional but encouraged when useful): the module/area affected, in parentheses right after the type - `feat(auth):`, `fix(ticket-service):`.
- Body (optional, for anything non-trivial): a blank line after the subject, then explain *why* the change was made, not just what changed - the diff already shows what changed.
- Breaking changes: add `!` right after the type/scope (`feat(api)!: ...`) and/or a `BREAKING CHANGE:` footer explaining the impact and migration path.
- Reference issues where relevant in the footer (`Fixes #123`, `Refs #456`).
- One logical change per commit - if a change is genuinely both a refactor and a fix, prefer splitting into two commits over picking one type that only half-describes it.

### Examples

**Example 1:**
Input: Added user authentication with JWT tokens
Output: `feat(auth): implement JWT-based authentication`

**Example 2:**
Input: Fixed a bug where expired password reset tokens were still accepted
Output: `fix(auth): reject expired password reset tokens`

**Example 3:**
Input: Reorganized the ticket repository to extract query-building into a helper
Output: `refactor(tickets): extract query builder from ticket repository`

**Example 4:**
Input: Added indexes on foreign key columns to speed up dashboard queries
Output: `perf(db): add indexes on foreign key columns used in dashboard queries`

**Example 5:**
Input: Bumped the ORM package to patch a known vulnerability
Output: `chore(deps): bump orm-package to patch CVE-2026-xxxxx`

**Example 6, with body:**
```
fix(payments): add idempotency key to charge creation

Retried payment requests after a client timeout could create
duplicate charges for the same order. Charges are now keyed by
a client-supplied idempotency key so a retry returns the
original result instead of creating a new charge.

Fixes #482
```

## Branch names

Format: `type/short-kebab-case-description`, referencing an issue number where one exists.

| Type | Use for |
| --- | --- |
| `feature/short-description` | New functionality |
| `fix/issue-123-null-pointer` | Bug fixes (reference issue number) |
| `hotfix/critical-auth-bypass` | Urgent production fixes |
| `chore/update-dependencies` | Maintenance tasks |
| `docs/update-readme` | Documentation only |
| `refactor/extract-auth-module` | Code restructuring |
| `test/add-unit-tests-for-auth` | Adding tests |

### Rules

- All lowercase, words separated by hyphens, no spaces or underscores.
- Keep the description short but specific enough to identify the work without opening the branch - `fix/null-check` is too vague, `fix/issue-123-null-pointer-on-empty-cart` is clear.
- Include the issue/ticket number when one exists, placed right after the type (`fix/issue-123-...`) so it's easy to spot and cross-reference.
- `hotfix/` is reserved for urgent production fixes branched directly off the production branch, distinct from `fix/` for a normal bug fix branched off the main development line - don't use them interchangeably.
- Match the commit `type` to the branch `type` where the mapping is obvious (a `feature/` branch's commits will mostly be `feat:`), but don't force it - a feature branch legitimately picks up `test:` or `refactor:` commits along the way too.

## Output format when asked to write a commit message or branch name

Just give the exact string(s) to use, plus a one-line rationale for the type chosen if it wasn't obvious. Don't wrap it in extra explanation unless asked - the person usually wants to copy-paste it directly.

If the requested change genuinely spans multiple types (e.g., a fix plus an unrelated refactor bundled together), say so and suggest splitting into separate commits rather than picking one type to force onto everything - this keeps history honest and is worth a brief note even though it adds a small amount of friction.
