import config from "../../config/config";

export interface IOllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
}

export class OllamaClient {
    private static instance: OllamaClient;
    private baseUrl: string;
    private model: string;

    private constructor() {
        this.baseUrl = config.ollama.url;
        this.model = config.ollama.model;
    }

    public static getInstance(): OllamaClient {
        if (!OllamaClient.instance) {
            OllamaClient.instance = new OllamaClient();
        }
        return OllamaClient.instance;
    }

    async chat(prompt: string, systemPrompt?: string, formatJson?: boolean | Record<string, any>): Promise<string> {
        const url = `${this.baseUrl}/api/chat`;
        
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const body: any = {
            model: this.model,
            messages: messages,
            stream: false,
            options: {
                temperature: formatJson ? 0.1 : 0.7,
            }
        };

        if (formatJson) {
            body.format = typeof formatJson === "object" ? formatJson : "json";
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                // @ts-ignore
                signal: AbortSignal.timeout(600000), // 10 minute timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error (${response.status}): ${errorText}`);
            }

            const data = (await response.json()) as IOllamaResponse;
            return data.message.content;
        } catch (error) {
            console.error("Error calling Ollama:", error);
            throw error;
        }
    }

    async *chatStream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
        const url = `${this.baseUrl}/api/chat`;
        
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const body = {
            model: this.model,
            messages: messages,
            stream: true,
            options: {
                temperature: 0.7,
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                // @ts-ignore
                signal: AbortSignal.timeout(300000), // 5 minute timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error (${response.status}): ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response body");
            }

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                
                // Keep the last partial line in the buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line) as IOllamaResponse;
                        if (data.message?.content) {
                            yield data.message.content;
                        }
                    } catch (e) {
                        console.error("Error parsing Ollama stream chunk:", e, "Line:", line);
                    }
                }
            }

            // Handle any remaining content in the buffer
            if (buffer.trim()) {
                try {
                    const data = JSON.parse(buffer) as IOllamaResponse;
                    if (data.message?.content) {
                        yield data.message.content;
                    }
                } catch (e) {
                    // Ignore error on final remaining buffer if it's not valid JSON
                }
            }
        } catch (error) {
            console.error("Error in Ollama stream:", error);
            throw error;
        }
    }

    async getEmbedding(text: string): Promise<number[]> {
        const url = `${this.baseUrl}/api/embeddings`;
        const body = {
            model: config.ollama.embedModel,
            prompt: text,
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                // @ts-ignore
                signal: AbortSignal.timeout(60000), // 1 minute timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama Embeddings API error (${response.status}): ${errorText}`);
            }

            const data = (await response.json()) as { embedding: number[] };
            return data.embedding;
        } catch (error) {
            console.error("Error generating embeddings from Ollama:", error);
            throw error;
        }
    }
}

export default OllamaClient;
