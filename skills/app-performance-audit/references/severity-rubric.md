# Severity Rubric

Apply consistently across backend and frontend findings so the summary table means the same thing everywhere in the report.

| Severity | Definition | Typical examples |
|---|---|---|
| **Critical** | Actively breaks correctness for users today, or causes outage-level failure under realistic (not extreme) production load. Affects a core, high-traffic flow. | Search returns zero results past page 1; a race condition causes intermittent write failures; a root store re-render freezes the whole dashboard; an auth check silently passes invalid tokens. |
| **High** | Doesn't break correctness right now, but scales badly and will cause user-visible pain (latency, failed requests) as data or traffic grows, or duplicates significant work on every request. | 50+ queries on one dashboard load; 1,000-row eager fetch on every table mount; missing indexes on frequently-queried foreign keys; duplicated cache keys breaking dedup. |
| **Medium** | Real inefficiency with a clear fix, but bounded blast radius — a single screen, a single endpoint, or an effect that only fires occasionally. | Unmemoized derived computation on a medium-sized list; state bloat in one container; non-transactional multi-step write with a normal (not high-concurrency) call pattern. |
| **Low** | Best-practice / hygiene issue with negligible measured impact today, but worth fixing for maintainability or to prevent future regressions. | Missing memo on a static header; duplicate icon-mapping object re-created per render; unused hook return value. |

When in doubt between two levels, ask: "If traffic/data grew 10x, would this become a user-facing incident?" — if yes, round up.
