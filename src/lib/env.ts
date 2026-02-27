import { z } from "zod";

// --- Public environment variables (safe for client and server) ---
const clientSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

export const clientEnv = clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

// --- Server-only environment variables ---
const serverSchema = z.object({
    OLLAMA_CLOUD_API_KEY: z.string().min(1, "OLLAMA_CLOUD_API_KEY is required"),
    OLLAMA_CLOUD_ENDPOINT: z.string().min(1, "OLLAMA_CLOUD_ENDPOINT is required"),
    SEARXNG_URL: z.string().optional(),
});

export const serverEnv = serverSchema.parse({
    OLLAMA_CLOUD_API_KEY: process.env.OLLAMA_CLOUD_API_KEY,
    OLLAMA_CLOUD_ENDPOINT: process.env.OLLAMA_CLOUD_ENDPOINT,
    SEARXNG_URL: process.env.SEARXNG_URL,
});
