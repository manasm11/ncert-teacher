import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module
vi.mock("@/lib/env", () => ({
    clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
}));

const { mockCreateBrowserClient } = vi.hoisted(() => ({
    mockCreateBrowserClient: vi.fn().mockReturnValue({
        auth: {},
        from: vi.fn(),
    }),
}));

vi.mock("@supabase/ssr", () => ({
    createBrowserClient: mockCreateBrowserClient,
}));

import { createClient } from "@/utils/supabase/client";

describe("createClient (browser)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls createBrowserClient with correct env vars", () => {
        createClient();

        expect(mockCreateBrowserClient).toHaveBeenCalledWith(
            "http://localhost:54321",
            "test-anon-key"
        );
    });

    it("returns a Supabase client instance", () => {
        const client = createClient();

        expect(client).toBeDefined();
        expect(client).toHaveProperty("auth");
    });

    it("calls createBrowserClient each time", () => {
        createClient();
        createClient();

        expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2);
    });
});
