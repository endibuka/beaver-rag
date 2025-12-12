# API Reference

Complete API documentation for the RAG System.

## Table of Contents

- [RAGClient](#ragclient)
- [Embeddings Providers](#embeddings-providers)
- [Database Providers](#database-providers)
- [Chunking Strategies](#chunking-strategies)
- [Types](#types)
- [Errors](#errors)

---

## RAGClient

The main entry point for the RAG system. Orchestrates document ingestion, embedding generation, and retrieval.

### Constructor

```typescript
new RAGClient(config: RAGConfig)
```

**Parameters:**

- `config.embeddings` (EmbeddingsProvider): The embeddings provider to use
- `config.database` (DatabaseProvider): The database provider to use
- `config.chunking?` (ChunkingStrategy): Optional chunking strategy (defaults to RecursiveChunking)

**Example:**

```typescript
import { RAGClient, OpenAIEmbeddings, PostgresDatabase } from 'beaver-rag';

const rag = new RAGClient({
  embeddings: new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
  database: new PostgresDatabase({
    connectionString: process.env.DATABASE_URL!,
  }),
});
```

### Methods

#### `initialize(): Promise<void>`

Initializes the RAG system by connecting to the database and setting up schema/indexes.

**Example:**

```typescript
await rag.initialize();
```

**Throws:**
- `RAGError` - If initialization fails
- `DatabaseError` - If database connection or setup fails

---

#### `addDocument(content: string, metadata?: Record<string, any>): Promise<string>`

Adds a single document to the RAG system. Automatically chunks the document, generates embeddings, and stores in the database.

**Parameters:**

- `content` (string): The text content of the document
- `metadata?` (object): Optional metadata to attach to the document

**Returns:** Promise<string> - The ID of the added document

**Example:**

```typescript
const docId = await rag.addDocument(
  'TypeScript is a strongly typed programming language.',
  { category: 'programming', language: 'typescript' }
);
```

**Throws:**
- `ValidationError` - If content is empty or invalid
- `EmbeddingError` - If embedding generation fails
- `DatabaseError` - If database operation fails

---

#### `addDocuments(docs: DocumentInput[]): Promise<string[]>`

Adds multiple documents in batch.

**Parameters:**

- `docs` (DocumentInput[]): Array of documents to add

**Returns:** Promise<string[]> - Array of document IDs

**Example:**

```typescript
const ids = await rag.addDocuments([
  { content: 'Document 1', metadata: { type: 'article' } },
  { content: 'Document 2', metadata: { type: 'blog' } },
]);
```

---

#### `search(query: string, options?: SearchOptions): Promise<SearchResult[]>`

Searches for relevant documents using semantic similarity.

**Parameters:**

- `query` (string): The search query text
- `options?` (SearchOptions): Optional search options
  - `limit?` (number): Maximum number of results (default: 10)
  - `minSimilarity?` (number): Minimum similarity score 0-1
  - `filters?` (object): Metadata filters for exact matching

**Returns:** Promise<SearchResult[]> - Array of search results ranked by similarity

**Example:**

```typescript
const results = await rag.search('programming languages', {
  limit: 5,
  minSimilarity: 0.7,
  filters: { category: 'programming' },
});

results.forEach((result) => {
  console.log(`Similarity: ${result.similarity}`);
  console.log(`Content: ${result.document.content}`);
});
```

**Throws:**
- `ValidationError` - If query is empty
- `EmbeddingError` - If query embedding fails
- `DatabaseError` - If search fails

---

#### `updateDocument(id: string, content: string, metadata?: Record<string, any>): Promise<void>`

Updates an existing document. Re-chunks, re-embeds, and updates in the database.

**Parameters:**

- `id` (string): The document ID to update
- `content` (string): The new content
- `metadata?` (object): Optional new metadata

**Example:**

```typescript
await rag.updateDocument(
  docId,
  'Updated content here',
  { category: 'updated', version: 2 }
);
```

---

#### `deleteDocument(id: string): Promise<boolean>`

Deletes a document by ID.

**Parameters:**

- `id` (string): The document ID to delete

**Returns:** Promise<boolean> - True if deleted, false if not found

**Example:**

```typescript
const deleted = await rag.deleteDocument(docId);
console.log(`Document deleted: ${deleted}`);
```

---

#### `getDocument(id: string): Promise<Document | null>`

Retrieves a document by ID.

**Parameters:**

- `id` (string): The document ID

**Returns:** Promise<Document | null> - The document if found, null otherwise

**Example:**

```typescript
const doc = await rag.getDocument(docId);
if (doc) {
  console.log(doc.content);
  console.log(doc.metadata);
}
```

---

#### `close(): Promise<void>`

Closes the RAG client and disconnects from the database.

**Example:**

```typescript
await rag.close();
```

---

#### `isInitialized(): boolean`

Checks if the client is initialized.

**Returns:** boolean

---

#### `getEmbeddingsProvider(): EmbeddingsProvider`

Gets the embeddings provider instance.

---

#### `getDatabaseProvider(): DatabaseProvider`

Gets the database provider instance.

---

#### `getChunkingStrategy(): ChunkingStrategy`

Gets the chunking strategy instance.

---

## Embeddings Providers

### OpenAIEmbeddings

Provider for OpenAI embeddings API.

#### Constructor

```typescript
new OpenAIEmbeddings(options: OpenAIEmbeddingsOptions)
```

**Parameters:**

- `options.apiKey` (string): OpenAI API key (required)
- `options.model?` (string): Model name (default: 'text-embedding-3-small')
  - `'text-embedding-3-small'` - 1536 dimensions, $0.02/1M tokens
  - `'text-embedding-3-large'` - 3072 dimensions, $0.13/1M tokens
  - `'text-embedding-ada-002'` - 1536 dimensions, $0.10/1M tokens
- `options.dimensions?` (number): Custom dimensions (only for text-embedding-3-* models)
- `options.organization?` (string): OpenAI organization ID
- `options.baseURL?` (string): Custom API base URL

**Example:**

```typescript
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small',
  dimensions: 1536,
});
```

#### Properties

- `dimensions` (number): Number of dimensions in the embedding vectors
- `maxTokens` (number): Maximum tokens per embedding (8191)
- `modelName` (string): The model name being used

#### Methods

##### `embed(text: string): Promise<EmbeddingResult>`

Generates an embedding for a single text.

**Returns:** Promise<{ embedding: number[], tokens: number }>

##### `embedBatch(texts: string[]): Promise<BatchEmbeddingResult>`

Generates embeddings for multiple texts in batch (groups of 100).

**Returns:** Promise<{ embeddings: number[][], totalTokens: number }>

##### `embedWithRetry(text: string, maxRetries?: number): Promise<EmbeddingResult>`

Embeds text with automatic retry and exponential backoff.

##### `estimateCost(tokenCount: number): number`

Estimates the cost in USD for a given token count.

##### `countTokens(text: string): number`

Counts tokens in text without making API call.

---

## Database Providers

### PostgresDatabase

PostgreSQL database provider with pgvector support.

#### Constructor

```typescript
new PostgresDatabase(options: PostgresDatabaseOptions)
```

**Parameters:**

- `options.connectionString` (string): PostgreSQL connection string (required)
- `options.tableName?` (string): Table name (default: 'rag_documents')
- `options.dimensions?` (number): Embedding dimensions (default: 1536)
- `options.indexType?` (string): Index type - 'hnsw' or 'ivfflat' (default: 'hnsw')
- `options.maxConnections?` (number): Max connection pool size (default: 20)
- `options.idleTimeoutMillis?` (number): Idle timeout (default: 30000)
- `options.connectionTimeoutMillis?` (number): Connection timeout (default: 2000)

**Example:**

```typescript
const database = new PostgresDatabase({
  connectionString: 'postgresql://user:pass@localhost:5432/db',
  tableName: 'my_documents',
  indexType: 'hnsw',
});
```

#### Methods

All methods from `DatabaseProvider` base class are implemented:

- `connect(): Promise<void>`
- `disconnect(): Promise<void>`
- `initialize(): Promise<void>`
- `upsertDocument(doc): Promise<Document>`
- `upsertDocuments(docs): Promise<Document[]>`
- `getDocument(id): Promise<Document | null>`
- `deleteDocument(id): Promise<boolean>`
- `deleteDocuments(ids): Promise<number>`
- `search(queryEmbedding, options?): Promise<SearchResult[]>`
- `createIndex(options?): Promise<void>`
- `getVectorDimensions(): Promise<number | null>`

---

## Chunking Strategies

### RecursiveChunking

Splits text while preserving semantic meaning using a hierarchy of separators.

#### Constructor

```typescript
new RecursiveChunking(options: RecursiveChunkOptions)
```

**Parameters:**

- `options.chunkSize` (number): Size of each chunk in characters
- `options.chunkOverlap` (number): Overlap between chunks in characters
- `options.separators?` (string[]): Custom separators (default: ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', ''])

**Example:**

```typescript
const chunking = new RecursiveChunking({
  chunkSize: 400,
  chunkOverlap: 80,
  separators: ['\n\n', '\n', '. ', ' '],
});
```

#### Methods

- `chunk(text: string): Chunk[]` - Splits text into chunks
- `chunkBatch(texts: string[]): Chunk[][]` - Splits multiple texts

---

### FixedSizeChunking

Splits text into fixed-size chunks with overlap.

#### Constructor

```typescript
new FixedSizeChunking(options: ChunkOptions)
```

**Parameters:**

- `options.chunkSize` (number): Size of each chunk in characters
- `options.chunkOverlap` (number): Overlap between chunks in characters

**Example:**

```typescript
const chunking = new FixedSizeChunking({
  chunkSize: 500,
  chunkOverlap: 100,
});
```

---

## Types

### Document

```typescript
interface Document<T = Record<string, any>> {
  id: string;
  content: string;
  embedding: number[];
  metadata: T;
  createdAt: Date;
  updatedAt: Date;
}
```

### SearchResult

```typescript
interface SearchResult<T = Record<string, any>> {
  document: Document<T>;
  similarity: number;  // 0-1, higher is more similar
  distance: number;    // Vector distance
}
```

### SearchOptions

```typescript
interface SearchOptions {
  limit?: number;           // Default: 10
  minSimilarity?: number;   // 0-1
  filters?: Record<string, any>;
}
```

### DocumentInput

```typescript
interface DocumentInput {
  content: string;
  metadata?: Record<string, any>;
}
```

### Chunk

```typescript
interface Chunk {
  content: string;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    startChar?: number;
    endChar?: number;
  };
}
```

---

## Errors

### RAGError

Base error class for all RAG system errors.

```typescript
class RAGError extends Error
```

### EmbeddingError

Error thrown when embedding generation fails.

```typescript
class EmbeddingError extends RAGError {
  tokensUsed?: number;
  provider?: string;
}
```

### DatabaseError

Error thrown when database operations fail.

```typescript
class DatabaseError extends RAGError {
  query?: string;
  code?: string;
}
```

### ValidationError

Error thrown when input validation fails.

```typescript
class ValidationError extends RAGError {
  field?: string;
  value?: any;
}
```

### ChunkingError

Error thrown when chunking fails.

```typescript
class ChunkingError extends RAGError
```

---

## Utility Functions

### Token Counter

```typescript
import { countTokens, validateTokenLimit } from 'beaver-rag';

// Count tokens
const tokens = countTokens('Hello, world!', 'text-embedding-3-small');

// Validate token limit
validateTokenLimit(text, 8191); // Throws ValidationError if exceeded
```

### Validation

```typescript
import { validateDocumentInput, validateSearchOptions } from 'beaver-rag';

const validDoc = validateDocumentInput({ content: 'text', metadata: {} });
const validOptions = validateSearchOptions({ limit: 10, minSimilarity: 0.7 });
```

---

## Complete Example

```typescript
import {
  RAGClient,
  OpenAIEmbeddings,
  PostgresDatabase,
  RecursiveChunking,
  RAGError,
  EmbeddingError,
  DatabaseError,
} from 'beaver-rag';

async function main() {
  // Initialize
  const rag = new RAGClient({
    embeddings: new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    database: new PostgresDatabase({
      connectionString: process.env.DATABASE_URL!,
    }),
    chunking: new RecursiveChunking({
      chunkSize: 400,
      chunkOverlap: 80,
    }),
  });

  try {
    await rag.initialize();

    // Add documents
    const docId = await rag.addDocument(
      'Your document content here',
      { category: 'example' }
    );

    // Search
    const results = await rag.search('query here', {
      limit: 5,
      minSimilarity: 0.7,
      filters: { category: 'example' },
    });

    console.log(results);
  } catch (error) {
    if (error instanceof EmbeddingError) {
      console.error('Embedding failed:', error.message);
    } else if (error instanceof DatabaseError) {
      console.error('Database error:', error.message);
    }
  } finally {
    await rag.close();
  }
}

main();
```
