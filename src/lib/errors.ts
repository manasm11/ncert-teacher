/**
 * Custom Error Classes for Gyanu AI (NCERT Teacher)
 *
 * Forest/nature theme inspired error hierarchy:
 * - RootError: Base error class
 *   - AuthError: Authentication/authorization issues
 *   - APIError: API communication errors
 *   - ValidationError: Input validation failures
 *   - ErrorBoundaryError: Error boundary specific errors
 */

/**
 * Base error class with error code, user-friendly message, and metadata.
 */
export class RootError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly timestamp: Date;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "RootError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

/**
 * Authentication error - for login, session, and permission issues.
 * Forest metaphor: "The gate to the forest is closed"
 */
export class AuthError extends RootError {
  constructor(
    message: string = "You need to log in to access this part of the forest",
    code: string = "AUTH_ERROR",
    details?: unknown
  ) {
    super(message, code, details);
    this.name = "AuthError";
  }

  static fromSupabaseError(error: unknown): AuthError {
    if (error instanceof Error) {
      if (error.message.includes("invalid credentials")) {
        return new AuthError(
          "The elephant remembers - that email and password don't match",
          "AUTH_INVALID_CREDENTIALS",
          error
        );
      }
      if (error.message.includes("session expired")) {
        return new AuthError(
          "Your forest session has grown stale - please log in again",
          "AUTH_SESSION_EXPIRED",
          error
        );
      }
      if (error.message.includes("user not found")) {
        return new AuthError(
          "This digital sapling isn't in our forest registry - please sign up",
          "AUTH_USER_NOT_FOUND",
          error
        );
      }
    }
    return new AuthError("Authentication required", "AUTH_ERROR", error);
  }
}

/**
 * API error - for server communication failures.
 * Forest metaphor: "The message tree isn't sending a response"
 */
export class APIError extends RootError {
  readonly status?: number;
  readonly response?: Response;

  constructor(
    message: string = "The digital messengers got lost in the forest",
    code: string = "API_ERROR",
    details?: unknown
  ) {
    super(message, code, details);
    this.name = "APIError";
  }

  static async fromResponse(response: Response): Promise<APIError> {
    let errorMessage = "The forest messenger couldn't deliver your message";
    let errorCode = "API_ERROR";

    try {
      const data = await response.json();
      if (data.error) {
        errorMessage = data.error;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    switch (response.status) {
      case 400:
        errorCode = "API_BAD_REQUEST";
        errorMessage = "The message format was unclear - please check your input";
        break;
      case 401:
        errorCode = "API_UNAUTHORIZED";
        errorMessage = "You need permission to access this part of the forest";
        break;
      case 403:
        errorCode = "API_FORBIDDEN";
        errorMessage = "You are not allowed to enter this part of the forest";
        break;
      case 404:
        errorCode = "API_NOT_FOUND";
        errorMessage = "The forest path doesn't exist - the resource was not found";
        break;
      case 429:
        errorCode = "API_RATE_LIMITED";
        errorMessage = "Gyanu is getting too many questions at once - please wait a moment";
        break;
      case 500:
        errorCode = "API_INTERNAL_SERVER";
        errorMessage = "The forest is experiencing a moment of confusion - please try again";
        break;
      case 502:
        errorCode = "API_BAD_GATEWAY";
        errorMessage = "The message tree connection is unstable - please try again";
        break;
      case 503:
        errorCode = "API_SERVICE_UNAVAILABLE";
        errorMessage = "The forest is closed for maintenance - please try again later";
        break;
    }

    const error = new APIError(errorMessage, errorCode, {
      status: response.status,
      statusText: response.statusText,
    });
    error.status = response.status;
    error.response = response;
    return error;
  }

  static fromNetworkError(error: Error): APIError {
    return new APIError(
      "The forest is quiet - unable to reach the server. Check your connection.",
      "API_NETWORK_ERROR",
      error
    );
  }

  static fromTimeout(): APIError {
    return new APIError(
      "The forest messenger took too long to return - please try again",
      "API_TIMEOUT",
      { timeout: true }
    );
  }
}

/**
 * Validation error - for input validation failures.
 * Forest metaphor: "This path is blocked - the input doesn't match"
 */
export class ValidationError extends RootError {
  readonly field?: string;

  constructor(
    message: string = "This path has rules - please check your input",
    code: string = "VALIDATION_ERROR",
    details?: unknown
  ) {
    super(message, code, details);
    this.name = "ValidationError";
  }

  static fromZodError(error: unknown): ValidationError {
    if (error instanceof Error && "issues" in error) {
      const issues = (error as any).issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const firstIssue = issues[0];
        const fieldName = firstIssue.path?.[0] ?? "this field";
        return new ValidationError(
          `The forest requires: ${firstIssue.message} (${fieldName})`,
          "VALIDATION_ZOD_ERROR",
          error
        );
      }
    }
    return new ValidationError("Input validation failed", "VALIDATION_ERROR", error);
  }

  static required(field: string): ValidationError {
    return new ValidationError(
      `The ${field} is a required path in the forest - please provide it`,
      "VALIDATION_REQUIRED",
      { field }
    );
  }

  static invalidFormat(field: string, format: string): ValidationError {
    return new ValidationError(
      `The ${field} must follow the correct path format (${format})`,
      "VALIDATION_INVALID_FORMAT",
      { field, format }
    );
  }

  static tooLong(field: string, maxLength: number): ValidationError {
    return new ValidationError(
      `The ${field} path is too long - maximum ${maxLength} steps`,
      "VALIDATION_TOO_LONG",
      { field, maxLength }
    );
  }

  static tooShort(field: string, minLength: number): ValidationError {
    return new ValidationError(
      `The ${field} path is too short - minimum ${minLength} steps`,
      "VALIDATION_TOO_SHORT",
      { field, minLength }
    );
  }
}

/**
 * Error Boundary Error - for error boundary specific issues.
 * Forest metaphor: "The safety net has a tear"
 */
export class ErrorBoundaryError extends RootError {
  constructor(
    message: string = "The forest's safety net has a tear - we're working to fix it",
    code: string = "ERROR_BOUNDARY_ERROR",
    details?: unknown
  ) {
    super(message, code, details);
    this.name = "ErrorBoundaryError";
  }

  static fromReactError(error: Error): ErrorBoundaryError {
    return new ErrorBoundaryError(
      "A leaf has fallen from the tree - we're looking into it",
      "ERROR_BOUNDARY_REACT",
      error
    );
  }

  static fromLoadingError(): ErrorBoundaryError {
    return new ErrorBoundaryError(
      "The forest path couldn't be loaded - the path is blocked",
      "ERROR_BOUNDARY_LOADING",
      { loading: true }
    );
  }

  static fromNavigationError(error: Error): ErrorBoundaryError {
    return new ErrorBoundaryError(
      "Lost in the forest - couldn't navigate to the requested page",
      "ERROR_BOUNDARY_NAVIGATION",
      error
    );
  }
}

/**
 * Utility function to check if an error is an API error
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

/**
 * Utility function to check if an error is an Auth error
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Utility function to check if an error is a Validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Utility function to check if an error is an Error Boundary error
 */
export function isErrorBoundaryError(error: unknown): error is ErrorBoundaryError {
  return error instanceof ErrorBoundaryError;
}

/**
 * Utility function to get a user-friendly error message from any error
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (isAPIError(error)) {
    return error.message;
  }
  if (isAuthError(error)) {
    return error.message;
  }
  if (isValidationError(error)) {
    return error.message;
  }
  if (isErrorBoundaryError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return "The forest encountered an unexpected issue - please try again";
  }
  return "An unknown error occurred in the forest";
}

/**
 * Utility function to get an error code for tracking
 */
export function getErrorCode(error: unknown): string {
  if (isAPIError(error)) return error.code;
  if (isAuthError(error)) return error.code;
  if (isValidationError(error)) return error.code;
  if (isErrorBoundaryError(error)) return error.code;
  if (error instanceof Error) return "UNKNOWN_ERROR";
  return "UNKNOWN_ERROR";
}
