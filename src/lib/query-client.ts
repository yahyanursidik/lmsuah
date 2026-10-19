import { keepPreviousData, QueryClient } from '@tanstack/react-query';

export const portalQueryDefaults = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
  retry: (failureCount: number, error: unknown) => {
    if (failureCount >= 1) return false;
    const failure = error as { statusCode?: number; status?: number; name?: string } | null;
    if (failure?.name === 'ApiResponseError') return false;
    const status = failure?.statusCode ?? failure?.status;
    return !status || status === 429 || status >= 500;
  },
  retryDelay: 800,
};

export const portalQueryClient = new QueryClient({
  defaultOptions: { queries: portalQueryDefaults, mutations: { retry: false } },
});

/** Never reuse protected data after signing in or out of another account. */
export async function clearPortalQueryCache() {
  await portalQueryClient.cancelQueries();
  portalQueryClient.clear();
}
