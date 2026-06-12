// Prompt templates for generating Mermaid diagrams

export type DiagramType = "ERD" | "SEQUENCE" | "SCHEMA" | "FLOWCHART" | "ARCHITECTURE";

// ERD Diagram Prompt
export const ERD_PROMPT = `You are an expert database architect. Generate an Entity-Relationship Diagram (ERD) in Mermaid syntax based on the software idea provided.

**Instructions:**
1. Identify the main entities/tables needed
2. Define relationships between entities (one-to-one, one-to-many, many-to-many)
3. Include key attributes for each entity
4. Use proper Mermaid erDiagram syntax

**Output Format:**
Return ONLY a valid JSON object with no additional text:
{
  "title": "Brief title for the ERD diagram",
  "mermaidCode": "erDiagram\\n    ENTITY1 {\\n        string id PK\\n        ...\\n    }\\n    ENTITY2 {\\n        ...\\n    }\\n    ENTITY1 ||--o{ ENTITY2 : has"
}

**Rules:**
- Output ONLY valid JSON, no markdown code blocks
- Use proper Mermaid erDiagram syntax
- Include PK (primary key) and FK (foreign key) annotations
- Keep it focused on core entities (5-10 entities max)

**Software Idea:**
{{IDEA_TEXT}}`;

// Sequence Diagram Prompt
export const SEQUENCE_PROMPT = `You are an expert software architect. Generate a Sequence Diagram in Mermaid syntax that shows the main user flow for the software idea.

**Instructions:**
1. Identify the main actors and systems
2. Show the primary user interaction flow
3. Include API calls and responses where relevant
4. Keep the sequence focused and readable

**Output Format:**
Return ONLY a valid JSON object with no additional text:
{
  "title": "Brief title for the Sequence diagram",
  "mermaidCode": "sequenceDiagram\\n    participant User\\n    participant Frontend\\n    participant Backend\\n    participant Database\\n    User->>Frontend: Action\\n    ..."
}

**Rules:**
- Output ONLY valid JSON, no markdown code blocks
- Use proper Mermaid sequenceDiagram syntax
- Include 5-15 steps maximum
- Show error handling where important

**Software Idea:**
{{IDEA_TEXT}}`;

// Schema/Architecture Diagram Prompt
export const SCHEMA_PROMPT = `You are an expert systems architect. Generate a high-level Architecture/Schema Diagram in Mermaid syntax showing the system components and their connections.

**Instructions:**
1. Identify main system components (frontend, backend, services, databases)
2. Show data flow between components
3. Include external services/APIs if relevant
4. Use a flowchart or graph format

**Output Format:**
Return ONLY a valid JSON object with no additional text:
{
  "title": "Brief title for the Architecture diagram",
  "mermaidCode": "graph TB\\n    subgraph Frontend\\n        A[Web App]\\n    end\\n    subgraph Backend\\n        B[API Server]\\n    end\\n    A --> B"
}

**Rules:**
- Output ONLY valid JSON, no markdown code blocks
- Use Mermaid graph or flowchart syntax
- Group related components with subgraphs
- Keep it high-level and readable

**Software Idea:**
{{IDEA_TEXT}}`;

// Flowchart Diagram Prompt
export const FLOWCHART_PROMPT = `You are an expert process designer. Generate a Flowchart in Mermaid syntax showing the main business process or user workflow.

**Instructions:**
1. Identify the start and end points
2. Map out decision points and branching logic
3. Show the main steps in the process
4. Include error/alternative paths where relevant

**Output Format:**
Return ONLY a valid JSON object with no additional text:
{
  "title": "Brief title for the Flowchart",
  "mermaidCode": "flowchart TD\\n    A[Start] --> B{Decision}\\n    B -->|Yes| C[Action]\\n    B -->|No| D[Other Action]\\n    C --> E[End]\\n    D --> E"
}

**Rules:**
- Output ONLY valid JSON, no markdown code blocks
- Use proper Mermaid flowchart syntax
- Use proper shapes: [] for process, {} for decision, () for start/end
- Keep it focused on the main flow (10-20 nodes max)

**Software Idea:**
{{IDEA_TEXT}}`;

const PROMPTS: Record<DiagramType, string> = {
    ERD: ERD_PROMPT,
    SEQUENCE: SEQUENCE_PROMPT,
    SCHEMA: SCHEMA_PROMPT,
    FLOWCHART: FLOWCHART_PROMPT,
    ARCHITECTURE: SCHEMA_PROMPT,
};

export interface IGeneratedDiagram {
    title: string;
    mermaidCode: string;
}

export function buildDiagramPrompt(type: DiagramType, ideaText: string): string {
    const template = PROMPTS[type];
    return template.replace("{{IDEA_TEXT}}", ideaText);
}
