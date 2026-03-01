/**
 * SSE (Server-Sent Events) client utility
 * Provides automatic reconnection and event handling
 */

export type SSEventType = "status" | "token" | "done" | "error" | string;

export interface SSEvent {
    type: SSEventType;
    data: any;
    retry?: number;
}

export interface SSEventHandlers {
    onStatus?: (event: SSEvent) => void;
    onToken?: (event: SSEvent) => void;
    onDone?: (event: SSEvent) => void;
    onError?: (event: SSEvent) => void;
    onClose?: () => void;
    onReconnect?: (attempt: number) => void;
    onOpen?: () => void;
}

export interface SSEClient {
    connect: (url: string) => void;
    disconnect: () => void;
    isConnected: () => boolean;
}

/**
 * Create an SSE client with automatic reconnection
 */
export function createSSEClient(handlers: SSEventHandlers = {}): SSEClient {
    let eventSource: EventSource | null = null;
    let connectionStatus = false;
    let reconnectAttempts = 0;
    let reconnectDelay = 1000; // Start with 1 second
    const maxReconnectDelay = 30000; // 30 seconds max
    let explicitClose = false;
    let currentUrl: string | null = null;

    // Configuration
    const CONFIG = {
        maxReconnectAttempts: 5,
        baseReconnectDelay: 1000,
    };

    /**
     * Parse SSE event from data string
     */
    function parseEvent(data: string): SSEvent | null {
        try {
            // Handle both plain JSON and wrapped format
            const parsed = typeof data === "string" ? JSON.parse(data) : data;

            return {
                type: parsed.event || "message",
                data: parsed.data || parsed,
            };
        } catch (error) {
            console.error("Failed to parse SSE event:", error);
            return null;
        }
    }

    /**
     * Handle SSE open event
     */
    function handleOpen() {
        connectionStatus = true;
        reconnectAttempts = 0;
        reconnectDelay = CONFIG.baseReconnectDelay;
        explicitClose = false;
        handlers.onOpen?.();
        console.log("SSE connection opened");
    }

    /**
     * Handle SSE message event
     */
    function handleMessage(event: MessageEvent) {
        const sseEvent = parseEvent(event.data);

        if (!sseEvent) return;

        // Route to appropriate handler
        switch (sseEvent.type) {
            case "status":
                handlers.onStatus?.(sseEvent);
                break;
            case "token":
                handlers.onToken?.(sseEvent);
                break;
            case "done":
                handlers.onDone?.(sseEvent);
                break;
            case "error":
                handlers.onError?.(sseEvent);
                break;
            default:
                console.log("Unknown SSE event type:", sseEvent.type);
        }
    }

    /**
     * Handle SSE error event
     * Note: EventSource doesn't have a native close event, so we handle
     * connection drops through the error event and readyState checks
     */
    function handleError(error: Event) {
        console.error("SSE connection error:", error);

        // Check if the connection was explicitly closed
        if (explicitClose) {
            return;
        }

        if (connectionStatus) {
            // We were connected, connection dropped
            connectionStatus = false;
            handlers.onClose?.();
        }

        // Try to reconnect if not explicitly closed
        scheduleReconnect();
    }

    /**
     * Schedule a reconnection attempt with exponential backoff
     */
    function scheduleReconnect() {
        if (explicitClose || reconnectAttempts >= CONFIG.maxReconnectAttempts) {
            if (reconnectAttempts >= CONFIG.maxReconnectAttempts) {
                console.log("Max reconnection attempts reached");
            }
            return;
        }

        reconnectAttempts++;
        console.log(`Scheduling reconnection attempt ${reconnectAttempts} in ${reconnectDelay}ms`);

        handlers.onReconnect?.(reconnectAttempts);

        setTimeout(() => {
            if (!explicitClose && eventSource === null && currentUrl) {
                // Reconnect to the same URL
                connectUrl(currentUrl);
            }
        }, reconnectDelay);

        // Exponential backoff with jitter
        reconnectDelay = Math.min(reconnectDelay * 1.5 + Math.random() * 1000, maxReconnectDelay);
    }

    function connectUrl(url: string) {
        // Store URL for reconnection
        currentUrl = url;
        // Close existing connection
        if (eventSource) {
            eventSource.close();
        }

        // Create new EventSource
        eventSource = new EventSource(url);

        eventSource.onopen = handleOpen;
        eventSource.onmessage = handleMessage;
        eventSource.onerror = handleError;
        // Note: EventSource does NOT have onclose - we detect closure via onerror
    }

    /**
     * Connect to a URL
     */
    function connect(url: string) {
        explicitClose = false;
        connectUrl(url);
    }

    /**
     * Disconnect from the SSE stream
     */
    function disconnect() {
        explicitClose = true;
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        connectionStatus = false;
        handlers.onClose?.();
    }

    /**
     * Check if connected
     */
    function isConnected() {
        return connectionStatus && eventSource?.readyState === EventSource.OPEN;
    }

    return {
        connect,
        disconnect,
        isConnected,
    };
}

/**
 * Convenience function to connect to SSE with callbacks
 */
export function connectSSE(
    url: string,
    onEvent: (event: SSEvent) => void,
    onError?: (error: Error) => void,
    onClose?: () => void
): SSEClient {
    const client = createSSEClient({
        onStatus: onEvent,
        onToken: onEvent,
        onDone: onEvent,
        onError: (event) => {
            onError?.(new Error(event.data?.error || "SSE error"));
        },
        onClose,
    });

    client.connect(url);
    return client;
}
