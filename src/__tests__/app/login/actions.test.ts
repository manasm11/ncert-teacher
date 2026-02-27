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

// Track redirect calls — redirect throws in Next.js so we simulate that
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

// Hoist mock Supabase auth methods
const { mockSignInWithOAuth, mockSignInWithPassword, mockSignUp } =
    vi.hoisted(() => ({
        mockSignInWithOAuth: vi.fn(),
        mockSignInWithPassword: vi.fn(),
        mockSignUp: vi.fn(),
    }));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: {
            signInWithOAuth: mockSignInWithOAuth,
            signInWithPassword: mockSignInWithPassword,
            signUp: mockSignUp,
        },
    }),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
    cookies: vi.fn().mockResolvedValue({
        get: vi.fn(),
        set: vi.fn(),
    }),
    headers: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue("http://localhost:3000"),
    }),
}));

import { signInWithOAuth, login, signup } from "@/app/login/actions";

function createFormData(fields: Record<string, string>): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        form.set(key, value);
    }
    return form;
}

describe("signInWithOAuth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to the OAuth provider URL on success", async () => {
        mockSignInWithOAuth.mockResolvedValue({
            data: { url: "https://accounts.google.com/oauth" },
            error: null,
        });

        await expect(signInWithOAuth("google")).rejects.toThrow(
            "NEXT_REDIRECT:https://accounts.google.com/oauth"
        );

        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
            provider: "google",
            options: {
                redirectTo: "http://localhost:3000/auth/callback?next=/dashboard",
            },
        });
    });

    it("redirects to login with error on OAuth failure", async () => {
        mockSignInWithOAuth.mockResolvedValue({
            data: { url: null },
            error: { message: "OAuth failed" },
        });

        await expect(signInWithOAuth("github")).rejects.toThrow(
            "NEXT_REDIRECT:/login?error=Could not authenticate with github"
        );
    });

    it("passes the correct provider to signInWithOAuth", async () => {
        mockSignInWithOAuth.mockResolvedValue({
            data: { url: "https://github.com/login/oauth" },
            error: null,
        });

        await expect(signInWithOAuth("github")).rejects.toThrow("NEXT_REDIRECT");

        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
            expect.objectContaining({ provider: "github" })
        );
    });
});

describe("login", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to /dashboard on successful login", async () => {
        mockSignInWithPassword.mockResolvedValue({ error: null });

        const formData = createFormData({
            email: "test@example.com",
            password: "password123",
        });

        await expect(login(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/dashboard"
        );

        expect(mockSignInWithPassword).toHaveBeenCalledWith({
            email: "test@example.com",
            password: "password123",
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("redirects to /login with error on authentication failure", async () => {
        mockSignInWithPassword.mockResolvedValue({
            error: { message: "Invalid credentials" },
        });

        const formData = createFormData({
            email: "bad@example.com",
            password: "wrong",
        });

        await expect(login(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/login?error=Could not authenticate user"
        );

        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("extracts email and password from FormData", async () => {
        mockSignInWithPassword.mockResolvedValue({ error: null });

        const formData = createFormData({
            email: "student@school.edu",
            password: "securepass",
        });

        await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");

        expect(mockSignInWithPassword).toHaveBeenCalledWith({
            email: "student@school.edu",
            password: "securepass",
        });
    });
});

describe("signup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects to /dashboard on successful signup", async () => {
        mockSignUp.mockResolvedValue({ error: null });

        const formData = createFormData({
            email: "new@example.com",
            password: "newpassword123",
        });

        await expect(signup(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/dashboard"
        );

        expect(mockSignUp).toHaveBeenCalledWith({
            email: "new@example.com",
            password: "newpassword123",
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("redirects to /login with error on signup failure", async () => {
        mockSignUp.mockResolvedValue({
            error: { message: "Email already registered" },
        });

        const formData = createFormData({
            email: "existing@example.com",
            password: "password",
        });

        await expect(signup(formData)).rejects.toThrow(
            "NEXT_REDIRECT:/login?error=Could not create account"
        );

        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("passes correct data from form to signUp", async () => {
        mockSignUp.mockResolvedValue({ error: null });

        const formData = createFormData({
            email: "user@test.com",
            password: "mypassword",
        });

        await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");

        expect(mockSignUp).toHaveBeenCalledWith({
            email: "user@test.com",
            password: "mypassword",
        });
    });
});
