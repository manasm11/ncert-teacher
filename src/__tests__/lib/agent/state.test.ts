import { describe, it, expect } from "vitest";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { AgentState } from "@/lib/agent/state";

// LangGraph BinaryOperatorAggregate uses `operator` for the reducer
// and `initialValueFactory` for the default value factory.

describe("AgentState", () => {
    describe("messages annotation", () => {
        it("has a default value of empty array", () => {
            const spec = AgentState.spec;
            const defaultVal = spec.messages.initialValueFactory();

            expect(defaultVal).toEqual([]);
        });

        it("concatenates messages via reducer", () => {
            const spec = AgentState.spec;
            const existing = [new HumanMessage("Hello")];
            const incoming = [new AIMessage("Hi!")];

            const result = spec.messages.operator(existing, incoming);

            expect(result).toHaveLength(2);
            expect(result[0].content).toBe("Hello");
            expect(result[1].content).toBe("Hi!");
        });

        it("preserves order when concatenating", () => {
            const spec = AgentState.spec;
            const a = [new HumanMessage("A"), new HumanMessage("B")];
            const b = [new AIMessage("C")];

            const result = spec.messages.operator(a, b);

            expect(result).toHaveLength(3);
            expect(result[0].content).toBe("A");
            expect(result[1].content).toBe("B");
            expect(result[2].content).toBe("C");
        });
    });

    describe("userContext annotation", () => {
        it("has a default value of empty object", () => {
            const spec = AgentState.spec;
            const defaultVal = spec.userContext.initialValueFactory();

            expect(defaultVal).toEqual({});
        });

        it("merges user context via reducer", () => {
            const spec = AgentState.spec;
            const existing = { classGrade: "6", subject: "Science" };
            const incoming = { chapter: "Photosynthesis" };

            const result = spec.userContext.operator(existing, incoming);

            expect(result).toEqual({
                classGrade: "6",
                subject: "Science",
                chapter: "Photosynthesis",
            });
        });

        it("overrides existing fields on merge", () => {
            const spec = AgentState.spec;
            const existing = { classGrade: "6", subject: "Science" };
            const incoming = { classGrade: "8" };

            const result = spec.userContext.operator(existing, incoming);

            expect(result).toEqual({
                classGrade: "8",
                subject: "Science",
            });
        });
    });

    describe("requiresHeavyReasoning annotation", () => {
        it("has a default value of false", () => {
            const spec = AgentState.spec;
            const defaultVal = spec.requiresHeavyReasoning.initialValueFactory();

            expect(defaultVal).toBe(false);
        });

        it("always takes the latest value via reducer", () => {
            const spec = AgentState.spec;

            expect(spec.requiresHeavyReasoning.operator(false, true)).toBe(true);
            expect(spec.requiresHeavyReasoning.operator(true, false)).toBe(false);
        });
    });

    describe("retrievedContext annotation", () => {
        it("has a default value of empty string", () => {
            const spec = AgentState.spec;
            const defaultVal = spec.retrievedContext.initialValueFactory();

            expect(defaultVal).toBe("");
        });

        it("always takes the latest value via reducer", () => {
            const spec = AgentState.spec;

            expect(
                spec.retrievedContext.operator("old", "new context")
            ).toBe("new context");
        });
    });

    describe("webSearchContext annotation", () => {
        it("has a default value of empty string", () => {
            const spec = AgentState.spec;
            const defaultVal = spec.webSearchContext.initialValueFactory();

            expect(defaultVal).toBe("");
        });

        it("always takes the latest value via reducer", () => {
            const spec = AgentState.spec;

            expect(
                spec.webSearchContext.operator("old", "search results")
            ).toBe("search results");
        });
    });

    describe("reasoningResult annotation", () => {
        it("has a default value of empty string", () => {
            const spec = AgentState.spec;
            const defaultVal = spec.reasoningResult.initialValueFactory();

            expect(defaultVal).toBe("");
        });

        it("always takes the latest value via reducer", () => {
            const spec = AgentState.spec;

            expect(
                spec.reasoningResult.operator("old", "x^3/3 + C")
            ).toBe("x^3/3 + C");
        });
    });

    describe("searchCount annotation", () => {
        it("has a default value of 0", () => {
            const spec = AgentState.spec;
            const defaultVal = spec.searchCount.initialValueFactory();

            expect(defaultVal).toBe(0);
        });

        it("always takes the latest value via reducer", () => {
            const spec = AgentState.spec;

            expect(spec.searchCount.operator(0, 1)).toBe(1);
            expect(spec.searchCount.operator(3, 5)).toBe(5);
            expect(spec.searchCount.operator(5, 0)).toBe(0);
        });
    });
});
