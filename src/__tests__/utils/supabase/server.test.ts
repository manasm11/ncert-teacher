import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module
vi.mock("@/lib/env", () => ({
    clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
}));

const { mockCookieStore, mockCreateServerClient } = vi.hoisted(() => ({
    mockCookieStore: {
        get: vi.fn(),
        set: vi.fn(),
    },
    mockCreateServerClient: vi.fn().mockReturnValue({
        auth: {},
        from: vi.fn(),
    }),
}));

vi.mock("next/headers", () => ({
    cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: mockCreateServerClient,
}));

import { createClient } from "@/utils/supabase/server";

describe("createClient (server)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls createServerClient with correct env vars", async () => {
        await createClient();

        expect(mockCreateServerClient).toHaveBeenCalledWith(
            "http://localhost:54321",
            "test-anon-key",
            expect.objectContaining({
                cookies: expect.objectContaining({
                    get: expect.any(Function),
                    set: expect.any(Function),
                    remove: expect.any(Function),
                }),
            })
        );
    });

    it("returns a Supabase client instance", async () => {
        const client = await createClient();

        expect(client).toBeDefined();
        expect(client).toHaveProperty("auth");
    });

    it("cookie get delegates to cookieStore.get", async () => {
        mockCookieStore.get.mockReturnValue({ value: "test-value" });

        await createClient();

        // Extract the cookies config passed to createServerClient
        const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
        const result = cookiesConfig.get("test-cookie");

        expect(result).toBe("test-value");
        expect(mockCookieStore.get).toHaveBeenCalledWith("test-cookie");
    });

    it("cookie set delegates to cookieStore.set", async () => {
        await createClient();

        const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
        cookiesConfig.set("name", "value", { path: "/" });

        expect(mockCookieStore.set).toHaveBeenCalledWith({
            name: "name",
            value: "value",
            path: "/",
        });
    });

    it("cookie set does not throw in Server Component context", async () => {
        mockCookieStore.set.mockImplementation(() => {
            throw new Error("Cookies can only be modified in a Server Action");
        });

        await createClient();

        const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;

        // Should not throw
        expect(() =>
            cookiesConfig.set("name", "value", {})
        ).not.toThrow();
    });

    it("cookie remove delegates to cookieStore.set with empty value", async () => {
        await createClient();

        const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
        cookiesConfig.remove("session", { path: "/" });

        expect(mockCookieStore.set).toHaveBeenCalledWith({
            name: "session",
            value: "",
            path: "/",
        });
    });

    it("cookie remove does not throw in Server Component context", async () => {
        mockCookieStore.set.mockImplementation(() => {
            throw new Error("Cookies can only be modified in a Server Action");
        });

        await createClient();

        const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;

        expect(() =>
            cookiesConfig.remove("session", {})
        ).not.toThrow();
    });
});
