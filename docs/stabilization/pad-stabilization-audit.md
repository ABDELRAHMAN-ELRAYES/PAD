# PAD Stabilization Audit & Remediation Plan

## 1. Executive Summary

This document presents a comprehensive stabilization audit and remediation plan for the Product Development Assistant (PAD) platform. Over several modules, PAD has accumulated bugs related to component lifecycles, project switching, database state management, AI orchestrations, and UI scrolling. 

This audit analyzes the root causes of these issues by tracing code paths across the frontend (React/Next.js/React Query) and backend (Express/Prisma/Ollama/Gemini). It outlines a detailed, phase-based remediation plan designed to ensure system stability, prevent state leakage, and improve the user experience across all modules.

---

## 2. Workflow Module Audit

### Issue 1.3: Terminal Panel in Package Page
* **Behavior**: When viewing a compiled package, a terminal-style compiler log panel (`HandoffProgressLog`) is displayed at the bottom of the page.
* **Impact**: Clutters the package workspace (which is intended to focus on previews, file trees, and metadata) and confuses the user by displaying live logs for completed compilations.
* **Code Trace**:
  * In `web/src/features/workflow/components/HandoffWorkspace.tsx#L70-L76`, the `<HandoffProgressLog>` component is rendered conditionally on `(isCompiling || compileLogs.length > 0)`.
  * Because `compileLogs` contains logs from the previous compilation run, this container is rendered persistently even after compilation is complete.
* **Remediation**:
  * Remove `HandoffProgressLog` from the bottom of `HandoffWorkspace.tsx`.
  * Render compiler progress and logs exclusively in the intake/compilation view of `WorkflowPage.tsx`.

### Issue 1.4: Package Regeneration Flow
* **Behavior**: Clicking "Regenerate" on the package page runs compilation in place, causing the terminal log to appear inside the active package page without clearing the workspace preview canvas or file tree.
* **Impact**: Disruptive UI transition that violates the design principle of separating the intake/compilation view from the package inspection view.
* **Code Trace**:
  * In `web/src/features/workflow/page/WorkflowPage.tsx#L108-L118`, the workspace is rendered if `handoffPkg` is not null.
  * When `onRegenerate` (which triggers `handleCompile`) is clicked, `isCompiling` becomes true, but because `handoffPkg` is still present in the React Query cache, the page remains in the workspace view.
* **Remediation**:
  * Introduce an `isRegenerating` state variable in `WorkflowPage.tsx`.
  * Set `isRegenerating` to `true` when compilation starts.
  * Render the intake/compilation view when `!handoffPkg || isRegenerating`.
  * Set `isRegenerating` to `false` when compilation completes successfully.
  * If compilation fails, display a "Back to Package View" button (since the previous package remains in cache) to let the user return.

---

## 3. Package Generation Audit

### Issue 1.2: Mixing Generated & Non-Generated Diagrams
* **Behavior**: The compiled handoff package zip and file tree contain both successfully generated diagrams and empty/non-generated placeholders.
* **Impact**: Bloats the final workspace package with empty files (e.g., `diagrams/database-erd.mmd` with no contents) and degrades the quality of the package delivered to the AI IDE.
* **Code Trace**:
  * In `server/src/modules/diagram/diagram.service.ts#L160-L198`, 10 diagram types are pre-initialized in the database with empty `mermaidCode` and `"draft"` status during project creation.
  * In `server/src/modules/workflow/handoff-compiler.service.ts#L235`, the compiler fetches all diagrams using `prisma.diagram.findMany({ where: { ideaId } })`.
  * It maps all 10 diagrams into `vars.diagrams` without checking if their `mermaidCode` is populated.
  * In `buildStaticArtifacts`, it generates `.mmd` files for all diagrams in `vars.diagrams`.
* **Remediation**:
  * Filter diagrams at the database level in `handoff-compiler.service.ts` to only include successfully generated diagrams (non-empty code and no failed/repair statuses):
    ```typescript
    const diagrams = await prisma.diagram.findMany({
        where: {
            ideaId,
            mermaidCode: { not: "" },
            status: { not: "repair_failed" }
        }
    });
    ```

---

## 4. Project Lifecycle & Switching Audit

### Issue Group 2: Project Switching State Leakage
* **Behavior**:
  1. User compiles a workflow in Project A (Success).
  2. User switches to a newly created Project B and generates all artifacts.
  3. User opens the workflow tab for Project B and clicks "Generate".
  4. Nothing happens. The server returns HTTP 200.
* **Impact**: Critical blocker. Stops users from working on multiple projects consecutively without a hard browser reload.
* **Code Trace**:
  * **Stale Component State**: In `WorkspaceLayout.tsx`, case `"workflow"` renders `<WorkflowPage key={refreshKey} ideaId={activeIdeaId} isEmbedded />`. The key is `refreshKey` (which only changes when artifacts are modified). When `activeIdeaId` changes, the key does not, meaning React reuses the `WorkflowPage` instance. Hooks like `useHandoffStream` (which contain the compilation state, logs, and `EventSource` ref) are NOT remounted, retaining Project A's values (such as `progress: 100`, `compileLogs` populated, and references to previous stream connections).
  * **Silent Server Failure on Empty AI Output**: In `server/src/modules/workflow/workflow.service.ts#L96-L149`, `processWorkflowGeneration` calls the LLM to get workflow steps, parses them, and checks `if (steps.length > 0)`. If Project B's features are invalid/junk, the AI returns an empty list or malformed JSON, resulting in `steps.length === 0`. The server bypasses the block, fails to write `final` or `error` SSE chunks, and silently calls `res.end()`.
  * **Mismatched Client Expectation**: The client receives a successful HTTP 200 response (since headers were written) but the stream closes without any final event. Because the client never receives `status: "final"` or `status: "error"`, the state remains `isGenerating: true` indefinitely.
* **Remediation**:
  * **Component Isolation**: In `WorkspaceLayout.tsx`, change keys of all panels to include the `activeIdeaId` (e.g., `key={`${activeIdeaId}-${refreshKey}`}`). This forces React to unmount the old panel and mount a clean instance whenever the user switches projects, clearing all local hook state and streams.
  * **Robust Stream Termination**: Update `processWorkflowGeneration` to explicitly write an error event if no steps are generated:
    ```typescript
    if (steps.length === 0) {
        if (onChunk) {
            onChunk({ status: "error", message: "Failed to generate workflow steps. Please review features and tasks." });
        }
        return;
    }
    ```

---

## 5. Feature Module Audit

### Issue Group 3: Feature Extraction Failure
* **Behavior**: Generating features results in a single feature named `"Extracted Feature"` (or `"Extracted"`) with a description containing a random chunk of PRD text.
* **Impact**: Renders Module 4 unusable, downstream tasks cannot be generated, and workflow compilation fails.
* **Code Trace**:
  * **Simplistic Prompting**: In `server/src/modules/ai/ai.service.ts#L676-L694`, `generateFeaturesStream` uses a simple hardcoded prompt instead of the high-quality, structured `buildExtractFeaturesPrompt` defined in `feature-task.prompt.ts`. It lacks negative constraints, leading Ollama/Gemini to output conversational markdown text wrappers.
  * **JSON Parser Fallback**: In `server/src/modules/feature/feature.service.ts#L96-L116`, the `parseAIFeaturesResponse` method uses a regex `/\[[\s\S]*\]/` to find a JSON array. If the model outputs malformed JSON or plain text due to prompt quality issues, `JSON.parse` throws. The catch block executes a fallback that returns a single feature containing the first 500 characters of the raw text response.
* **Remediation**:
  * Update `generateFeaturesStream` to use the schema-guided `buildExtractFeaturesPrompt` and enforce strict system instructions.
  * Improve JSON parsing using robust parsing utilities (e.g. `AiService.robustJSONParse`).

### Feature Redesign Analysis
* **Proposal**: Redesign feature extraction to output structured entities:
  * Name
  * Description
  * User Value
  * Acceptance Criteria
  * Dependencies
  * Priority
  * Complexity
  * Suggested Tasks (to auto-scaffold tasks directly)
* **Design Recommendation**:
  * This is highly recommended. Storing these fields as structured markdown within the database `Feature.description` column (using consistent headers) or adding them as database columns preserves details without breaking existing relational schemas.
  * Suggested tasks should be parsed from the AI output and inserted directly into the database `Task` table associated with the feature ID. This streamlines task generation.

---

## 6. Task Generation Audit

### Task Generation Quality Analysis
* **Behavior**: Suggested tasks are often too generic, too large, or too small, and lack the technical architectural context of the project.
* **Root Cause**:
  * In `server/src/modules/task/task.service.ts#L34`, `suggestTasksForFeature` calls `buildGenerateTasksPrompt` passing only the feature title and description.
  * The prompt builder `buildGenerateTasksPrompt` lacks context about the technical stack, database specs (PRD/BRD), or diagrams, leaving the AI to guess the implementation details.
* **Remediation & Recommendation**:
  * Inject the project's technical specifications and database schemas as system context into the task generation prompt:
    ```typescript
    // In suggestTasksForFeature:
    const documents = await DocumentService.getDocumentsByIdea(ideaId, next);
    const techSpec = documents.find(d => d.type === "PRD")?.content;
    const dbSchema = await prisma.diagram.findFirst({ where: { ideaId, type: "DATABASE_ERD" } })?.mermaidCode;
    ```
  * Update `GENERATE_TASKS_PROMPT` to instruct the AI to construct tasks that align directly with the verified database tables, routes, and libraries specified in the tech spec.

---

## 7. Diagram Module Audit

### Issue Group 4: Diagram Error Display
* **Behavior**: Raw Mermaid parser syntax errors (e.g., `ParseException: ...`) are printed on diagram cards and the detail view alert banner.
* **Impact**: Degrades UX. Raw code parser exceptions look unprofessional and distract users from the project's state.
* **Code Trace**:
  * In `DiagramCatalogGrid.tsx#L94-L99`, the validation error is printed directly: `<span>{diagram.validationError}</span>`.
  * In `DiagramDetailView.tsx#L222-L224`, the error is rendered in a monospace alert block.
* **Remediation**:
  * **Remove Raw Errors from UI**: Delete raw text error displays from both components. Replace them with user-friendly warnings (e.g., `"The AI generated code contains syntax errors. You can fix it with AI or try regenerating."`).
  * **Friendly Status Flow**: Define clear user-facing statuses matching the validation lifecycle:
    * `Generating`: Active SSE code stream.
    * `Validating`: Chunks completed, running initial syntax validation.
    * `Repairing`: Syntax validation failed, running repair loop.
    * `Retrying`: Subsequent repair attempts.
    * `Generated`: Valid Mermaid syntax saved.
    * `Failed`: Syntax repair failed after all attempts.
  * **Status Events Streaming**: Update `generateDiagramStream` on the server to stream intermediate status events:
    ```typescript
    res.write(`event: status\ndata: ${JSON.stringify({ status: "validating" })}\n\n`);
    ```
  * Update the frontend client `diagramApi.generateStream` and hook to intercept `status` events and update the badge label.

---

## 8. Navigation Audit

### Sidebar Link Order
* **Behavior**: The "IR Engine" tab appears at the bottom of the sidebar below "Workflow".
* **Requirement**: Move "IR Engine" directly below "Research" (Discovery & Research) to match the logical compiler order.
* **Code Trace**:
  * In `web/src/config/workspace.tsx`, `SIDEBAR_ITEMS` and `SECTION_ITEMS` contain `overview` (Discovery & Research) at index 0, and `ir` (IR Engine) at index 5.
* **Remediation**:
  * Reorder elements in `SIDEBAR_ITEMS` and `SECTION_ITEMS` inside `web/src/config/workspace.tsx` so that `ir` is positioned at index 1 (directly below `overview` / index 0).

---

## 9. State Management & Data Flow Audit

### Query Caching & Key Strategy
* Active projects use Next.js routing combined with React Query caching.
* **Stale Keys**: Since React Query keys contain `ideaId`, query refetches work. However, panel component instances (e.g. `WorkflowPage`) do not reload unless their component `key` is changed. This results in stale hook state and orphaned streams.
* **Remediation**: Establish `key={`${activeIdeaId}-${refreshKey}`}` as the global standard for workspace panels.

### Database Connection Leakage
* In `handoff-compiler.service.ts`, `PrismaClient` is instantiated dynamically via `require("@prisma/client")` and disconnected manually via `prisma.$disconnect()`.
* **Risk**: Instantiating `PrismaClient` on every compilation run risks database connection pool exhaustion under concurrent operations.
* **Remediation**: Import and use the shared global Prisma client instance (e.g., from `server/src/lib/prisma` or configuration modules) instead of instantiating new clients locally.

---

## 10. Root Cause Analysis Summary

| Issue Group | Symptom | Root Cause |
| :--- | :--- | :--- |
| **1. Workflow** | Tree view cannot scroll horizontally when zoomed | `ScrollArea` lacks horizontal `ScrollBar`, buttons use `w-full` and `truncate`. |
| **1. Workflow** | Terminal appears inside package page | `HandoffProgressLog` rendered inside `HandoffWorkspace` view. |
| **1. Workflow** | Live compile happens inside package workspace | Lack of an `isRegenerating` page state to swap back to the intake page. |
| **1. Handoff** | Diagrams folder contains empty placeholder files | Handoff compiler doesn't filter database diagrams by `mermaidCode` presence. |
| **2. Switching** | Switch to Project B and generate workflow does nothing | Panel components are not remounted on project switch (stale component keys), and server streams fail silently on empty step parser arrays. |
| **3. Features** | Feature generation yields a single fallback feature | AI prompt quality triggers parsing failures; parser falls back to a single chunk of PRD text. |
| **3. Tasks** | Task suggestion creates generic tasks | Task suggestion prompt lacks technology stack specs or database ERD schemas. |
| **4. Diagrams**| Raw Mermaid syntax errors printed on screen | Direct rendering of `validationError` on UI components instead of mapped user-friendly states. |

---

## 11. Architectural Changes Required

### Component Isolation Pattern (Frontend)
Change panel keys in `WorkspaceLayout.tsx` to bind to `activeIdeaId`. This guarantees that switching projects clears all local component state, hooks, and active background stream connections.

```tsx
// WorkspaceLayout.tsx
const renderContentPanel = () => {
    const key = `${activeIdeaId}-${refreshKey}`;
    switch (activeSection) {
      case "overview":
        return <OverviewPanel key={key} ... />;
      case "documents":
        return <DocumentsPanel key={key} ... />;
      case "diagrams":
        return <DiagramsPanel key={key} ... />;
      case "features":
        return <FeaturesPanel key={key} ... />;
      case "workflow":
        return <WorkflowPage key={key} ... />;
      case "ir":
        return <IREditor key={key} ... />;
      ...
```

### SSE Stream Progress Protocols (Backend)
Integrate structured status updates (`event: status`) into the diagram compiler and workflow generation controllers. This provides live updates (Validating, Repairing, Retrying) without relying on plain text chunks.

---

## 12. File Action List

### Files To Keep (Unchanged)
* [client.ts](file:///home/mohamed/PAD/web/src/api/client.ts) (API client core)
* [errors.ts](file:///home/mohamed/PAD/web/src/api/errors.ts) (API error handlers)
* [diagram.repository.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.repository.ts) (Diagram DB queries)

### Files To Refactor
* [WorkspaceLayout.tsx](file:///home/mohamed/PAD/web/src/features/ideas/components/WorkspaceLayout.tsx) (Update component key bindings)
* [workspace.tsx](file:///home/mohamed/PAD/web/src/config/workspace.tsx) (Move IR Engine section below overview)
* [WorkflowPage.tsx](file:///home/mohamed/PAD/web/src/features/workflow/page/WorkflowPage.tsx) (Add `isRegenerating` state, render intake on compile)
* [HandoffWorkspace.tsx](file:///home/mohamed/PAD/web/src/features/workflow/components/HandoffWorkspace.tsx) (Remove terminal panel, add horizontal scrollbar)
* [HandoffFileTree.tsx](file:///home/mohamed/PAD/web/src/features/workflow/components/HandoffFileTree.tsx) (Apply `min-w-max`, use `whitespace-nowrap`, remove truncate class)
* [handoff-compiler.service.ts](file:///home/mohamed/PAD/server/src/modules/workflow/handoff-compiler.service.ts) (Filter out empty diagram records)
* [workflow.service.ts](file:///home/mohamed/PAD/server/src/modules/workflow/workflow.service.ts) (Stream explicit error event when steps array is empty)
* [ai.service.ts](file:///home/mohamed/PAD/server/src/modules/ai/ai.service.ts) (Update feature extraction prompt, stream diagram status events)
* [diagram.service.ts](file:///home/mohamed/PAD/server/src/modules/diagram/diagram.service.ts) (Stream diagram compilation sub-steps)
* [diagrams.api.ts](file:///home/mohamed/PAD/web/src/features/diagrams/api/diagrams.api.ts) (Listen to stream status events)
* [useDiagramsPage.ts](file:///home/mohamed/PAD/web/src/features/diagrams/hook/useDiagramsPage.ts) (Track detailed generation status)
* [DiagramCatalogGrid.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramCatalogGrid.tsx) (Map user-friendly badges, remove raw errors)
* [DiagramDetailView.tsx](file:///home/mohamed/PAD/web/src/features/diagrams/components/DiagramDetailView.tsx) (Map detail badges, remove raw errors)

### Files To Delete
* *None*

### New Files Required
* *None*

---

## 13. Fix Priority Matrix

| Task | Category | Complexity | Impact | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Fix project switching component keys** | State Leak | Low | Critical | **P0** |
| **Add empty-steps error stream block** | AI Orchestration | Low | Critical | **P0** |
| **Fix feature extraction prompt** | AI Orchestration | Medium | High | **P1** |
| **Remove diagrams empty packaging** | Data Flow | Low | High | **P1** |
| **Remove terminal from package page** | UI/UX | Low | Medium | **P2** |
| **Add horizontal scroll support to file tree** | UI/UX | Medium | Medium | **P2** |
| **Clean diagram error output display** | UI/UX | Medium | Medium | **P2** |
| **Reorder sidebar navigation** | UI/UX | Low | Low | **P3** |

---

## 14. Remediation Phases

### Phase 1: Critical Stabilization (P0)
1. Update `WorkspaceLayout.tsx` to bind panel keys to `activeIdeaId`.
2. Add the empty-step fallback handling in `workflow.service.ts` to prevent silent stream closure.
3. Validate project switching and ensure Project B generates workflows cleanly.

### Phase 2: Core Improvements & Quality (P1)
1. Enhance the feature extraction stream prompt in `ai.service.ts` to enforce strict output formatting.
2. Update the diagram compilation query in `handoff-compiler.service.ts` to exclude empty diagrams.
3. Validate feature extraction and check that the correct diagrams are compiled.

### Phase 3: UI & UX Polish (P2 - P3)
1. Refactor `HandoffWorkspace` and `HandoffFileTree` to support scrolling and isolate compiler logs.
2. Implement diagram validation status event streams and hide raw validation errors.
3. Reorder sidebar links in `web/src/config/workspace.tsx`.

---

## 15. Acceptance Criteria

### Workflow Page Scrolling
* Long and deeply nested file names can be inspected by scrolling horizontally when zoomed.
* Tree labels do not truncate prematurely before parent width boundary.

### Package Artifact Contents
* Empty or ungenerated diagram files (0 bytes) do not appear in the handoff tree or zip bundle.

### Handoff Package Interface
* The compiler output terminal never appears at the bottom of the package viewing panel.
* Clicking "Regenerate" transitions the page back to the intake/compilation layout.

### Project Switching
* Switching from Project A (with compiled workflow) to Project B (without a workflow) and clicking "Generate" starts a fresh generation stream for Project B.
* No compile logs or streams from Project A leak into Project B.
* Stale compiler streams are terminated immediately upon project switch.

### Feature Extraction
* Feature extraction produces multiple distinct features with names and descriptions.
* Parsing failures are caught and reported cleanly rather than dropping into a PRD text fallback.

### Diagram Validation Displays
* Raw parser error snippets are completely hidden from the catalog grid and detail pages.
* Badge states step through "Generating", "Validating", "Repairing", "Retrying", and "Failed/Generated" based on backend compiler progression.

### Sidebar Link Order
* The "IR Engine" item sits directly between "Discovery & Research" and "Documents" in the sidebar list.
