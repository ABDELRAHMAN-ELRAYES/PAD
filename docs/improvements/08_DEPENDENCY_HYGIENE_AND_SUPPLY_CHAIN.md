# Dependency Hygiene & Supply Chain Security Plan

> **Domain**: Package Management, Lockfile Discipline, Vulnerability Auditing & Supply Chain  
> **Target Stack**: pnpm 9+, Dependabot / Renovate, pnpm audit, Trivy  
> **Status**: Technical Specification & Remediation Blueprint  

---

## 1. Executive Summary & Diagnostic

Modern web applications are composed predominantly of third-party open-source code. Managing the supply chain lifecycle ensures that vulnerabilities are caught before reaching production, builds are 100% deterministic, and dead packages do not inflate container images or JavaScript bundle sizes.

An inspection of `package.json` files and `.gitignore` configurations revealed:
1. **Critical Lockfile Discipline Breach**: In both `server/.gitignore` and `web/.gitignore`, the rule `pnpm*.yaml` is present, **ignoring the package manager lockfile from version control**. Without committed lockfiles, CI/CD runners and production Docker builds resolve transitive dependencies dynamically, leading to "works on my machine" bugs, unexpected breaking changes, and vulnerability exposure.
2. **Unused & Dead Dependencies**:
   - `pug`: Unused template engine in `server/package.json` (`L45`).
   - `@types/cookie-parser` and `cookie-parser`: Redundant dual entries.
   - Legacy and conflicting dependencies: `html2pdf.js` (unmaintained upstream, should be dynamically loaded).
3. **Absence of Automated Vulnerability Gates**: No CI pipeline scans dependencies for published Common Vulnerabilities and Exposures (CVEs) prior to merging PRs.

---

## 2. Restoring Lockfile Discipline

### Immediate Remediation Action:
Remove `pnpm*.yaml` from both `server/.gitignore` and `web/.gitignore` and commit `pnpm-lock.yaml` to Git:

```diff
--- a/server/.gitignore
+++ b/server/.gitignore
@@ -26,5 +26,3 @@
 *.swp
 *.swo
-
-pnpm*.yaml
 uploads/*
```

```diff
--- a/web/.gitignore
+++ b/web/.gitignore
@@ -27,4 +27,2 @@
 next-env.d.ts
-
-pnpm*.yaml
```

### Deterministic CI Install Command:
In CI/CD environments, always execute frozen-lockfile installs:
```bash
# Prevents any modification to the lockfile during CI builds
pnpm install --frozen-lockfile
```

---

## 3. Package Pruning & Consolidation

### Server Dependencies Clean-Up:

```bash
# In server/
pnpm remove pug html-to-text
```

### Cleaned `server/package.json` (Optimized):
```json
{
  "name": "pad-server",
  "version": "1.0.0",
  "description": "PAD: System Design & Architecture AI Engine",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch --env-file=.env src/server.ts",
    "build": "tsc",
    "start": "NODE_ENV=production node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "audit:deps": "pnpm audit --audit-level=high"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "@google/generative-ai": "^0.24.1",
    "@prisma/client": "^5.22.0",
    "archiver": "^8.0.0",
    "bcrypt": "^6.0.0",
    "bullmq": "^5.41.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "express-rate-limit": "^8.2.1",
    "file-type": "^19.6.0",
    "helmet": "^8.1.0",
    "ioredis": "^5.4.1",
    "jsonwebtoken": "^9.0.2",
    "openai": "^4.85.0",
    "pino": "^9.6.0",
    "pino-http": "^10.4.0",
    "rate-limit-redis": "^4.2.0",
    "socket.io": "^4.8.3",
    "zod": "^3.25.76"
  }
}
```

---

## 4. Automated Vulnerability Scanning & Dependabot Configuration

Create `.github/dependabot.yml` to automate security updates:

```yaml
version: 2
updates:
  # Maintain dependencies for backend server
  - package-ecosystem: "npm"
    directory: "/server"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "backend"

  # Maintain dependencies for Next.js frontend
  - package-ecosystem: "npm"
    directory: "/web"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "frontend"
```

### CI Security Audit Step:
```yaml
- name: Security Vulnerability Audit
  run: pnpm audit --audit-level=high
```
