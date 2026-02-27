import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import {
    PROTECTED_ROUTES,
    AUTH_REDIRECT_ROUTES,
    hasRole,
    isValidRole,
    type Role,
} from "@/lib/auth/roles";

export async function middleware(request: NextRequest) {
    const { user, supabase, response } = await updateSession(request);
    const { pathname } = request.nextUrl;

    // Redirect authenticated users away from login
    if (user && AUTH_REDIRECT_ROUTES.some((r) => pathname.startsWith(r))) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    // Check protected routes
    const matched = PROTECTED_ROUTES.find((route) =>
        pathname.startsWith(route.prefix)
    );

    if (matched) {
        // Not authenticated → redirect to login
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("redirect", pathname);
            return NextResponse.redirect(url);
        }

        // Fetch role from profiles table
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const role = profile?.role;

        if (!role || !isValidRole(role)) {
            // No profile or invalid role — redirect to login
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("error", "Profile not found");
            return NextResponse.redirect(url);
        }

        // Check if user has sufficient privileges
        if (!hasRole(role as Role, matched.minRole)) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon)
         * - public folder assets
         * - API routes (handled separately)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
    ],
};
