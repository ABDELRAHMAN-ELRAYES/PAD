
import { ITask } from "../../task/types/ITask";
import { IFeature } from "../../feature/types/IFeature";

export const buildGenerateWorkflowPrompt = (
    ideaText: string,
    features: (IFeature & { tasks: ITask[] })[],
    taskDependencies: Record<string, string[]>
): string => {
    // Format features and tasks for the AI context
    const featureContext = features.map(f => {
        const taskContext = f.tasks.map((t: ITask) => {
            const deps = taskDependencies[t.id] || [];
            const depsStr = deps.length > 0 ? ` (Depends on: ${deps.join(", ")})` : "";
            return `    - Task ID: ${t.id} | Title: ${t.title} | Priority: ${t.priority}${depsStr}\n      Description: ${t.description}`;
        }).join("\n");

        return `Feature: ${f.title}\nDescription: ${f.description}\nTasks:\n${taskContext}`;
    }).join("\n\n");

    return `
You are an expert software architect and technical lead. Your task is to convert confirmed features and task breakdowns into a structured, actionable development workflow that can be executed by an engineer or an AI-powered IDE (like Cursor or GitHub Copilot).

### **Original Idea Overview**
${ideaText}

### **Feature & Task Breakdown**
${featureContext}

### **Task Instructions**
Analyze the provided features and tasks. Generate an ordered sequence of "Workflow Steps" required to implement the entire project. Each task usually corresponds to one or more workflow steps. If a task is too large, break it down.

### **Output Format Requirements**
You MUST return ONLY valid JSON matching this exact structure:
\`\`\`json
{
  "steps": [
    {
      "taskId": "string", // Match the original Task ID exactly. Use null if this is an intermediate step not explicitly tied to one task.
      "title": "string", // Clear, action-oriented title
      "description": "string", // Brief description of what is being accomplished
      "instructions": "string", // Highly detailed, explicit coding instructions for an AI IDE. Specify file names, data structures, and logic.
      "order": number, // 1-based index representing execution order
      "dependsOnTaskIds": ["string"] // Array of ORIGINAL Task IDs this step depends on. Empty array if none.
    }
  ]
}
\`\`\`

### **Rules**
1. Ensure the logical order of implementation (e.g., Database -> Backend Models -> Services -> API Controllers -> Frontend).
2. The "instructions" field MUST be incredibly detailed and prescriptive. Write it as if you are giving commands to a deterministic code generator. Include precise file paths, technologies, and constraints.
3. Preserve dependencies correctly using \`dependsOnTaskIds\`. If step B relies on task A being complete, list task A's ID.
4. DO NOT include markdown formatting outside the JSON block. Return ONLY the raw JSON object.
`;
};
