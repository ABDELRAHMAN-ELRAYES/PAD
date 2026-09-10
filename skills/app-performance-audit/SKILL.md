---
name: app-performance-scalability-audit
description: >-
  Use whenever the user asks for a performance/scalability audit, a production-readiness check, "why is this slow", an efficiency-focused code review, or a health-check of a backend service or frontend/SPA, in any language or framework or database/ORM. Also trigger for "review the architecture", "find bottlenecks", "find N+1 queries", "check for re-render issues", "is this ready for production", or a written audit report / remediation roadmap. Covers two dimensions: efficiency (indexes, caching, N+1 queries, in-memory aggregation, duplicate fetches, transaction locking, ID race conditions, blocking I/O, unmemoized global state, over-fetching, client-side filtering, URL state) and production-hardening (timeouts/retries/idempotency, graceful degradation, observability, health checks, graceful shutdown, input validation, error boundaries, bundle size, Core Web Vitals, accessibility, XSS). Skip for narrow "why is this one function slow" questions — answer those directly.
---

# Application Performance, Scalability & Production-Readiness Audit

A structured, language- and framework-agnostic method for auditing a codebase (backend, frontend, or both) across two dimensions — **efficiency** (is it fast/scalable) and **hardening** (will it survive real production conditions: failures, restarts, malicious input, real users on real devices) — and writing the findings up in a consistent, actionable report.

This skill does **not** assume any specific stack. The anti-patterns below are described by *shape*, not by API name, so they apply equally to Prisma/TypeORM/SQLAlchemy/ActiveRecord/GORM/Eloquent, and to React/Vue/Angular/Svelte.

## When to go deep vs. stay light

- **Quick question about one function/component** ("is this query slow?") → just answer directly, no need for the full workflow.
- **"Audit my backend/frontend/repo"**, "find bottlenecks", "review architecture for scale" → run the full workflow below.

## Workflow

1. **Scope the audit.** Ask (or infer from the repo) whether the target is the backend, the frontend, or both. Identify the stack (language, framework, ORM/DB, state-management library) only so you can *translate* the generic anti-patterns into that stack's idioms — never assume a specific one going in.
2. **Load the relevant checklist.**
   - Backend/server code → read `references/backend-checklist.md`
   - Frontend/client (SPA, mobile-web, admin dashboard) code → read `references/frontend-checklist.md`
   - Load both if the audit spans full-stack.
3. **Walk the codebase systematically**, not just grep for keywords. For backend: go layer by layer (routes/controllers → services → repositories/data-access → schema). For frontend: go screen by screen (root providers/store → route/page → data-fetching hooks → list/table components).
4. **For every finding**, capture: exact file + line reference, a short code excerpt or description of the pattern, the concrete impact (e.g. "N queries become 1", "avoids full tree re-render"), and a severity (Critical / High / Medium / Low) using the rubric in `references/severity-rubric.md`.
5. **Write the report** using the structure in `references/report-structure.md`. Keep it in the user's repo conventions (Markdown, with a top-level summary + a deep-dive doc) — see that file for the exact recommended layout and naming.
6. **Propose a phased remediation roadmap**, not a wall of fixes: Phase 1 = cheap/safe/high-impact (indexes, fixing an obvious bug, removing a duplicate query), Phase 2 = query/render consolidation, Phase 3 = caching/concurrency infra, Phase 4 = deeper architectural change (queues, streaming uploads, state libraries).
7. If asked to also *fix* the issues, fix Phase 1 items directly when safe; for Phase 2+ show the diff/pattern and ask before applying broad refactors, since those touch many files.

## Core principle behind every finding

Almost every issue in both checklists is a variant of one of these four root causes — lead with whichever applies when explaining a finding to the user, it builds their intuition faster than the specific fix:

1. **Work is done per-row/per-request in application code that the underlying engine (database, rendering engine) could do once, in bulk.** (N+1 queries, in-memory `reduce()` instead of `GROUP BY`, re-rendering a whole tree instead of one node.)
2. **State that should have one source of truth is duplicated**, and the copies drift out of sync or get refetched needlessly. (Server data copied into local component state; the same "current user" fetched twice in one request.)
3. **Something expensive or blocking runs unconditionally** when it should be lazy, cached, or gated on actual need. (Unused cache layer; eager fetch of 1,000 lookup rows for a modal that might never open; synchronous file I/O in an async pipeline.)
4. **An operation that must be atomic is implemented as read-then-write**, creating a race window. (Manual "get last ID, add 1, insert" sequences; check-then-act permission logic.)

Use `references/backend-checklist.md` and `references/frontend-checklist.md` for the concrete, stack-agnostic patterns to look for and how to phrase remediation. Items 1-10 in each are efficiency/scalability patterns; items 11-15 are production-hardening patterns (resilience, observability, security-at-the-boundary, and — for frontend — error boundaries, bundle size, Core Web Vitals, accessibility, XSS surface). If the user only asked about "performance," you can scope to items 1-10, but flag that a full production-readiness pass would also cover 11-15.
