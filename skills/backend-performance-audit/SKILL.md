---
name: backend-performance-audit
description: Audit server/backend codebases for data-access and scalability anti-patterns - missing indexes, N+1 queries, query storms, in-memory aggregation instead of SQL, duplicate queries, sequential await loops inside transactions, race conditions in ID/sequence generation, and blocking synchronous I/O on the event loop/thread pool. Use this whenever the user asks for a "performance audit", "scalability review", "why is my API slow", "database load" review, or asks you to look for N+1 queries, missing indexes, or inefficient data access - regardless of language, framework, ORM, or database. Trigger even if they only mention one symptom (e.g. "dashboard is slow", "DB CPU is pegged") since that symptom usually traces back to one of these patterns.
---

# Backend Data-Access & Scalability Audit

Every stack looks different, but the ways backends waste database and CPU capacity are a small, repeating set of patterns. This skill is a methodology for finding them regardless of language (Node, Python, Go, Java, Ruby, PHP, Rust...), framework, ORM/query builder, or database engine. Don't assume the tech stack from the examples below - detect it first, then map each pattern onto whatever the codebase actually uses.

## Why this matters

A single missing index or one query fired inside a loop is invisible in local dev with 50 rows of seed data. It becomes an outage at 50,000 rows in production. Because these bugs don't crash anything - they just get slower and slower - they survive code review and only show up as "the app feels sluggish" tickets. Finding them requires reading data-access code with a specific question in mind: **how many round-trips to the database (or cache, or external service) does this one request cause, and does that number grow with the data?**

## Before you start: fingerprint the stack

Don't skip this. The fix for "no index" looks completely different in Postgres (`CREATE INDEX`) vs MongoDB (`createIndex`) vs DynamoDB (GSI design) vs Elasticsearch (mapping). Spend the first few tool calls identifying:

- Language + runtime (Node/Python/Go/Java/Ruby/PHP/Rust/etc.)
- Data-access layer: raw SQL, query builder, or ORM (and which one)
- Database engine(s): relational (Postgres/MySQL/SQLite/SQL Server), document (Mongo), key-value (Redis/Dynamo), search (Elasticsearch/OpenSearch), or a mix
- Whether a cache layer exists (Redis/Memcached/in-process) and whether anything actually reads/writes it
- Async model: does the language have a real event loop (Node, async Python), green threads (Go), or a thread-per-request model (traditional Java/PHP)? This changes how severe "blocking I/O" findings are.

State your fingerprint at the top of the report so the reader knows the lens you audited through.

## The pattern catalog

For each pattern: what it looks like generically, how to detect it in an unfamiliar codebase, why it hurts, and what a fix looks like *in principle* (translate to the actual stack, don't paste stack-specific syntax from this file into an unrelated stack).

### 1. Missing indexes on lookup/join/sort columns

**Detect:** Find the schema definition (migration files, ORM model/entity files, `CREATE TABLE` statements, or a document DB's index config). List every column used in a `WHERE`, `JOIN`/lookup, `ORDER BY`, or uniqueness check across the query layer. Cross-reference against declared indexes. Any foreign key, status/enum filter, or timestamp used for sorting/range queries that has no matching index is a finding. In non-relational stores, the equivalent is a query pattern that isn't backed by a matching index/GSI/partition key and instead requires a full collection/table scan.

**Why it hurts:** Every such query forces a full scan. It's fine at low volume and silently becomes O(n) per request as the table grows - the query planner has no choice.

**Fix pattern:** Add an index (single-column or composite, matching the actual filter+sort combination used together, in the order they're used) on the specific access patterns you found - don't blanket-index every column, since each index adds write overhead. Composite indexes should put equality-filtered columns before range/sort columns.

### 2. N+1 queries and query storms (Promise.all / goroutine fan-out / loop-based fetch)

**Detect:** Look for: a query that returns a list, followed by a loop (explicit `for`, or a `map`/`Promise.all`/`asyncio.gather`/goroutine fan-out) that issues one or more additional queries *per item* in that list. Also look for one endpoint that fires many independent queries concurrently to assemble a single response (a "dashboard" or "summary" endpoint is the classic offender) - count them. Anything above roughly 5-10 queries for one page load, or any query count that scales with a list length (`3 * N` for N rows), is a finding.

**Why it hurts:** Round-trip latency to the database is fixed cost per query (even a fast query might be 1-5ms of network+parse overhead). 300 queries at 2ms each is 600ms of pure overhead before any actual work happens, and it also holds 300 connections' worth of pool pressure at peak.

**Fix pattern:** Batch the per-item fetch into a single query using whatever your data layer offers for that: a join, an `IN (...)` / batched lookup, a dataloader-style batching utility, or (for aggregation) a single `GROUP BY` query instead of N separate lookups.

### 3. Aggregation done in application memory instead of in the database

**Detect:** Look for code that fetches *all* rows matching a broad filter (no pagination, or a very high limit) and then computes sums/counts/groupings/filters on them in application code (`reduce`, `sum()`, manual loops, in-memory `filter`/`group_by`). A tell-tale sign: pagination metadata (`totalCount`) computed *after* an in-memory filter - this silently breaks pagination because the count no longer matches what the database would return.

**Why it hurts:** Ships the entire table over the wire and into process memory just to throw most of it away, and duplicates work the database engine is specifically optimized to do (aggregate functions, `GROUP BY`, indexed filtering).

**Fix pattern:** Push the aggregation into the query itself - use the database's native `GROUP BY`/aggregate functions, or the document/analytics store's aggregation pipeline. Never filter or count *after* fetching a page; filter/count as part of the query that produces the page.

### 4. Duplicate queries for the same data within one request

**Detect:** Trace a single request's lifecycle end to end (middleware → controller → service → repository). Look for the same entity being fetched by the same key more than once - classically: an auth/session middleware loads the current user, then a handler further down loads "the current user" again; or a service calls the same lookup function twice a few lines apart.

**Why it hurts:** Pure waste - the second fetch returns data the process already has in scope.

**Fix pattern:** Pass the already-fetched entity down through the call chain (function argument, request-scoped context/locals) instead of re-fetching. If threading it through is awkward, a request-scoped cache (a plain map keyed by lookup key, cleared per request) works too.

### 5. Sequential awaited queries inside a loop, especially inside a transaction

**Detect:** A `for`/`for...of`/`for-each` loop where each iteration does an `await`ed (or blocking) query, and the whole loop is wrapped in a database transaction.

**Why it hurts:** Each iteration pays full round-trip latency serially instead of in parallel, and because it's inside a transaction, it's holding row/table locks and a connection for the entire duration - directly causing lock contention and connection pool exhaustion under concurrent load.

**Fix pattern:** Either batch the loop into one multi-row statement (bulk insert/update, `IN` clause), or if the operations are genuinely independent, run them concurrently and keep the transaction as short as possible - don't hold a transaction open across N sequential network round-trips.

### 6. Race conditions in hand-rolled ID/sequence generation

**Detect:** Code that reads "the last ID/number", computes `+1` in application code, then inserts a new row with that value - anywhere this replaces a database-native auto-increment/sequence/UUID.

**Why it hurts:** Two concurrent requests can both read the same "last value" before either insert commits, then both try to insert the same next value - a classic TOCTOU (time-of-check to time-of-use) race, surfacing as intermittent unique-constraint failures under load that are very hard to reproduce locally.

**Fix pattern:** Use the database's native sequence/auto-increment/identity column, or an atomic increment operation, or optimistic-concurrency retry logic. Never compute "next ID" by reading then incrementing in two separate steps outside a single atomic operation.

### 7. Unused or ineffective caching layer

**Detect:** Check whether a cache (Redis, Memcached, in-process LRU) is present in dependencies/config. If so, grep for actual read/write calls to it. It's common to find a cache client configured and never called - or called for one endpoint but not the hot paths (session/auth checks, catalog/lookup data, computed stats).

**Why it hurts:** Every request pays full database cost for data that rarely changes (session validation, reference data, computed aggregates), which is exactly what caching exists to avoid.

**Fix pattern:** Cache-aside pattern on genuinely hot, slow-changing reads: check cache, on miss fetch from DB and populate cache with a sensible TTL, invalidate on write. Start with session/auth lookups and any endpoint identified as a query storm in pattern #2.

### 8. Blocking/synchronous I/O on the request-handling path

**Detect:** In event-loop languages (Node.js, async Python/JS), look for synchronous filesystem calls (anything with a `*Sync` suffix in Node, blocking `open()`/`read()` in a supposedly-async Python handler) or CPU-heavy synchronous work (crypto, image processing, HTML parsing/templating instantiated fresh per request) directly inside a request handler or middleware. In thread-per-request languages this pattern is far less severe (the OS scheduler handles it) but is still a finding if it's slow enough to exhaust the thread pool under load.

**Why it hurts:** On a single-threaded event loop, one blocking call stalls *every other in-flight request*, not just the one that triggered it.

**Fix pattern:** Use the async/non-blocking equivalent API. Move genuinely CPU-heavy work off the request path entirely - a background job/worker queue, or a worker thread/process pool.

## Output format

Produce a report (as a file if the user wants something to keep/share, otherwise inline) structured like this:

```
# Backend Performance & Scalability Audit

## Stack fingerprint
[language, framework, data layer, DB engine(s), cache presence]

## Executive summary
[N findings, grouped by severity: Critical / High / Medium / Low, one line each]

## Findings
### [Pattern name] - [Severity]
- Location: file/module (line numbers if available)
- What's happening: [concrete description of the code, not a template]
- Why it hurts: [quantify if possible - "N queries per request", "O(n) scan on a table with M rows"]
- Fix: [specific, actionable, in the project's actual stack]

## Remediation roadmap
Phase 1 (correctness/cheap wins): indexes, duplicate query removal, sync-I/O fixes
Phase 2 (query shape): collapse N+1s, push aggregation into SQL
Phase 3 (caching & concurrency): cache-aside layer, native sequences
```

Severity guide: **Critical** = scales with data/traffic and is already live in production paths (dashboards, auth, hot endpoints). **High** = clear anti-pattern but on a lower-traffic path. **Medium/Low** = correct-but-suboptimal, or only matters at much larger scale than the app currently has.

Always tie each finding to a concrete file/function you actually found - never present a generic list of "things that could theoretically be wrong" without evidence from the codebase. If you can't access the codebase (only a description was given), say so and audit based on the described architecture instead of inventing specifics.

## Related skills

This skill covers *data access and scalability*. For error handling, retries, timeouts, logging/tracing, and graceful shutdown, use the **backend-resilience-observability** skill. For injection, auth, and input-validation issues, use the **security-audit** skill. Run all three for a complete backend audit - they're kept separate so each stays focused and doesn't bloat.
