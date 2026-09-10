# Backend / Server Performance Checklist (language- & ORM-agnostic)

For each item: what to look for, why it matters, and how to phrase the fix without committing to a specific ORM/DB syntax. Translate to the actual stack once found (e.g. `@@index` in Prisma, `db_index=True` in Django, `CREATE INDEX` raw SQL, an explicit index block in TypeORM/GORM/Eloquent — the *concept* is identical).

## 1. Missing indexes on filtered/joined/sorted columns
**Look for:** schema/model definitions where columns used in `WHERE`, `JOIN`, `ORDER BY`, or foreign keys have no corresponding index. Signature smell: a schema file with dozens of foreign-key columns (`companyId`, `userId`, `status`, `createdAt`-style timestamps) and zero index declarations anywhere.
**Why it matters:** every such query forces a full sequential/table scan instead of an index seek; this degrades linearly-to-worse as table size grows, so it often looks "fine" in dev and falls over in production.
**Fix framing:** add indexes on (a) every foreign key, (b) every column used to filter or sort in a hot-path query, (c) composite indexes for columns that are frequently filtered together (e.g. `(companyId, status)`).

## 2. Installed-but-unused caching layer
**Look for:** a cache client (Redis, Memcached, an in-process LRU cache) present in dependencies/config but never called from the request path — especially in auth/session middleware or expensive read endpoints.
**Why it matters:** every request pays the full DB round-trip cost for data that rarely changes (session lookups, catalogs, aggregate stats), when a cache-aside read could serve most requests in microseconds.
**Fix framing:** introduce a cache-aside pattern — read cache first, on miss read the source of truth and populate the cache with a sane TTL, invalidate on writes. Start with the highest-traffic, most-stable data (session/user lookups, public catalogs, computed stats).

## 3. N+1 queries / query storms (fan-out per item)
**Look for:** a loop or `Promise.all`/`asyncio.gather`/equivalent-concurrency-primitive that issues K queries per item across N items, especially inside a list/batch endpoint. Signature smell: a batch or "get all X with their Y and Z" endpoint whose total query count scales with the *result set size*, not with a fixed constant.
**Why it matters:** a page that should be O(1) or O(log n) queries becomes O(n) or O(k·n), overwhelming the connection pool and causing latency to blow up under real data volumes even though it looked fine with 5 test rows.
**Fix framing:** replace the fan-out with (a) a single query using joins/includes to fetch the item plus its related data in one round trip, or (b) a batching/dataloader pattern that collects all needed IDs and issues one `WHERE id IN (...)` query, or (c) a single query with window functions/subqueries for "top N per group"-style access patterns instead of per-group queries.

## 4. In-memory aggregation instead of engine-level aggregation
**Look for:** code that pulls a full (or entire historical) table/collection into application memory, then computes sums/counts/group-bys/filters with application-language loops (`reduce`, `for` + accumulator, list comprehensions used for aggregation). Extra red flag: filtering out nulls or falsy values *after* fetching a paginated result, which silently breaks the reported total count.
**Why it matters:** the database engine is built to aggregate at the storage layer far more efficiently than shipping every row over the network and looping in the application process; this also causes unbounded memory growth as data grows.
**Fix framing:** push `GROUP BY`, `SUM`, `COUNT`, `AVG`, and filtering into the query itself. If post-fetch filtering is unavoidable, filter *before* applying pagination limits, not after, or recompute the count from a separate aggregate query.

## 5. Redundant duplicate fetches within one request lifecycle
**Look for:** the same entity fetched more than once while handling a single logical request — e.g. an auth/middleware layer that loads "current user," and then the handler loads "current user" again; or a service calling the same lookup function twice within a few lines.
**Why it matters:** free correctness win available almost for free — the data hasn't changed between the two calls, so the second call is pure waste.
**Fix framing:** attach the already-fetched entity to the request/context object and read it from there downstream, or memoize the lookup for the lifetime of the request (a per-request cache/dataloader), rather than caching across requests.

## 6. Sequential awaited calls inside a transaction / lock scope
**Look for:** a `for`/`for...of`/`for await` loop making one awaited database call per iteration *inside* an open transaction.
**Why it matters:** each awaited call inside the loop is a network round trip while the transaction still holds row/table locks, multiplying the lock-held duration by N and starving the connection pool under concurrent load — a classic cause of intermittent deadlocks/timeouts that don't show up until production traffic.
**Fix framing:** replace the loop with a single bulk insert/update/upsert statement, or restructure so the loop runs *before* opening the transaction (prepare all data in memory, then do one batched write inside a short transaction).

## 7. Race conditions from read-then-write ID/sequence generation
**Look for:** logic that reads "last ID"/"last sequence number," computes `+1` in application code, then inserts — instead of using the database's native atomic sequence/auto-increment, or an explicit locking read (`SELECT ... FOR UPDATE`)/atomic increment.
**Why it matters:** two concurrent requests can read the same "last value" before either writes, producing duplicate keys — visible as intermittent unique-constraint failures under load that are hard to reproduce locally.
**Fix framing:** use the database's native sequence/auto-increment/identity feature, or wrap the read+increment+write in an atomic operation (row lock, `INSERT ... ON CONFLICT`, or a dedicated atomic counter service) rather than plain read-then-write.

## 8. Blocking / synchronous work inside an async request pipeline
**Look for:** synchronous filesystem calls, synchronous crypto/compression, or heavyweight object construction (e.g. instantiating a full DOM/parser) done unconditionally inside a request handler that's otherwise async.
**Why it matters:** in single-threaded or event-loop-based runtimes, one blocking call stalls *every other concurrent request* being served by that process, not just the one that triggered it.
**Fix framing:** use the async/non-blocking equivalent API, move genuinely heavy work to a background worker/queue, and only construct expensive objects lazily/once (not per-request) when the work is stateless and reusable.

## 9. Pagination gaps and over-fetching relational graphs
**Look for:** endpoints that load an entire relation graph (many joined tables deep) just to check existence or toggle a status; "get all" endpoints with no `LIMIT`/page size; batch endpoints that load every historical record before slicing in application code.
**Why it matters:** over-fetching wastes DB and network bandwidth proportional to data size and defeats the purpose of pagination entirely if the "page" is carved out of an in-memory array after loading everything.
**Fix framing:** fetch only the columns/relations actually needed for the operation (existence check ≠ full graph); always paginate at the query level (`LIMIT`/`OFFSET` or cursor-based), never in application memory.

## 10. Security-adjacent logic gaps that are also scalability/correctness bugs
**Look for:** expiry/validity checks that silently pass because they parse an undefined/missing field (e.g. `parseDate(undefined)` evaluating to "not expired"); disabled rate limiting; hardcoded paths that don't match the deployment environment; validation that happens *after* the expensive operation (e.g. checking file size after the whole file is already uploaded/processed).
**Why it matters:** these are cheap to fix and often high severity — they weren't caught by normal testing because the "happy path" masks them, but they fail open under real traffic or attack.
**Fix framing:** treat any expiry/permission check that can silently no-op on missing data as a bug, add an explicit "value is missing → treat as invalid/expired" branch, re-enable rate limiting before production, and validate cheap constraints (size, type, auth) before doing expensive work.

## 11. Missing error handling, timeouts, and retry strategy on outbound calls
**Look for:** calls to another service, database, or third-party API with no timeout set (relying on the runtime's default, which is often "wait forever" or absurdly long), no retry logic for transient failures, and no distinction between "safe to retry" (idempotent reads) and "dangerous to retry" (a non-idempotent write like charging a card or creating a ticket).
**Why it matters:** one slow/hung downstream dependency can cascade — requests pile up waiting, threads/connections exhaust, and the whole service goes down even though the actual failure was in one dependency. Blind retries on non-idempotent writes cause duplicate side effects (double charges, duplicate records).
**Fix framing:** set explicit timeouts on every outbound call; add bounded retries with exponential backoff + jitter for transient/idempotent operations only; for non-idempotent writes, use an idempotency key so a retried request is safely deduplicated server-side; consider a circuit breaker around a dependency that's failing repeatedly so the service stops hammering it and fails fast instead.

## 12. No graceful degradation when a dependency is down
**Look for:** a single failing dependency (cache, search index, a "nice to have" third-party API) taking down an entire request or the whole app, instead of the app falling back to a degraded-but-working mode.
**Why it matters:** availability of the core flow (e.g. checkout) shouldn't depend on availability of a non-critical add-on (e.g. a recommendations widget); coupling them turns a minor outage into a major one.
**Fix framing:** identify which dependencies are load-bearing vs. optional per request path, and wrap optional ones in a try/fallback so their failure degrades a feature rather than breaking the whole response.

## 13. No structured observability (logs, metrics, traces, correlation IDs)
**Look for:** logging that's plain `console.log`/`print`-style text with no structure, severity level, or request/correlation ID tying related log lines together; no metrics emitted for request latency, error rate, or queue depth; no distributed tracing across service boundaries.
**Why it matters:** most of the anti-patterns in this checklist are only *findable in production* through observability — "54 queries per dashboard load" is invisible without query-count metrics or tracing. Without a correlation ID, debugging a single failed request across logs from multiple services/instances is close to impossible.
**Fix framing:** log in structured (JSON or key-value) format with a severity level and a request/correlation ID propagated through the whole call chain; emit basic RED metrics (Rate, Errors, Duration) per endpoint; add tracing spans around DB calls and outbound requests so slow paths are visible without guessing.

## 14. Missing health/readiness checks and ungraceful shutdown
**Look for:** no `/health` or `/ready` endpoint distinguishing "process is up" from "process is actually able to serve traffic" (DB connected, cache reachable); no handler for shutdown signals (SIGTERM) that stops accepting new requests, finishes in-flight ones, and closes DB/cache connections cleanly before exiting.
**Why it matters:** orchestrators (load balancers, container schedulers) route traffic based on health checks — without a real readiness check, traffic gets sent to instances that are up but not actually able to serve requests (e.g. still connecting to the DB). Without graceful shutdown, every deploy or autoscale-down event drops in-flight requests.
**Fix framing:** implement liveness (process is running) and readiness (dependencies are reachable) as separate checks; on shutdown signal, stop accepting new connections, let in-flight requests finish (with a timeout), then close DB/cache/queue connections before exiting.

## 15. Unvalidated input reaching queries, shell commands, or file paths
**Look for:** user-supplied input concatenated directly into a query string instead of using parameterized queries/prepared statements; input passed to a shell command or file-path constructor without sanitization; missing schema validation at the API boundary (request bodies trusted as-is).
**Why it matters:** this is the most common path to SQL injection, command injection, and path traversal — and it's also a reliability issue, since malformed input that would've been caught by validation instead reaches deeper layers and fails in confusing ways.
**Fix framing:** validate/parse every request body, query param, and path param against an explicit schema at the boundary before it reaches business logic; always use parameterized queries, never string-concatenated SQL; never pass raw user input to a shell command; normalize and constrain file paths built from user input.

---
### Backend audit pass order (recommended)
1. Schema/model definitions (indexes, relations)
2. Auth/session middleware (duplicate fetches, cache usage)
3. Any "dashboard" / "stats" / "analytics" endpoint (aggregation location, query count)
4. Batch/list endpoints (N+1, pagination)
5. Write paths that loop (transactions, sequence generation)
6. Anything touching the filesystem or heavy object construction synchronously
7. Config: is a cache/queue installed but never wired up? Is rate limiting active?
8. Outbound calls to other services/DBs (timeouts, retries, idempotency, circuit breakers)
9. Observability: logging format, correlation IDs, metrics, tracing, health/readiness endpoints
10. Process lifecycle: shutdown signal handling, connection draining
11. API boundary: request validation schemas, parameterized queries, path/shell input handling
