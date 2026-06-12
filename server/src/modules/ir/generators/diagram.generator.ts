import { ProjectIRSchema } from "../types/ir.types";
import AiService from "../../ai/ai.service";

export type DiagramType = "ERD" | "SEQUENCE" | "FLOWCHART" | "ARCHITECTURE";

export interface IGeneratedDiagrams {
  title: string;
  tier1: string; // Core IR only
  tier2: string; // Core IR + AI Enrichment (e.g. boilerplate PKs, timestamps, logging, standard details)
  tier3: string; // Core IR + Enrichment + AI Suggestions (e.g. junction tables, caching, with distinct dashed-border styling)
}

const DIAGRAM_GENERATOR_PROMPT = `You are an expert systems architect. Your task is to compile the provided system Intermediate Representation (IR) into a set of Mermaid diagrams of type: "{{DIAGRAM_TYPE}}".

You must output three tiers of the diagram to support dynamic toggling:
1. **Tier 1 (IR Core)**: Strictly represents the elements in the IR. No additions or assumptions.
2. **Tier 2 (AI Enrichment)**: Extends Tier 1 with standard architectural boilerplates (e.g., adding auto-incrementing/UUID ids and timestamps to ERD tables, adding authorization or logger flows to sequence/flowcharts, adding API Gateway / reverse proxy subgraphs to Architecture).
3. **Tier 3 (AI Suggestions)**: Extends Tier 2 with smart architectural recommendations (e.g., adding junction tables for many-to-many relations, status lookup/log history tables, cache layers like Redis, queue layers like RabbitMQ/Kafka). 
   - **CRITICAL**: For Tier 3, you MUST visually highlight the suggested additions using Mermaid's styling syntax. For flowcharts, graphs, or diagrams supporting styling, apply a dashed border and distinct stroke color (e.g., \`style NodeName stroke:#e65100,stroke-width:2px,stroke-dasharray: 5 5\`).

### System Intermediate Representation (IR):
{{IR_DATA}}

### Diagram Type Syntax Rules for "{{DIAGRAM_TYPE}}":
{{SYNTAX_RULES}}

### Output Format:
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "Title of the {{DIAGRAM_TYPE}} Diagram",
  "tier1": "Mermaid code string for Tier 1",
  "tier2": "Mermaid code string for Tier 2",
  "tier3": "Mermaid code string for Tier 3"
}

### General Mermaid Rules:
- Output ONLY valid JSON.
- Escape double quotes and newlines (\`\\n\`) correctly inside the JSON string properties.
- Do not wrap the JSON response in markdown code blocks.
`;

const SYNTAX_RULES: Record<DiagramType, string> = {
  ERD: `
- Use erDiagram syntax.
- Example structure:
  erDiagram
      User ||--o{ Order : places
      User {
          string email
          string name
      }
      Order {
          float amount
      }
- For Tier 2, add 'string id PK' and 'datetime created_at' fields.
- For Tier 3, suggest lookup tables or junction tables, and comment them or use relation annotations.
`,
  SEQUENCE: `
- Use sequenceDiagram syntax.
- Must trace interactions between Roles (actors) and Modules (participants) defined in the IR.
- Example structure:
  sequenceDiagram
      actor User
      participant AuthModule
      User->>AuthModule: Login Request
      AuthModule-->>User: JWT Token
- For Tier 2, include standard authorization checks or logging middleware interactions.
- For Tier 3, suggest caching checks or retry loops.
`,
  FLOWCHART: `
- Use flowchart TD or flowchart LR.
- Focus on business processes/actions mapping to Roles and Modules.
- Use shapes: [] for steps, {} for decisions, () for start/end.
- For Tier 3, apply styles:
  style SuggestedNode stroke:#e65100,stroke-width:2px,stroke-dasharray: 5 5
`,
  ARCHITECTURE: `
- Use flowchart TD or graph TB.
- Group Modules into logical subgraphs (e.g., Core Services, Data Store, External Services).
- Example structure:
  flowchart TD
      subgraph Frontend
          UI[Web UI]
      end
      subgraph Core
          API[API Service]
      end
      UI --> API
- For Tier 2, add reverse proxy/ingress and common database containers.
- For Tier 3, add Redis cache or messaging queues, styling them with dashed borders:
  style CacheNode stroke:#e65100,stroke-width:2px,stroke-dasharray: 5 5
`
};

export async function generateDiagramFromIR(
  diagramType: DiagramType,
  ir: ProjectIRSchema,
  userId?: string
): Promise<IGeneratedDiagrams> {
  const irDataStr = JSON.stringify(ir, null, 2);
  const syntaxRules = SYNTAX_RULES[diagramType];

  const prompt = DIAGRAM_GENERATOR_PROMPT
    .replace(/{{DIAGRAM_TYPE}}/g, diagramType)
    .replace(/{{IR_DATA}}/g, irDataStr)
    .replace(/{{SYNTAX_RULES}}/g, syntaxRules);

  const systemPrompt = `You are a Mermaid diagram compilation engine. You take structured system IR and output three tiers of Mermaid strings in a JSON format.`;

  const aiResponse = await AiService.callLLM(prompt, true, systemPrompt, userId);

  try {
    const parsed = AiService.robustJSONParse<IGeneratedDiagrams>(aiResponse);
    if (!parsed.title || !parsed.tier1 || !parsed.tier2 || !parsed.tier3) {
      throw new Error("Missing required diagram fields in LLM response");
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse AI diagram response:", aiResponse);
    throw new Error(`Failed to compile ${diagramType} diagrams: ${error instanceof Error ? error.message : "Invalid JSON"}`);
  }
}
