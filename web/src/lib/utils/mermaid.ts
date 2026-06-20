import mermaid from "mermaid";

let mermaidInitialized = false;
let currentMermaidTheme = "default";

export function initMermaid(theme: string) {
    if (mermaidInitialized && currentMermaidTheme === theme) return;
    mermaid.initialize({
        startOnLoad: false,
        theme: theme as any,
        securityLevel: "loose",
        suppressErrorRendering: true,
    });
    mermaidInitialized = true;
    currentMermaidTheme = theme;
}

export function cleanMermaidCode(raw: string): string {
    let clean = raw.trim();
    // 1. Strip markdown fences if present
    if (clean.startsWith("```")) {
        const lines = clean.split("\n");
        if (lines[0].startsWith("```")) {
            lines.shift();
        }
        if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) {
            lines.pop();
        }
        clean = lines.join("\n").trim();
    }
    // 2. Strip %% title: comment line if present
    if (clean.startsWith("%% title:")) {
        const lines = clean.split("\n");
        lines.shift();
        clean = lines.join("\n").trim();
    }
    return clean;
}

export function extractTitleAndCode(raw: string, defaultTitle: string): { title: string; code: string } {
    let clean = raw.trim();
    // Strip markdown fences first if present
    if (clean.startsWith("```")) {
        const lines = clean.split("\n");
        if (lines[0].startsWith("```")) {
            lines.shift();
        }
        if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) {
            lines.pop();
        }
        clean = lines.join("\n").trim();
    }

    if (clean.startsWith("%% title:")) {
        const newlineIdx = clean.indexOf("\n");
        if (newlineIdx !== -1) {
            const titleLine = clean.substring(0, newlineIdx);
            const title = titleLine.replace("%% title:", "").trim();
            const code = clean.substring(newlineIdx + 1).trim();
            return { title, code: cleanMermaidCode(code) };
        }
    }
    return { title: defaultTitle, code: clean };
}

export function formatMermaidCode(code: string, title: string): string {
    const cleanedCode = cleanMermaidCode(code);
    if (!cleanedCode) {
        return `%% title: ${title}\n`;
    }
    return `%% title: ${title}\n${cleanedCode}`;
}
