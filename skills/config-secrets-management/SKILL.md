---
name: config-secrets-management
description: Audit or design configuration and secrets management practices - environment-specific configuration handling, ensuring no secrets are committed to source control (including in git history), proper secret storage and rotation, and feature-flag practices for safely toggling behavior without a deploy. Use this whenever the user asks about "secrets management", "config management", "environment variables", "is this safe to commit", "feature flags", or you notice hardcoded credentials, API keys, or connection strings anywhere in code you're reviewing - regardless of language, framework, or hosting platform.
---

# Configuration & Secrets Management Audit

Config and secrets bugs are unusually persistent: a secret committed once stays in git history forever unless the history itself is rewritten, and a hardcoded value that "worked in staging" quietly breaks (or worse, silently points at the wrong environment) the moment it's assumed to also be correct in production.

## 1. Secrets in source control

**Detect:** Grep the current codebase for patterns that look like credentials, API keys, private keys, or connection strings with embedded passwords - not just in obvious config files but in test fixtures, scripts, and comments (a secret pasted into a comment "for reference" is still a committed secret). Then check `.gitignore`/equivalent for whether actual secret files (`.env`, credential JSON files, key files) are excluded. Critically, also check **git history**, not just the current tree - a secret removed in a later commit is still present in every commit before that one, retrievable by anyone with repo access or a leaked clone.

**Why it hurts:** A secret in source control is exposed to everyone with repository access (which is often much broader than everyone who should be able to use that credential), to anyone who ever clones the repo, and permanently to anyone who already has a copy, even after it's "removed" - the fix is not deleting the line, it's rotating the secret.

**Fix:** Move any found secret out of code into environment variables or a secrets manager, then **rotate the secret** (assume it's compromised - removing it from the current file does not undo its exposure in history), and use a pre-commit hook or CI secret-scanning tool to catch this class of mistake before it merges going forward. Rewriting git history to purge old secrets is possible but is a disruptive last resort - rotating the credential is the actual fix regardless of whether history gets cleaned.

## 2. Environment-specific configuration handling

**Detect:** How does the application know whether it's running in development, staging, or production, and does each environment's config (database URLs, external API endpoints, feature behavior) come from environment variables/a config service, or from hardcoded values with conditional branches (`if (env === 'prod') { ... }` scattered through business logic)?

**Why it hurts:** Hardcoded per-environment branches scattered through the codebase are easy to get wrong (a forgotten branch that still points at a staging endpoint), hard to audit in one place, and make it easy to accidentally ship a debug/staging behavior to production.

**Fix:** Centralize environment-specific values into environment variables or a dedicated config module loaded once at startup, validated against a schema (fail fast at startup if a required config value is missing or malformed, rather than failing confusingly later at the point of use), and keep business logic free of environment-name conditionals.

## 3. Secret storage & access

**Detect:** Where do the actual secret values live at runtime - a proper secrets manager (cloud provider secret store, Vault, or platform-native equivalent), CI/CD platform secret variables, or plain `.env` files copied around manually (including into CI logs, shared drives, or chat messages)? Are secrets scoped narrowly (a service only has access to the secrets it needs) or is there one shared "everything" credential set used everywhere?

**Why it hurts:** Broadly-shared credentials mean a single leak (one compromised service, one leaked laptop) exposes everything, and manually-distributed `.env` files tend to end up in more places than anyone tracks, each one a potential leak point.

**Fix:** Use a proper secrets manager where the platform offers one, scope credentials narrowly per service/environment rather than one shared set, and avoid transmitting secrets through channels that log or persist them (chat messages, unencrypted email, CI logs that don't mask secret values).

## 4. Secret rotation

**Detect:** Is there any process (automated or documented manual) for rotating credentials periodically or after personnel changes, or do secrets live unchanged indefinitely once set?

**Why it hurts:** A secret that's never rotated means a leak from months or years ago (from a departed employee, an old compromised laptop, a secret briefly exposed in a since-deleted log) remains valid and usable indefinitely.

**Fix:** Establish a rotation cadence appropriate to the credential's sensitivity, and rotate immediately on any suspected exposure or relevant personnel offboarding - most secrets managers support this with minimal application-code changes if secrets are referenced by name/version rather than copy-pasted.

## 5. Feature flags for safe rollout

**Detect:** Is risky new behavior guarded by a flag that can be toggled without a deploy (allowing instant rollback of just the behavior, not the whole release), or does every behavior change require a full deploy/rollback cycle to disable?

**Why it hurts:** Without flags, disabling a problematic new feature requires a full rollback (reverting other unrelated changes bundled in the same deploy along with it) or a new deploy, both slower than flipping a flag - this matters most for exactly the kind of risky change (payment logic, a new algorithm, a UI redesign) where a fast kill switch is most valuable.

**Fix:** Gate meaningfully risky changes behind a feature flag (a dedicated flagging service, or even a simple config-driven boolean for smaller projects) so they can be disabled instantly and independently of a full deploy/rollback.

## Output format

```
# Configuration & Secrets Management Audit

## Findings
### [Area] - [Severity]
- Current state: [what you found]
- Exposure/risk: [who could access this and how]
- Fix: [specific, including "rotate this credential" as a separate action item from "stop committing it"]

## Immediate actions (do these regardless of anything else)
[any secret found in code or git history - list each one and mark it for rotation]

## Priority order
1. Rotate any exposed secret found (non-negotiable, independent of code fixes)
2. Stop future exposure (gitignore, pre-commit/CI scanning)
3. Centralize environment config with startup validation
4. Scope and properly store remaining secrets
5. Rotation cadence and feature-flag infrastructure for risky changes
```

## Related skills

For a broader application security pass (injection, auth, XSS), use **security-audit** - that skill flags secrets it happens to find but this skill is the systematic, dedicated treatment. For dependency vulnerabilities specifically, use **dependency-hygiene-audit**.
