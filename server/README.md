# PAD Server - Node.js + Express + TypeScript

Backend server for **PAD (Product Architecture Designer)** - an AI-powered platform that transforms software ideas into comprehensive SDLC artifacts.

## Purpose

The PAD server provides the API backbone for:

- **Idea Processing**: Intake, validate, and enhance software ideas with AI
- **Document Generation**: Auto-generate PRD and BRD from confirmed ideas
- **Diagram Generation**: Create ERD, Sequence, and Schema diagrams
- **Feature Management**: Break down features into tasks with dependencies
- **Workflow Generation**: Create implementation workflows for AI IDEs
- **Iterative Updates**: Process chat-based feedback and sync changes across modules

## Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm or npm

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
pnpm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and update with your actual values:

```bash
cp .env.example .env
```

**Required Variables**:
```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/pad_db"
NODE_ENV=development
PORT=5000
JWT_SECRET=your_jwt_secret
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:4b
```

### 3. Generate Prisma Client

```bash
pnpm prisma:generate
```

### 4. Apply Database Migrations

```bash
pnpm prisma:push
```

### 5. Run the Server

Development mode with hot reload:
```bash
pnpm dev
```

Production build:
```bash
pnpm build
pnpm start
```

## Project Structure

```
server/
├── prisma/
│   └── schema.prisma          # Prisma schema (database models)
├── src/
│   ├── config/
│   │   └── config.ts          # Environment configuration
│   ├── data-server-clients/
│   │   └── prisma-client.ts   # Prisma client singleton
│   ├── enum/
│   │   └── UserRole.ts        # User roles and admin privileges
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # JWT authentication
│   │   ├── error-handler.ts       # Global error handler
│   │   ├── rate-limit.middleware.ts # Rate limiting
│   │   └── middlewares.ts         # CORS, body parser, etc.
│   ├── modules/
│   │   ├── auth/              # Authentication & authorization
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   └── auth.route.ts
│   │   ├── user/              # User management
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.repository.ts
│   │   │   └── user.route.ts
│   │   ├── idea/              # Module 1: Idea intake & validation
│   │   ├── document/          # Module 2: PRD & BRD generation
│   │   ├── diagram/           # Module 3: Diagram generation
│   │   ├── feature/           # Module 4: Feature breakdown
│   │   ├── workflow/          # Module 5: Implementation workflow
│   │   └── chat/              # Module 6: Iterative feedback
│   ├── utils/
│   │   ├── app-error.ts       # Custom error class
│   │   ├── catch-async.ts     # Async error wrapper
│   │   ├── hashing-handler.ts # Password hashing (bcrypt)
│   │   └── email/             # Email utilities
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
├── uploads/                   # Uploaded files
├── .env                       # Environment variables
├── .env.example               # Environment template
├── package.json
└── tsconfig.json
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:push` | Push schema changes to database |
| `pnpm prisma:studio` | Open Prisma Studio (database GUI) |

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users` - List users (admin)
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Ideas (Module 1)
- `POST /api/v1/ideas` - Submit new idea
- `GET /api/v1/ideas` - List user's ideas
- `PUT /api/v1/ideas/:id/confirm` - Confirm idea for processing

### Documents (Module 2)
- `POST /api/v1/documents/generate` - Generate PRD/BRD from idea
- `GET /api/v1/documents` - List documents
- `PUT /api/v1/documents/:id` - Edit document

### Diagrams (Module 3)
- `POST /api/v1/diagrams/generate` - Generate diagrams from documents
- `GET /api/v1/diagrams` - List diagrams
- `PUT /api/v1/diagrams/:id` - Edit diagram (Mermaid code)

### Features & Tasks (Module 4)
- `POST /api/v1/features/extract` - Extract features from PRD/BRD
- `GET /api/v1/features` - List features
- `POST /api/v1/features/:id/tasks` - Add task to feature
- `PUT /api/v1/tasks/:id/status` - Update task status

### Workflows (Module 5)
- `POST /api/v1/workflows/generate` - Generate workflow from tasks
- `GET /api/v1/workflows` - List workflows
- `PUT /api/v1/workflows/:id` - Edit workflow steps

## Architecture

This server follows a clean, modular architecture:

- **Repository Pattern**: Data access layer with Prisma
- **Service Layer**: Business logic and AI integration
- **Controller Layer**: Request handling and validation
- **Singleton Pattern**: For repositories and database client
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Centralized error handling with custom AppError class

## PAD Modules Integration

| Module | Server Implementation |
|--------|----------------------|
| **Module 1** - Idea Intake | `modules/idea/` |
| **Module 2** - Document Generation | `modules/document/` |
| **Module 3** - Diagram Generation | `modules/diagram/` |
| **Module 4** - Feature Breakdown | `modules/feature/` |
| **Module 5** - Implementation Workflow | `modules/workflow/` |
| **Module 6** - Iterative Feedback | `modules/chat/` |

## Current Status

**Implemented:**
- Core infrastructure setup
- Authentication module (JWT)
- User module (CRUD operations)
- Security middleware (helmet, rate limiting)
- Email service (Nodemailer)
- Error handling

**In Progress:**
- Module 1: Idea Intake & Pre-Validation
- Module 2: Document Generation
- Module 3: Diagram Generation
- Module 4: Feature Breakdown
- Module 5: Implementation Workflow
- Module 6: Iterative Feedback

## Support

For issues or questions, please refer to the [main README](../README.md) and module documentation in `/documents/modules/`.
