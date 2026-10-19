import { useCallback, useEffect, useRef, useState } from 'react';
import type { EnrollmentItem, LessonProgressItem } from '../types';
import { dataProvider, fetchWrapper } from '../providers/dataProvider';
import { readJsonResponse } from './api-response';
import { portalQueryClient } from './query-client';
import { cacheLearningData, getLearningBackup, getUserEnrollments, getUserLessonProgress, LEARNING_CHANGED, saveLastPosition, toggleEnrollment, toggleLessonCompletion } from './userStore';

const message = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Data belajar belum dapat disimpan. Coba lagi.';
const accountState = (userId: string) => ({ userId, active: true, request: 0, ready: false, following: false, writes: 0, progressQueue: new Map<string, Promise<boolean>>() });

/** Server is authoritative for real accounts. Demo remains explicitly local. */
export function useLearningData(userId: string) {
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(userId && !userId.startsWith('demo-')));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const demo = import.meta.env.DEV && userId.startsWith('demo-');
  const lifecycle = useRef(accountState(userId));
  if (lifecycle.current.userId !== userId) {
    lifecycle.current = accountState(userId);
  }
  useEffect(() => {
    const account = lifecycle.current;
    account.active = true;
    return () => { account.active = false; };
  }, [userId]);
  const refresh = useCallback(async (force = true) => {
    const account = lifecycle.current;
    if (account.userId !== userId || !account.active || account.following || account.writes > 0) return;
    const request = ++account.request;
    const current = () => lifecycle.current === account && account.active && account.request === request;
    account.ready = false;
    setPending(account.following);
    setError('');
    if (!userId || demo) { setLoading(false); return; }
    setLoading(true);
    try {
      const provider = dataProvider();
      const queryKey = ['learning-data', userId];
      if (force) {
        await portalQueryClient.cancelQueries({ queryKey, exact: true });
        portalQueryClient.removeQueries({ queryKey, exact: true });
      }
      const [enrollments, progress] = await portalQueryClient.fetchQuery({
        queryKey,
        retry: false,
        queryFn: ({ signal }) => Promise.all([
          provider.getList<EnrollmentItem>({ resource: 'enrollments', pagination: { mode: 'off' }, filters: [{ field: 'userId', operator: 'eq', value: userId }], meta: { signal } }),
          provider.getList<LessonProgressItem>({ resource: 'progress', pagination: { mode: 'off' }, meta: { signal } }),
        ]),
      });
      if (!current()) return;
      cacheLearningData(userId, enrollments.data, progress.data, true);
      account.ready = true;
      setError('');
    } catch (cause) { if (current()) setError(message(cause)); }
    finally { if (current()) setLoading(false); }
  }, [demo, userId]);
  useEffect(() => { void refresh(false); }, [refresh]);
  useEffect(() => {
    const changed = () => setRevision(value => value + 1);
    window.addEventListener(LEARNING_CHANGED, changed);
    return () => window.removeEventListener(LEARNING_CHANGED, changed);
  }, []);

  const follow = async (programId: string) => {
    const account = lifecycle.current;
    const current = () => lifecycle.current === account && account.active && account.userId === userId;
    if (!userId || !current() || account.following || loading || !demo && !account.ready) return false;
    account.following = true;
    setPending(true); setError('');
    try {
      if (demo) { toggleEnrollment(userId, programId); window.dispatchEvent(new Event(LEARNING_CHANGED)); }
      else {
        const active = getUserEnrollments(userId).some(item => item.programId === programId && item.status === 'active');
        const response = await fetchWrapper('/api/enrollments', { method: 'POST', body: JSON.stringify({ programId, status: active ? 'dropped' : 'active' }) });
        const body = await readJsonResponse(response, '/api/enrollments');
        portalQueryClient.removeQueries({ queryKey: ['learning-data', userId], exact: true });
        if (!current()) return false;
        cacheLearningData(userId, [...getUserEnrollments(userId).filter(item => item.programId !== programId), body.data], getUserLessonProgress(userId));
      }
      return true;
    } catch (cause) { if (current()) setError(message(cause)); return false; }
    finally { account.following = false; if (current()) setPending(account.writes > 0); }
  };
  const saveProgress = useCallback(async (lessonId: string, values: { isCompleted?: boolean; lastPositionSeconds?: number }) => {
    const account = lifecycle.current;
    const current = () => lifecycle.current === account && account.active && account.userId === userId;
    if (!userId || !current() || !demo && !account.ready) return false;
    account.writes += 1;
    setPending(true);
    const operation = (account.progressQueue.get(lessonId) || Promise.resolve(true)).then(async () => {
      if (!current()) return false;
      setError('');
      try {
      if (demo) {
        if (values.isCompleted !== undefined && getUserLessonProgress(userId).find(item => item.lessonId === lessonId)?.isCompleted !== values.isCompleted) toggleLessonCompletion(userId, lessonId);
        if (values.lastPositionSeconds !== undefined) saveLastPosition(userId, lessonId, values.lastPositionSeconds);
        window.dispatchEvent(new Event(LEARNING_CHANGED));
      } else {
        const response = await fetchWrapper('/api/progress', { method: 'POST', body: JSON.stringify({ lessonId, ...values }) });
        const body = await readJsonResponse(response, '/api/progress');
        portalQueryClient.removeQueries({ queryKey: ['learning-data', userId], exact: true });
        if (!current()) return false;
        cacheLearningData(userId, getUserEnrollments(userId), [...getUserLessonProgress(userId).filter(item => item.lessonId !== lessonId), body.data]);
      }
        return true;
      } catch (cause) { if (current()) setError(message(cause)); return false; }
    });
    account.progressQueue.set(lessonId, operation);
    try { return await operation; }
    finally {
      account.writes -= 1;
      if (account.progressQueue.get(lessonId) === operation) account.progressQueue.delete(lessonId);
      if (current()) setPending(account.following || account.writes > 0);
    }
  }, [demo, userId]);
  const exportBackup = () => {
    const backup = getLearningBackup(userId);
    if (!backup) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'cadangan-belajar.json'; link.click(); URL.revokeObjectURL(url);
  };
  return { revision, loading, pending, error, refresh, follow, saveProgress, hasLocalBackup: Boolean(getLearningBackup(userId)), exportBackup, enrollments: getUserEnrollments(userId), progress: getUserLessonProgress(userId) };
}
