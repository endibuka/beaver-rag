# Architecture Overview

This document describes the architecture and design decisions of the RAG System.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Extensibility](#extensibility)
- [Performance Considerations](#performance-considerations)
- [Security](#security)

---

## System Overview

The RAG System is a lightweight, extensible TypeScript library for building Retrieval-Augmented Generation applications. It provides a clean abstraction layer over embedding generation, vector storage, and document retrieval.

### Key Features

- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Modular**: Plugin architecture for embeddings, databases, and chunking
- **Production-Ready**: Error handling, validation, connection pooling
- **Lightweight**: Minimal dependencies (~40KB bundled)
- **Tested**: 38 tests covering unit and integration scenarios

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      RAGClient                          │
│              (Main Orchestrator)                        │
│                                                         │
│  - Document Lifecycle Management                       │
│  - Query Processing                                     │
│  - Component Coordination                               │
└─────────────┬───────────────┬───────────────┬───────────┘
              │               │               │
              ▼               ▼               ▼
     ┌────────────────┐ ┌─────────────┐ ┌────────────────┐
     │  Embeddings    │ │  Database   │ │   Chunking     │
     │   Provider     │ │  Provider   │ │   Strategy     │
     │                │ │             │ │                │
     │  - Abstract    │ │  - Abstract │ │  - Abstract    │
     │  - Extensible  │ │  - CRUD     │ │  - Configurable│
     └────────┬───────┘ └──────┬──────┘ └────────┬───────┘
              │                │                  │
              ▼                ▼                  ▼
     ┌────────────────┐ ┌─────────────┐ ┌────────────────┐
     │   OpenAI       │ │  PostgreSQL │ │   Recursive    │
     │  Embeddings    │ │  + pgvector │ │   Chunking     │
     │                │ │             │ │                │
     │  - API Client  │ │  - Pool     │ │  - Semantic    │
     │  - Batching    │ │  - HNSW     │ │  - Overlap     │
     │  - Retry       │ │  - JSONB    │ │                │
     └────────────────┘ └─────────────┘ └────────────────┘
                                        ┌────────────────┐
                                        │  Fixed-Size    │
                                        │   Chunking     │
                                        │                │
                                        │  - Simple      │
                                        │  - Fast        │
                                        └────────────────┘
```

---

## Core Components

### 1. RAGClient

**Location:** `src/core/rag-client.ts`

**Responsibilities:**
- Orchestrates all operations
- Manages component lifecycle
- Validates dimensions compatibility
- Handles errors gracefully

**Key Methods:**
- `initialize()` - Sets up database schema and connections
- `addDocument()` - Chunks → Embeds → Stores
- `search()` - Embeds query → Searches → Ranks results
- `updateDocument()` - Re-chunks and re-embeds
- `deleteDocument()` - Removes from storage

**Design Notes:**
- Uses dependency injection for flexibility
- Ensures initialization before operations
- Provides getters for component access

---

### 2. Embeddings Layer

**Location:** `src/embeddings/`

**Architecture:**

```typescript
abstract class EmbeddingsProvider {
  abstract embed(text: string): Promise<EmbeddingResult>
  abstract embedBatch(texts: string[]): Promise<BatchEmbeddingResult>
  embedWithRetry(text: string, maxRetries: number): Promise<EmbeddingResult>
}
```

**OpenAI Implementation:**

```typescript
class OpenAIEmbeddings extends EmbeddingsProvider {
  - Model: text-embedding-3-small (1536 dims, $0.02/1M tokens)
  - Batch size: 100 texts per request
  - Retry logic: Exponential backoff for 429/500/503 errors
  - Token counting: Uses tiktoken for accuracy
}
```

**Key Features:**
- Batch processing for efficiency
- Automatic retry on transient failures
- Token validation before API calls
- Cost estimation utilities

---

### 3. Database Layer

**Location:** `src/database/`

**Architecture:**

```typescript
abstract class DatabaseProvider {
  abstract connect(): Promise<void>
  abstract initialize(): Promise<void>
  abstract upsertDocument(doc): Promise<Document>
  abstract search(embedding, options): Promise<SearchResult[]>
  // ... other CRUD operations
}
```

**PostgreSQL Implementation:**

**Schema:**
```sql
CREATE TABLE rag_documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),           -- pgvector type
  metadata JSONB,                    -- Flexible metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX ON rag_documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for metadata filtering
CREATE INDEX ON rag_documents USING gin (metadata);
```

**Features:**
- Connection pooling (max 20 connections)
- HNSW indexing for < 100ms search
- JSONB metadata for flexible filtering
- Parameterized queries (SQL injection safe)
- Automatic updated_at trigger

**Index Types:**
- **HNSW** (default): Better for < 1M vectors, faster queries
- **IVFFlat** (future): Better for > 1M vectors, faster inserts

---

### 4. Chunking Layer

**Location:** `src/chunking/`

**Architecture:**

```typescript
abstract class ChunkingStrategy {
  abstract chunk(text: string): Chunk[]
  chunkBatch(texts: string[]): Chunk[][]
}
```

**Strategies:**

#### RecursiveChunking (Default)

Preserves semantic meaning by using hierarchical separators:

```
Priority:  '\n\n' > '\n' > '. ' > '? ' > '! ' > '; ' > ', ' > ' ' > ''
Behavior:  Paragraph → Sentence → Word → Character
```

**Advantages:**
- Respects document structure
- Better context preservation
- Configurable separators
- Industry standard (LangChain, LlamaIndex)

**Use Cases:**
- Articles, documentation
- Structured text
- Natural language

#### FixedSizeChunking

Simple character-based splitting with overlap:

```
Text:  [----chunk 1----][----chunk 2----][----chunk 3----]
              └─overlap─┘        └─overlap─┘
```

**Advantages:**
- Predictable chunk sizes
- Fast processing
- Simple implementation

**Use Cases:**
- Code snippets
- Uniform data
- When semantic boundaries don't matter

---

## Data Flow

### Document Ingestion Flow

```
User Input
    │
    ├─> Validate (content not empty, metadata valid)
    │
    ├─> Chunk (using strategy)
    │   ├─> Split by separators
    │   ├─> Respect overlap
    │   └─> Add chunk metadata
    │
    ├─> Embed (batch process)
    │   ├─> Count tokens (validate < 8191)
    │   ├─> Batch in groups of 100
    │   ├─> Call OpenAI API
    │   └─> Handle retries
    │
    └─> Store (database)
        ├─> Validate dimensions
        ├─> Format for pgvector
        ├─> Upsert with metadata
        └─> Return document ID
```

### Search Flow

```
User Query
    │
    ├─> Validate (query not empty)
    │
    ├─> Embed (single)
    │   ├─> Count tokens
    │   ├─> Call OpenAI API
    │   └─> Get query vector
    │
    └─> Search (database)
        ├─> Build SQL query
        │   ├─> Vector similarity (<=>)
        │   ├─> Metadata filters (@>)
        │   └─> Similarity threshold
        │
        ├─> Execute with indexes
        │   └─> HNSW for vector search
        │
        └─> Return ranked results
            ├─> Calculate similarity (1 - distance)
            ├─> Order by similarity DESC
            └─> Limit to top K
```

---

## Design Patterns

### 1. Strategy Pattern

Used for chunking and embeddings to allow runtime behavior selection:

```typescript
class RAGClient {
  constructor(config: {
    embeddings: EmbeddingsProvider,    // Strategy
    database: DatabaseProvider,        // Strategy
    chunking?: ChunkingStrategy        // Strategy (optional)
  })
}
```

**Benefits:**
- Swap implementations without code changes
- Easy testing with mocks
- Clear separation of concerns

---

### 2. Dependency Injection

All providers are injected, not instantiated internally:

```typescript
// Good: Testable, flexible
const rag = new RAGClient({
  embeddings: mockEmbeddings,
  database: mockDatabase
});

// Bad: Hard-coded, not testable
const rag = new RAGClient();  // Creates OpenAI internally
```

**Benefits:**
- Testability (inject mocks)
- Flexibility (swap providers)
- No hidden dependencies

---

### 3. Template Method Pattern

Base classes define the algorithm, subclasses implement steps:

```typescript
abstract class EmbeddingsProvider {
  // Template method with retry logic
  async embedWithRetry(text, maxRetries) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.embed(text);  // Subclass implements
      } catch (error) {
        if (isRetryable(error) && i < maxRetries - 1) {
          await exponentialBackoff(i);
          continue;
        }
        throw error;
      }
    }
  }

  // Abstract method for subclass
  abstract embed(text: string): Promise<EmbeddingResult>
}
```

---

### 4. Repository Pattern

Database layer provides a clean abstraction over data access:

```typescript
interface DatabaseProvider {
  upsertDocument(doc: Document): Promise<Document>
  search(embedding: number[], options): Promise<SearchResult[]>
  // ... CRUD operations
}
```

**Benefits:**
- Database-agnostic
- Easy to test
- Clear data access layer

---

## Extensibility

### Adding a New Embedding Provider

Example: Adding Cohere embeddings

**Step 1:** Create implementation

```typescript
// src/embeddings/cohere.ts
import { EmbeddingsProvider } from './base.js';

export class CohereEmbeddings extends EmbeddingsProvider {
  dimensions = 1024;
  maxTokens = 2048;
  modelName = 'embed-english-v3.0';

  async embed(text: string): Promise<EmbeddingResult> {
    // Call Cohere API
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    // Batch processing
  }
}
```

**Step 2:** Export from module

```typescript
// src/embeddings/index.ts
export * from './cohere.js';
```

**Step 3:** Use it

```typescript
const rag = new RAGClient({
  embeddings: new CohereEmbeddings({ apiKey: '...' }),
  database: new PostgresDatabase({ ... })
});
```

**No changes needed to:**
- RAGClient
- Database layer
- Chunking layer
- Existing code

---

### Adding a New Database Provider

Example: Adding Pinecone

**Step 1:** Implement DatabaseProvider

```typescript
// src/database/pinecone/index.ts
export class PineconeDatabase extends DatabaseProvider {
  async connect() { /* ... */ }
  async initialize() { /* ... */ }
  async search(embedding, options) { /* ... */ }
  // ... implement all abstract methods
}
```

**Step 2:** Use it

```typescript
const rag = new RAGClient({
  embeddings: new OpenAIEmbeddings({ ... }),
  database: new PineconeDatabase({
    apiKey: '...',
    environment: '...',
    index: '...'
  })
});
```

---

### Adding a New Chunking Strategy

Example: Semantic chunking

```typescript
// src/chunking/semantic.ts
export class SemanticChunking extends ChunkingStrategy {
  chunk(text: string): Chunk[] {
    // Use sentence embeddings to detect semantic boundaries
    // Group sentences with high similarity
    // Split when similarity drops below threshold
  }
}
```

**Use it:**

```typescript
const rag = new RAGClient({
  embeddings: new OpenAIEmbeddings({ ... }),
  database: new PostgresDatabase({ ... }),
  chunking: new SemanticChunking({ threshold: 0.7 })
});
```

---

## Performance Considerations

### 1. Batch Processing

**Problem:** Embedding 1000 chunks one-by-one is slow

**Solution:** Batch in groups of 100

```typescript
async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
  const BATCH_SIZE = 100;
  const batches = chunk(texts, BATCH_SIZE);

  const results = await Promise.all(
    batches.map(batch => this.client.embeddings.create({ input: batch }))
  );

  return combineResults(results);
}
```

**Impact:** 10x faster for large document sets

---

### 2. Connection Pooling

**Problem:** Creating new DB connections for each query is slow

**Solution:** Use pg connection pool

```typescript
this.pool = new Pool({
  max: 20,                      // Maximum connections
  idleTimeoutMillis: 30000,     // Release idle after 30s
  connectionTimeoutMillis: 2000 // Timeout for new connections
});
```

**Impact:** Sub-millisecond connection acquisition

---

### 3. Vector Indexing

**Problem:** Linear scan for similarity search is O(n)

**Solution:** HNSW index

```sql
CREATE INDEX ON rag_documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Impact:** < 100ms search for 100K vectors (vs seconds without index)

**Parameters:**
- `m`: Number of connections (higher = better accuracy, more memory)
- `ef_construction`: Build-time effort (higher = better index quality)

---

### 4. Prepared Statements

**Problem:** Parsing SQL on every query is wasteful

**Solution:** Use parameterized queries

```typescript
// PostgreSQL automatically prepares frequently-used queries
await pool.query(
  'SELECT * FROM docs WHERE embedding <=> $1 ORDER BY embedding <=> $1 LIMIT $2',
  [embedding, limit]
);
```

---

### 5. Parallel Processing

**Problem:** Processing documents sequentially is slow

**Current:** Sequential (safe but slower)
```typescript
for (const doc of docs) {
  await this.addDocument(doc);
}
```

**Future:** Parallel (faster but needs careful error handling)
```typescript
await Promise.all(
  docs.map(doc => this.addDocument(doc))
);
```

---

## Security

### 1. SQL Injection Prevention

**Always use parameterized queries:**

```typescript
// ✅ SAFE
await pool.query('SELECT * FROM docs WHERE id = $1', [id]);

// ❌ UNSAFE
await pool.query(`SELECT * FROM docs WHERE id = '${id}'`);
```

---

### 2. Environment Variables

**Never commit secrets:**

```typescript
// ✅ GOOD
apiKey: process.env.OPENAI_API_KEY

// ❌ BAD
apiKey: 'sk-proj-...'
```

**Use `.env` files:**
```bash
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

---

### 3. Input Validation

**Use Zod for runtime validation:**

```typescript
const DocumentSchema = z.object({
  content: z.string().min(1).max(100000),
  metadata: z.record(z.any()).optional()
});

const validated = DocumentSchema.parse(input);
```

---

### 4. API Key Rotation

**Best Practices:**
- Rotate OpenAI keys periodically
- Use separate keys for dev/staging/production
- Monitor usage for anomalies
- Set spending limits in OpenAI dashboard

---

## Testing Strategy

### Unit Tests (30 tests)

**Coverage:**
- Chunking strategies edge cases
- Token counting accuracy
- Error handling

**Approach:**
- Mock external dependencies
- Test pure logic
- Fast execution (< 1s)

---

### Integration Tests (8 tests)

**Coverage:**
- End-to-end document flow
- Real PostgreSQL + pgvector
- Real OpenAI embeddings
- Metadata filtering
- Batch operations

**Approach:**
- Docker PostgreSQL
- Real API calls (when env vars set)
- Slower execution (10-15s)

---

## Future Enhancements

### Short Term

1. **IVFFlat Index Support**
   - Better for > 1M vectors
   - Faster inserts

2. **Batch Delete**
   - Delete multiple documents efficiently

3. **Soft Delete**
   - Mark as deleted instead of removing
   - Allows recovery

### Medium Term

1. **Additional Providers**
   - Cohere, HuggingFace embeddings
   - Pinecone, Weaviate, Qdrant databases

2. **Hybrid Search**
   - BM25 + vector search
   - PostgreSQL full-text search

3. **Reranking**
   - Cross-encoder reranking
   - Diversity-based reranking

### Long Term

1. **Multi-modal Support**
   - Image embeddings (CLIP)
   - PDF parsing
   - Audio transcription

2. **Semantic Chunking**
   - Embedding-based boundaries
   - Better context preservation

3. **Caching Layer**
   - Redis for frequent queries
   - Embedding cache

4. **Observability**
   - OpenTelemetry integration
   - Query analytics
   - Cost tracking

---

## Conclusion

The RAG System architecture prioritizes:

1. **Simplicity** - Easy to understand and use
2. **Extensibility** - Plugin any provider
3. **Performance** - Optimized for production
4. **Type Safety** - Catch errors at compile time
5. **Testability** - Comprehensive test coverage

The modular design ensures that adding new capabilities (providers, strategies) requires minimal changes to existing code, following the Open/Closed Principle.
