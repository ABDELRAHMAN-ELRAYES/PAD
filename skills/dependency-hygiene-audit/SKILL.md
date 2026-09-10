---
name: dependency-hygiene-audit
description: Audit a project's third-party dependency practices - known vulnerability scanning, lockfile discipline and reproducible installs, update/patch cadence, and unnecessary or abandoned dependencies. Use this whenever the user asks about "dependency audit", "are we exposed to any CVEs", "should we upgrade our dependencies", "lockfile" issues, or supply-chain security - regardless of language or package manager (npm/yarn/pnpm, pip/poetry, cargo, maven/gradle, bundler, go modules, etc.).
---

# Dependency Hygiene Audit

Most applications now contain far more third-party code than first-party code. This skill audits whether that third-party surface is being managed deliberately or just accumulating unchecked.

## 1. Known vulnerability scanning

**Detect:** Is there any automated check (in CI, or run periodically) against a vulnerability database for the project's dependencies (the package manager's own audit command, or a dedicated tool)? Is it just present, or does it actually block anything - is a found vulnerability an alert nobody reads, or a required CI gate?

**Why it hurts:** Known, published vulnerabilities in dependencies are the lowest-effort attack vector there is - the vulnerability is already documented, sometimes with working exploit code, and only needs an unpatched target to hit.

**Fix:** Add automated dependency vulnerability scanning to CI (most ecosystems have a built-in or near-built-in option), and make at least high/critical-severity findings a blocking gate rather than an ignorable report. Pair with a documented process for what happens when a vulnerability is found in a dependency with no available patch yet (mitigate, replace, or accept documented risk - but decide, don't ignore).

## 2. Lockfile discipline

**Detect:** Is a lockfile present and committed to source control? Does CI install from the lockfile in a mode that fails on drift (rather than silently regenerating it), and does the local dev workflow actually keep it in sync (or do developers routinely delete and regenerate it, defeating its purpose)?

**Why it hurts:** Without a lockfile (or with one that CI doesn't actually enforce), "works on my machine" becomes literal - two installs of the "same" dependency tree can resolve to different transitive versions, including a version with a vulnerability or breaking change that wasn't present when it was last tested.

**Fix:** Commit the lockfile, use the package manager's frozen/CI install mode (fails rather than silently updates if the lockfile and manifest disagree), and treat lockfile changes as a reviewable part of any PR that touches dependencies rather than an auto-generated side effect.

## 3. Update/patch cadence

**Detect:** How far behind current are the major dependencies - are security patches applied promptly, or is the project multiple major versions behind across the board with no update process at all?

**Why it hurts:** The longer an upgrade is deferred, the larger and riskier it becomes (more breaking changes accumulate between the current and target version), which creates a vicious cycle where teams avoid upgrading *because* it's become risky, which makes it riskier still by the time it's finally attempted.

**Fix:** Establish a routine (not purely reactive-to-a-CVE) cadence for dependency updates, ideally automated for patch/minor versions (a bot that opens PRs for updates, run through the normal test suite) with human review reserved for major version bumps.

## 4. Unnecessary, duplicated, or abandoned dependencies

**Detect:** Are there dependencies installed but never actually imported/used anywhere in the codebase? Are there multiple libraries doing the same job (two date libraries, two HTTP clients) picked up over time as different contributors reached for different tools? Is the maintenance status of key dependencies healthy (recent releases, active issue response) or are core pieces of the stack effectively abandoned upstream?

**Why it hurts:** Every dependency is attack surface and maintenance burden whether or not it's actively used for something valuable - unused ones add risk for zero benefit, duplicated ones add bundle size/complexity for no benefit, and abandoned ones will eventually need an unplanned, urgent replacement (often exactly when a vulnerability is found and no patch is coming).

**Fix:** Periodically audit for and remove unused dependencies, consolidate duplicated functionality onto one chosen library, and flag core dependencies with concerning maintenance status early so migration is planned rather than forced by an emergency.

## Output format

```
# Dependency Hygiene Audit

## Findings
### [Area] - [Severity]
- Current state: [what you found - specific package names/versions where relevant]
- Risk: [concrete - "package X has a known critical RCE, currently on the vulnerable version"]
- Fix: [specific action]

## Priority order
1. Known critical/high vulnerabilities with available patches (upgrade immediately)
2. Lockfile enforcement in CI (prevents drift going forward)
3. Vulnerabilities with no patch yet (mitigate/replace/accept-with-documentation)
4. Update cadence process
5. Unused/duplicated/abandoned dependency cleanup
```

## Related skills

This pairs naturally with **cicd-deployment-audit** (vulnerability scanning as a CI gate) and **config-secrets-management** (a compromised dependency is one of the ways secrets end up leaked in the first place).
