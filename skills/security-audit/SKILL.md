---
name: security-audit
description: Audit application code for security gaps across the full input-to-output surface - unvalidated input reaching queries/shell commands/file paths (SQL/NoSQL/command/path injection), missing or broken output encoding leading to XSS, authentication/authorization logic bugs (broken expiry checks, missing rate limiting, weak session handling), and insecure file upload handling. Use this whenever the user asks for a "security audit", "security review", "pen-test style review", mentions injection, XSS, auth bugs, or asks you to check "is this input validated" or "is this safe from attackers" - regardless of language or framework. Also trigger proactively any time you're reviewing code that takes user input and passes it to a database query, shell command, file path, HTML template, or external URL, even if the user only asked for a general code review.
---

# Security Audit: Input Validation, Injection & Auth Logic

Security bugs cluster at trust boundaries: anywhere data crosses from "something a user controls" into "something that gets executed, queried, rendered, or trusted." This skill is a systematic way to walk that boundary regardless of stack. It intentionally does not replace a full penetration test or a dedicated static-analysis security tool - it's a code-reading methodology to catch the classes of bug that a plain feature-focused code review usually misses.

## Why this matters

Most security incidents don't come from exotic zero-days - they come from ordinary-looking code that trusted input it shouldn't have, or got a comparison/expiry check subtly wrong. These bugs are especially dangerous because they look completely normal in a diff: a password reset check that always evaluates to "not expired," or a search field that gets concatenated into a query string, reads like working code until someone tests it adversarially.

## Method: trace every trust boundary

For each entry point where external input arrives (HTTP request body/query/params/headers, file uploads, webhook payloads, message queue consumers, CLI args, cron job inputs from external sources), trace where that value flows and ask at each step: *does this value get treated as data, or does it get treated as code/structure?*

### 1. Injection - SQL / NoSQL / command / path

**Detect:** Grep for string concatenation or template-literal building of: SQL/query strings, shell commands, or file system paths, where any part of the string comes from user input. Also check ORMs and query builders specifically for any place they offer a "raw query" escape hatch (`.raw()`, `$queryRawUnsafe`, string-built `WHERE` clauses) - ORMs prevent injection by default, but only until someone drops to raw mode for a "complex query." For NoSQL, check whether user input can inject query operators (e.g., an object-shaped input where a key like a comparison operator gets passed straight into a query filter). For file paths, check whether a user-supplied filename/path is used directly in file reads/writes without normalization (a `../../../etc/passwd`-style traversal check).

**Why it hurts:** Injection lets an attacker change what your code *does*, not just what data it processes - reading unauthorized data, modifying/deleting data, or in the command-injection case, running arbitrary commands on your server.

**Fix:** Parameterized queries / prepared statements everywhere (let the driver handle escaping, never build the query string yourself). For shell commands, avoid shelling out to user-influenced strings at all if possible; if unavoidable, use an API that passes arguments as an array rather than a single interpolated string, and allowlist rather than blocklist. For file paths, resolve to an absolute path and verify it's still within the intended base directory before touching the filesystem.

### 2. Missing input validation at the boundary

**Detect:** For each endpoint/handler, is there a schema or validation step (type, length, format, allowed-values) applied to the request body/params *before* any of that data is used, or does the code just reach into `req.body.whatever` and use it directly?

**Why it hurts:** Every downstream vulnerability (injection, broken business logic, resource exhaustion from an unbounded `limit` param, type confusion) gets easier or possible entirely because nothing rejected malformed input up front.

**Fix:** Validate at the boundary using whatever schema-validation approach fits the stack (a validation library, framework-level request DTOs/schemas, or explicit manual checks as a minimum) - check type, required fields, length/size bounds, and format (email, UUID, enum membership) before the handler's business logic runs at all. Reject with a clear error rather than coercing or guessing.

### 3. Missing output encoding → XSS (frontend-facing, but often a backend responsibility too)

**Detect:** Anywhere user-controlled data is rendered into HTML, does it go through the templating/framework's default auto-escaping, or is it explicitly bypassed (`dangerouslySetInnerHTML` in React, `{{{ }}}` triple-mustache in Handlebars, `| safe` in Jinja, manual string concatenation into an HTML response)? Also check API responses that get consumed and rendered elsewhere - is user input sanitized before storage, or only relied upon to be escaped later (defense should exist at both render time and, for anything that allows rich text, at a sanitization step).

**Why it hurts:** Unescaped user input rendered as HTML lets an attacker inject a script that runs in another user's browser session - session theft, action-on-behalf-of-victim, credential harvesting.

**Fix:** Rely on the framework's default auto-escaping and avoid the explicit-bypass APIs unless the content has been through a dedicated HTML sanitizer (allowlist-based, e.g. for rich-text fields where some HTML is legitimately allowed). Never build HTML by string concatenation with user input.

### 4. Authentication & session logic bugs

**Detect:** Read every comparison and date/expiry check in the auth flow line by line rather than skimming - these bugs hide in code that looks correct at a glance. Specifically check:
- Token/link expiry checks: does the code actually parse a real timestamp, or could it silently evaluate to "always valid" if a field is missing/misnamed (e.g. parsing a field that doesn't exist on the decoded token, producing `NaN`/`undefined`/`null` and having that value compare as "not expired")?
- Password/token comparisons: constant-time comparison for secrets, or a plain `==`/`===` that leaks timing information?
- Password reset / magic link flows: is the token single-use (invalidated after use), or can it be replayed?
- Session fixation: is a new session ID issued on login, or does the pre-login session ID carry over?

**Why it hurts:** These are "silent yes" bugs - the check exists, looks reasonable, and passes code review, but a subtle logic error makes it accept things it should reject. They tend to have very high impact (full account takeover, permanent password reset tokens) for exactly that reason.

**Fix:** Write out the expiry/validity check as an explicit assertion against a real parsed value and add a test for the expired-and-should-be-rejected case specifically (not just the happy path) - this class of bug is usually caught immediately by testing the negative case, which is precisely the case most test suites skip.

### 5. Authorization gaps (authenticated but not authorized)

**Detect:** For each endpoint that operates on a specific resource (`/orders/:id`, `/users/:id/documents`), does the handler verify the authenticated user actually owns or has permission for that specific resource ID, or does it only check "is this user logged in" and then trust the ID from the URL/body? This is the classic IDOR (insecure direct object reference) gap.

**Why it hurts:** Any logged-in user can access or modify any other user's data just by changing an ID in the request.

**Fix:** Every resource-scoped handler must check ownership/permission against the specific resource, not just authentication status - ideally as a consistent middleware/decorator pattern rather than ad hoc per-handler checks that are easy to forget.

### 6. Missing or disabled rate limiting

**Detect:** Is rate limiting present on authentication endpoints (login, password reset, signup, OTP verification) and any expensive/abusable endpoint? Check for it being present in the dependency tree but commented out or not actually mounted on the routes that need it.

**Why it hurts:** Without it, login endpoints are trivially brute-forceable, password-reset endpoints can be used to enumerate valid accounts, and any expensive endpoint becomes a cheap denial-of-service vector.

**Fix:** Apply rate limiting (per-IP and, where meaningful, per-account) to auth endpoints and any endpoint that's expensive or abuse-prone, and confirm it's actually wired into the active middleware chain, not just configured and forgotten.

### 7. Insecure file upload handling

**Detect:** For upload endpoints: is file type validated by actual content (magic bytes) or only by trusting the client-supplied extension/MIME type? Is file size limited before the full file is read into memory, or only checked after? Is the upload path derived from user-controlled filenames without sanitization (path traversal via filename)? Are uploaded files served back from a location that could execute them (e.g., an uploads directory inside the web root that also executes server-side scripts)?

**Why it hurts:** Trusting client-supplied type/extension allows disguised executable uploads; post-hoc size validation allows memory exhaustion; unsanitized filenames enable path traversal; executable upload directories can lead to full remote code execution.

**Fix:** Validate content type by inspection where practical, enforce size limits at the earliest possible point (ideally at the web server/proxy layer, not just app code), sanitize/regenerate filenames server-side rather than trusting client input, and serve uploads from a location that cannot execute code and ideally a separate domain/bucket.

### 8. Secrets and sensitive data exposure (quick pass)

**Detect:** Quick grep for hardcoded credentials/API keys/connection strings in source, secrets logged in plaintext (request bodies, headers, or error stack traces that include auth tokens), and sensitive fields (passwords, tokens, PII) included in API responses that don't need them.

**Fix:** Move anything found to environment/secret management (see the config-secrets-management skill for the full treatment - this skill only flags it if found, that skill covers prevention systematically).

## Output format

```
# Security Audit

## Stack fingerprint
[language, framework, auth mechanism (session/JWT/OAuth), DB]

## Findings
### [Vulnerability class] - [Severity: Critical/High/Medium/Low]
- Location: file/function
- Attack scenario: [concrete - "an attacker sends X, causing Y" not just a category name]
- Evidence: [the actual vulnerable code pattern found]
- Fix: [specific, actionable]

## Priority order
1. Auth logic bugs and injection (both can lead to full compromise)
2. Authorization gaps (IDOR) and missing rate limiting on auth endpoints
3. XSS / output encoding gaps
4. Insecure upload handling
5. Hardcoded secrets (cross-reference config-secrets-management skill for full remediation)
```

Severity should reflect actual exploitability and blast radius: an injection point reachable by any unauthenticated user outranks a theoretical issue that requires an already-compromised admin account.

## Related skills

For hardcoded secrets and environment-config practices in depth, use **config-secrets-management**. For rate limiting as a resilience concern (not just a security one) and timeouts/retries, see **backend-resilience-observability**.
