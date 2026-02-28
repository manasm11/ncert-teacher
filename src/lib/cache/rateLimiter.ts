/**
 * Rate Limiter for LLM API Requests in Gyanu AI
 *
 * Provides rate limiting for concurrent requests to LLM APIs with:
 * - Configurable max concurrent requests (default: 5)
 * - Request queuing when limit is reached
 * - Configurable timeout (default: 30 seconds)
 * - Status monitoring
 *
 * Usage:
 * ```ts
 * const limiter = new RateLimiter(5, 30000);
 *
 * try {
 *   await limiter.acquire();
 *   // Execute LLM API call here
 *   const result = await llm.invoke(prompt);
 *   return result;
 * } finally {
 *   limiter.release();
 * }
 * ```
 */

// ---------------------------------------------------------------------------//
// Types
// ---------------------------------------------------------------------------

export interface RateLimiterOptions {
    /** Maximum number of concurrent requests (default: 5) */
    maxConcurrent?: number;
    /** Timeout in milliseconds for queued requests (default: 30000) */
    timeout?: number;
}

export interface RateLimiterStatus {
    /** Current number of active requests */
    activeRequests: number;
    /** Number of requests waiting in queue */
    queuedRequests: number;
    /** Maximum concurrent requests allowed */
    maxConcurrent: number;
    /** Total requests processed (success + failure) */
    totalProcessed: number;
    /** Total requests that timed out */
    totalTimeouts: number;
    /** Current wait time estimate in ms (0 if no queue) */
    estimatedWaitTime: number;
}

// ---------------------------------------------------------------------------//
// Internal State
// ---------------------------------------------------------------------------

let _maxConcurrent = 5;
let _timeout = 30000;

let _activeRequests = 0;
let _queuedRequests = 0;
let _totalProcessed = 0;
let _totalTimeouts = 0;

// Queue of { resolve, reject, timeoutId } for waiting promises
let _queue: Array<{
    resolve: (value: void) => void;
    reject: (reason: Error) => void;
    timeoutId: NodeJS.Timeout;
}> = [];

// ---------------------------------------------------------------------------//
// Private Helper Functions
// ---------------------------------------------------------------------------

/**
 * Attempts to acquire a slot for processing.
 * Returns true if a slot is immediately available, false otherwise.
 */
function tryAcquire(): boolean {
    if (_activeRequests < _maxConcurrent) {
        _activeRequests++;
        return true;
    }
    return false;
}

/**
 * Processes the next item in the queue.
 * Called after a slot becomes available (release()).
 */
function processQueue(): void {
    if (_queue.length === 0 || _activeRequests >= _maxConcurrent) {
        return;
    }

    // Remove expired entries from queue
    const now = Date.now();
    _queue = _queue.filter((item) => {
        // clearTimeout can accept both number and Timeout object
        // We need to clear it here since we're filtering out expired items
        clearTimeout(item.timeoutId);
        // Check if timeout has been set and exceeded
        if (now > (item.timeoutId as unknown as number)) {
            return false; // Remove expired item
        }
        return true;
    });

    if (_queue.length === 0) return;

    // Take the first item from queue
    const item = _queue.shift();
    if (item) {
        _queuedRequests--;
        _activeRequests++;
        item.resolve();
    }
}

/**
 * Creates a timeout error with context.
 */
function createTimeoutError(): Error {
    return new Error(
        `Rate limiter timeout: Request waited more than ${_timeout}ms for a slot. ` +
        `Current queue: ${_queuedRequests} waiting, ${_activeRequests} active.`
    );
}

// ---------------------------------------------------------------------------//
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a new RateLimiter instance.
 * @param options - Configuration options
 * @param options.maxConcurrent - Maximum concurrent requests (default: 5)
 * @param options.timeout - Queue timeout in ms (default: 30000)
 */
export function createRateLimiter(options: RateLimiterOptions = {}): {
    acquire: () => Promise<void>;
    release: () => void;
    getStatus: () => RateLimiterStatus;
    reset: () => void;
} {
    const maxConcurrent = options.maxConcurrent ?? _maxConcurrent;
    const timeout = options.timeout ?? _timeout;

    const acquire = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (tryAcquire()) {
                // Immediate success
                resolve();
                return;
            }

            // Add to queue
            _queuedRequests++;

            // Create timeout for this queue entry
            const timeoutId = setTimeout(() => {
                // Remove from queue
                const index = _queue.findIndex((item) => item.timeoutId === timeoutId);
                if (index !== -1) {
                    _queue.splice(index, 1);
                    _queuedRequests--;
                    _totalTimeouts++;
                }
                reject(createTimeoutError());
            }, timeout);

            _queue.push({ resolve, reject, timeoutId });
        });
    };

    const release = (): void => {
        _activeRequests = Math.max(0, _activeRequests - 1);
        _totalProcessed++;
        processQueue();
    };

    const getStatus = (): RateLimiterStatus => {
        const estimatedWaitTime =
            _queuedRequests > 0 && _activeRequests >= maxConcurrent
                ? Math.round((_queuedRequests / maxConcurrent) * 1000) // Rough estimate
                : 0;

        return {
            activeRequests: _activeRequests,
            queuedRequests: _queuedRequests,
            maxConcurrent,
            totalProcessed: _totalProcessed,
            totalTimeouts: _totalTimeouts,
            estimatedWaitTime,
        };
    };

    const reset = (): void => {
        // Clear queue and cancel timeouts
        for (const item of _queue) {
            clearTimeout(item.timeoutId);
        }
        _queue = [];
        _activeRequests = 0;
        _queuedRequests = 0;
        _totalProcessed = 0;
        _totalTimeouts = 0;
    };

    return { acquire, release, getStatus, reset };
}

/**
 * Default rate limiter instance with standard configuration.
 */
export const defaultRateLimiter = createRateLimiter({
    maxConcurrent: 5,
    timeout: 30000,
});

// ---------------------------------------------------------------------------//
// Static Methods (Backwards Compatibility)
// ---------------------------------------------------------------------------

/**
 * Acquire a slot from the default rate limiter.
 * Use try/finally to ensure release() is called.
 * @throws {Error} If timeout is reached while waiting in queue
 */
export async function acquire(): Promise<void> {
    return defaultRateLimiter.acquire();
}

/**
 * Release a slot back to the default rate limiter.
 * Must be called after acquire() completes.
 */
export function release(): void {
    defaultRateLimiter.release();
}

/**
 * Get the current status of the default rate limiter.
 */
export function getStatus(): RateLimiterStatus {
    return defaultRateLimiter.getStatus();
}

/**
 * Reset all rate limiter state.
 */
export function reset(): void {
    defaultRateLimiter.reset();
}

// ---------------------------------------------------------------------------//
// Utility: Rate Limiting Decorator Helper
// ---------------------------------------------------------------------------

/**
 * Higher-order function to wrap async functions with rate limiting.
 * Automatically handles acquire/release around the function call.
 *
 * Usage:
 * ```ts
 * const rateLimitedInvoke = withRateLimiting(async (prompt) => {
 *   return await llm.invoke(prompt);
 * });
 *
 * const result = await rateLimitedInvoke(userPrompt);
 * ```
 */
export function withRateLimiting<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    limiter: ReturnType<typeof createRateLimiter> = defaultRateLimiter
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
        await limiter.acquire();
        try {
            return await fn(...args);
        } finally {
            limiter.release();
        }
    };
}

// ---------------------------------------------------------------------------//
// Configuration Functions
// ---------------------------------------------------------------------------

/**
 * Globally configure the rate limiter settings.
 * Affects the default rate limiter instance.
 */
export function configureRateLimiter(options: RateLimiterOptions): void {
    _maxConcurrent = options.maxConcurrent ?? _maxConcurrent;
    _timeout = options.timeout ?? _timeout;
}

/**
 * Get current global rate limiter configuration.
 */
export function getRateLimiterConfig(): RateLimiterOptions {
    return {
        maxConcurrent: _maxConcurrent,
        timeout: _timeout,
    };
}

// ---------------------------------------------------------------------------//
// Export
// ---------------------------------------------------------------------------

export default {
    createRateLimiter,
    defaultRateLimiter,
    acquire,
    release,
    getStatus,
    reset,
    withRateLimiting,
    configureRateLimiter,
    getRateLimiterConfig,
};
