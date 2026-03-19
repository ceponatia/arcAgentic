import { http } from './http.js';

export interface WorkspaceDraft {
  id: string;
  userId: string;
  name: string | null;
  workspaceState: Record<string, unknown>;
  currentStep: string;
  validationState: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export async function listWorkspaceDrafts(
  userId = 'default',
  limit = 20
): Promise<WorkspaceDraft[]> {
  const result = await http<{ ok: true; drafts: WorkspaceDraft[] }>(
    `/workspace-drafts?user_id=${encodeURIComponent(userId)}&limit=${limit}`
  );
  return result.drafts;
}

export async function getWorkspaceDraft(id: string): Promise<WorkspaceDraft | null> {
  try {
    const result = await http<{ ok: true; draft: WorkspaceDraft }>(
      `/workspace-drafts/${encodeURIComponent(id)}`
    );
    return result.draft;
  } catch (err) {
    // 404 returns null
    if (err instanceof Error && err.message.includes('404')) {
      return null;
    }
    throw err;
  }
}

export async function createWorkspaceDraft(params: {
  userId?: string;
  name?: string;
  workspaceState?: Record<string, unknown>;
  currentStep?: string;
}): Promise<WorkspaceDraft> {
  const userId = params.userId ?? 'default';
  const result = await http<{ ok: true; draft: WorkspaceDraft }>(
    `/workspace-drafts?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        workspaceState: params.workspaceState,
        currentStep: params.currentStep,
      }),
    }
  );
  return result.draft;
}

export async function updateWorkspaceDraft(
  id: string,
  updates: {
    name?: string | null;
    workspaceState?: Record<string, unknown>;
    currentStep?: string;
    validationState?: Record<string, unknown>;
  }
): Promise<WorkspaceDraft | null> {
  try {
    const result = await http<{ ok: true; draft: WorkspaceDraft }>(
      `/workspace-drafts/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );
    return result.draft;
  } catch (err) {
    // 404 returns null
    if (err instanceof Error && err.message.includes('404')) {
      return null;
    }
    throw err;
  }
}

export async function deleteWorkspaceDraft(id: string): Promise<boolean> {
  try {
    await http<null>(`/workspace-drafts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err) {
    // 404 returns false
    if (err instanceof Error && err.message.includes('404')) {
      return false;
    }
    throw err;
  }
}
