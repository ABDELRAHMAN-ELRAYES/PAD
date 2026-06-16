# Future Work: Bidirectional Git Synchronization Architecture

This document details the architectural design and system data flow for the proposed **Bidirectional Git Synchronization Architecture** (feature specification 10.4.2), planned for future execution. This system integrates the PAD Facts Registry directly with collaborative Git workflows (such as GitHub or GitLab) to provide instant bidirectional syncing between system specifications and repository code.

---

## 1. System Architecture Diagram

The flowchart below represents the data flow, components, and boundaries separating external repository hosts from internal compiler systems.

```mermaid
flowchart TB
    %% External Git
    subgraph GitZone ["External Git Repository (Yellow)"]
        direction LR
        git_repo["Git Repository\n(GitHub / GitLab)"]
    end

    %% Webhook & Outbound Worker Ingress
    subgraph GitIngress ["Webhook Listener & Ingress (Yellow)"]
        direction TB
        webhook["Webhook Listener\n(Express HTTP Endpoint)"]
        ssh_worker["Outbound SSH Worker\n(GPG Commit Signer)"]
    end

    %% Parsing Layer
    subgraph ParseLayer ["Code Parsing & AST Extraction (Purple)"]
        direction TB
        parser["OpenAPI & Code AST Parser\n(swagger.json / openapi.yaml)"]
        ast_build["AST Construction\n(Endpoints, Schemas, Queries)"]
    end

    %% Diff & Merge Engine
    subgraph SyncEngine ["Diff & Merge Engine (Purple)"]
        direction TB
        diff_engine["Diff Calculation Engine\n(Code AST vs. Active IR)"]
        resolver["Interactive Conflict Resolver\n(Manual Developer Review)"]
    end

    %% Core Data Registry
    subgraph CoreRegistry ["Facts Registry & Assets (Purple)"]
        direction TB
        facts_registry["IR Facts Registry\n(JSON Schema Store)"]
        autogen_assets["Downstream Autogen Assets\n(PRD Docs, Mermaid Diagrams)"]
    end

    %% Connections
    %% Outbound Pipeline (PAD-to-Git)
    autogen_assets -.->|Trigger Background Update| ssh_worker
    ssh_worker ===|SSH Push signed commits| git_repo

    %% Inbound Pipeline (Git-to-PAD)
    git_repo ===|Webhook POST event| webhook
    webhook -->|Payload Analysis| parser
    parser --> ast_build
    ast_build -->|Pushed AST| diff_engine
    facts_registry -->|Current IR| diff_engine
    diff_engine -->|Conflicting Node Trees| resolver
    resolver -->|Resolved Updates| facts_registry
    diff_engine -->|Clean Fast-Forward| facts_registry
    facts_registry -->|Trigger Recompilation| autogen_assets

    %% Style configurations (Yellow & Purple Theme)
    style GitZone fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style git_repo fill:#fefbeb,stroke:#eab308,stroke-width:1px

    style GitIngress fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style webhook fill:#fefbeb,stroke:#eab308,stroke-width:1px
    style ssh_worker fill:#fefbeb,stroke:#eab308,stroke-width:1px

    style ParseLayer fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style parser fill:#faf5ff,stroke:#a855f7,stroke-width:1px
    style ast_build fill:#faf5ff,stroke:#a855f7,stroke-width:1px

    style SyncEngine fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style diff_engine fill:#faf5ff,stroke:#a855f7,stroke-width:1px
    style resolver fill:#faf5ff,stroke:#a855f7,stroke-width:1px

    style CoreRegistry fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style facts_registry fill:#faf5ff,stroke:#a855f7,stroke-width:1px
    style autogen_assets fill:#faf5ff,stroke:#a855f7,stroke-width:1px
```

---

## 2. Sync Logic & Pipeline Breakdown

The integration flow operates across two distinct pipelines:

### 2.1 Outbound Pipeline (PAD-to-Git)
Triggered automatically when a developer confirms a workspace update or rolls back a document version:
1.  **Background Activation**: The Express server triggers a lightweight background worker.
2.  **Repository Setup**: The worker clones the target Git repository over SSH using server-side keys.
3.  **Asset Exporting**: Re-compiles clean, latest revisions of the OpenAPI specification (`openapi.json`), markdown requirements documents (`PRD.md`), and Mermaid flowchart diagrams (`.svg` representations).
4.  **Commit Signing**: Commits the modifications and signs the transaction using a server-managed GPG key to verify commit authenticity.
5.  **Pushing updates**: Publishes the signed commit to the designated branch on the remote Git repository.

### 2.2 Inbound Pipeline (Git-to-PAD)
Triggered when external developers push code edits directly to the remote repository:
1.  **Webhook Notification**: GitHub/GitLab pushes a webhook POST event containing commit payloads to the PAD Webhook Listener endpoint.
2.  **OpenAPI Specification Parsing**: The inbound parser reads updated `swagger.json` or `openapi.yaml` files, decomposing route parameters, schemas, and query arguments into an Abstract Syntax Tree (AST) structure.
3.  **Model Diff Engine**: Performs node-by-node AST validation against the active in-memory Facts Registry IR representation.
4.  **Interactive Conflict Resolution**:
    *   *Clean Updates*: Automatically applies non-destructive additions (e.g. newly pushed endpoints) directly back to the Facts Registry.
    *   *Conflict Detection*: Flags overlapping structural edits or deletions for manual developer resolution via the workspace dashboard interface.
5.  **Downstream Propagation**: Once updates are merged into the Facts Registry, the system automatically triggers compiler modules to regenerate downstream PRD specifications and update the web canvas.
