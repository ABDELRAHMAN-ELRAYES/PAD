---
name: cicd-deployment-audit
description: Audit or design CI/CD and deployment practices - zero-downtime deploy strategy, database migration ordering relative to code deploys, rollback plans, CI pipeline quality gates, and build reproducibility. Use this whenever the user asks about "deployment strategy", "zero-downtime deploys", "our deploys drop requests", "migration ordering", "rollback plan", "CI/CD pipeline review", or mentions deploy-time incidents - regardless of platform (Kubernetes, ECS, bare VMs, PaaS, serverless) or CI provider.
---

# CI/CD & Deployment Audit

Most production incidents cluster around two moments: the deploy itself, and the migration that shipped alongside it. This skill audits both, plus whether the CI pipeline actually catches problems before they reach either.

## Why this matters

Code can be perfectly correct and still cause an outage purely because of *how* and *in what order* it was rolled out. A migration that drops a column before the old code (still running on some instances during a rolling deploy) stops reading it will crash every remaining old instance. A deploy with no rollback plan turns a five-minute bug into a multi-hour incident while someone manually reverses the change.

## 1. Zero-downtime deploy strategy

**Detect:** During a deploy, are old and new versions ever running simultaneously (rolling deploy, blue-green, canary), or is there a hard cutover that drops all connections at once? If old and new versions do run simultaneously (the common case), is the codebase actually safe for that - can both versions handle the current database schema and any messages/events produced by either version?

**Why it hurts:** A hard cutover always drops in-flight requests. Even with a supposedly zero-downtime strategy (rolling/blue-green), if the new code depends on a schema change or message format the old version can't handle, the overlap window itself becomes the outage.

**Fix:** Use a rolling, blue-green, or canary deployment strategy appropriate to the platform, and pair it with backward/forward-compatible changes (see migration ordering below) so the overlap window between old and new code is always safe. Confirm graceful shutdown (see backend-resilience-observability skill) is implemented so instances being terminated drain in-flight requests first.

## 2. Migration ordering relative to code deploy

**Detect:** For any change that touches both the database schema and the application code that reads/writes it, check the sequencing: does the migration run *before*, *after*, or *atomically with* the code deploy? Specifically look for changes that would break the *other* version during the overlap window of a rolling deploy - dropping/renaming a column the old code still selects, adding a `NOT NULL` column with no default that the old code's inserts don't populate, or changing a column's type/meaning in place.

**Why it hurts:** During a rolling deploy, old and new code run side by side for a window of time. A migration that only the new code is compatible with will break every old-code instance still serving traffic during that window - this is one of the most common causes of a "deploy that should have been safe" outage.

**Fix:** Use the expand/contract pattern for anything not trivially additive: **expand** (add the new column/table alongside the old one, deploy code that writes to both), **migrate** (backfill data, deploy code that reads from the new one), **contract** (once all instances are on new code and backfill is complete, remove the old column/table in a later, separate deploy). Never combine a breaking schema change with the code that depends on it in the same atomic step if a rolling deploy is in play.

## 3. Rollback plan

**Detect:** If this deploy causes a problem in production, what's the actual, specific plan? Is there one, or does "roll back" mean "someone will figure it out during the incident"? Specifically check: can the previous code version be redeployed quickly (is the previous build artifact retained and deployable), and is the database migration from this deploy also reversible, or does rolling back the code while the new migration is still applied break the old code (see point 2 - the same expand/contract logic applies to rollback safety, not just forward deploy safety)?

**Why it hurts:** Without a concrete rollback plan decided in advance, the first response to a bad deploy during an actual incident is improvisation under pressure, which is slower and more error-prone than executing a plan decided calmly beforehand.

**Fix:** Keep previous build artifacts readily deployable, write migrations to be safely rollback-compatible (or explicitly document that they're not, with a plan for that case), and know the rollback command/procedure before you need it, not while an incident is live.

## 4. CI pipeline quality gates

**Detect:** What actually blocks a merge/deploy? Run through: automated tests (and are they required to pass, or just informational), linting/type-checking, a security/dependency vulnerability scan (see dependency-hygiene-audit skill), build success itself, and any manual approval step for production deploys specifically. Also check: does CI run against something resembling production configuration, or does it skip steps that only run "in prod" (meaning CI never actually validates the thing that ships)?

**Why it hurts:** Every gate that's missing or optional-not-required is a class of bug that reaches production purely because nothing stopped it, regardless of whether anyone happened to check manually that time.

**Fix:** Make the meaningful gates (tests, type-checking, build) required/blocking rather than advisory, add a dependency/security scan to the pipeline if absent, and where compliance/change-control matters, require an explicit approval step for production deploys.

## 5. Build reproducibility

**Detect:** Given the same commit, does CI produce a deterministic, identical build every time, or can the same source produce different artifacts (unpinned dependency versions, build steps that depend on network resources that can change, non-deterministic bundling)?

**Why it hurts:** Non-reproducible builds make "roll back to the previous version" ambiguous (which exact artifact is "the previous version" if it wasn't preserved and can't be rebuilt identically) and make debugging production issues harder when you can't reliably reconstruct what was actually running.

**Fix:** Pin dependency versions via a lockfile, retain built artifacts (don't rebuild from source on rollback - redeploy the exact previous artifact), and avoid build steps with non-deterministic inputs.

## Output format

```
# CI/CD & Deployment Audit

## Findings
### [Area] - [Severity]
- Current state: [what actually happens today]
- Failure scenario: [concrete - "a rolling deploy with this migration would 500 on old instances for ~N minutes"]
- Fix: [specific to the platform in use]

## Priority order
1. Migration/deploy ordering safety (expand/contract) - this is what actually causes deploy-time outages
2. Rollback plan existing and tested
3. Zero-downtime deploy mechanics (graceful shutdown, connection draining)
4. CI quality gates (tests/lint/scan required, not advisory)
5. Build reproducibility
```

## Related skills

Graceful shutdown and connection draining (needed for zero-downtime deploys to actually work) is covered in depth in **backend-resilience-observability**. Dependency vulnerability scanning as a CI gate is covered in **dependency-hygiene-audit**.
