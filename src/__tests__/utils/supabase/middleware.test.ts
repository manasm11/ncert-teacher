import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock the env module
vi.mock("@/lib/env", () => ({
    clientEnv: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
}));

const { mockGetUser, mockCreateServerClient } = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockCreateServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: mockCreateServerClient,
}));

import { updateSession } from "@/utils/supabase/middleware";

describe("updateSession", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockCreateServerClient.mockReturnValue({
            auth: { getUser: mockGetUser },
        });
    });

    it("returns user, supabase client, and response", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1", email: "test@test.com" } },
        });

        const request = new NextRequest("http://localhost:3000/dashboard");
        const result = await updateSession(request);

        expect(result).toHaveProperty("user");
        expect(result).toHaveProperty("supabase");
        expect(result).toHaveProperty("response");
        expect(result.user).toEqual({ id: "user-1", email: "test@test.com" });
    });

    it("returns null user when not authenticated", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: null },
        });

        const request = new NextRequest("http://localhost:3000/");
        const result = await updateSession(request);

        expect(result.user).toBeNull();
    });

    it("creates server client with correct env vars", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const request = new NextRequest("http://localhost:3000/");
        await updateSession(request);

        expect(mockCreateServerClient).toHaveBeenCalledWith(
            "http://localhost:54321",
            "test-anon-key",
            expect.objectContaining({
                cookies: expect.objectContaining({
                    getAll: expect.any(Function),
                    setAll: expect.any(Function),
                }),
            })
        );
    });

    it("response is a NextResponse instance", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const request = new NextRequest("http://localhost:3000/");
        const result = await updateSession(request);

        expect(result.response).toBeInstanceOf(NextResponse);
    });

    it("cookies.getAll reads from request cookies", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const request = new NextRequest("http://localhost:3000/", {
            headers: { cookie: "session=abc123" },
        });
        await updateSession(request);

        const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
        const cookies = cookiesConfig.getAll();

        expect(cookies).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "session", value: "abc123" }),
            ])
        );
    });

    it("cookies.setAll updates both request and response cookies", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const request = new NextRequest("http://localhost:3000/");
        await updateSession(request);

        const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
        cookiesConfig.setAll([
            { name: "token", value: "new-value", options: { path: "/" } },
        ]);

        // Verify request cookie was updated
        expect(request.cookies.get("token")?.value).toBe("new-value");
    });
});
