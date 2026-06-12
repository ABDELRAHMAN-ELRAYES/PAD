import { ProjectIRSchema } from "../types/ir.types";

export const ANALYZE_TO_IR_PROMPT = `You are a Lead Software Architect. Your job is to analyze a software idea or change request and generate/update the structured Intermediate Representation (IR) of the system architecture.

### Schema Structure:
You must output a single valid JSON object that strictly adheres to the following interface:

\`\`\`typescript
interface EntityField {
    name: string; // alphanumeric, starts with letter/underscore (e.g. id, email, created_at)
    type: string;  // e.g. string, number, boolean, datetime, text
    description?: string;
    isNullable?: boolean;
    isPrimaryKey?: boolean;
    isUnique?: boolean;
}

interface Entity {
    name: string; // alphanumeric, camelCase or PascalCase
    description?: string;
    fields: EntityField[];
}

interface Relationship {
    fromEntity: string; // matches an entity name
    toEntity: string;   // matches an entity name
    type: "one-to-one" | "one-to-many" | "many-to-many";
    description?: string;
}

interface Module {
    name: string; // high-level logical component/subsystem name
    description?: string;
    dependencies: string[]; // list of module names this module depends on (prevent cycles!)
}

interface UserRole {
    name: string; // role name (e.g. Admin, Customer)
    description?: string;
    actions: string[]; // actions/permissions (e.g. "create_booking", "view_reports"). MUST NOT BE EMPTY!
}

interface BusinessRule {
    title: string;
    description: string;
    constraints?: string[];
}

interface ProjectIRSchema {
    entities: Entity[];
    relationships: Relationship[];
    modules: Module[];
    roles: UserRole[];
    businessRules: BusinessRule[];
}
\`\`\`

### Critical Guidelines:
1. **Consistency**:
   - Every entity referenced in \`relationships\` MUST exist in the \`entities\` array.
   - Every module dependency in \`modules\` dependencies list MUST exist in the \`modules\` array.
   - Do not create circular module dependencies.
2. **Details**:
   - Entities must have at least one field, typically a primary key (e.g., \`id\`).
   - Every role must have at least one action defined.
3. **Delta Editing (Crucial)**:
   - If an "Existing IR Schema" is provided below, your goal is to merge the "New Request / Modifications" into it.
   - Apply any additions, modifications, or deletions requested by the user.
   - Preserve existing elements that are NOT affected by the user's modifications.
   - If no existing IR is provided, build a fresh schema from the description.

**Output format:**
Respond with ONLY the valid JSON block. Do NOT wrap it in markdown code blocks or add any markdown text before or after the JSON.

{{EXISTING_IR_SECTION}}

### New Request / Modifications:
{{REQUEST_TEXT}}
`;

export function buildAnalyzeToIRPrompt(requestText: string, existingIR?: ProjectIRSchema): string {
  let existingIRSection = "";
  if (existingIR) {
    existingIRSection = `### Existing IR Schema:\n${JSON.stringify(existingIR, null, 2)}\n`;
  } else {
    existingIRSection = "### Existing IR Schema:\nNo existing IR. Create a new one.";
  }

  return ANALYZE_TO_IR_PROMPT
    .replace("{{EXISTING_IR_SECTION}}", existingIRSection)
    .replace("{{REQUEST_TEXT}}", requestText);
}
