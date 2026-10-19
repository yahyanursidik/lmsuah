import { PGlite, type Transaction } from '@electric-sql/pglite';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { readFileSync, readdirSync } from 'node:fs';

/** Exercise the production HTTP driver's mapping and atomic batch semantics,
 * with PostgreSQL in memory. This helper never reads DATABASE_URL. */
export async function isolatedHttpDatabase(options: { through?: number } = {}) {
  const client = new PGlite();
  const intercept = { beforeBatch: null as (() => Promise<void>) | null, failStatement: null as ((text: string) => boolean) | null };
  const directory = 'netlify/functions/db/migrations';
  for (const file of readdirSync(directory).filter(file => /^\d+_.+\.sql$/.test(file) && Number(file.slice(0, 4)) <= (options.through ?? Infinity)).sort()) {
    await client.exec(readFileSync(`${directory}/${file}`, 'utf8'));
  }
  const query = (text: string, parameters: unknown[], options: { arrayMode?: boolean } = {}) => {
    const execute = (connection: PGlite | Transaction) => connection.query(text, parameters, { rowMode: options.arrayMode ? 'array' : 'object' });
    return { text, execute, then: <T, U>(resolve: (value: Awaited<ReturnType<typeof execute>>) => T, reject: (error: unknown) => U) => execute(client).then(resolve, reject) };
  };
  const neonClient = {
    query,
    transaction: async (queries: ReturnType<typeof query>[]) => {
      const before = intercept.beforeBatch; intercept.beforeBatch = null;
      if (before) await before();
      return client.transaction(async tx => {
      const results = [];
      for (const item of queries) {
        if (intercept.failStatement?.(item.text)) { intercept.failStatement = null; throw new Error('Simulated transport/statement failure before commit'); }
        results.push(await item.execute(tx));
      }
      return results;
    }); },
  };
  const httpClient = neonClient as unknown as NeonQueryFunction<false, false>;
  return { client, intercept, httpClient, db: drizzle(httpClient) };
}
