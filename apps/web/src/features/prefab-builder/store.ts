/**
 * Location Prefab Builder - Store
 * Zustand store for the canvas-based prefab editor.
 */
import { create } from 'zustand';
import type {
  LocationV2 as Location,
  LocationPortV2 as LocationPort,
  ConnectionDirection,
} from '@arcagentic/schemas';
import type { XYPosition } from '@xyflow/react';
import type { PrefabBuilderStore } from './types.js';
import { generateLocalId } from '@arcagentic/utils';
import { fetchPrefabData, fetchLocationsData, savePrefabData } from './loaders.js';
import {
  computeAddConnection,
  computeRemoveConnection,
  computeUpdateConnection,
  computeAutoLinkByPosition,
  computeCompleteConnection,
} from './connections.js';
import { createEntryPointActions } from './entry-points.js';

function generateId(prefix: string): string {
  return generateLocalId(prefix);
}

/** Initial state */
const initialState: Omit<PrefabBuilderStore, keyof import('./types.js').PrefabBuilderActions> = {
  prefabId: null,
  prefabName: '',
  prefabDescription: '',
  prefabCategory: '',
  instances: [],
  connections: [],
  entryPoints: [],
  locations: new Map(),
  availableLocations: [],
  templateLocations: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  pendingConnection: null,
  isDirty: false,
  isLoading: false,
  isSaving: false,
  error: null,
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const usePrefabBuilderStore = create<PrefabBuilderStore>((set, get) => ({
  ...initialState,

  // ============================================================================
  // Initialization
  // ============================================================================

  createNewPrefab: () => {
    set({
      ...initialState,
      prefabId: null,
      prefabName: 'New Prefab',
      isDirty: false,
    });
  },

  loadPrefab: async (prefabId: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await fetchPrefabData(prefabId);
      set({
        ...result,
        isDirty: false,
        isLoading: false,
      });
    } catch (err) {
      console.error('[PrefabBuilder] Error loading prefab:', err);
      const message = err instanceof Error ? err.message : 'Network error loading prefab';
      set({ error: message, isLoading: false });
    }
  },

  loadLocations: async () => {
    set({ isLoading: true });

    try {
      const result = await fetchLocationsData(get().locations);
      set({
        ...result,
        isLoading: false,
      });
    } catch (err) {
      console.error('[PrefabBuilder] Error loading locations:', err);
      set({ isLoading: false });
    }
  },

  // ============================================================================
  // Prefab Metadata
  // ============================================================================

  setPrefabName: (name: string) => {
    set({ prefabName: name, isDirty: true });
  },

  setPrefabDescription: (description: string) => {
    set({ prefabDescription: description, isDirty: true });
  },

  setPrefabCategory: (category: string) => {
    set({ prefabCategory: category, isDirty: true });
  },

  // ============================================================================
  // Location Management
  // ============================================================================

  addLocationInstance: (location: Location, position: XYPosition) => {
    const { prefabId, locations, instances } = get();
    const instanceId = generateId('inst');

    // Add location to map if not present
    const newLocations = new Map(locations);
    if (!newLocations.has(location.id)) {
      newLocations.set(location.id, location);
    }

    // Normalize position to 0-1
    const normalizedPosition = {
      x: Math.max(0, Math.min(1, position.x / 1000)),
      y: Math.max(0, Math.min(1, position.y / 1000)),
    };

    const instance = {
      id: instanceId,
      prefabId: prefabId ?? '',
      locationId: location.id,
      position: normalizedPosition,
      parentInstanceId: null,
      depth: 0,
      ports: [
        { id: `${instanceId}-default`, name: 'Main', direction: undefined, description: undefined },
      ],
      overrides: {},
    };

    set({
      instances: [...instances, instance],
      locations: newLocations,
      isDirty: true,
    });

    return instanceId;
  },

  addLocationInstanceWithAutoLink: (location: Location, position: XYPosition) => {
    const instanceId = get().addLocationInstance(location, position);
    // Auto-link to nearby nodes
    get().autoLinkByPosition(instanceId, position);
    return instanceId;
  },

  removeInstance: (instanceId: string) => {
    const { instances, connections, entryPoints } = get();

    // Remove connections involving this instance
    const newConnections = connections.filter(
      (c) => c.fromInstanceId !== instanceId && c.toInstanceId !== instanceId
    );

    // Remove entry points targeting this instance
    const newEntryPoints = entryPoints.filter((e) => e.targetInstanceId !== instanceId);

    set({
      instances: instances.filter((i) => i.id !== instanceId),
      connections: newConnections,
      entryPoints: newEntryPoints,
      selectedNodeId: get().selectedNodeId === instanceId ? null : get().selectedNodeId,
      isDirty: true,
    });
  },

  updateInstancePosition: (instanceId: string, position: XYPosition) => {
    const { instances } = get();

    // Normalize to 0-1
    const normalizedPosition = {
      x: Math.max(0, Math.min(1, position.x / 1000)),
      y: Math.max(0, Math.min(1, position.y / 1000)),
    };

    set({
      instances: instances.map((i) =>
        i.id === instanceId ? { ...i, position: normalizedPosition } : i
      ),
      isDirty: true,
    });
  },

  updateInstancePorts: (instanceId: string, ports: LocationPort[]) => {
    const { instances } = get();
    set({
      instances: instances.map((i) => (i.id === instanceId ? { ...i, ports } : i)),
      isDirty: true,
    });
  },

  updateLocation: (locationId: string, updates: Partial<Location>) => {
    const { locations } = get();
    const existing = locations.get(locationId);
    if (!existing) return;

    const newLocations = new Map(locations);
    newLocations.set(locationId, { ...existing, ...updates });

    set({
      locations: newLocations,
      isDirty: true,
    });
  },

  // ============================================================================
  // Entry Points
  // ============================================================================

  ...createEntryPointActions(set, get),

  // ============================================================================
  // Connections
  // ============================================================================

  addConnection: (
    fromInstanceId: string,
    fromPortId: string,
    toInstanceId: string,
    toPortId: string,
    direction: ConnectionDirection
  ) => {
    const { prefabId, connections, instances, locations } = get();
    const result = computeAddConnection(
      prefabId,
      instances,
      connections,
      locations,
      fromInstanceId,
      fromPortId,
      toInstanceId,
      toPortId,
      direction
    );
    set({ ...result, isDirty: true });
  },

  removeConnection: (connectionId: string) => {
    const { connections, instances } = get();
    const result = computeRemoveConnection(connectionId, instances, connections);
    set({
      ...result,
      selectedEdgeId: get().selectedEdgeId === connectionId ? null : get().selectedEdgeId,
      isDirty: true,
    });
  },

  updateConnection: (connectionId: string, updates) => {
    const { connections } = get();
    set({
      connections: computeUpdateConnection(connectionId, connections, updates),
      isDirty: true,
    });
  },

  // ============================================================================
  // Auto-linking
  // ============================================================================

  autoLinkByPosition: (instanceId: string, position: XYPosition) => {
    const { instances, connections, locations, prefabId } = get();
    const result = computeAutoLinkByPosition({
      instanceId,
      position,
      instances,
      connections,
      locations,
      prefabId,
    });
    set({ ...result, isDirty: true });
  },

  // ============================================================================
  // Selection
  // ============================================================================

  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  setSelectedEdge: (edgeId: string | null) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  clearSelection: () => {
    set({ selectedNodeId: null, selectedEdgeId: null });
  },

  // ============================================================================
  // Pending Connection
  // ============================================================================

  startConnection: (fromInstanceId: string, fromPortId: string, fromPosition: XYPosition) => {
    set({
      pendingConnection: { fromInstanceId, fromPortId, fromPosition },
    });
  },

  cancelConnection: () => {
    set({ pendingConnection: null });
  },

  completeConnection: (toInstanceId: string, toPortId: string) => {
    const { pendingConnection, instances, connections, locations, prefabId } = get();
    if (!pendingConnection) return;

    const result = computeCompleteConnection(
      pendingConnection,
      toInstanceId,
      toPortId,
      instances,
      connections,
      locations,
      prefabId
    );

    set({ ...result, pendingConnection: null, isDirty: true });
  },

  // ============================================================================
  // Viewport
  // ============================================================================

  setViewport: (viewport: { x: number; y: number; zoom: number }) => {
    set({ viewport });
  },

  // ============================================================================
  // Persistence
  // ============================================================================

  savePrefab: async () => {
    const {
      prefabId,
      prefabName,
      prefabDescription,
      prefabCategory,
      instances,
      connections,
      entryPoints,
      locations,
    } = get();

    if (!prefabName.trim()) {
      set({ error: 'Prefab name is required' });
      return false;
    }

    set({ isSaving: true, error: null });

    try {
      const result = await savePrefabData({
        prefabId,
        prefabName,
        prefabDescription,
        prefabCategory,
        instances,
        connections,
        entryPoints,
        locations,
      });
      set({
        prefabId: result.prefabId,
        isDirty: result.isDirty,
        isSaving: result.isSaving,
        ...(result.error ? { error: result.error } : {}),
      });
      return !result.error;
    } catch (err) {
      console.error('[PrefabBuilder] Error saving prefab:', err);
      set({ error: 'Network error saving prefab', isSaving: false });
      return false;
    }
  },

  reset: () => {
    set(initialState);
  },
}));
