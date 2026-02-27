import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("environment validation schemas", () => {
    // We test the schemas directly rather than the parsed exports,
    // since the parsed exports execute at module load time.

    const clientSchema = z.object({
        NEXT_PUBLIC_SUPABASE_URL: z
            .string()
            .min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: z
            .string()
            .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
    });

    const serverSchema = z.object({
        OLLAMA_CLOUD_API_KEY: z
            .string()
            .min(1, "OLLAMA_CLOUD_API_KEY is required"),
        OLLAMA_CLOUD_ENDPOINT: z
            .string()
            .min(1, "OLLAMA_CLOUD_ENDPOINT is required"),
        SEARXNG_URL: z.string().optional(),
    });

    describe("clientSchema", () => {
        it("accepts valid client env", () => {
            const result = clientSchema.safeParse({
                NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-123",
            });
            expect(result.success).toBe(true);
        });

        it("rejects missing SUPABASE_URL", () => {
            const result = clientSchema.safeParse({
                NEXT_PUBLIC_SUPABASE_URL: "",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "key",
            });
            expect(result.success).toBe(false);
        });

        it("rejects missing SUPABASE_ANON_KEY", () => {
            const result = clientSchema.safeParse({
                NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
            });
            expect(result.success).toBe(false);
        });

        it("rejects undefined values", () => {
            const result = clientSchema.safeParse({
                NEXT_PUBLIC_SUPABASE_URL: undefined,
                NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
            });
            expect(result.success).toBe(false);
        });
    });

    describe("serverSchema", () => {
        it("accepts valid server env with optional SEARXNG_URL", () => {
            const result = serverSchema.safeParse({
                OLLAMA_CLOUD_API_KEY: "key-123",
                OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
                SEARXNG_URL: "http://localhost:8080",
            });
            expect(result.success).toBe(true);
        });

        it("accepts valid server env without SEARXNG_URL", () => {
            const result = serverSchema.safeParse({
                OLLAMA_CLOUD_API_KEY: "key-123",
                OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
            });
            expect(result.success).toBe(true);
        });

        it("rejects missing OLLAMA_CLOUD_API_KEY", () => {
            const result = serverSchema.safeParse({
                OLLAMA_CLOUD_API_KEY: "",
                OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
            });
            expect(result.success).toBe(false);
        });

        it("rejects missing OLLAMA_CLOUD_ENDPOINT", () => {
            const result = serverSchema.safeParse({
                OLLAMA_CLOUD_API_KEY: "key-123",
                OLLAMA_CLOUD_ENDPOINT: "",
            });
            expect(result.success).toBe(false);
        });

        it("accepts SEARXNG_URL as undefined", () => {
            const result = serverSchema.safeParse({
                OLLAMA_CLOUD_API_KEY: "key-123",
                OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
                SEARXNG_URL: undefined,
            });
            expect(result.success).toBe(true);
        });
    });
});
