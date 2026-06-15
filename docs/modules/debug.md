# Root Cause Report & Fix Plan: Deep Research Issues

## 1. Root Cause Report

### Issue 1: Project Overview sidebar cannot scroll while deep research is running
* **Cause**: 
  The frontend was locked in an infinite render/execution loop (see Issues 2 & 3). This caused the `ResearchProgressPanel` to receive continuous, rapid state updates. 
  On every state change to the `logs` array, the `useEffect` inside `ResearchProgressPanel.tsx` invokes `logEndRef.current?.scrollIntoView({ behavior: "smooth" })`. This continuous, rapid snapping of focus/scroll inside the DOM effectively hijacked the scroll behaviour of the parent `.workspace-panel` container, blocking the user from scrolling the page or the Project Overview sidebar.
* **Evidence**:
  * [ResearchProgressPanel.tsx](file:///home/mohamed/PAD/web/src/features/ideas/components/ResearchProgressPanel.tsx#L33-L35):
    ```typescript
    useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);
    ```
  * During the infinite render loop, `logs` is updated multiple times per second, triggering continuous scroll hijacking.
* **Affected Files**:
  * [ResearchProgressPanel.tsx](file:///home/mohamed/PAD/web/src/features/ideas/components/ResearchProgressPanel.tsx)

---

### Issues 2 & 3: Research progress bar is not updating and Activity Feed is stuck on "Initializing Deep Research"
* **Cause**:
  In `OverviewPanel.tsx`, the `useResearchStream` hook is initialized with an inline callback for `onComplete`:
  ```typescript
  const { ... } = useResearchStream(ideaId, (updatedIdea) => {
    onIdeaUpdate(updatedIdea);
  });
  ```
  Because this arrow function is defined inline, it is recreated on every single render of `OverviewPanel`. 
  Inside `useResearchStream.ts`, the `startResearch` callback lists `onComplete` in its dependency array, meaning `startResearch` is also recreated on every render.
  Since the `useEffect` in `OverviewPanel` that automatically starts deep research depends on `startResearch`, it triggers a new `startResearch()` call on every single render as long as `idea.status === "questionnaire_complete"`.
  This resets the progress to `5%` and resets the logs state to `[{ message: "Initializing Deep Research..." }]` in the client constantly, keeping the UI permanently stuck at the initial state.
* **Evidence**:
  * [useResearchStream.ts](file:///home/mohamed/PAD/web/src/features/ideas/hook/useResearchStream.ts#L67-L149)
  * [OverviewPanel.tsx](file:///home/mohamed/PAD/web/src/features/ideas/components/OverviewPanel.tsx#L45-L56)
  * Database logs show continuous restarts of the same job.
* **Affected Files**:
  * [useResearchStream.ts](file:///home/mohamed/PAD/web/src/features/ideas/hook/useResearchStream.ts)
  * [OverviewPanel.tsx](file:///home/mohamed/PAD/web/src/features/ideas/components/OverviewPanel.tsx)

---

### Issue 4: Status text updates correctly, but Activity Feed does not
* **Cause**:
  The separate status text displays the `message` state variable, which is updated correctly by the SSE events. However, because `startResearch()` is re-invoked on every render, the `logs` state is constantly reset back to the single initial entry: `[{ timestamp, message: "Initializing Deep Research..." }]`.
* **Evidence**: Same as Issues 2 & 3.
* **Affected Files**:
  * [useResearchStream.ts](file:///home/mohamed/PAD/web/src/features/ideas/hook/useResearchStream.ts)

---

### Service Issue: Deep Research infinite loop & serialization error
* **Cause**:
  1. The client-side infinite render loop spammed the server with POST requests to start research, causing infinite execution triggers and resource exhaustion.
  2. The Python bridge process (`deep_research_bridge.py`) crashed during final result serialization. The `result` dictionary returned by `detailed_research()` contains LangChain `Document` objects (under the `findings.documents` path). Because LangChain `Document` objects are not JSON-serializable, `json.dumps` threw a `TypeError` and exited the bridge with code 1, which the orchestrator caught as a complete failure, resetting the idea status to `"draft"`.
* **Evidence**:
  * Standard error output from task-98 run:
    ```
    TypeError: Object of type Document is not JSON serializable
        at print(json.dumps({"type": "result", "data": result}), flush=True)
    ```
* **Affected Files**:
  * [deep_research_bridge.py](file:///home/mohamed/PAD/server/src/modules/research/deep_research_bridge.py)

---

## 2. Fix Plan

### Fix 1: Stabilize `startResearch` and `pollStatus` in the client hook
* **File**: [useResearchStream.ts](file:///home/mohamed/PAD/web/src/features/ideas/hook/useResearchStream.ts)
* **Why modification is needed**: 
  We will use a `useRef` to store the current `onComplete` callback:
  ```typescript
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  ```
  By calling `onCompleteRef.current(...)` instead of `onComplete(...)`, we can remove `onComplete` from the dependency arrays of `startResearch` and `pollStatus`. This ensures `startResearch` is stable across renders, breaking the infinite loop.
* **File**: [OverviewPanel.tsx](file:///home/mohamed/PAD/web/src/features/ideas/components/OverviewPanel.tsx)
* **Why modification is needed**: Wrap the `onIdeaUpdate` handler in a `useCallback` as a best practice to match the stable hook API.

### Fix 2: Recursive serialization utility in Python bridge
* **File**: [deep_research_bridge.py](file:///home/mohamed/PAD/server/src/modules/research/deep_research_bridge.py)
* **Why modification is needed**: 
  We will implement a recursive `make_serializable(obj)` helper that converts LangChain `Document` objects (and other non-primitive types) to standard serializable dictionaries or strings:
  ```python
  def make_serializable(obj):
      if isinstance(obj, dict):
          return {k: make_serializable(v) for k, v in obj.items()}
      elif isinstance(obj, (list, tuple)):
          return [make_serializable(v) for v in obj]
      elif hasattr(obj, "page_content") and hasattr(obj, "metadata"): # LangChain Document
          return {
              "page_content": obj.page_content,
              "metadata": make_serializable(obj.metadata)
          }
      elif hasattr(obj, "to_json"):
          return obj.to_json()
      elif isinstance(obj, (int, float, str, bool)) or obj is None:
          return obj
      return str(obj)
  ```
  This will be run on the final `result` dictionary before `json.dumps()` is called, preventing bridge crashes.