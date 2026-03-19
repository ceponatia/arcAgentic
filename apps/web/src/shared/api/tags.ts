import { http } from './http.js';
import type { TagResponse, CreateTagRequest, UpdateTagRequest } from '@arcagentic/schemas';

export async function getTags(signal?: AbortSignal): Promise<TagResponse[]> {
  const result = await http<{ tags: TagResponse[]; total: number }>(
    '/tags',
    signal ? { signal } : undefined
  );
  return result.tags;
}

export async function getTag(id: string, signal?: AbortSignal): Promise<TagResponse> {
  const response = await http<{ ok: boolean; tag?: TagResponse }>(
    `/tags/${encodeURIComponent(id)}`,
    signal ? { signal } : undefined
  );
  if (!response.tag) {
    throw new Error('Tag not found');
  }
  return response.tag;
}

export async function createTag(
  data: CreateTagRequest,
  signal?: AbortSignal
): Promise<TagResponse> {
  const response = await http<{ ok: boolean; tag?: TagResponse }>('/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    ...(signal && { signal }),
  });
  if (!response.tag) {
    throw new Error('Failed to create tag');
  }
  return response.tag;
}

export async function updateTag(
  id: string,
  data: UpdateTagRequest,
  signal?: AbortSignal
): Promise<TagResponse> {
  const response = await http<{ ok: boolean; tag?: TagResponse }>(`/tags/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    ...(signal && { signal }),
  });
  if (!response.tag) {
    throw new Error('Failed to update tag');
  }
  return response.tag;
}

export async function deleteTag(id: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/tags/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}
