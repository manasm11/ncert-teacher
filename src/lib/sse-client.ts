/**
 * SSE (Server-Sent Events) client utility
 * Provides automatic reconnection, message queuing, and event handling
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
    sendMessage: (data: any) => void;
    getUnacknowledgedCount: () => number;
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
    const messageQueue: any[] = [];
    const messageAckTimeouts = new Map<string, NodeJS.Timeout>();

    // Configuration
    const CONFIG = {
        maxReconnectAttempts: 5,
        baseReconnectDelay: 1000,
        messageAckTimeout: 5000, // 5 seconds to acknowledge a message
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
        handlers.onOpen?.();
        console.log("SSE connection opened");

        // Process any queued messages
        processMessageQueue();
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
     */
    function handleError(error: Event) {
        console.error("SSE connection error:", error);

        if (connectionStatus) {
            // We were connected, so we should reconnect
            scheduleReconnect();
            connectionStatus = false;
        }
    }

    /**
     * Handle SSE close event
     */
    function handleClose() {
        console.log("SSE connection closed");
        connectionStatus = false;
        handlers.onClose?.();

        // Try to reconnect unless we explicitly closed
        if (eventSource !== null) {
            scheduleReconnect();
        }
    }

    /**
     * Schedule a reconnection attempt
     */
    function scheduleReconnect() {
        if (reconnectAttempts >= CONFIG.maxReconnectAttempts) {
            console.log("Max reconnection attempts reached");
            return;
        }

        reconnectAttempts++;
        console.log(`Scheduling reconnection attempt ${reconnectAttempts} in ${reconnectDelay}ms`);

        handlers.onReconnect?.(reconnectAttempts);

        setTimeout(() => {
            if (eventSource === null) {
                connectUrl(window.location.origin + "/api/chat");
            }
        }, reconnectDelay);

        // Exponential backoff with jitter
        reconnectDelay = Math.min(reconnectDelay * 1.5, maxReconnectDelay);
    }

    function connectUrl(url: string) {
        // Close existing connection
        if (eventSource) {
            eventSource.close();
        }

        // Create new EventSource
        eventSource = new EventSource(url);

        eventSource.onopen = handleOpen;
        eventSource.onmessage = handleMessage;
        eventSource.onerror = handleError;
        eventSource.onclose = handleClose;

        // Store for cleanup
        eventSource["__sseClient"] = {
            disconnect: () => {
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                    connectionStatus = false;
                }
            },
        };
    }

    /**
     * Connect to a URL
     */
    function connect(url: string) {
        connectUrl(url);
    }

    /**
     * Disconnect from the SSE stream
     */
    function disconnect() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        connectionStatus = false;

        // Clear all message timeouts
        messageAckTimeouts.forEach((timeout) => clearTimeout(timeout));
        messageAckTimeouts.clear();
    }

    /**
     * Check if connected
     */
    function isConnected() {
        return connectionStatus;
    }

    /**
     * Send a message to the server
     * Messages are queued if not connected
     */
    function sendMessage(data: any) {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const message = {
            id: messageId,
            data,
            timestamp: Date.now(),
        };

        // Queue the message
        messageQueue.push(message);

        // Start ack timeout
        const timeout = setTimeout(() => {
            handleAckTimeout(message);
        }, CONFIG.messageAckTimeout);

        messageAckTimeouts.set(messageId, timeout);

        // If connected, try to send immediately
        if (isConnected()) {
            processMessageQueue();
        }
    }

    /**
     * Process the message queue
     */
    function processMessageQueue() {
        if (!isConnected() || !eventSource || messageQueue.length === 0) {
            return;
        }

        // Send messages that haven't been acknowledged
        for (const message of messageQueue) {
            if (!messageAckTimeouts.has(message.id)) {
                // Already acknowledged, skip
                continue;
            }

            try {
                eventSource["dispatchEvent"](
                    new MessageEvent("message", {
                        data: JSON.stringify(message.data),
                    })
                );
            } catch (error) {
                console.error("Failed to send message:", error);
            }
        }
    }

    /**
     * Handle message ack timeout
     */
    function handleAckTimeout(message: any) {
        console.warn(`Message ${message.id} ack timeout`);
        messageAckTimeouts.delete(message.id);

        // Resend the message
        if (isConnected()) {
            processMessageQueue();
        }
    }

    /**
     * Get count of unacknowledged messages
     */
    function getUnacknowledgedCount() {
        return messageQueue.length;
    }

    return {
        connect,
        disconnect,
        isConnected: isConnected,
        sendMessage,
        getUnacknowledgedCount,
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
