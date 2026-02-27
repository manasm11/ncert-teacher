import { useState, useRef, useCallback } from "react";

export type Message = {
  role: "user" | "assistant";
  text: string;
};

export type ChatPhase =
  | "idle"
  | "routing"
  | "retrieval"
  | "web_search"
  | "reasoning"
  | "synthesis"
  | "error";

export type ChatState = {
  messages: Message[];
  isLoading: boolean;
  phase: ChatPhase;
  phaseMessage: string;
  error: string | null;
};

export function useChat() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      {
        role: "assistant",
        text: "Hello there! I'm Gyanu 🐘. Ready to dive into today's chapter? Ask me anything when you get stuck!"
      }
    ],
    isLoading: false,
    phase: "idle",
    phaseMessage: "",
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (input: string, userContext: any) => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage: Message = { role: "user", text: input };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      phase: "routing",
      phaseMessage: "Analyzing your question...",
      error: null,
    }));

    try {
      // Create AbortController for cancellation
      abortControllerRef.current = new AbortController();

      // Make the API request
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [userMessage],
          userContext
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Add initial assistant message
      let assistantMessage: Message = { role: "assistant", text: "" };
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      let buffer = "";
      let currentPhase = "routing";
      let currentPhaseMessage = "Analyzing your question...";

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete events
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // Keep incomplete event in buffer

        for (const eventStr of events) {
          if (!eventStr.startsWith("event:") && !eventStr.startsWith("data:")) continue;

          try {
            const lines = eventStr.split("\n");
            const eventLine = lines.find(line => line.startsWith("event:"));
            const dataLine = lines.find(line => line.startsWith("data:"));

            if (!eventLine || !dataLine) continue;

            const eventType = eventLine.replace("event: ", "").trim();
            const dataStr = dataLine.replace("data: ", "").trim();
            const data = JSON.parse(dataStr);

            switch (eventType) {
              case "status":
                currentPhase = data.phase;
                currentPhaseMessage = data.message;
                setChatState(prev => ({
                  ...prev,
                  phase: data.phase as ChatPhase,
                  phaseMessage: data.message,
                }));
                break;

              case "token":
                // Append token to the assistant message
                assistantMessage = {
                  ...assistantMessage,
                  text: assistantMessage.text + data.content
                };
                setChatState(prev => {
                  const newMessages = [...prev.messages];
                  newMessages[newMessages.length - 1] = assistantMessage;
                  return {
                    ...prev,
                    messages: newMessages,
                  };
                });
                break;

              case "done":
                // Chat completed
                setChatState(prev => ({
                  ...prev,
                  isLoading: false,
                  phase: "idle",
                  phaseMessage: "",
                }));
                break;

              case "error":
                // Handle error
                setChatState(prev => ({
                  ...prev,
                  isLoading: false,
                  phase: "error",
                  error: data.message,
                }));
                break;
            }
          } catch (parseError) {
            console.error("Error parsing SSE event:", parseError);
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        // Request was cancelled
        setChatState(prev => ({
          ...prev,
          isLoading: false,
          phase: "idle",
          phaseMessage: "",
        }));
      } else {
        console.error("Chat error:", error);
        setChatState(prev => ({
          ...prev,
          isLoading: false,
          phase: "error",
          error: error.message || "An error occurred while sending your message",
        }));
      }
    }
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        phase: "idle",
        phaseMessage: "",
      }));
    }
  }, []);

  return {
    ...chatState,
    sendMessage,
    cancelRequest,
  };
}