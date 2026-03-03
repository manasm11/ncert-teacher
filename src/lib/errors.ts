// Custom error classes for the application

export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class PermissionError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'PermissionError'
  }
}

// Error logging utility
export function logError(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error.message, {
      name: error.name,
      stack: error.stack,
      context
    })
  } else {
    // TODO: Implement structured logging for production
    console.error(`[${error.name}] ${error.message}`, context)
  }
}

// Error boundary utility for safe error handling
export function isExpectedError(error: Error): boolean {
  return error instanceof AuthError ||
         error instanceof APIError ||
         error instanceof ValidationError ||
         error instanceof NotFoundError ||
         error instanceof PermissionError
}