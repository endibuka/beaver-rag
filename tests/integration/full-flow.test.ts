import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { RAGClient, OpenAIEmbeddings, PostgresDatabase } from '../../src/index.js';

describe('RAG Full Flow Integration', () => {
  let rag: RAGClient;
  const hasEnvVars = process.env.OPENAI_API_KEY && process.env.DATABASE_URL;

  beforeAll(async () => {
    if (!hasEnvVars) {
      console.warn('Skipping integration tests: Missing OPENAI_API_KEY or DATABASE_URL');
      return;
    }

    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'text-embedding-3-small',
    });

    const database = new PostgresDatabase({
      connectionString: process.env.DATABASE_URL!,
      tableName: 'rag_test_documents',
    });

    rag = new RAGClient({
      embeddings,
      database,
    });

    await rag.initialize();
  });

  afterAll(async () => {
    if (rag) {
      await rag.close();
    }
  });

  test('should add and retrieve a document', async () => {
    if (!hasEnvVars) return;

    const docId = await rag.addDocument(
      'TypeScript is a strongly typed programming language.',
      { category: 'programming', language: 'typescript' }
    );

    expect(docId).toBeTruthy();
    expect(typeof docId).toBe('string');

    // Retrieve the document
    const doc = await rag.getDocument(docId);
    expect(doc).not.toBeNull();
    expect(doc?.metadata.category).toBe('programming');
  });

  test('should perform semantic search', async () => {
    if (!hasEnvVars) return;

    // Add some documents
    await rag.addDocuments([
      {
        content: 'Python is excellent for data science and machine learning.',
        metadata: { language: 'python' },
      },
      {
        content: 'JavaScript runs in the browser and on the server.',
        metadata: { language: 'javascript' },
      },
    ]);

    // Search
    const results = await rag.search('data science programming', {
      limit: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].similarity).toBeGreaterThan(0);
    expect(results[0].document).toBeDefined();
    expect(results[0].document.content).toBeTruthy();
  });

  test('should filter by metadata', async () => {
    if (!hasEnvVars) return;

    // Add documents with specific metadata
    await rag.addDocuments([
      {
        content: 'Rust is a systems programming language.',
        metadata: { language: 'rust', difficulty: 'advanced' },
      },
      {
        content: 'Go is simple and efficient.',
        metadata: { language: 'go', difficulty: 'beginner' },
      },
    ]);

    // Search with metadata filter
    const results = await rag.search('programming language', {
      filters: { difficulty: 'beginner' },
      limit: 10,
    });

    expect(results.length).toBeGreaterThan(0);
    results.forEach((result) => {
      expect(result.document.metadata.difficulty).toBe('beginner');
    });
  });

  test('should update a document', async () => {
    if (!hasEnvVars) return;

    const docId = await rag.addDocument(
      'Original content',
      { version: 1 }
    );

    await rag.updateDocument(
      docId,
      'Updated content',
      { version: 2 }
    );

    const doc = await rag.getDocument(docId);
    expect(doc?.content).toContain('Updated');
    expect(doc?.metadata.version).toBe(2);
  });

  test('should delete a document', async () => {
    if (!hasEnvVars) return;

    const docId = await rag.addDocument(
      'Document to delete',
      { temp: true }
    );

    const deleted = await rag.deleteDocument(docId);
    expect(deleted).toBe(true);

    const doc = await rag.getDocument(docId);
    expect(doc).toBeNull();
  });

  test('should respect minimum similarity threshold', async () => {
    if (!hasEnvVars) return;

    await rag.addDocument(
      'Completely unrelated content about cooking recipes.',
      { category: 'cooking' }
    );

    const results = await rag.search('programming languages', {
      minSimilarity: 0.8, // Very high threshold
      limit: 10,
    });

    // All results should have high similarity
    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.8);
    });
  });

  test('should handle batch operations', async () => {
    if (!hasEnvVars) return;

    const docs = [
      { content: 'Document 1', metadata: { index: 1 } },
      { content: 'Document 2', metadata: { index: 2 } },
      { content: 'Document 3', metadata: { index: 3 } },
    ];

    const ids = await rag.addDocuments(docs);

    expect(ids).toHaveLength(3);
    ids.forEach((id) => {
      expect(typeof id).toBe('string');
    });
  });

  test('should chunk long documents', async () => {
    if (!hasEnvVars) return;

    const longText = 'This is a sentence. '.repeat(100); // Long document

    const docId = await rag.addDocument(longText, { type: 'long' });

    expect(docId).toBeTruthy();

    // Should be able to search and find it
    const results = await rag.search('sentence', {
      filters: { type: 'long' },
      limit: 5,
    });

    expect(results.length).toBeGreaterThan(0);
  });
}, 60000); // 60 second timeout for integration tests
