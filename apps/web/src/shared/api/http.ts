import { isAbortError } from '@arcagentic/utils';
import { API_BASE_URL } from '../../config.js';
import { getAccessToken } from '../auth/accessToken.js';

export interface HttpOptions extends RequestInit {
  signal?: AbortSignal;
  timeoutMs?: number;
  parseAsText?: boolean;
}

export async function http<T>(path: string, init?: HttpOptions): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const { signal, timeoutMs = 10000, parseAsText, ...rest } = init ?? {};

  const token = await getAccessToken();
  const incomingHeaders = rest.headers;
  const mergedHeaders: Record<string, string> = {};
  const setHeader = (key: string, value: string) => {
    Object.defineProperty(mergedHeaders, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };
  const hasHeader = (key: string): boolean => {
    const entry = Object.getOwnPropertyDescriptor(mergedHeaders, key);
    return typeof entry?.value === 'string';
  };

  if (incomingHeaders) {
    if (incomingHeaders instanceof Headers) {
      incomingHeaders.forEach((v, k) => {
        setHeader(k, v);
      });
    } else if (Array.isArray(incomingHeaders)) {
      for (const [k, v] of incomingHeaders) {
        setHeader(k, v);
      }
    } else {
      Object.assign(mergedHeaders, incomingHeaders);
    }
  }

  if (token && !hasHeader('Authorization') && !hasHeader('authorization')) {
    setHeader('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const onAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onAbort);
    }
  }

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    const res = await fetch(url, {
      ...rest,
      ...(Object.keys(mergedHeaders).length > 0 ? { headers: mergedHeaders } : {}),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Try to surface server-provided error details
      try {
        const maybeJson: unknown = await res.clone().json();
        const msg =
          maybeJson && typeof maybeJson === 'object' && 'error' in maybeJson
            ? String((maybeJson as { error?: unknown }).error)
            : undefined;
        if (msg) throw new Error(`HTTP ${res.status}: ${msg}`);
      } catch (jsonErr) {
        // Ignore JSON parse errors and fall back to text parsing below.
        void jsonErr;
      }

      try {
        const text = await res.text();
        if (text) throw new Error(`HTTP ${res.status}: ${text}`);
      } catch (textErr) {
        // Ignore text parsing errors; we'll throw a generic HTTP error below.
        void textErr;
      }

      throw new Error(`HTTP ${res.status}`);
    }

    // No Content
    if (res.status === 204) {
      return undefined as T;
    }

    if (parseAsText) {
      return (await res.text()) as T;
    }

    try {
      return (await res.json()) as T;
    } catch {
      throw new Error('Failed to parse JSON response');
    }
  } catch (err) {
    const isAbortErr = isAbortError(err);
    if (timedOut && isAbortErr) {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
