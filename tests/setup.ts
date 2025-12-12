/**
 * Test setup and configuration
 * This file is loaded before running tests (configured in bunfig.toml)
 */

// Load environment variables for tests
import { config } from 'dotenv';

// Load .env file
config();

// Verify required environment variables for integration tests
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY not set. Some tests may fail.');
  }

  if (!process.env.DATABASE_URL) {
    console.warn('Warning: DATABASE_URL not set. Integration tests will be skipped.');
  }
}

// Set test timeout
export const TEST_TIMEOUT = 30000; // 30 seconds for integration tests
