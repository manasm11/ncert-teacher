import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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

// Mock the Supabase middleware
vi.mock("@/utils/supabase/middleware", () => ({
    updateSession: vi.fn(),
}));

import { middleware } from "@/middleware";
import { updateSession } from "@/utils/supabase/middleware";

function makeRequest(path: string): NextRequest {
    return new NextRequest(`http://localhost:3000${path}`);
}

function mockUpdateSession(
    user: { id: string } | null,
    profile?: { role: string } | null
) {
    const mockSupabase = {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi
                        .fn()
                        .mockResolvedValue({
                            data: profile ?? null,
                            error: null,
                        }),
                }),
            }),
        }),
    };

    vi.mocked(updateSession).mockResolvedValue({
        user,
        supabase: mockSupabase as never,
        response: NextResponse.next(),
    });

    return mockSupabase;
}

describe("middleware", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe("authenticated user on /login", () => {
        it("redirects to /dashboard", async () => {
            mockUpdateSession({ id: "user-1" }, { role: "student" });

            const req = makeRequest("/login");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            expect(new URL(res.headers.get("location")!).pathname).toBe(
                "/dashboard"
            );
        });
    });

    describe("unauthenticated user on protected routes", () => {
        it("redirects to /login for /dashboard", async () => {
            mockUpdateSession(null);

            const req = makeRequest("/dashboard");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            const redirectUrl = new URL(res.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/login");
            expect(redirectUrl.searchParams.get("redirect")).toBe("/dashboard");
        });

        it("redirects to /login for /admin", async () => {
            mockUpdateSession(null);

            const req = makeRequest("/admin");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            const redirectUrl = new URL(res.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/login");
        });

        it("redirects to /login for /learn/123", async () => {
            mockUpdateSession(null);

            const req = makeRequest("/learn/123");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            const redirectUrl = new URL(res.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/login");
            expect(redirectUrl.searchParams.get("redirect")).toBe("/learn/123");
        });

        it("redirects to /login for /profile", async () => {
            mockUpdateSession(null);

            const req = makeRequest("/profile");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            const redirectUrl = new URL(res.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/login");
        });
    });

    describe("role-based access control", () => {
        it("allows admin to access /admin", async () => {
            mockUpdateSession({ id: "admin-1" }, { role: "admin" });

            const req = makeRequest("/admin");
            const res = await middleware(req);

            // Should pass through (200)
            expect(res.status).toBe(200);
        });

        it("blocks student from accessing /admin", async () => {
            mockUpdateSession({ id: "student-1" }, { role: "student" });

            const req = makeRequest("/admin");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            expect(new URL(res.headers.get("location")!).pathname).toBe(
                "/dashboard"
            );
        });

        it("blocks teacher from accessing /admin", async () => {
            mockUpdateSession({ id: "teacher-1" }, { role: "teacher" });

            const req = makeRequest("/admin");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            expect(new URL(res.headers.get("location")!).pathname).toBe(
                "/dashboard"
            );
        });

        it("allows teacher to access /teacher routes", async () => {
            mockUpdateSession({ id: "teacher-1" }, { role: "teacher" });

            const req = makeRequest("/teacher/classroom");
            const res = await middleware(req);

            expect(res.status).toBe(200);
        });

        it("blocks student from accessing /teacher routes", async () => {
            mockUpdateSession({ id: "student-1" }, { role: "student" });

            const req = makeRequest("/teacher/classroom");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            expect(new URL(res.headers.get("location")!).pathname).toBe(
                "/dashboard"
            );
        });

        it("allows student to access /dashboard", async () => {
            mockUpdateSession({ id: "student-1" }, { role: "student" });

            const req = makeRequest("/dashboard");
            const res = await middleware(req);

            expect(res.status).toBe(200);
        });

        it("allows student to access /learn", async () => {
            mockUpdateSession({ id: "student-1" }, { role: "student" });

            const req = makeRequest("/learn/chapter-1");
            const res = await middleware(req);

            expect(res.status).toBe(200);
        });

        it("allows admin to access student routes", async () => {
            mockUpdateSession({ id: "admin-1" }, { role: "admin" });

            const req = makeRequest("/dashboard");
            const res = await middleware(req);

            expect(res.status).toBe(200);
        });
    });

    describe("invalid/missing profile", () => {
        it("redirects to /login when profile is missing", async () => {
            mockUpdateSession({ id: "user-1" }, null);

            const req = makeRequest("/dashboard");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            const redirectUrl = new URL(res.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/login");
            expect(redirectUrl.searchParams.get("error")).toBe(
                "Profile not found"
            );
        });

        it("redirects to /login when role is invalid", async () => {
            mockUpdateSession({ id: "user-1" }, { role: "superadmin" });

            const req = makeRequest("/dashboard");
            const res = await middleware(req);

            expect(res.status).toBe(307);
            const redirectUrl = new URL(res.headers.get("location")!);
            expect(redirectUrl.pathname).toBe("/login");
        });
    });

    describe("public routes", () => {
        it("allows unauthenticated access to landing page", async () => {
            mockUpdateSession(null);

            const req = makeRequest("/");
            const res = await middleware(req);

            // No redirect for public routes
            expect(res.status).toBe(200);
        });
    });
});
