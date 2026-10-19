import type { ProgramPublicationSnapshot } from '../../shared/program-publication';

// Private answer keys must not be persisted to localStorage/sessionStorage.
// This cache survives SPA navigation only and is purged on explicit logout.
interface Draft { snapshot: ProgramPublicationSnapshot; expectedHash: string; note: string; actionNote?: string; dirty?: boolean }
const drafts = new Map<string, Draft>();
const key = (userId: string, revisionId: string) => `${userId}:${revisionId}`;
export function cacheRevisionDraft(userId: string, revisionId: string, draft: Draft) { if (userId) drafts.set(key(userId, revisionId), draft); }
export function getCachedRevisionDraft(userId: string, revisionId: string) { const draft = drafts.get(key(userId, revisionId)); return draft ? structuredClone(draft) : null; }
export function removeCachedRevisionDraft(userId: string, revisionId: string) { drafts.delete(key(userId, revisionId)); }
export function clearRevisionDraftCache() { drafts.clear(); }
