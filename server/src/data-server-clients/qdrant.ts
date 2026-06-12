import config from "../config/config";
import OllamaClient from "../modules/ai/ollama-client";
import crypto from "crypto";

interface IQdrantSearchResponse {
    result: Array<{
        id: string;
        score: number;
        payload: {
            userId: string;
            guidelineId: string;
            title: string;
            text: string;
            chunkIndex: number;
        };
    }>;
}

export class QdrantClient {
    private static baseUrl = config.qdrant.url;
    private static collectionName = config.qdrant.collectionName;

    static async initCollection(): Promise<void> {
        const checkUrl = `${this.baseUrl}/collections/${this.collectionName}`;
        try {
            const checkRes = await fetch(checkUrl);
            if (checkRes.ok) {
                // Collection already exists
                return;
            }

            // Create collection
            console.log(`Creating Qdrant collection: ${this.collectionName}`);
            const createRes = await fetch(checkUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    vectors: {
                        size: 768, // nomic-embed-text size
                        distance: "Cosine",
                    },
                }),
            });

            if (!createRes.ok) {
                const errorText = await createRes.text();
                throw new Error(`Failed to create collection: ${errorText}`);
            }
            console.log(`Qdrant collection ${this.collectionName} initialized successfully.`);
        } catch (error) {
            console.error("Failed to initialize Qdrant collection:", error);
        }
    }

    static async upsertGuidelineChunks(
        userId: string,
        guidelineId: string,
        title: string,
        chunks: string[]
    ): Promise<void> {
        // Ensure collection exists
        await this.initCollection();

        const url = `${this.baseUrl}/collections/${this.collectionName}/points?wait=true`;
        const ollama = OllamaClient.getInstance();

        const points = [];

        // Generate embeddings for all chunks
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const vector = await ollama.getEmbedding(chunk);
            const pointId = `${guidelineId}-${i}`;

            points.push({
                id: this.generateUUID(pointId),
                vector,
                payload: {
                    userId,
                    guidelineId,
                    title,
                    text: chunk,
                    chunkIndex: i,
                },
            });
        }

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ points }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Qdrant upsert failed: ${errorText}`);
        }
    }

    static async deleteGuidelinePoints(guidelineId: string): Promise<void> {
        const url = `${this.baseUrl}/collections/${this.collectionName}/points/delete?wait=true`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                filter: {
                    must: [
                        {
                            key: "guidelineId",
                            match: {
                                value: guidelineId,
                            },
                        },
                    ],
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Qdrant delete failed: ${errorText}`);
        }
    }

    static async searchGuidelines(
        userId: string,
        queryText: string,
        limit: number = 5
    ): Promise<Array<{ title: string; text: string; score: number }>> {
        // Ensure collection exists
        await this.initCollection();

        const url = `${this.baseUrl}/collections/${this.collectionName}/points/search`;
        const ollama = OllamaClient.getInstance();
        const vector = await ollama.getEmbedding(queryText);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                vector,
                filter: {
                    must: [
                        {
                            key: "userId",
                            match: {
                                value: userId,
                            },
                        },
                    ],
                },
                limit,
                with_payload: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Qdrant search failed: ${errorText}`);
        }

        const data = (await response.json()) as IQdrantSearchResponse;

        return data.result.map((res) => ({
            title: res.payload.title,
            text: res.payload.text,
            score: res.score,
        }));
    }

    // Helper to generate deterministic UUID v4 formatted string from a string input
    private static generateUUID(str: string): string {
        const hash = crypto.createHash("sha256").update(str).digest("hex");
        const part1 = hash.substring(0, 8);
        const part2 = hash.substring(8, 12);
        const part3 = "4" + hash.substring(13, 16); // version 4
        const part4 = "8" + hash.substring(17, 20); // variant 8
        const part5 = hash.substring(20, 32);
        return `${part1}-${part2}-${part3}-${part4}-${part5}`;
    }
}
