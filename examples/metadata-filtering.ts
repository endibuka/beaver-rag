/**
 * Metadata Filtering Example
 *
 * This example demonstrates how to use metadata filtering
 * to narrow down search results based on document attributes.
 */

import { RAGClient, OpenAIEmbeddings, PostgresDatabase } from '../src/index.js';

async function main() {
  const rag = new RAGClient({
    embeddings: new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    database: new PostgresDatabase({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

  try {
    await rag.initialize();

    // Add documents with rich metadata
    console.log('Adding documents with metadata...\n');

    await rag.addDocuments([
      {
        content: 'Python is great for data science and machine learning applications.',
        metadata: {
          language: 'python',
          category: 'programming',
          difficulty: 'beginner',
          tags: ['data-science', 'ml'],
          year: 2024,
        },
      },
      {
        content: 'TypeScript provides type safety for large JavaScript applications.',
        metadata: {
          language: 'typescript',
          category: 'programming',
          difficulty: 'intermediate',
          tags: ['web', 'frontend'],
          year: 2024,
        },
      },
      {
        content: 'Rust offers memory safety without garbage collection.',
        metadata: {
          language: 'rust',
          category: 'programming',
          difficulty: 'advanced',
          tags: ['systems', 'performance'],
          year: 2024,
        },
      },
      {
        content: 'Go is designed for building scalable network services.',
        metadata: {
          language: 'go',
          category: 'programming',
          difficulty: 'intermediate',
          tags: ['backend', 'concurrency'],
          year: 2024,
        },
      },
      {
        content: 'JavaScript is the language of the web, running in every browser.',
        metadata: {
          language: 'javascript',
          category: 'programming',
          difficulty: 'beginner',
          tags: ['web', 'frontend'],
          year: 2024,
        },
      },
    ]);

    console.log('✓ Documents added\n');

    // Example 1: Filter by single metadata field
    console.log('=== Example 1: Filter by difficulty level ===');
    const beginnerResults = await rag.search('programming languages', {
      filters: { difficulty: 'beginner' },
      limit: 5,
    });

    console.log('Beginner-friendly results:');
    beginnerResults.forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.document.metadata.language} (${result.similarity.toFixed(3)})`);
      console.log(`     ${result.document.content.slice(0, 60)}...`);
    });
    console.log('');

    // Example 2: Filter by multiple metadata fields
    console.log('=== Example 2: Filter by multiple fields ===');
    const webIntermediateResults = await rag.search('web development', {
      filters: {
        difficulty: 'intermediate',
        category: 'programming',
      },
      limit: 5,
    });

    console.log('Intermediate web programming results:');
    webIntermediateResults.forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.document.metadata.language} (${result.similarity.toFixed(3)})`);
      console.log(`     Difficulty: ${result.document.metadata.difficulty}`);
      console.log(`     ${result.document.content.slice(0, 60)}...`);
    });
    console.log('');

    // Example 3: Combine filters with similarity threshold
    console.log('=== Example 3: Filters + Similarity Threshold ===');
    const advancedResults = await rag.search('performance and efficiency', {
      filters: { difficulty: 'advanced' },
      minSimilarity: 0.5,
      limit: 5,
    });

    console.log('Advanced topics with high similarity:');
    advancedResults.forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.document.metadata.language} (${result.similarity.toFixed(3)})`);
      console.log(`     ${result.document.content}`);
    });
    console.log('');

    // Example 4: Filter by nested metadata
    console.log('=== Example 4: Search within a category ===');
    const categoryResults = await rag.search('type safety', {
      filters: { category: 'programming' },
      limit: 3,
    });

    console.log('Programming language results:');
    categoryResults.forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.document.metadata.language}`);
      console.log(`     Similarity: ${result.similarity.toFixed(3)}`);
      console.log(`     Tags: ${result.document.metadata.tags.join(', ')}`);
      console.log(`     ${result.document.content.slice(0, 60)}...`);
    });
    console.log('');

    console.log('=== Demo Complete ===');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await rag.close();
  }
}

main().catch(console.error);
