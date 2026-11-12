import { useGetIdentity } from '@refinedev/core';
import { LearningSyncNotice } from '../../components/ui/LearningSyncNotice';
import { useLearningData } from '../../lib/useLearningData';
import { SchedulesPage } from '../public/SchedulesPage';

export function ParticipantSchedulePage() {
  const { data: identity } = useGetIdentity<{ id: string }>();
  const learning = useLearningData(identity?.id || '');
  const programIds = new Set(learning.enrollments.filter(entry => entry.status === 'active').map(entry => entry.programId));

  return <div className="space-y-4">
    <LearningSyncNotice {...learning} />
    <SchedulesPage learning={{ programIds, loading: learning.loading, failed: !!learning.error }} />
  </div>;
}
