export type ReviewAction = 'submit' | 'approve' | 'request_revision' | 'publish' | 'archive' | 'cancel';

export function nextTranscriptStatus(current: string, action: ReviewAction) {
  const transitions: Record<string, Partial<Record<ReviewAction, string>>> = {
    draft: { submit: 'submitted', archive: 'archived' },
    revision_requested: { submit: 'submitted', archive: 'archived' },
    submitted: { approve: 'approved', request_revision: 'revision_requested', archive: 'archived' },
    approved: { publish: 'published', request_revision: 'revision_requested', archive: 'archived' },
    published: { archive: 'archived' },
  };
  const next = transitions[current]?.[action];
  if (!next) throw new Error('INVALID_REVIEW_TRANSITION');
  return next;
}
