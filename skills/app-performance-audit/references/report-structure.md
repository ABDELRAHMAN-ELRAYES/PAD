# Report Structure & File Layout

A two-tier structure works best: one short, skimmable summary, and one deep-dive document with full evidence. This mirrors what tends to actually get read — most stakeholders read the summary; engineers doing the fixes open the deep-dive.

## Recommended file layout (drop into the repo, not framework-specific)

```
docs/audits/
├── PERFORMANCE_AUDIT_SUMMARY.md      # short: top findings + severity table + roadmap
├── BACKEND_PERFORMANCE_AUDIT.md      # deep-dive: backend only (skip if not in scope)
├── FRONTEND_PERFORMANCE_AUDIT.md     # deep-dive: frontend only (skip if not in scope)
```

If only one side is audited, still use the two-tier pattern (`..._SUMMARY.md` + one deep-dive), don't collapse to a single file — it stays easier to keep the summary current as fixes land.

Avoid scattering near-duplicate copies of the same report across multiple locations/names ("_copy", a root-level version and a `documents/` version, etc.) — pick one canonical path per document and link to it from anywhere else it's referenced, rather than maintaining parallel copies that drift out of sync.

## Summary document structure

1. **One-line scope statement** — what was audited (backend/frontend/both), and a link to the deep-dive doc(s).
2. **Severity table** — counts by severity with 1-line description of primary impact areas per severity (see `severity-rubric.md`).
3. **Optional architecture diagram** — a simple flow diagram (Mermaid is fine) showing where in the request/render path the top issues occur. Keep it to the top 3-5 issues, not every finding — it's meant to build intuition fast, not enumerate everything.
4. **Top findings (3-5 max)** — one paragraph each: location, impact, one-line fix direction. Full detail belongs in the deep-dive doc, not here.
5. **Prioritized remediation roadmap** — phased (see below), not a flat list.

## Deep-dive document structure

1. **Stack/codebase inventory** — what was detected (languages, frameworks, layers), so a reader can judge whether the audit covered their area of concern.
2. **Findings by module/screen/feature** — grouped by the natural unit of the codebase (one backend module, one frontend screen), each finding with: exact file + line reference, code excerpt or precise description, why it matters, and a concrete fix (code-level where reasonable). Tag each finding as **Efficiency** or **Hardening** (see checklist item numbering) so a reader can filter to what they care about.
3. **Cross-cutting issues** — patterns that show up in more than one module (e.g. "every list screen has the same eager-fetch pattern") — worth calling out once rather than repeating identically N times.
4. **Data-layer / rendering-layer configuration review** — global defaults that affect everything downstream (cache TTLs and stale-time settings on the backend/frontend data layer, connection pool size, query client defaults).
5. **Prioritized remediation plan** — same phases as the summary, but with enough detail to actually execute each item.

## Phased remediation roadmap (use this framing in both documents)

- **Phase 1 — Immediate / cheap / safe**: fixes that are low-risk and don't require broad refactors — add missing indexes, fix an obviously-wrong conditional, remove a duplicate fetch, swap a blocking call for its async equivalent, re-enable disabled safety middleware.
- **Phase 2 — Query/render consolidation**: collapse many queries/renders into few — batch fan-out queries into joins, push in-memory aggregation into the engine, memoize root state/handlers, gate eager fetches.
- **Phase 3 — Caching & concurrency infrastructure**: wire up the cache-aside layer, replace manual ID generation with atomic primitives, add request-scoped memoization.
- **Phase 4 — Structural/architectural**: background job queues for heavy work, streaming uploads, state-management library adoption, URL-state routing overhaul.

Keep the roadmap actionable — each phase item should be a task someone can pick up, not a restatement of the finding.
