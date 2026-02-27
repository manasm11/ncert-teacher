import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module
vi.mock("@/lib/env", () => ({
    clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
    },
    serverEnv: {
        OLLAMA_CLOUD_API_KEY: "test-key",
        OLLAMA_CLOUD_ENDPOINT: "http://localhost:11434",
    },
}));

// Hoist mock for cookie store and exchange code
const { mockExchangeCodeForSession, mockCookieStore } = vi.hoisted(() => ({
    mockExchangeCodeForSession: vi.fn(),
    mockCookieStore: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    },
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
    cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn().mockReturnValue({
        auth: {
            exchangeCodeForSession: mockExchangeCodeForSession,
        },
    }),
}));

import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to /dashboard on successful code exchange", async () => {
        mockExchangeCodeForSession.mockResolvedValue({ error: null });

        const request = new Request(
            "http://localhost:3000/auth/callback?code=valid-code&next=/dashboard"
        );

        const response = await GET(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location")!;
        expect(new URL(location).pathname).toBe("/dashboard");
        expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    });

    it("redirects to custom next path on success", async () => {
        mockExchangeCodeForSession.mockResolvedValue({ error: null });

        const request = new Request(
            "http://localhost:3000/auth/callback?code=valid-code&next=/learn/chapter-1"
        );

        const response = await GET(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location")!;
        expect(new URL(location).pathname).toBe("/learn/chapter-1");
    });

    it("defaults to /dashboard when next param is not provided", async () => {
        mockExchangeCodeForSession.mockResolvedValue({ error: null });

        const request = new Request(
            "http://localhost:3000/auth/callback?code=valid-code"
        );

        const response = await GET(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location")!;
        expect(new URL(location).pathname).toBe("/dashboard");
    });

    it("redirects to login with error when code exchange fails", async () => {
        mockExchangeCodeForSession.mockResolvedValue({
            error: { message: "Code expired" },
        });

        const request = new Request(
            "http://localhost:3000/auth/callback?code=expired-code"
        );

        const response = await GET(request);

        expect(response.status).toBe(307);
        const location = new URL(response.headers.get("location")!);
        expect(location.pathname).toBe("/login");
        expect(location.searchParams.get("error")).toBe(
            "Could not exchange code for session"
        );
    });

    it("redirects to login with error when no code is provided", async () => {
        const request = new Request(
            "http://localhost:3000/auth/callback"
        );

        const response = await GET(request);

        expect(response.status).toBe(307);
        const location = new URL(response.headers.get("location")!);
        expect(location.pathname).toBe("/login");
        expect(location.searchParams.get("error")).toBe(
            "Could not exchange code for session"
        );

        // Should not attempt exchange without a code
        expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });

    it("redirects to login with error when code is empty string", async () => {
        const request = new Request(
            "http://localhost:3000/auth/callback?code="
        );

        const response = await GET(request);

        // Empty string is falsy, so should not exchange
        expect(response.status).toBe(307);
        const location = new URL(response.headers.get("location")!);
        expect(location.pathname).toBe("/login");
    });
});
