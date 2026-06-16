# DFD Level 1 Detailed Process Diagrams

This document contains the focused DFD Level 1 diagrams for each of the 5 main processes of the PAD system.

---

## 1. Process 1.0: Intake Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Process Node
    P1("1.0: Intake Process")

    %% Data Store
    D1[("D1: Ideas Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P1 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D1 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    user -->|1.1 Raw Brief Text / Answers| P1
    P1 -->|1.2 Questions, Risks & Missing Details| user
    P1 -->|1.3 Generate Streaming Prompt Analysis| ollama
    ollama -->|1.4 Pre-Validation Insights & Questions| P1
    P1 <-->|1.5 Save Refinements & Set Status Confirmed| D1
```

---

## 2. Process 2.0: IR Compiler Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Process Node
    P2("2.0: IR Compiler Process")

    %% Data Stores
    D1[("D1: Ideas Store")]
    D2[("D2: Project IR Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P2 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D1 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style D2 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    P2 -->|2.1 Read Confirmed Brief| D1
    user -->|2.2 Manual Schema Edits / WebSocket Commands| P2
    P2 -->|2.3 Zod & Custom Semantic Audit Results| user
    P2 -->|2.4 Prompt Ollama for NL Patch Instructions| ollama
    ollama -->|2.5 Patch Updates JSON| P2
    P2 <-->|2.6 Read/Write Schema JSON, OpenAPI Spec & Versions| D2
```

---

## 3. Process 3.0: Documentation Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Process Node
    P3("3.0: Documentation Process")

    %% Data Stores
    D2[("D2: Project IR Store")]
    D3[("D3: Documents Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P3 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D2 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style D3 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    P3 -->|3.1 Read JSON IR Schema & Facts| D2
    P3 -->|3.2 Prompt Ollama for PRD/BRD Drafting| ollama
    ollama -->|3.3 PRD & BRD Draft Texts| P3
    user -->|3.4 Manual Rich Text Edits & Revert Commands| P3
    P3 -->|3.5 Return Documents, Version logs & Rollback Confirmations| user
    P3 <-->|3.6 Save Documents, Incremented Versions & Changelog| D3
```

---

## 4. Process 4.0: Diagram Generation Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Process Node
    P4("4.0: Diagram Generation Process")

    %% Data Stores
    D2[("D2: Project IR Store")]
    D4[("D4: Diagrams Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P4 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D2 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style D4 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    P4 -->|4.1 Read JSON IR Schema & Facts| D2
    P4 -->|4.2 Request Mermaid Script drafting| ollama
    ollama -->|4.3 Raw Mermaid Code| P4
    P4 <-->|4.4 Save Diagrams & Versions| D4
    D4 -->|4.5 Render Diagram Canvas & Live Preview| user
```

---

## 5. Process 5.0: RAG Indexing Process DFD

```mermaid
flowchart TB
    %% External Entities
    user[["User / Client Browser"]]
    ollama[["Ollama API (Local LLM)"]]

    %% Process Node
    P5("5.0: RAG Indexing Process")

    %% Data Store
    D5[("D5: Vector Guidelines Store")]

    %% Styling (Yellow & Purple)
    style user fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style ollama fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px
    style P5 fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style D5 fill:#fef9c3,stroke:#ca8a04,stroke-width:2px

    %% Flows
    user -->|5.1 Ingest Guidelines File / Text Upload| P5
    P5 -->|5.2 Prompt Ollama for Text Embeddings| ollama
    ollama -->|5.3 Guideline Dense Vectors| P5
    P5 -->|5.4 Save Guideline Payloads & Vectors with tenancy metadata| D5
    P5 -->|5.5 Return Guideline Status| user
```
