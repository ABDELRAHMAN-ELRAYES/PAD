# PAD Contributor Setup & Running Guide

This guide describes how to install packages, configure the database, install python dependencies, and run the PAD application locally.

---

## 🛠️ Prerequisites

Ensure you have the following installed on your machine:
1. **Node.js** (v18 or higher)
2. **pnpm** (preferred, or `npm` / `yarn`) — Install globally using:
   ```bash
   npm install -g pnpm
   ```
3. **PostgreSQL** (v16 or higher)
4. **Python** (v3.10 or higher, v3.12 recommended)
5. **Docker** (optional, recommended for running SearXNG or local Ollama)

---

## 📂 Project Structure Overview

```
PAD/
├── server/                    # Node.js + Express backend & Prisma configuration
├── web/                       # Next.js frontend application
└── local_deep_research/       # Python-based agentic search module
```

---

## 1. 🗄️ Database Setup (PostgreSQL)

PAD uses **PostgreSQL** as the primary storage layer, managed via the **Prisma ORM**.

### Step 1: Create the PostgreSQL Database
Connect to your PostgreSQL server and create a database named `pad_db`:
```sql
CREATE DATABASE pad_db;
```

### Step 2: Configure the Environment Variables
Navigate to the `server/` directory:
```bash
cd server
cp .env.example .env
```
Open `server/.env` and update the `DATABASE_URL` with your credentials:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/pad_db"
```
*(Also make sure to set `GEMINI_API_KEY` in this file for the system design generators).*

### Step 3: Run Database Migrations & Generate client
Execute the following commands from the `server/` directory:
```bash
# Push the schema definitions directly to the database
pnpm prisma db push

# Generate the Prisma TypeScript Client
pnpm prisma generate
```

To inspect your database records through a GUI, you can open Prisma Studio:
```bash
pnpm prisma studio
```

---

## 2. 🟢 Backend Server Setup (Node/Express)

The backend handles request routing, WebSocket connections via Socket.io, and initiates the Python deep research subprocesses.

### Step 1: Install Package Dependencies
From the `server/` directory:
```bash
pnpm install
```

### Step 2: Start Development Server
```bash
pnpm dev
```
The backend server will run on `http://localhost:8080`.

---

## 3. 🔵 Frontend Setup (Next.js/React)

The frontend is a Next.js application that renders the editor dashboard.

### Step 1: Install Package Dependencies
Navigate to the `web/` directory and install packages:
```bash
cd ../web
pnpm install
```

### Step 2: Configure API URLs (Optional)
If your backend server is not running on port `8080`, create a `.env.local` file inside the `web/` directory and set:
```env
NEXT_PUBLIC_API_URL="http://localhost:8080/api/v1"
```

### Step 3: Start Development Server
```bash
pnpm dev
```
The frontend will start on `http://localhost:3000`. Open it in your web browser.

---

## 4. 🐍 Python Deep Research Service Setup

The deep research agent is a python library called `local_deep_research` that scrapes the web and compiles technical literature.

### Step 1: Setup the Virtual Environment
Navigate to the `local_deep_research/` directory:
```bash
cd ../local_deep_research
```

Run the setup shell script to create `.venv`, upgrade pip, and install local dependencies:
```bash
bash setup_deep_research.sh
```

**Alternative (Manual Commands):**
If you do not want to use the script, run:
```bash
# Create virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies in editable mode
pip install -e .
```

### Step 2: Spin Up External Search Engines (Optional but Recommended)
For local search capabilities, you can run **SearXNG** locally using Docker:
```bash
docker run -d -p 8080:8080 --name searxng searxng/searxng
```

Configure your environment overrides in `server/.env` to point to SearXNG or LLMs:
```env
LDR_LLM_PROVIDER="ollama"
LDR_LLM_MODEL="llama3.2:3b"
LDR_LLM_OLLAMA_URL="http://localhost:11434"
LDR_SEARCH_TOOL="searxng"
LDR_SEARCH_STRATEGY="source_based"
```

### Step 3: Test Python Integration
To verify that the Python bridge can communicate without script errors, run:
```bash
# From workspace root:
./local_deep_research/.venv/bin/python server/src/modules/research/deep_research_bridge.py
```
*(This should output a missing query JSON error, showing the dependencies compile successfully).*

---

## 🚀 Running All Services Together

To run the full development environment, start these services in different terminal windows:

1. **Database / SearXNG / Ollama** (Docker & local services)
2. **Backend Express Server**:
   ```bash
   cd server && pnpm dev
   ```
3. **Frontend Client**:
   ```bash
   cd web && pnpm dev
   ```
