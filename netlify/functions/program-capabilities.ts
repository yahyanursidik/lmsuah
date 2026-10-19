import type { Config } from '@netlify/functions';
import { createHandler } from './middleware/handler.js';
import { getOptionalAuth, isGuest } from './utils/contentHelper.js';
import { ForbiddenError } from './middleware/auth.js';
import { featureReadiness } from './utils/advanced-features.js';
import { getUserPermissions } from './utils/permissions.js';

export default createHandler(async request => {
  const session = await getOptionalAuth(request);
  if (isGuest(session)) throw new ForbiddenError('Masuk untuk memeriksa kemampuan program.');
  if (request.method !== 'GET') return Response.json({ error: { message: 'Metode tidak didukung' } }, { status: 405 });
  const [pdf, revisions] = await Promise.all([featureReadiness('privatePdf'), featureReadiness('programRevisions')]);
  const administrator = session!.roles.some(role => ['admin', 'administrator', 'super_administrator'].includes(role));
  const permissions = administrator ? [] : await getUserPermissions(session!.userId);
  const can = (permission: string) => administrator || permissions.includes(permission);
  return { id: 'program-capabilities', privatePdf: pdf.available, programRevisions: revisions.available, privatePdfRequested: pdf.requested, programRevisionsRequested: revisions.requested, privatePdfReason: pdf.reason, programRevisionsReason: revisions.reason, maxPdfBytes: 4 * 1024 * 1024,
    canEditPrograms: can('program.update'), canReviewPrograms: can('program.review'), canPublishPrograms: can('program.publish'),
    canEditLessons: can('lesson.update'), canCreateLessons: can('lesson.create'), canReviewLessons: can('lesson.review'), canPublishLessons: can('lesson.publish'),
    canEditQuizzes: can('quiz.update') && can('quiz.create'), canReviewQuizzes: can('quiz.review'), canPublishQuizzes: can('quiz.publish'),
    canUploadTranscripts: can('transcript.upload'), canReviewTranscripts: can('transcript.review'), canPublishTranscripts: can('transcript.publish') };
});
export const config: Config = { path: ['/api/program-capabilities', '/api/program-capabilities/*'] };
