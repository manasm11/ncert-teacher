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

// Track redirect calls — redirect throws in Next.js
const { mockRedirect, mockRevalidatePath } = vi.hoisted(() => ({
    mockRedirect: vi.fn().mockImplementation((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    mockRevalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    redirect: mockRedirect,
}));

vi.mock("next/cache", () => ({
    revalidatePath: mockRevalidatePath,
}));

// Hoist mock Supabase methods
const {
    mockGetUser,
    mockFrom,
    mockStorageFrom,
    mockAdminDeleteUser,
    mockSignOut,
} = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockStorageFrom: vi.fn(),
    mockAdminDeleteUser: vi.fn(),
    mockSignOut: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: {
            getUser: mockGetUser,
            admin: { deleteUser: mockAdminDeleteUser },
            signOut: mockSignOut,
        },
        from: mockFrom,
        storage: { from: mockStorageFrom },
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

import { updateProfile, uploadAvatar, deleteAccount } from "@/app/profile/actions";

function createFormData(fields: Record<string, string | File>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        form.set(key, value);
    }
    return form;
}

function createMockFile(
    name: string,
    size: number,
    type: string
): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
}

describe("updateProfile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to /login when user is not authenticated", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const formData = createFormData({
            display_name: "Test",
            grade: "6",
            preferred_language: "en",
        });

        await expect(updateProfile(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/login"
        );
    });

    it("updates profile successfully", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        mockFrom.mockReturnValue({
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        });

        const formData = createFormData({
            display_name: "John",
            grade: "8",
            preferred_language: "hi",
        });

        await expect(updateProfile(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/profile?success=Profile updated"
        );

        expect(mockFrom).toHaveBeenCalledWith("profiles");
        expect(mockRevalidatePath).toHaveBeenCalledWith("/profile");
    });

    it("passes correct update payload", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });
        mockFrom.mockReturnValue({ update: mockUpdate });

        const formData = createFormData({
            display_name: "Alice",
            grade: "10",
            preferred_language: "en",
        });

        await expect(updateProfile(formData)).rejects.toThrow("NEXT_REDIRECT");

        expect(mockUpdate).toHaveBeenCalledWith({
            display_name: "Alice",
            grade: 10,
            preferred_language: "en",
        });
    });

    it("handles empty display_name as null", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });
        mockFrom.mockReturnValue({ update: mockUpdate });

        const formData = createFormData({
            display_name: "",
            grade: "",
            preferred_language: "",
        });

        await expect(updateProfile(formData)).rejects.toThrow("NEXT_REDIRECT");

        expect(mockUpdate).toHaveBeenCalledWith({
            display_name: null,
            grade: null,
            preferred_language: "en",
        });
    });

    it("redirects with error on database failure", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        mockFrom.mockReturnValue({
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                    error: { message: "DB error" },
                }),
            }),
        });

        const formData = createFormData({
            display_name: "Test",
            grade: "6",
            preferred_language: "en",
        });

        await expect(updateProfile(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/profile?error=Could not update profile"
        );
    });
});

describe("uploadAvatar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to /login when user is not authenticated", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const formData = createFormData({
            avatar: createMockFile("avatar.png", 1024, "image/png"),
        });

        await expect(uploadAvatar(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/login"
        );
    });

    it("redirects with error when no file is selected", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const formData = createFormData({
            avatar: createMockFile("", 0, ""),
        });

        await expect(uploadAvatar(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/profile?error=No file selected"
        );
    });

    it("rejects invalid file types", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const formData = createFormData({
            avatar: createMockFile("doc.pdf", 1024, "application/pdf"),
        });

        await expect(uploadAvatar(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/profile?error=Invalid file type. Use JPEG, PNG, WebP, or GIF"
        );
    });

    it("rejects files larger than 2MB", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const formData = createFormData({
            avatar: createMockFile("large.png", 3 * 1024 * 1024, "image/png"),
        });

        await expect(uploadAvatar(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/profile?error=File too large. Max 2MB"
        );
    });

    it("uploads avatar successfully", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const mockUpload = vi.fn().mockResolvedValue({ error: null });
        const mockGetPublicUrl = vi.fn().mockReturnValue({
            data: { publicUrl: "https://storage.example.com/avatars/user-1/avatar.png" },
        });
        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });

        mockStorageFrom.mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
        });
        mockFrom.mockReturnValue({ update: mockUpdate });

        const formData = createFormData({
            avatar: createMockFile("avatar.png", 1024, "image/png"),
        });

        await expect(uploadAvatar(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/profile?success=Avatar updated"
        );

        expect(mockUpload).toHaveBeenCalledWith(
            "user-1/avatar.png",
            expect.any(File),
            { upsert: true }
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith("/profile");
    });

    it("redirects with error on upload failure", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        mockStorageFrom.mockReturnValue({
            upload: vi.fn().mockResolvedValue({
                error: { message: "Upload error" },
            }),
        });

        const formData = createFormData({
            avatar: createMockFile("avatar.png", 1024, "image/png"),
        });

        await expect(uploadAvatar(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/profile?error=Could not upload avatar"
        );
    });

    it("redirects with error when profile update fails after upload", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        mockStorageFrom.mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
            getPublicUrl: vi.fn().mockReturnValue({
                data: { publicUrl: "https://storage.example.com/avatar.png" },
            }),
        });

        mockFrom.mockReturnValue({
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                    error: { message: "Update error" },
                }),
            }),
        });

        const formData = createFormData({
            avatar: createMockFile("avatar.jpg", 1024, "image/jpeg"),
        });

        await expect(uploadAvatar(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/profile?error=Could not update avatar URL"
        );
    });

    it("accepts all valid image types", async () => {
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

        for (const type of validTypes) {
            vi.clearAllMocks();

            mockGetUser.mockResolvedValue({
                data: { user: { id: "user-1" } },
            });

            mockStorageFrom.mockReturnValue({
                upload: vi.fn().mockResolvedValue({ error: null }),
                getPublicUrl: vi.fn().mockReturnValue({
                    data: { publicUrl: "https://storage.example.com/avatar" },
                }),
            });
            mockFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });

            const ext = type.split("/")[1];
            const formData = createFormData({
                avatar: createMockFile(`avatar.${ext}`, 512, type),
            });

            await expect(uploadAvatar(formData)).rejects.toThrow(
                "NEXT_REDIRECT:/profile?success=Avatar updated"
            );
        }
    });
});

describe("deleteAccount", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to /login when user is not authenticated", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        await expect(deleteAccount()).rejects.toThrow(
            "NEXT_REDIRECT:/login"
        );
    });

    it("deletes avatar files and account successfully", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const mockList = vi.fn().mockResolvedValue({
            data: [{ name: "avatar.png" }],
        });
        const mockRemove = vi.fn().mockResolvedValue({ error: null });

        mockStorageFrom.mockReturnValue({
            list: mockList,
            remove: mockRemove,
        });

        mockAdminDeleteUser.mockResolvedValue({ error: null });

        await expect(deleteAccount()).rejects.toThrow(
            "NEXT_REDIRECT:/login?success=Account deleted"
        );

        expect(mockList).toHaveBeenCalledWith("user-1");
        expect(mockRemove).toHaveBeenCalledWith(["user-1/avatar.png"]);
        expect(mockAdminDeleteUser).toHaveBeenCalledWith("user-1");
    });

    it("skips file removal when no avatar files exist", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const mockRemove = vi.fn();
        mockStorageFrom.mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [] }),
            remove: mockRemove,
        });

        mockAdminDeleteUser.mockResolvedValue({ error: null });

        await expect(deleteAccount()).rejects.toThrow(
            "NEXT_REDIRECT:/login?success=Account deleted"
        );

        expect(mockRemove).not.toHaveBeenCalled();
    });

    it("falls back to sign out when admin delete fails", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        mockStorageFrom.mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: null }),
            remove: vi.fn(),
        });

        mockAdminDeleteUser.mockResolvedValue({
            error: { message: "Not authorized" },
        });
        mockSignOut.mockResolvedValue({ error: null });

        await expect(deleteAccount()).rejects.toThrow(
            "NEXT_REDIRECT:/login?error=Account deletion requires admin privileges. You have been signed out."
        );

        expect(mockSignOut).toHaveBeenCalled();
    });

    it("handles multiple avatar files", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } },
        });

        const mockRemove = vi.fn().mockResolvedValue({ error: null });
        mockStorageFrom.mockReturnValue({
            list: vi.fn().mockResolvedValue({
                data: [
                    { name: "avatar.png" },
                    { name: "avatar.jpg" },
                ],
            }),
            remove: mockRemove,
        });

        mockAdminDeleteUser.mockResolvedValue({ error: null });

        await expect(deleteAccount()).rejects.toThrow(
            "NEXT_REDIRECT:/login?success=Account deleted"
        );

        expect(mockRemove).toHaveBeenCalledWith([
            "user-1/avatar.png",
            "user-1/avatar.jpg",
        ]);
    });
});
