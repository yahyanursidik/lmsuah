import { and, eq, inArray } from 'drizzle-orm';
import { transcriptDocuments, transcriptVersions } from '../db/schema/index.js';
import { db } from './db.js';
import { featureRequested } from './advanced-features.js';

export async function publishedTranscriptMaterials(lessonIds: string[], requiresAuth = false) {
  if (!featureRequested('privatePdf') || !lessonIds.length) return [];
  const rows = await db.select({ version: transcriptVersions, document: transcriptDocuments }).from(transcriptVersions)
    .innerJoin(transcriptDocuments, eq(transcriptDocuments.id, transcriptVersions.documentId))
    .where(and(inArray(transcriptDocuments.lessonId, lessonIds), eq(transcriptVersions.status, 'published')));
  return rows.map(({ version, document }) => ({ id: version.id, lessonId: document.lessonId, type: 'PDF' as const,
    filename: `${document.title} · versi ${version.version}`, url: `/api/transcript-file/${version.id}`, downloadUrl: `/api/transcript-file/${version.id}?download=1`,
    isDownloadable: version.isDownloadable, managed: true, requiresAuth }));
}
