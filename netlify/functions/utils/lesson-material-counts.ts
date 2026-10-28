import { inArray } from 'drizzle-orm';
import { lessonVideos, lessonAttachments } from '../db/schema/index.js';
import { db } from './db.js';
import { publishedTranscriptMaterials } from './transcript-materials.js';

/** Shared by the lesson checklist and the server's publication gate.
 * Avoid correlated SQL in a single-table select: Drizzle can strip the
 * qualifiers and bind the outer lesson ID to the material's ID instead.
 */
export async function lessonMaterialCounts(lessonIds: string[]) {
  const counts = new Map(lessonIds.map(id => [id, 0]));
  if (!lessonIds.length) return counts;
  const groups = await Promise.all([
    db.select({ lessonId: lessonVideos.lessonId }).from(lessonVideos).where(inArray(lessonVideos.lessonId, lessonIds)),
    db.select({ lessonId: lessonAttachments.lessonId }).from(lessonAttachments).where(inArray(lessonAttachments.lessonId, lessonIds)),
    publishedTranscriptMaterials(lessonIds),
  ]);
  for (const group of groups) {
    for (const material of group) {
      if (material.lessonId && counts.has(material.lessonId)) {
        counts.set(material.lessonId, counts.get(material.lessonId)! + 1);
      }
    }
  }
  return counts;
}
