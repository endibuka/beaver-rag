/**
 * Basic RAG System Usage Example
 *
 * This example demonstrates:
 * - Initializing the RAG client
 * - Adding documents
 * - Performing semantic search
 * - Cleaning up resources
 */

import { RAGClient, OpenAIEmbeddings, PostgresDatabase } from '../src/index.js';

async function main() {
  // 1. Setup providers
  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-3-small',
  });

  const database = new PostgresDatabase({
    connectionString: process.env.DATABASE_URL!,
    tableName: 'rag_documents', // Optional, this is the default
  });

  // 2. Create RAG client
  const rag = new RAGClient({
    embeddings,
    database,
  });

  try {
    console.log('Initializing RAG system...');
    await rag.initialize();
    console.log('✓ RAG system initialized\n');

    // 3. Add documents
    console.log('Adding documents...');
    const docIds = await rag.addDocuments([
      {
        content:
          'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.',
        metadata: { category: 'programming', language: 'typescript', difficulty: 'beginner' },
      },
      {
        content:
          'React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called components.',
        metadata: { category: 'framework', language: 'javascript', difficulty: 'intermediate' },
      },
      {
        content:
          'PostgreSQL is a powerful, open source object-relational database system that uses and extends the SQL language.',
        metadata: { category: 'database', language: 'sql', difficulty: 'intermediate' },
      },
      {
        content:
          'Node.js is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser.',
        metadata: { category: 'runtime', language: 'javascript', difficulty: 'intermediate' },
      },
      {
        content:
          'Bun is a fast all-in-one JavaScript runtime designed as a drop-in replacement for Node.js. It includes a bundler, test runner, and package manager.',
        metadata: { category: 'runtime', language: 'javascript', difficulty: 'beginner' },
      },
    ]);

    console.log(`✓ Added ${docIds.length} documents\n`);

    // 4. Perform searches
    console.log('=== Search Examples ===\n');

    // Example 1: Basic semantic search
    console.log('1. Searching for "What is TypeScript?"');
    const results1 = await rag.search('What is TypeScript?', {
      limit: 3,
    });

    results1.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Similarity: ${result.similarity.toFixed(3)}`);
      console.log(`     Content: ${result.document.content.slice(0, 80)}...`);
      console.log(`     Metadata:`, result.document.metadata);
    });
    console.log('');

    // Example 2: Search with similarity threshold
    console.log('2. Searching for "JavaScript runtimes" (min similarity: 0.7)');
    const results2 = await rag.search('JavaScript runtimes', {
      limit: 5,
      minSimilarity: 0.7,
    });

    results2.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Similarity: ${result.similarity.toFixed(3)}`);
      console.log(`     Content: ${result.document.content.slice(0, 80)}...`);
    });
    console.log('');

    // Example 3: Search with metadata filtering
    console.log('3. Searching for "frameworks" (filtered by language: javascript)');
    const results3 = await rag.search('frameworks', {
      limit: 5,
      filters: { language: 'javascript' },
    });

    results3.forEach((result, idx) => {
      console.log(`  ${idx + 1}. Similarity: ${result.similarity.toFixed(3)}`);
      console.log(`     Language: ${result.document.metadata.language}`);
      console.log(`     Content: ${result.document.content.slice(0, 80)}...`);
    });
    console.log('');

    // Example 4: Update a document
    console.log('4. Updating a document...');
    await rag.updateDocument(
      docIds[0],
      'TypeScript is a strongly typed superset of JavaScript that compiles to plain JavaScript. It adds optional static typing and class-based object-oriented programming to the language.',
      { category: 'programming', language: 'typescript', difficulty: 'beginner', updated: true }
    );
    console.log('  ✓ Document updated\n');

    // Example 5: Delete a document
    console.log('5. Deleting a document...');
    const deleted = await rag.deleteDocument(docIds[1]);
    console.log(`  ✓ Document deleted: ${deleted}\n`);

    // Example 6: Retrieve a specific document
    console.log('6. Retrieving a document by ID...');
    const doc = await rag.getDocument(docIds[0]);
    if (doc) {
      console.log('  Found document:');
      console.log(`    ID: ${doc.id}`);
      console.log(`    Content: ${doc.content.slice(0, 100)}...`);
      console.log(`    Metadata:`, doc.metadata);
    }
    console.log('');

    console.log('=== Demo Complete ===');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // 5. Clean up
    console.log('\nClosing RAG client...');
    await rag.close();
    console.log('✓ Done!');
  }
}

// Run the example
main().catch(console.error);
