// In-memory access token storage (never persisted in localStorage/sessionStorage)
let accessTokenMemory: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessTokenMemory = token;
}

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export class ApiError extends Error {
  status: number;
  details?: string[];
  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!res.ok) {
        accessTokenMemory = null;
        return null;
      }
      const data = (await res.json()) as { accessToken?: string };
      accessTokenMemory = data.accessToken || null;
      return accessTokenMemory;
    } catch {
      accessTokenMemory = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { skipAuthRefresh?: boolean } = {}
): Promise<T> {
  const { skipAuthRefresh, headers: customHeaders, body, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const buildHeaders = (token: string | null): Record<string, string> => {
    const h: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (!isFormData) {
      h['Content-Type'] = 'application/json';
    }
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    if (customHeaders && typeof customHeaders === 'object') {
      Object.assign(h, customHeaders);
    }
    return h;
  };

  let res = await fetch(path, {
    ...rest,
    body,
    credentials: 'include',
    headers: buildHeaders(accessTokenMemory),
  });

  if (res.status === 401 && !skipAuthRefresh && path !== '/api/auth/login') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(path, {
        ...rest,
        body,
        credentials: 'include',
        headers: buildHeaders(newToken),
      });
    }
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    if (!res.ok) {
      throw new ApiError(res.status, 'Export failed');
    }
    return (await res.text()) as unknown as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { error?: string }).error || `Request failed (${res.status})`,
      (data as { details?: string[] }).details
    );
  }

  return data as T;
}
