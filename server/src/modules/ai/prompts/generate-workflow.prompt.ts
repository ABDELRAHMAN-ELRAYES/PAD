export interface IWorkflowPromptContext {
    ideaText: string;
    documents?: Array<{ type: string; title: string; content: string }>;
    diagrams?: Array<{ type: string; title: string; mermaidCode: string }>;
    projectIR?: any;
}

export const buildGenerateWorkflowPrompt = (
    context: IWorkflowPromptContext
): string => {
    const docsContext = (context.documents || [])
        .map((d) => `### Document: ${d.title} (${d.type})\n${d.content.substring(0, 3000)}`)
        .join("\n\n");

    const diagsContext = (context.diagrams || [])
        .map((d) => `### Diagram: ${d.title} (${d.type})\n\`\`\`mermaid\n${d.mermaidCode}\n\`\`\``)
        .join("\n\n");

    const irContext = context.projectIR
        ? `### Project Intermediate Representation (Schema & Models)\n\`\`\`json\n${JSON.stringify(context.projectIR.schemaData || context.projectIR, null, 2).substring(0, 4000)}\n\`\`\``
        : "";

    return `
You are an expert principal software architect and engineering lead. Your task is to analyze the approved system requirements, architectural diagrams, and data models to generate a structured, sequential, end-to-end development workflow for an AI-powered IDE (like Cursor, Claude Code, or GitHub Copilot).

### **Original Project Concept**
${context.ideaText}

${docsContext ? `### **System Requirements & Specifications**\n${docsContext}\n` : ""}
${diagsContext ? `### **Architecture & Structural Diagrams**\n${diagsContext}\n` : ""}
${irContext ? `${irContext}\n` : ""}

### **Workflow Generation Instructions**
Synthesize the requirements, data models, APIs, and UI architecture into an ordered sequence of implementation "Workflow Steps".
1. Start with Project Scaffolding & Environment Config.
2. Proceed with Database Models, Migrations & Seeders.
3. Build Core Repositories, Data Access & Service Layer.
4. Implement REST APIs, WebSockets & Security Middleware.
5. Construct Frontend UI, State Management & API Client Hooks.
6. Finalize with Integration Tests & Deployment Configurations.

### **Output Format Requirements**
You MUST return ONLY valid JSON matching this exact structure:
\`\`\`json
{
  "steps": [
    {
      "title": "string", // Clear, action-oriented step title
      "description": "string", // Concise summary of what is accomplished
      "instructions": "string", // Highly detailed, explicit file-by-file coding instructions for an AI IDE. Specify exact file paths, schemas, and logic.
      "order": number, // 1-based sequential index (1, 2, 3...)
      "dependsOnStepOrders": [1] // Array of prerequisite step order numbers (1-based). Empty array if none.
    }
  ]
}
\`\`\`

### **Rules**
1. Implementation steps must follow strict architectural order (Database -> Backend Models/Services -> APIs -> Frontend Components -> Tests).
2. The "instructions" field MUST be prescriptive and complete: include exact file paths, exported TypeScript types, validation rules, and error handling.
3. DO NOT include markdown formatting outside the JSON block. Return ONLY the raw JSON object.
`;
};
