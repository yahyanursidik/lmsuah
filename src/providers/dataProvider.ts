import {
  DataProvider,
  HttpError,
  CrudFilters,
  CrudSorting,
} from '@refinedev/core';
import { assertJsonResponse, readJsonResponse } from '../lib/api-response';

export const API_URL = '/api';

const NETWORK_STATUS_EVENT = 'lms:network-status';
let activeRequestCount = 0;

function emitNetworkStatus() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NETWORK_STATUS_EVENT, {
    detail: { active: activeRequestCount > 0, count: activeRequestCount },
  }));
}

function beginNetworkRequest() {
  activeRequestCount += 1;
  emitNetworkStatus();
}

function endNetworkRequest() {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  emitNetworkStatus();
}

export { NETWORK_STATUS_EVENT };
export const getActiveRequestCount = () => activeRequestCount;

/**
 * Custom fetch wrapper untuk memfasilitasi auth (credentials),
 * Error handling standar, dan penambahan X-Request-ID (Opsional).
 */
export const fetchWrapper = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  const isRead = !options.method || ['GET', 'HEAD'].includes(options.method.toUpperCase());

  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    try {
      const demoUser = JSON.parse(window.localStorage.getItem('lms_demo_user') || 'null') as { id?: string } | null;
      if (demoUser?.id?.startsWith('demo-')) headers.set('X-LMS-Demo-User', demoUser.id);
    } catch {
      // Invalid demo state is ignored; the server will require a real session.
    }
  }

  // Set Request ID jika belum ada
  if (!headers.has('X-Request-ID')) {
    headers.set('X-Request-ID', crypto.randomUUID());
  }

  // Jika mengirim JSON body
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), isRead ? 20_000 : 45_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout.signal]) : timeout.signal;
  beginNetworkRequest();
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal,
      credentials: 'include', // Kunci utama integrasi auth cookie HTTP-only
    });

    if (!response.ok) {
      const errorBody = await readJsonResponse(response, url).catch(() => null);

      const error: HttpError = {
        message: errorBody?.error?.message || response.statusText || `Permintaan API gagal (${response.status}). Silakan coba lagi.`,
        statusCode: response.status,
      };

      throw error;
    }

    assertJsonResponse(response, url);
    // Keep both the timeout and indicator active until the entire body arrives.
    const body = await response.arrayBuffer();
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.signal.aborted) throw {
      statusCode: 408,
      message: isRead
        ? 'Server terlalu lama merespons. Periksa koneksi dan pilih Coba Lagi.'
        : 'Penyimpanan melewati batas waktu. Muat ulang data sebelum mencoba lagi; perubahan mungkin sudah tersimpan.',
    } satisfies HttpError;
    if (error instanceof TypeError) throw { statusCode: 0, message: 'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.' } satisfies HttpError;
    throw error;
  } finally {
    clearTimeout(timer);
    endNetworkRequest();
  }
};

// Helper untuk menghasilkan parameter pengurutan (Sorting)
const generateSort = (sorters?: CrudSorting) => {
  if (sorters && sorters.length > 0) {
    const _sort = sorters.map((item) => item.field).join(',');
    const _order = sorters.map((item) => item.order).join(',');

    return { _sort, _order };
  }
  return {};
};

// Helper untuk menghasilkan parameter filter
const generateFilter = (filters?: CrudFilters) => {
  const queryFilters: Record<string, string> = {};

  if (filters) {
    filters.forEach((filter) => {
      if ('field' in filter && ['eq', 'contains'].includes(filter.operator)) {
        queryFilters[filter.field] = String(filter.value);
      }
    });
  }

  return queryFilters;
};

export const dataProvider = (): DataProvider => ({
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    const safeResource = resource || '';
    const url = new URL(`${window.location.origin}${API_URL}/${safeResource}`);

    // Pagination
    const current = pagination?.currentPage || (pagination as Record<string, unknown> | undefined)?.current as number || 1;
    const pageSize = (pagination as Record<string, unknown> | undefined)?.pageSize as number || 10;
    
    if (pagination?.mode === 'server') {
      url.searchParams.set('_page', String(current));
      url.searchParams.set('_limit', String(pageSize));
    } else {
      url.searchParams.set('_page', '1');
      url.searchParams.set('_limit', '100');
    }

    // Sort
    const sortParams = generateSort(sorters);
    if (sortParams._sort && sortParams._order) {
      url.searchParams.set('_sort', sortParams._sort);
      url.searchParams.set('_order', sortParams._order);
    }

    // Filter
    const filterParams = generateFilter(filters);
    Object.keys(filterParams).forEach((key) => {
      url.searchParams.set(key, String(filterParams[key]));
    });

    const response = await fetchWrapper(url.toString(), {
      headers: meta?.headers,
      signal: meta?.signal,
    });
    
    const body = await readJsonResponse(response, url.toString());
    const payload = body.data !== undefined ? body.data : body;
    const items = Array.isArray(payload) ? [...payload] : [...(payload.items || [])];
    const total = (typeof payload === 'object' && payload?.total) ?? body.meta?.total ?? items.length;
    // Refine mode "off" means all records, not the API's default first page.
    // Respect the server's actual page size and never silently truncate a curriculum.
    if (pagination?.mode !== 'server' && !Array.isArray(payload)) {
      const limit = Number(payload.limit) || 100;
      for (let page = 2; items.length < total; page += 3) {
        // Bounded concurrency avoids a serial waterfall on large curricula.
        const pages = Array.from({ length: Math.min(3, Math.ceil((total - items.length) / limit)) }, (_, index) => page + index);
        const batches = await Promise.all(pages.map(async number => {
          const pageUrl = new URL(url);
          pageUrl.searchParams.set('_page', String(number));
          pageUrl.searchParams.set('_limit', String(limit));
          const nextResponse = await fetchWrapper(pageUrl.toString(), { headers: meta?.headers, signal: meta?.signal });
          const nextBody = await readJsonResponse(nextResponse, pageUrl.toString());
          const next = nextBody.data ?? nextBody;
          if (!next.items?.length) throw new Error('Daftar berubah saat dimuat. Muat ulang agar data lengkap.');
          return next.items;
        }));
        batches.forEach(batch => items.push(...batch));
      }
    }

    return {
      data: items,
      total,
    };
  },

  getOne: async ({ resource, id, meta }) => {
    const url = `${API_URL}/${resource}/${id}${meta?.audience === 'public' ? '?audience=public' : ''}`;
    const response = await fetchWrapper(url, { headers: meta?.headers, signal: meta?.signal });
    const body = await readJsonResponse(response, url);
    const payload = body.data !== undefined ? body.data : body;

    return { data: payload };
  },

  create: async ({ resource, variables, meta }) => {
    const url = `${API_URL}/${resource}`;
    const response = await fetchWrapper(url, {
      method: 'POST',
      body: JSON.stringify(variables),
      headers: meta?.headers,
    });
    const body = await readJsonResponse(response, url);
    const payload = body.data !== undefined ? body.data : body;

    return { data: payload };
  },

  update: async ({ resource, id, variables, meta }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const response = await fetchWrapper(url, {
      method: 'PATCH',
      body: JSON.stringify(variables),
      headers: meta?.headers,
    });
    const body = await readJsonResponse(response, url);
    const payload = body.data !== undefined ? body.data : body;

    return { data: payload };
  },

  deleteOne: async ({ resource, id, meta }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const response = await fetchWrapper(url, {
      method: 'DELETE',
      headers: meta?.headers,
    });
    const body = await readJsonResponse(response, url);
    const payload = body.data !== undefined ? body.data : body;

    return { data: payload };
  },

  custom: async ({ url, method, filters, sorters, payload, query, headers }) => {
    const safeUrl = url || '';
    const requestUrl = new URL(
      safeUrl.startsWith('http') ? safeUrl : `${window.location.origin}${safeUrl}`
    );

    if (sorters) {
      const sortParams = generateSort(sorters);
      if (sortParams._sort && sortParams._order) {
        requestUrl.searchParams.set('_sort', sortParams._sort);
        requestUrl.searchParams.set('_order', sortParams._order);
      }
    }

    if (filters) {
      const filterParams = generateFilter(filters);
      Object.keys(filterParams).forEach((key) => {
        requestUrl.searchParams.set(key, String(filterParams[key]));
      });
    }

    if (query) {
      Object.keys(query).forEach((key) => {
        const q = query as Record<string, unknown>;
        requestUrl.searchParams.set(key, String(q[key]));
      });
    }

    const response = await fetchWrapper(requestUrl.toString(), {
      method: method.toUpperCase(),
      body: payload ? JSON.stringify(payload) : undefined,
      headers: headers as HeadersInit,
    });

    const body = await readJsonResponse(response, requestUrl.toString());
    const resPayload = body.data !== undefined ? body.data : body;

    return { data: resPayload };
  },

  getApiUrl: () => API_URL,
});
