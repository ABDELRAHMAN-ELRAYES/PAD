import { ProjectIRSchema } from "../types/ir.types";
import AiService from "../../ai/ai.service";

const DOCUMENT_FROM_IR_PROMPT = `You are an expert software product manager and business analyst. Your task is to generate a comprehensive {{DOC_TYPE}} ({{DOC_TYPE_FULL}}) for "{{PROJECT_NAME}}" using the provided system Intermediate Representation (IR).

### Core Compilation Constraints:
1. **FLOOR (Strict Constraint)**: Do not fabricate, rename, or omit any entities, relationships, modules, or roles defined in the IR. Any database structure, API path, or role action you mention MUST align exactly with the IR.
2. **CEILING (Creative Narration)**: You should explain the real-world business context, expand user stories, define functional requirements for each module and action, describe error handling/edge cases, and elaborate on non-functional requirements.

### System Intermediate Representation (IR):
{{IR_DATA}}

### Required Output Format:
You MUST respond with ONLY a valid JSON object in the following format. Do not include any text before or after the JSON.

{
  "title": "{{DOC_TYPE}}: {{PROJECT_NAME}}",
  "content": "<h2>1. Introduction</h2><p>...</p><h2>2. Detail</h2>..."
}

### Document Specific Structure:
{{DOC_STRUCTURE}}

### Rules:
- Output ONLY valid JSON.
- The "content" field must be valid HTML using appropriate headings (<h2>, <h3>), paragraphs (<p>), lists (<ul>, <li>), and bold text (<strong>).
- Focus on describing the system in detail based on the IR facts.
`;

const PRD_STRUCTURE = `
1. **Product Overview** - Brief description of the product and its purpose.
2. **Objectives** - Key goals the product aims to achieve.
3. **Module Breakdown** - Detail each module in the IR, explain its purpose, and list its dependencies.
4. **Data Entities & Schema** - Present the entities, fields, and relationships, explaining why they are structured this way.
5. **Functional Requirements & Roles** - Detail each User Role, their actions, and step-by-step paths they take.
6. **Non-Functional Requirements** - Performance, security, and scalability.
7. **Assumptions & Business Constraints** - Business rules and constraints.
`;

const BRD_STRUCTURE = `
1. **Business Objectives** - Core problem being solved and market opportunity.
2. **User Roles & Target Audience** - Highlight roles and their primary business actions.
3. **High-Level Scope** - Modules and key boundaries.
4. **Business Rules & Compliance** - Map out all constraints and validation logic defined in the IR.
5. **Success Metrics (KPIs)** - Financial/Operational targets.
`;

export async function generateDocumentFromIR(
  type: "PRD" | "BRD",
  projectName: string,
  ir: ProjectIRSchema,
  userId?: string
): Promise<{ title: string; content: string }> {
  const docTypeFull = type === "PRD" ? "Product Requirements Document" : "Business Requirements Document";
  const docStructure = type === "PRD" ? PRD_STRUCTURE : BRD_STRUCTURE;
  const irDataStr = JSON.stringify(ir, null, 2);

  const prompt = DOCUMENT_FROM_IR_PROMPT
    .replace(/{{DOC_TYPE}}/g, type)
    .replace(/{{DOC_TYPE_FULL}}/g, docTypeFull)
    .replace(/{{PROJECT_NAME}}/g, projectName)
    .replace(/{{IR_DATA}}/g, irDataStr)
    .replace(/{{DOC_STRUCTURE}}/g, docStructure);

  const systemPrompt = `You are a system architecture document compiler. You take structured IR systems and compile them into formal ${type} documents.`;
  
  const aiResponse = await AiService.callLLM(prompt, true, systemPrompt, userId);
  
  try {
    const parsed = AiService.robustJSONParse<{ title: string; content: string }>(aiResponse);
    if (!parsed.title || !parsed.content) {
      throw new Error("Missing title or content in generated document response");
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse AI document response:", aiResponse);
    throw new Error(`Failed to compile ${type} document: ${error instanceof Error ? error.message : "Invalid JSON"}`);
  }
}
