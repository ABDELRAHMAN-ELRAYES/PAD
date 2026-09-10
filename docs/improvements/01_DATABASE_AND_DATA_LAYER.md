# Database & Data Layer Architecture Improvement Plan

> **Domain**: Persistent Storage, Data Modeling, Query Efficiency & Caching  
> **Target Stack**: PostgreSQL 16+, Prisma ORM 5.22+, Redis 7+, PgBouncer  
> **Status**: Technical Specification & Remediation Blueprint  

---

## 1. Executive Summary & Stack Diagnostic

The persistence layer of PAD is built on **PostgreSQL** managed through **Prisma ORM**. The data model models a rich, connected graph of software design artifacts (Ideas $\rightarrow$ Discovery Questionnaires $\rightarrow$ PRD/BRD Documents $\rightarrow$ Mermaid Diagrams $\rightarrow$ Features $\rightarrow$ Tasks & Dependencies $\rightarrow$ Workflow Steps $\rightarrow$ AI Handoff Packages $\rightarrow$ Iteration Sessions).

While the relational domain model is well structured conceptually, the database implementation currently contains **critical scalability bottlenecks**:
1. **Zero Database Indexes on Foreign Keys and Query Filters**: Primary foreign keys and sorting columns lack B-Tree indexes, forcing O(n) sequential table scans across all relational joins and user dashboards.
2. **Catastrophic Cascading Hard Deletes**: The absence of soft deletes (`deletedAt`) means accidental deletion of an `Idea` irreversibly erases all related documents, diagrams, features, tasks, and entire version histories without an audit trail.
3. **Missing Database Transactions**: Multi-step artifact updates (e.g., applying an iteration recommendation across diagrams, tasks, and documents) execute as uncoordinated queries rather than atomic transactions (`prisma.$transaction`), risking inconsistent or partially applied state.
4. **N+1 Query Storms & Sequential Awaits in Loops**: Multi-item initialization loops in `DocumentService` and `DiagramService` fire sequential queries inside `for...of` loops rather than using bulk operations (`createMany`).
5. **Absence of a Caching Layer**: High-frequency read paths (fetching published document versions, diagram code, and project IR schemas) repeatedly query the database instead of leveraging an in-memory cache-aside layer (Redis).

---

## 2. Comprehensive Indexing Audit & DDL Enhancements

### 2.1 Missing Indexes Audit

Every lookup, join, filter, and sort in the application was evaluated against `server/prisma/schema.prisma`:

| Model | Missing Index Pattern | Query Path in Codebase | Performance Impact Without Index |
|:---|:---|:---|:---|
| **`Idea`** | `@@index([userId, createdAt(sort: Desc)])`<br>`@@index([status])` | `IdeaRepository.getAllIdeas(userId)` (`server/src/modules/idea/idea.repository.ts#L53`) | Full table scan + expensive in-memory filesort on every user dashboard load. |
| **`Document`** | `@@index([ideaId])`<br>`@@index([ideaId, type])` | `DocumentRepository.getDocumentsByIdeaId` | Sequential scan of `documents` table for every project document view. |
| **`Diagram`** | `@@index([ideaId])`<br>`@@index([ideaId, type])` | `DiagramRepository.getDiagramsByIdeaId` | Sequential scan of `diagrams` table for every diagram canvas render. |
| **`Feature`** | `@@index([ideaId, status])`<br>`@@index([priority])` | `FeatureRepository.getFeaturesByIdeaId` | Sequential scan of `features` table during task breakdown and extraction. |
| **`Task`** | `@@index([featureId, status])`<br>`@@index([order])` | `TaskRepository.getTasksByFeatureId` | Slow task list rendering as features and tasks multiply. |
| **`TaskDependency`** | `@@index([dependsOnTaskId])` | Reverse dependency lookups in dependency graph traversal | Full table scan on `task_dependencies` to find blocking upstream tasks. |
| **`WorkflowStep`** | `@@index([workflowId, order])`<br>`@@index([taskId])` | `WorkflowRepository.getWorkflowByIdeaId` | Sequential scan across all workflow steps when loading AI IDE instructions. |
| **`WorkflowStepDependency`** | `@@index([dependsOnStepId])` | Reverse step dependency validation | Full table scan when validating DAG acyclicity. |
| **`IterationMessage`** | `@@index([sessionId, createdAt(sort: Asc)])` | `IterationRepository.getMessagesBySessionId` | Sequential scan of chat messages for every interactive refinement prompt. |
| **`IterationSuggestionAction`** | `@@index([suggestionId])`<br>`@@index([module, targetId])` | `IterationRepository.applySuggestion` | Slow plan reconciliation when applying multi-module changes. |
| **`File`** | `@@index([userId, createdAt])` | `FileRepository.getFilesByUserId` | Full table scan of user file catalog. |
| **`Guideline`** | `@@index([userId])` | `GuidelineRepository.getGuidelinesByUserId` | Sequential scan during guideline retrieval and RAG indexing. |

---

### 2.2 Target Prisma Schema Migration

To resolve all indexing gaps and introduce soft-delete support, update `server/prisma/schema.prisma` with the following schema additions:

```prisma
// ============================================
// Model: Idea (Optimized with Indexes & Soft Deletes)
// ============================================
model Idea {
    id                  String    @id @default(uuid())
    userId              String    @map("user_id")
    rawText             String    @map("raw_text") @db.Text
    refinedText         String?   @map("refined_text") @db.Text
    businessDescription String?   @map("business_description") @db.Text
    status              String    @default("draft")
    analysisResult      Json?     @map("analysis_result")
    researchResult      Json?     @map("research_result")
    confirmedAt         DateTime? @map("confirmed_at")
    deletedAt           DateTime? @map("deleted_at")
    createdAt           DateTime  @default(now()) @map("created_at")
    updatedAt           DateTime  @updatedAt @map("updated_at")

    // Relations
    user                   User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
    discoveryQuestionnaire DiscoveryQuestionnaire?
    questionnaireResponse  QuestionnaireResponse?
    researchJob            ResearchJob?
    documents              Document[]
    diagrams               Diagram[]
    features               Feature[]
    workflow               Workflow?
    iterationSession       IterationSession?
    projectIR              ProjectIR?
    handoffPackages        HandoffPackage[]

    @@index([userId, createdAt(sort: Desc)])
    @@index([userId, status])
    @@index([deletedAt])
    @@map("ideas")
}

// ============================================
// Model: Document (Indexed)
// ============================================
model Document {
    id        String    @id @default(uuid())
    ideaId    String    @map("idea_id")
    type      String
    title     String
    content   String    @db.Text
    status    String    @default("draft")
    deletedAt DateTime? @map("deleted_at")
    createdAt DateTime  @default(now()) @map("created_at")
    updatedAt DateTime  @updatedAt @map("updated_at")

    idea     Idea              @relation(fields: [ideaId], references: [id], onDelete: Cascade)
    versions DocumentVersion[]

    @@index([ideaId, type])
    @@index([ideaId, createdAt(sort: Desc)])
    @@index([deletedAt])
    @@map("documents")
}

// ============================================
// Model: Diagram (Indexed)
// ============================================
model Diagram {
    id              String    @id @default(uuid())
    ideaId          String    @map("idea_id")
    type            String
    title           String
    mermaidCode     String    @map("mermaid_code") @db.Text
    status          String    @default("draft")
    tier1Code       String?   @map("tier1_code") @db.Text
    tier2Code       String?   @map("tier2_code") @db.Text
    tier3Code       String?   @map("tier3_code") @db.Text
    activeTier      Int?      @map("active_tier")
    validationError String?   @map("validation_error") @db.Text
    deletedAt       DateTime? @map("deleted_at")
    createdAt       DateTime  @default(now()) @map("created_at")
    updatedAt       DateTime  @updatedAt @map("updated_at")

    idea         Idea                 @relation(fields: [ideaId], references: [id], onDelete: Cascade)
    versions     DiagramVersion[]
    featureLinks FeatureDiagramLink[]

    @@index([ideaId, type])
    @@index([ideaId, createdAt(sort: Desc)])
    @@index([deletedAt])
    @@map("diagrams")
}

// ============================================
// Model: Feature (Indexed)
// ============================================
model Feature {
    id                 String    @id @default(uuid())
    ideaId             String    @map("idea_id")
    title              String
    description        String    @db.Text
    businessValue      String?   @map("business_value") @db.Text
    userValue          String?   @map("user_value") @db.Text
    acceptanceCriteria Json?     @map("acceptance_criteria")
    source             String
    status             String    @default("active")
    priority           String    @default("medium")
    complexity         String    @default("medium")
    dependencies       Json?
    technicalScope     String?   @map("technical_scope") @db.Text
    suggestedTaskCount Int       @default(0) @map("suggested_task_count")
    deletedAt          DateTime? @map("deleted_at")
    createdAt          DateTime  @default(now()) @map("created_at")
    updatedAt          DateTime  @updatedAt @map("updated_at")

    idea         Idea                 @relation(fields: [ideaId], references: [id], onDelete: Cascade)
    tasks        Task[]
    versions     FeatureVersion[]
    diagramLinks FeatureDiagramLink[]

    @@index([ideaId, status])
    @@index([ideaId, priority])
    @@index([deletedAt])
    @@map("features")
}

// ============================================
// Model: Task & Dependencies (Indexed)
// ============================================
model Task {
    id              String    @id @default(uuid())
    featureId       String    @map("feature_id")
    title           String
    description     String    @db.Text
    status          String    @default("planned")
    priority        String    @default("medium")
    estimatedEffort String?   @map("estimated_effort")
    order           Int       @default(0)
    deletedAt       DateTime? @map("deleted_at")
    createdAt       DateTime  @default(now()) @map("created_at")
    updatedAt       DateTime  @updatedAt @map("updated_at")

    feature      Feature          @relation(fields: [featureId], references: [id], onDelete: Cascade)
    versions     TaskVersion[]
    dependents   TaskDependency[] @relation("DependentTask")
    dependencies TaskDependency[] @relation("DependsOnTask")
    steps        WorkflowStep[]

    @@index([featureId, status])
    @@index([featureId, order])
    @@index([deletedAt])
    @@map("tasks")
}

model TaskDependency {
    id              String   @id @default(uuid())
    taskId          String   @map("task_id")
    dependsOnTaskId String   @map("depends_on_task_id")
    createdAt       DateTime @default(now()) @map("created_at")

    task      Task @relation("DependentTask", fields: [taskId], references: [id], onDelete: Cascade)
    dependsOn Task @relation("DependsOnTask", fields: [dependsOnTaskId], references: [id], onDelete: Cascade)

    @@unique([taskId, dependsOnTaskId])
    @@index([dependsOnTaskId])
    @@map("task_dependencies")
}

// ============================================
// Model: Iteration Engine (Indexed)
// ============================================
model IterationMessage {
    id        String   @id @default(uuid())
    sessionId String   @map("session_id")
    role      String
    content   String   @db.Text
    createdAt DateTime @default(now()) @map("created_at")

    session    IterationSession     @relation(fields: [sessionId], references: [id], onDelete: Cascade)
    suggestion IterationSuggestion?

    @@index([sessionId, createdAt(sort: Asc)])
    @@map("iteration_messages")
}

model IterationSuggestionAction {
    id           String   @id @default(uuid())
    suggestionId String   @map("suggestion_id")
    module       String
    targetId     String   @map("target_id")
    actionType   String
    newContent   String?  @map("new_content") @db.Text
    createdAt    DateTime @default(now()) @map("created_at")

    suggestion IterationSuggestion @relation(fields: [suggestionId], references: [id], onDelete: Cascade)

    @@index([suggestionId])
    @@index([module, targetId])
    @@map("iteration_suggestion_actions")
}
```

---

## 3. Query Optimization & N+1 Elimination

### 3.1 Batch Document Initialization

**Anti-Pattern in Current Code (`server/src/modules/document/document.service.ts#L57-L60`)**:
```typescript
// ANTI-PATTERN: Sequential awaits inside a loop (N round trips)
const created: IDocument[] = [];
for (const type of selectedTypes) {
    const title = this.getFriendlyDocumentTitle(type);
    const document = await this.documentRepo.createDocument({
        ideaId,
        type,
        title,
        content: `Initial content for ${title}...`
    });
    created.push(document);
}
```

**Production-Grade Batch Remediation**:
```typescript
// REFACTORED: Single multi-row transaction using createMany / $transaction
static async initializeSelectedDocumentsBatch(
    ideaId: string,
    selectedTypes: string[],
    prismaClient: PrismaClient
): Promise<IDocument[]> {
    const documentsData = selectedTypes.map((type) => ({
        id: crypto.randomUUID(),
        ideaId,
        type,
        title: this.getFriendlyDocumentTitle(type),
        content: `# ${this.getFriendlyDocumentTitle(type)}\n\n_Draft generated automatically. Run generation to complete._`,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    return await prismaClient.$transaction(async (tx) => {
        // Bulk insert documents
        await tx.document.createMany({
            data: documentsData,
            skipDuplicates: true,
        });

        // Initialize v1 version for each document in parallel
        const versionData = documentsData.map((doc) => ({
            id: crypto.randomUUID(),
            documentId: doc.id,
            version: 1,
            content: doc.content,
            changelog: "Initial creation",
            createdAt: new Date(),
        }));

        await tx.documentVersion.createMany({
            data: versionData,
            skipDuplicates: true,
        });

        return await tx.document.findMany({
            where: { ideaId, id: { in: documentsData.map((d) => d.id) } },
            include: { versions: true },
        });
    });
}
```

---

### 3.2 Push-Down SQL Aggregation & Pagination

**Anti-Pattern**: Fetching entire tables into Node.js heap memory to compute counts or slice pages.

**Production-Grade Repository Pattern**:
```typescript
export interface PaginatedResult<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export async function getPaginatedIdeas(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: string
): Promise<PaginatedResult<Idea>> {
    const prisma = PrismaClientSingleton.getPrismaClient();
    const skip = (page - 1) * limit;

    const whereClause: Prisma.IdeaWhereInput = {
        userId,
        deletedAt: null,
        ...(status ? { status } : {}),
    };

    // Execute count and page slice in a single round-trip transaction
    const [totalItems, items] = await prisma.$transaction([
        prisma.idea.count({ where: whereClause }),
        prisma.idea.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                userId: true,
                rawText: true,
                status: true,
                confirmedAt: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        documents: true,
                        diagrams: true,
                        features: true,
                    },
                },
            },
        }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
        items: items as any,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
}
```

---

## 4. Redis Cache-Aside Strategy

To protect PostgreSQL from redundant reads on hot paths (e.g. ProjectIR compilation, document version inspections, and diagram previews), implement a Redis cache-aside layer with structured cache invalidation:

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Service as Backend Service
    participant Redis as Redis Cache
    participant DB as PostgreSQL (Prisma)

    Client->>Service: GET /api/v1/ideas/:id/ir
    Service->>Redis: GET "cache:ir:{ideaId}"
    alt Cache Hit
        Redis-->>Service: Return cached JSON ProjectIR
        Service-->>Client: 200 OK (Served from Redis, <5ms)
    else Cache Miss
        Redis-->>Service: null
        Service->>DB: Query ProjectIR from DB
        DB-->>Service: ProjectIR record
        Service->>Redis: SETEX "cache:ir:{ideaId}" 3600 JSON.stringify(IR)
        Service-->>Client: 200 OK (Served from DB, ~35ms)
    end
```

### Cache Invalidation Rules:
- When a `ProjectIR`, `Document`, or `Diagram` is updated, the service must execute an atomic invalidation:
  ```typescript
  await redis.del(`cache:ir:${ideaId}`);
  await redis.del(`cache:docs:${ideaId}`);
  await redis.del(`cache:diagrams:${ideaId}`);
  ```

---

## 5. Connection Pooling & PgBouncer Configuration

In a production environment with multiple Node.js worker containers and Next.js serverless functions, direct PostgreSQL connections can quickly exhaust Postgres `max_connections` (typically 100–300).

### Connection Sizing Strategy:
- **PgBouncer Mode**: `transaction` pooling mode.
- **Node.js Prisma Connection Pool**: Sized according to the standard sizing equation:
  $$\text{Pool Size} = ((\text{CPU Cores} \times 2) + \text{Effective Spindle Count})$$
- **Prisma Connection String with PgBouncer**:
  ```env
  DATABASE_URL="postgresql://user:password@pgbouncer.internal:6432/pad_prod?schema=public&pgbouncer=true&connection_limit=10&pool_timeout=10"
  DIRECT_URL="postgresql://user:password@postgres.internal:5432/pad_prod?schema=public"
  ```
