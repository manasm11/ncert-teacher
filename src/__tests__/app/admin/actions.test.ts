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

// Mock next/cache
vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

// Use vi.hoisted so mock objects are available when vi.mock factories run (hoisted to top)
const { mockGetUser, mockFrom } = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
    }),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
    cookies: vi.fn().mockResolvedValue({
        get: vi.fn(),
        set: vi.fn(),
    }),
    headers: vi.fn().mockResolvedValue({
        get: vi.fn(),
    }),
}));

import { updateUserRole } from "@/app/admin/actions";

function setupMockSupabase(
    currentUser: { id: string } | null,
    callerRole: string | null,
    updateResult?: { error: null | { message: string } }
) {
    mockGetUser.mockResolvedValue({
        data: { user: currentUser },
    });

    mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: callerRole ? { role: callerRole } : null,
                    error: null,
                }),
            }),
        }),
        update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(
                updateResult ?? { error: null }
            ),
        }),
    });
}

describe("updateUserRole", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns error when user is not authenticated", async () => {
        setupMockSupabase(null, null);

        const result = await updateUserRole("target-user-id", "teacher");

        expect(result).toEqual({ error: "Not authenticated" });
    });

    it("returns error when caller is not an admin", async () => {
        setupMockSupabase({ id: "teacher-1" }, "teacher");

        const result = await updateUserRole("target-user-id", "admin");

        expect(result).toEqual({ error: "Unauthorized" });
    });

    it("returns error when caller is a student", async () => {
        setupMockSupabase({ id: "student-1" }, "student");

        const result = await updateUserRole("target-user-id", "teacher");

        expect(result).toEqual({ error: "Unauthorized" });
    });

    it("prevents admin from changing their own role", async () => {
        setupMockSupabase({ id: "admin-1" }, "admin");

        const result = await updateUserRole("admin-1", "student");

        expect(result).toEqual({ error: "Cannot change your own role" });
    });

    it("rejects invalid role", async () => {
        setupMockSupabase({ id: "admin-1" }, "admin");

        const result = await updateUserRole(
            "target-user-id",
            "superadmin" as never
        );

        expect(result).toEqual({ error: "Invalid role" });
    });

    it("successfully updates user role as admin", async () => {
        setupMockSupabase({ id: "admin-1" }, "admin", { error: null });

        const result = await updateUserRole("target-user-id", "teacher");

        expect(result).toEqual({ success: true });
    });

    it("returns database error on update failure", async () => {
        setupMockSupabase({ id: "admin-1" }, "admin", {
            error: { message: "Database connection failed" },
        });

        const result = await updateUserRole("target-user-id", "teacher");

        expect(result).toEqual({ error: "Database connection failed" });
    });
});
