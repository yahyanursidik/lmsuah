import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearningData } from '../src/lib/useLearningData';
import { portalQueryClient } from '../src/lib/query-client';

const mocks = vi.hoisted(() => ({ getList: vi.fn(), fetch: vi.fn(), cache: vi.fn() }));
vi.mock('../src/providers/dataProvider', () => ({
  dataProvider: () => ({ getList: mocks.getList }), fetchWrapper: mocks.fetch,
}));
vi.mock('../src/lib/userStore', () => ({
  LEARNING_CHANGED: 'lms:learning-changed', cacheLearningData: mocks.cache,
  getLearningBackup: () => null, getUserEnrollments: () => [], getUserLessonProgress: () => [],
  saveLastPosition: vi.fn(), toggleEnrollment: vi.fn(), toggleLessonCompletion: vi.fn(),
}));

const empty = { data: [], total: 0 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => { resolve = complete; });
  return { promise, resolve };
}

beforeEach(() => { vi.resetAllMocks(); portalQueryClient.clear(); });
afterEach(() => { cleanup(); portalQueryClient.clear(); });

describe('Participant learning synchronization lifecycle', () => {
  it('serializes position updates for the same lesson and shows pending until the queue finishes', async () => {
    mocks.getList.mockResolvedValue(empty);
    const first = deferred<Response>(); const second = deferred<Response>();
    mocks.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const hook = renderHook(() => useLearningData('account-a'));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    let older!: Promise<boolean>; let newer!: Promise<boolean>;
    act(() => {
      older = hook.result.current.saveProgress('lesson-one', { lastPositionSeconds: 10 });
      newer = hook.result.current.saveProgress('lesson-one', { lastPositionSeconds: 90 });
    });
    expect(hook.result.current.pending).toBe(true);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    await act(async () => { first.resolve(Response.json({ data: { lessonId: 'lesson-one', lastPositionSeconds: 10 } })); await older; });
    expect(hook.result.current.pending).toBe(true);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    await act(async () => { second.resolve(Response.json({ data: { lessonId: 'lesson-one', lastPositionSeconds: 90 } })); await newer; });
    expect(hook.result.current.pending).toBe(false);
    expect(mocks.cache.mock.calls.at(-1)?.[2]).toEqual([expect.objectContaining({ lastPositionSeconds: 90 })]);
  });
  it('reuses recent server learning data across menu mounts but supports forced refresh', async () => {
    mocks.getList.mockResolvedValue(empty);
    const first = renderHook(() => useLearningData('account-a'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();
    const next = renderHook(() => useLearningData('account-a'));
    await waitFor(() => expect(next.result.current.loading).toBe(false));
    expect(mocks.getList).toHaveBeenCalledTimes(2);
    await act(async () => { await next.result.current.refresh(); });
    expect(mocks.getList).toHaveBeenCalledTimes(4);
  });
  it('does not mark the next account ready when an old account request finishes', async () => {
    const old = deferred<typeof empty>();
    const next = deferred<typeof empty>();
    mocks.getList.mockReturnValueOnce(old.promise).mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(next.promise).mockReturnValueOnce(next.promise);
    const hook = renderHook(({ id }) => useLearningData(id), { initialProps: { id: 'account-a' } });
    hook.rerender({ id: 'account-b' });
    await act(async () => { old.resolve(empty); await old.promise; });
    expect(hook.result.current.loading).toBe(true);
    expect(mocks.cache).not.toHaveBeenCalled();
    await act(async () => { next.resolve(empty); await next.promise; });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(mocks.cache).toHaveBeenCalledWith('account-b', [], [], true);
  });

  it('does not allow writes after switching to an account whose initial synchronization fails', async () => {
    mocks.getList.mockResolvedValue(empty);
    const hook = renderHook(({ id }) => useLearningData(id), { initialProps: { id: 'account-a' } });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    mocks.getList.mockRejectedValue(new Error('Sinkronisasi gagal'));
    hook.rerender({ id: 'account-b' });
    await waitFor(() => expect(hook.result.current.error).toBe('Sinkronisasi gagal'));
    let followed: boolean | undefined;
    await act(async () => { followed = await hook.result.current.follow('program-one'); });
    expect(followed).toBe(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('does not let an older refresh overwrite the latest server response', async () => {
    const older = deferred<typeof empty>();
    mocks.getList.mockReturnValueOnce(older.promise).mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(empty).mockResolvedValueOnce(empty);
    const hook = renderHook(() => useLearningData('account-a'));
    await act(async () => { await hook.result.current.refresh(); });
    expect(mocks.cache).toHaveBeenCalledTimes(1);
    await act(async () => { older.resolve(empty); await older.promise; });
    expect(mocks.cache).toHaveBeenCalledTimes(1);
  });

  it('does not write cached learning data after unmount', async () => {
    const response = deferred<typeof empty>();
    mocks.getList.mockReturnValue(response.promise);
    const hook = renderHook(() => useLearningData('account-a'));
    hook.unmount();
    await act(async () => { response.resolve(empty); await response.promise; });
    expect(mocks.cache).not.toHaveBeenCalled();
  });

  it('does not cache a mutation response that finishes after switching accounts', async () => {
    mocks.getList.mockResolvedValue(empty);
    const response = deferred<Response>();
    mocks.fetch.mockReturnValue(response.promise);
    const hook = renderHook(({ id }) => useLearningData(id), { initialProps: { id: 'account-a' } });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    let operation!: Promise<boolean>;
    act(() => { operation = hook.result.current.follow('program-one'); });
    hook.rerender({ id: 'account-b' });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    mocks.cache.mockClear();
    await act(async () => {
      response.resolve(Response.json({ data: { id: 'enrollment-one', userId: 'account-a', programId: 'program-one' } }));
      expect(await operation).toBe(false);
    });
    expect(mocks.cache).not.toHaveBeenCalled();
    expect(hook.result.current.pending).toBe(false);
  });
  it('invalidates committed server progress even if the user navigated away during the write', async () => {
    mocks.getList.mockResolvedValue(empty);
    const response = deferred<Response>(); mocks.fetch.mockReturnValue(response.promise);
    const hook = renderHook(() => useLearningData('account-a'));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(portalQueryClient.getQueryData(['learning-data', 'account-a'])).toBeDefined();
    let write!: Promise<boolean>;
    act(() => { write = hook.result.current.saveProgress('lesson-one', { isCompleted: true }); });
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
    hook.unmount(); mocks.cache.mockClear();
    await act(async () => { response.resolve(Response.json({ data: { id: 'progress', lessonId: 'lesson-one', isCompleted: true } })); await write; });
    expect(portalQueryClient.getQueryData(['learning-data', 'account-a'])).toBeUndefined();
    expect(mocks.cache).not.toHaveBeenCalled();
  });

  it('keeps progress writes blocked until initial synchronization succeeds', async () => {
    const response = deferred<typeof empty>();
    mocks.getList.mockReturnValue(response.promise);
    const hook = renderHook(() => useLearningData('account-a'));
    await act(async () => {
      expect(await hook.result.current.saveProgress('lesson-one', { isCompleted: true })).toBe(false);
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
    await act(async () => { response.resolve(empty); await response.promise; });
    mocks.fetch.mockResolvedValue(Response.json({ data: { id: 'progress-one', userId: 'account-a', lessonId: 'lesson-one', isCompleted: true } }));
    await act(async () => {
      expect(await hook.result.current.saveProgress('lesson-one', { isCompleted: true })).toBe(true);
    });
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });
});
