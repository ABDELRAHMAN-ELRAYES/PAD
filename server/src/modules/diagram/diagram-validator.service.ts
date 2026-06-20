import AiService from "../ai/ai.service";

export const BUILD_REPAIR_PROMPT = `
You are an expert systems architect and compiler assistant specializing in Mermaid diagram correction.
We have an invalid Mermaid diagram snippet that failed to render in the browser.

### Invalid Mermaid Code:
\`\`\`mermaid
{{INVALID_CODE}}
\`\`\`

### Parser Error Message:
{{ERROR_MESSAGE}}

### Task:
Fix the syntax errors in the Mermaid code. 
Return ONLY the corrected, valid, and fully complete Mermaid code.

**CRITICAL RULES:**
1. The VERY FIRST LINE of your output MUST preserve the title comment if present (or create a relevant one), in the format:
%% title: <Title Name>
2. The remaining lines MUST be valid, raw Mermaid code only.
3. DO NOT wrap the output in markdown code blocks (e.g., do not use \`\`\`mermaid or \`\`\`).
4. DO NOT return any JSON, HTML, or explanations. Only return the raw corrected text starting with %% title:.
`;

export class DiagramValidatorService {
    /**
     * Runs balanced brackets, open quotes, and diagram header keyword validation
     * on the provided Mermaid code string.
     */
    static validateMermaidSyntax(code: string, type: string): { valid: boolean; error?: string } {
        if (!code || code.trim().length === 0) {
            return { valid: false, error: "Diagram code is empty" };
        }

        // Split into lines, filter out empty and comment lines (starting with %%)
        const lines = code.split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith("%%"));

        if (lines.length === 0) {
            return { valid: false, error: "Diagram code contains only comments or whitespace" };
        }

        const headerLine = lines[0].toLowerCase();
        
        // Expected header starts mapping
        const expectedHeaders: Record<string, string[]> = {
            SYSTEM_ARCHITECTURE: ["graph", "flowchart"],
            DATABASE_ERD: ["erdiagram"],
            SEQUENCE: ["sequencediagram"],
            COMPONENT: ["graph", "flowchart"],
            DEPLOYMENT: ["graph", "flowchart"],
            USER_FLOW: ["flowchart", "graph"],
            CLASS: ["classdiagram"],
            STATE: ["statediagram", "statediagram-v2"],
            USE_CASE: ["graph", "flowchart", "usecasediagram"],
            ACTIVITY: ["flowchart", "graph"],
        };

        const expected = expectedHeaders[type];
        if (expected) {
            const hasValidHeader = expected.some(vh => headerLine.startsWith(vh));
            if (!hasValidHeader) {
                return {
                    valid: false,
                    error: `Invalid diagram header for type "${type}". First line must declare: ${expected.join(" or ")}. Got: "${lines[0]}"`
                };
            }
        }

        // Run balanced brackets check on code (ignoring comments and matching quotes)
        const codeToCheck = lines.join("\n");
        const stack: string[] = [];
        let insideQuote = false;
        
        for (let i = 0; i < codeToCheck.length; i++) {
            const char = codeToCheck[i];
            
            // Handle escape characters inside quotes
            if (char === '\\' && insideQuote && i + 1 < codeToCheck.length) {
                i++; // skip next char
                continue;
            }

            if (char === '"') {
                insideQuote = !insideQuote;
                continue;
            }

            if (insideQuote) {
                continue; // Skip bracket matching inside quotes
            }

            if (char === '[' || char === '(' || char === '{') {
                stack.push(char);
            } else if (char === ']') {
                const last = stack.pop();
                if (last !== '[') {
                    return { valid: false, error: "Mismatched closing bracket ']'" };
                }
            } else if (char === ')') {
                const last = stack.pop();
                if (last !== '(') {
                    return { valid: false, error: "Mismatched closing parenthesis ')'" };
                }
            } else if (char === '}') {
                const last = stack.pop();
                if (last !== '{') {
                    return { valid: false, error: "Mismatched closing brace '}'" };
                }
            }
        }

        if (insideQuote) {
            return { valid: false, error: "Unclosed double quote (\") in Mermaid code" };
        }

        if (stack.length > 0) {
            const unmatched = stack.map(b => {
                if (b === '[') return "bracket '['";
                if (b === '(') return "parenthesis '('";
                return "brace '{'";
            }).join(", ");
            return { valid: false, error: `Unclosed shape symbols: ${unmatched}` };
        }

        // Check for common flowchart errors: parentheses or brackets inside shape labels without double quotes
        if (["SYSTEM_ARCHITECTURE", "COMPONENT", "DEPLOYMENT", "USER_FLOW", "USE_CASE", "ACTIVITY"].includes(type)) {
            const flowchartRegexes = [
                /\[+([^\]]+)\]+/g,
                /\(+([^)]+)\)+/g,
                /\{+([^}]+)\}+/g,
            ];

            for (const line of lines) {
                // Strip double-quoted strings to avoid matching inside quotes
                const lineClean = line.replace(/"([^"\\]|\\.)*"/g, '""');
                
                for (const regex of flowchartRegexes) {
                    let match;
                    regex.lastIndex = 0;
                    while ((match = regex.exec(lineClean)) !== null) {
                        const labelText = match[1].trim();
                        if (labelText.length > 0) {
                            const isQuoted = labelText.startsWith('"') && labelText.endsWith('"');
                            if (!isQuoted && (labelText.includes('(') || labelText.includes(')') || labelText.includes('[') || labelText.includes(']'))) {
                                return {
                                    valid: false,
                                    error: `Flowchart node label "${labelText}" contains special syntax characters [ ] or ( ) without enclosing double-quotes.`
                                };
                            }
                        }
                    }
                }
            }
        }

        return { valid: true };
    }

    static async repairDiagram(code: string, errorMessage: string, userId?: string): Promise<string> {
        const prompt = BUILD_REPAIR_PROMPT
            .replace("{{INVALID_CODE}}", code)
            .replace("{{ERROR_MESSAGE}}", errorMessage);

        const systemPrompt = "You are a Mermaid compiler assistant. You correct invalid Mermaid syntax and return raw corrected code.";
        const response = await AiService.callLLM(prompt, false, systemPrompt, userId);

        let repairedCode = response.trim();
        
        // Clean up markdown ticks if the LLM wraps them anyway
        if (repairedCode.startsWith("```")) {
            const lines = repairedCode.split("\n");
            if (lines[0].startsWith("```")) {
                lines.shift();
            }
            if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) {
                lines.pop();
            }
            repairedCode = lines.join("\n").trim();
        }

        return repairedCode;
    }
}
