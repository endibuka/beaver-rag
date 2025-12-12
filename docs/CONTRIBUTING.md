# Contributing Guide

Thank you for considering contributing to the RAG System! This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Adding New Features](#adding-new-features)

---

## Development Setup

### Prerequisites

- Node.js >= 18 or Bun >= 1.0
- PostgreSQL with pgvector extension
- OpenAI API key (for integration tests)
- Docker (optional, for local PostgreSQL)

### Installation

1. **Clone the repository:**

```bash
git clone <repository-url>
cd RAG-System
```

2. **Install dependencies:**

```bash
bun install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Start PostgreSQL (Docker):**

```bash
docker-compose up -d
```

5. **Verify setup:**

```bash
bun run build        # Should build successfully
bun test             # Should run all tests
```

---

## Project Structure

```
RAG-System/
├── src/                    # Source code
│   ├── core/              # Core RAG client and types
│   ├── embeddings/        # Embedding providers
│   ├── database/          # Database providers
│   ├── chunking/          # Chunking strategies
│   ├── utils/             # Utilities
│   └── index.ts           # Main exports
│
├── tests/                 # Tests
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test data
│
├── examples/             # Usage examples
├── docs/                 # Documentation
└── scripts/              # Build scripts
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write code in `src/`
- Add tests in `tests/`
- Update documentation if needed

### 3. Run Tests

```bash
# Run all tests
bun test

# Run specific tests
bun test tests/unit/
bun test tests/integration/

# Run with coverage
bun test --coverage
```

### 4. Check Code Quality

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format
```

### 5. Build

```bash
bun run build
```

---

## Testing

### Writing Unit Tests

Location: `tests/unit/`

**Example:**

```typescript
import { describe, test, expect } from 'bun:test';
import { MyClass } from '../../../src/path/to/class.js';

describe('MyClass', () => {
  test('should do something', () => {
    const instance = new MyClass();
    expect(instance.method()).toBe(expected);
  });
});
```

**Best Practices:**
- Mock external dependencies
- Test edge cases
- Keep tests fast (< 100ms per test)
- Use descriptive test names

### Writing Integration Tests

Location: `tests/integration/`

**Example:**

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { RAGClient } from '../../src/index.js';

describe('Integration Test', () => {
  let rag: RAGClient;

  beforeAll(async () => {
    // Setup
    rag = new RAGClient({ ... });
    await rag.initialize();
  });

  afterAll(async () => {
    // Cleanup
    await rag.close();
  });

  test('should work end-to-end', async () => {
    const id = await rag.addDocument('content');
    expect(id).toBeTruthy();
  });
}, 60000); // 60 second timeout
```

**Best Practices:**
- Only run with real dependencies
- Clean up after tests
- Use longer timeouts
- Skip if env vars missing

---

## Code Style

### TypeScript

- Use strict mode
- Prefer interfaces over types for public APIs
- Use meaningful variable names
- Add JSDoc comments for public APIs

**Example:**

```typescript
/**
 * Searches for relevant documents using semantic similarity
 * @param query - The search query text
 * @param options - Optional search options
 * @returns Array of search results ranked by similarity
 */
async search(
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  // Implementation
}
```

### File Naming

- Use kebab-case: `fixed-size.ts`, `openai.ts`
- Tests: `*.test.ts`
- Types: `types.ts`
- Index files: `index.ts`

### Import/Export

- Use named exports (not default exports)
- Use `.js` extension in imports (for ESM compatibility)
- Group imports: external → internal → types

```typescript
// External
import { Pool } from 'pg';

// Internal
import { DatabaseProvider } from '../base.js';

// Types
import type { Document, SearchOptions } from '../../core/types.js';
```

### Error Handling

- Use custom error classes
- Provide helpful error messages
- Include context in errors

```typescript
throw new ValidationError(
  `Text exceeds token limit: ${tokens} > ${maxTokens}`,
  'text',
  tokens
);
```

---

## Pull Request Process

### 1. Before Submitting

- [ ] All tests pass (`bun test`)
- [ ] Code is formatted (`bun run format`)
- [ ] No lint errors (`bun run lint`)
- [ ] Type check passes (`bun run typecheck`)
- [ ] Build succeeds (`bun run build`)
- [ ] Documentation updated (if needed)

### 2. PR Description

Include:
- What changed and why
- Link to related issue (if any)
- Screenshots (for UI changes)
- Breaking changes (if any)

### 3. PR Title

Format: `type: description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Add/update tests
- `chore`: Maintenance

Examples:
- `feat: add Cohere embeddings provider`
- `fix: handle empty metadata in search`
- `docs: update API reference`

### 4. Review Process

- Maintainers will review within 48 hours
- Address feedback in new commits
- Squash commits before merge

---

## Adding New Features

### Adding an Embedding Provider

1. **Create implementation:**

```typescript
// src/embeddings/my-provider.ts
import { EmbeddingsProvider, EmbeddingResult } from './base.js';

export interface MyProviderOptions {
  apiKey: string;
  // ... other options
}

export class MyProviderEmbeddings extends EmbeddingsProvider {
  readonly dimensions: number;
  readonly maxTokens: number;
  readonly modelName: string;

  constructor(options: MyProviderOptions) {
    super();
    // Initialize
  }

  async embed(text: string): Promise<EmbeddingResult> {
    // Implementation
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    // Implementation
  }
}
```

2. **Export from module:**

```typescript
// src/embeddings/index.ts
export * from './my-provider.js';
```

3. **Add tests:**

```typescript
// tests/unit/embeddings/my-provider.test.ts
describe('MyProviderEmbeddings', () => {
  test('should generate embeddings', async () => {
    const provider = new MyProviderEmbeddings({ ... });
    const result = await provider.embed('test');
    expect(result.embedding).toHaveLength(provider.dimensions);
  });
});
```

4. **Update documentation:**

Add to [docs/API.md](API.md) under "Embeddings Providers"

### Adding a Database Provider

1. **Create implementation:**

```typescript
// src/database/my-database/index.ts
import { DatabaseProvider } from '../base.js';

export class MyDatabase extends DatabaseProvider {
  async connect(): Promise<void> { }
  async initialize(): Promise<void> { }
  // ... implement all abstract methods
}
```

2. **Add SQL migrations (if applicable):**

```typescript
// src/database/my-database/migrations.ts
export async function createSchema() {
  // Setup tables, indexes, etc.
}
```

3. **Add tests:**

```typescript
// tests/integration/my-database.test.ts
describe('MyDatabase', () => {
  test('should store and retrieve documents', async () => {
    const db = new MyDatabase({ ... });
    await db.initialize();
    // Test CRUD operations
  });
});
```

4. **Update documentation**

### Adding a Chunking Strategy

1. **Create implementation:**

```typescript
// src/chunking/my-strategy.ts
import { ChunkingStrategy, Chunk } from './base.js';

export class MyChunking extends ChunkingStrategy {
  chunk(text: string): Chunk[] {
    // Implementation
  }
}
```

2. **Add tests:**

```typescript
// tests/unit/chunking/my-strategy.test.ts
describe('MyChunking', () => {
  test('should chunk text correctly', () => {
    const chunker = new MyChunking({ ... });
    const chunks = chunker.chunk('long text');
    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

---

## Commit Message Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

**Examples:**

```
feat(embeddings): add Cohere provider

- Implement CohereEmbeddings class
- Add batch processing support
- Include retry logic

Closes #123
```

```
fix(database): handle null metadata in search

Previously would throw error when metadata was null.
Now properly handles null as empty object.
```

---

## Code Review Checklist

For reviewers:

- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Performance considered
- [ ] Security implications reviewed
- [ ] Error handling adequate
- [ ] Type safety maintained

---

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/...)
- **Discussions:** [GitHub Discussions](https://github.com/...)
- **Documentation:** [docs/](.)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
