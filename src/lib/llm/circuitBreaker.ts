/**
 * Circuit Breaker for LLM API Calls in Gyanu AI
 *
 * Provides fault tolerance for LLM API calls with:
 * - Failure rate monitoring
 * - Automatic circuit opening when threshold exceeded
 * - Graceful degradation (cached responses or friendly errors)
 * - Automatic retry after recovery window
 *
 * Behavior:
 * - If API fails 5 times in 1 minute, circuit opens
 * - Open circuit returns cached response or friendly error
 * - Auto-retry after 30 seconds to test if service recovered
 *
 * Usage:
 * ```ts
 * const circuit = new CircuitBreaker("llm-api", {
 *   failureThreshold: 5,
 *   recoveryTimeout: 30000,
 *   windowMs: 60000
 * });
 *
 * try {
 *   const result = await circuit.execute(() => llm.invoke(prompt));
 *   return result;
 * } catch (error) {
 *   // Circuit is open or all retries failed
 *   return getCachedFallback(prompt);
 * }
 * ```
 */

// ---------------------------------------------------------------------------//
// Types
// ---------------------------------------------------------------------------

export interface CircuitBreakerOptions {
    /** Number of failures before opening circuit (default: 5) */
    failureThreshold?: number;
    /** Time in ms to wait before attempting recovery (default: 30000) */
    recoveryTimeout?: number;
    /** Time window for failure counting in ms (default: 60000) */
    windowMs?: number;
    /** Enable logging (default: true) */
    logging?: boolean;
}

export interface CircuitState {
    state: "closed" | "open" | "half-open";
    lastFailure?: Date;
    failureCount: number;
    lastStateChange: Date;
    successCount: number;
}

export interface CircuitBreakerResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    wasCachedFallback?: boolean;
}

// ---------------------------------------------------------------------------//
// Circuit Breaker Class
// ---------------------------------------------------------------------------

class CircuitBreaker {
    private name: string;
    private options: Required<CircuitBreakerOptions>;
    private state: CircuitState = {
        state: "closed",
        failureCount: 0,
        successCount: 0,
        lastStateChange: new Date(),
    };
    private failures: Date[] = [];
    private cachedFallback?: unknown;

    constructor(name: string, options: CircuitBreakerOptions = {}) {
        this.name = name;
        this.options = {
            failureThreshold: options.failureThreshold ?? 5,
            recoveryTimeout: options.recoveryTimeout ?? 30000,
            windowMs: options.windowMs ?? 60000,
            logging: options.logging ?? true,
        };
    }

    /**
     * Checks if circuit is open and should reject requests.
     */
    public isOpen(): boolean {
        if (this.state.state !== "open") return false;

        const elapsed = Date.now() - this.state.lastStateChange.getTime();
        if (elapsed >= this.options.recoveryTimeout) {
            // Transition to half-open for testing
            this.transitionTo("half-open");
            return false;
        }

        return true;
    }

    /**
     * Gets the current circuit state.
     */
    public getState(): "closed" | "open" | "half-open" {
        this.checkState(); // Ensure state is up to date
        return this.state.state;
    }

    /**
     * Records a successful request.
     */
    public recordSuccess(): void {
        this.state.successCount++;
        this.state.failureCount = 0; // Reset failure count on success
        this.log("Success recorded. Failure count reset to 0.");
    }

    /**
     * Records a failed request.
     */
    public recordFailure(error?: Error): void {
        this.state.failureCount++;
        this.failures.push(new Date());
        this.state.lastFailure = new Date();

        this.log(`Failure recorded. Count: ${this.state.failureCount}/${this.options.failureThreshold}`);

        if (this.state.failureCount >= this.options.failureThreshold) {
            this.transitionTo("open");
        }
    }

    /**
     * Executes a function with circuit breaker protection.
     * @param fn - Async function to execute
     * @param fallbackFn - Optional fallback function when circuit is open
     * @returns Result of the function or fallback
     */
    public async execute<T>(
        fn: () => Promise<T>,
        fallbackFn?: () => Promise<T | undefined>
    ): Promise<CircuitBreakerResult<T>> {
        this.checkState();

        if (this.state.state === "open") {
            this.log("Circuit is OPEN. Using fallback.");

            // Try to get cached response
            if (this.cachedFallback !== undefined) {
                return {
                    success: true,
                    data: this.cachedFallback as T,
                    wasCachedFallback: true,
                };
            }

            // Try fallback function
            if (fallbackFn) {
                try {
                    const fallbackResult = await fallbackFn();
                    if (fallbackResult !== undefined) {
                        return {
                            success: true,
                            data: fallbackResult,
                            wasCachedFallback: false,
                        };
                    }
                } catch (fallbackError) {
                    this.log(`Fallback function failed: ${fallbackError}`);
                }
            }

            return {
                success: false,
                error: new Error(
                    `Circuit breaker is OPEN (${this.name}). No fallback available.`
                ),
            };
        }

        // Half-open or closed - try the request
        try {
            const result = await fn();
            this.recordSuccess();
            return { success: true, data: result };
        } catch (error) {
            this.recordFailure(error instanceof Error ? error : new Error(String(error)));
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }

    /**
     * Manually opens the circuit.
     */
    public open(): void {
        this.transitionTo("open");
    }

    /**
     * Manually closes the circuit.
     */
    public close(): void {
        this.transitionTo("closed");
    }

    /**
     * Resets the circuit breaker state.
     */
    public reset(): void {
        this.state = {
            state: "closed",
            failureCount: 0,
            successCount: 0,
            lastStateChange: new Date(),
        };
        this.failures = [];
        this.log("Circuit breaker reset to closed state.");
    }

    /**
     * Sets a cached fallback response.
     */
    public setCachedFallback(fallback: unknown): void {
        this.cachedFallback = fallback;
        this.log("Cached fallback set.");
    }

    /**
     * Gets circuit breaker statistics.
     */
    public getStats(): {
        state: "closed" | "open" | "half-open";
        failureCount: number;
        successCount: number;
        failureThreshold: number;
        recoveryTimeout: number;
        windowMs: number;
        failuresInWindow: number;
    } {
        this.checkState();
        const failuresInWindow = this.failures.filter(
            (f) => Date.now() - f.getTime() < this.options.windowMs
        ).length;

        return {
            state: this.state.state,
            failureCount: this.state.failureCount,
            successCount: this.state.successCount,
            failureThreshold: this.options.failureThreshold,
            recoveryTimeout: this.options.recoveryTimeout,
            windowMs: this.options.windowMs,
            failuresInWindow,
        };
    }

    // -----------------------------------------------------------------------//
    // Private Helper Methods
    // -----------------------------------------------------------------------//

    private checkState(): void {
        if (this.state.state !== "open") return;

        const elapsed = Date.now() - this.state.lastStateChange.getTime();

        if (elapsed >= this.options.recoveryTimeout) {
            // Transition to half-open for testing
            this.transitionTo("half-open");
        }
    }

    private transitionTo(newState: "closed" | "open" | "half-open"): void {
        const oldState = this.state.state;
        this.state.state = newState;
        this.state.lastStateChange = new Date();

        if (oldState !== newState) {
            this.log(`State changed: ${oldState} -> ${newState}`);
        }

        // Reset failure count when closing
        if (newState === "closed") {
            this.state.failureCount = 0;
            this.state.successCount = 0;
        }
    }

    private log(message: string): void {
        if (this.options.logging) {
            console.log(`[${this.name}] [${this.state.state}] ${message}`);
        }
    }
}

// ---------------------------------------------------------------------------//
// Default Circuit Breaker Instance
// ---------------------------------------------------------------------------

const defaultCircuitBreaker = new CircuitBreaker("llm-api", {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    windowMs: 60000,
    logging: true,
});

// ---------------------------------------------------------------------------//
// Public API
// ---------------------------------------------------------------------------

/**
 * Gets the circuit breaker status.
 */
export function getCircuitBreakerStatus(): "closed" | "open" | "half-open" {
    return defaultCircuitBreaker.getState();
}

/**
 * Checks if the circuit is currently open.
 */
export function isCircuitOpen(): boolean {
    return defaultCircuitBreaker.isOpen();
}

/**
 * Records a successful request to the default circuit breaker.
 */
export function recordSuccess(): void {
    defaultCircuitBreaker.recordSuccess();
}

/**
 * Records a failed request to the default circuit breaker.
 */
export function recordFailure(error?: Error): void {
    defaultCircuitBreaker.recordFailure(error);
}

/**
 * Opens the default circuit breaker.
 */
export function openCircuit(): void {
    defaultCircuitBreaker.open();
}

/**
 * Closes the default circuit breaker.
 */
export function closeCircuit(): void {
    defaultCircuitBreaker.close();
}

/**
 * Resets the default circuit breaker.
 */
export function resetCircuitBreaker(): void {
    defaultCircuitBreaker.reset();
}

/**
 * Gets statistics for the default circuit breaker.
 */
export function getCircuitBreakerStats(): ReturnType<CircuitBreaker["getStats"]> {
    return defaultCircuitBreaker.getStats();
}

/**
 * Sets a cached fallback response for the default circuit breaker.
 */
export function setCircuitFallback(fallback: unknown): void {
    defaultCircuitBreaker.setCachedFallback(fallback);
}

/**
 * Executes a function with the default circuit breaker protection.
 */
export async function executeWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    fallbackFn?: () => Promise<T | undefined>
): Promise<CircuitBreakerResult<T>> {
    return defaultCircuitBreaker.execute(fn, fallbackFn);
}

/**
 * Creates a new circuit breaker instance.
 */
export function createCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    return new CircuitBreaker(name, options);
}

// ---------------------------------------------------------------------------//
// Middleware: Automatic Circuit Breaker Wrapper
// ---------------------------------------------------------------------------

/**
 * Creates a middleware function that automatically handles circuit breaking.
 * Wraps an async function and returns cached response if circuit is open.
 */
export function createCircuitBreakerMiddleware<
    T extends (...args: unknown[]) => Promise<unknown>
>(
    fn: T,
    circuitBreaker: CircuitBreaker = defaultCircuitBreaker,
    fallbackResponse?: unknown
) {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
        const result = await circuitBreaker.execute(
            () => fn(...args),
            async () => {
                if (fallbackResponse !== undefined) {
                    return fallbackResponse;
                }
                return undefined;
            }
        );

        if (result.success) {
            return result.data as Awaited<ReturnType<T>>;
        }

        // Circuit is open and no fallback available
        throw result.error || new Error("Circuit breaker opened");
    };
}

// ---------------------------------------------------------------------------//
// Utility: Graceful Error Message
// ---------------------------------------------------------------------------

/**
 * Generates a user-friendly error message when the LLM circuit is open.
 */
export function getCircuitOpenErrorMessage(serviceName: string = "LLM service"): string {
    return `The ${serviceName} is currently unavailable due to repeated failures. ` +
        "Our system is automatically attempting to recover. Please try again shortly. " +
        "In the meantime, you may want to try a simpler query.";
}

// ---------------------------------------------------------------------------//
// Export
// ---------------------------------------------------------------------------

export default {
    CircuitBreaker,
    defaultCircuitBreaker,
    getCircuitBreakerStatus,
    isCircuitOpen,
    recordSuccess,
    recordFailure,
    openCircuit,
    closeCircuit,
    resetCircuitBreaker,
    getCircuitBreakerStats,
    setCircuitFallback,
    executeWithCircuitBreaker,
    createCircuitBreaker,
    createCircuitBreakerMiddleware,
    getCircuitOpenErrorMessage,
};
