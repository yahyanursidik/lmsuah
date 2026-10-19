export interface CopyManifest {
  projectId: string; sourceBranchId: string; targetBranchId: string; targetName: string;
  sourceHost: string; targetHost: string; targetEndpointId: string; databaseName: string;
  targetIsDefault: boolean; targetIsPrimary: boolean; baselineLastIndex: number;
}
export function copyDatabaseUrl(sourceConnection: string, manifest: CopyManifest) {
  const source = new URL(sourceConnection);
  const canonical = (host: string) => host.replace('-pooler.', '.').toLowerCase();
  const endpointHost = /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/;
  const required = ['projectId', 'sourceBranchId', 'targetBranchId', 'targetName', 'sourceHost', 'targetHost', 'targetEndpointId', 'databaseName'] as const;
  if (!manifest || required.some(key => typeof manifest[key] !== 'string' || !manifest[key]) ||
    !['postgres:', 'postgresql:'].includes(source.protocol) || !endpointHost.test(manifest.sourceHost) ||
    !manifest.sourceBranchId.startsWith('br-') || !manifest.targetBranchId.startsWith('br-') ||
    manifest.sourceBranchId === manifest.targetBranchId || !manifest.targetName.startsWith('codex-baseline-') ||
    manifest.targetIsDefault !== false || manifest.targetIsPrimary !== false || manifest.baselineLastIndex !== 9 ||
    !endpointHost.test(manifest.targetHost) || !manifest.targetHost.startsWith(`${manifest.targetEndpointId}.`) ||
    canonical(source.hostname) !== canonical(manifest.sourceHost) || canonical(source.hostname) === canonical(manifest.targetHost) ||
    decodeURIComponent(source.pathname.slice(1)) !== manifest.databaseName || source.searchParams.has('options')) throw new Error('UNSAFE_COPY_TARGET');
  // Branch copies inherit the existing database role/password. Keep credentials
  // only in this process; never save/print a new connection string or modify .env.
  const target = new URL(source);
  target.hostname = manifest.targetHost;
  return target.toString();
}
