export function parsePartialMermaid(text: string): string {
  const match = text.match(/"mermaidCode"\s*:\s*"([\s\S]*?)$/);
  if (!match) {
    const trimmed = text.trim();
    if (trimmed.startsWith("graph") || 
        trimmed.startsWith("sequenceDiagram") || 
        trimmed.startsWith("erDiagram") ||
        trimmed.startsWith("flowchart")) {
      return trimmed;
    }
    return "";
  }

  let codeStr = match[1];
  let cleanCode = "";
  let escaped = false;
  for (let i = 0; i < codeStr.length; i++) {
    const char = codeStr[i];
    if (escaped) {
      if (char === 'n') {
        cleanCode += '\n';
      } else if (char === 'r') {
        cleanCode += '\r';
      } else if (char === 't') {
        cleanCode += '\t';
      } else {
        cleanCode += char;
      }
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      break;
    }
    cleanCode += char;
  }
  return cleanCode;
}
