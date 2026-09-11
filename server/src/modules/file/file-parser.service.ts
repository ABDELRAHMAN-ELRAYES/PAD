import { Injectable, BadRequestException } from "@nestjs/common";
import * as fs from "fs/promises";

@Injectable()
export class FileParserService {
  async parseDocument(filePath: string, mimetype: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);

      if (mimetype === "application/pdf") {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdf = require("pdf-parse");
        const data = await pdf(buffer);
        return data.text || "";
      }

      if (
        mimetype === "text/plain" ||
        mimetype === "text/markdown" ||
        filePath.endsWith(".md") ||
        filePath.endsWith(".txt")
      ) {
        return buffer.toString("utf-8");
      }

      return buffer.toString("utf-8");
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse document: ${err.message}`);
    }
  }
}
