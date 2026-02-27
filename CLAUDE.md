# CLAUDE.md — Gyanu AI (NCERT Teacher)

## Project Overview

Interactive NCERT tutoring app powered by an AI elephant tutor called **Gyanu**. Students chat with Gyanu to learn curriculum topics, solve problems, and explore knowledge.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19 and React Compiler enabled
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (using `@theme` in globals.css, no tailwind.config file)
- **AI/Agent**: LangGraph (`@langchain/langgraph`) with OpenAI-compatible models via Ollama Cloud
- **Auth**: Supabase (`@supabase/ssr`)
- **Icons**: lucide-react
- **Animations**: framer-motion

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm start` — Start production server

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts        # POST /api/chat — main chat endpoint
│   ├── auth/callback/route.ts   # OAuth callback handler
│   ├── dashboard/page.tsx       # Learning map dashboard
│   ├── learn/[id]/page.tsx      # Split-pane: textbook + chat UI
│   ├── login/                   # Login page + server actions
│   ├── layout.tsx               # Root layout (fonts, navbar)
│   ├── page.tsx                 # Landing page
│   └── globals.css              # Design tokens & theme
├── components/ui/               # Reusable UI components
├── lib/agent/                   # LangGraph agent pipeline
│   ├── graph.ts                 # Workflow: router → [textbook|web|reasoning] → synthesis
│   ├── nodes.ts                 # Node implementations
│   ├── llm.ts                   # LLM model configs (Qwen, DeepSeek, GPT-OSS)
│   └── state.ts                 # Agent state annotations
└── utils/supabase/              # Supabase client (browser) & server helpers
```

## Architecture — AI Agent

LangGraph state graph with conditional routing:

```
START → router → textbook_retrieval → synthesis → END
                 web_search         →
                 heavy_reasoning    →
```

- **Router** (Qwen 3.5): Classifies intent via structured output (Zod schema)
- **Textbook Retrieval**: Placeholder for pgvector RAG (not yet implemented)
- **Web Search**: SearXNG integration
- **Heavy Reasoning**: DeepSeek v3.1 671B for complex math/logic
- **Synthesis** (Qwen 3.5): Generates friendly Gyanu-persona responses

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon key
OLLAMA_CLOUD_API_KEY           # Ollama Cloud API key
OLLAMA_CLOUD_ENDPOINT          # Ollama Cloud base URL
SEARXNG_URL                    # (optional) SearXNG instance URL
```

## Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Styling**: Utility-first Tailwind; forest/nature theme with green primary, sky-blue secondary, sun-yellow accent
- **Fonts**: Inter (body), Outfit (headings) — loaded via `next/font/google`
- **Components**: Place in `src/components/ui/`
- **No separate Tailwind config**: All theme tokens defined in `src/app/globals.css` via `@theme`
- **Server vs Client**: Use `"use client"` directive only when needed (interactivity, hooks)
