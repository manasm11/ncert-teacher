import { describe, it, expect } from "vitest";
import {
    ROLES,
    hasRole,
    isValidRole,
    PROTECTED_ROUTES,
    AUTH_REDIRECT_ROUTES,
} from "@/lib/auth/roles";

describe("ROLES constant", () => {
    it("defines student, teacher, and admin roles", () => {
        expect(ROLES.STUDENT).toBe("student");
        expect(ROLES.TEACHER).toBe("teacher");
        expect(ROLES.ADMIN).toBe("admin");
    });

    it("has exactly 3 roles", () => {
        expect(Object.keys(ROLES)).toHaveLength(3);
    });
});

describe("hasRole", () => {
    it("student has student role", () => {
        expect(hasRole(ROLES.STUDENT, ROLES.STUDENT)).toBe(true);
    });

    it("student does NOT have teacher role", () => {
        expect(hasRole(ROLES.STUDENT, ROLES.TEACHER)).toBe(false);
    });

    it("student does NOT have admin role", () => {
        expect(hasRole(ROLES.STUDENT, ROLES.ADMIN)).toBe(false);
    });

    it("teacher has student role (higher privilege)", () => {
        expect(hasRole(ROLES.TEACHER, ROLES.STUDENT)).toBe(true);
    });

    it("teacher has teacher role", () => {
        expect(hasRole(ROLES.TEACHER, ROLES.TEACHER)).toBe(true);
    });

    it("teacher does NOT have admin role", () => {
        expect(hasRole(ROLES.TEACHER, ROLES.ADMIN)).toBe(false);
    });

    it("admin has student role", () => {
        expect(hasRole(ROLES.ADMIN, ROLES.STUDENT)).toBe(true);
    });

    it("admin has teacher role", () => {
        expect(hasRole(ROLES.ADMIN, ROLES.TEACHER)).toBe(true);
    });

    it("admin has admin role", () => {
        expect(hasRole(ROLES.ADMIN, ROLES.ADMIN)).toBe(true);
    });
});

describe("isValidRole", () => {
    it("returns true for 'student'", () => {
        expect(isValidRole("student")).toBe(true);
    });

    it("returns true for 'teacher'", () => {
        expect(isValidRole("teacher")).toBe(true);
    });

    it("returns true for 'admin'", () => {
        expect(isValidRole("admin")).toBe(true);
    });

    it("returns false for empty string", () => {
        expect(isValidRole("")).toBe(false);
    });

    it("returns false for unknown role", () => {
        expect(isValidRole("superadmin")).toBe(false);
    });

    it("returns false for uppercase variant", () => {
        expect(isValidRole("Admin")).toBe(false);
    });

    it("returns false for numeric string", () => {
        expect(isValidRole("123")).toBe(false);
    });
});

describe("PROTECTED_ROUTES", () => {
    it("protects /admin with admin role", () => {
        const adminRoute = PROTECTED_ROUTES.find((r) => r.prefix === "/admin");
        expect(adminRoute).toBeDefined();
        expect(adminRoute!.minRole).toBe(ROLES.ADMIN);
    });

    it("protects /teacher with teacher role", () => {
        const teacherRoute = PROTECTED_ROUTES.find(
            (r) => r.prefix === "/teacher"
        );
        expect(teacherRoute).toBeDefined();
        expect(teacherRoute!.minRole).toBe(ROLES.TEACHER);
    });

    it("protects /dashboard with student role", () => {
        const dashRoute = PROTECTED_ROUTES.find(
            (r) => r.prefix === "/dashboard"
        );
        expect(dashRoute).toBeDefined();
        expect(dashRoute!.minRole).toBe(ROLES.STUDENT);
    });

    it("protects /learn with student role", () => {
        const learnRoute = PROTECTED_ROUTES.find(
            (r) => r.prefix === "/learn"
        );
        expect(learnRoute).toBeDefined();
        expect(learnRoute!.minRole).toBe(ROLES.STUDENT);
    });

    it("protects /profile with student role", () => {
        const profileRoute = PROTECTED_ROUTES.find(
            (r) => r.prefix === "/profile"
        );
        expect(profileRoute).toBeDefined();
        expect(profileRoute!.minRole).toBe(ROLES.STUDENT);
    });

    it("every route has a valid minRole", () => {
        for (const route of PROTECTED_ROUTES) {
            expect(isValidRole(route.minRole)).toBe(true);
        }
    });
});

describe("AUTH_REDIRECT_ROUTES", () => {
    it("includes /login", () => {
        expect(AUTH_REDIRECT_ROUTES).toContain("/login");
    });

    it("is an array of strings", () => {
        for (const route of AUTH_REDIRECT_ROUTES) {
            expect(typeof route).toBe("string");
        }
    });
});
