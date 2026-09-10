---
name: frontend-production-readiness
description: Audit frontend applications for production-readiness gaps that pure render-performance reviews miss - missing error boundaries/crash containment, unmanaged bundle size and lack of code-splitting, unoptimized images, poor Core Web Vitals (LCP/CLS/INP), and accessibility gaps (missing semantics, keyboard navigation, screen-reader support, color contrast). Use this whenever the user asks "is this ready to ship", "will this pass a Lighthouse audit", "accessibility review", "a11y audit", "bundle is too big", or asks about Core Web Vitals - regardless of framework. Also trigger this alongside any frontend performance or code review, since these are the gaps that make an app that "renders fast" still ship broken to real users on slow connections, older devices, or assistive technology.
---

# Frontend Production Readiness Audit

A frontend can have zero rendering/state anti-patterns and still be unusable in production: a JS error takes down the whole page instead of one widget, a 4MB bundle makes the app unusable on a slow connection, unoptimized images blow the loading budget, and a screen reader user can't operate the app at all. This skill covers exactly the areas a render-performance audit doesn't.

## Why this matters

Render-performance work (memoization, avoiding re-renders) matters once the app has *loaded* and *renders correctly for everyone*. These five areas are what determine whether it gets to that point at all, and for how many real users - not just the developer on a fast laptop with a mouse and a fast connection.

## 1. Error boundaries / crash containment

**Detect:** Is there an error boundary (or framework equivalent - error boundary component, `errorCaptured` hook, global error handler) wrapping major sections of the app, or does an unhandled render error take down the entire page to a blank white screen? Check specifically around risky sections: third-party widget embeds, data-dependent rendering where the data shape isn't fully guaranteed, and anything wrapped around route-level components.

**Why it hurts:** Without containment, one component throwing during render (a null field from an API response, a third-party script error) crashes the entire application for the user, when it should have been contained to just that section.

**Fix:** Wrap route-level components and any risky/third-party sections in error boundaries with a sensible fallback UI, and report the caught error to your error-tracking/observability tool rather than silently swallowing it.

## 2. Bundle size & code-splitting

**Detect:** Check the production build output size (most build tools can print or analyze this - a bundle analyzer, build stats output). Is the entire application shipped as one bundle, or is it split by route/feature so a user visiting one page doesn't download code for every other page? Check for accidentally-bundled heavy dependencies (a large date/charting/icon library imported in full when only a few functions/icons are used).

**Why it hurts:** Every kilobyte of JS has to be downloaded, parsed, and executed before the page is interactive - on a slow connection or a low-end device this is the difference between a usable app and one that visibly hangs on load. Shipping the whole app to every route means users pay for code they'll never touch on that visit.

**Fix:** Split code by route/feature using the framework's lazy-loading/dynamic-import mechanism, import only the specific functions/icons/components needed from large libraries rather than the whole package, and periodically check bundle-analyzer output for unexpectedly large dependencies.

## 3. Image optimization

**Detect:** Are images served at a size and format appropriate to their display size and the user's device (responsive `srcset`/`sizes`, modern formats like WebP/AVIF with fallback), or are large source images shipped as-is and scaled down by CSS? Are below-the-fold images lazy-loaded? Is there an explicit width/height (or aspect-ratio) reserved so images don't cause layout shift as they load?

**Why it hurts:** Oversized images are usually the single biggest contributor to page weight and to a poor Largest Contentful Paint score; images without reserved dimensions cause visible content jumps as they load in (Cumulative Layout Shift).

**Fix:** Use the framework/platform's image component or a CDN-based image service that resizes/reformats automatically, lazy-load offscreen images, and always specify dimensions (or `aspect-ratio`) so layout space is reserved before the image arrives.

## 4. Core Web Vitals

**Detect:** Check (via Lighthouse, PageSpeed Insights, or real-user monitoring if available) the three Core Web Vitals:
- **LCP** (Largest Contentful Paint) - how long until the main content is visible. Usually dominated by render-blocking resources, slow server response, or an unoptimized hero image.
- **CLS** (Cumulative Layout Shift) - how much visible content jumps around during load. Usually caused by images/ads/embeds without reserved space, or web fonts swapping in and reflowing text.
- **INP** (Interaction to Next Paint) - how responsive the page is to actual user input after load. Usually caused by long-running JS tasks blocking the main thread during an interaction.

**Why it hurts:** These are the metrics that correlate most directly with real user-perceived quality (and, practically, with search ranking) - a page can "feel done" to a developer clicking around locally while still failing these for real users on real networks/devices.

**Fix:** LCP - optimize the largest above-the-fold element specifically (preload it, don't lazy-load it, ensure the server responds quickly). CLS - reserve space for images/embeds/ads, avoid injecting content above existing content, use `font-display` strategies that minimize reflow. INP - break up long JS tasks, defer non-critical work, avoid heavy synchronous work in event handlers.

## 5. Accessibility (a11y)

**Detect:** Walk the app checking:
- **Semantics:** are interactive elements real buttons/links/inputs, or `div`s with click handlers and no semantic role? Are headings structured hierarchically (not skipping levels, not chosen for visual size)?
- **Keyboard navigation:** can every interactive element be reached and operated via keyboard alone (Tab, Enter/Space, Escape for dismissible things), with a visible focus indicator? Is focus trapped appropriately inside modals and returned to the trigger element on close?
- **Screen reader support:** do images have meaningful `alt` text (or empty `alt` for purely decorative ones)? Do form inputs have associated labels? Are dynamic content updates (toasts, live validation errors) announced via ARIA live regions, or silent to a screen reader?
- **Color contrast:** does text meet WCAG contrast ratio guidelines against its background, especially for muted/secondary text and disabled-looking-but-actually-interactive elements?

**Why it hurts:** These aren't edge cases - they determine whether the app is usable at all for users with visual, motor, or cognitive disabilities, and in many jurisdictions/industries there's a legal compliance dimension (ADA, WCAG, EN 301 549) as well.

**Fix:** Use semantic HTML elements by default (a real `<button>`, not a styled `<div>` with `onClick`), ensure a visible focus style is never removed without a replacement, add proper `alt`/`label`/`aria-*` attributes, manage focus explicitly for modals/dialogs, and run an automated a11y checker (axe, Lighthouse a11y audit) as a baseline - automated tools catch roughly a third of real issues, so pair them with manual keyboard-only and screen-reader spot checks.

## Output format

```
# Frontend Production Readiness Audit

## Findings
### [Area] - [Severity]
- What's missing/broken: [concrete]
- User impact: [who is affected and how - "keyboard-only users cannot close this modal", "users on 3G wait 8s+ for LCP"]
- Fix: [specific]

## Priority order
1. Error boundaries around anything that can realistically throw (crash containment)
2. Accessibility blockers that make a flow entirely unusable (unreachable-by-keyboard controls, missing form labels)
3. Core Web Vitals failures on high-traffic pages
4. Bundle size / code-splitting
5. Image optimization
```

Prioritize by "does this make the app entirely unusable for some group of users" (a keyboard trap, a crash) over "does this make it somewhat slower" - the former is a hard blocker, the latter is a spectrum.

## Related skills

For render/state/data-fetching performance (why it feels laggy once loaded, as opposed to whether it loads/works at all), use **frontend-performance-audit**.
