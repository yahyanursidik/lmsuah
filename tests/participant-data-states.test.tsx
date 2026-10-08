import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useParticipantPortalData } from '../src/pages/participant/useParticipantPortalData';

const mocks = vi.hoisted(() => ({ loading: false, error: false, fetching: false, refetch: vi.fn(), data: {} as Record<string, unknown[]> }));
vi.mock('@refinedev/core', () => ({ useList: ({ resource }: { resource: string }) => ({ result: { data: mocks.data[resource] || [] }, query: { isLoading: mocks.loading, isError: mocks.error, isFetching: mocks.fetching, refetch: mocks.refetch } }) }));
describe('Participant data states', () => {
  beforeEach(() => { mocks.loading = false; mocks.error = false; mocks.fetching = false; mocks.data = {}; mocks.refetch.mockReset(); });
  it('does not replace an empty API with fictional programs or lessons', () => {
    const { result } = renderHook(useParticipantPortalData);
    expect(result.current.programs).toEqual([]);
    expect(result.current.lessons).toEqual([]);
    expect(result.current.isFallback).toBe(false);
    expect(result.current.isError).toBe(false);
  });
  it('exposes failure and preserves previously loaded data', () => {
    mocks.error = true;
    mocks.data.programs = [{ id: 'real-program', title: 'Kajian nyata' }];
    const { result } = renderHook(useParticipantPortalData);
    expect(result.current.isError).toBe(true);
    expect(result.current.programs).toEqual(mocks.data.programs);
    expect(result.current.lessons).toEqual([]);
  });
  it('distinguishes background refresh and lets retry refresh all resources', async () => {
    mocks.fetching = true;
    const { result } = renderHook(useParticipantPortalData);
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);
    await result.current.refetch();
    expect(mocks.refetch).toHaveBeenCalledTimes(4);
  });
});
