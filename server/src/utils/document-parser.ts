import fs from "fs";
import path from "path";

// Require pdf-parse to avoid TypeScript compilation errors for untyped library
const pdfParseModule = require("pdf-parse");

/**
 * Extracts text content from a file path based on its mimetype.
 * Supports PDF, Text, and Markdown.
 */
export async function extractTextFromDocument(filePath: string, mimetype: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (mimetype === "application/pdf" || ext === ".pdf") {
        const dataBuffer = await fs.promises.readFile(filePath);
        let parsedText = "";

        if (typeof pdfParseModule === "function") {
            const parsed = await pdfParseModule(dataBuffer);
            parsedText = parsed.text || "";
        } else if (pdfParseModule && typeof pdfParseModule.PDFParse === "function") {
            const parser = new pdfParseModule.PDFParse({ data: dataBuffer });
            const result = await parser.getText();
            parsedText = result.text || "";
        } else if (pdfParseModule && typeof pdfParseModule.default === "function") {
            const parsed = await pdfParseModule.default(dataBuffer);
            parsedText = parsed.text || "";
        } else {
            throw new Error("pdf-parse library is not loaded correctly.");
        }

        return parsedText;
    } else if (
        mimetype === "text/plain" ||
        mimetype === "text/markdown" ||
        mimetype === "text/x-markdown" ||
        ext === ".txt" ||
        ext === ".md" ||
        ext === ".markdown"
    ) {
        let content = await fs.promises.readFile(filePath, "utf-8");
        // Remove Byte Order Mark (BOM) if present
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.substring(1);
        }
        return content;
    } else {
        throw new Error(`Document type (${mimetype}) or extension (${ext}) is not supported for text extraction. Please upload PDF, TXT, or Markdown files.`);
    }
}
