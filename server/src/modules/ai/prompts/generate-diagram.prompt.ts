// Prompt templates for generating Mermaid diagrams

export type DiagramType =
    | "SYSTEM_ARCHITECTURE"
    | "DATABASE_ERD"
    | "SEQUENCE"
    | "COMPONENT"
    | "DEPLOYMENT"
    | "USER_FLOW"
    | "CLASS"
    | "STATE"
    | "USE_CASE"
    | "ACTIVITY";



const DIAGRAM_SPECIFIC_RULES = `
==================================================
DATABASE ERD RULES
==================================================

When generating an ERD:

1. The first Mermaid keyword MUST be:
   erDiagram

2. ONLY use:
   - Entity definitions
   - Entity attributes
   - ER relationships

3. NEVER use:
   - subgraph
   - graph
   - flowchart
   - classDiagram
   - sequenceDiagram
   - stateDiagram
   - HTML
   - Markdown

4. Every attribute MUST follow:

   <type> <name>
   <type> <name> PK
   <type> <name> FK
   <type> <name> PK FK
   <type> <name> "comment"
   <type> <name> PK "comment"
   <type> <name> FK "comment"

5. Never generate attributes without a type.

   WRONG:
   status "Pending"

   WRONG:
   role

   CORRECT:
   varchar status "Pending"

6. Allowed attribute types:

   int
   bigint
   varchar
   text
   boolean
   decimal
   float
   double
   datetime
   timestamp
   date

7. Relationship syntax MUST use Mermaid ER syntax:

   USER ||--o{ PROJECT : owns

8. Entity names:
   - UPPERCASE
   - letters, numbers, underscores only

9. Attribute names:
   - lowercase_snake_case

10. Before returning:
    ✓ every attribute has a type
    ✓ no subgraphs exist
    ✓ only erDiagram syntax is used

==================================================
FLOWCHART RULES
==================================================

When generating flowcharts:

1. Use:
   flowchart TD
   flowchart LR
   graph TD
   graph LR

2. Subgraphs are allowed.

3. Every node ID:
   letters, numbers, underscores only

4. Labels containing spaces:
   use quoted labels

==================================================
SEQUENCE DIAGRAM RULES
==================================================

1. Must start with:
   sequenceDiagram

2. Only use valid Mermaid sequence syntax.

3. Never use subgraphs.

==================================================
CLASS DIAGRAM RULES
==================================================

1. Must start with:
   classDiagram

2. Use only Mermaid class syntax.

3. Never use subgraphs.

==================================================
STATE DIAGRAM RULES
==================================================

1. Must start with:
   stateDiagram-v2

2. Use [*] for start/end.

3. Never use subgraphs.

==================================================
FINAL VALIDATION
==================================================

Before returning Mermaid:

✓ Diagram type matches requested type.
✓ No syntax from another diagram type appears.
✓ No invented Mermaid constructs.
✓ Mermaid should parse successfully.
`;


const MERMAID_SYNTAX_RULES = `
**MERMAID SYNTAX RULES (VERY IMPORTANT):**

1. Node IDs must contain only letters, numbers, or underscores.
   Examples:
   CORRECT: USER, API_GATEWAY, DB1
   WRONG: User Service, Payment-Service

2. If a label contains spaces or special characters, use a quoted label.
   Examples:
   CORRECT: A["User Management Service"]
   CORRECT: B["Payment & Transaction Service"]
   WRONG: A[User Management Service]

3. Subgraphs with visible titles MUST use an ID and a quoted title.
   Examples:
   CORRECT:
   subgraph BACKEND["Core Backend Services"]

   CORRECT:
   subgraph STORAGE["Data & Storage Layer"]

   WRONG:
   subgraph Core Backend Services

   WRONG:
   subgraph Data & Storage Layer

4. Never place parentheses, slashes, ampersands, colons, or spaces directly in node IDs.
   Put them inside quoted labels instead.

   CORRECT:
   AUTH["Authentication Service (AuthN/AuthZ)"]

   WRONG:
   Authentication Service (AuthN/AuthZ)

5. Use only official Mermaid syntax.
   Do not invent new keywords, attributes, or diagram constructs.

6. Every diagram must be valid Mermaid and parse successfully.

7. Prefer quoted labels whenever text contains spaces, punctuation, or special characters.

8. Do not use HTML tags.

9. Do not use markdown code fences.

10. Do not include explanations, notes, or commentary outside Mermaid syntax.

11. For flowcharts:
    - Use flowchart TD, flowchart LR, graph TD, or graph LR.
    - Prefer node IDs like A, B, USER, API, DB.

12. Before producing the final answer, verify:
    ✓ Every node ID contains only letters, numbers, or underscores.
    ✓ Every visible label containing spaces is quoted.
    ✓ Every subgraph uses:
      subgraph ID["Title"]
    ✓ The diagram is valid Mermaid syntax.
`;
// Helper for generating standard raw output instructions
const RAW_OUTPUT_INSTRUCTIONS = `
${MERMAID_SYNTAX_RULES}

${DIAGRAM_SPECIFIC_RULES}

**CRITICAL OUTPUT FORMAT RULES:**
1. The VERY FIRST LINE of your output MUST be a Mermaid comment specifying the title, in this exact format:
%% title: Description of Diagram
2. The remaining lines MUST be valid, raw Mermaid code only.
3. DO NOT wrap the output in markdown code blocks (e.g., do not use \`\`\`mermaid or \`\`\`).
4. DO NOT return any JSON, HTML, or explanations. Only return the raw text starting with %% title:.
`;

// 1. System Architecture
export const SYSTEM_ARCHITECTURE_PROMPT = `You are an expert systems architect. Generate a high-level System Architecture Diagram in Mermaid syntax based on the software idea.

**Instructions:**
1. Show main components (e.g., Web App, Mobile App, API Gateway, Services, Databases, Third-party APIs).
2. Group related items into logical subgraphs (e.g., Frontend, Core backend, storage).
3. Use flowchart TD or graph TB syntax.

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

// 2. Database ERD
export const DATABASE_ERD_PROMPT = `
You are an expert database architect.

Generate a Mermaid Entity Relationship Diagram.

Requirements:

1. Use \`erDiagram\`.
2. Create 5-10 core entities.
3. Include primary keys.
4. Include foreign keys.
5. Include important attributes only.
6. Use proper Mermaid ER relationships.
7. Every attribute MUST have a type.
8. Never use subgraphs.
9. Never mix flowchart syntax with ERD syntax.

${RAW_OUTPUT_INSTRUCTIONS}

Software Idea:

{{IDEA_TEXT}}
`;

// 3. Sequence Diagram
export const SEQUENCE_PROMPT = `You are an expert software engineer. Generate a Sequence Diagram in Mermaid syntax demonstrating a key user flow.

**Instructions:**
1. Identify primary actors (User, Client App) and participants (Backend API, Auth Server, Database).
2. Trace 8-12 message/response interactions.
3. Use sequenceDiagram syntax.

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

// 4. Component Diagram
export const COMPONENT_PROMPT = `You are an expert systems engineer. Generate a Component Diagram in Mermaid syntax showing modules and their interactions.

**Instructions:**
1. Model structural parts/modules (e.g., Auth service, Payment module, Notification dispatcher).
2. Use flowchart TD or graph LR with clean labels.

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

// 5. Deployment Diagram
export const DEPLOYMENT_PROMPT = `You are an expert devops engineer. Generate a Deployment Diagram in Mermaid syntax showing physical hardware/cloud nodes.

**Instructions:**
1. Model hosting environments, containers, and networking layout (e.g., client device, DNS, AWS VPC, EC2, RDS, CDN).
2. Use flowchart TD or graph TB with subgraphs representing machines or VPC zones.

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

// 6. User Flow Diagram
export const USER_FLOW_PROMPT = `You are an expert UX designer. Generate a User Flow Diagram in Mermaid syntax tracing screen navigation.

**Instructions:**
1. Map the pages, steps, and key decisions (e.g., Login -> Authenticated? -> Dashboard).
2. Use flowchart TD or LR.
3. Use appropriate shapes (e.g., [] for screens/actions, {} for decisions).

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

// 7. Class Diagram
export const CLASS_PROMPT = `You are an expert software engineer. Generate a Class Diagram in Mermaid syntax for core object-oriented structures.

**Instructions:**
1. Model the primary class definitions, methods, and member variables.
2. Use classDiagram syntax.
3. Define associations (inheritance, composition, dependency).

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

// 8. State Diagram
export const STATE_PROMPT = `You are an expert system designer. Generate a State Diagram in Mermaid syntax representing lifecycle states.

**Instructions:**
1. Model the states and transitions of a key entity (e.g., Order: Pending -> Paid -> Shipped -> Delivered).
2. Use stateDiagram-v2 syntax.
3. Use [*] for start and end states.

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

// 9. Use Case Diagram
export const USE_CASE_PROMPT = `You are an expert business analyst. Generate a Use Case Diagram in Mermaid syntax.

**Instructions:**
1. Model the relationship between users (actors) and functions they can perform (use cases).
2. Use graph LR or flowchart LR.
3. Group use cases inside a system boundary box (subgraph) and represent actors outside.

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

// 10. Activity Diagram
export const ACTIVITY_PROMPT = `You are an expert process designer. Generate an Activity Diagram in Mermaid syntax.

**Instructions:**
1. Model procedural workflows, concurrency, and control logic.
2. Use flowchart TD or LR with join/fork bars to represent concurrent paths.

${RAW_OUTPUT_INSTRUCTIONS}

**Software Idea:**
{{IDEA_TEXT}}`;

const PROMPTS: Record<string, string> = {
    // New types
    SYSTEM_ARCHITECTURE: SYSTEM_ARCHITECTURE_PROMPT,
    DATABASE_ERD: DATABASE_ERD_PROMPT,
    SEQUENCE: SEQUENCE_PROMPT,
    COMPONENT: COMPONENT_PROMPT,
    DEPLOYMENT: DEPLOYMENT_PROMPT,
    USER_FLOW: USER_FLOW_PROMPT,
    CLASS: CLASS_PROMPT,
    STATE: STATE_PROMPT,
    USE_CASE: USE_CASE_PROMPT,
    ACTIVITY: ACTIVITY_PROMPT,

    // Backward compatibility mappings
    ERD: DATABASE_ERD_PROMPT,
    SCHEMA: SYSTEM_ARCHITECTURE_PROMPT,
    FLOWCHART: USER_FLOW_PROMPT,
    ARCHITECTURE: SYSTEM_ARCHITECTURE_PROMPT,
};

export interface IGeneratedDiagram {
    title: string;
    mermaidCode: string;
}

export function buildDiagramPrompt(type: string, ideaText: string): string {
    const template = PROMPTS[type] || SYSTEM_ARCHITECTURE_PROMPT;
    return template.replace("{{IDEA_TEXT}}", ideaText);
}
