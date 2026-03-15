import { getAuthToken } from './token.js';

/**
 * Returns the local bearer token for API requests.
 */
export function getAccessToken(): Promise<string | null> {
  return getAuthToken();
}
