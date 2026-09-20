# PAD Server — NestJS + TypeScript + PostgreSQL

Backend server for **PAD (Product Architecture Designer)** — an AI-powered platform that transforms software ideas into comprehensive SDLC artifacts, structured Intermediate Representation (IR), and AI IDE handoff packages.

---

## Core Capabilities

- **Auth & User Management**: Secure JWT authentication, user profile management, password resets, and role checks.
- **Idea Intake & AI Discovery**: Structured idea intake and interactive AI discovery questions (without deep-research bottlenecks).
- **Intermediate Representation (IR)**: Normalized factual system schema (entities, fields, relations, modules, business rules) acting as the single source of truth.
- **Document Generation**: Auto-generates standard-compliant PRD and BRD from confirmed ideas and compiled IR.
- **Diagram Generation & Multi-Tier Validation**: Generates ERD, Sequence, Flowchart, and Architecture diagrams with multi-tier validation fallback and version control.
- **Workflow Generation & AI IDE Handoff**: Compiles DAG execution steps and downloadable ZIP handoff packages with master prompts for Cursor/Copilot/Windsurf.
- **Iteration Engine**: Real-time Socket.io feedback loop supporting discussion chat, streaming LLM responses, and live schema patching with downstream asset recompilation.

---

## Prerequisites

- Node.js 18+
- PostgreSQL 16+
- pnpm package manager (`npm install -g pnpm`)
- Local or Remote LLM provider (Ollama / Gemini / Anthropic)

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
pnpm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and configure your credentials:

```bash
cp .env.example .env
```

**Required Variables**:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/pad_db"
NODE_ENV=development
PORT=5000
JWT_SECRET=your_super_secret_jwt_key
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:4b
```

### 3. Apply Database Migrations

Apply the atomic, reversible SQL migrations via `DatabaseService`:

```bash
# Run all pending migrations
pnpm migrate:up

# Check migration status
pnpm migrate:status

# Rollback last migration if needed
pnpm migrate:down
```

### 4. Run the Server

Development mode (with hot reload):
```bash
pnpm dev
```

Production build:
```bash
pnpm build
pnpm start
```

Once started, explore the interactive **Swagger OpenAPI documentation** at:
`http://localhost:5000/api/docs`

---

## Project Architecture

```
server/
├── migrations/                 # Atomic SQL migrations (21 up/down files)
├── scripts/
│   └── migrate.ts             # Migration runner script
├── src/
│   ├── app.module.ts          # Root NestJS application module
│   ├── main.ts                # Application bootstrap, Swagger, pipes & filters
│   ├── common/                # Shared filters, interceptors, middleware & guards
│   ├── config/                # Environment configuration
│   ├── database/              # DatabaseModule & DatabaseService (pg.Pool raw SQL)
│   ├── modules/
│   │   ├── ai/                # AI LLM streaming & prompt orchestration
│   │   ├── auth/              # JWT auth, guards & decorators
│   │   ├── user/              # User profile management
│   │   ├── file/              # File upload & document parsers (PDF/MD/Text)
│   │   ├── guideline/         # Architecture & style guideline management
│   │   ├── idea/              # Idea intake, drafts, and status progression
│   │   ├── discovery/         # Discovery questions & session refinement
│   │   ├── document/          # PRD / BRD generation & versioning
│   │   ├── diagram/           # Mermaid diagram compiler & validation engine
│   │   ├── ir/                # Intermediate Representation compiler & patcher
│   │   ├── workflow/          # DAG workflow & AI IDE handoff compiler
│   │   └── iteration/         # Chat sessions, intent classifier & live sync
│   └── services/              # SocketService & shared utilities
├── package.json
└── tsconfig.json
```

---

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start development server with tsx hot reload |
| `pnpm build` | Compile TypeScript to JavaScript (`dist/`) |
| `pnpm start` | Run compiled production server |
| `pnpm migrate:up` | Apply pending SQL migrations |
| `pnpm migrate:down` | Rollback the latest SQL migration |
| `pnpm migrate:status` | Display applied and pending SQL migrations |

---

## API Documentation

Swagger OpenAPI is accessible at `/api/docs` when the server is running. Key module routes include:

- `POST /api/v1/auth/*` — Authentication & JWT tokens
- `GET /api/v1/users/me` — Authenticated user profile
- `POST /api/v1/files/upload` — Multipart document uploads
- `GET /api/v1/guidelines` — Architectural guidelines
- `POST /api/v1/ideas` — Software idea intake
- `POST /api/v1/discovery/:ideaId/*` — Discovery questions & answers
- `POST /api/v1/documents/generate/:ideaId` — PRD & BRD generation
- `POST /api/v1/diagrams/generate/:ideaId` — Mermaid diagram generation
- `POST /api/v1/ir/generate/:ideaId` — IR compilation & schema export
- `POST /api/v1/workflow/generate/:ideaId` — Workflow DAG generation
- `GET /api/v1/workflow/handoff/generate/:ideaId` — SSE AI IDE handoff compiler
- `GET /api/v1/iterations/idea/:ideaId` — Iteration session chat & updates
