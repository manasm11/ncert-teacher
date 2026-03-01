/**
 * Custom hook for streaming chat with Gyanu AI
 * Manages chat state, message sending, and SSE connection
 */

import { useState, useRef, useCallback } from "react";

export interface Message {
    role: "user" | "assistant";
    text: string;
    id?: string;
}

export interface ChatPhase {
    name: "idle" | "routing" | "textbook_retrieval" | "web_search" | "heavy_reasoning" | "synthesis" | "done";
    message?: string;
}

export interface UseChatResult {
    messages: Message[];
    isGenerating: boolean;
    error: string | null;
    phase: ChatPhase;
    sendMessage: (text: string) => Promise<void>;
    abort: () => void;
    clearHistory: () => void;
    conversationId?: string;
}

const DEFAULT_WELCOME_MESSAGE = "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!";

function getChatHistoryKey(conversationId?: string): string {
    return conversationId ? `gyanu_chat_${conversationId}` : "gyanu_chat_general";
}

export function useChat(conversationId?: string): UseChatResult {
    const storageKey = getChatHistoryKey(conversationId);

    const [messages, setMessages] = useState<Message[]>(() => {
        // Load history from localStorage if available (conversation-specific)
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
        return [
            {
                role: "assistant",
                text: DEFAULT_WELCOME_MESSAGE,
            },
        ];
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phase, setPhase] = useState<ChatPhase>({ name: "idle" });
    const [storedConversationId, setStoredConversationId] = useState<string | undefined>(conversationId);

    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesRef = useRef<Message[]>(messages);

    // Keep ref in sync with state
    messagesRef.current = messages;

    // Save history to localStorage whenever messages change
    const saveHistory = useCallback((newMessages: Message[]) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(newMessages));
        } catch (error) {
            console.error("Failed to save chat history:", error);
        }
    }, [storageKey]);

    // Add a new message to the chat
    const addMessage = useCallback((role: "user" | "assistant", text: string) => {
        const newMessage: Message = {
            role,
            text,
            id: Date.now().toString(),
        };
        const newMessages = [...messagesRef.current, newMessage];
        setMessages(newMessages);
        saveHistory(newMessages);
        return newMessage;
    }, [saveHistory]);

    const sendMessage = useCallback(async (text: string): Promise<void> => {
        if (isGenerating || !text.trim()) return;

        setError(null);
        setIsGenerating(true);
        setPhase({ name: "routing", message: "Analyzing your question..." });

        const userMessage = addMessage("user", text);

        // Add placeholder assistant message for streaming
        const placeholderMessage: Message = {
            role: "assistant",
            text: "",
            id: `${Date.now()}_assistant`,
        };
        const messagesWithPlaceholder = [...messagesRef.current, placeholderMessage];
        setMessages(messagesWithPlaceholder);

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: messagesWithPlaceholder,
                    userContext: {
                        classGrade: "6",
                        subject: "Science",
                        chapter: conversationId,
                    },
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Network response was not ok");
            }

            // Read SSE stream
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Response body is empty");
            }

            let assistantText = "";
            let responseMetadata: Record<string, unknown> | undefined;

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split("\n").filter((line) => line.trim());

                    for (const line of lines) {
                        if (line.startsWith("event:")) {
                            const eventMatch = line.match(/^event:\s*(\w+)/);
                            const eventType = eventMatch ? eventMatch[1] : "";

                            // Next line should be the data
                            const dataLine = lines[lines.indexOf(line) + 1];
                            if (dataLine?.startsWith("data:")) {
                                const data = JSON.parse(dataLine.substring(5).trim());

                                if (eventType === "status") {
                                    setPhase({
                                        name: data.phase as any,
                                        message: data.message,
                                    });
                                } else if (eventType === "token") {
                                    assistantText += data.content;
                                    // Update the placeholder message with streaming content
                                    setMessages(prev =>
                                        prev.map(msg =>
                                            msg.id === placeholderMessage.id
                                                ? { ...msg, text: assistantText }
                                                : msg
                                        )
                                    );
                                } else if (eventType === "done") {
                                    responseMetadata = data.metadata;
                                } else if (eventType === "error") {
                                    throw new Error(data.error || "Streaming error");
                                }
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            // Final message update - ensure placeholder has final text
            const finalMessages = messagesRef.current.map(msg =>
                msg.id === placeholderMessage.id
                    ? { ...msg, text: assistantText }
                    : msg
            );
            setMessages(finalMessages);
            saveHistory(finalMessages);

            // Store conversation ID from response if provided
            if (responseMetadata?.conversationId) {
                setStoredConversationId(responseMetadata.conversationId as string);
            }

            setPhase({ name: "done" });
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") {
                // Aborted by user, don't show error
                return;
            }

            const errorMessage = err instanceof Error ? err.message : "An error occurred while sending your message";
            setError(errorMessage);
            setPhase({ name: "idle" });

            // Add error message
            const errorMessages: Message[] = [...messagesRef.current, {
                role: "assistant" as const,
                text: `Oops! My connection to the forest map seems unstable right now! 🐘🌿\n\nError: ${errorMessage}`,
                id: Date.now().toString(),
            }];
            setMessages(errorMessages);
            saveHistory(errorMessages);
        } finally {
            setIsGenerating(false);
        }
    }, [isGenerating, conversationId, addMessage, saveHistory]);

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const clearHistory = useCallback(() => {
        setMessages([
            {
                role: "assistant",
                text: DEFAULT_WELCOME_MESSAGE,
            },
        ]);
        localStorage.removeItem(storageKey);
    }, [storageKey]);

    return {
        messages,
        isGenerating,
        error,
        phase,
        sendMessage,
        abort,
        clearHistory,
        conversationId: storedConversationId,
    };
}
