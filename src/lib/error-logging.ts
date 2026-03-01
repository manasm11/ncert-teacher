/**
 * Error Logging Utility for Gyanu AI (NCERT Teacher)
 *
 * Provides structured logging with:
 * - Console logging in development (colored, readable)
 * - JSON logging in production (machine-readable for error tracking)
 * - Error tracking with context (user, session, environment)
 */

import { clientEnv } from "./env";
import { getUserFriendlyMessage, getErrorCode } from "./errors";

// --- Environment Detection ---
const isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";

// --- Context Storage ---
interface ErrorContext {
  userId?: string;
  sessionId?: string;
  path?: string;
  action?: string;
  timestamp?: string;
  environment?: string;
  userFriendlyMessage?: string;
  isNonError?: boolean;
  navigation?: {
    path: string;
    type: string;
  };
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

let currentContext: ErrorContext = {};

/**
 * Sets the current error context
 */
export function setContext(context: ErrorContext): void {
  currentContext = { ...currentContext, ...context };
}

/**
 * Clears the current error context
 */
export function clearContext(): void {
  currentContext = {};
}

/**
 * Extends the current error context
 */
export function extendContext(context: ErrorContext): void {
  currentContext = { ...currentContext, ...context };
}

/**
 * Gets the full error context with defaults
 */
function getContext(): ErrorContext {
  return {
    ...currentContext,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };
}

// --- Logging Functions ---

/**
 * Formats an error for console output
 */
function formatConsoleError(error: Error, context: ErrorContext): string {
  const timestamp = new Date().toISOString();
  const errorCode = getErrorCode(error);

  const parts = [
    `%c[Gyanu Error]`,
    `timestamp=${timestamp}`,
    `code=${errorCode}`,
    `message=${error.message}`,
  ];

  if (context.userId) parts.push(`userId=${context.userId}`);
  if (context.sessionId) parts.push(`sessionId=${context.sessionId}`);
  if (context.path) parts.push(`path=${context.path}`);
  if (context.action) parts.push(`action=${context.action}`);

  return parts.join(" ");
}

/**
 * Formats an error for JSON output (production)
 */
function formatJSONError(error: Error, context: ErrorContext): Record<string, unknown> {
  const stackLines = error.stack?.split("\n") || [];
  const errorCode = getErrorCode(error);

  return {
    type: "error",
    timestamp: new Date().toISOString(),
    level: "error",
    error: {
      name: error.name,
      message: error.message,
      code: errorCode,
      stack: stackLines,
      stackTrace: error.stack,
    },
    context: {
      ...context,
      environment: process.env.NODE_ENV,
      windowSize: typeof window !== "undefined" ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    },
  };
}

/**
 * Logs an error to the console and sends to error tracking
 * @param error The error to log
 * @param extraContext Optional additional context to include
 */
export function logError(error: Error, extraContext?: ErrorContext): void {
  const context = { ...getContext(), ...extraContext };

  if (isDev) {
    // Development: Colored console output
    console.error(
      "%c[Gyanu Error] %c%s",
      "color: #16a34a; font-weight: bold; background: #f0fdf4; padding: 2px 8px; border-radius: 4px;",
      "color: #dc2626; font-weight: normal;",
      formatConsoleError(error, context)
    );
    console.trace(error);
  } else {
    // Production: JSON output to console (for error tracking services)
    console.error(JSON.stringify(formatJSONError(error, context), null, 2));
  }

  // Send to error tracking service (if configured)
  // You can add your error tracking service here, e.g., Sentry, LogRocket
  // Example:
  // if (typeof window !== "undefined" && window.Sentry) {
  //   window.Sentry.captureException(error, { contexts: { error: context } });
  // }
}

/**
 * Logs an error with a user-friendly message to the console
 * This is useful for errors that should not expose technical details to users
 */
export function logUserFriendlyError(
  error: Error,
  userMessage: string,
  extraContext?: ErrorContext
): void {
  const context = { ...getContext(), ...extraContext };

  if (isDev) {
    console.warn(
      "%c[Gyanu User Error] %c%s",
      "color: #d97706; font-weight: bold; background: #fef3c7; padding: 2px 8px; border-radius: 4px;",
      "color: #d97706; font-weight: normal;",
      `User message: "${userMessage}"`
    );
    logError(error, { ...context, userFriendlyMessage: userMessage });
  } else {
    // In production, log only the user-friendly message in console
    console.warn(
      `[Gyanu User Error] ${userMessage} (${getErrorCode(error)})`,
      formatJSONError(error, { ...context, userFriendlyMessage: userMessage })
    );
  }
}

/**
 * Logs a caught error with automatic user-friendly message extraction
 */
export function logCaughtError(error: unknown, extraContext?: ErrorContext): void {
  if (error instanceof Error) {
    const friendlyMessage = getUserFriendlyMessage(error);
    logUserFriendlyError(error, friendlyMessage, extraContext);
  } else {
    const nonErrorError = new Error(String(error));
    logError(nonErrorError, { ...extraContext, isNonError: true });
  }
}

/**
 * Logs a navigation error (e.g., page not found)
 */
export function logNavigationError(
  path: string,
  extraContext?: ErrorContext
): void {
  const error = new Error(`Navigation to ${path} failed`);
  logError(error, {
    ...extraContext,
    navigation: {
      path,
      type: "navigation_error",
    },
  });
}

/**
 * Logs a validation error
 */
export function logValidationError(
  field: string,
  message: string,
  extraContext?: ErrorContext
): void {
  const error = new Error(`Validation failed: ${field} - ${message}`);
  logError(error, {
    ...extraContext,
    validation: {
      field,
      message,
      type: "validation_error",
    },
  });
}

/**
 * Logs an API error
 */
export function logAPIError(
  method: string,
  url: string,
  status: number,
  extraContext?: ErrorContext
): void {
  const error = new Error(`API ${method} ${url} failed with status ${status}`);
  logError(error, {
    ...extraContext,
    api: {
      method,
      url,
      status,
      type: "api_error",
    },
  });
}

/**
 * Logs an authentication error
 */
export function logAuthError(
  type: string,
  extraContext?: ErrorContext
): void {
  const error = new Error(`Authentication error: ${type}`);
  logError(error, {
    ...extraContext,
    auth: {
      type: "auth_error",
    },
  });
}

/**
 * Logs a success event (for tracking user actions)
 */
export function logSuccess(
  action: string,
  details?: Record<string, unknown>,
  extraContext?: ErrorContext
): void {
  const context = { ...getContext(), ...extraContext };
  const timestamp = new Date().toISOString();

  const logData = {
    type: "success",
    timestamp,
    level: "info",
    action,
    details,
    context,
  };

  if (isDev) {
    console.log(
      "%c[Gyanu Success] %c%s",
      "color: #15803d; font-weight: bold; background: #dcfce7; padding: 2px 8px; border-radius: 4px;",
      "color: #15803d; font-weight: normal;",
      JSON.stringify(logData)
    );
  } else {
    console.log(JSON.stringify(logData));
  }
}

/**
 * Logs a warning
 */
export function logWarning(
  message: string,
  extraContext?: ErrorContext
): void {
  const context = { ...getContext(), ...extraContext };
  const timestamp = new Date().toISOString();

  const logData = {
    type: "warning",
    timestamp,
    level: "warning",
    message,
    context,
  };

  if (isDev) {
    console.warn(
      "%c[Gyanu Warning] %c%s",
      "color: #d97706; font-weight: bold; background: #fef3c7; padding: 2px 8px; border-radius: 4px;",
      "color: #d97706; font-weight: normal;",
      message
    );
  } else {
    console.warn(JSON.stringify(logData));
  }
}

/**
 * Logs a critical error that requires immediate attention
 */
export function logCritical(
  error: Error,
  extraContext?: ErrorContext
): void {
  const context = { ...getContext(), ...extraContext };

  if (isDev) {
    console.error(
      "%c[Gyanu CRITICAL] %c%s",
      "color: #dc2626; font-weight: bold; background: #fee2e2; padding: 4px 12px; border-radius: 6px;",
      "color: #dc2626; font-weight: normal;",
      error.message
    );
    console.trace(error);
  } else {
    console.error(JSON.stringify(formatJSONError(error, context)));
  }

  // In production, consider sending critical errors to error tracking immediately
  // You might also want to alert on-call engineers
}

/**
 * Logs an error boundary error specifically
 */
export function logErrorBoundaryError(
  error: Error,
  componentStack?: string,
  extraContext?: ErrorContext
): void {
  const context = { ...getContext(), ...extraContext };

  logError(error, {
    ...context,
    errorBoundary: {
      componentStack,
      type: "error_boundary_error",
    },
  });
}

/**
 * Logs a loading error (e.g., suspense boundary)
 */
export function logLoadingError(
  component: string,
  extraContext?: ErrorContext
): void {
  const error = new Error(`Failed to load component: ${component}`);
  logError(error, {
    ...extraContext,
    loading: {
      component,
      type: "loading_error",
    },
  });
}

/**
 * Utility to wrap a function that might throw and log any errors
 */
export function withErrorLogging<T>(
  fn: () => T,
  context?: ErrorContext
): T | undefined {
  try {
    return fn();
  } catch (error) {
    logCaughtError(error, context);
    return undefined;
  }
}

/**
 * Utility to wrap an async function that might throw and log any errors
 */
export async function withErrorLoggingAsync<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    logCaughtError(error, context);
    return undefined;
  }
}
