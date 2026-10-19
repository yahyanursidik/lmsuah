// @vitest-environment node
import { expect, it } from 'vitest';
import { isolatedHttpDatabase } from './helpers/neon-pglite';
import { runAtomicMigrations } from '../netlify/functions/db/atomic-migrations';
import { runCopySmoke } from '../netlify/functions/db/copy-smoke';

it('validates the exact copy smoke assertions and leaves no test records, DDL or journal entries', async () => {
  const database = await isolatedHttpDatabase({ through: -1 });
  try {
    await runAtomicMigrations(database.httpClient, 'netlify/functions/db/migrations');
    expect(await runCopySmoke(database.httpClient)).toMatchObject({ fixturesPersisted: false, allTableCountsUnchanged: true, journalUnchanged: true, sourceWrites: false });
  } finally { await database.client.close(); }
}, 120000);
