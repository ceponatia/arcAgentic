// src/util/health.ts (or wherever this lives)
import { createLogger } from '@arcagentic/logger';

export interface OllamaHealth {
  ok: boolean;
  version?: string;
}

const log = createLogger('api', 'health');

export async function checkOllama(baseUrl: string): Promise<OllamaHealth> {
  const url = `${trimTrailingSlash(baseUrl)}/api/version`;

  try {
    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      return { ok: false };
    }

    const data: unknown = await res.json().catch(() => null);
    const version = extractVersion(data);

    // Only include `version` if it's a real string,
    // so it matches `version?: string` instead of `string | undefined`
    if (version) {
      return { ok: true, version };
    }

    return { ok: true };
  } catch (error) {
    log.warn({ err: error, url }, 'ollama health check failed');
    return { ok: false };
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function extractVersion(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const { version } = data as { version?: unknown };
  return typeof version === 'string' ? version : undefined;
}
