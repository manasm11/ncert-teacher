import { z } from "zod";

// --- Public environment variables (safe for client and server) ---
const clientSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

// Lazy-validated: defers parsing until first property access so the build
// succeeds even when env vars are not set (e.g. in CI).
let _clientEnv: z.infer<typeof clientSchema> | undefined;
function getClientEnv() {
    if (!_clientEnv) {
        _clientEnv = clientSchema.parse({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        });
    }
    return _clientEnv;
}

export const clientEnv = new Proxy({} as z.infer<typeof clientSchema>, {
    get(_target, prop: string) {
        return getClientEnv()[prop as keyof z.infer<typeof clientSchema>];
    },
});

// --- Server-only environment variables ---
const serverSchema = z.object({
    OLLAMA_CLOUD_API_KEY: z.string().min(1, "OLLAMA_CLOUD_API_KEY is required"),
    OLLAMA_CLOUD_ENDPOINT: z.string().min(1, "OLLAMA_CLOUD_ENDPOINT is required"),
    SEARXNG_URL: z.string().optional(),
});

let _serverEnv: z.infer<typeof serverSchema> | undefined;
function getServerEnv() {
    if (!_serverEnv) {
        _serverEnv = serverSchema.parse({
            OLLAMA_CLOUD_API_KEY: process.env.OLLAMA_CLOUD_API_KEY,
            OLLAMA_CLOUD_ENDPOINT: process.env.OLLAMA_CLOUD_ENDPOINT,
            SEARXNG_URL: process.env.SEARXNG_URL,
        });
    }
    return _serverEnv;
}

export const serverEnv = new Proxy({} as z.infer<typeof serverSchema>, {
    get(_target, prop: string) {
        return getServerEnv()[prop as keyof z.infer<typeof serverSchema>];
    },
});
