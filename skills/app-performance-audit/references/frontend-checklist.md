# Frontend / Client Performance Checklist (framework-agnostic)

Written in framework-neutral terms ("global store", "component tree", "data-fetching layer") so it applies to React, Vue, Angular, Svelte, or any component-tree UI framework with a client-side data cache. Translate to the actual APIs once you've found the pattern (React Context + useMemo, Vue provide/inject + computed, Angular services + signals, etc.).

## 1. Root/global state re-created on every update, forcing tree-wide re-renders
**Look for:** a root-level provider/store (auth, cart, wishlist, theme) whose exposed value is a freshly-created object/array literal or freshly-created function on every render, with no memoization.
**Why it matters:** when this provider wraps the whole app, *every* consumer re-renders on *any* state change anywhere in that store, even components with no visible change — this is the single highest-leverage fix in most SPA audits because it's one file causing app-wide slowness.
**Fix framing:** memoize the exposed context/store value (stable object reference unless its actual contents changed) and memoize the handler functions it exposes, so consumers only re-render when the specific slice of state they read actually changes.

## 2. Eager over-fetching of large reference/lookup data on page mount
**Look for:** a page/table component that fires several data requests immediately on mount, several of which fetch large lookup lists (hundreds+ of rows) that are only needed if the user opens an edit/create modal or a specific rarely-used view.
**Why it matters:** navigating to a list page pays the full cost of every possible interaction on that page up front, even for users who never open the modal — this inflates time-to-interactive and wastes bandwidth/server load per navigation.
**Fix framing:** gate those fetches behind the actual trigger (fetch on modal open, not on page mount), or lazily fetch on first interaction, with the data-fetching layer's conditional/"enabled" mechanism if available.

## 3. Client-side filtering/search applied to an already-paginated server response
**Look for:** a search/filter input whose handler filters the *current page's* in-memory array instead of sending the search term to the server and re-querying.
**Why it matters:** this silently breaks search for any item not on the current page — a classic "search returns 0 results" bug that's easy to miss in testing (dev data fits on one page) and guaranteed to surface in production.
**Fix framing:** pass filter/search parameters to the server query so filtering happens against the full dataset, and treat "filter on already-paginated data" as always a bug, never an acceptable shortcut.

## 4. Server state duplicated into local component state
**Look for:** data already tracked by the data-fetching/cache layer (server state) copied into local component state via an effect (`useEffect`-style sync), creating two sources of truth for the same value.
**Why it matters:** the two copies can drift out of sync, and the sync effect causes an extra render pass on every update — strictly worse than reading the server-state value directly.
**Fix framing:** read server state directly from the data-fetching layer's cache wherever possible; only lift it into local state if you need to fork a locally-editable draft, and even then, reset that draft explicitly rather than syncing continuously.

## 5. Filter/pagination/tab state trapped in component memory instead of the URL
**Look for:** search text, active tab, filters, and current page number stored only in `useState`/local component state, with nothing reflected in the URL's query parameters.
**Why it matters:** refreshing the page or using the browser back button silently wipes all active filters, and the current view can't be bookmarked, shared, or linked to.
**Fix framing:** move filter/pagination/tab state into URL search parameters (read on mount, write on change) so state survives refresh/back-navigation and views become shareable links.

## 6. Missing conditional gating on data-fetching hooks
**Look for:** a query/fetch hook that fires unconditionally even when its required inputs (an ID, a selected item, an auth token) aren't ready yet, relying on error handling to paper over the resulting failed/empty request.
**Why it matters:** wastes a request per render cycle until the dependency is ready, and can cause flicker or misleading error states while waiting.
**Fix framing:** gate the fetch on a readiness condition (the data-fetching layer's conditional/`enabled`-style mechanism, or a simple guard before calling fetch) so it only runs once its inputs are valid.

## 7. Large unmemoized list/table rows with inline callbacks
**Look for:** a table/list rendering hundreds of rows where each row is a non-memoized component, and event handlers (`onClick`, `onChange`) are created inline as new closures on every parent render.
**Why it matters:** a new inline function reference every render defeats memoization even if the row component itself were memoized, and re-rendering hundreds of DOM rows on unrelated state changes (e.g. a sidebar toggle) causes visible jank.
**Fix framing:** memoize row components, hoist or stabilize handler creation (pass IDs and a stable handler rather than a fresh closure per row), and consider list virtualization for genuinely large lists.

## 8. Duplicated/inconsistent cache keys preventing request deduplication
**Look for:** the same logical resource fetched from multiple places in the codebase using slightly different cache-key shapes or naming (e.g. one screen keys by `['users', page]`, another by `['user-list', page, filters]` for the same underlying data).
**Why it matters:** the data-fetching cache can't recognize these as the same resource, so it can't deduplicate concurrent requests or share/invalidate cached data correctly — you pay for the same fetch multiple times and can end up with stale views after a mutation.
**Fix framing:** define a single canonical key-builder/hierarchy per resource type and have every screen/hook that needs that resource go through it, so caching and invalidation work as intended.

## 9. State bloat: many discrete state variables instead of one cohesive model
**Look for:** a container/hook with a dozen-plus independent `useState`-style declarations tracking closely related concerns (e.g. separate booleans for "loading," "modal open," "selected item," "form errors" that always change together).
**Why it matters:** harder to reason about invalid combinations (e.g. modal open with no selected item), and each independent state setter triggers its own render pass instead of one coherent update.
**Fix framing:** consolidate related state into a single reducer/state object with well-defined transitions, so related fields update atomically and invalid combinations become unrepresentable.

## 10. Dead code paths: unused effects, dangling listeners, unused hook returns
**Look for:** event listeners registered without matching cleanup, effects whose dependency lists don't match what they actually reference, or hook return values that are destructured but never used anywhere downstream.
**Why it matters:** dangling listeners accumulate across mounts/unmounts (memory leak, duplicate event firing), and unused complexity makes the codebase harder to audit for the *other* nine issues on this list.
**Fix framing:** always pair a subscribe/listen with its corresponding cleanup in the same effect, and remove hook outputs that nothing consumes.

## 11. Missing error boundaries and unhandled fetch failures
**Look for:** no error-boundary component wrapping route/screen trees, so one unhandled exception anywhere in the tree blanks the whole app to a white screen; data-fetching calls with no error state handling, leaving the UI stuck on a loading spinner or silently showing stale/empty data when a request fails.
**Why it matters:** a single bad render or failed request shouldn't take down the entire app for the user — production traffic guarantees edge cases (flaky network, unexpected null field) that dev testing rarely hits.
**Fix framing:** wrap route-level (and ideally widget-level) trees in error boundaries with a real fallback UI, not just a blank screen; handle the error state of every data-fetching hook explicitly (retry affordance, clear error message) rather than leaving it implicit.

## 12. Unmanaged bundle size and lack of code-splitting
**Look for:** a single monolithic JS bundle with no route-based or component-based code-splitting; large libraries imported in full when only a small piece is used; no bundle-size budget or analysis in the build pipeline.
**Why it matters:** users pay the download/parse/execute cost of code for screens they may never visit before they can interact with anything — directly hurts time-to-interactive, which is disproportionately punishing on slow networks/devices.
**Fix framing:** split code at the route level at minimum (lazy-load route bundles), import only the needed pieces of large libraries, and add a bundle-size check to CI so regressions are caught before merge, not after users complain.

## 13. Core Web Vitals / perceived performance not addressed
**Look for:** unsized images/media causing layout shift as they load; render-blocking resources in the initial load path; no distinction between critical above-the-fold content and everything else; large synchronous computations run on the main thread during interaction.
**Why it matters:** Largest Contentful Paint, Cumulative Layout Shift, and Interaction-to-Next-Paint are the metrics users actually feel as "this app feels slow/janky," independent of raw network speed — and they're measurable, not vibes.
**Fix framing:** reserve space for images/media before they load (explicit dimensions), prioritize critical-path CSS/content, defer non-critical scripts, and move heavy synchronous work off the main thread (web workers, chunking) where it blocks interaction.

## 14. Accessibility gaps (a11y)
**Look for:** interactive elements built from non-semantic `div`/`span` with click handlers instead of `button`/`a`/native form controls; missing labels on form inputs; no keyboard navigation path through modals/menus; color as the only signal for state (error/success) with no text/icon backup; missing `alt` text on meaningful images.
**Why it matters:** this excludes real users (keyboard-only, screen-reader, low-vision) from using the app at all, not just a "nice to have" — and in many jurisdictions/industries it's a legal compliance requirement, not an option.
**Fix framing:** use semantic HTML elements for interactive controls, label every form input, ensure modals/menus trap and restore focus correctly and are fully keyboard-operable, and never rely on color alone to convey state.

## 15. Unescaped output / XSS surface
**Look for:** user-supplied or third-party content rendered via a "trust this as raw HTML" API (e.g. `dangerouslySetInnerHTML`-equivalent) without sanitization; URLs built from user input passed directly into `href`/`src` without validating the scheme (e.g. blocking `javascript:`).
**Why it matters:** this is the most common client-side injection vector — rendering unsanitized user content as HTML lets an attacker run arbitrary script in another user's session.
**Fix framing:** default to escaped text rendering everywhere; if raw HTML rendering is genuinely required, run it through a sanitization library first and validate URL schemes before using user-supplied URLs in `href`/`src`.

---
### Frontend audit pass order (recommended)
1. Root providers/global store (item 1) — highest blast radius, check first
2. Data-fetching layer defaults (stale time, cache time, key hierarchy — items 6, 8)
3. Each major list/table screen (items 2, 3, 7, 9)
4. Shared hooks like auth/cart/session (item 4)
5. Routing/URL handling for filters (item 5)
6. Sweep for dangling effects/listeners (item 10)
7. Route tree: error boundaries and unhandled fetch-error states (item 11)
8. Build output: bundle-size/code-splitting audit (item 12)
9. Core Web Vitals pass on the primary user flow (item 13)
10. Accessibility pass on forms, modals, and interactive controls (item 14)
11. Sweep for raw-HTML rendering and unvalidated URLs (item 15)
