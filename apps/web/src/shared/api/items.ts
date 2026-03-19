import { http } from './http.js';
import type { ItemSummary } from '../../types.js';
import type { ItemDefinition } from '@arcagentic/schemas';

export async function getItems(
  options?: { category?: string },
  signal?: AbortSignal
): Promise<ItemSummary[]> {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  const query = params.toString();
  const path = query ? `/items?${query}` : '/items';
  return http<ItemSummary[]>(path, signal ? { signal } : undefined);
}

export async function getItem(id: string, signal?: AbortSignal): Promise<ItemDefinition> {
  return http<ItemDefinition>(`/items/${encodeURIComponent(id)}`, signal ? { signal } : undefined);
}

export async function saveItem(
  definition: ItemDefinition,
  signal?: AbortSignal
): Promise<{ item: ItemSummary }> {
  return http<{ item: ItemSummary }>('/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
    ...(signal && { signal }),
  });
}

export async function updateItem(
  id: string,
  definition: ItemDefinition,
  signal?: AbortSignal
): Promise<{ item: ItemSummary }> {
  return http<{ item: ItemSummary }>(`/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
    ...(signal && { signal }),
  });
}

export async function deleteItem(id: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}
