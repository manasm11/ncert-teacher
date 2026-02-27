import { serverEnv } from "@/lib/env";

/**
 * Generate embeddings for a text string using the Ollama Cloud
 * OpenAI-compatible embeddings endpoint.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${serverEnv.OLLAMA_CLOUD_ENDPOINT}/embeddings`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serverEnv.OLLAMA_CLOUD_API_KEY}`,
        },
        body: JSON.stringify({
            model: "nomic-embed-text",
            input: text,
        }),
    });

    if (!response.ok) {
        throw new Error(`Embedding request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}
