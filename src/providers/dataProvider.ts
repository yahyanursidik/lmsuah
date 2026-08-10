import {
  DataProvider,
  HttpError,
  CrudFilters,
  CrudSorting,
} from '@refinedev/core';

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

/**
 * Custom fetch wrapper untuk memfasilitasi auth (credentials),
 * Error handling standar, dan penambahan X-Request-ID (Opsional).
 */
export const fetchWrapper = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);

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

  beginNetworkRequest();
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Kunci utama integrasi auth cookie HTTP-only
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));

      const error: HttpError = {
        message: errorBody?.error?.message || response.statusText,
        statusCode: response.status,
      };

      throw error;
    }

    return response;
  } finally {
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
      if ('field' in filter && filter.operator === 'eq') {
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
    const current = (pagination as Record<string, unknown> | undefined)?.current as number || 1;
    const pageSize = (pagination as Record<string, unknown> | undefined)?.pageSize as number || 10;
    
    if (pagination?.mode === 'server') {
      url.searchParams.set('_page', String(current));
      url.searchParams.set('_limit', String(pageSize));
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
    });
    
    const body = await response.json();
    const payload = body.data !== undefined ? body.data : body;
    const items = Array.isArray(payload) ? payload : (payload.items || []);
    const total = (typeof payload === 'object' && payload?.total) || body.meta?.total || items.length;

    return {
      data: items,
      total,
    };
  },

  getOne: async ({ resource, id, meta }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const response = await fetchWrapper(url, { headers: meta?.headers });
    const body = await response.json();
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
    const body = await response.json();
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
    const body = await response.json();
    const payload = body.data !== undefined ? body.data : body;

    return { data: payload };
  },

  deleteOne: async ({ resource, id, meta }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const response = await fetchWrapper(url, {
      method: 'DELETE',
      headers: meta?.headers,
    });
    const body = await response.json();
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

    const body = await response.json();
    const resPayload = body.data !== undefined ? body.data : body;

    return { data: resPayload };
  },

  getApiUrl: () => API_URL,
});
