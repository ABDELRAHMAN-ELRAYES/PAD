# Module 3 (Diagram Generation) Remediation Plan

This document provides a comprehensive analysis and a step-by-step remediation plan to fix the UX, architectural, styling, and reliability issues in the **Diagram Module (Module 3)** of PAD. It details the exact root causes of existing defects (including the infinite auto-repair loop) and defines the layout, navigation, and state-management specifications for the desired production-grade implementation.

---

## 1. Current Implementation Analysis

The current Diagram Module implementation uses a **single-page workspace dashboard** to manage all 10 types of diagrams for a given Idea. 
* **Backend structure**: The backend exposes endpoints for initializing diagrams as placeholder records (`/generate/:ideaId`), streaming individual diagram text generation (`/:id/generate-stream`, `/:id/regenerate-stream`) using Server-Sent Events (SSE), manual saving, manual imports, and auto-repairing Mermaid syntax errors (`/:id/repair`).
* **Frontend structure**: The frontend leverages a custom React hook [useDiagramsPage](file:///home/mohamed/PAD/web/src/features/diagrams/hook/useDiagramsPage.ts) which acts as the state hub. It fetches diagram data, tracks local modifications, handles text streaming, and triggers auto-repair requests when visual exceptions are caught by the preview panel.
* **Component layout**: The UI consists of a sidebar [DiagramCatalog](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramCatalog.tsx) showing diagram types and status badges, and a split-pane container [DiagramEditorPanel](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramEditorPanel.tsx) that renders a custom textarea editor side-by-side with [MermaidPreview](file:///home/mohamed/PAD/web/src/components/layout/MermaidPreview.tsx).

---

## 2. Existing File Mapping

The Diagram Module consists of the following frontend and backend files:

### Frontend (web/)
* [DiagramsPage.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/page/DiagramsPage.tsx): Main entry page component for the standalone route `/ideas/[id]/diagrams`.
* [DiagramsPanel.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramsPanel.tsx): Panel wrapper for displaying the diagram feature in the split-pane workspace.
* [DiagramWorkspace.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramWorkspace.tsx): Layout controller component that swaps panels and shows a loader if queries are fetching.
* [DiagramCatalog.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramCatalog.tsx): Sidebar listing the 10 structural and behavioral diagram types with status badges.
* [DiagramEditorPanel.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramEditorPanel.tsx): Code editor panel with custom gutter scroll logic and a side-by-side preview pane.
* [DiagramCanvas.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramCanvas.tsx): Unused canvas component supporting dragging, zoom, and mouse wheel zooming.
* [ActivityFeed.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/ActivityFeed.tsx): Visual terminal panel at the bottom of the editor showing status logs.
* [ImportExportDialog.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/ImportExportDialog.tsx): Dialog for raw Mermaid file input/output.
* [useDiagramsPage.ts](file:///home/mohamed/PAD/web/src/features/diagrams/hook/useDiagramsPage.ts): State, handlers, and auto-repair trigger hook.
* [diagrams.api.ts](file:///home/mohamed/PAD/web/src/features/diagrams/api/diagrams.api.ts): Axios-based HTTP client wrapper.
* [diagramsQueries.ts](file:///home/mohamed/PAD/web/src/features/diagrams/api/diagramsQueries.ts): React Query mutations and query definitions.
* [MermaidPreview.tsx](file:///home/mohamed/PAD/web/src/components/layout/MermaidPreview.tsx): Component containing the raw Mermaid rendering and error catch callback.

### Backend (server/)
* [diagram.route.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.route.ts): Routing registration for diagram REST and SSE streams.
* [diagram.controller.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.controller.ts): Controller actions executing service operations and sending JSON responses.
* [diagram.service.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.service.ts): Business logic, streaming chunk assembly, version history tracking, and fallbacks.
* [diagram.repository.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.repository.ts): Prisma ORM data mapper executing CRUD queries on database models.
* [diagram-validator.service.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram-validator.service.ts): LLM prompt template generator for correcting invalid Mermaid diagrams.
* [IDiagram.ts](file:///home/mohamed/PAD/server/src/modules/diagram/types/IDiagram.ts): Backend interface specifications for repository structures and inputs.

---

## 3. Existing Routing Analysis

There are currently two ways users view diagrams:
1. **Stand-alone Page Route**: The route `/ideas/[id]/diagrams` maps to [app/ideas/[id]/diagrams/page.tsx](file:///home/mohamed/PAD/web/src/app/ideas/%5Bid%5D/diagrams/page.tsx), which loads the [DiagramsPage](file:///home/mohamed/PAD/web/src/features/diagrams/page/DiagramsPage.tsx) component.
2. **Split Workspace Layout Tab**: The active section `"diagrams"` inside [WorkspaceLayout.tsx](file:///home/mohamed/PAD/web/src/features/ideas/components/WorkspaceLayout.tsx) renders the `<DiagramsPanel />` directly.

**Divergence**:
Neither route supports sub-routing to individual diagrams. Clicking an item in the sidebar catalog only updates the React state variable `activeTab` within [useDiagramsPage.ts](file:///home/mohamed/PAD/web/src/features/diagrams/hook/useDiagramsPage.ts), swapping the active diagram model in-place. Users cannot refresh, bookmark, or link to a specific diagram page (e.g. sequence vs ERD).

---

## 4. Existing Diagram Lifecycle

The current lifecycle of a diagram is as follows:
```
[Catalog / Workspace Mounts]
             │
             ▼
┌──────────────────────────┐     [No diagrams exist in DB]
│ Initialize Workspaces    │──────────────────────────────────────┐
└──────────────────────────┘                                      │
             │                                                    ▼
             │ [Diagram records initialized]          ┌───────────────────────┐
             ▼                                        │ Create 10 Draft       │
┌──────────────────────────┐                          │ Placeholder Records   │
│ Generate / Stream        │◄─────────────────────────└───────────────────────┘
└──────────────────────────┘
             │
             ├──────────────► Stream SSE (chunks appended to database model)
             ▼
┌──────────────────────────┐
│ Render Preview Canvas    │
└──────────────────────────┘
             │
             ├──────────────► [Manual Edit] ──► Save changes & create Version snapshot
             ├──────────────► [Import/Export] ─► Replace mermaid code & clear multi-tiers
             ▼
┌──────────────────────────┐
│ Refetch & Cache Sync     │
└──────────────────────────┘
```

---

## 5. Existing Validation Lifecycle

* Validation is **exclusively client-assisted**. The server has no parser checking or syntax validation logic; it assumes any text streamed from the LLM or edited by the user is valid.
* The frontend component [MermaidPreview](file:///home/mohamed/PAD/web/src/components/layout/MermaidPreview.tsx) executes browser-side parsing using the `mermaid.render` API in a debounced `useEffect` block.
* If a syntax exception is thrown, it is caught in the `try-catch` block inside `MermaidPreview`, and the error message string is sent back to the parent hook via the `onError` prop callback.

---

## 6. Existing Repair Lifecycle

The auto-repair pipeline currently flows as follows:
1. `MermaidPreview` fails to parse code ──► catches error inside `useEffect`.
2. Triggers `onError` prop callback ──► propagates to `handleDiagramError` inside `useDiagramsPage`.
3. If `repairRetries` counter for the diagram ID is `< 3`:
   * Increments `repairRetries` state locally on the client.
   * Dispatches an HTTP `POST` request to `/:id/repair` with the invalid code and error message.
4. Backend receives the request, wraps the inputs in `BUILD_REPAIR_PROMPT`, calls the LLM synchronously, extracts corrected code, saves it to the database, and returns the record.
5. Frontend mutation resolves ──► calls `setEditedCode` and dispatches `refetchDiagrams()`.
6. Fresh diagrams are loaded ──► browser re-attempts rendering. If it fails, the loop restarts.

---

## 7. Existing Theme Architecture

The styling of the current Diagram Module is isolated and deviates from the rest of the application:
* **Tailwind CSS variables**: PAD uses Tailwind CSS v4 configured in [globals.css](file:///home/mohamed/PAD/web/src/styles/globals.css) that maps standard CSS Custom Properties (`var(--background)`, `var(--card)`, `var(--border)`, `var(--muted-foreground)`) to support system-wide dark and light themes.
* **Diagram component styling**: [DiagramWorkspace.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramWorkspace.tsx), [DiagramCatalog.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramCatalog.tsx), and [DiagramEditorPanel.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramEditorPanel.tsx) use hardcoded slate classes (e.g. `bg-slate-950`, `bg-slate-900`, `border-slate-800`, `text-slate-500`).
* **Visual impact**: The diagrams page remains dark slate in light mode, text labels are unreadable, borders conflict with core design borders, and input controls lack ring states and theme variables.

---

## 8. UX Problems

1. **Squished Side-by-Side View**: Squeezing the code editor and preview panel next to each other leaves less than 50% of screen width for the canvas. Complex architecture diagrams, ERDs, and sequences become illegible without wide-screen configurations.
2. **Lack of Dedicated Detail Pages**: Users cannot open, bookmark, or view a single diagram in full screen; they must stay inside the single workspace container.
3. **Unused Diagram Canvas Features**: The [DiagramCanvas.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramCanvas.tsx) component supports zoom, pan, dragging, grid line formatting, and wheel zoom, but it is bypassed in [DiagramEditorPanel.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramEditorPanel.tsx) which embeds raw `MermaidPreview` without canvas controls.
4. **Missing Export Options**: No UI triggers exist to export diagrams as high-resolution PNGs or vector PDFs for documentation.
5. **Jarring Loading Spinner Flash**: When a diagram is modified or repaired, calling `refetchDiagrams()` invalidates the diagrams query. This forces `isLoading` to trigger `true`, which completely unmounts the workspace panels and displays a full-screen loading spinner, breaking focus.

---

## 9. Architecture Problems

1. **Client-Assisted Repair Loop Anti-pattern**: Handing validation parsing off to the client's browser, then triggering server-side database mutations inside a UI lifecycle callback creates fragile state synchronization.
2. **Absence of Server-Side Validation**: The backend does not run a dry-run check or parse syntax when compiling, streaming, or editing, resulting in storing corrupt/broken Mermaid blocks in the database.
3. **No Database Persisted Retry Counts**: The retry attempt state `repairRetries` is only tracked in-memory inside React hook state. If the component unmounts or state resets, this counter is lost, rendering the cap of 3 attempts useless.
4. **Routing Lack of Modularity**: Routing bypasses Next.js's standard layout routing features. It uses manual JSX tab swaps, breaking tab state, page history, navigation back buttons, and SEO metadata.

---

## 10. Reliability Problems

1. **Infinite Mermaid Repair Loop**: The repair pipeline loops indefinitely under common invalid states.
2. **Loss of Client State**: Typing changes or local editor updates are easily wiped when background websocket triggers or unrelated layout updates alter the `refreshKey` of the workspace layout.
3. **Unhandled Rendering Exceptions**: Uncaught parsing errors inside `mermaid.render` can block thread execution or cause white screens on older browsers if helper elements fail to clean up from the DOM.

---

## 11. Infinite Loop Root Cause Analysis

The critical Mermaid auto-repair infinite loop is caused by the intersection of three factors:

### A. Stale Closures in the Debounced Effect
In [MermaidPreview.tsx](file:///home/mohamed/PAD/web/src/components/layout/MermaidPreview.tsx), the `useEffect` hook relies exclusively on `[code]` in its dependency array. The `onError` callback prop is omitted:
```typescript
useEffect(() => {
    const renderDiagram = async () => {
        try { ... }
        catch (err) {
            if (onError) onError(msg); // Stale onError reference captured!
        }
    };
    const timeoutId = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timeoutId);
}, [code]);
```
If `code` does not change, but `onError` changes (which it does on every parent render because it is defined as an inline arrow function), the scheduled debounced execution uses a stale closure of `onError`.

### B. Jarring Loading State unmounts the Canvas
When `useRepairDiagram` completes its mutation, it triggers `refetchDiagrams()`. Because the queries are invalidated and re-fetched, the `isDiagramsLoading` state in [useDiagramsPage.ts](file:///home/mohamed/PAD/web/src/features/diagrams/hook/useDiagramsPage.ts) toggles to `true`.
In [DiagramWorkspace.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramWorkspace.tsx), this loading condition is checked immediately:
```typescript
if (isLoading) {
    return (
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-sky-400" />
            <span>Loading Diagram Workspace...</span>
        </div>
    );
}
```
This causes `DiagramWorkspace` to return early, **completely unmounting** the child `DiagramEditorPanel` and its child `MermaidPreview` components during the refetch window.

### C. Resetting of Hook State upon Workspace Key Resets
When the refetch completes, `isLoading` toggles back to `false`, and the child components are remounted from scratch. 
While `repairRetries` is housed in the `useDiagramsPage` hook in `DiagramWorkspace` (which technically stays mounted), if the parent layout `WorkspaceLayout` triggers a re-render due to its own parent-level updates, or if the user switches active tabs, or if the `refreshKey` of the workspace is incremented:
```typescript
// WorkspaceLayout.tsx
return <DiagramsPanel key={refreshKey} ideaId={activeIdeaId} />;
```
The key change forces the entire `DiagramsPanel` (and therefore `DiagramWorkspace` and the `useDiagramsPage` hook) to **completely unmount and remount**. This resets the React hook state `repairRetries` back to `{}` (empty object).
When the new `MermaidPreview` mounts with the freshly repaired code and tries to render, if the code is *still* invalid, it triggers `onError`.
Since the state was reset, `repairRetries[diagramId]` is read as `undefined` (defaulting to `0`).
The frontend registers this as "Attempt 1" all over again, triggers another repair mutation, updates the database, invalidates query, shows loading spinner, unmounts, remounts, resets the counter, and loops infinitely.

---

## 12. Desired Diagram Navigation Architecture

To correct routing and view separation, Next.js routing must be used:

```
                  ┌───────────────────────────────┐
                  │   /ideas/[id]/diagrams        │
                  │   (Diagram Catalog Workspace)  │
                  └───────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  /architecture   │    │    /sequence     │    │       /erd       │
│ (Detail Tab Page)│    │ (Detail Tab Page)│    │ (Detail Tab Page)│
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

* **Page 1 (Catalog)**: Acts as the entry dashboard and catalog table, listing diagram types, compilation details, edit status, and action buttons.
* **Page 2 (Detail)**: The slug dynamic route `/ideas/[id]/diagrams/[type]` renders the workspace for that specific diagram.

---

## 13. Desired Diagram Page Architecture

The individual diagram detail page layout requires layout isolation:
```
┌────────────────────────────────────────────────────────┐
│  Back to Catalog | Header: [Diagram Title Input]       │
├────────────────────────────────────────────────────────┤
│  Tabs:  [ Preview ]  [ Code ]                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [Tab: Preview Content]                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │               Diagram Canvas                     │  │
│  │          (Full Workspace, Pan, Zoom)             │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  [Tab: Code Content]                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 Code Editor                      │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                Activity Feed                     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 14. Desired Preview Tab Design

The **Preview Tab** must implement the following canvas features:
* **Professional Canvas**: Mounts `DiagramCanvas.tsx` to fill the entire layout block below the tabs.
* **Full Zoom & Pan**: Custom mouse-wheel handlers intercept zoom factor shifts. Drag navigation updates mouse location offsets dynamically.
* **Fit to Screen**: An action button auto-adjusts layout scale to center and match image bounds to parent canvas bounds.
* **Export Pipelines**:
  * **Export PNG**: Serializes the rendered preview SVG to a Canvas wrapper, processes pixel scale multiplication (2x) for high resolution, and downloads it.
  * **Export PDF**: Wraps the compiled SVG inside `jspdf` layout boundaries and downloads the vector output.

---

## 15. Desired Code Tab Design

The **Code Tab** splits space vertically rather than horizontally:
1. **Full-Width Editor**: The custom Mermaid syntax code editor spans the full available width, making editing long diagrams easier.
2. **Activity Feed Panel**: The activity terminal [ActivityFeed.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/ActivityFeed.tsx) is placed directly below the editor code pane, displaying compilation alerts and logs.

---

## 16. Theme Alignment Plan

To align the styling of the diagram pages with the main PAD application:
1. **Remove hardcoded colors**: Strip out all slate classes (`bg-slate-950`, `bg-slate-900`, `border-slate-800`, `text-slate-500`, `text-slate-100`).
2. **Use Tailwind CSS v4 custom theme tokens**:
   * Layout background: Replace with `bg-background` and `text-foreground`.
   * Cards and catalogs: Replace with `bg-card`, `text-card-foreground`, and `border-border`.
   * Sidebar controls and active states: Replace with `bg-accent`, `text-accent-foreground`, and `border-accent/40`.
   * Gutter and logs: Replace with `bg-muted/40`, `text-muted-foreground`, and `border-border/80`.
3. **Typography**: Ensure fonts match the default system font `--font-sans` (`Geist`), and code sections use `--font-mono` (`Geist Mono`).

---

## 17. Mermaid Repair Redesign

To eliminate the client-assisted infinite loop:
* **Remove Client-Side Loop Trigger**: The frontend will no longer invoke `/repair` inside UI callbacks. `MermaidPreview` will only be responsible for rendering and displaying local syntax errors when editing.
* **Move Repair to the Backend**: The auto-repair validation loop is moved entirely to the backend, run inside [DiagramService](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.service.ts) synchronously during generation and regeneration.
* **Persisted Database States**: If the backend repair loop fails after 3 attempts:
  * The diagram's `status` in the database is set to `"repair_failed"`.
  * The error log string is stored in a new database column `validationError` on the `Diagram` model.
  * The invalid Mermaid syntax is stored in `mermaidCode` to allow manual corrections.

---

## 18. Retry Strategy Design

```
             LLM Generates Code
                     │
                     ▼
             Run Parser Check
                     │
         ┌───────────┴───────────┐
         ▼ Valid                 ▼ Invalid
     [Render]              Attempt Repair #1
                                 │
                                 ▼
                          Run Parser Check
                                 │
                     ┌───────────┴───────────┐
                     ▼ Valid                 ▼ Invalid
                 [Render]              Attempt Repair #2
                                             │
                                             ▼
                                      Run Parser Check
                                             │
                                 ┌───────────┴───────────┐
                                 ▼ Valid                 ▼ Invalid
                             [Render]              Attempt Repair #3
                                                         │
                                                         ▼
                                                  Run Parser Check
                                                         │
                                             ┌───────────┴───────────┐
                                             ▼ Valid                 ▼ Invalid
                                         [Render]              [Save with Fail Status]
```

1. **Headless Parsing Validation**: The backend validates syntax using a server-side parser (e.g. using `mermaid-parser` or by executing a dry-run check).
2. **Capped Iterations**: If syntax errors are found, the service sends the invalid snippet and compiler output back to the LLM (up to 3 times).
3. **Failure Capture**: If the third attempt is still invalid, the loop breaks and stores the failure details.

---

## 19. Failure State Design

When the backend repair fails:
1. **Set Database State**: `status` is set to `"repair_failed"`, and `validationError` is updated with the compiler error.
2. **Render Error UI**:
   * The catalog list shows a red warning indicator next to the item.
   * On the individual diagram page, a warning alert block is displayed at the top.
   * It displays the compiler message and provides a "Force Regenerate" button.
   * The Code tab shows the invalid code, letting the user manually correct syntax errors.
3. **Manual Repair Pathway**: When the user edits the code and saves, saving runs the syntax check. If valid, the error is cleared and `status` updates to `"draft"`.

---

## 20. Required File Changes

| Filename | Location | Action | Reason |
| :--- | :--- | :--- | :--- |
| `schema.prisma` | `server/prisma/` | **Refactor** | Add `validationError` column to the `Diagram` model. |
| `useDiagramsPage.ts` | `web/src/.../hook/` | **Refactor** | Remove client-side auto-repair handlers and clean up loading states to prevent jarring unmounting. |
| `DiagramsPage.tsx` | `web/src/.../page/` | **Delete** | Replaced by Next.js subpages. |
| `DiagramWorkspace.tsx` | `web/src/.../components/` | **Delete** | Replaced by Next.js directory structural views. |
| `DiagramEditorPanel.tsx` | `web/src/.../components/` | **Refactor** | Convert to vertical split and replace hardcoded theme colors with Tailwind v4 variables. |
| `DiagramCanvas.tsx` | `web/src/.../components/` | **Refactor** | Connect controls and export pipelines. Use theme variables. |
| `diagrams.api.ts` | `web/src/.../api/` | **Refactor** | Update schema response models. |
| `diagram.service.ts` | `server/src/.../` | **Refactor** | Implement the synchronous backend validation and repair loop. |
| `diagram.controller.ts` | `server/src/.../` | **Refactor** | Update controllers to save validation errors and return `validationError` fields. |

---

## 21. Files To Keep

The following files do not require any changes:
* [ImportExportDialog.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/ImportExportDialog.tsx): Dialog structure remains correct.
* [diagram.route.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.route.ts): Endpoint signatures are correct.
* [diagram.repository.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.repository.ts): Basic query mapping works (Prisma will automatically generate schema types once `schema.prisma` is migrated).

---

## 22. Files To Refactor

1. **`server/prisma/schema.prisma`**:
   * Add optional string column: `validationError String? @map("validation_error") @db.Text` to the `Diagram` model.
2. **`server/src/modules/diagram/diagram.service.ts`**:
   * Add validation checks using `mermaid-parser` or equivalent during streaming generation/regeneration callbacks.
   * If parsing fails, loop `repairDiagram` call internally up to 3 times.
   * Write the validation error output to database record if the repair fails.
3. **`web/src/features/diagrams/hook/useDiagramsPage.ts`**:
   * Remove `handleDiagramError` and `repairRetries` client state.
   * Ensure `isLoading` is not triggered by query background fetches.
4. **`web/src/features/diagrams/components/DiagramEditorPanel.tsx`**:
   * Refactor layout to stack panels vertically.
   * Replace slate classes with Tailwind CSS v4 variables: `bg-background`, `bg-card`, `border-border`, `text-muted-foreground`.
5. **`web/src/features/diagrams/components/DiagramCanvas.tsx`**:
   * Use theme variables.
   * Connect zoom, pan, and dragging controls to `MermaidPreview`.
   * Add Export PNG and Export PDF button handlers.

---

## 23. Files To Delete

1. [DiagramsPage.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/page/DiagramsPage.tsx): The page is replaced by standard Next.js directory routing subpages.
2. [DiagramWorkspace.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramWorkspace.tsx): The component structure is replaced by standalone page templates.

---

## 24. New Files To Create

The following new routes are required:
* `web/src/app/ideas/[id]/diagrams/page.tsx` (Page 1): Catalog and listing index view.
* `web/src/app/ideas/[id]/diagrams/[type]/page.tsx` (Page 2): Specific diagram tab detail view wrapper.
* `web/src/features/diagrams/components/DiagramCatalogGrid.tsx`: Catalog grid view component containing metadata, badges, and action buttons.
* `web/src/features/diagrams/components/DiagramDetailView.tsx`: Tab-switching component implementing the Preview and Code panels.

---

## 25. Migration Plan

1. **Database Schema Migration**:
   * Add `@map("validation_error")` column.
   * Run: `npx prisma migrate dev --name add_diagram_validation_error`.
2. **Cleanup Corrupt Database Entries**:
   * Run a migration script to set empty or invalid placeholder records to `status = "draft"` and clear invalid Mermaid lines.
3. **Routing Setup**:
   * Create Next.js folder paths and clean up duplicate routes.

---

## 26. Implementation Phases

```
┌────────────────────────────────────────────────────────┐
│ PHASE 1: Database Migration & Next.js Routing          │
│ - Create prisma schema change & run migration.         │
│ - Implement dynamic catalog & detail routes.           │
├────────────────────────────────────────────────────────┤
│ PHASE 2: Theme Realignment & Canvas Integration        │
│ - Swap hardcoded slates with OKLCH theme variables.    │
│ - Embed canvas component & wire zoom/pan features.     │
├────────────────────────────────────────────────────────┤
│ PHASE 3: Server-Side Validation & Repair Redesign     │
│ - Set up Node server-side Mermaid parser validation.   │
│ - Write synchronous 3-attempt loop in server service.  │
├────────────────────────────────────────────────────────┤
│ PHASE 4: Failure State UI & File Exports               │
│ - Render custom warning banners and error panels.      │
│ - Write PNG and vector PDF download utility scripts.   │
└────────────────────────────────────────────────────────┘
```

---

## 27. Acceptance Criteria

* **Routing and Pages**:
  * Navigating to `/ideas/[id]/diagrams` lists all 10 diagrams in a catalog layout.
  * Clicking an item in the catalog navigates to `/ideas/[id]/diagrams/[type]`.
* **Layout and Theme**:
  * Diagram layout matches the main application's theme in both dark and light modes.
  * Diagram page layout utilizes separate tabs: `[ Preview ]` and `[ Code ]`.
* **Canvas Interactivity**:
  * Canvas supports dragging to pan, mouse wheel zooming, and zoom level reset.
  * Clicking "Export PNG" downloads a high-resolution PNG image file.
  * Clicking "Export PDF" downloads a vector PDF file.
* **Auto-Repair Loop Protection**:
  * Triggering errors in the Mermaid code compiler does not cause infinite network request loops.
  * After 3 failed repair attempts, the diagram is saved to the database with `status = "repair_failed"`.
  * The frontend displays the error banner, parser message, and allows manual syntax edits.
