# Configuration & Secrets Management Improvement Plan

> **Domain**: Environment Variables, Secret Storage, Rotation SOP & Feature Flags  
> **Target Stack**: Zod Schema Validation, dotenv, AWS Secrets Manager, Vault  
> **Status**: Technical Specification & Remediation Blueprint  

---

## 1. Executive Summary & Configuration Diagnostic

Configuration and secrets management errors are among the most persistent vulnerabilities in software systems: hardcoded fallback secrets can bypass authentication checks, legacy configuration leftovers confuse operational teams, and unvalidated environment variables result in silent runtime crashes deep inside application flows.

An audit of `server/src/config/config.ts` identified the following critical vulnerabilities:
1. **Insecure Hardcoded Fallback Secrets**: Default secret strings are hardcoded as fallbacks:
   - `JWT_SECRET || "your-secret-key-change-this"` (`L80`)
   - `JWT_RESET_PASSWORD_SECRET || "reset-secret-key-change-this"` (`L82`)
   - `ADMIN_PASSWORD || "admin123"` (`L118`)  
   If an environment variable is omitted in production, the server starts silently with compromised, publicly known keys.
2. **Dead Legacy Boilerplate Configurations**: The config contains residual configurations from predecessor projects:
   - `admin@lynkr.com` and `info@lynkr.com` email defaults
   - `stripe.secretKey` and `stripe.webhookSecret` (unused in PAD)
   - `agora.appId` and `agora.appCertificate` (video calling SDK unused in PAD)
   - `puter.authToken` (unused in PAD)
3. **No Startup Validation**: Environment variables are parsed on demand without schema validation. If `DATABASE_URL` or `CLAUDE_API` is missing or malformed, the process starts and only crashes when a user triggers that specific code path.
4. **No Feature Flag Infrastructure**: New or experimental AI features cannot be selectively enabled or safely rolled back without deploying code changes.

---

## 2. Fail-Fast Type-Safe Environment Configuration Schema

Implement a centralized, strict configuration loader using **Zod** that runs at process startup and aborts immediately if any required variable is missing or insecure:

```typescript
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvironmentSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    PORT: z.coerce.number().default(8080),
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
    
    // JWT Secrets (Strict minimum length & complexity)
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters in length"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    JWT_RESET_PASSWORD_SECRET: z.string().min(32, "JWT_RESET_PASSWORD_SECRET must be at least 32 characters"),
    JWT_RESET_PASSWORD_EXPIRES_IN: z.string().default("15m"),
    
    // Frontend & CORS
    FRONTEND_URL: z.string().url(),
    CORS_ORIGIN: z.string(),
    
    // Redis & Queues
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    
    // Vector Database
    QDRANT_URL: z.string().url().default("http://localhost:6333"),
    QDRANT_COLLECTION: z.string().default("pad_guidelines_v2"),
    
    // Cloud Storage (S3 / R2)
    S3_BUCKET_NAME: z.string().optional(),
    S3_ENDPOINT: z.string().url().optional(),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    
    // AI Providers
    AI_PROVIDER: z.enum(["claude", "openai", "gemini", "ollama"]).default("claude"),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    OLLAMA_URL: z.string().url().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().default("qwen2.5:14b"),
});

export type AppConfig = z.infer<typeof EnvironmentSchema>;

function loadConfig(): AppConfig {
    const result = EnvironmentSchema.safeParse(process.env);

    if (!result.success) {
        console.error("❌ CRITICAL CONFIGURATION ERROR: Invalid environment variables:");
        result.error.issues.forEach((issue) => {
            console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        });
        process.exit(1);
    }

    return result.data;
}

export const config = loadConfig();
export default config;
```

---

## 3. Purging Legacy & Dead Configuration

Remove all unused configuration keys and obsolete dependencies from `server/src/config/config.ts` and `package.json`:

```diff
- mail: {
-     from: "info@lynkr.com",
-     defaultFrom: "info@lynkr.com",
- },
- stripe: {
-     secretKey: process.env.STRIPE_SECRET_KEY,
-     webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
- },
- agora: {
-     appId: process.env.AGORA_APP_ID,
-     appCertificate: process.env.AGORA_APP_CERTIFICATE,
- },
- puter: {
-     authToken: process.env.PUTER_AUTH_TOKEN,
- },
```

---

## 4. Secret Storage & Rotation Standard Operating Procedure (SOP)

### Secret Inventory & Classification:
| Secret Identifier | Classification | Storage Location | Rotation Cadence |
|:---|:---|:---|:---|
| `DATABASE_URL` | High (Data Access) | AWS Secrets Manager / Vault | 90 Days |
| `JWT_SECRET` | Critical (Session Integrity) | AWS Secrets Manager / Vault | 180 Days |
| `ANTHROPIC_API_KEY` | High (AI Billing) | KMS / Environment Secret | 90 Days |
| `AWS_SECRET_ACCESS_KEY` | High (Storage Access) | IAM Role (Prefer Instance Profiles) | 90 Days |

### Emergency Rotation Procedure:
1. Generate a new cryptographically secure 64-byte hex secret:
   ```bash
   node -e "console.log(crypto.randomBytes(64).toString('hex'))"
   ```
2. Update the secret in AWS Secrets Manager / Cloudflare Secrets.
3. Trigger a zero-downtime rolling restart of backend containers.
4. Verify application readiness probes pass across all replicas.
5. Invalidate existing sessions in Redis.

---

## 5. Feature Flags Architecture

Introduce a simple, configuration-driven feature flag helper to toggle experimental modules safely:

```typescript
export interface FeatureFlags {
    enableDeepResearch: boolean;
    enableMultiTierDiagrams: boolean;
    enableLiveSocketSync: boolean;
    enableCloudLLMFallback: boolean;
}

export const featureFlags: FeatureFlags = {
    enableDeepResearch: process.env.FF_DEEP_RESEARCH === "true",
    enableMultiTierDiagrams: process.env.FF_MULTI_TIER_DIAGRAMS !== "false",
    enableLiveSocketSync: process.env.FF_LIVE_SOCKET_SYNC !== "false",
    enableCloudLLMFallback: process.env.FF_CLOUD_LLM_FALLBACK === "true",
};
```
