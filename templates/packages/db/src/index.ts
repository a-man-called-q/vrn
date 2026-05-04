import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// IMPORTANT: Always set DATABASE_URL in production. The fallback below is
// only for local development. Never ship default credentials to production.
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required in production.")
}
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/db_{{snakeCase name}}';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export * from './schema';
