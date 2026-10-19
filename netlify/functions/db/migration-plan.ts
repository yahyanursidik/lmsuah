export function migrationPlan(hasApplicationTables: boolean, latestRecorded: number, entries: Array<{ tag: string; when: number }>) {
  const baselineRequired = hasApplicationTables && latestRecorded === 0;
  return {
    baselineRequired,
    canRunMigrator: !baselineRequired,
    pendingMigrations: baselineRequired ? null : entries.filter(entry => entry.when > latestRecorded).map(entry => entry.tag),
    reason: baselineRequired ? 'BASELINE_REQUIRED' : null,
  };
}
