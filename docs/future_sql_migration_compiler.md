# Future Work: Automated SQL Schema Migration Compiler

This document details the architectural design and system data flow for the proposed **Automated SQL Schema Migration Compiler** (feature specification 10.4.1), planned for future execution. This component will enable developers to synchronize physical database configurations with the Facts Registry with a single click by generating Prisma schemas and SQL migrations directly from the project's Intermediate Representation (IR) JSON schema.

---

## 1. Compiler Pipeline & Data Flow Diagram

The diagram below outlines the conversion pipeline, highlighting the parsing, AST comparison, and target script generation steps.

```mermaid
flowchart TB
    %% Input Layer
    subgraph InputLayer ["Input Layer (Yellow)"]
        direction LR
        ir_json["Facts Registry IR\n(JSON Specification)"]
        prev_ast["Previous Database AST\n(In-Memory Store)"]
    end

    %% Parsing & AST Construction
    subgraph ParsingLayer ["Parsing & AST Translation (Yellow)"]
        direction TB
        parser["IR Parser & Validator\n(Schema Validation)"]
        type_map["Type System Mapping\n- string to VARCHAR\n- number to DOUBLE PRECISION\n- boolean to BOOLEAN\n- date to TIMESTAMP\n- text to TEXT"]
        constraint_map["Constraint Translation\n- isPrimaryKey to PRIMARY KEY\n- relationships to FOREIGN KEY\n- ON DELETE CASCADE/SET NULL"]
        ast_gen["Database AST Generator\n(In-Memory Node Tree)"]
    end

    %% AST Diff Engine
    subgraph DiffEngine ["AST Diff Engine (Purple)"]
        direction TB
        diff_proc["Version Comparison Engine\n(Current vs. Previous AST)"]
        add_detect["Added Entities Detection\n(CREATE TABLE)"]
        del_detect["Deleted Entities Detection\n(DROP TABLE)"]
        mod_detect["Modified Fields Detection\n(ALTER TABLE / ADD / TYPE)"]
    end

    %% SQL Generation
    subgraph CodeGen ["SQL Migration Generator (Purple)"]
        direction TB
        sql_builder["SQL Script Builder\n(Syntax Compiler)"]
        file_writer["Migration File Writer\n(Timestamped Scripts)"]
    end

    %% Outputs
    subgraph OutputLayer ["Output Generation (Purple)"]
        direction LR
        sql_scripts["Output Migration Scripts\n(migration.sql)"]
        prisma_schema["Prisma Schema Update\n(schema.prisma)"]
    end

    %% Connections
    ir_json -->|Raw JSON Input| parser
    parser --> type_map
    type_map --> constraint_map
    constraint_map --> ast_gen
    
    ast_gen -->|Current AST| diff_proc
    prev_ast -->|Previous AST| diff_proc
    
    diff_proc --> add_detect & del_detect & mod_detect
    add_detect & del_detect & mod_detect --> sql_builder
    
    sql_builder --> file_writer
    file_writer -->|Sequential SQL| sql_scripts
    file_writer -->|ORM Definition| prisma_schema

    %% Styling configurations (Yellow & Purple Theme)
    style InputLayer fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style ir_json fill:#fefbeb,stroke:#eab308,stroke-width:1px
    style prev_ast fill:#fefbeb,stroke:#eab308,stroke-width:1px

    style ParsingLayer fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
    style parser fill:#fefbeb,stroke:#eab308,stroke-width:1px
    style type_map fill:#fefbeb,stroke:#eab308,stroke-width:1px
    style constraint_map fill:#fefbeb,stroke:#eab308,stroke-width:1px
    style ast_gen fill:#fefbeb,stroke:#eab308,stroke-width:1px

    style DiffEngine fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style diff_proc fill:#faf5ff,stroke:#a855f7,stroke-width:1px
    style add_detect fill:#faf5ff,stroke:#a855f7,stroke-width:1px
    style del_detect fill:#faf5ff,stroke:#a855f7,stroke-width:1px
    style mod_detect fill:#faf5ff,stroke:#a855f7,stroke-width:1px

    style CodeGen fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style sql_builder fill:#faf5ff,stroke:#a855f7,stroke-width:1px
    style file_writer fill:#faf5ff,stroke:#a855f7,stroke-width:1px

    style OutputLayer fill:#faf5ff,stroke:#a855f7,stroke-width:2px
    style sql_scripts fill:#faf5ff,stroke:#a855f7,stroke-width:1px
    style prisma_schema fill:#faf5ff,stroke:#a855f7,stroke-width:1px
```

---

## 2. Compilation Stages

### 2.1 Type System Mapping
The compiler translates abstract database-agnostic types registered inside the Facts Registry JSON structure to actual physical dialect equivalents in PostgreSQL:
*   `string` $\rightarrow$ `VARCHAR(255)`
*   `number` $\rightarrow$ `DOUBLE PRECISION`
*   `boolean` $\rightarrow$ `BOOLEAN`
*   `date` $\rightarrow$ `TIMESTAMP`
*   `text` $\rightarrow$ `TEXT`

### 2.2 Constraint & Relation Mapping
*   **Primary Keys**: Translates elements marked with `isPrimaryKey: true` directly to `PRIMARY KEY` specifications.
*   **Foreign Keys**: Inspects the `relationships` array to structure referential constraints. Emits standard target constraints such as `ON DELETE CASCADE` or `ON DELETE SET NULL` based on reference rules.

### 2.3 AST Differentiation Engine
To ensure schema updates preserve existing database records:
1.  **Current AST Representation**: Formulates an in-memory node-tree representation of the newly edited IR.
2.  **Previous AST Representation**: Pulls the previous committed revision AST from version control records.
3.  **Diffing Nodes**:
    *   *Added Nodes*: Identifies new tables/columns. Outputs `CREATE TABLE` / `ALTER TABLE ... ADD COLUMN` scripts.
    *   *Removed Nodes*: Outputs safe `DROP TABLE` or comment warnings for manual verification.
    *   *Modified Type Nodes*: Compiles `ALTER COLUMN TYPE` directives, ensuring type conversion functions (e.g. `USING value::type`) are injected.

### 2.4 SQL Migration Output
Writes incremental, sequential SQL files to the target workspace migrations directory (e.g. `migrations/20260613000000_update_schema.sql`), ensuring a complete, audit-ready version history of the database schema.
