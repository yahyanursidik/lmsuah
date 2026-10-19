export type ProgramRevisionStatus = 'capturing' | 'draft' | 'submitted' | 'approved' | 'revision_requested' | 'published' | 'superseded' | 'cancelled';
export type ProgramRevisionAction = 'submit' | 'approve' | 'request_revision' | 'publish' | 'supersede' | 'cancel';
export function nextProgramRevisionStatus(current: ProgramRevisionStatus, action: ProgramRevisionAction, actorId: string, submittedBy: string | null) {
  if (action === 'approve' && (!submittedBy || actorId === submittedBy)) throw new Error('INDEPENDENT_REVIEWER_REQUIRED');
  const transitions: Record<ProgramRevisionStatus, Partial<Record<ProgramRevisionAction, ProgramRevisionStatus>>> = {
    capturing: { cancel: 'cancelled' },
    draft: { submit: 'submitted', cancel: 'cancelled' },
    submitted: { approve: 'approved', request_revision: 'revision_requested', cancel: 'cancelled' },
    approved: { publish: 'published', request_revision: 'revision_requested', cancel: 'cancelled' },
    published: { supersede: 'superseded' }, revision_requested: {}, superseded: {}, cancelled: {},
  };
  const next = transitions[current][action];
  if (!next) throw new Error('INVALID_REVISION_TRANSITION');
  return next;
}
