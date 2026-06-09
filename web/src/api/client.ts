import { ApiResponse } from "@/features/ideas";

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// Helper to make authenticated requests
export async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include", // Include cookies for JWT auth
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "An error occurred");
    }

    return data;
}

// Helper to make streaming requests
export async function streamRequest(
    endpoint: string,
    onChunk: (data: any) => void,
    options: RequestInit = {}
): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "An error occurred" }));
        throw new Error(error.message || "An error occurred");
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("Response body is null");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                try {
                    const data = JSON.parse(trimmed);
                    onChunk(data);
                } catch (e) {
                    console.warn("Failed to parse JSON stream chunk:", trimmed, e);
                }
            }
        }
        
        // Final buffer flush
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                onChunk(data);
            } catch (e) {
                // ignore
            }
        }
    } finally {
        reader.releaseLock();
    }
}
