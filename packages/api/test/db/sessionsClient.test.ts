import { describe, expect, it, vi } from 'vitest';

const sessionsClientMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
  listPromptTags: vi.fn(),
  getPromptTag: vi.fn(),
  createPromptTag: vi.fn(),
  updatePromptTag: vi.fn(),
  deletePromptTag: vi.fn(),
  createSessionTagBinding: vi.fn(),
  getSessionTagsWithDefinitions: vi.fn(),
  toggleSessionTagBinding: vi.fn(),
  deleteSessionTagBinding: vi.fn(),
  createLocationMap: vi.fn(),
  getLocationMap: vi.fn(),
  listLocationMaps: vi.fn(),
  updateLocationMap: vi.fn(),
  deleteLocationMap: vi.fn(),
  createLocationPrefab: vi.fn(),
  getLocationPrefab: vi.fn(),
  listLocationPrefabs: vi.fn(),
  listEntityProfiles: vi.fn(),
  getEntityProfile: vi.fn(),
  createEntityProfile: vi.fn(),
  updateEntityProfile: vi.fn(),
  deleteEntityProfile: vi.fn(),
  getActorState: vi.fn(),
  listActorStatesForSession: vi.fn(),
  upsertActorState: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  createSession: sessionsClientMocks.createSession,
  getSession: sessionsClientMocks.getSession,
  listSessions: sessionsClientMocks.listSessions,
  deleteSession: sessionsClientMocks.deleteSession,
  listPromptTags: sessionsClientMocks.listPromptTags,
  getPromptTag: sessionsClientMocks.getPromptTag,
  createPromptTag: sessionsClientMocks.createPromptTag,
  updatePromptTag: sessionsClientMocks.updatePromptTag,
  deletePromptTag: sessionsClientMocks.deletePromptTag,
  createSessionTagBinding: sessionsClientMocks.createSessionTagBinding,
  getSessionTagsWithDefinitions: sessionsClientMocks.getSessionTagsWithDefinitions,
  toggleSessionTagBinding: sessionsClientMocks.toggleSessionTagBinding,
  deleteSessionTagBinding: sessionsClientMocks.deleteSessionTagBinding,
  createLocationMap: sessionsClientMocks.createLocationMap,
  getLocationMap: sessionsClientMocks.getLocationMap,
  listLocationMaps: sessionsClientMocks.listLocationMaps,
  updateLocationMap: sessionsClientMocks.updateLocationMap,
  deleteLocationMap: sessionsClientMocks.deleteLocationMap,
  createLocationPrefab: sessionsClientMocks.createLocationPrefab,
  getLocationPrefab: sessionsClientMocks.getLocationPrefab,
  listLocationPrefabs: sessionsClientMocks.listLocationPrefabs,
  listEntityProfiles: sessionsClientMocks.listEntityProfiles,
  getEntityProfile: sessionsClientMocks.getEntityProfile,
  createEntityProfile: sessionsClientMocks.createEntityProfile,
  updateEntityProfile: sessionsClientMocks.updateEntityProfile,
  deleteEntityProfile: sessionsClientMocks.deleteEntityProfile,
  getActorState: sessionsClientMocks.getActorState,
  listActorStatesForSession: sessionsClientMocks.listActorStatesForSession,
  upsertActorState: sessionsClientMocks.upsertActorState,
}));

const sessionsClient = await import('../../src/db/sessionsClient.js');

describe('db/sessionsClient', () => {
  it('re-exports db node helpers', () => {
    expect(sessionsClient.createSession).toBe(sessionsClientMocks.createSession);
    expect(sessionsClient.getSession).toBe(sessionsClientMocks.getSession);
    expect(sessionsClient.listSessions).toBe(sessionsClientMocks.listSessions);
    expect(sessionsClient.deleteSession).toBe(sessionsClientMocks.deleteSession);
    expect(sessionsClient.listPromptTags).toBe(sessionsClientMocks.listPromptTags);
    expect(sessionsClient.getPromptTag).toBe(sessionsClientMocks.getPromptTag);
    expect(sessionsClient.createPromptTag).toBe(sessionsClientMocks.createPromptTag);
    expect(sessionsClient.updatePromptTag).toBe(sessionsClientMocks.updatePromptTag);
    expect(sessionsClient.deletePromptTag).toBe(sessionsClientMocks.deletePromptTag);
    expect(sessionsClient.createSessionTagBinding).toBe(
      sessionsClientMocks.createSessionTagBinding
    );
    expect(sessionsClient.getSessionTagsWithDefinitions).toBe(
      sessionsClientMocks.getSessionTagsWithDefinitions
    );
    expect(sessionsClient.toggleSessionTagBinding).toBe(
      sessionsClientMocks.toggleSessionTagBinding
    );
    expect(sessionsClient.deleteSessionTagBinding).toBe(
      sessionsClientMocks.deleteSessionTagBinding
    );
    expect(sessionsClient.createLocationMap).toBe(sessionsClientMocks.createLocationMap);
    expect(sessionsClient.getLocationMap).toBe(sessionsClientMocks.getLocationMap);
    expect(sessionsClient.listLocationMaps).toBe(sessionsClientMocks.listLocationMaps);
    expect(sessionsClient.updateLocationMap).toBe(sessionsClientMocks.updateLocationMap);
    expect(sessionsClient.deleteLocationMap).toBe(sessionsClientMocks.deleteLocationMap);
    expect(sessionsClient.createLocationPrefab).toBe(sessionsClientMocks.createLocationPrefab);
    expect(sessionsClient.getLocationPrefab).toBe(sessionsClientMocks.getLocationPrefab);
    expect(sessionsClient.listLocationPrefabs).toBe(sessionsClientMocks.listLocationPrefabs);
    expect(sessionsClient.listEntityProfiles).toBe(sessionsClientMocks.listEntityProfiles);
    expect(sessionsClient.getEntityProfile).toBe(sessionsClientMocks.getEntityProfile);
    expect(sessionsClient.createEntityProfile).toBe(sessionsClientMocks.createEntityProfile);
    expect(sessionsClient.updateEntityProfile).toBe(sessionsClientMocks.updateEntityProfile);
    expect(sessionsClient.deleteEntityProfile).toBe(sessionsClientMocks.deleteEntityProfile);
    expect(sessionsClient.getActorState).toBe(sessionsClientMocks.getActorState);
    expect(sessionsClient.listActorStatesForSession).toBe(
      sessionsClientMocks.listActorStatesForSession
    );
    expect(sessionsClient.upsertActorState).toBe(sessionsClientMocks.upsertActorState);
  });
});
