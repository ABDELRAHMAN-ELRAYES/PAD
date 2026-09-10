---
name: backend-resilience-observability
description: Audit backend services for resilience gaps (missing timeouts, no retry/backoff, no circuit breakers, no graceful degradation, missing idempotency keys on retried writes like payments or ticket creation) and observability gaps (no structured logging, no correlation/request IDs, no metrics or tracing, no health/readiness probes) and connection-lifecycle gaps (no graceful shutdown, connections not drained on deploy). Use this whenever the user asks about "production readiness", "reliability", "what happens if a dependency goes down", "why can't we see what's slow in prod", "zero-downtime deploys drop requests", or asks for a resilience/observability review of a backend service - regardless of language or framework. This is the skill that answers "how would we even know if the other performance/query anti-patterns were happening in production" - pair it with a data-access audit rather than skipping it.
---

# Backend Resilience & Observability Audit

A backend can have zero query bugs and still fall over the first time a downstream dependency hiccups, or become undebuggable in production because nothing about a request's journey was ever recorded. This skill audits for both, plus the connection-lifecycle behavior that determines whether a deploy drops live requests. It's deliberately stack-agnostic: the same gaps show up whether the service is written in Node/Express, Python/FastAPI, Go, Java/Spring, Ruby/Rails, or anything else - only the idiomatic fix differs.

## Why this matters

Query storms and missing indexes are the kind of bug you can eventually find by reading code carefully (see the backend-performance-audit skill). Resilience and observability gaps are different: **without them, you cannot detect the other bugs in production at all.** If nothing logs a correlation ID, no one can tell that one request fired 54 queries. If there's no metric for query count or latency percentiles, "the dashboard feels slow" is the only signal anyone ever gets, days after it started. This skill exists to close that blind spot, not to duplicate the query-pattern audit.

## Part 1: Error handling & resilience

### 1. Missing timeouts on outbound calls

**Detect:** Every call to a database, cache, external API, or another internal service - does it have an explicit timeout, or does it use the client library's default (which is often "wait forever" or an unreasonably long value)?

**Why it hurts:** Without a timeout, a slow or hung dependency ties up the calling thread/connection/event-loop slot indefinitely. Under load this cascades: requests pile up waiting on the hung dependency, exhausting the caller's own connection pool or thread pool, taking down a service that isn't even the one that's broken.

**Fix:** Set an explicit, deliberately-chosen timeout (not the library default) on every outbound network call, sized to the operation - a cache read should time out in milliseconds, a report-generation call might reasonably get seconds.

### 2. No retries, or retries without backoff/jitter

**Detect:** Do transient-failure-prone calls (network calls, especially to external services) retry at all? If they do, is it an immediate tight-loop retry, or does it wait with exponential backoff and jitter?

**Why it hurts:** No retries means a single transient blip (a dropped connection, a momentary DNS hiccup) surfaces as a user-facing error for something that would have succeeded a moment later. Retrying without backoff does the opposite: many clients retrying instantly and simultaneously after a shared dependency recovers creates a "thundering herd" that can knock it back down.

**Fix:** Retry only operations that are safe to retry (see idempotency below), with exponential backoff and random jitter, and a maximum retry count/deadline so a request doesn't retry forever.

### 3. No circuit breaker for flaky dependencies

**Detect:** When a downstream dependency is failing repeatedly, does the caller keep hammering it on every single request, or does something notice the failure rate and stop calling it for a cooldown period?

**Why it hurts:** Without a breaker, a struggling dependency gets continuous full-volume traffic from every caller, which actively prevents it from recovering, and every one of those calls also burns the timeout duration on the caller's side.

**Fix:** Wrap risky outbound calls in a circuit breaker (open the circuit after N consecutive/rate-based failures, fail fast while open, periodically test with a half-open probe). Most languages have a mature library for this rather than needing a hand-rolled implementation.

### 4. No graceful degradation

**Detect:** When a non-essential dependency is down (a recommendations service, a search-ranking service, a third-party enrichment API), does the whole request fail, or does the feature quietly degrade (empty recommendations, default ranking, skip enrichment)?

**Why it hurts:** Coupling the availability of the entire response to the availability of every dependency it touches means your uptime is the *product* of all your dependencies' uptimes, not the uptime of your core function.

**Fix:** Identify which dependencies are essential to the response vs. enhancing it, and let non-essential failures degrade gracefully (fallback value, cached last-known-good value, feature flag to disable) instead of failing the whole request.

### 5. Missing idempotency keys on retried writes

**Detect:** Any write operation that creates something with real-world consequences on retry - payment charges, order/ticket creation, sending a notification - and can be triggered more than once for the same logical action (client-side retry after a timeout, at-least-once message delivery, a double-click). Look specifically at the exact code paths this audit family already flags for other reasons - payment schedule creation, ticket creation with sequence generation, and similar "create the record" flows are exactly where this bites, because a client retry after a slow/timed-out response can create the same payment or ticket twice.

**Why it hurts:** A network timeout doesn't mean the request failed - it might have succeeded and only the response was lost. If the client retries a non-idempotent write, the user gets charged twice or gets two duplicate tickets.

**Fix:** Require an idempotency key (client-generated request ID) on writes that have side effects; on the server, store recently-seen keys and return the original result for a duplicate key instead of re-executing the write. At minimum, add a uniqueness constraint that makes the duplicate physically impossible to create twice.

## Part 2: Observability

### 6. No structured logging

**Detect:** Are logs plain strings (`console.log("user logged in")`) or structured (JSON/key-value with consistent fields)?

**Why it hurts:** Plain-text logs can't be reliably queried, filtered, or aggregated at scale - you end up grepping production logs by hand during an incident.

**Fix:** Log structured events with consistent fields (timestamp, level, service name, and context-specific fields) so they're queryable in whatever log aggregation tool the team uses.

### 7. No correlation / request ID propagation

**Detect:** When a request comes in, is a unique ID generated (or extracted from an incoming header) and attached to every log line and outbound call made while handling it? Does that ID get passed along to downstream services so it can be traced across service boundaries?

**Why it hurts:** Without it, reconstructing what happened during one specific request means guessing which log lines, across possibly multiple services, belong together - often impossible once there's concurrent traffic.

**Fix:** Generate or propagate a request/correlation ID at the edge (or read it from an incoming header if present), thread it through the whole call chain (via request-scoped context, not manual parameter passing everywhere if the language offers something better), include it in every log line, and forward it in headers to downstream calls.

### 8. No metrics

**Detect:** Is anything emitting counters, gauges, or histograms - request counts, latency percentiles, error rates, queue depths, per-endpoint query counts? Or is the only visibility "the app feels slow" reports from users?

**Why it hurts:** This is precisely how the query-storm and N+1 patterns in the sibling performance-audit skill go undetected for so long: nothing counts "how many DB calls did this endpoint make," so a regression from 2 queries to 54 queries produces no alert, just a slow gradual complaint trickle.

**Fix:** Instrument at minimum: request rate/latency/error-rate per endpoint, and DB/cache/external-call counts and latency per request. Export to whatever metrics backend the team uses, and alert on latency percentile and error-rate thresholds, not just uptime.

### 9. No distributed tracing

**Detect:** In a multi-service architecture, can you follow one request as spans across service boundaries, or does each service's logs live in total isolation?

**Why it hurts:** Without tracing, diagnosing "which of the 6 services in this call chain is actually slow" becomes guesswork.

**Fix:** Adopt a tracing standard (OpenTelemetry is the common cross-language choice) and instrument service entry/exit points and outbound calls as spans.

### 10. No health/readiness probes

**Detect:** Does the service expose a liveness endpoint (is the process alive) and, separately, a readiness endpoint (is it actually able to serve traffic right now - DB connected, caches warm, dependencies reachable)?

**Why it hurts:** Without readiness checks, an orchestrator (Kubernetes, a load balancer) will route traffic to an instance that's still starting up or has lost its DB connection, causing user-facing errors that a simple health check would have prevented.

**Fix:** Expose a liveness endpoint (cheap, just "is the process responsive") and a separate readiness endpoint (checks actual dependency connectivity) and wire them into the deployment platform's health-check configuration.

## Part 3: Graceful shutdown & connection lifecycle

### 11. No graceful shutdown on SIGTERM

**Detect:** When the process receives a termination signal (SIGTERM, the standard signal an orchestrator sends before killing a container/process), does anything handle it? Or does the process die immediately, mid-request?

**Why it hurts:** Every deploy, autoscale-down event, or pod eviction sends this signal to running instances. Without a handler, in-flight requests get their connections severed mid-response, and open DB/cache connections aren't closed cleanly (which can leave the pool on the server side thinking connections are still active).

**Fix:** On SIGTERM: stop accepting new connections/requests immediately, let in-flight requests finish (with a bounded grace period), then close DB/cache/queue connections cleanly, then exit. Make sure the orchestrator's grace period (e.g. Kubernetes' `terminationGracePeriodSeconds`) is longer than the time this drain can realistically take.

**Fix pattern (language-agnostic shape):**
```
on SIGTERM:
  mark readiness probe as "not ready" (so the LB stops sending new traffic)
  stop the HTTP listener from accepting new connections
  wait for in-flight requests to complete, up to a max grace period
  close DB pool, cache client, message queue connections
  exit process
```

## Output format

```
# Backend Resilience & Observability Audit

## Stack fingerprint
[language, framework, deployment platform if known]

## Findings
### [Gap name] - [Severity]
- Location / evidence: [what you found, or "absent entirely" if nothing exists]
- Failure scenario: [concretely what breaks and when - "if the payment provider times out, the request retries and double-charges" beats "resilience could be improved"]
- Fix: [specific to the stack]

## Priority order
1. Idempotency on payment/order/ticket-style writes (data corruption risk)
2. Timeouts on outbound calls (cascading failure risk)
3. Graceful shutdown (guaranteed to bite on every deploy)
4. Correlation IDs + structured logging (unblocks debugging everything else)
5. Metrics, tracing, health probes, retries/circuit breakers, graceful degradation
```

Severity is driven by *blast radius and frequency*, not theoretical elegance: a missing idempotency key on a payment path outranks a missing tracing setup, even though tracing is "more infrastructure."

## Related skills

Use **backend-performance-audit** for query/data-access patterns and **security-audit** for injection/auth issues. This skill is what makes those other findings *visible and survivable* in production - recommend running it alongside, not instead of, a data-access audit.
