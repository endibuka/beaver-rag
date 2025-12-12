# beaver-rag 🦫

> Lightweight TypeScript RAG (Retrieval-Augmented Generation) system with PostgreSQL and OpenAI

A production-ready, extensible RAG system built with TypeScript, designed for developers who want to add semantic search and retrieval capabilities to their applications. Built by beavers, for builders.

## Features

- **Lightweight & Fast**: Minimal dependencies, optimized for performance
- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Extensible**: Plugin architecture for embeddings, databases, and chunking strategies
- **Production-ready**: Built with best practices, error handling, and validation
- **Multiple Chunking Strategies**: Fixed-size and recursive text splitting
- **Powerful Search**: Vector similarity search with metadata filtering
- **Developer-friendly**: Clean API, detailed error messages, and comprehensive documentation

## Installation

```bash
# Using Bun
bun add beaver-rag

# Using npm
npm install beaver-rag

# Using pnpm
pnpm add beaver-rag
```

## Requirements

- Node.js >= 18 or Bun >= 1.0
- PostgreSQL >= 14 with [pgvector](https://github.com/pgvector/pgvector) extension
- OpenAI API key

## Quick Start

### 1. Set up your environment

Create a `.env` file:

```env
OPENAI_API_KEY=sk-your-openai-api-key
DATABASE_URL=postgresql://user:password@localhost:5432/your_database
```

### 2. Install pgvector extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Use the RAG system

```typescript
import { RAGClient, OpenAIEmbeddings, PostgresDatabase } from 'beaver-rag';

// Initialize providers
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small',
});

const database = new PostgresDatabase({
  connectionString: process.env.DATABASE_URL!,
});

// Create RAG client
const rag = new RAGClient({
  embeddings,
  database,
});

// Initialize (creates tables, indexes, etc.)
await rag.initialize();

// Add documents
await rag.addDocument(
  'TypeScript is a strongly typed programming language that builds on JavaScript.',
  { category: 'programming', language: 'typescript' }
);

// Search
const results = await rag.search('What is TypeScript?', {
  limit: 5,
  minSimilarity: 0.7,
});

console.log(results[0].document.content);
console.log(`Similarity: ${results[0].similarity}`);

// Clean up
await rag.close();
```

## API Documentation

### RAGClient

The main entry point for the RAG system.

#### Constructor

```typescript
new RAGClient(config: RAGConfig)
```

**Options:**
- `embeddings`: An embeddings provider (e.g., `OpenAIEmbeddings`)
- `database`: A database provider (e.g., `PostgresDatabase`)
- `chunking`: (Optional) A chunking strategy (defaults to `RecursiveChunking`)

#### Methods

##### `initialize(): Promise<void>`

Initializes the RAG system, connects to the database, and sets up schema/indexes.

##### `addDocument(content: string, metadata?: Record<string, any>): Promise<string>`

Adds a single document to the system. Returns the document ID.

##### `addDocuments(docs: DocumentInput[]): Promise<string[]>`

Adds multiple documents in batch. Returns array of document IDs.

##### `search(query: string, options?: SearchOptions): Promise<SearchResult[]>`

Searches for relevant documents.

**Options:**
- `limit`: Maximum results to return (default: 10)
- `minSimilarity`: Minimum similarity score 0-1 (optional)
- `filters`: Metadata filters as key-value pairs (optional)

##### `updateDocument(id: string, content: string, metadata?: Record<string, any>): Promise<void>`

Updates an existing document.

##### `deleteDocument(id: string): Promise<boolean>`

Deletes a document by ID.

##### `close(): Promise<void>`

Closes the connection to the database.

### OpenAIEmbeddings

Provider for OpenAI embeddings.

```typescript
new OpenAIEmbeddings({
  apiKey: string,
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002',
  dimensions?: number, // For text-embedding-3-* models
})
```

### PostgresDatabase

Provider for PostgreSQL with pgvector.

```typescript
new PostgresDatabase({
  connectionString: string,
  tableName?: string, // Default: 'rag_documents'
  dimensions?: number, // Default: 1536
  indexType?: 'hnsw' | 'ivfflat', // Default: 'hnsw'
})
```

### Chunking Strategies

#### RecursiveChunking (Default)

Splits text while preserving semantic meaning using a hierarchy of separators.

```typescript
import { RecursiveChunking } from 'beaver-rag';

const chunking = new RecursiveChunking({
  chunkSize: 400,
  chunkOverlap: 80,
  separators: ['\n\n', '\n', '. ', ' '], // Optional
});
```

#### FixedSizeChunking

Splits text into fixed-size chunks with overlap.

```typescript
import { FixedSizeChunking } from 'beaver-rag';

const chunking = new FixedSizeChunking({
  chunkSize: 500,
  chunkOverlap: 100,
});
```

## Examples

### Custom Chunking Strategy

```typescript
const rag = new RAGClient({
  embeddings: new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY! }),
  database: new PostgresDatabase({ connectionString: process.env.DATABASE_URL! }),
  chunking: new FixedSizeChunking({ chunkSize: 500, chunkOverlap: 100 }),
});
```

### Metadata Filtering

```typescript
// Add documents with metadata
await rag.addDocument('Content about Python', { language: 'python', difficulty: 'beginner' });
await rag.addDocument('Content about TypeScript', { language: 'typescript', difficulty: 'intermediate' });

// Search with filters
const results = await rag.search('programming concepts', {
  filters: { language: 'typescript' },
  limit: 10,
});
```

### Batch Operations

```typescript
const documents = [
  { content: 'Document 1', metadata: { category: 'docs' } },
  { content: 'Document 2', metadata: { category: 'tutorial' } },
  { content: 'Document 3', metadata: { category: 'docs' } },
];

const ids = await rag.addDocuments(documents);
console.log(`Added ${ids.length} documents`);
```

## Architecture

The system uses a plugin architecture with three main components:

1. **Embeddings Provider**: Converts text to vectors (currently: OpenAI)
2. **Database Provider**: Stores and searches vectors (currently: PostgreSQL + pgvector)
3. **Chunking Strategy**: Splits documents into manageable pieces

This design makes it easy to add support for other providers in the future.

## Error Handling

The system provides specific error types for different failure scenarios:

```typescript
import {
  RAGError,
  EmbeddingError,
  DatabaseError,
  ValidationError
} from 'beaver-rag';

try {
  await rag.addDocument(content, metadata);
} catch (error) {
  if (error instanceof EmbeddingError) {
    console.error('Embedding failed:', error.message);
  } else if (error instanceof DatabaseError) {
    console.error('Database operation failed:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Invalid input:', error.field, error.message);
  }
}
```

## Development

### Build

```bash
bun run build
```

### Type Check

```bash
bun run typecheck
```

### Lint

```bash
bun run lint
```

### Format

```bash
bun run format
```

## Roadmap

### Future Features

- Additional embedding providers (Cohere, HuggingFace, local models)
- Additional vector databases (Pinecone, Weaviate, Qdrant, ChromaDB)
- Hybrid search (BM25 + vector)
- Reranking support
- Multi-modal support (images, PDFs)
- Semantic chunking
- Caching layer (Redis)
- Analytics and monitoring

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on GitHub.
