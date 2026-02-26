import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state";
import { routerNode, textbookRetrievalNode, webSearchNode, heavyReasoningNode, synthesisNode } from "./nodes";

// Determine which node to run next based on the router's output state
function decideNextNode(state: typeof AgentState.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // We injected a SystemMessage in routerNode to pass the decision
    const content = typeof lastMessage.content === "string" ? lastMessage.content : "";

    if (content.includes("Heavy reasoning required")) {
        return "heavy_reasoning";
    } else if (content.includes("Web search required")) {
        return "web_search";
    } else {
        return "textbook_retrieval";
    }
}

export function createGraph() {
    const workflow = new StateGraph(AgentState)
        .addNode("router", routerNode)
        .addNode("textbook_retrieval", textbookRetrievalNode)
        .addNode("web_search", webSearchNode)
        .addNode("heavy_reasoning", heavyReasoningNode)
        .addNode("synthesis", synthesisNode);

    // Define the edges (The Flow)

    // 1. Start -> Router
    workflow.addEdge(START, "router");

    // 2. Router -> Conditional Logic -> Specific Nodes
    workflow.addConditionalEdges("router", decideNextNode, {
        heavy_reasoning: "heavy_reasoning",
        web_search: "web_search",
        textbook_retrieval: "textbook_retrieval",
    });

    // 3. All Specific Nodes -> Synthesis
    workflow.addEdge("textbook_retrieval", "synthesis");
    workflow.addEdge("web_search", "synthesis");
    workflow.addEdge("heavy_reasoning", "synthesis");

    // 4. Synthesis -> End
    workflow.addEdge("synthesis", END);

    // Compile it into a runnable graph
    return workflow.compile();
}
