# DFD Level 2 process decompositions

This document contains the Level 2 Data Flow Diagram (DFD) decompositions for each of the 5 main processes of the PAD system.

---

## 1. Process 1.0: Intake Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Sub-Processes
    P1_1("1.1 Validate Input Length")
    P1_2("1.2 Run Pre-Validation Analysis")
    P1_3("1.3 Refine Idea Context")
    P1_4("1.4 Confirm Workspace")

    %% Data Stores
    D1[("D1: Ideas Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P1_1 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P1_2 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P1_3 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P1_4 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D1 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    user -->|1.1a Raw Brief Text| P1_1
    P1_1 -->|1.1b Valid Brief - 20-10K Chars| P1_2
    P1_2 -->|1.2a Generate Streaming Request| ollama
    ollama -->|1.2b Questions, Risks & Missing Details| P1_2
    P1_2 -->|1.2c Stream Questions & Risks| user
    user -->|1.3a Clarification Answers| P1_3
    P1_3 -->|1.3b Save Refinement Text| D1
    P1_3 -->|1.3c Re-run Pre-Validation| P1_2
    user -->|1.4a Trigger Confirmation| P1_4
    P1_4 -->|1.4b Set status to Confirmed| D1
    P1_4 -->|1.4c Confirmation Success| user
```

---

## 2. Process 2.0: IR Compiler Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Sub-Processes
    P2_1("2.1 Parse Confirmed Brief")
    P2_2("2.2 Handle Manual Tree Edits")
    P2_3("2.3 Handle WebSocket Commands")
    P2_4("2.4 Execute Schema Audits")
    P2_5("2.5 Generate OpenAPI Specification")

    %% Data Stores
    D1[("D1: Ideas Store")]
    D2[("D2: Project IR Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P2_1 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P2_2 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P2_3 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P2_4 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P2_5 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D1 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style D2 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    P2_1 -->|2.1a Read Confirmed Brief| D1
    P2_1 -->|2.1b Initialize IR JSON Schema| D2
    user -->|2.2a Create/Update/Delete tree nodes| P2_2
    P2_2 -->|2.2b Write Manual Schema Edits| D2
    user -->|2.3a Natural Language Commands| P2_3
    P2_3 -->|2.3b Read Current IR Schema| D2
    P2_3 -->|2.3c Prompt Ollama for Patch Instructions| ollama
    ollama -->|2.3d Patch Updates JSON| P2_3
    P2_3 -->|2.3e Write Patched Schema| D2
    P2_2 & P2_3 -->|2.4a Trigger Code Validation| P2_4
    P2_4 -->|2.4b Run Zod Validation & Semantic Audits| D2
    P2_4 -->|2.5a Trigger Specs Compilation| P2_5
    P2_5 -->|2.5b Write OpenAPI 3.0.0 Spec JSON| D2
    P2_5 -->|2.5c Return OpenAPI Spec & Audit Logs| user
```

---

## 3. Process 3.0: Documentation Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Sub-Processes
    P3_1("3.1 Parse Facts Schema")
    P3_2("3.2 Populate Markdown Structures")
    P3_3("3.3 Commit Version & Changelog")
    P3_4("3.4 Revert to Past Version")

    %% Data Stores
    D2[("D2: Project IR Store")]
    D3[("D3: Documents Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P3_1 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P3_2 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P3_3 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P3_4 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D2 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style D3 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    P3_1 -->|3.1a Read JSON IR schema| D2
    P3_1 -->|3.1b Structured Schema Definitions| P3_2
    P3_2 -->|3.2a Prompt Document Drafting| ollama
    ollama -->|3.2b PRD & BRD Draft Texts| P3_2
    user -->|3.3a Manual Rich Text Edits & Changelog| P3_3
    P3_2 -->|3.3b Write initial PRD/BRD drafts| P3_3
    P3_3 -->|3.3c Write Document Data & Version Logs| D3
    P3_3 -->|3.3d Return Documents & Changelogs| user
    user -->|3.4a Revert Version Command| P3_4
    P3_4 -->|3.4b Read Historic Version Content| D3
    P3_4 -->|3.4c Restore Document Content to Target Version| D3
    P3_4 -->|3.4d Revert Success Notification| user
```

---

## 4. Process 4.0: Diagram Generation Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Sub-Processes
    P4_1("4.1 Translate IR Registry")
    P4_2("4.2 Draft Mermaid Script")
    P4_3("4.3 Validate Mermaid Syntax")
    P4_4("4.4 Render Fallback Diagram")

    %% Data Stores
    D2[("D2: Project IR Store")]
    D4[("D4: Diagrams Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P4_1 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P4_2 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P4_3 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P4_4 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D2 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style D4 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    P4_1 -->|4.1a Read JSON IR schema| D2
    P4_1 -->|4.1b Extracted Database/Entities Mapping| P4_2
    P4_2 -->|4.2a Request Mermaid Code generation| ollama
    ollama -->|4.2b Raw Mermaid Scripts - ERD, Sequence, Flowchart| P4_2
    P4_2 -->|4.2c Save Raw Script| P4_3
    P4_3 -->|4.3a Parse code check| P4_3
    P4_3 -->|4.3b Success - Save Diagram Version| D4
    P4_3 -->|4.3c Syntax Error Event| P4_4
    P4_4 -->|4.4a Retrieve default diagram layouts| P4_4
    P4_4 -->|4.4b Write Fallback layouts| D4
    D4 -->|4.5 Render Diagram Canvas & Live Preview| user
```

---

## 5. Process 5.0: RAG Indexing Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Sub-Processes
    P5_1("5.1 Ingest Reference Files")
    P5_2("5.2 Chunk Text Content")
    P5_3("5.3 Vectorize Text Chunks")
    P5_4("5.4 Index Dense Vectors")

    %% Data Stores
    D5[("D5: Vector Guidelines Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P5_1 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P5_2 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P5_3 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style P5_4 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D5 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    user -->|5.1a Upload guideline file / Text input| P5_1
    P5_1 -->|5.1b Normalized guideline plaintext| P5_2
    P5_2 -->|5.2a Recursive character text blocks - Size 750 and Overlap 150| P5_3
    P5_3 -->|5.3a Request Embeddings - nomic-embed-text| ollama
    ollama -->|5.3b 768-Dimension Dense Vectors| P5_3
    P5_3 -->|5.3c Guideline payloads & vectors| P5_4
    P5_4 -->|5.4a Idempotent upsert with userId tenancy| D5
    P5_4 -->|5.4b Guideline indexing success| user
```
