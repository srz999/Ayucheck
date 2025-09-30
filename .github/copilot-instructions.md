# RAG Chat Application with LangChain & Next.js

## Architecture Overview

This is a tutorial-based RAG (Retrieval Augmented Generation) application demonstrating progressive complexity from basic chat to context-aware AI responses. The app follows a learning progression with 4 example implementations:

- **`api/chat`**: Basic OpenAI integration using Vercel AI SDK
- **`api/ex1`**: LangChain basic prompting with streaming
- **`api/ex2-ex3`**: LangChain with conversation memory and personality prompts
- **`api/ex4`**: Full RAG implementation with JSON document loading

## Key Components & Patterns

### RAG Implementation (`api/ex4/route.ts`)
The main RAG endpoint loads US states data from `src/data/states.json` using LangChain's `JSONLoader`:
```typescript
const loader = new JSONLoader("src/data/states.json", ["/state", "/code", "/nickname", ...]);
```

**Critical Pattern**: Documents are loaded once per request and formatted as context using `formatDocumentsAsString(docs)`. The RAG chain structure:
```
Input → Context Injection → Prompt Template → ChatOpenAI → HttpResponseOutputParser → Stream
```

### Streaming Architecture
All API routes use streaming responses via `StreamingTextResponse` and `createStreamDataTransformer()`. The client-side chat uses Vercel's `useChat` hook with automatic stream handling.

### LangChain Chain Patterns
The codebase demonstrates `RunnableSequence.from()` pattern for building processing chains:
```typescript
const chain = RunnableSequence.from([
  { question: (input) => input.question, context: () => formatDocumentsAsString(docs) },
  prompt, model, parser
]);
```

## Development Workflows

### Environment Setup
- Requires `.env.local` with `OPENAI_API_KEY`
- Standard Next.js commands: `npm install`, `npm run dev`
- Edge runtime enabled for main page (`export const runtime = 'edge'`)

### Testing Different Chat Modes
Change the API endpoint in `src/app/components/chat.tsx`:
```typescript
const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: 'api/ex4', // Change this to test different examples
});
```

## UI Architecture

### Component Structure
- Single-page app with `src/app/page.tsx` rendering `<Chat />` component
- Uses shadcn/ui components (`Button`, `Input`) with Tailwind CSS
- Chat UI implements auto-scrolling with `useRef` and `useEffect`

### Styling Conventions
- Uses CSS custom properties for theming (see `tailwind.config.ts`)
- Responsive design with `max-w-3xl mx-auto` container pattern
- Message styling differentiates user (left-aligned) vs assistant (right-aligned, 3/4 width)

## Data & Context Management

### JSON Document Structure
The `states.json` contains structured US state data. LangChain's `JSONLoader` extracts specific fields via JSONPath selectors, making it context-aware for state-related queries.

### Memory Management
Conversation memory is handled via `formatMessage()` function that concatenates previous messages:
```typescript
const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
```

## Common Patterns to Follow

1. **All API routes must export `dynamic = 'force-dynamic'`** for proper streaming
2. **Error handling pattern**: Return `Response.json({ error: e.message }, { status: e.status ?? 500 })`
3. **LangChain model configuration**: Always set `streaming: true` for chat models
4. **Prompt templates**: Use context injection pattern with named variables like `{context}`, `{chat_history}`, `{question}`

## Integration Points

- **Vercel AI SDK**: Handles streaming and chat state management
- **LangChain**: Document loading, text splitting, and chain orchestration  
- **OpenAI**: GPT-3.5-turbo for language model inference
- **shadcn/ui**: Pre-built accessible components with Tailwind integration