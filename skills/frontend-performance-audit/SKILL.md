---
name: frontend-performance-audit
description: Audit frontend/client codebases for rendering and data-management anti-patterns - unmemoized context/state causing tree-wide re-renders, eager over-fetching of data that's only needed conditionally, client-side filtering applied to already-paginated server data, server state duplicated into local state, filters/pagination trapped in component memory instead of the URL, and monolithic unmemoized components. Use this whenever the user asks for a "frontend performance audit", "why does my app feel laggy", "re-render" issues, or a review of state management/data-fetching - regardless of framework (React, Vue, Svelte, Angular, SolidJS, etc.) or data-fetching library. Trigger even from a single symptom like "typing in search feels janky" or "the table takes forever to load" since those usually trace back to one of these patterns.
---

# Frontend Rendering & State-Management Performance Audit

The specific APIs differ across frameworks, but the underlying mistakes that make a UI feel slow are the same everywhere: doing more re-rendering, re-computation, or data-fetching than the current screen actually needs. This skill is a framework-agnostic methodology - identify the framework and state/data-fetching libraries in use first, then map each pattern onto their actual equivalents.

## Why this matters

Frontend performance bugs are uniquely invisible to their author: on a fast dev machine with a small dataset, an extra re-render or an over-fetched 1,000-row lookup list feels instant. The same code on a mid-range phone, a large dataset, or after the app has grown a few more consumers of a shared context becomes visibly laggy typing, frozen tables, and "why does clicking anything re-render the whole sidebar."

## Before you start: fingerprint the stack

- Framework (React, Vue, Svelte, Angular, Solid, etc.) and rendering model (virtual DOM diffing vs. fine-grained reactivity - this changes how severe "unmemoized re-render" findings are; fine-grained-reactivity frameworks are naturally more resistant to some of these)
- Global/shared state approach: Context API, a state-management library (Redux/Zustand/Pinia/etc.), or prop drilling
- Server-state/data-fetching approach: a dedicated library (TanStack Query, SWR, Apollo, RTK Query) or manual `fetch`-in-`useEffect`-style code
- Routing library and whether it exposes URL search params as a state primitive

## The pattern catalog

### 1. Unmemoized shared state causing tree-wide re-render cascades

**Detect:** Find where global/shared state is provided (a context provider near the app root, a store setup). Is the value passed down (the context value object, or handler functions defined inline) recreated on every render of the provider, or is it memoized? A provider sitting near the app root with an unmemoized value is the worst case - it invalidates every component that reads from it, everywhere in the tree, on every state change anywhere in that provider.

**Why it hurts:** In diffing-based rendering models, a new object/function reference looks like "this changed" even if the actual data inside is identical, forcing every subscriber to re-render regardless of whether it uses the part that changed.

**Fix:** Memoize the context/store value itself (not just its contents) so it only changes reference when the actual data changes, and memoize handler functions so they have a stable identity across renders. Where the framework supports splitting state into more granular pieces (multiple smaller contexts/stores instead of one large one), prefer that so a change in one slice doesn't invalidate consumers of unrelated slices.

### 2. Eager over-fetching of conditionally-needed data

**Detect:** On a page/table that has an "add" or "edit" modal, does mounting the *list* page immediately fire requests for data that's only needed *inside* the modal (large lookup/reference lists, options for dropdowns)? Count the requests fired on initial mount vs. what's needed to render what's actually visible.

**Why it hurts:** Every navigation to a list page pays the cost of large lookup fetches that most visits never need, multiplying unnecessary load on both the client and the backend for data that's frequently large (hundreds to thousands of rows) precisely because it's "just a lookup list, no pagination needed."

**Fix:** Gate the fetch so it only fires when the data is actually needed - conditional/lazy queries triggered by opening the modal, not by mounting the page. Most data-fetching libraries have an explicit mechanism for this (an `enabled`/`skip` flag or lazy-trigger pattern); use it rather than firing on mount and hoping the response arrives before anyone needs it.

### 3. Client-side filtering applied to server-paginated data

**Detect:** Find the search/filter UI on any list/table backed by server pagination. Does the search term actually get sent to the server as a query parameter, or does the client just run `.filter()`/`.includes()` on the current page's already-fetched rows?

**Why it hurts:** This doesn't just underperform - it's outright broken. Filtering only the current page's 10-20 rows means searching for anything not on the currently-viewed page silently returns zero results, which looks to the user like the data doesn't exist.

**Fix:** Pass the search/filter state to the server as part of the query (query params, request body), let the server apply it against the full dataset, and reset to page 1 when the filter changes since the result set size changes.

### 4. Server state duplicated into local component state

**Detect:** Does data that a data-fetching library already manages (loading/error/data state) get copied into separate local state via an effect (`useEffect` that calls `setUser(data)` when a query resolves, for instance) rather than being read directly from the fetching library's own state?

**Why it hurts:** Creates two sources of truth that can drift out of sync (the query refetches and updates its own cache, but the copied local state doesn't update until the effect re-runs, if it does at all), plus an extra render pass for the copy step itself.

**Fix:** Read server state directly from the data-fetching library's hook/selector wherever it's needed, rather than mirroring it into local state. Local state should be reserved for genuinely client-only state (form input before submission, UI toggle state).

### 5. Filters and pagination trapped in component memory instead of URL state

**Detect:** Are filter tab selections, search terms, and page numbers stored in local component state, or reflected into the URL (query string/search params)?

**Why it hurts:** Refreshing the page, using the browser back button, or sharing a link all silently lose the user's current filter/page context when it only lives in memory - each feels like a bug to the user even though no error occurred.

**Fix:** Store filter/pagination state in the URL's search params (via the router's URL-state APIs) as the source of truth, and derive component state from the URL rather than the other way around.

### 6. Monolithic components with inline callbacks and unmemoized rows

**Detect:** Very large single-file page components (hundreds of lines, many `useState`/local-state calls) that render a list where each row is defined inline with new callback functions created on every parent render, and no memoization on the row component itself.

**Why it hurts:** Every parent re-render recreates every row's callbacks and re-renders every row, even rows whose underlying data didn't change - this scales badly as table size grows, turning routine interactions (typing in an unrelated field, opening a menu) into full-table re-renders.

**Fix:** Extract list rows into their own memoized component, pass stable callback references (memoized at the parent, or restructured so the row receives an ID and looks up its own handler rather than receiving a freshly-bound closure), and split monolithic page components into smaller pieces so unrelated state doesn't force everything to re-render together.

### 7. Duplicated/inconsistent query keys preventing cache deduplication

**Detect:** For libraries that cache by key (TanStack Query, SWR, Apollo), check whether logically-identical requests use consistent, structured keys, or whether different parts of the codebase construct slightly different key shapes for the same data (causing the library to treat them as different cache entries and fetch redundantly).

**Why it hurts:** Defeats the entire purpose of a caching data-fetching layer - the same data gets fetched and cached multiple times under different keys instead of being shared and deduplicated.

**Fix:** Establish a canonical, hierarchical key structure per resource (e.g. `['tickets', 'list', filtersObject]`, `['tickets', 'detail', id]`) and always construct keys through a shared factory/helper rather than inline at each call site.

## Output format

```
# Frontend Performance & State-Management Audit

## Stack fingerprint
[framework, state approach, data-fetching library, routing library]

## Summary
| Severity | Count | Primary impact |
Critical / High / Medium / Low rows

## Findings
### [Pattern] - [Severity]
- Location: file/component
- What's happening: [concrete]
- Impact: [re-render cascade scope, request count, or "broken" if it's a correctness bug like #3]
- Fix: [specific to the framework/library in use]

## Remediation plan
Sprint 1 (quick wins): memoize context values, add enabled/skip gating, fix broken client-side search
Sprint 2 (high-impact): URL state sync, split monolithic components, canonical query keys
Sprint 3+ (structural): remove server-state duplication, extract memoized row components broadly
```

Treat correctness bugs masquerading as performance issues (like client-side filtering that returns wrong results, not just slow ones) as Critical regardless of how small the code change looks - a search that silently returns zero results is worse than one that's merely slow.

## Related skills

This skill covers rendering/state/data-fetching performance. For error boundaries, bundle size, image optimization, Core Web Vitals, and accessibility, use **frontend-production-readiness**.
