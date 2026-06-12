# IR-Based Compilation Engine — Feature Design Document

## Overview

This document describes the architectural transformation of the SDLC documentation platform from a **generative text tool** into a **structured compilation engine**. The core idea is borrowed from how programming language compilers work: instead of generating each output independently, the system first builds a single structured understanding of the project, then derives all outputs from that understanding.

This feature is the difference between a tool that *writes about* a system and a tool that *understands* a system.

---

## The Problem With The Current Approach

In the current implementation, the AI receives the user's input and generates each document or diagram in a separate, isolated call. Each output is essentially a standalone piece of text or Mermaid code with no formal connection to the others.

This creates three fundamental problems:

**Inconsistency** — There is no mechanism that enforces agreement between outputs. The ERD might name an entity "Customer" while the PRD calls it "User" and the Activity Diagram refers to it as "Client." All three are technically valid AI outputs, but together they describe three different systems.

**No Memory of Structure** — When the user asks for a change, the system has no understanding of what already exists. It cannot know that changing "Customer" to "User" in the ERD should cascade to the API spec, the Prisma schema, and the PRD simultaneously. It simply regenerates from scratch.

**No Real Artifact** — The generated Mermaid code for an ERD is just a string. The system does not actually know what entities exist, what their fields are, or how they relate. It produced text that *looks like* an ERD, but internally it holds no structured knowledge of the domain.

---

## The Solution: A Three-Layer Compilation Pipeline

The new architecture introduces a pipeline with three distinct layers, each with a clear responsibility.

---

### Layer 1 — The Analyzer (AI Frontend)

**Responsibility:** Convert the user's natural language input into structured, typed data.

This is the only layer where the AI is involved in interpretation. The AI's job here is not to write a document — it is to *understand* the project and output a formal representation of what it understood.

The output of this layer is not text. It is a structured object that captures:

- All the entities in the system and their attributes
- The relationships between those entities (one-to-many, many-to-many, etc.)
- The high-level modules or services in the architecture
- The user roles and what actions they can perform
- The business rules and constraints described by the user

Think of this layer as the AI acting as a **business analyst who fills out a structured form** rather than writing a free-form document.

**Why this matters academically:** You are no longer trusting the AI to produce consistent prose. You are constraining its output to a defined schema, which means you can validate it, reject malformed outputs, and guarantee downstream consistency. This is a fundamentally more rigorous approach.

---

### Layer 2 — The Intermediate Representation (IR)

**Responsibility:** Store the structured understanding of the project as the single source of truth.

The IR is the heart of the entire architecture. It is a well-defined, typed data structure that lives in your database and represents everything the system knows about the user's project.

Every entity, every relationship, every module, every role — all of it is stored here in a structured, queryable form. No output is ever generated from the user's original text again. All outputs are generated from the IR.

The IR has several important properties:

**It is the only truth.** If the ERD and the PRD ever disagree, it means one of the generators has a bug — the IR itself is always authoritative.

**It is versioned.** Every time the user makes a change, a new version of the IR is saved. This means you can show a full history of how the project evolved, and you can diff two versions to show exactly what changed.

**It is technology-agnostic.** The IR does not know or care whether the final output is a Prisma schema, a PlantUML diagram, or a Word document. It simply describes the domain. The generators handle the translation.

**It is validatable.** Because the IR has a fixed schema, you can run automated checks on it. Is every relationship pointing to an entity that actually exists? Does every API endpoint reference a defined entity? These are questions you can answer programmatically, not just visually.

---

### Layer 3 — The Generators (Compiler Backends)

**Responsibility:** Transform the IR into a specific output format.

Each generator is an independent module that reads the IR and produces one specific type of output. The generators are completely decoupled from each other and from the AI layer.

The platform includes the following generators:

**ERD Generator**
Reads all entities and relationships from the IR and produces a valid Mermaid ERD diagram. Every entity in the diagram corresponds exactly to an entity in the IR — nothing more, nothing less.

**Architecture Diagram Generator**
Reads the modules, services, and their dependencies from the IR and produces an architecture diagram showing how the system's components connect.

**Activity Diagram Generator**
Reads the user roles and their associated actions from the IR and produces activity diagrams showing the flow of operations for each role.

**PRD Generator**
Reads the business requirements, user roles, and features from the IR and produces a structured Product Requirements Document in natural language. Because the source is structured data, the document is guaranteed to be internally consistent.

**BRD Generator**
Similar to the PRD generator but focused on the business context, stakeholders, and constraints stored in the IR.

**Prisma Schema Generator**
Reads the entities, their fields, and their relationships from the IR and produces a ready-to-use Prisma schema file. This is a direct, deterministic translation — no AI involved in this step at all.

**OpenAPI Spec Generator**
Reads the entities and inferred CRUD operations from the IR and produces an OpenAPI 3.0 specification document. This can be opened directly in Swagger UI or imported into Postman.

---

## How The System Handles Changes

This is where the architecture demonstrates its real value.

When a user wants to make a change — say, adding a new field to an entity, or renaming a module — they do not re-describe their entire project. Instead, they edit the IR directly through a structured UI, or they describe the change in natural language and the Analyzer produces a *delta* (a partial update to the IR rather than a full replacement).

Once the IR is updated, **all generators are re-run automatically.** The ERD updates. The Prisma schema updates. The PRD updates. The OpenAPI spec updates. Every output reflects the new reality simultaneously.

This is the core value proposition: **one change, total consistency.**

Compare this to the current approach where the user would need to manually re-prompt for each document, hope the AI produces consistent outputs, and manually check for contradictions.

---

## Consistency Validation

Because all outputs derive from the same IR, the system can run automatic consistency checks at any time. These checks answer questions like:

- Does every relationship in the ERD reference two entities that actually exist in the IR?
- Does every API endpoint in the spec reference an entity defined in the IR?
- Are there any entities in the IR that have no relationships — which might indicate a modeling mistake?
- Do all user roles in the Activity Diagrams correspond to roles defined in the IR?

If any check fails, the system can surface a specific, actionable warning rather than silently producing a broken output. This is a level of quality assurance that no purely generative system can provide.

---

## The Role of AI in This Architecture

It is important to be precise about where AI is used and where it is not.

| Layer | AI Involved? | Reason |
|---|---|---|
| Analyzer (natural language → IR) | Yes | Interpreting unstructured human input requires AI |
| IR Storage and Versioning | No | Pure data management |
| Consistency Validation | No | Rule-based logic on structured data |
| ERD Generator | No | Deterministic translation from IR |
| Prisma Schema Generator | No | Deterministic translation from IR |
| OpenAPI Spec Generator | No | Deterministic translation from IR |
| PRD / BRD Generator | Partially | Structure comes from IR; prose narration uses AI |
| Activity Diagram Generator | No | Deterministic translation from IR |

This is academically significant. You are not building an app that blindly calls an AI for everything. You are building a system where AI handles what only AI can handle (language understanding), and deterministic logic handles everything else. This separation of concerns is a hallmark of good software architecture.

---

## Why This Is Academically Strong

**It solves a real, named problem.** The problem of consistency across generated artifacts is well-documented in software engineering research. Your IR approach is a direct, principled solution to this problem.

**It applies compiler theory to a new domain.** The analyzer / IR / generator pattern is the foundational architecture of every programming language compiler. Applying it to requirements engineering is a genuine conceptual contribution.

**It is formally defensible.** Because the system has a defined schema and deterministic generators, you can make precise claims about what guarantees the system provides. "All outputs are consistent with the IR" is a claim you can prove, not just demonstrate.

**It is extensible by design.** Adding support for a new output format (say, a Django model file instead of Prisma, or a C4 diagram instead of a component diagram) requires writing one new generator. The AI layer, the IR, and all other generators are completely unaffected. This is the Open/Closed Principle applied at the system level.

**It has a clear boundary between AI and engineering.** Many graduation projects are weak because they are entirely dependent on AI quality. Your architecture shows that you understand where AI fits and where it does not — which is exactly the kind of engineering judgment that impresses academic committees.

---

## Summary

| Aspect | Before | After |
|---|---|---|
| Output consistency | Not guaranteed | Guaranteed by design |
| Change propagation | Manual re-prompting | Automatic across all outputs |
| AI dependency | Total (every output) | Partial (analysis only) |
| Extensibility | Add a new prompt | Add a new generator module |
| Academic contribution | Applied AI tool | Modeling and compilation engine |
| Defensibility | "It works most of the time" | "Here is what it guarantees and why" |