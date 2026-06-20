import { GENERATE_BRD_PROMPT } from "./generate-brd.prompt";
import { GENERATE_PRD_PROMPT } from "./generate-prd.prompt";

const GENERATE_SRS_PROMPT = `You are an expert systems analyst. Your task is to generate a comprehensive Software Requirements Specification (SRS) document based on the provided software idea and analysis.

**Instructions:**
1. Create a well-structured SRS document following IEEE 830 standards contextually.
2. Focus on clear functional and non-functional specifications.
3. Be specific, structured, and write it in a professional tone.
4. Format the output as HTML content (using tags like <h2>, <h3>, <p>, <ul>, <li>, etc.)

**Output Format:**
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "SRS: [Product Name]",
  "content": "<h2>1. Introduction</h2><p>...</p><h2>2. Overall Description</h2>..."
}

**Required Sections in the content:**
1. **Introduction** - Document purpose, system scope, definitions, and acronyms.
2. **Overall Description** - Product perspective, product functions, user classes and characteristics, operating environment.
3. **Design & Implementation Constraints** - Hardware limitations, standard compliance, database limits, and protocols.
4. **System Features** - Detailed description of core system capabilities.
5. **External Interface Requirements** - User interfaces, hardware interfaces, software interfaces, communications interfaces.
6. **Non-Functional Requirements** - Performance, reliability, availability, security, and maintainability.

**Rules:**
- Output ONLY valid JSON.
- Content must be valid HTML.
- Focus on technical system specifications and requirements constraint.

**Software Idea:**
{{IDEA_TEXT}}

**AI Analysis (if available):**
{{ANALYSIS_RESULT}}`;

const GENERATE_FRS_PROMPT = `You are an expert functional designer. Your task is to generate a comprehensive Functional Requirements Specification (FRS) document based on the provided software idea and analysis.

**Instructions:**
1. Detail the precise behavior and functional flows of the software system.
2. Specify system inputs, processes, validation rules, and outputs.
3. Format the output as HTML content (using tags like <h2>, <h3>, <p>, <ul>, <li>, etc.)

**Output Format:**
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "FRS: [Product Name]",
  "content": "<h2>1. Introduction & Scope</h2><p>...</p><h2>2. User Roles & Permissions</h2>..."
}

**Required Sections in the content:**
1. **Introduction & Scope** - Functional scope boundaries.
2. **User Roles & Permissions** - Roles matrix (Admin, User, etc.) and permission definitions.
3. **Functional Modules & Specifications** - Detailed input, validation, processing rules, and outputs for each core module.
4. **Data Flows & Sequence Logic** - Sequence of operations for primary actions.
5. **Error Handling & Validation Rules** - Specific form/input validation messages, business logic errors, and mitigation flows.

**Rules:**
- Output ONLY valid JSON.
- Content must be valid HTML.
- Focus strictly on detailed function behaviors and validations.

**Software Idea:**
{{IDEA_TEXT}}

**AI Analysis (if available):**
{{ANALYSIS_RESULT}}`;

const GENERATE_SAD_PROMPT = `You are an expert software architect. Your task is to generate a comprehensive System Architecture Document (SAD) based on the provided software idea and analysis.

**Instructions:**
1. Explain the architectural representation, constraints, and architecture views of the system.
2. Discuss modular divisions, communication mechanisms, and cloud setup.
3. Format the output as HTML content (using tags like <h2>, <h3>, <p>, <ul>, <li>, etc.)

**Output Format:**
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "SAD: [Product Name]",
  "content": "<h2>1. Architectural Overview</h2><p>...</p><h2>2. Component View</h2>..."
}

**Required Sections in the content:**
1. **Architectural Overview & Representation** - High-level architectural pattern (e.g. Microservices, Monolithic Layered, Event-Driven).
2. **Architectural Constraints** - Tech stack choices, bandwidth, security policies, and performance constraints.
3. **Logical Component View** - Key backend services, API Gateway, micro-frontends, and messaging boundaries.
4. **Data & Persistence View** - Database mapping (Relational vs. NoSQL), indexing, caching strategies (Redis), and search engines.
5. **Deployment View** - Cloud hosting nodes (AWS, GCP), Docker/Kubernetes container orchestration, CDN setup, and scalability plans.

**Rules:**
- Output ONLY valid JSON.
- Content must be valid HTML.
- Explain the "how" of technical architecture design.

**Software Idea:**
{{IDEA_TEXT}}

**AI Analysis (if available):**
{{ANALYSIS_RESULT}}`;

const GENERATE_API_SPEC_PROMPT = `You are an expert integration engineer. Your task is to generate a comprehensive API Specification document based on the provided software idea and analysis.

**Instructions:**
1. Define the REST API routes, HTTP methods, headers, request bodies, response models, and status codes.
2. Focus on clear, structured technical contract designs.
3. Format the output as HTML content (using tags like <h2>, <h3>, <p>, <ul>, <li>, <pre>, <code>, etc. to represent JSON request/response formats)

**Output Format:**
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "API Spec: [Product Name]",
  "content": "<h2>1. Base Endpoints & Authentication</h2><p>...</p><h2>2. Endpoints Catalog</h2>..."
}

**Required Sections in the content:**
1. **Base Endpoints & Global Headers** - API servers URLs, API Versioning, and global header requirements.
2. **Authentication & Authorization** - JWT setup, API Key scopes, or OAuth flow details.
3. **Endpoints Catalog** - Catalog of routes (e.g. /api/v1/auth/login, /api/v1/projects). For each route, list: Method, Path, request body schema (JSON format), response status codes (e.g. 200, 201, 400, 401, 500) and response schema (JSON format).
4. **Error Responses** - Global error response JSON format.
5. **Rate Limiting & Webhooks** - API rate limits and webhook notifications payload.

**Rules:**
- Output ONLY valid JSON.
- Content must be valid HTML. Use <code> and <pre> tags for clean code/JSON snippets.

**Software Idea:**
{{IDEA_TEXT}}

**AI Analysis (if available):**
{{ANALYSIS_RESULT}}`;

const GENERATE_TEST_PLAN_PROMPT = `You are an expert QA lead. Your task is to generate a comprehensive QA and Test Plan based on the provided software idea and analysis.

**Instructions:**
1. Outline the test strategy, scope, objectives, environment, and detailed test cases.
2. Format the output as HTML content (using tags like <h2>, <h3>, <p>, <ul>, <li>, etc.)

**Output Format:**
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "Test Plan: [Product Name]",
  "content": "<h2>1. Test Strategy</h2><p>...</p><h2>2. Scope of Testing</h2>..."
}

**Required Sections in the content:**
1. **Introduction & Test Strategy** - Overall quality assurance goals and testing scope.
2. **Scope of Testing** - Features to be tested vs. features not to be tested.
3. **Testing Methodologies** - Details on Unit testing, Integration testing, System Testing, Regression Testing, Security Testing, and User Acceptance Testing (UAT).
4. **Test Environment** - Requirements for QA, Staging, and Production testing configurations.
5. **Test Case Catalog** - A table or list of core test cases (e.g. User Signup, Checkout Flow). Each test case should specify: Preconditions, Steps, and Expected Outcome.
6. **Acceptance Criteria** - Quality exit criteria for deployment.

**Rules:**
- Output ONLY valid JSON.
- Content must be valid HTML.
- Focus on verifying software reliability and behavior.

**Software Idea:**
{{IDEA_TEXT}}

**AI Analysis (if available):**
{{ANALYSIS_RESULT}}`;

const GENERATE_USER_MANUAL_PROMPT = `You are an expert technical writer. Your task is to generate a comprehensive User Guide & Manual based on the provided software idea and analysis.

**Instructions:**
1. Create a clear, user-friendly step-by-step user guide on how to register, configure, and use the core software features.
2. Use friendly, simple language suited for end users.
3. Format the output as HTML content (using tags like <h2>, <h3>, <p>, <ul>, <li>, etc.)

**Output Format:**
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "User Manual: [Product Name]",
  "content": "<h2>1. Getting Started</h2><p>...</p><h2>2. Authentication</h2>..."
}

**Required Sections in the content:**
1. **System Overview & Getting Started** - Welcome section and basic description of the application.
2. **Account Registration & Login** - Onboarding guidelines.
3. **Core Feature Guide** - Step-by-step instructions on utilizing the primary features (e.g. how to create projects, configure settings, run actions).
4. **Troubleshooting Guide** - Common error scenarios and self-service fixes.
5. **FAQ** - Frequently asked questions.

**Rules:**
- Output ONLY valid JSON.
- Content must be valid HTML.
- Avoid technical jargon; focus on end-user actions.

**Software Idea:**
{{IDEA_TEXT}}

**AI Analysis (if available):**
{{ANALYSIS_RESULT}}`;

const GENERATE_SECURITY_PLAN_PROMPT = `You are an expert cyber security specialist. Your task is to generate a comprehensive Security & Compliance Plan based on the provided software idea and analysis.

**Instructions:**
1. Document the threat model, authentication/authorization requirements, data encryption policies, audit details, and incident protocols.
2. Format the output as HTML content (using tags like <h2>, <h3>, <p>, <ul>, <li>, etc.)

**Output Format:**
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "Security & Compliance Plan: [Product Name]",
  "content": "<h2>1. Security Overview</h2><p>...</p><h2>2. Identity Management</h2>..."
}

**Required Sections in the content:**
1. **Threat Model & Security Goals** - General security posture and core threats.
2. **Identity & Access Management (IAM)** - Multi-factor authentication (MFA), role-based access control (RBAC), and session expiration policies.
3. **Data Protection** - Cryptography standard for Data-in-Transit (TLS 1.3) and Data-at-Rest (AES-256).
4. **Audit Logging & Monitoring** - Audit trails for critical actions.
5. **Compliance Alignment** - Guidance for specific compliance targets (e.g., GDPR data controller duties, HIPAA, SOC 2).
6. **Incident Response & Disaster Recovery** - Backup plans, failover scenarios, and breach management.

**Rules:**
- Output ONLY valid JSON.
- Content must be valid HTML.
- Focus on technical and administrative controls.

**Software Idea:**
{{IDEA_TEXT}}

**AI Analysis (if available):**
{{ANALYSIS_RESULT}}`;

const PROMPTS: Record<string, string> = {
    BRD: GENERATE_BRD_PROMPT,
    PRD: GENERATE_PRD_PROMPT,
    SRS: GENERATE_SRS_PROMPT,
    FRS: GENERATE_FRS_PROMPT,
    SYSTEM_ARCH: GENERATE_SAD_PROMPT,
    API_SPEC: GENERATE_API_SPEC_PROMPT,
    TEST_PLAN: GENERATE_TEST_PLAN_PROMPT,
    USER_MANUAL: GENERATE_USER_MANUAL_PROMPT,
    SECURITY_PLAN: GENERATE_SECURITY_PLAN_PROMPT,
};

export function buildDocumentPrompt(type: string, ideaText: string, analysisResult: unknown): string {
    const template = PROMPTS[type] || GENERATE_PRD_PROMPT;
    const analysisStr = analysisResult ? JSON.stringify(analysisResult, null, 2) : "No analysis available";
    return template
        .replace("{{IDEA_TEXT}}", ideaText)
        .replace("{{ANALYSIS_RESULT}}", analysisStr);
}
