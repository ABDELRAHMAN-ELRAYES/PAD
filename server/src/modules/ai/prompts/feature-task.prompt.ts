// Prompt for extracting/synthesizing features from all project context
export interface IProjectContextForFeatures {
    rawText: string;
    refinedText?: string | null;
    analysisResult?: any;
    researchResult?: any;
    questionnaire?: any;
    questionnaireResponse?: any;
    documents: Array<{ type: string; title: string; content: string }>;
    diagrams: Array<{ type: string; title: string; mermaidCode: string }>;
    projectIR?: any;
}

export function buildExtractFeaturesPrompt(context: IProjectContextForFeatures): string {
    const rawText = context.rawText || "None";
    const refinedText = context.refinedText || "None";
    const analysis = context.analysisResult ? JSON.stringify(context.analysisResult, null, 2) : "None";
    const research = context.researchResult ? JSON.stringify(context.researchResult, null, 2) : "None";
    
    let questionnaireStr = "None";
    if (context.questionnaire && context.questionnaireResponse) {
        questionnaireStr = JSON.stringify({
            questions: context.questionnaire.questions,
            responses: context.questionnaireResponse.responses
        }, null, 2);
    }

    const irStr = context.projectIR ? JSON.stringify(context.projectIR.schemaData, null, 2) : "None";

    const docsStr = context.documents && context.documents.length > 0
        ? context.documents.map(d => `### DOCUMENT: ${d.type} - ${d.title}\n\n${d.content}`).join("\n\n---\n\n")
        : "No documents available.";

    const diagramsStr = context.diagrams && context.diagrams.length > 0
        ? context.diagrams.map(d => `### DIAGRAM: ${d.type} - ${d.title}\n\n${d.mermaidCode}`).join("\n\n---\n\n")
        : "No diagrams available.";

    return `You are a Senior Product Manager and Senior Software Architect. Your objective is to design and generate a complete, structured, implementation-ready feature set for the application based on all available project context and artifacts.

Do NOT act like a simple text extractor. Do NOT copy raw blocks or paragraphs from documents. Instead, synthesize capabilities that must exist for this application to succeed.

### PROJECT CONTEXT

#### Raw Idea Description:
${rawText}

#### Refined Product Vision:
${refinedText}

#### Product Analysis (Missing Details, Suggestions, Risks):
${analysis}

#### Project Discovery Questionnaire & Responses:
${questionnaireStr}

#### Deep Research Results (Competitors, Market, Technical Scope):
${research}

#### Product Requirements & Business Documents:
${docsStr}

#### Project Intermediate Representation (Entities, Relationships, Modules, Roles, Business Rules):
${irStr}

#### Database ERD & System Architecture Diagrams:
${diagramsStr}

### FEATURE REQUIREMENTS & SYNTHESIS PROCESS

1. **Understand Product**: Read the vision, business requirements, and user responses to understand target audience and core value.
2. **Identify Major Capabilities**: Determine the high-level capabilities (e.g. Authentication, Billing, Real-Time Collaboration, AI Assistant, Notifications, Search, Settings, Integrations).
3. **Group Capabilities into Features**: Map them to distinct, implementable features (generate between 5 and 30 features, depending on project complexity).
4. **Determine Dependencies**: Features must have clear, explicit dependencies (e.g., "User Profiles" depends on "Authentication"). Specify these by referencing the exact "title" of other features generated in this prompt.
5. **Determine Priorities & Complexity**: Set Priority ("low", "medium", "high", "critical") and Complexity ("low", "medium", "high") for each feature.
6. **Generate Acceptance Criteria**: Each feature must have 3-6 specific, testable acceptance criteria (e.g., "* User can reset password via email OTP", "* Session times out after 15 minutes").
7. **Generate Technical Scope**: Briefly outline technical details (e.g., database tables referenced, API endpoints like POST /api/auth/register, middleware, or frontend components needed).

### OUTPUT SCHEMA

You MUST respond with ONLY a valid JSON array of feature objects. Do not wrap the output in markdown code blocks, and do not write any introductory or concluding text.

JSON Schema format:
[
  {
    "title": "Unique Feature Title (e.g. 'Authentication & Authorization')",
    "description": "Comprehensive explanation of what this feature does, how it works, and its core capabilities (at least 3-4 sentences). Do NOT provide a short, weak, or generic description.",
    "businessValue": "A detailed, rich paragraph (at least 2-3 sentences) explaining why this feature is critical to the business model, platform success, ROI, or operational efficiency.",
    "userValue": "A detailed, rich paragraph (at least 2-3 sentences) explaining the immediate benefits, value, and user experience improvements for the end-user.",
    "acceptanceCriteria": [
      "User can register with email and password",
      "User receives verification email",
      "User can log in and obtain session JWT",
      "Role-based permissions are enforced at API level"
    ],
    "priority": "critical",
    "complexity": "medium",
    "dependencies": [],
    "technicalScope": "Uses 'User' entity. Exposes /api/v1/auth/* endpoints. Utilizes bcrypt and jsonwebtoken. Needs login/register forms on UI.",
    "suggestedTaskCount": 12
  }
]

Remember: Generate 5-30 features. Never generate only one feature. Never output "Extracted" as a title, and do not copy entire paragraphs.`;
}

// Prompt for regenerating a single feature
export function buildRegenerateSingleFeaturePrompt(
    featureTitle: string,
    featureDescription: string,
    existingFeatures: any[],
    context: IProjectContextForFeatures
): string {
    const rawText = context.rawText || "None";
    const refinedText = context.refinedText || "None";
    const analysis = context.analysisResult ? JSON.stringify(context.analysisResult, null, 2) : "None";
    const research = context.researchResult ? JSON.stringify(context.researchResult, null, 2) : "None";
    const irStr = context.projectIR ? JSON.stringify(context.projectIR.schemaData, null, 2) : "None";
    const docsStr = context.documents && context.documents.length > 0
        ? context.documents.map(d => `### DOCUMENT: ${d.type} - ${d.title}\n\n${d.content}`).join("\n\n---\n\n")
        : "No documents available.";
    const diagramsStr = context.diagrams && context.diagrams.length > 0
        ? context.diagrams.map(d => `### DIAGRAM: ${d.type} - ${d.title}\n\n${d.mermaidCode}`).join("\n\n---\n\n")
        : "No diagrams available.";

    const otherFeaturesStr = existingFeatures && existingFeatures.length > 0
        ? existingFeatures.map(f => `- ${f.title}: ${f.description}`).join("\n")
        : "None";

    return `You are a Senior Product Manager and Senior Software Architect. Your task is to regenerate a single feature ("${featureTitle}") in the context of the overall system, using all project context and artifacts.

Make this feature extremely specific, technically sound, and implementation-ready. Avoid creating generic features.

### PROJECT CONTEXT

#### Raw Idea Description:
${rawText}

#### Refined Product Vision:
${refinedText}

#### Product Analysis:
${analysis}

#### Deep Research Results:
${research}

#### Product Requirements & Business Documents:
${docsStr}

#### Project Intermediate Representation:
${irStr}

#### Database ERD & System Architecture Diagrams:
${diagramsStr}

### OTHER SYSTEM FEATURES
${otherFeaturesStr}

### FEATURE TO REGENERATE
Title: ${featureTitle}
Current Description: ${featureDescription}

### OUTPUT SCHEMA
You MUST respond with ONLY a valid JSON object. Do not wrap the output in markdown code blocks, and do not write any introductory or concluding text.

JSON Schema format:
{
  "title": "${featureTitle}",
  "description": "Comprehensive explanation of what this feature does, how it works, and its core capabilities (at least 3-4 sentences). Do NOT provide a short, weak, or generic description.",
  "businessValue": "A detailed, rich paragraph (at least 2-3 sentences) explaining why this feature is critical to the business model, platform success, ROI, or operational efficiency.",
  "userValue": "A detailed, rich paragraph (at least 2-3 sentences) explaining the immediate benefits, value, and user experience improvements for the end-user.",
  "acceptanceCriteria": [
    "Testable criterion 1",
    "Testable criterion 2"
  ],
  "priority": "high",
  "complexity": "medium",
  "dependencies": [],
  "technicalScope": "Technical implementation scope.",
  "suggestedTaskCount": 8
}
`;
}

// Prompt for generating tasks for a feature
export function buildGenerateTasksPrompt(
    feature: any,
    techSpec: string = "",
    dbSchema: string = "",
    projectIR: string = ""
): string {
    const featureDetails = `
Title: ${feature.title}
Description: ${feature.description}
Business Value: ${feature.businessValue || "N/A"}
User Value: ${feature.userValue || "N/A"}
Acceptance Criteria: ${Array.isArray(feature.acceptanceCriteria) ? feature.acceptanceCriteria.map((c: string) => `* ${c}`).join("\n") : "N/A"}
Priority: ${feature.priority || "medium"}
Complexity: ${feature.complexity || "medium"}
Dependencies: ${Array.isArray(feature.dependencies) ? feature.dependencies.join(", ") : "None"}
Technical Scope: ${feature.technicalScope || "N/A"}
`;

    return `You are an expert software engineer and project manager. Your task is to break down a software feature into specific, technical, actionable, and implementable development tasks.

You must look at the feature description, acceptance criteria, project technical specifications, intermediate representation (roles, entities, rules), and database schemas to determine exact tasks needed.

**Instructions:**
1. Analyze the provided feature details and context.
2. Break down the feature into granular, technical development tasks (e.g., 'Create User Entity', 'Implement Authentication Service', 'Create JWT Middleware', 'Implement Login API', 'Build Login Page', 'Add Session Persistence', 'Write Authentication Tests'). Do NOT generate generic tasks like 'Build Authentication'.
3. Assign realistic estimations (e.g., '2h', '4h', '1d', '2d', '1w').
4. Order tasks logically based on implementation dependencies.
5. Provide a JSON array representing the tasks. For each task, you can also specify:
   - "title": Task Title
   - "description": Description of technical steps
   - "priority": "low" | "medium" | "high" | "critical"
   - "estimatedEffort": "2h" | "4h" | "1d" | "2d" | "1w"
   - "dependencies": Array of integer indices (0-based) referencing tasks in this list that must be completed first (e.g. if Task 1 (index 1) depends on Task 0 (index 0), then Task 1's dependencies array should contain [0]).

**Project Context:**
Technical Specification:
${techSpec || "Not provided"}

Database Schema:
${dbSchema || "Not provided"}

Project Intermediate Representation (IR):
${projectIR || "Not provided"}

**Feature to Break Down:**
${featureDetails}

**Output Format:**
You MUST respond with ONLY a valid JSON array in the following format. Do not include any text before or after the JSON.
[
  {
    "title": "Task Title",
    "description": "Technical instructions, e.g. database schema changes, exact API endpoint signatures, components and hooks to write.",
    "priority": "high",
    "estimatedEffort": "1d",
    "dependencies": [0]
  }
]
`;
}
