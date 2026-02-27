import { describe, it, expect } from "vitest";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { decideNextNode } from "@/lib/agent/graph";

describe("decideNextNode", () => {
    it("routes to heavy_reasoning when message contains 'Heavy reasoning required'", () => {
        const state = {
            messages: [
                new HumanMessage("Solve this integral"),
                new SystemMessage(
                    "ROUTER DECISION: Heavy reasoning required for: Solve this integral"
                ),
            ],
            userContext: {},
            requiresHeavyReasoning: true,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        expect(decideNextNode(state)).toBe("heavy_reasoning");
    });

    it("routes to web_search when message contains 'Web search required'", () => {
        const state = {
            messages: [
                new HumanMessage("What happened today in news?"),
                new SystemMessage(
                    "ROUTER DECISION: Web search required for: current events today"
                ),
            ],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        expect(decideNextNode(state)).toBe("web_search");
    });

    it("defaults to textbook_retrieval for textbook-related content", () => {
        const state = {
            messages: [
                new HumanMessage("What is photosynthesis?"),
                new SystemMessage(
                    "ROUTER DECISION: Textbook retrieval for: photosynthesis"
                ),
            ],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        expect(decideNextNode(state)).toBe("textbook_retrieval");
    });

    it("defaults to textbook_retrieval for unknown message content", () => {
        const state = {
            messages: [new HumanMessage("Hello")],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        expect(decideNextNode(state)).toBe("textbook_retrieval");
    });

    it("uses the last message for routing decision", () => {
        const state = {
            messages: [
                new SystemMessage(
                    "ROUTER DECISION: Web search required for: something"
                ),
                new SystemMessage(
                    "ROUTER DECISION: Heavy reasoning required for: math"
                ),
            ],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        // Last message mentions heavy reasoning
        expect(decideNextNode(state)).toBe("heavy_reasoning");
    });

    it("handles non-string message content gracefully", () => {
        const msg = new HumanMessage("test");
        // Simulate a message with non-string content
        (msg as { content: unknown }).content = [
            { type: "text", text: "test" },
        ];

        const state = {
            messages: [msg],
            userContext: {},
            requiresHeavyReasoning: false,
            retrievedContext: "",
            webSearchContext: "",
            reasoningResult: "",
        };

        // Non-string content should default to textbook_retrieval
        expect(decideNextNode(state)).toBe("textbook_retrieval");
    });
});
