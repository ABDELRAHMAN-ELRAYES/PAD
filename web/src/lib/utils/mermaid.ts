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
