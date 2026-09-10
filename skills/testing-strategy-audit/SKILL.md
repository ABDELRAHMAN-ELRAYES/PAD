---
name: testing-strategy-audit
description: Audit or design a project's testing strategy - coverage expectations across the test pyramid (unit vs. integration vs. end-to-end), what specifically needs integration-level testing versus a fast unit test, contract testing between a frontend and backend (or between services), flaky-test patterns, and whether critical business logic (payments, auth, sequence/ID generation) actually has negative-path test coverage rather than only happy-path tests. Use this whenever the user asks about "test coverage", "testing strategy", "what should I write tests for", "our tests are flaky", or "how do we make sure the frontend and backend don't drift apart" - regardless of language, framework, or test runner.
---

# Testing Strategy Audit

Coverage percentage is a weak signal on its own - 90% coverage that's all happy-path unit tests around trivial getters proves much less than 40% coverage concentrated on the riskiest business logic. This skill is about auditing *what's tested and at what level*, not just how much.

## The test pyramid, applied practically

- **Unit tests** (most numerous, fastest, cheapest): pure business logic, calculations, validation rules, state transitions - anything that doesn't need a real database, network, or filesystem. If a "unit test" spins up a real database connection, it's not actually a unit test and should either be reclassified as integration or have its dependency mocked/faked.
- **Integration tests** (fewer, slower): the boundary between your code and a real dependency - does this query actually return the right rows against a real (or realistic test-instance) database, does this HTTP client actually parse a real response shape from the service it calls. This is where the query-pattern and data-access bugs covered in the backend-performance-audit skill actually get caught - a unit test with a mocked repository will never catch an N+1 query, because the mock doesn't know what "one round trip" means.
- **End-to-end tests** (fewest, slowest, most brittle): a full user flow through the real (or near-real) system, browser included where relevant. Reserve these for the handful of flows where a regression would be catastrophic (checkout, signup, login) - not for exhaustively covering every UI state, which is what unit/component tests are for.
- **Contract tests** (between services, or between frontend and backend): verify that what a producer (backend API, upstream service) actually returns matches what a consumer (frontend, downstream service) expects, independent of both being deployed together. This is the layer most projects skip entirely, and its absence is exactly how a backend response-shape change silently breaks the frontend weeks later with no test failure anywhere.

## What to audit

### 1. Coverage concentration vs. coverage percentage

**Detect:** Don't just read the coverage number - look at *what* is covered. Is the riskiest logic (money movement, auth decisions, anything with a race-condition or off-by-one history) well-tested, or is coverage padded by trivial code (getters, simple pass-through functions, generated code)?

**Fix:** Set coverage expectations per risk tier rather than one global number - critical business logic and anything handling money/auth/PII should have deliberately high coverage including edge cases; trivial glue code doesn't need the same bar.

### 2. Happy-path-only test suites

**Detect:** For each significant test file, is there a test for the failure/rejection/edge case, or only for the successful case? This matters most exactly where this audit family has already found real bugs: expiry checks (is there a test asserting an *expired* token is rejected, not just that a valid one is accepted?), payment/ticket creation under concurrency (is there a test simulating two near-simultaneous requests?), input validation (is there a test asserting malformed input is rejected?).

**Why it hurts:** A test suite that only exercises the happy path gives false confidence - it will pass right through a broken expiry check or a race condition because it never tries to trigger them.

**Fix:** For every piece of logic with a conditional (`if expired`, `if unauthorized`, `if duplicate`), add a test that actually drives execution down the rejection branch, not just the acceptance branch.

### 3. Missing integration tests for data-access code

**Detect:** Do repository/data-access-layer tests run against a real (or realistic, e.g. containerized/in-memory) database, or is the database always mocked? A fully-mocked data layer cannot catch a missing index, an N+1 query, or a query that returns the wrong join result - the mock just returns whatever the test told it to.

**Fix:** Maintain a smaller set of integration tests that exercise real queries against a real (test) database instance for the data-access layer specifically, separate from the larger and faster pure-unit-test suite for business logic.

### 4. No contract tests between frontend and backend (or between services)

**Detect:** If the frontend and backend (or two services) are developed somewhat independently, is there anything that verifies the response shape one side produces matches what the other expects - beyond "it worked when we tested it manually together"?

**Why it hurts:** A backend field rename, type change, or removed field can ship without any test failing, because the frontend's tests mock the response (with the old shape) and the backend's tests only check its own output in isolation.

**Fix:** Introduce contract tests (consumer-driven contract testing tools, or even a simpler shared schema/type validated on both sides) so a breaking shape change fails a test before it reaches production.

### 5. Flaky tests

**Detect:** Are there tests that fail intermittently without a code change - usually caused by real timing/ordering dependencies (a test relying on wall-clock time, unordered async operations, shared mutable state between tests, test-execution-order dependence) rather than genuine bugs?

**Why it hurts:** Flaky tests train the team to re-run CI and ignore failures rather than investigate them, which erodes trust in the whole suite and lets real regressions slip through disguised as "probably just flaky."

**Fix:** Treat flakiness as a bug to fix, not a re-run button to click - isolate test state (no shared mutable fixtures across tests), mock time explicitly rather than relying on real delays, and fix real race conditions in async test code rather than adding retries to mask them.

## Output format

```
# Testing Strategy Audit

## Current state
[test pyramid shape observed - e.g. "many E2E tests, almost no integration tests" is itself a finding]

## Findings
### [Gap] - [Severity]
- Where: [module/flow]
- Risk if untested: [concrete failure this would let through]
- Recommended test level: [unit/integration/e2e/contract] and why that level specifically

## Recommended pyramid shape for this project
[proportions and what belongs at each level, given the actual risk profile found]
```

## Related skills

Findings from **backend-performance-audit**, **backend-resilience-observability**, and **security-audit** should feed directly into this skill's "happy-path-only" and "missing integration test" checks - a race condition or expiry bug found in one of those audits should always produce a corresponding negative-path test recommendation here.
