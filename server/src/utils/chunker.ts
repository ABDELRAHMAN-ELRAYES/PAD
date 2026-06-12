import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Utility to split text documents recursively using LangChain's text splitter.
 */
export async function chunkText(
  text: string,
  chunkSize: number = 750,
  chunkOverlap: number = 150
): Promise<string[]> {
  if (!text) return [];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  return await splitter.splitText(text);
}
