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

const CHAT_HISTORY_KEY = "gyanu_chat_history";

export function useChat(conversationId?: string): UseChatResult {
    const [messages, setMessages] = useState<Message[]>(() => {
        // Load history from localStorage if available
        try {
            const stored = localStorage.getItem(CHAT_HISTORY_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
        return [
            {
                role: "assistant",
                text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!",
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
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newMessages));
        } catch (error) {
            console.error("Failed to save chat history:", error);
        }
    }, []);

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
        const newMessages = [...messagesRef.current];

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
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
                                        name: data.phase as ChatPhase["name"],
                                        message: data.message,
                                    });
                                } else if (eventType === "token") {
                                    assistantText += data.content;
                                    // Update messages with partial text for streaming effect
                                    const currentMessages = [...messagesRef.current];
                                    // Find the last assistant message and update it
                                    for (let i = currentMessages.length - 1; i >= 0; i--) {
                                        if (currentMessages[i].role === "assistant") {
                                            currentMessages[i] = { ...currentMessages[i], text: assistantText };
                                            break;
                                        }
                                    }
                                    setMessages(currentMessages);
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

            // Final message update
            const finalMessages = [...messagesRef.current];
            for (let i = finalMessages.length - 1; i >= 0; i--) {
                if (finalMessages[i].role === "assistant") {
                    finalMessages[i] = { ...finalMessages[i], text: assistantText };
                    break;
                }
            }
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
            const errorMessages = [...messagesRef.current, {
                role: "assistant",
                text: `Oops! My connection to the forest map seems unstable right now! 🐘🌿\n\nError: ${errorMessage}`,
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
                text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!",
            },
        ]);
        saveHistory([]);
        localStorage.removeItem(CHAT_HISTORY_KEY);
    }, [saveHistory]);

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
