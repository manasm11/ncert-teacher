/**
 * API Response Module
 *
 * Consistent response helpers for API routes.
 * All responses follow a uniform JSON format with the forest/nature theme.
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * Consistent response envelope format
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    metadata?: ApiMetadata;
}

/**
 * Error format for API responses
 */
export interface ApiError {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
}

/**
 * Metadata for API responses
 */
export interface ApiMetadata {
    timestamp: string;
    path?: string;
    method?: string;
}

/**
 * Create a success response (200 OK)
 * Forest metaphor: "The forest path is clear, progress continues"
 */
export function success<T = unknown>(data: T, metadata?: ApiMetadata): NextResponse<ApiResponse<T>> {
    const response: ApiResponse<T> = {
        success: true,
        data,
        metadata: {
            timestamp: new Date().toISOString(),
            ...metadata,
        },
    };
    return NextResponse.json(response, { status: 200 });
}

/**
 * Create a created response (201 Created)
 * Forest metaphor: "A new sapling has been planted in the forest"
 */
export function created<T = unknown>(data: T, metadata?: ApiMetadata): NextResponse<ApiResponse<T>> {
    const response: ApiResponse<T> = {
        success: true,
        data,
        metadata: {
            timestamp: new Date().toISOString(),
            ...metadata,
        },
    };
    return NextResponse.json(response, { status: 201 });
}

/**
 * Create a bad request response (400 Bad Request)
 * Forest metaphor: "The path is blocked - the input doesn't match"
 */
export function badRequest(
    errors: Array<{ field?: string; message: string }>,
    metadata?: ApiMetadata,
): NextResponse<ApiResponse<null>> {
    const formattedErrors: ApiError[] = errors.map((e) => ({
        code: "VALIDATION_ERROR",
        message: e.message,
        field: e.field,
    }));

    const response: ApiResponse<null> = {
        success: false,
        error: formattedErrors[0],
        metadata: {
            timestamp: new Date().toISOString(),
            ...metadata,
        },
    };
    return NextResponse.json(response, { status: 400 });
}

/**
 * Create an unauthorized response (401 Unauthorized)
 * Forest metaphor: "The gate to this grove is closed - authentication required"
 */
export function unauthorized(message: string = "The gate to this grove is closed - authentication required"): NextResponse<ApiResponse<null>> {
    const response: ApiResponse<null> = {
        success: false,
        error: {
            code: "UNAUTHORIZED",
            message,
        },
        metadata: {
            timestamp: new Date().toISOString(),
        },
    };
    return NextResponse.json(response, { status: 401 });
}

/**
 * Create a forbidden response (403 Forbidden)
 * Forest metaphor: "You are not allowed to enter this protected part of the forest"
 */
export function forbidden(message: string = "You are not allowed to enter this protected part of the forest"): NextResponse<ApiResponse<null>> {
    const response: ApiResponse<null> = {
        success: false,
        error: {
            code: "FORBIDDEN",
            message,
        },
        metadata: {
            timestamp: new Date().toISOString(),
        },
    };
    return NextResponse.json(response, { status: 403 });
}

/**
 * Create a not found response (404 Not Found)
 * Forest metaphor: "The requested path does not exist in this forest"
 */
export function notFound(message: string = "The requested path does not exist in this forest"): NextResponse<ApiResponse<null>> {
    const response: ApiResponse<null> = {
        success: false,
        error: {
            code: "NOT_FOUND",
            message,
        },
        metadata: {
            timestamp: new Date().toISOString(),
        },
    };
    return NextResponse.json(response, { status: 404 });
}

/**
 * Create a server error response (500 Internal Server Error)
 * Forest metaphor: "The forest is experiencing a moment of confusion"
 */
export function serverError(
    message: string = "The forest is experiencing a moment of confusion - please try again",
    metadata?: ApiMetadata,
): NextResponse<ApiResponse<null>> {
    const response: ApiResponse<null> = {
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message,
        },
        metadata: {
            timestamp: new Date().toISOString(),
            ...metadata,
        },
    };
    return NextResponse.json(response, { status: 500 });
}

/**
 * Create a rate limited response (429 Too Many Requests)
 * Forest metaphor: "Gyanu is getting too many questions at once"
 */
export function rateLimited(message: string = "Gyanu is getting too many questions at once - please wait a moment"): NextResponse<ApiResponse<null>> {
    const response: ApiResponse<null> = {
        success: false,
        error: {
            code: "RATE_LIMITED",
            message,
        },
        metadata: {
            timestamp: new Date().toISOString(),
        },
    };
    return NextResponse.json(response, { status: 429 });
}

/**
 * Extract request metadata for response
 */
export function getRequestMetadata(request: NextRequest): ApiMetadata {
    return {
        timestamp: new Date().toISOString(),
        path: request.nextUrl.pathname,
        method: request.method,
    };
}
