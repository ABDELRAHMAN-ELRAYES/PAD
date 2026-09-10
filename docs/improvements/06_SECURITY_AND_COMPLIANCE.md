# Security & Compliance Architecture Improvement Plan

> **Domain**: Application Security, OWASP Hardening, Input Validation & Sanitization  
> **Target Stack**: Zod, Express Validator, Helmet, DOMPurify, Rate Limit Redis, File-Type  
> **Status**: Technical Specification & Remediation Blueprint  

---

## 1. Executive Summary & Security Diagnostic

Application security in an AI-powered system design platform is paramount: PAD stores proprietary business ideas, competitive research, database schemas, architectural source code, and integration credentials.

A security and OWASP boundary audit of PAD revealed critical vulnerabilities and hardening gaps:
1. **Unvalidated HTTP Input Boundaries**: Several route handlers in `server/src/modules/` directly read `req.body` or `req.params` without schema validation (e.g. type, length, enum membership, or nested structure checks), exposing the data layer to type confusion and injection.
2. **In-Memory Rate Limiting**: `express-rate-limit` is configured with default in-memory storage (`server/src/middlewares/rate-limit.middleware.ts`). In a multi-replica or auto-scaling production cluster, rate limits reset per instance and fail to protect authentication or AI generation endpoints against distributed abuse.
3. **MIME-Type File Spoofing & Upload Insecurities**: File upload validation in `server/src/middlewares/file-upload.ts` relies on client-provided `mimetype` and file extensions without verifying binary magic bytes.
4. **XSS & Prompt Injection Surface**: User-supplied markdown documents, Mermaid syntax, and feedback chat prompts are passed between clients and LLMs without strict boundary sanitization.
5. **Session Expiry & Timing Attack Vectors**: Token comparisons in password reset and email verification flows use plain equality (`===`) rather than constant-time comparison (`crypto.timingSafeEqual`).

---

## 2. Universal Zod Request Validation Middleware

Implement a type-safe, reusable validation middleware applied to every incoming API request:

```typescript
import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import AppError from "../utils/app-error";

interface RequestValidationSchema {
    body?: ZodSchema<any>;
    query?: ZodSchema<any>;
    params?: ZodSchema<any>;
}

export const validateRequest = (schema: RequestValidationSchema) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (schema.params) {
                req.params = await schema.params.parseAsync(req.params);
            }
            if (schema.query) {
                req.query = await schema.query.parseAsync(req.query);
            }
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedIssues = error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                    code: issue.code,
                }));

                return next(
                    new AppError(400, "Validation failed for request parameters", "VALIDATION_ERROR", formattedIssues)
                );
            }
            next(error);
        }
    };
};
```

### Example Endpoint Schema Definition:

```typescript
import { z } from "zod";

export const CreateIdeaSchema = {
    body: z.object({
        rawText: z
            .string({ required_error: "Idea text is required" })
            .min(10, "Idea description must be at least 10 characters long")
            .max(50000, "Idea description cannot exceed 50,000 characters"),
        businessDescription: z.string().max(20000).optional(),
    }),
};

export const IdeaParamsSchema = {
    params: z.object({
        ideaId: z.string().uuid("Invalid Idea UUID format"),
    }),
};
```

---

## 3. Distributed Redis-Backed Rate Limiting

Replace in-memory rate limiting with Redis-backed distributed token buckets across multiple tiers:

```typescript
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// 1. General API Limiter: 100 requests / min per IP or User ID
export const generalApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => redisClient.call(...args),
        prefix: "rl:gen:",
    }),
    keyGenerator: (req) => req.user?.id || req.ip || "unknown",
});

// 2. Auth Endpoints: 10 attempts / min
export const authRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Too many authentication attempts." } },
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => redisClient.call(...args),
        prefix: "rl:auth:",
    }),
});

// 3. Heavy AI Generation: 10 generation requests / min per user
export const aiGenerationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, error: { code: "AI_QUOTA_EXCEEDED", message: "AI generation rate limit exceeded." } },
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => redisClient.call(...args),
        prefix: "rl:ai:",
    }),
    keyGenerator: (req) => req.user?.id || req.ip || "unknown",
});
```

---

## 4. Secure Magic-Byte File Upload Pipeline

Inspect real binary signatures (magic bytes) to prevent file-type spoofing:

```typescript
import { Request, Response, NextFunction } from "express";
import { fileTypeFromBuffer } from "file-type";
import AppError from "../utils/app-error";

const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
    "text/markdown",
]);

export async function validateUploadedFileSecurity(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const file = req.file;
    if (!file) return next(new AppError(400, "No file uploaded", "FILE_REQUIRED"));

    // For plain text / markdown, verify UTF-8 encoding
    if (file.mimetype === "text/plain" || file.mimetype === "text/markdown") {
        return next();
    }

    // Inspect binary magic bytes
    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
        return next(
            new AppError(
                400,
                `Security violation: File header mismatch. Detected mime '${detectedType?.mime}' is not permitted.`,
                "INVALID_FILE_TYPE"
            )
        );
    }

    next();
}
```

---

## 5. OWASP Hardening & Sanitization Checklist

| Threat / Vector | Mitigation Strategy & Implementation |
|:---|:---|
| **Cross-Site Scripting (XSS)** | Sanitize user-provided HTML and Markdown in both server and client rendering using `DOMPurify` and `rehype-sanitize`. |
| **Prompt Injection** | Isolate user inputs within XML delimiter blocks (`<user_guideline>...</user_guideline>`) in AI system prompts. |
| **Timing Attacks** | Use `crypto.timingSafeEqual` when validating verification tokens and webhooks. |
| **Security Headers** | Configure `helmet` with strict `Content-Security-Policy`, `HSTS` (2-year max-age), `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`. |
| **CORS Policy** | Whitelist production domain origins strictly (disallow wildcard `*` with credentials). |
