export const ROLES = {
    STUDENT: "student",
    TEACHER: "teacher",
    ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Ordered from least to most privileged */
const ROLE_HIERARCHY: Role[] = [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN];

/** Check if a role has at least the required privilege level */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
    return (
        ROLE_HIERARCHY.indexOf(userRole) >=
        ROLE_HIERARCHY.indexOf(requiredRole)
    );
}

/** Check if the value is a valid role */
export function isValidRole(value: string): value is Role {
    return Object.values(ROLES).includes(value as Role);
}

/** Route protection rules: maps path prefixes to minimum required role */
export const PROTECTED_ROUTES: { prefix: string; minRole: Role }[] = [
    { prefix: "/admin", minRole: ROLES.ADMIN },
    { prefix: "/teacher", minRole: ROLES.TEACHER },
    { prefix: "/dashboard", minRole: ROLES.STUDENT },
    { prefix: "/learn", minRole: ROLES.STUDENT },
    { prefix: "/profile", minRole: ROLES.STUDENT },
];

/** Routes that authenticated users should be redirected away from */
export const AUTH_REDIRECT_ROUTES = ["/login"];
